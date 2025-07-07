const fs = require('fs')
const path = require('path')

// Import migration modules
const { migrate: migrateVATCleanup } = require('./001-cleanup-vat-assignment')
const { migrate: migrateEmailTemplate } = require('./002-create-email-template')

async function runAllMigrations() {
  console.log('🚀 Starting All Production Migrations')
  console.log('=' * 60)
  console.log(`🕒 Started at: ${new Date().toISOString()}`)
  
  const results = []
  
  try {
    // Migration 1: Clean up VAT assignment field
    console.log('\n🔄 Running Migration 1: VAT Assignment Cleanup')
    console.log('-' * 40)
    
    try {
      const result1 = await migrateVATCleanup()
      results.push({
        migration: '001-cleanup-vat-assignment',
        success: true,
        result: result1
      })
      console.log('✅ Migration 1 completed successfully')
    } catch (error) {
      console.error('❌ Migration 1 failed:', error.message)
      results.push({
        migration: '001-cleanup-vat-assignment',
        success: false,
        error: error.message
      })
      // Continue with other migrations even if this one fails
    }
    
    // Migration 2: Create email template
    console.log('\n🔄 Running Migration 2: Email Template Creation')
    console.log('-' * 40)
    
    try {
      const result2 = await migrateEmailTemplate()
      results.push({
        migration: '002-create-email-template',
        success: true,
        result: result2
      })
      console.log('✅ Migration 2 completed successfully')
    } catch (error) {
      console.error('❌ Migration 2 failed:', error.message)
      results.push({
        migration: '002-create-email-template',
        success: false,
        error: error.message
      })
    }
    
    // Summary
    console.log('\n📊 Migration Summary')
    console.log('=' * 60)
    
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    
    console.log(`🎯 Success Rate: ${successCount}/${totalCount} migrations completed`)
    console.log(`🕒 Completed at: ${new Date().toISOString()}`)
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} Migration ${index + 1}: ${result.migration}`)
      if (result.success && result.result) {
        console.log(`   ${result.result.summary}`)
      }
      if (!result.success) {
        console.log(`   Error: ${result.error}`)
      }
    })
    
    // Save results to file
    const resultsPath = `migrations/migration-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalMigrations: totalCount,
      successfulMigrations: successCount,
      results: results
    }, null, 2))
    
    console.log(`\n📄 Results saved to: ${resultsPath}`)
    
    if (successCount === totalCount) {
      console.log('\n🎉 All migrations completed successfully!')
      console.log('\n📋 Next Steps:')
      console.log('1. Deploy the code fix to production')
      console.log('2. Verify email history shows 664 emails')
      console.log('3. Test email template functionality')
      console.log('4. Monitor for any issues')
    } else {
      console.log('\n⚠️  Some migrations failed - check the logs above')
      console.log('   You may need to run failed migrations manually')
    }
    
    return {
      success: successCount === totalCount,
      totalMigrations: totalCount,
      successfulMigrations: successCount,
      results: results,
      resultsPath: resultsPath
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error during migration process:', error)
    
    // Save error state
    const errorPath = `migrations/migration-error-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    fs.writeFileSync(errorPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      results: results
    }, null, 2))
    
    console.log(`\n📄 Error details saved to: ${errorPath}`)
    
    throw error
  }
}

// Run migrations if called directly
if (require.main === module) {
  runAllMigrations()
    .then(result => {
      console.log('\n✅ Migration Process Complete')
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n❌ Migration Process Failed:', error)
      process.exit(1)
    })
}

module.exports = { runAllMigrations } 