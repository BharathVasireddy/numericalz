/**
 * SAFE PRODUCTION MIGRATION SCRIPT
 * 
 * This script safely applies the template migration to production database
 * with complete backup verification and rollback capability.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Production database URL
const PRODUCTION_DB_URL = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL

if (!PRODUCTION_DB_URL) {
  console.error('❌ PRODUCTION_DB_URL not found in environment variables')
  console.error('   Please set DATABASE_URL_PRODUCTION for production database')
  process.exit(1)
}

console.log('🚀 SAFE PRODUCTION MIGRATION - TEMPLATE SUPPORT')
console.log('=' .repeat(60))
console.log(`📅 Timestamp: ${new Date().toISOString()}`)
console.log(`🗄️ Database: Production (Railway)`)
console.log('')

async function safeProductionMigration() {
  try {
    // Step 1: Complete production backup with verification
    console.log('🔒 STEP 1: Creating complete production backup...')
    await createProductionBackup()

    // Step 2: Verify backup integrity
    console.log('🔍 STEP 2: Verifying backup integrity...')
    await verifyBackupIntegrity()

    // Step 3: Create migration log table if needed
    console.log('📋 STEP 3: Ensuring migration log table exists...')
    await createMigrationLogTable()

    // Step 4: Apply migration to production
    console.log('⚡ STEP 4: Applying migration to production...')
    await applyProductionMigration()

    // Step 5: Verify migration success
    console.log('✅ STEP 5: Verifying migration success...')
    await verifyMigrationSuccess()

    // Step 6: Test email logging functionality
    console.log('🧪 STEP 6: Testing email logging functionality...')
    await testEmailLogging()

    console.log('')
    console.log('🎉 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(60))
    console.log('✅ Template support added to production database')
    console.log('✅ All backups created and verified')
    console.log('✅ Email logging now supports templates')
    console.log('✅ OTP emails will be logged after deployment')

  } catch (error) {
    console.error('')
    console.error('❌ PRODUCTION MIGRATION FAILED:', error.message)
    console.error('')
    console.error('🔄 ROLLBACK PLAN:')
    console.error('   1. Check backup files in production-backups/ directory')
    console.error('   2. Use rollback SQL in migrate-add-template-fields.sql')
    console.error('   3. Contact system administrator if needed')
    process.exit(1)
  }
}

async function createProductionBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(__dirname, '..', 'production-backups')
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const schemaBackupFile = path.join(backupDir, `production-schema-${timestamp}.sql`)
  const dataBackupFile = path.join(backupDir, `production-data-${timestamp}.sql`)
  const completeBackupFile = path.join(backupDir, `production-complete-${timestamp}.sql`)

  // Schema backup
  console.log('   📋 Creating schema backup...')
  const schemaCommand = `pg_dump "${PRODUCTION_DB_URL}" --schema-only --no-owner --no-privileges > "${schemaBackupFile}"`
  execSync(schemaCommand, { stdio: 'inherit' })
  console.log(`   ✅ Schema backup: ${path.basename(schemaBackupFile)} (${(fs.statSync(schemaBackupFile).size / 1024).toFixed(2)} KB)`)

  // Data backup
  console.log('   💾 Creating data backup...')
  const dataCommand = `pg_dump "${PRODUCTION_DB_URL}" --data-only --no-owner --no-privileges > "${dataBackupFile}"`
  execSync(dataCommand, { stdio: 'inherit' })
  console.log(`   ✅ Data backup: ${path.basename(dataBackupFile)} (${(fs.statSync(dataBackupFile).size / 1024 / 1024).toFixed(2)} MB)`)

  // Complete backup
  console.log('   🔗 Creating complete backup...')
  const completeCommand = `pg_dump "${PRODUCTION_DB_URL}" --no-owner --no-privileges > "${completeBackupFile}"`
  execSync(completeCommand, { stdio: 'inherit' })
  console.log(`   ✅ Complete backup: ${path.basename(completeBackupFile)} (${(fs.statSync(completeBackupFile).size / 1024 / 1024).toFixed(2)} MB)`)

  // Store backup info for verification
  global.backupFiles = {
    schema: schemaBackupFile,
    data: dataBackupFile,
    complete: completeBackupFile
  }
}

async function verifyBackupIntegrity() {
  const { Client } = require('pg')
  const client = new Client({ connectionString: PRODUCTION_DB_URL })
  
  try {
    await client.connect()

    // Get production table count
    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    const tableCount = parseInt(tablesResult.rows[0].table_count)
    console.log(`   📊 Production tables: ${tableCount}`)

    // Verify backup files exist and are not empty
    const backupFiles = global.backupFiles
    
    Object.entries(backupFiles).forEach(([type, file]) => {
      if (!fs.existsSync(file)) {
        throw new Error(`Backup file missing: ${file}`)
      }
      
      const size = fs.statSync(file).size
      if (size === 0) {
        throw new Error(`Backup file is empty: ${file}`)
      }
      
      console.log(`   ✅ ${type} backup verified: ${path.basename(file)}`)
    })

    // Verify schema backup contains table definitions
    const schemaContent = fs.readFileSync(backupFiles.schema, 'utf8')
    const createTableCount = (schemaContent.match(/CREATE TABLE/g) || []).length
    
    if (createTableCount < tableCount) {
      throw new Error(`Schema backup incomplete: ${createTableCount} tables found, expected ${tableCount}`)
    }
    
    console.log(`   ✅ Schema backup contains ${createTableCount} table definitions`)

    // Verify data backup contains data
    const dataContent = fs.readFileSync(backupFiles.data, 'utf8')
    const hasData = dataContent.includes('COPY ') || dataContent.includes('INSERT INTO')
    
    if (!hasData) {
      throw new Error('Data backup contains no data')
    }
    
    console.log(`   ✅ Data backup contains production data`)

    console.log('   🎯 All backup files verified successfully')
    
  } finally {
    await client.end()
  }
}

async function createMigrationLogTable() {
  const { Client } = require('pg')
  const client = new Client({ connectionString: PRODUCTION_DB_URL })
  
  try {
    await client.connect()

    // Create migration_log table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_log (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL DEFAULT 'STARTED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS migration_log_name_idx ON migration_log(migration_name);
      CREATE INDEX IF NOT EXISTS migration_log_status_idx ON migration_log(status);
    `)

    console.log('   ✅ migration_log table ready')
    
  } finally {
    await client.end()
  }
}

async function applyProductionMigration() {
  const migrationFile = path.join(__dirname, 'migrate-add-template-fields.sql')
  
  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found: ${migrationFile}`)
  }

  const migrationSQL = fs.readFileSync(migrationFile, 'utf8')
  
  const { Client } = require('pg')
  const client = new Client({ connectionString: PRODUCTION_DB_URL })
  
  try {
    await client.connect()
    
    console.log('   ⚡ Executing migration SQL on production...')
    console.log('   ⏳ This may take a few moments...')
    
    await client.query(migrationSQL)
    
    console.log('   ✅ Migration SQL executed successfully')
    
  } finally {
    await client.end()
  }
}

async function verifyMigrationSuccess() {
  const { Client } = require('pg')
  const client = new Client({ connectionString: PRODUCTION_DB_URL })
  
  try {
    await client.connect()

    // Check if columns were added
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'email_logs' 
      AND column_name IN ('templateId', 'templateData')
      AND table_schema = 'public'
      ORDER BY column_name
    `)

    // Check if index was created
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'email_logs' 
      AND indexname = 'EmailLog_templateId_idx'
      AND schemaname = 'public'
    `)

    // Check if foreign key constraint exists
    const constraintResult = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'email_logs' 
      AND constraint_name = 'EmailLog_templateId_fkey'
      AND table_schema = 'public'
    `)

    // Check migration log
    const migrationLogResult = await client.query(`
      SELECT migration_name, status, started_at, completed_at
      FROM migration_log 
      WHERE migration_name = 'add_email_template_fields'
      ORDER BY started_at DESC
      LIMIT 1
    `)

    console.log('')
    console.log('   📊 PRODUCTION MIGRATION VERIFICATION:')
    console.log(`      📝 Columns added: ${columnsResult.rows.length}/2`)
    columnsResult.rows.forEach(row => {
      console.log(`         ✅ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
    })
    
    console.log(`      🗂️ Index created: ${indexResult.rows.length > 0 ? 'YES' : 'NO'}`)
    if (indexResult.rows.length > 0) {
      console.log(`         ✅ ${indexResult.rows[0].indexname}`)
    }
    
    console.log(`      🔗 Foreign key: ${constraintResult.rows.length > 0 ? 'YES' : 'NO'}`)
    if (constraintResult.rows.length > 0) {
      console.log(`         ✅ ${constraintResult.rows[0].constraint_name}`)
    }

    console.log(`      📋 Migration logged: ${migrationLogResult.rows.length > 0 ? 'YES' : 'NO'}`)
    if (migrationLogResult.rows.length > 0) {
      const log = migrationLogResult.rows[0]
      console.log(`         ✅ Status: ${log.status}`)
      console.log(`         ✅ Started: ${log.started_at}`)
      console.log(`         ✅ Completed: ${log.completed_at}`)
    }

    // Verify migration was successful
    if (columnsResult.rows.length === 2 && indexResult.rows.length > 0) {
      console.log('')
      console.log('   🎉 MIGRATION VERIFICATION PASSED!')
      console.log('   ✅ Production database successfully updated')
    } else {
      throw new Error('Migration verification failed - missing components')
    }
    
  } finally {
    await client.end()
  }
}

async function testEmailLogging() {
  const { Client } = require('pg')
  const client = new Client({ connectionString: PRODUCTION_DB_URL })
  
  try {
    await client.connect()

    // Test that we can insert email logs with template fields
    console.log('   🧪 Testing email log insertion with template fields...')
    
    const testResult = await client.query(`
      INSERT INTO email_logs (
        "recipientEmail", 
        "recipientName", 
        subject, 
        content, 
        "emailType", 
        status, 
        "triggeredBy",
        "templateId",
        "templateData",
        "createdAt",
        "updatedAt"
      ) VALUES (
        'migration-test@numericalz.com',
        'Migration Test',
        'Production Migration Test',
        '<p>This is a test email to verify template migration</p>',
        'MIGRATION_TEST',
        'SENT',
        'migration-script',
        'test-template-migration',
        '{"migration":"add_email_template_fields","timestamp":"${new Date().toISOString()}"}',
        NOW(),
        NOW()
      ) RETURNING id, "templateId", "templateData"
    `)

    if (testResult.rows.length > 0) {
      const testEmail = testResult.rows[0]
      console.log(`   ✅ Test email inserted: ID ${testEmail.id}`)
      console.log(`   ✅ Template ID: ${testEmail.templateId}`)
      console.log(`   ✅ Template data: ${testEmail.templateData}`)
      
      // Clean up test record
      await client.query('DELETE FROM email_logs WHERE id = $1', [testEmail.id])
      console.log(`   ✅ Test record cleaned up`)
    }

    console.log('   🎯 Email logging functionality verified!')
    
  } finally {
    await client.end()
  }
}

// Run the production migration
safeProductionMigration().catch(error => {
  console.error('❌ PRODUCTION MIGRATION FAILED:', error)
  process.exit(1)
}) 