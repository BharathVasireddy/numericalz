/**
 * Cron Job Setup for Automated Workflow Management
 * 
 * Sets up automated cron jobs for VAT and Ltd workflow management
 */

const cron = require('node-cron')
const { autoAssignVATPartners } = require('./auto-assign-vat-partners')
const { rolloverLtdWorkflows, checkYearEndStatus } = require('./ltd-workflow-rollover')
const { checkVATQuarterTransitions } = require('./vat-quarter-automation')

console.log('🕐 Setting up automated workflow management cron jobs...')

// Auto-assign VAT quarters to Partners on 1st of each month at midnight (London time)
// Cron expression: '0 0 1 * *' = At 00:00 on day-of-month 1
const vatAutoAssignJob = cron.schedule('0 0 1 * *', async () => {
  console.log('\n🚀 Running scheduled VAT Partner auto-assignment...')
  console.log('Time:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }))
  
  try {
    await autoAssignVATPartners()
    console.log('✅ Scheduled VAT auto-assignment completed successfully')
  } catch (error) {
    console.error('❌ Scheduled VAT auto-assignment failed:', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London' // Use London timezone for UK compliance
})

// Ltd Companies Workflow Rollover - Monthly on 1st at 1:00 AM (London time)
// Cron expression: '0 1 1 * *' = At 01:00 on day-of-month 1
const ltdWorkflowRolloverJob = cron.schedule('0 1 1 * *', async () => {
  console.log('\n🔄 Running scheduled Ltd workflow rollover...')
  console.log('Time:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }))
  
  try {
    await rolloverLtdWorkflows()
    console.log('✅ Scheduled Ltd workflow rollover completed successfully')
  } catch (error) {
    console.error('❌ Scheduled Ltd workflow rollover failed:', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London'
})

// Ltd Companies Year End Status Check - Daily at 2:00 AM (London time)
// Cron expression: '0 2 * * *' = At 02:00 every day
const ltdYearEndCheckJob = cron.schedule('0 2 * * *', async () => {
  console.log('\n🔍 Running scheduled Ltd year end status check...')
  console.log('Time:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }))
  
  try {
    await checkYearEndStatus()
    console.log('✅ Scheduled Ltd year end check completed successfully')
  } catch (error) {
    console.error('❌ Scheduled Ltd year end check failed:', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London'
})

// VAT Quarter Transitions Check - Daily at 12:00 AM (London time)
// Cron expression: '0 0 * * *' = At midnight every day
const vatQuarterTransitionJob = cron.schedule('0 0 * * *', async () => {
  console.log('\n🔄 Running scheduled VAT quarter transition check...')
  console.log('Time:', new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }))
  
  try {
    const transitionResults = await checkVATQuarterTransitions()
    
    console.log('📊 VAT Automation Results:')
    console.log(`   🔄 Transitions: ${transitionResults.transitioned}`)
    console.log(`   📧 Notifications: ${transitionResults.notified}`)
    console.log('✅ Scheduled VAT quarter automation completed successfully')
    console.log('   Note: Quarters remain unassigned for manual partner assignment')
  } catch (error) {
    console.error('❌ Scheduled VAT quarter automation failed:', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London'
})

console.log('✅ VAT auto-assignment cron job scheduled for 1st of each month at midnight (London time)')
console.log('✅ Ltd workflow rollover cron job scheduled for 1st of each month at 1:00 AM (London time)')
console.log('✅ Ltd year end check cron job scheduled daily at 2:00 AM (London time)')
console.log('✅ VAT quarter transition check cron job scheduled daily at midnight (London time)')

// Keep the process running
if (require.main === module) {
  console.log('🔄 Cron jobs are now active. Press Ctrl+C to stop.')
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down cron jobs...')
    vatAutoAssignJob.stop()
    ltdWorkflowRolloverJob.stop()
    ltdYearEndCheckJob.stop()
    vatQuarterTransitionJob.stop()
    console.log('✅ All cron jobs stopped. Goodbye!')
    process.exit(0)
  })
  
  // Keep process alive
  setInterval(() => {
    // Do nothing, just keep the process running
  }, 60000) // Check every minute
}

module.exports = {
  vatAutoAssignJob,
  ltdWorkflowRolloverJob,
  ltdYearEndCheckJob,
  vatQuarterTransitionJob
}