const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createProductionBackup() {
  console.log('🔄 Starting production database backup...');
  
  try {
    // Get current timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Backup only tables that exist in production
    const backupData = {
      timestamp: new Date().toISOString(),
      version: 'production-safe-backup',
      tables: {
        // Core tables that definitely exist in production
        users: await prisma.user.findMany(),
        clients: await prisma.client.findMany(),
        settings: await prisma.settings.findMany(),
        userSettings: await prisma.userSettings.findMany(),
        activityLogs: await prisma.activityLog.findMany(),
        communications: await prisma.communication.findMany(),
        notifications: await prisma.notification.findMany(),
        vatQuarters: await prisma.vATQuarter.findMany(),
        vatWorkflowHistory: await prisma.vATWorkflowHistory.findMany(),
        ltdAccountsWorkflows: await prisma.ltdAccountsWorkflow.findMany(),
        ltdAccountsWorkflowHistory: await prisma.ltdAccountsWorkflowHistory.findMany(),
        
        // Email tables that exist in production (basic version)
        emailLogs: await prisma.emailLog.findMany(),
        emailTemplates: await prisma.$queryRaw`SELECT * FROM email_templates`,
        
        // Auth tables
        accounts: await prisma.account.findMany(),
        sessions: await prisma.session.findMany(),
        verificationTokens: await prisma.verificationToken.findMany(),
      }
    };
    
    const filename = `backup-production-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    
    console.log('✅ Production backup completed successfully!');
    console.log(`📁 Backup file: ${filename}`);
    console.log('📊 Backup summary:');
    console.log(`   - Users: ${backupData.tables.users.length}`);
    console.log(`   - Clients: ${backupData.tables.clients.length}`);
    console.log(`   - Activity Logs: ${backupData.tables.activityLogs.length}`);
    console.log(`   - Email Logs: ${backupData.tables.emailLogs.length}`);
    console.log(`   - Email Templates: ${backupData.tables.emailTemplates.length}`);
    console.log(`   - VAT Quarters: ${backupData.tables.vatQuarters.length}`);
    console.log(`   - Ltd Workflows: ${backupData.tables.ltdAccountsWorkflows.length}`);
    
    return filename;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup
createProductionBackup()
  .catch(console.error); 