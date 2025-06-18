const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function restoreBackup(backupFilePath) {
  try {
    console.log('🔄 Starting database restoration...')
    console.log(`📁 Backup file: ${backupFilePath}`)
    
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`)
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'))
    
    console.log(`📊 Backup from: ${backupData.timestamp}`)
    console.log(`📊 Backup version: ${backupData.version}`)
    
    // WARNING: This will clear existing data
    console.log('⚠️  WARNING: This will replace ALL existing data!')
    console.log('⚠️  Make sure you have a current backup before proceeding!')
    
    // Clear existing data (in reverse order of dependencies)
    console.log('🗑️ Clearing existing data...')
    await prisma.activityLog.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.communication.deleteMany()
    await prisma.userSettings.deleteMany()
    await prisma.client.deleteMany()
    await prisma.emailTemplate.deleteMany()
    await prisma.settings.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    
    // Restore data
    console.log('📥 Restoring data...')
    
    // Restore users first (other tables depend on them)
    if (backupData.data.users) {
      for (const user of backupData.data.users) {
        const { assignedClients, sentCommunications, activityLogs, notifications, accounts, sessions, ...userData } = user
        await prisma.user.create({
          data: userData
        })
      }
      console.log(`✅ Restored ${backupData.data.users.length} users`)
    }
    
    // Restore user settings separately
    if (backupData.data.userSettings) {
      await prisma.userSettings.createMany({
        data: backupData.data.userSettings
      })
      console.log(`✅ Restored ${backupData.data.userSettings.length} user settings`)
    }
    
    // Restore other data
    if (backupData.data.clients) {
      await prisma.client.createMany({
        data: backupData.data.clients
      })
      console.log(`✅ Restored ${backupData.data.clients.length} clients`)
    }
    
    if (backupData.data.communications) {
      await prisma.communication.createMany({
        data: backupData.data.communications
      })
      console.log(`✅ Restored ${backupData.data.communications.length} communications`)
    }
    
    if (backupData.data.emailTemplates) {
      await prisma.emailTemplate.createMany({
        data: backupData.data.emailTemplates
      })
      console.log(`✅ Restored ${backupData.data.emailTemplates.length} email templates`)
    }
    
    if (backupData.data.notifications) {
      await prisma.notification.createMany({
        data: backupData.data.notifications
      })
      console.log(`✅ Restored ${backupData.data.notifications.length} notifications`)
    }
    
    if (backupData.data.activityLogs) {
      await prisma.activityLog.createMany({
        data: backupData.data.activityLogs
      })
      console.log(`✅ Restored ${backupData.data.activityLogs.length} activity logs`)
    }
    
    if (backupData.data.settings) {
      await prisma.settings.createMany({
        data: backupData.data.settings
      })
      console.log(`✅ Restored ${backupData.data.settings.length} settings`)
    }
    
    console.log('🎉 Database restoration completed successfully!')
    
  } catch (error) {
    console.error('❌ Restoration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// CLI usage
if (require.main === module) {
  const backupFile = process.argv[2]
  
  if (!backupFile) {
    console.error('❌ Please provide a backup file path')
    console.log('Usage: node restore-backup.js <backup-file-path>')
    process.exit(1)
  }
  
  restoreBackup(backupFile)
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { restoreBackup } 