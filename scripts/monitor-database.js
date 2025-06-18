const { PrismaClient } = require('@prisma/client')
const { auditDatabase } = require('./database-audit')

const prisma = new PrismaClient()

let lastUserCount = 0
let lastClientCount = 0
let monitoringInterval = null

async function startMonitoring() {
  console.log('🔍 Starting database monitoring...')
  
  // Get initial counts
  try {
    lastUserCount = await prisma.user.count()
    lastClientCount = await prisma.client.count()
    
    console.log(`📊 Initial state:`)
    console.log(`   - Users: ${lastUserCount}`)
    console.log(`   - Clients: ${lastClientCount}`)
    console.log('🔄 Monitoring every 30 seconds...')
    
  } catch (error) {
    console.error('❌ Failed to get initial database state:', error)
    return
  }
  
  // Monitor every 30 seconds
  monitoringInterval = setInterval(async () => {
    try {
      const currentUserCount = await prisma.user.count()
      const currentClientCount = await prisma.client.count()
      
      // Check for data loss
      if (currentUserCount < lastUserCount) {
        console.log('🚨 CRITICAL ALERT: USER DATA LOSS DETECTED!')
        console.log(`   - Previous user count: ${lastUserCount}`)
        console.log(`   - Current user count: ${currentUserCount}`)
        console.log(`   - Lost ${lastUserCount - currentUserCount} users`)
        
        // Create emergency audit
        console.log('📋 Creating emergency audit...')
        await auditDatabase()
        
        // Alert (in production, send email/notification)
        console.log('🚨 IMMEDIATE ACTION REQUIRED!')
      }
      
      if (currentClientCount < lastClientCount) {
        console.log('⚠️ WARNING: CLIENT DATA LOSS DETECTED!')
        console.log(`   - Previous client count: ${lastClientCount}`)
        console.log(`   - Current client count: ${currentClientCount}`)
        console.log(`   - Lost ${lastClientCount - currentClientCount} clients`)
        
        // Create emergency audit
        console.log('📋 Creating emergency audit...')
        await auditDatabase()
      }
      
      // Check for zero users (critical)
      if (currentUserCount === 0) {
        console.log('🚨 CRITICAL: NO USERS IN DATABASE!')
        console.log('🚨 SYSTEM IS UNUSABLE - IMMEDIATE RESTORATION REQUIRED!')
        
        // Create emergency audit
        await auditDatabase()
        
        // In production, you might want to automatically trigger restoration
        console.log('💡 Run: npm run db:restore [backup-file] to restore data')
      }
      
      // Update counts
      lastUserCount = currentUserCount
      lastClientCount = currentClientCount
      
      // Log status every 5 minutes (10 intervals)
      if (Date.now() % (5 * 60 * 1000) < 30000) {
        console.log(`✅ Status: ${currentUserCount} users, ${currentClientCount} clients`)
      }
      
    } catch (error) {
      console.error('❌ Monitoring error:', error.message)
    }
  }, 30000) // Every 30 seconds
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Stopping database monitoring...')
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
    }
    prisma.$disconnect()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('🛑 Stopping database monitoring...')
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
    }
    prisma.$disconnect()
    process.exit(0)
  })
}

// Run monitoring if called directly
if (require.main === module) {
  startMonitoring()
    .catch((error) => {
      console.error('❌ Failed to start monitoring:', error)
      process.exit(1)
    })
}

module.exports = { startMonitoring } 