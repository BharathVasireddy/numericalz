const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugActivityLogs() {
  try {
    console.log('🔍 Debugging VAT activity logs...')
    
    const vatLogs = await prisma.activityLog.findMany({
      where: {
        action: {
          startsWith: 'VAT_'
        }
      },
      take: 5,
      orderBy: {
        timestamp: 'desc'
      }
    })
    
    console.log(`📊 Found ${vatLogs.length} VAT activity logs (showing first 5):`)
    
    vatLogs.forEach((log, index) => {
      console.log(`\n--- Log ${index + 1} ---`)
      console.log(`Action: ${log.action}`)
      console.log(`Client ID: ${log.clientId}`)
      console.log(`User ID: ${log.userId}`)
      console.log(`Timestamp: ${log.timestamp}`)
      console.log(`Details: ${log.details}`)
      
      try {
        const details = JSON.parse(log.details)
        console.log(`Parsed details:`, {
          clientId: details.clientId,
          quarterPeriod: details.quarterPeriod,
          assigneeId: details.assigneeId,
          newStage: details.newStage,
          oldStage: details.oldStage
        })
      } catch (e) {
        console.log(`Could not parse details: ${e.message}`)
      }
    })
    
    // Count by action type
    const actionCounts = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        action: {
          startsWith: 'VAT_'
        }
      },
      _count: {
        action: true
      }
    })
    
    console.log(`\n📊 VAT action counts:`)
    actionCounts.forEach(count => {
      console.log(`   ${count.action}: ${count._count.action}`)
    })
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugActivityLogs() 