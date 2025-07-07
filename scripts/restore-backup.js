const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

/**
 * =====================================================
 * COMPLETE DATABASE RESTORE SYSTEM
 * =====================================================
 * 
 * 🚨 CRITICAL: This script restores EVERY SINGLE TABLE from backup
 * 
 * 📋 MAINTENANCE INSTRUCTIONS:
 * When you add a new table/model to the schema, you MUST update this script:
 * 
 * 1. Add the new table to the deletion order (order matters for foreign keys!)
 * 2. Add the new table to the restoration section
 * 3. Handle any foreign key dependencies properly
 * 4. Test the restore process with the new table
 * 
 * 🔗 FOREIGN KEY DEPENDENCY ORDER:
 * Delete in reverse dependency order, restore in dependency order
 */

async function restoreBackup(backupFilePath) {
  const fullPath = path.resolve(backupFilePath)
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`)
  }
  
  console.log('🔄 Starting COMPLETE database restoration...')
  console.log(`📁 Backup file: ${backupFilePath}`)
  
  try {
    const backupData = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    
    console.log(`📊 Backup from: ${backupData.timestamp}`)
    console.log(`📦 Backup version: ${backupData.version}`)
    
    if (backupData.metadata) {
      console.log(`📋 Tables in backup: ${backupData.metadata.tablesIncluded?.length || 'Unknown'}`)
    }
    
    console.log('⚠️  WARNING: This will replace ALL existing data!')
    console.log('⚠️  Make sure you have a current backup before proceeding!')
    
    console.log('🗑️ Clearing existing data in dependency order...')
    
    // =====================================================
    // CLEAR ALL DATA IN REVERSE DEPENDENCY ORDER
    // =====================================================
    // 🚨 ORDER MATTERS! Delete child tables before parent tables
    
    // Workflow history tables (depend on workflows and users)
    await prisma.vATWorkflowHistory.deleteMany({})
    await prisma.ltdAccountsWorkflowHistory.deleteMany({})
    
    // Email attachments (depend on templates and logs)
    await prisma.emailAttachment.deleteMany({})
    
    // Email logs (depend on clients, users, templates)
    await prisma.emailLog.deleteMany({})
    
    // Communications (depend on clients and users)
    await prisma.communication.deleteMany({})
    
    // Workflow tables (depend on clients and users)
    await prisma.vATQuarter.deleteMany({})
    await prisma.ltdAccountsWorkflow.deleteMany({})
    
    // Notifications (depend on users)
    await prisma.notification.deleteMany({})
    
    // Activity logs (depend on users and clients)
    await prisma.activityLog.deleteMany({})
    
    // Email templates (depend on users)
    await prisma.emailTemplate.deleteMany({})
    
    // Client table (depends on users for assignments)
    await prisma.client.deleteMany({})
    
    // User settings (depend on users)
    await prisma.userSettings.deleteMany({})
    
    // Auth tables (depend on users)
    await prisma.session.deleteMany({})
    await prisma.account.deleteMany({})
    await prisma.verificationToken.deleteMany({})
    
    // Users (parent for many relationships)
    await prisma.user.deleteMany({})
    
    // System tables (independent)
    await prisma.settings.deleteMany({})
    await prisma.brandingSettings.deleteMany({})
    
    console.log('📥 Restoring data in dependency order...')
    
    // =====================================================
    // RESTORE ALL DATA IN DEPENDENCY ORDER
    // =====================================================
    // 🚨 ORDER MATTERS! Restore parent tables before child tables
    
    // System tables first (no dependencies)
    if (backupData.data.settings) {
      await prisma.settings.createMany({ data: backupData.data.settings })
      console.log(`✅ Restored ${backupData.data.settings.length} settings`)
    }
    
    if (backupData.data.brandingSettings) {
      await prisma.brandingSettings.createMany({ data: backupData.data.brandingSettings })
      console.log(`✅ Restored ${backupData.data.brandingSettings.length} branding settings`)
    }
    
    // Users first (required for foreign keys in many tables)
    if (backupData.data.users) {
      for (const user of backupData.data.users) {
        const userData = { ...user }
        // Remove all relation fields before creating
        delete userData.accounts
        delete userData.sessions
        delete userData.settings
        delete userData.assignedClients
        delete userData.ltdCompanyAssignedClients
        delete userData.nonLtdCompanyAssignedClients
        delete userData.sentCommunications
        delete userData.triggeredEmailLogs
        delete userData.createdTemplates
        delete userData.ltdAccountsWorkflowHistory
        delete userData.assignedLtdAccountsWorkflows
        delete userData.assignedVATQuarters
        delete userData.vatWorkflowHistory
        delete userData.notifications
        delete userData.activityLogs
        delete userData.defaultAssigneeFor
        
        await prisma.user.create({ data: userData })
      }
      console.log(`✅ Restored ${backupData.data.users.length} users`)
    }
    
    // Auth tables (depend on users)
    if (backupData.data.accounts) {
      await prisma.account.createMany({ data: backupData.data.accounts })
      console.log(`✅ Restored ${backupData.data.accounts.length} accounts`)
    }
    
    if (backupData.data.sessions) {
      await prisma.session.createMany({ data: backupData.data.sessions })
      console.log(`✅ Restored ${backupData.data.sessions.length} sessions`)
    }
    
    if (backupData.data.verificationTokens) {
      await prisma.verificationToken.createMany({ data: backupData.data.verificationTokens })
      console.log(`✅ Restored ${backupData.data.verificationTokens.length} verification tokens`)
    }
    
    // User settings (depend on users)
    if (backupData.data.userSettings) {
      for (const userSetting of backupData.data.userSettings) {
        const settingData = { ...userSetting }
        delete settingData.user
        delete settingData.defaultAssignee
        
        await prisma.userSettings.create({ data: settingData })
      }
      console.log(`✅ Restored ${backupData.data.userSettings.length} user settings`)
    }
    
    // Clients (depend on users for assignments)
    if (backupData.data.clients) {
      for (const client of backupData.data.clients) {
        const clientData = { ...client }
        // Remove all relation fields
        delete clientData.assignedUser
        delete clientData.ltdCompanyAssignedUser
        delete clientData.nonLtdCompanyAssignedUser
        delete clientData.communications
        delete clientData.notifications
        delete clientData.activityLogs
        delete clientData.vatQuartersWorkflow
        delete clientData.ltdAccountsWorkflows
        delete clientData.emailLogs
        
        await prisma.client.create({ data: clientData })
      }
      console.log(`✅ Restored ${backupData.data.clients.length} clients`)
    }
    
    // Email templates (depend on users)
    if (backupData.data.emailTemplates) {
      for (const template of backupData.data.emailTemplates) {
        const templateData = { ...template }
        delete templateData.creator
        delete templateData.emailLogs
        delete templateData.attachments
        
        await prisma.emailTemplate.create({ data: templateData })
      }
      console.log(`✅ Restored ${backupData.data.emailTemplates.length} email templates`)
    }
    
    // Communications (depend on clients and users)
    if (backupData.data.communications) {
      for (const communication of backupData.data.communications) {
        const commData = { ...communication }
        delete commData.client
        delete commData.sentBy
        
        await prisma.communication.create({ data: commData })
      }
      console.log(`✅ Restored ${backupData.data.communications.length} communications`)
    }
    
    // VAT quarters (depend on clients and users)
    if (backupData.data.vatQuarters) {
      for (const vatQuarter of backupData.data.vatQuarters) {
        const quarterData = { ...vatQuarter }
        delete quarterData.assignedUser
        delete quarterData.client
        delete quarterData.workflowHistory
        
        await prisma.vATQuarter.create({ data: quarterData })
      }
      console.log(`✅ Restored ${backupData.data.vatQuarters.length} VAT quarters`)
    } else {
      console.log(`⚠️ No VAT quarters found in backup (version ${backupData.version || '1.0'})`)
    }
    
    // VAT workflow history (depend on VAT quarters and users)
    if (backupData.data.vatWorkflowHistory) {
      for (const history of backupData.data.vatWorkflowHistory) {
        const historyData = { ...history }
        delete historyData.vatQuarter
        delete historyData.user
        
        await prisma.vATWorkflowHistory.create({ data: historyData })
      }
      console.log(`✅ Restored ${backupData.data.vatWorkflowHistory.length} VAT workflow history entries`)
    } else {
      console.log(`⚠️ No VAT workflow history found in backup (version ${backupData.version || '1.0'})`)
    }
    
    // LTD accounts workflows (depend on clients and users)
    if (backupData.data.ltdAccountsWorkflows) {
      for (const workflow of backupData.data.ltdAccountsWorkflows) {
        const workflowData = { ...workflow }
        delete workflowData.assignedUser
        delete workflowData.client
        delete workflowData.workflowHistory
        
        await prisma.ltdAccountsWorkflow.create({ data: workflowData })
      }
      console.log(`✅ Restored ${backupData.data.ltdAccountsWorkflows.length} Ltd accounts workflows`)
    } else {
      console.log(`⚠️ No Ltd accounts workflows found in backup (version ${backupData.version || '1.0'})`)
    }
    
    // LTD workflow history (depend on LTD workflows and users)
    if (backupData.data.ltdAccountsWorkflowHistory) {
      for (const history of backupData.data.ltdAccountsWorkflowHistory) {
        const historyData = { ...history }
        delete historyData.ltdAccountsWorkflow
        delete historyData.user
        
        await prisma.ltdAccountsWorkflowHistory.create({ data: historyData })
      }
      console.log(`✅ Restored ${backupData.data.ltdAccountsWorkflowHistory.length} Ltd workflow history entries`)
    } else {
      console.log(`⚠️ No Ltd workflow history found in backup (version ${backupData.version || '1.0'})`)
    }
    
    // Email logs (depend on clients, users, templates)
    if (backupData.data.emailLogs) {
      for (const emailLog of backupData.data.emailLogs) {
        const logData = { ...emailLog }
        delete logData.client
        delete logData.triggeredByUser
        delete logData.template
        delete logData.attachments
        
        await prisma.emailLog.create({ data: logData })
      }
      console.log(`✅ Restored ${backupData.data.emailLogs.length} email logs`)
    }
    
    // Email attachments (depend on templates and email logs)
    if (backupData.data.emailAttachments) {
      for (const attachment of backupData.data.emailAttachments) {
        const attachmentData = { ...attachment }
        delete attachmentData.template
        delete attachmentData.emailLog
        
        await prisma.emailAttachment.create({ data: attachmentData })
      }
      console.log(`✅ Restored ${backupData.data.emailAttachments.length} email attachments`)
    }
    
    // Notifications (depend on users)
    if (backupData.data.notifications) {
      for (const notification of backupData.data.notifications) {
        const notificationData = { ...notification }
        delete notificationData.user
        
        await prisma.notification.create({ data: notificationData })
      }
      console.log(`✅ Restored ${backupData.data.notifications.length} notifications`)
    }
    
    // Activity logs (depend on users and clients)
    if (backupData.data.activityLogs) {
      for (const activityLog of backupData.data.activityLogs) {
        const logData = { ...activityLog }
        delete logData.client
        delete logData.user
        
        await prisma.activityLog.create({ data: logData })
      }
      console.log(`✅ Restored ${backupData.data.activityLogs.length} activity logs`)
    }
    
    // Calculate total restored records
    const totalRestored = Object.values(backupData.data).reduce((sum, table) => {
      return sum + (Array.isArray(table) ? table.length : 0)
    }, 0)
    
    console.log('')
    console.log('🎉 Database restoration completed successfully!')
    console.log(`🎯 TOTAL RECORDS RESTORED: ${totalRestored}`)
    console.log(`📦 Backup version: ${backupData.version}`)
    
    if (backupData.metadata?.tablesIncluded) {
      console.log(`📋 Tables restored: ${backupData.metadata.tablesIncluded.length}`)
    }
    
  } catch (error) {
    console.error('❌ Restoration failed:', error)
    console.error('🚨 Database may be in an inconsistent state!')
    console.error('🔧 Recovery options:')
    console.error('   1. Try restoring from a different backup')
    console.error('   2. Check backup file format and version')
    console.error('   3. Verify all tables exist in current schema')
    console.error('   4. Run database integrity checks')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Command line usage
const backupFile = process.argv[2]
if (!backupFile) {
  console.error('Usage: node restore-backup.js <backup-file>')
  process.exit(1)
}

restoreBackup(backupFile)
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

module.exports = { restoreBackup } 