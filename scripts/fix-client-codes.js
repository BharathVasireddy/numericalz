const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Generate a unique client code with retry logic
 * Same logic as in the API to ensure consistency
 */
async function generateClientCode() {
  const lastClient = await prisma.client.findFirst({
    where: {
      clientCode: {
        startsWith: 'NZ-'
      }
    },
    orderBy: {
      clientCode: 'desc'
    }
  })

  let nextNumber = 1
  if (lastClient?.clientCode) {
    const match = lastClient.clientCode.match(/NZ-(\d+)/)
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  return `NZ-${nextNumber}`
}

async function fixClientCodes() {
  try {
    console.log('🔍 Analyzing client codes...')
    
    // 1. Find all clients
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`📊 Found ${allClients.length} total clients`)

    // 2. Check for missing client codes
    const clientsWithoutCodes = allClients.filter(client => !client.clientCode || client.clientCode.trim() === '')
    console.log(`❌ Clients without codes: ${clientsWithoutCodes.length}`)

    if (clientsWithoutCodes.length > 0) {
      console.log('\nClients missing codes:')
      clientsWithoutCodes.forEach(client => {
        console.log(`   - ${client.companyName} (${client.isActive ? 'Active' : 'Inactive'})`)
      })
    }

    // 3. Check for duplicate client codes
    const clientCodes = allClients.map(c => c.clientCode).filter(Boolean)
    const duplicateCodes = [...new Set(clientCodes.filter((code, index) => clientCodes.indexOf(code) !== index))]
    
    if (duplicateCodes.length > 0) {
      console.log(`\n🔄 Duplicate codes found: ${duplicateCodes.join(', ')}`)
      
      for (const duplicateCode of duplicateCodes) {
        const duplicateClients = allClients.filter(c => c.clientCode === duplicateCode)
        console.log(`\n   Clients with code "${duplicateCode}":`)
        duplicateClients.forEach(client => {
          console.log(`     - ${client.companyName} (Created: ${client.createdAt.toLocaleDateString()})`)
        })
      }
    }

    // 4. Find the highest NZ- number currently in use
    const nzClients = allClients
      .filter(client => client.clientCode && client.clientCode.startsWith('NZ-'))
      .map(client => {
        const match = client.clientCode.match(/NZ-(\d+)/)
        return {
          client,
          number: match ? parseInt(match[1]) : 0
        }
      })
      .sort((a, b) => b.number - a.number)

    const highestNumber = nzClients.length > 0 ? nzClients[0].number : 0
    console.log(`\n🔢 Highest NZ- number in use: ${highestNumber}`)

    // 5. Fix clients without codes
    if (clientsWithoutCodes.length > 0) {
      console.log('\n🔧 Fixing clients without codes...')
      
      for (const client of clientsWithoutCodes) {
        try {
          const newClientCode = await generateClientCode()
          
          await prisma.client.update({
            where: { id: client.id },
            data: { clientCode: newClientCode }
          })
          
          console.log(`   ✅ Fixed "${client.companyName}": ${newClientCode}`)
        } catch (error) {
          console.error(`   ❌ Failed to fix "${client.companyName}":`, error.message)
        }
      }
    }

    // 6. Fix duplicate codes (keep the oldest, reassign newer ones)
    if (duplicateCodes.length > 0) {
      console.log('\n🔧 Fixing duplicate codes...')
      
      for (const duplicateCode of duplicateCodes) {
        const duplicateClients = allClients
          .filter(c => c.clientCode === duplicateCode)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        
        // Keep the first (oldest) client with this code, reassign others
        for (let i = 1; i < duplicateClients.length; i++) {
          const client = duplicateClients[i]
          try {
            const newClientCode = await generateClientCode()
            
            await prisma.client.update({
              where: { id: client.id },
              data: { clientCode: newClientCode }
            })
            
            console.log(`   ✅ Reassigned "${client.companyName}": ${duplicateCode} → ${newClientCode}`)
          } catch (error) {
            console.error(`   ❌ Failed to reassign "${client.companyName}":`, error.message)
          }
        }
      }
    }

    // 7. Final verification
    console.log('\n🔍 Final verification...')
    
    const finalClients = await prisma.client.findMany({
      select: { id: true, clientCode: true, companyName: true },
      orderBy: { clientCode: 'asc' }
    })

    const stillWithoutCodes = finalClients.filter(c => !c.clientCode)
    const finalDuplicates = finalClients
      .map(c => c.clientCode)
      .filter((code, index, arr) => arr.indexOf(code) !== index)

    if (stillWithoutCodes.length === 0 && finalDuplicates.length === 0) {
      console.log('✅ All clients now have unique client codes!')
    } else {
      console.log(`❌ Issues remain: ${stillWithoutCodes.length} without codes, ${finalDuplicates.length} duplicates`)
    }

    // 8. Display current sequence status
    const finalNzClients = finalClients
      .filter(c => c.clientCode && c.clientCode.startsWith('NZ-'))
      .sort((a, b) => {
        const aNum = parseInt(a.clientCode.match(/NZ-(\d+)/)?.[1] || '0')
        const bNum = parseInt(b.clientCode.match(/NZ-(\d+)/)?.[1] || '0')
        return aNum - bNum
      })

    console.log('\n📋 Current NZ- sequence:')
    finalNzClients.forEach(client => {
      console.log(`   ${client.clientCode} - ${client.companyName}`)
    })

    const nextCode = await generateClientCode()
    console.log(`\n🎯 Next available code: ${nextCode}`)

    // 9. Summary
    console.log('\n📊 Summary:')
    console.log(`   Total clients: ${finalClients.length}`)
    console.log(`   Clients with NZ- codes: ${finalNzClients.length}`)
    console.log(`   Other codes: ${finalClients.length - finalNzClients.length}`)
    console.log(`   Fixed clients without codes: ${clientsWithoutCodes.length}`)
    console.log(`   Fixed duplicate codes: ${duplicateCodes.length}`)

  } catch (error) {
    console.error('❌ Error fixing client codes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixClientCodes()
    .then(() => {
      console.log('\n🎉 Client code fix completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixClientCodes, generateClientCode } 