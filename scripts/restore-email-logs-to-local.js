const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function restoreEmailLogs() {
  console.log('🔄 Restoring email logs from production backup to local database...')
  
  try {
    // Read the production backup
    const backupPath = 'backups/backup-2025-07-07T16-24-51-778Z.json'
    console.log(`📖 Reading backup file: ${backupPath}`)
    
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    const emailLogs = backup.data.emailLogs
    
    console.log(`📧 Found ${emailLogs.length} email logs in backup`)
    
    // Clear existing email logs in local database
    console.log('🗑️ Clearing existing email logs...')
    await prisma.emailLog.deleteMany({})
    
    // Restore email logs
    console.log('📥 Restoring email logs...')
    let restoredCount = 0
    
    for (const log of emailLogs) {
      try {
        await prisma.emailLog.create({
          data: {
            id: log.id,
            createdAt: new Date(log.createdAt),
            updatedAt: new Date(log.updatedAt),
            recipientEmail: log.recipientEmail,
            recipientName: log.recipientName,
            subject: log.subject,
            content: log.content,
            emailType: log.emailType,
            status: log.status,
            sentAt: log.sentAt ? new Date(log.sentAt) : null,
            deliveredAt: log.deliveredAt ? new Date(log.deliveredAt) : null,
            failedAt: log.failedAt ? new Date(log.failedAt) : null,
            failureReason: log.failureReason,
            clientId: log.clientId,
            workflowType: log.workflowType,
            workflowId: log.workflowId,
            triggeredBy: log.triggeredBy,
            fromEmail: log.fromEmail,
            fromName: log.fromName,
            templateId: log.templateId, // This field exists in local schema
            templateData: log.templateData
          }
        })
        restoredCount++
        
        if (restoredCount % 100 === 0) {
          console.log(`📧 Restored ${restoredCount}/${emailLogs.length} email logs...`)
        }
      } catch (error) {
        console.error(`❌ Error restoring email log ${log.id}:`, error.message)
      }
    }
    
    console.log(`✅ Successfully restored ${restoredCount} email logs to local database`)
    
    // Verify the restoration
    const localCount = await prisma.emailLog.count()
    console.log(`🔍 Verification: Local database now has ${localCount} email logs`)
    
    // Show sample data
    const sampleLog = await prisma.emailLog.findFirst({
      include: {
        client: { select: { companyName: true, clientCode: true } },
        triggeredByUser: { select: { name: true } }
      }
    })
    
    if (sampleLog) {
      console.log('📋 Sample email log:')
      console.log(`  Subject: ${sampleLog.subject}`)
      console.log(`  Recipient: ${sampleLog.recipientEmail}`)
      console.log(`  Status: ${sampleLog.status}`)
      console.log(`  Created: ${sampleLog.createdAt}`)
    }
    
  } catch (error) {
    console.error('❌ Error during email logs restoration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreEmailLogs() 