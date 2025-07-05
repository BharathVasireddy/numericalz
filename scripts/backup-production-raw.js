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
    
    // Backup using raw SQL queries to avoid schema mismatch
    const backupData = {
      timestamp: new Date().toISOString(),
      version: 'production-raw-backup',
      tables: {}
    };
    
    // Get all tables that exist in production
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('📊 Found tables:', tables.map(t => t.table_name).join(', '));
    
    // Backup each table
    for (const table of tables) {
      try {
        const tableName = table.table_name;
        console.log(`🔄 Backing up table: ${tableName}`);
        
        const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
        backupData.tables[tableName] = data;
        
        console.log(`✅ Backed up ${data.length} rows from ${tableName}`);
      } catch (error) {
        console.warn(`⚠️  Failed to backup table ${table.table_name}:`, error.message);
        backupData.tables[table.table_name] = [];
      }
    }
    
    const filename = `backup-production-raw-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    
    console.log('✅ Production backup completed successfully!');
    console.log(`📁 Backup file: ${filename}`);
    console.log('📊 Backup summary:');
    
    // Display summary
    Object.entries(backupData.tables).forEach(([tableName, data]) => {
      console.log(`   - ${tableName}: ${data.length} rows`);
    });
    
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