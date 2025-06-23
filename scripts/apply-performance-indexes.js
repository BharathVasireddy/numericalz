#!/usr/bin/env node

/**
 * APPLY PERFORMANCE INDEXES SCRIPT
 * 
 * This script applies critical database indexes to improve performance
 * dramatically. These indexes are essential for production performance.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function applyIndexes() {
  console.log('🚀 APPLYING CRITICAL PERFORMANCE INDEXES...')
  console.log('=' .repeat(50))
  
  const indexCommands = [
    // Client table indexes (most critical)
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_is_active ON "Client"("isActive")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_company_type ON "Client"("companyType")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_assigned_user ON "Client"("assignedUserId")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_ltd_assigned ON "Client"("ltdCompanyAssignedUserId")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_nonltd_assigned ON "Client"("nonLtdCompanyAssignedUserId")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_vat_assigned ON "Client"("vatAssignedUserId")',
    
    // User table indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_is_active ON "User"("isActive")',
    
    // Composite indexes for common query patterns
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_active_type ON "Client"("isActive", "companyType")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_active_name ON "Client"("isActive", "companyName")',
    
    // Additional performance indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_code ON "Client"("clientCode")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_company_number ON "Client"("companyNumber")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_vat_enabled ON "Client"("isVatEnabled")',
    
    // User role and email indexes
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User"("role")',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User"("email")',
  ]
  
  let successCount = 0
  let errorCount = 0
  
  for (const [index, command] of indexCommands.entries()) {
    try {
      console.log(`📊 Creating index ${index + 1}/${indexCommands.length}...`)
      console.log(`   ${command.substring(0, 80)}...`)
      
      const startTime = Date.now()
      await prisma.$executeRawUnsafe(command)
      const duration = Date.now() - startTime
      
      console.log(`   ✅ SUCCESS (${duration}ms)\n`)
      successCount++
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`)
      errorCount++
      
      // Continue with other indexes even if one fails
    }
  }
  
  // Analyze tables for optimal query planning
  console.log('📈 ANALYZING TABLES FOR OPTIMAL QUERY PLANNING...')
  
  const analyzeCommands = [
    'ANALYZE "Client"',
    'ANALYZE "User"',
    'ANALYZE "VATQuarter"',
    'ANALYZE "ActivityLog"'
  ]
  
  for (const command of analyzeCommands) {
    try {
      console.log(`   ${command}...`)
      await prisma.$executeRawUnsafe(command)
      console.log(`   ✅ ANALYZED`)
    } catch (error) {
      console.log(`   ❌ ANALYZE ERROR: ${error.message}`)
    }
  }
  
  console.log('\n📊 INDEX CREATION SUMMARY:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log(`   📈 Total: ${indexCommands.length}`)
  
  if (successCount > 0) {
    console.log('\n🎉 PERFORMANCE INDEXES APPLIED!')
    console.log('Your database queries should now be significantly faster.')
    console.log('Run the performance test again to see the improvement.')
  } else {
    console.log('\n⚠️  NO INDEXES WERE CREATED')
    console.log('Check the error messages above and database permissions.')
  }
}

async function main() {
  try {
    await applyIndexes()
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the index application
main() 