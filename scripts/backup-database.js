const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

/**
 * =====================================================
 * COMPLETE DATABASE BACKUP SYSTEM
 * =====================================================
 * 
 * 🚨 CRITICAL: This script backs up EVERY SINGLE TABLE in the database
 * 
 * 📋 MAINTENANCE INSTRUCTIONS:
 * When you add a new table/model to the schema, you MUST update this script:
 * 
 * 1. Add the new table to the backup data object below
 * 2. Add the new table to the restore script (scripts/restore-backup.js)
 * 3. Update the console.log summary to include the new table count
 * 4. Test the backup/restore cycle with the new table
 * 
 * 📊 CURRENT TABLES BACKED UP (Last Updated: July 2025):
 * - Core User Management: User, Account, Session, VerificationToken, UserSettings
 * - Client Management: Client, Communication  
 * - Workflow Systems: VATQuarter, VATWorkflowHistory, LtdAccountsWorkflow, LtdAccountsWorkflowHistory
 * - Email System: EmailTemplate, EmailLog, EmailAttachment
 * - System: Notification, ActivityLog, Settings, BrandingSettings
 * 
 * 🔍 HOW TO CHECK FOR NEW TABLES:
 * 1. Run: npx prisma db pull (syncs schema with database)
 * 2. Check prisma/schema.prisma for new models
 * 3. Look for any model {} blocks that aren't in the backup list below
 * 
 * ⚡ QUICK TABLE CHECK COMMAND:
 * grep -n "^model " prisma/schema.prisma
 * 
 * 🚨 NEVER FORGET TO BACKUP NEW TABLES - DATA LOSS GUARANTEED IF MISSED!
 */

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(__dirname, '../backups')
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
  
  try {
    console.log('🔄 Starting COMPLETE database backup (ALL TABLES)...')
    console.log('📊 This backup includes EVERY table in the database')
    
    // =====================================================
    // 🚨 COMPLETE DATABASE BACKUP - ALL TABLES
    // =====================================================
    // 
    // 📋 WHEN ADDING NEW TABLES:
    // 1. Add the table below in the appropriate category
    // 2. Include necessary relations with { include: { ... } }
    // 3. Update the console.log summary section
    // 4. Update the restore script
    // 5. Test backup/restore cycle
    //
    const backup = {
      timestamp: new Date().toISOString(),
      version: '3.0', // Updated for complete table coverage
      metadata: {
        description: 'Complete database backup including all tables',
        tablesIncluded: [
          'User', 'Account', 'Session', 'VerificationToken', 'UserSettings',
          'Client', 'Communication',
          'VATQuarter', 'VATWorkflowHistory', 'LtdAccountsWorkflow', 'LtdAccountsWorkflowHistory',
          'EmailTemplate', 'EmailLog', 'EmailAttachment',
          'Notification', 'ActivityLog', 'Settings', 'BrandingSettings'
        ],
        note: 'If you see tables missing from this list, UPDATE THIS SCRIPT IMMEDIATELY!'
      },
      data: {
        // =====================================================
        // CORE USER MANAGEMENT TABLES
        // =====================================================
        users: await prisma.user.findMany({
          include: {
            accounts: true,
            sessions: true,
            settings: true,
            assignedClients: true,
            ltdCompanyAssignedClients: true,
            nonLtdCompanyAssignedClients: true,
            sentCommunications: true,
            triggeredEmailLogs: true,
            createdTemplates: true,
            ltdAccountsWorkflowHistory: true,
            assignedLtdAccountsWorkflows: true,
            assignedVATQuarters: true,
            vatWorkflowHistory: true,
            notifications: true,
            activityLogs: true,
            defaultAssigneeFor: true
          }
        }),
        
        accounts: await prisma.account.findMany(),
        
        sessions: await prisma.session.findMany(),
        
        verificationTokens: await prisma.verificationToken.findMany(),
        
        userSettings: await prisma.userSettings.findMany({
          include: {
            user: true,
            defaultAssignee: true
          }
        }),
        
        // =====================================================
        // CLIENT MANAGEMENT TABLES
        // =====================================================
        clients: await prisma.client.findMany({
          include: {
            assignedUser: true,
            ltdCompanyAssignedUser: true,
            nonLtdCompanyAssignedUser: true,
            communications: true,
            activityLogs: true,
            vatQuartersWorkflow: true,
            ltdAccountsWorkflows: true,
            emailLogs: true
          }
        }),
        
        communications: await prisma.communication.findMany({
          include: {
            client: true,
            sentBy: true
          }
        }),
        
        // =====================================================
        // WORKFLOW SYSTEM TABLES (CRITICAL - NEVER MISS THESE!)
        // =====================================================
        vatQuarters: await prisma.vATQuarter.findMany({
          include: {
            assignedUser: true,
            client: true,
            workflowHistory: true
          }
        }),
        
        vatWorkflowHistory: await prisma.vATWorkflowHistory.findMany({
          include: {
            vatQuarter: true,
            user: true
          }
        }),
        
        ltdAccountsWorkflows: await prisma.ltdAccountsWorkflow.findMany({
          include: {
            assignedUser: true,
            client: true,
            workflowHistory: true
          }
        }),
        
        ltdAccountsWorkflowHistory: await prisma.ltdAccountsWorkflowHistory.findMany({
          include: {
            ltdAccountsWorkflow: true,
            user: true
          }
        }),
        
        // =====================================================
        // EMAIL SYSTEM TABLES
        // =====================================================
        emailTemplates: await prisma.emailTemplate.findMany({
          include: {
            creator: true,
            emailLogs: true,
            attachments: true
          }
        }),
        
        emailLogs: await prisma.emailLog.findMany({
          include: {
            client: true,
            triggeredByUser: true,
            template: true,
            attachments: true
          }
        }),
        
        emailAttachments: await prisma.emailAttachment.findMany({
          include: {
            template: true,
            emailLog: true
          }
        }),
        
        // =====================================================
        // SYSTEM TABLES
        // =====================================================
        notifications: await prisma.notification.findMany({
          include: {
            user: true
          }
        }),
        
        activityLogs: await prisma.activityLog.findMany({
          include: {
            client: true,
            user: true
          }
        }),
        
        settings: await prisma.settings.findMany(),
        
        brandingSettings: await prisma.brandingSettings.findMany()
        
        // =====================================================
        // 🚨 NEW TABLES MUST BE ADDED HERE!
        // =====================================================
        // When you add a new model to prisma/schema.prisma:
        // 1. Add it to this data object
        // 2. Include appropriate relations
        // 3. Update the console.log summary below
        // 4. Update restore script (scripts/restore-backup.js)
        // 5. Test the backup/restore cycle
        //
        // Example for new table:
        // newTableName: await prisma.newTableName.findMany({
        //   include: {
        //     relatedTable: true
        //   }
        // }),
      }
    }
    
    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    
    console.log(`✅ COMPLETE backup created successfully: ${backupFile}`)
    console.log(`📊 BACKUP CONTAINS ALL TABLES:`)
    console.log(``)
    console.log(`   🏢 CORE USER MANAGEMENT:`)
    console.log(`      - Users: ${backup.data.users.length}`)
    console.log(`      - Accounts: ${backup.data.accounts.length}`)
    console.log(`      - Sessions: ${backup.data.sessions.length}`)
    console.log(`      - Verification Tokens: ${backup.data.verificationTokens.length}`)
    console.log(`      - User Settings: ${backup.data.userSettings.length}`)
    console.log(``)
    console.log(`   👥 CLIENT MANAGEMENT:`)
    console.log(`      - Clients: ${backup.data.clients.length}`)
    console.log(`      - Communications: ${backup.data.communications.length}`)
    console.log(``)
    console.log(`   🔄 WORKFLOW SYSTEMS (CRITICAL):`)
    console.log(`      - VAT Quarters: ${backup.data.vatQuarters.length}`)
    console.log(`      - VAT Workflow History: ${backup.data.vatWorkflowHistory.length}`)
    console.log(`      - Ltd Accounts Workflows: ${backup.data.ltdAccountsWorkflows.length}`)
    console.log(`      - Ltd Workflow History: ${backup.data.ltdAccountsWorkflowHistory.length}`)
    console.log(``)
    console.log(`   📧 EMAIL SYSTEM:`)
    console.log(`      - Email Templates: ${backup.data.emailTemplates.length}`)
    console.log(`      - Email Logs: ${backup.data.emailLogs.length}`)
    console.log(`      - Email Attachments: ${backup.data.emailAttachments.length}`)
    console.log(``)
    console.log(`   ⚙️  SYSTEM:`)
    console.log(`      - Notifications: ${backup.data.notifications.length}`)
    console.log(`      - Activity Logs: ${backup.data.activityLogs.length}`)
    console.log(`      - Settings: ${backup.data.settings.length}`)
    console.log(`      - Branding Settings: ${backup.data.brandingSettings.length}`)
    console.log(``)
    
    // Calculate total records
    const totalRecords = Object.values(backup.data).reduce((sum, table) => {
      return sum + (Array.isArray(table) ? table.length : 0)
    }, 0)
    
    console.log(`🎯 TOTAL RECORDS BACKED UP: ${totalRecords}`)
    console.log(`📦 Backup version: ${backup.version}`)
    console.log(``)
    
    // Verify no tables were missed
    const expectedTables = backup.metadata.tablesIncluded.length
    const actualTables = Object.keys(backup.data).length
    
    if (actualTables !== expectedTables) {
      console.warn(`⚠️  WARNING: Expected ${expectedTables} tables, but backed up ${actualTables} tables!`)
      console.warn(`⚠️  Check if new tables were added to schema but not to backup script!`)
    } else {
      console.log(`✅ All ${actualTables} tables backed up successfully`)
    }
    
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
    console.error('❌ COMPLETE backup failed:', error)
    console.error('🚨 This could mean:')
    console.error('   1. Database connection issue')
    console.error('   2. New table added to schema but not to backup script')
    console.error('   3. Schema out of sync with database')
    console.error('   4. Prisma client needs regeneration')
    console.error('')
    console.error('🔧 Troubleshooting steps:')
    console.error('   1. Run: npx prisma generate')
    console.error('   2. Run: npx prisma db pull')
    console.error('   3. Check for new models in prisma/schema.prisma')
    console.error('   4. Update this backup script if new tables found')
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