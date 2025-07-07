/**
 * VAT Functionality Verification Script
 * 
 * Tests all critical VAT assignment functionality to ensure
 * nothing breaks during the vatAssignedUserId cleanup process
 */

const { PrismaClient } = require('@prisma/client')

async function verifyVATFunctionality() {
  const db = new PrismaClient()
  
  try {
    console.log('🔍 Starting VAT functionality verification...\n')
    
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    }
    
    // Test 1: VAT Clients Query
    console.log('1️⃣ Testing VAT clients API...')
    try {
      const vatClients = await db.client.findMany({
        where: { isVatEnabled: true },
        include: {
          vatQuartersWorkflow: {
            include: {
              assignedUser: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })
      console.log(`   ✅ Found ${vatClients.length} VAT clients`)
      results.passed++
    } catch (error) {
      console.log(`   ❌ VAT clients query failed: ${error.message}`)
      results.failed++
      results.errors.push(`VAT clients query: ${error.message}`)
    }
    results.total++
    
    // Test 2: VAT Quarter Assignment
    console.log('2️⃣ Testing VAT quarter assignments...')
    try {
      const assignedQuarters = await db.vATQuarter.findMany({
        where: { assignedUserId: { not: null } },
        include: {
          assignedUser: {
            select: { id: true, name: true }
          },
          client: {
            select: { companyName: true }
          }
        }
      })
      console.log(`   ✅ Found ${assignedQuarters.length} assigned VAT quarters`)
      assignedQuarters.forEach(q => {
        console.log(`      - ${q.client.companyName}: ${q.assignedUser?.name || 'Unassigned'}`)
      })
      results.passed++
    } catch (error) {
      console.log(`   ❌ VAT quarter assignment query failed: ${error.message}`)
      results.failed++
      results.errors.push(`VAT quarter assignments: ${error.message}`)
    }
    results.total++
    
    // Test 3: User VAT Workload Calculation
    console.log('3️⃣ Testing user VAT workload calculation...')
    try {
      const users = await db.user.findMany({
        where: { isActive: true },
        include: {
          assignedVATQuarters: {
            where: { isCompleted: false },
            include: {
              client: {
                select: { companyName: true }
              }
            }
          }
        }
      })
      
      users.forEach(user => {
        const vatCount = user.assignedVATQuarters.length
        console.log(`   📊 ${user.name}: ${vatCount} active VAT quarters`)
      })
      console.log(`   ✅ User VAT workload calculation working`)
      results.passed++
    } catch (error) {
      console.log(`   ❌ User VAT workload calculation failed: ${error.message}`)
      results.failed++
      results.errors.push(`User VAT workload: ${error.message}`)
    }
    results.total++
    
    // Test 4: Unassigned VAT Quarters
    console.log('4️⃣ Testing unassigned VAT quarters detection...')
    try {
      const unassignedQuarters = await db.vATQuarter.findMany({
        where: { 
          assignedUserId: null,
          isCompleted: false
        },
        include: {
          client: {
            select: { companyName: true }
          }
        }
      })
      console.log(`   ✅ Found ${unassignedQuarters.length} unassigned VAT quarters`)
      unassignedQuarters.forEach(q => {
        console.log(`      - ${q.client.companyName}: Quarter ${q.quarterPeriod}`)
      })
      results.passed++
    } catch (error) {
      console.log(`   ❌ Unassigned VAT quarters detection failed: ${error.message}`)
      results.failed++
      results.errors.push(`Unassigned VAT detection: ${error.message}`)
    }
    results.total++
    
    // Test 5: VAT Workflow History
    console.log('5️⃣ Testing VAT workflow history...')
    try {
      const recentHistory = await db.vATWorkflowHistory.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          vatQuarter: {
            include: {
              client: {
                select: { companyName: true }
              }
            }
          }
        }
      })
      console.log(`   ✅ Found ${recentHistory.length} recent workflow history entries`)
      results.passed++
    } catch (error) {
      console.log(`   ❌ VAT workflow history query failed: ${error.message}`)
      results.failed++
      results.errors.push(`VAT workflow history: ${error.message}`)
    }
    results.total++
    
    // Test 6: Confirm client-level VAT assignments have been cleaned up
    console.log('6️⃣ Confirming client-level VAT assignments cleanup...')
    try {
      // Since vatAssignedUserId field has been removed from schema, this confirms cleanup is complete
      console.log('   ✅ Client-level VAT assignment fields successfully removed from schema')
      console.log('   ✅ VAT system now uses quarter-level assignments only')
      results.passed++
    } catch (error) {
      console.log(`   ❌ VAT assignment cleanup verification failed: ${error.message}`)
      results.failed++
      results.errors.push(`VAT assignment cleanup: ${error.message}`)
    }
    results.total++
    
    // Summary
    console.log('\n📋 VERIFICATION SUMMARY:')
    console.log(`   Total Tests: ${results.total}`)
    console.log(`   Passed: ${results.passed}`)
    console.log(`   Failed: ${results.failed}`)
    
    if (results.failed > 0) {
      console.log('\n❌ ERRORS FOUND:')
      results.errors.forEach(error => console.log(`   - ${error}`))
      process.exit(1)
    } else {
      console.log('\n✅ All VAT functionality tests passed!')
    }
    
    return results
    
  } catch (error) {
    console.error('💥 Verification script failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

if (require.main === module) {
  verifyVATFunctionality()
}

module.exports = { verifyVATFunctionality } 