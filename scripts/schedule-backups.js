const { createBackup } = require('./backup-database')
const cron = require('node-cron')

console.log('🕐 Starting backup scheduler...')

// Schedule backup every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Scheduled backup starting...')
  try {
    await createBackup()
    console.log('✅ Scheduled backup completed successfully')
  } catch (error) {
    console.error('❌ Scheduled backup failed:', error)
    // In production, you might want to send an alert here
  }
}, {
  scheduled: true,
  timezone: "Europe/London" // UK timezone
})

// Schedule backup every 6 hours for critical systems
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Frequent backup starting...')
  try {
    await createBackup()
    console.log('✅ Frequent backup completed successfully')
  } catch (error) {
    console.error('❌ Frequent backup failed:', error)
  }
}, {
  scheduled: true,
  timezone: "Europe/London"
})

console.log('✅ Backup scheduler initialized')
console.log('📅 Daily backups: 2:00 AM UK time')
console.log('📅 Frequent backups: Every 6 hours')
console.log('🔄 Scheduler is running...')

// Keep the process alive
process.on('SIGINT', () => {
  console.log('🛑 Backup scheduler stopping...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('🛑 Backup scheduler stopping...')
  process.exit(0)
}) 