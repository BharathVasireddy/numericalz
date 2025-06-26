#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateAllCompaniesHouseData() {
  console.log('🔄 Starting bulk Companies House data refresh...')
  
  try {
    // Get all clients with company numbers that don't have nextYearEnd
    const clients = await prisma.client.findMany({
      where: {
        AND: [
          { companyNumber: { not: null } },
          { companyNumber: { not: '' } },
          { isActive: true }
        ]
      },
      select: {
        id: true,
        companyName: true,
        companyNumber: true,
        nextYearEnd: true
      }
    })

    console.log(`📊 Found ${clients.length} clients with company numbers`)
    
    let updated = 0
    let errors = 0
    let alreadyHaveData = 0

    for (const client of clients) {
      try {
        // Check if client already has nextYearEnd
        if (client.nextYearEnd) {
          console.log(`✓ ${client.companyName} (${client.companyNumber}) already has year end data`)
          alreadyHaveData++
          continue
        }

        console.log(`🔄 Refreshing ${client.companyName} (${client.companyNumber})...`)
        
        // Call the refresh endpoint for this client
        const response = await fetch(`http://localhost:3000/api/clients/${client.id}/refresh-companies-house`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          console.log(`✅ Updated ${client.companyName} successfully`)
          updated++
        } else {
          const error = await response.json()
          console.error(`❌ Failed to update ${client.companyName}: ${error.error || 'Unknown error'}`)
          errors++
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error updating ${client.companyName}:`, error.message)
        errors++
      }
    }

    console.log('\n📊 Update Summary:')
    console.log(`   ✅ Successfully updated: ${updated}`)
    console.log(`   ✓ Already had data: ${alreadyHaveData}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📊 Total processed: ${clients.length}`)

    // Verify the updates
    console.log('\n🔍 Verifying updates...')
    const updatedClients = await prisma.client.findMany({
      where: {
        AND: [
          { companyNumber: { not: null } },
          { companyNumber: { not: '' } },
          { isActive: true },
          { nextYearEnd: { not: null } }
        ]
      },
      select: {
        companyName: true,
        companyNumber: true,
        nextYearEnd: true
      }
    })

    console.log(`✅ ${updatedClients.length} clients now have Companies House year end data`)
    
    updatedClients.forEach(client => {
      const yearEnd = new Date(client.nextYearEnd).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      console.log(`   ${client.companyName} (${client.companyNumber}): ${yearEnd}`)
    })

  } catch (error) {
    console.error('❌ Error during bulk update:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateAllCompaniesHouseData()
  .then(() => {
    console.log('\n🎉 Bulk Companies House update completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 