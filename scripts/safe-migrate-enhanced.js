const { createBackup } = require('./backup-database')
const { auditDatabase } = require('./database-audit')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Destructive SQL patterns that require special attention
const DESTRUCTIVE_PATTERNS = [
  /DROP\s+TABLE/i,
  /DROP\s+COLUMN/i,
  /ALTER\s+TABLE.*DROP/i,
  /TRUNCATE/i,
  /DELETE\s+FROM/i,
  /ALTER\s+TABLE.*ALTER\s+COLUMN.*TYPE/i, // Type changes can lose data
  /ALTER\s+TABLE.*RENAME\s+COLUMN/i,       // Column renames can lose data
]

const RISKY_PATTERNS = [
  /ADD\s+CONSTRAINT.*FOREIGN\s+KEY/i,
  /ALTER\s+TABLE.*ADD\s+CONSTRAINT/i,
  /CREATE\s+UNIQUE\s+INDEX/i,
  /ALTER\s+TABLE.*ALTER\s+COLUMN.*NOT\s+NULL/i,
]

function analyzeLatestMigration() {
  console.log('🔍 Analyzing latest migration for destructive operations...')
  
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️ No migrations directory found')
    return { isDestructive: false, isRisky: false, sql: '' }
  }
  
  // Get the latest migration
  const migrationFolders = fs.readdirSync(migrationsDir)
    .filter(folder => fs.statSync(path.join(migrationsDir, folder)).isDirectory())
    .sort()
    .reverse()
  
  if (migrationFolders.length === 0) {
    console.log('⚠️ No migration folders found')
    return { isDestructive: false, isRisky: false, sql: '' }
  }
  
  const latestMigration = migrationFolders[0]
  const migrationSqlPath = path.join(migrationsDir, latestMigration, 'migration.sql')
  
  if (!fs.existsSync(migrationSqlPath)) {
    console.log('⚠️ No migration.sql found in latest migration')
    return { isDestructive: false, isRisky: false, sql: '' }
  }
  
  const sql = fs.readFileSync(migrationSqlPath, 'utf8')
  console.log(`📄 Latest migration: ${latestMigration}`)
  console.log('📝 SQL content:')
  console.log('─'.repeat(50))
  console.log(sql)
  console.log('─'.repeat(50))
  
  // Check for destructive patterns
  const isDestructive = DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(sql))
  const isRisky = RISKY_PATTERNS.some(pattern => pattern.test(sql))
  
  if (isDestructive) {
    console.log('🚨 DESTRUCTIVE OPERATIONS DETECTED!')
    console.log('   This migration contains operations that may cause DATA LOSS')
    DESTRUCTIVE_PATTERNS.forEach(pattern => {
      if (pattern.test(sql)) {
        console.log(`   ⚠️ Found: ${pattern.source}`)
      }
    })
  }
  
  if (isRisky) {
    console.log('⚠️ RISKY OPERATIONS DETECTED!')
    console.log('   This migration contains operations that may fail with existing data')
    RISKY_PATTERNS.forEach(pattern => {
      if (pattern.test(sql)) {
        console.log(`   ⚠️ Found: ${pattern.source}`)
      }
    })
  }
  
  if (!isDestructive && !isRisky) {
    console.log('✅ Migration appears safe - no destructive operations detected')
  }
  
  return { isDestructive, isRisky, sql, migrationName: latestMigration }
}

function askForConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().startsWith('y'))
    })
  })
}

async function enhancedSafeMigration() {
  console.log('🛡️ ENHANCED SAFE MIGRATION PROCESS')
  console.log('═'.repeat(60))
  
  try {
    // Step 1: Analyze the migration first
    const analysis = analyzeLatestMigration()
    
    // Step 2: Create pre-migration audit and backup
    console.log('\n1️⃣ Creating pre-migration audit...')
    const preAuditFile = await auditDatabase()
    console.log(`✅ Pre-migration audit: ${preAuditFile}`)
    
    console.log('2️⃣ Creating pre-migration backup...')
    const backupFile = await createBackup()
    console.log(`✅ Backup created: ${backupFile}`)
    
    // Step 3: Check migration status
    console.log('3️⃣ Checking migration status...')
    try {
      const migrationStatus = execSync('npx prisma migrate status', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      })
      console.log('📊 Migration status:', migrationStatus)
    } catch (error) {
      console.log('⚠️ Migration status check failed, proceeding with caution...')
    }
    
    // Step 4: Validate schema
    console.log('4️⃣ Validating schema...')
    try {
      execSync('npx prisma validate', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      })
      console.log('✅ Schema validation passed')
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message)
      throw new Error('Schema validation failed - migration aborted')
    }
    
    // Step 5: Handle destructive/risky migrations
    if (analysis.isDestructive) {
      console.log('\n🚨 DESTRUCTIVE MIGRATION DETECTED!')
      console.log('   This migration may cause PERMANENT DATA LOSS')
      console.log('   Recommended actions:')
      console.log('   1. Review the SQL carefully')
      console.log('   2. Test on a copy of production data first')
      console.log('   3. Consider creating a custom migration strategy')
      console.log(`   4. Backup file: ${backupFile}`)
      
      const proceed = await askForConfirmation('\n❓ Do you want to proceed anyway? (y/N): ')
      if (!proceed) {
        console.log('❌ Migration aborted by user')
        return
      }
    } else if (analysis.isRisky) {
      console.log('\n⚠️ RISKY MIGRATION DETECTED!')
      console.log('   This migration may fail with existing data')
      console.log('   Consider reviewing data compatibility first')
      
      const proceed = await askForConfirmation('\n❓ Do you want to proceed? (y/N): ')
      if (!proceed) {
        console.log('❌ Migration aborted by user')
        return
      }
    } else {
      console.log('\n✅ Safe migration detected - proceeding automatically')
    }
    
    // Step 6: Generate Prisma client
    console.log('5️⃣ Generating Prisma client...')
    execSync('npx prisma generate', { 
      encoding: 'utf8',
      stdio: 'inherit' 
    })
    console.log('✅ Prisma client generated')
    
    // Step 7: Run migration
    console.log('6️⃣ Running database migration...')
    execSync('npx prisma migrate deploy', { 
      encoding: 'utf8',
      stdio: 'inherit' 
    })
    console.log('✅ Migration completed successfully!')
    
    // Step 8: Create post-migration audit and backup
    console.log('7️⃣ Creating post-migration audit...')
    const postAuditFile = await auditDatabase()
    console.log(`✅ Post-migration audit: ${postAuditFile}`)
    
    console.log('8️⃣ Creating post-migration backup...')
    const postBackupFile = await createBackup()
    console.log(`✅ Post-migration backup: ${postBackupFile}`)
    
    console.log('\n🎉 ENHANCED SAFE MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('═'.repeat(60))
    console.log(`📁 Pre-migration audit:   ${preAuditFile}`)
    console.log(`📁 Pre-migration backup:  ${backupFile}`)
    console.log(`📁 Post-migration audit:  ${postAuditFile}`)
    console.log(`📁 Post-migration backup: ${postBackupFile}`)
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message)
    console.log('🔄 You can restore from the pre-migration backup if needed:')
    console.log('   npm run db:restore [backup-filename]')
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  enhancedSafeMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { enhancedSafeMigration, analyzeLatestMigration } 