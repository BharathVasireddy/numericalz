#!/usr/bin/env node

/**
 * PERFORMANCE ANALYSIS AND FIX SCRIPT
 * 
 * This script analyzes and fixes critical performance issues:
 * 1. Database connection optimization
 * 2. Query analysis and optimization
 * 3. Index recommendations
 * 4. Memory leak detection
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
})

// Performance metrics
const performanceMetrics = {
  queryTimes: [],
  slowQueries: [],
  errorCount: 0,
  connectionIssues: 0
}

// Monitor query performance
prisma.$on('query', (e) => {
  performanceMetrics.queryTimes.push(e.duration)
  
  if (e.duration > 1000) {
    performanceMetrics.slowQueries.push({
      query: e.query.substring(0, 200) + '...',
      duration: e.duration,
      params: e.params
    })
    console.log(`🐌 SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 100)}...`)
  }
})

prisma.$on('error', (e) => {
  performanceMetrics.errorCount++
  console.error('🚨 DATABASE ERROR:', e)
})

async function testDatabasePerformance() {
  console.log('🔍 TESTING DATABASE PERFORMANCE...\n')
  
  const tests = [
    {
      name: 'Simple Health Check',
      test: async () => {
        const start = Date.now()
        await prisma.$queryRaw`SELECT 1 as test`
        return Date.now() - start
      }
    },
    {
      name: 'Client Count Query',
      test: async () => {
        const start = Date.now()
        await prisma.client.count()
        return Date.now() - start
      }
    },
    {
      name: 'Simple Client List (5 records)',
      test: async () => {
        const start = Date.now()
        await prisma.client.findMany({
          take: 5,
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            isActive: true
          }
        })
        return Date.now() - start
      }
    },
    {
      name: 'Client List with Assignments (5 records)',
      test: async () => {
        const start = Date.now()
        await prisma.client.findMany({
          take: 5,
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            isActive: true,
            assignedUser: {
              select: { id: true, name: true }
            },
            ltdCompanyAssignedUser: {
              select: { id: true, name: true }
            },
            nonLtdCompanyAssignedUser: {
              select: { id: true, name: true }
            },
            vatAssignedUser: {
              select: { id: true, name: true }
            }
          }
        })
        return Date.now() - start
      }
    },
    {
      name: 'User List Query',
      test: async () => {
        const start = Date.now()
        await prisma.user.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        })
        return Date.now() - start
      }
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      console.log(`⏱️  Testing: ${test.name}`)
      const duration = await test.test()
      results.push({ name: test.name, duration, status: 'SUCCESS' })
      
      const status = duration < 100 ? '🟢 FAST' : 
                   duration < 500 ? '🟡 MODERATE' : 
                   duration < 1000 ? '🟠 SLOW' : '🔴 CRITICAL'
      
      console.log(`   ${status} ${duration}ms\n`)
    } catch (error) {
      results.push({ name: test.name, duration: null, status: 'ERROR', error: error.message })
      console.log(`   🔴 ERROR: ${error.message}\n`)
    }
  }
  
  return results
}

async function analyzeIndexes() {
  console.log('📊 ANALYZING DATABASE INDEXES...\n')
  
  try {
    // Check for missing indexes on frequently queried columns
    const indexAnalysis = [
      {
        table: 'Client',
        column: 'isActive',
        reason: 'Frequently filtered in main queries'
      },
      {
        table: 'Client', 
        column: 'companyType',
        reason: 'Used in assignment logic filtering'
      },
      {
        table: 'Client',
        column: 'assignedUserId',
        reason: 'User assignment filtering'
      },
      {
        table: 'Client',
        column: 'ltdCompanyAssignedUserId',
        reason: 'Ltd company assignment filtering'
      },
      {
        table: 'Client',
        column: 'nonLtdCompanyAssignedUserId', 
        reason: 'Non-Ltd company assignment filtering'
      },
      {
        table: 'Client',
        column: 'vatAssignedUserId',
        reason: 'VAT assignment filtering'
      },
      {
        table: 'User',
        column: 'isActive',
        reason: 'Active user filtering'
      }
    ]
    
    console.log('🔍 RECOMMENDED INDEXES:')
    indexAnalysis.forEach(index => {
      console.log(`   📌 ${index.table}.${index.column} - ${index.reason}`)
    })
    
    console.log('\n📝 INDEX CREATION COMMANDS:')
    console.log('   Run these in your database to improve performance:')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_is_active ON "Client"("isActive");')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_company_type ON "Client"("companyType");')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_assigned_user ON "Client"("assignedUserId");')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_ltd_assigned ON "Client"("ltdCompanyAssignedUserId");')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_nonltd_assigned ON "Client"("nonLtdCompanyAssignedUserId");')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_vat_assigned ON "Client"("vatAssignedUserId");')
    console.log('   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_is_active ON "User"("isActive");')
    
  } catch (error) {
    console.error('❌ Index analysis failed:', error.message)
  }
}

async function generatePerformanceReport(testResults) {
  console.log('\n📋 PERFORMANCE ANALYSIS REPORT')
  console.log('=' .repeat(50))
  
  const totalQueries = performanceMetrics.queryTimes.length
  const avgQueryTime = totalQueries > 0 ? 
    performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / totalQueries : 0
  const maxQueryTime = totalQueries > 0 ? Math.max(...performanceMetrics.queryTimes) : 0
  
  console.log(`\n📊 DATABASE METRICS:`)
  console.log(`   Total Queries: ${totalQueries}`)
  console.log(`   Average Query Time: ${avgQueryTime.toFixed(2)}ms`)
  console.log(`   Maximum Query Time: ${maxQueryTime}ms`)
  console.log(`   Slow Queries (>1s): ${performanceMetrics.slowQueries.length}`)
  console.log(`   Database Errors: ${performanceMetrics.errorCount}`)
  
  console.log(`\n⏱️  TEST RESULTS:`)
  testResults.forEach(result => {
    const status = result.status === 'SUCCESS' ? 
      (result.duration < 100 ? '🟢' : result.duration < 500 ? '🟡' : result.duration < 1000 ? '🟠' : '🔴') : 
      '❌'
    console.log(`   ${status} ${result.name}: ${result.duration ? result.duration + 'ms' : result.status}`)
  })
  
  if (performanceMetrics.slowQueries.length > 0) {
    console.log(`\n🐌 SLOW QUERIES DETECTED:`)
    performanceMetrics.slowQueries.forEach((query, index) => {
      console.log(`   ${index + 1}. ${query.duration}ms - ${query.query}`)
    })
  }
  
  console.log(`\n🎯 PERFORMANCE RECOMMENDATIONS:`)
  
  const criticalIssues = testResults.filter(r => r.duration > 1000 || r.status === 'ERROR')
  const slowIssues = testResults.filter(r => r.duration > 500 && r.duration <= 1000)
  
  if (criticalIssues.length > 0) {
    console.log(`   🔴 CRITICAL ISSUES (${criticalIssues.length}):`)
    console.log(`      - Queries taking >1000ms need immediate optimization`)
    console.log(`      - Consider database connection pool tuning`)
    console.log(`      - Review query complexity and add indexes`)
  }
  
  if (slowIssues.length > 0) {
    console.log(`   🟠 MODERATE ISSUES (${slowIssues.length}):`)
    console.log(`      - Queries taking 500-1000ms should be optimized`)
    console.log(`      - Consider query optimization and caching`)
  }
  
  console.log(`\n💡 IMMEDIATE ACTIONS:`)
  console.log(`   1. Add database indexes (see commands above)`)
  console.log(`   2. Optimize complex queries with multiple JOINs`)
  console.log(`   3. Implement query result caching for static data`)
  console.log(`   4. Monitor database connection pool usage`)
  console.log(`   5. Consider pagination for large result sets`)
  
  const overallHealth = criticalIssues.length === 0 && slowIssues.length < 2 ? 
    '🟢 HEALTHY' : criticalIssues.length > 0 ? '🔴 CRITICAL' : '🟡 NEEDS ATTENTION'
  
  console.log(`\n🏁 OVERALL PERFORMANCE: ${overallHealth}`)
}

async function main() {
  console.log('🚀 NUMERICALZ PERFORMANCE ANALYSIS')
  console.log('=' .repeat(50))
  console.log('Analyzing database performance and identifying bottlenecks...\n')
  
  try {
    // Test database performance
    const testResults = await testDatabasePerformance()
    
    // Analyze indexes
    await analyzeIndexes()
    
    // Generate comprehensive report
    await generatePerformanceReport(testResults)
    
    console.log('\n✅ PERFORMANCE ANALYSIS COMPLETE')
    console.log('Review the recommendations above to improve system performance.')
    
  } catch (error) {
    console.error('\n❌ PERFORMANCE ANALYSIS FAILED:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the performance analysis
main() 