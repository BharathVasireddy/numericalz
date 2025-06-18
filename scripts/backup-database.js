const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(__dirname, '../backups')
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
  
  try {
    console.log('🔄 Starting database backup...')
    
    // Export all critical data
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        users: await prisma.user.findMany({
          include: {
            assignedClients: true,
            sentCommunications: true,
            activityLogs: true,
            notifications: true,
            accounts: true,
            sessions: true
          }
        }),
        userSettings: await prisma.userSettings.findMany(),
        clients: await prisma.client.findMany(),
        communications: await prisma.communication.findMany(),
        emailTemplates: await prisma.emailTemplate.findMany(),
        notifications: await prisma.notification.findMany(),
        activityLogs: await prisma.activityLog.findMany(),
        settings: await prisma.settings.findMany()
      }
    }
    
    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    
    console.log(`✅ Backup created successfully: ${backupFile}`)
    console.log(`📊 Backup contains:`)
    console.log(`   - Users: ${backup.data.users.length}`)
    console.log(`   - Clients: ${backup.data.clients.length}`)
    console.log(`   - Communications: ${backup.data.communications.length}`)
    console.log(`   - Email Templates: ${backup.data.emailTemplates.length}`)
    console.log(`   - Notifications: ${backup.data.notifications.length}`)
    console.log(`   - Activity Logs: ${backup.data.activityLogs.length}`)
    console.log(`   - Settings: ${backup.data.settings.length}`)
    
    // Clean up old backups (keep last 30)
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime)
    
    if (files.length > 30) {
      const filesToDelete = files.slice(30)
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path)
        console.log(`🗑️ Deleted old backup: ${file.name}`)
      })
    }
    
    return backupFile
    
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run backup if called directly
if (require.main === module) {
  createBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { createBackup } 