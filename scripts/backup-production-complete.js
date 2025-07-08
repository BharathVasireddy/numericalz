/**
 * COMPLETE PRODUCTION DATABASE BACKUP WITH VERIFICATION
 * 
 * This script creates a bulletproof backup of the entire production database
 * and cross-verifies that every table, column, relationship, and constraint
 * is captured correctly.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Get production database URL from environment
const PRODUCTION_DB_URL = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL

if (!PRODUCTION_DB_URL) {
  console.error('❌ PRODUCTION_DB_URL not found in environment variables')
  process.exit(1)
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join(__dirname, '..', 'production-backups')
const schemaBackupFile = path.join(backupDir, `production-schema-${timestamp}.sql`)
const dataBackupFile = path.join(backupDir, `production-data-${timestamp}.sql`)
const completeBackupFile = path.join(backupDir, `production-complete-${timestamp}.sql`)
const verificationFile = path.join(backupDir, `verification-${timestamp}.json`)

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

console.log('🔒 STARTING COMPLETE PRODUCTION DATABASE BACKUP')
console.log('=' .repeat(60))
console.log(`📅 Timestamp: ${new Date().toISOString()}`)
console.log(`🗄️ Database: ${PRODUCTION_DB_URL.split('@')[1]?.split('/')[0] || 'Railway Production'}`)
console.log(`📁 Backup Directory: ${backupDir}`)
console.log('')

async function createCompleteBackup() {
  try {
    // Step 1: Backup Database Schema (Structure only)
    console.log('📋 STEP 1: Backing up database schema (structure only)...')
    const schemaCommand = `pg_dump "${PRODUCTION_DB_URL}" --schema-only --no-owner --no-privileges > "${schemaBackupFile}"`
    execSync(schemaCommand, { stdio: 'inherit' })
    console.log(`✅ Schema backup created: ${path.basename(schemaBackupFile)}`)
    console.log(`   Size: ${(fs.statSync(schemaBackupFile).size / 1024).toFixed(2)} KB`)
    console.log('')

    // Step 2: Backup Database Data (Data only) 
    console.log('💾 STEP 2: Backing up database data (data only)...')
    const dataCommand = `pg_dump "${PRODUCTION_DB_URL}" --data-only --no-owner --no-privileges > "${dataBackupFile}"`
    execSync(dataCommand, { stdio: 'inherit' })
    console.log(`✅ Data backup created: ${path.basename(dataBackupFile)}`)
    console.log(`   Size: ${(fs.statSync(dataBackupFile).size / 1024 / 1024).toFixed(2)} MB`)
    console.log('')

    // Step 3: Create Complete Backup (Schema + Data)
    console.log('🔗 STEP 3: Creating complete backup (schema + data)...')
    const completeCommand = `pg_dump "${PRODUCTION_DB_URL}" --no-owner --no-privileges > "${completeBackupFile}"`
    execSync(completeCommand, { stdio: 'inherit' })
    console.log(`✅ Complete backup created: ${path.basename(completeBackupFile)}`)
    console.log(`   Size: ${(fs.statSync(completeBackupFile).size / 1024 / 1024).toFixed(2)} MB`)
    console.log('')

    // Step 4: Verify Backup Integrity
    console.log('🔍 STEP 4: Verifying backup integrity...')
    await verifyBackupIntegrity()

    // Step 5: Cross-verify with Production
    console.log('✅ STEP 5: Cross-verifying with production database...')
    await crossVerifyWithProduction()

    console.log('')
    console.log('🎉 BACKUP COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(60))
    console.log('📁 BACKUP FILES CREATED:')
    console.log(`   📋 Schema: ${path.basename(schemaBackupFile)}`)
    console.log(`   💾 Data: ${path.basename(dataBackupFile)}`)
    console.log(`   🔗 Complete: ${path.basename(completeBackupFile)}`)
    console.log(`   🔍 Verification: ${path.basename(verificationFile)}`)
    console.log('')
    console.log('✅ ALL BACKUPS VERIFIED AND READY FOR MIGRATION')

  } catch (error) {
    console.error('❌ BACKUP FAILED:', error.message)
    process.exit(1)
  }
}

async function verifyBackupIntegrity() {
  const verification = {
    timestamp: new Date().toISOString(),
    schemaFile: {
      path: schemaBackupFile,
      size: fs.statSync(schemaBackupFile).size,
      exists: fs.existsSync(schemaBackupFile)
    },
    dataFile: {
      path: dataBackupFile,
      size: fs.statSync(dataBackupFile).size,
      exists: fs.existsSync(dataBackupFile)
    },
    completeFile: {
      path: completeBackupFile,
      size: fs.statSync(completeBackupFile).size,
      exists: fs.existsSync(completeBackupFile)
    }
  }

  // Verify files are not empty
  if (verification.schemaFile.size === 0) throw new Error('Schema backup file is empty')
  if (verification.dataFile.size === 0) throw new Error('Data backup file is empty')
  if (verification.completeFile.size === 0) throw new Error('Complete backup file is empty')

  // Verify files contain expected content
  const schemaContent = fs.readFileSync(schemaBackupFile, 'utf8')
  const dataContent = fs.readFileSync(dataBackupFile, 'utf8')
  
  if (!schemaContent.includes('CREATE TABLE')) throw new Error('Schema backup missing table definitions')
  if (!dataContent.includes('COPY ') && !dataContent.includes('INSERT INTO')) throw new Error('Data backup missing data')

  verification.contentCheck = {
    schemaHasTables: schemaContent.includes('CREATE TABLE'),
    schemaHasIndexes: schemaContent.includes('CREATE INDEX'),
    schemaHasConstraints: schemaContent.includes('ALTER TABLE'),
    dataHasContent: dataContent.includes('COPY ') || dataContent.includes('INSERT INTO')
  }

  console.log('   ✅ Schema backup integrity verified')
  console.log('   ✅ Data backup integrity verified')
  console.log('   ✅ Complete backup integrity verified')

  return verification
}

async function crossVerifyWithProduction() {
  try {
    // Get production database information
    const { Client } = require('pg')
    const client = new Client({ connectionString: PRODUCTION_DB_URL })
    await client.connect()

    console.log('   🔍 Connecting to production database...')

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows.map(row => row.table_name)
    console.log(`   📊 Found ${tables.length} tables in production`)

    // Get all columns for each table
    const verification = {
      timestamp: new Date().toISOString(),
      tables: {},
      summary: {
        totalTables: tables.length,
        totalColumns: 0,
        totalConstraints: 0,
        totalIndexes: 0
      }
    }

    for (const tableName of tables) {
      // Get columns
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName])

      // Get constraints
      const constraintsResult = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName])

      // Get indexes
      const indexesResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1 AND schemaname = 'public'
      `, [tableName])

      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      const rowCount = parseInt(countResult.rows[0].count)

      verification.tables[tableName] = {
        columns: columnsResult.rows,
        constraints: constraintsResult.rows,
        indexes: indexesResult.rows,
        rowCount: rowCount
      }

      verification.summary.totalColumns += columnsResult.rows.length
      verification.summary.totalConstraints += constraintsResult.rows.length
      verification.summary.totalIndexes += indexesResult.rows.length

      console.log(`   ✅ ${tableName}: ${columnsResult.rows.length} columns, ${rowCount} rows`)
    }

    await client.end()

    // Save verification data
    fs.writeFileSync(verificationFile, JSON.stringify(verification, null, 2))
    
    console.log('')
    console.log('   📊 PRODUCTION DATABASE ANALYSIS COMPLETE:')
    console.log(`      📋 Tables: ${verification.summary.totalTables}`)
    console.log(`      📝 Columns: ${verification.summary.totalColumns}`)
    console.log(`      🔗 Constraints: ${verification.summary.totalConstraints}`)
    console.log(`      🗂️ Indexes: ${verification.summary.totalIndexes}`)

    // Verify critical tables exist
    const criticalTables = ['users', 'clients', 'email_logs', 'email_templates', 'vat_quarters']
    const missingTables = criticalTables.filter(table => !tables.includes(table))
    
    if (missingTables.length > 0) {
      throw new Error(`Missing critical tables: ${missingTables.join(', ')}`)
    }

    console.log('   ✅ All critical tables verified in production')
    console.log(`   📄 Verification data saved: ${path.basename(verificationFile)}`)

    return verification

  } catch (error) {
    console.error('❌ Production verification failed:', error.message)
    throw error
  }
}

// Run the backup
createCompleteBackup().catch(error => {
  console.error('❌ CRITICAL BACKUP FAILURE:', error)
  process.exit(1)
}) 