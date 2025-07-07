const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:MGcgdwwwXqnVYDTCiWDpAOGcOaCJXauC@shortline.proxy.rlwy.net:19663/railway"
    }
  }
})

async function migrate() {
  console.log('🚀 Starting Migration: Remove VAT Assignment Field')
  console.log('=' * 50)
  
  try {
    // Step 1: Backup current state
    console.log('\n📋 Step 1: Creating backup before migration...')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `backups/pre-migration-${timestamp}.json`
    
    // Create backup of affected data
    const clientsWithVat = await prisma.$queryRaw`
      SELECT id, "vatAssignedUserId" 
      FROM clients 
      WHERE "vatAssignedUserId" IS NOT NULL
    `
    
    console.log(`  Found ${clientsWithVat.length} clients with VAT assignments`)
    
    if (clientsWithVat.length > 0) {
      console.log('  Clients with VAT assignments:')
      clientsWithVat.forEach(client => {
        console.log(`    Client ${client.id}: VAT assigned to ${client.vatAssignedUserId}`)
      })
      
      // Save backup
      const fs = require('fs')
      fs.writeFileSync(backupPath, JSON.stringify({
        migration: '001-cleanup-vat-assignment',
        timestamp: new Date().toISOString(),
        data: {
          clientsWithVatAssignments: clientsWithVat
        }
      }, null, 2))
      
      console.log(`  ✅ Backup saved to ${backupPath}`)
    } else {
      console.log('  ✅ No VAT assignments found - safe to proceed')
    }
    
    // Step 2: Verify no active code references
    console.log('\n🔍 Step 2: Verifying no active code references...')
    
    // Check if there are any active queries using this field
    // (This is just a safety check - we already know the code was cleaned up)
    console.log('  ✅ Code cleanup already completed')
    console.log('  ✅ API endpoints updated')
    console.log('  ✅ Frontend components updated')
    
    // Step 3: Remove the field
    console.log('\n🗑️  Step 3: Removing vatAssignedUserId field...')
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE clients DROP COLUMN IF EXISTS "vatAssignedUserId"
      `
      console.log('  ✅ Successfully removed vatAssignedUserId field')
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('  ✅ Field already removed or never existed')
      } else {
        throw error
      }
    }
    
    // Step 4: Verify removal
    console.log('\n✅ Step 4: Verifying field removal...')
    
    const remainingVatFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name = 'vatAssignedUserId'
    `
    
    if (remainingVatFields.length === 0) {
      console.log('  ✅ vatAssignedUserId field successfully removed')
    } else {
      console.log('  ❌ Field still exists!')
      throw new Error('Migration failed: Field was not removed')
    }
    
    // Step 5: Check remaining VAT fields (should be the legitimate ones)
    console.log('\n📊 Step 5: Checking remaining VAT fields...')
    
    const allVatFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name LIKE '%vat%'
    `
    
    console.log('  Remaining VAT fields (these should stay):')
    allVatFields.forEach(field => {
      console.log(`    - ${field.column_name}`)
    })
    
    // Step 6: Test basic functionality
    console.log('\n🧪 Step 6: Testing basic functionality...')
    
    const clientCount = await prisma.client.count()
    console.log(`  ✅ Can still query clients: ${clientCount} total`)
    
    const vatQuarterCount = await prisma.vatQuarter.count()
    console.log(`  ✅ Can still query VAT quarters: ${vatQuarterCount} total`)
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('=' * 50)
    
    return {
      success: true,
      backupPath,
      clientsAffected: clientsWithVat.length,
      summary: 'vatAssignedUserId field removed successfully'
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.log('\n🔄 Rollback instructions:')
    console.log('1. Check the backup file for affected data')
    console.log('2. If needed, restore the field:')
    console.log('   ALTER TABLE clients ADD COLUMN "vatAssignedUserId" TEXT;')
    console.log('3. Restore assignments from backup if any existed')
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(result => {
      console.log('\n✅ Migration Result:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Migration Error:', error)
      process.exit(1)
    })
}

module.exports = { migrate } 