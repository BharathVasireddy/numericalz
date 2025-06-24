const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearMockEmailLogs() {
  console.log('🔄 Clearing mock email logs...')
  
  try {
    const result = await prisma.emailLog.deleteMany({})
    console.log(`✅ Deleted ${result.count} mock email logs`)
    
  } catch (error) {
    console.error('❌ Error clearing mock email logs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearMockEmailLogs()
  .then(() => {
    console.log('🎉 Mock email logs cleared successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to clear mock email logs:', error)
    process.exit(1)
  }) 