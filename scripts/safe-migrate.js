const { createBackup } = require('./backup-database')
const { auditDatabase } = require('./database-audit')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function safeMigration() {
  console.log('🛡️ SAFE MIGRATION PROCESS')
  console.log('═'.repeat(50))
  
  try {
    // Step 1: Create pre-migration audit and backup
    console.log('1️⃣ Creating pre-migration audit...')
    const preAuditFile = await auditDatabase()
    console.log(`✅ Pre-migration audit: ${preAuditFile}`)
    
    console.log('2️⃣ Creating pre-migration backup...')
    const backupFile = await createBackup()
    console.log(`✅ Backup created: ${backupFile}`)
    
    // Step 2: Check for pending migrations
    console.log('2️⃣ Checking for pending migrations...')
    try {
      const migrationStatus = execSync('npx prisma migrate status', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      })
      console.log('📊 Migration status:', migrationStatus)
    } catch (error) {
      console.log('⚠️ Migration status check failed, proceeding with caution...')
    }
    
    // Step 3: Dry run (validate schema)
    console.log('3️⃣ Validating schema...')
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
    
    // Step 4: Generate Prisma client
    console.log('4️⃣ Generating Prisma client...')
    execSync('npx prisma generate', { 
      encoding: 'utf8',
      stdio: 'inherit' 
    })
    console.log('✅ Prisma client generated')
    
    // Step 5: Ask for confirmation
    console.log('5️⃣ Ready to run migration...')
    console.log('⚠️  This will modify your database structure')
    console.log(`📁 Pre-migration backup: ${backupFile}`)
    
    // In production, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically
    
    // Step 6: Run migration
    console.log('6️⃣ Running database migration...')
    execSync('npx prisma migrate deploy', { 
      encoding: 'utf8',
      stdio: 'inherit' 
    })
    console.log('✅ Migration completed successfully!')
    
    // Step 7: Create post-migration audit and backup
    console.log('7️⃣ Creating post-migration audit...')
    const postAuditFile = await auditDatabase()
    console.log(`✅ Post-migration audit: ${postAuditFile}`)
    
    console.log('8️⃣ Creating post-migration backup...')
    const postBackupFile = await createBackup()
    console.log(`✅ Post-migration backup: ${postBackupFile}`)
    
    console.log('🎉 SAFE MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('═'.repeat(50))
    console.log(`📁 Pre-migration audit:   ${preAuditFile}`)
    console.log(`📁 Pre-migration backup:  ${backupFile}`)
    console.log(`📁 Post-migration audit:  ${postAuditFile}`)
    console.log(`📁 Post-migration backup: ${postBackupFile}`)
    
  } catch (error) {
    console.error('❌ MIGRATION FAILED:', error.message)
    console.log('🔄 You can restore from the pre-migration backup if needed')
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  safeMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { safeMigration } 