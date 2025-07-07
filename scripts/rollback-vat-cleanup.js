/**
 * VAT Cleanup Rollback Script
 * 
 * Restores the system to the previous state if the VAT cleanup process fails
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

async function rollbackVATCleanup() {
  console.log('🔄 Starting VAT cleanup rollback...')
  
  try {
    // Find the most recent backup
    const backupsDir = path.join(__dirname, '..', 'backups')
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .sort((a, b) => {
        const dateA = new Date(a.match(/backup-(.+)\.json$/)[1])
        const dateB = new Date(b.match(/backup-(.+)\.json$/)[1])
        return dateB - dateA
      })
    
    if (backupFiles.length === 0) {
      console.error('❌ No backup files found!')
      process.exit(1)
    }
    
    const latestBackup = backupFiles[0]
    const backupPath = path.join(backupsDir, latestBackup)
    
    console.log(`📁 Using backup: ${latestBackup}`)
    
    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    
    const db = new PrismaClient()
    
    // Restore users
    console.log('👥 Restoring users...')
    for (const user of backupData.users) {
      await db.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      })
    }
    
    // Restore clients
    console.log('🏢 Restoring clients...')
    for (const client of backupData.clients) {
      await db.client.upsert({
        where: { id: client.id },
        update: client,
        create: client
      })
    }
    
    // Restore VAT quarters
    console.log('📊 Restoring VAT quarters...')
    for (const quarter of backupData.vatQuarters) {
      await db.vATQuarter.upsert({
        where: { id: quarter.id },
        update: quarter,
        create: quarter
      })
    }
    
    // Restore VAT workflow history
    console.log('📋 Restoring VAT workflow history...')
    for (const history of backupData.vatWorkflowHistory) {
      await db.vATWorkflowHistory.upsert({
        where: { id: history.id },
        update: history,
        create: history
      })
    }
    
    await db.$disconnect()
    
    console.log('✅ Rollback completed successfully!')
    console.log('📋 Please verify functionality using: node scripts/verify-vat-functionality.js')
    
  } catch (error) {
    console.error('💥 Rollback failed:', error)
    console.error('🚨 CRITICAL: Manual database restoration may be required!')
    process.exit(1)
  }
}

if (require.main === module) {
  rollbackVATCleanup()
}

module.exports = { rollbackVATCleanup } 