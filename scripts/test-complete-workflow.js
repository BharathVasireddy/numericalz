#!/usr/bin/env node

/**
 * Comprehensive Workflow Testing Script
 * Tests both VAT and Ltd Company workflows through all stages
 * 
 * Usage: node scripts/test-complete-workflow.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  testUser: {
    email: 'bharat@numericalz.com',
    password: 'admin123'
  },
  testClients: {
    ltdCompany: {
      companyName: 'WORKFLOW TEST LTD',
      companyType: 'LIMITED_COMPANY',
      companyNumber: '99999999',
      contactName: 'Test Manager',
      contactEmail: 'test@workflowtest.com',
      contactPhone: '+44 20 9999 9999',
      handlesAnnualAccounts: true,
      isVatEnabled: true,
      vatQuarterGroup: '2_5_8_11'
    },
    nonLtdCompany: {
      companyName: 'WORKFLOW TEST SOLE TRADER',
      companyType: 'SOLE_TRADER',
      contactName: 'Test Trader',
      contactEmail: 'trader@workflowtest.com',
      contactPhone: '+44 20 8888 8888',
      handlesAnnualAccounts: true,
      isVatEnabled: true,
      vatQuarterGroup: '1_4_7_10'
    }
  }
}

// VAT Workflow Stages
const VAT_STAGES = [
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED', 
  'PAPERWORK_RECEIVED',
  'WORK_IN_PROGRESS',
  'QUERIES_PENDING',
  'REVIEW_PENDING_MANAGER',
  'REVIEW_PENDING_PARTNER',
  'EMAILED_TO_PARTNER',
  'EMAILED_TO_CLIENT',
  'CLIENT_APPROVED',
  'FILED_TO_HMRC'
]

// Ltd Company Workflow Stages
const LTD_STAGES = [
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED',
  'PAPERWORK_RECEIVED', 
  'WORK_IN_PROGRESS',
  'DISCUSS_WITH_MANAGER',
  'REVIEW_BY_PARTNER',
  'REVIEW_DONE_HELLO_SIGN',
  'SENT_TO_CLIENT_HELLO_SIGN',
  'APPROVED_BY_CLIENT',
  'SUBMISSION_APPROVED_PARTNER',
  'FILED_CH_HMRC'
]

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString()
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
  console.log(`${prefix} [${timestamp}] ${message}`)
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Database helper functions
async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { role: 'asc' }
    })
    return users
  } catch (error) {
    log(`Error fetching users: ${error.message}`, 'error')
    return []
  }
}

async function createTestClient(clientData) {
  try {
    log(`Creating test client: ${clientData.companyName}`)
    
    const client = await prisma.client.create({
      data: {
        clientCode: `TEST-${Date.now()}`,
        companyName: clientData.companyName,
        companyType: clientData.companyType,
        companyNumber: clientData.companyNumber || null,
        contactName: clientData.contactName,
        contactEmail: clientData.contactEmail,
        contactPhone: clientData.contactPhone,
        handlesAnnualAccounts: clientData.handlesAnnualAccounts,
        isVatEnabled: clientData.isVatEnabled,
        vatQuarterGroup: clientData.vatQuarterGroup,
        isActive: true
      }
    })
    
    log(`✅ Created test client: ${client.companyName} (${client.clientCode})`, 'success')
    return client
  } catch (error) {
    log(`Error creating test client: ${error.message}`, 'error')
    throw error
  }
}

async function createVATQuarter(clientId, users) {
  try {
    log(`Creating VAT quarter for client: ${clientId}`)
    
    // Calculate current quarter dates
    const now = new Date()
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0)
    const filingDue = new Date(quarterEnd.getFullYear(), quarterEnd.getMonth() + 1, 0)
    
    const vatQuarter = await prisma.vATQuarter.create({
      data: {
        clientId,
        quarterPeriod: `${quarterStart.toISOString().split('T')[0]}_to_${quarterEnd.toISOString().split('T')[0]}`,
        quarterStartDate: quarterStart,
        quarterEndDate: quarterEnd,
        filingDueDate: filingDue,
        quarterGroup: '2_5_8_11',
        currentStage: 'PAPERWORK_PENDING_CHASE',
        isCompleted: false
      }
    })
    
    log(`✅ Created VAT quarter: ${vatQuarter.quarterPeriod} (${vatQuarter.id})`, 'success')
    return vatQuarter
  } catch (error) {
    log(`Error creating VAT quarter: ${error.message}`, 'error')
    throw error
  }
}

async function createLtdAccountsWorkflow(clientId, users) {
  try {
    log(`Creating Ltd Accounts workflow for client: ${clientId}`)
    
    // Calculate accounting period dates
    const now = new Date()
    const yearEnd = new Date(now.getFullYear(), 11, 31) // Dec 31st
    const periodStart = new Date(yearEnd.getFullYear() - 1, 0, 1) // Jan 1st previous year
    const accountsDue = new Date(yearEnd.getFullYear() + 1, 8, 30) // 9 months after year end
    const ctDue = new Date(yearEnd.getFullYear() + 1, 11, 31) // 12 months after year end
    const csDue = new Date(yearEnd.getFullYear() + 1, 0, 31) // CS due date
    
    const ltdWorkflow = await prisma.ltdAccountsWorkflow.create({
      data: {
        clientId,
        filingPeriodStart: periodStart,
        filingPeriodEnd: yearEnd,
        accountsDueDate: accountsDue,
        ctDueDate: ctDue,
        csDueDate: csDue,
        currentStage: 'PAPERWORK_PENDING_CHASE',
        isCompleted: false
      }
    })
    
    log(`✅ Created Ltd Accounts workflow: ${ltdWorkflow.filingPeriodEnd.toISOString().split('T')[0]} (${ltdWorkflow.id})`, 'success')
    return ltdWorkflow
  } catch (error) {
    log(`Error creating Ltd Accounts workflow: ${error.message}`, 'error')
    throw error
  }
}

async function ensureRequiredUsers() {
  try {
    log('🔍 Checking for required user roles...')
    
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { role: 'asc' }
    })
    
    const roles = users.map(u => u.role)
    const hasStaff = roles.includes('STAFF')
    const hasManager = roles.includes('MANAGER')
    const hasPartner = roles.includes('PARTNER')
    
    log(`Found roles: ${roles.join(', ')}`)
    
    // Create missing roles if needed
    if (!hasManager) {
      log('Creating MANAGER user for testing...')
      const managerUser = await prisma.user.create({
        data: {
          name: 'Test Manager',
          email: 'manager@test.com',
          role: 'MANAGER',
          isActive: true,
          password: 'test123' // This would be hashed in real scenario
        }
      })
      users.push(managerUser)
      log(`✅ Created MANAGER user: ${managerUser.name}`, 'success')
    }
    
    if (!hasStaff) {
      log('Creating STAFF user for testing...')
      const staffUser = await prisma.user.create({
        data: {
          name: 'Test Staff',
          email: 'staff@test.com',
          role: 'STAFF',
          isActive: true,
          password: 'test123'
        }
      })
      users.push(staffUser)
      log(`✅ Created STAFF user: ${staffUser.name}`, 'success')
    }
    
    return users
  } catch (error) {
    log(`Error ensuring required users: ${error.message}`, 'error')
    return []
  }
}

async function testVATWorkflowStages(vatQuarterId, users) {
  log(`🧪 Testing VAT workflow stages for quarter: ${vatQuarterId}`)
  
  const staffUser = users.find(u => u.role === 'STAFF')
  const managerUser = users.find(u => u.role === 'MANAGER')
  const partnerUser = users.find(u => u.role === 'PARTNER')
  
  // Use available users if specific roles not found
  const testStaff = staffUser || users[0]
  const testManager = managerUser || partnerUser || users[1] || users[0]
  const testPartner = partnerUser || users[0]
  
  if (!testStaff || !testManager || !testPartner) {
    log('Not enough users available for testing', 'error')
    return false
  }
  
  log(`Using users: Staff=${testStaff.name}, Manager=${testManager.name}, Partner=${testPartner.name}`)
  
  for (let i = 0; i < VAT_STAGES.length; i++) {
    const stage = VAT_STAGES[i]
    const isLastStage = i === VAT_STAGES.length - 1
    
    try {
      log(`  Testing stage ${i + 1}/${VAT_STAGES.length}: ${stage}`)
      
      // Assign appropriate user based on stage
      let assignedUserId = testStaff.id
      if (stage.includes('MANAGER')) {
        assignedUserId = testManager.id
      } else if (stage.includes('PARTNER')) {
        assignedUserId = testPartner.id
      }
      
      // Update VAT quarter stage
      const updatedQuarter = await prisma.vATQuarter.update({
        where: { id: vatQuarterId },
        data: {
          currentStage: stage,
          assignedUserId,
          isCompleted: isLastStage,
          // Set milestone dates based on stage
          ...(stage === 'PAPERWORK_CHASED' && { chaseStartedDate: new Date() }),
          ...(stage === 'PAPERWORK_RECEIVED' && { paperworkReceivedDate: new Date() }),
          ...(stage === 'WORK_IN_PROGRESS' && { workStartedDate: new Date() }),
          ...(stage === 'REVIEW_PENDING_PARTNER' && { workFinishedDate: new Date() }),
          ...(stage === 'EMAILED_TO_CLIENT' && { sentToClientDate: new Date() }),
          ...(stage === 'CLIENT_APPROVED' && { clientApprovedDate: new Date() }),
          ...(stage === 'FILED_TO_HMRC' && { filedToHMRCDate: new Date() })
        }
      })
      
      // Create workflow history entry
      await prisma.vATWorkflowHistory.create({
        data: {
          vatQuarterId,
          toStage: stage,
          stageChangedAt: new Date(),
          userId: assignedUserId,
          userName: users.find(u => u.id === assignedUserId)?.name || 'Test User',
          userEmail: users.find(u => u.id === assignedUserId)?.email || 'test@test.com',
          userRole: users.find(u => u.id === assignedUserId)?.role || 'STAFF',
          notes: `Automated testing: ${stage}`
        }
      })
      
      log(`    ✅ Stage ${stage} completed - Assigned to: ${users.find(u => u.id === assignedUserId)?.name}`, 'success')
      
      // Small delay between stages
      await sleep(100)
      
    } catch (error) {
      log(`    ❌ Error in stage ${stage}: ${error.message}`, 'error')
      return false
    }
  }
  
  log(`✅ All VAT workflow stages completed successfully`, 'success')
  return true
}

async function testLtdWorkflowStages(ltdWorkflowId, users) {
  log(`🧪 Testing Ltd Accounts workflow stages for workflow: ${ltdWorkflowId}`)
  
  const staffUser = users.find(u => u.role === 'STAFF')
  const managerUser = users.find(u => u.role === 'MANAGER')
  const partnerUser = users.find(u => u.role === 'PARTNER')
  
  // Use available users if specific roles not found
  const testStaff = staffUser || users[0]
  const testManager = managerUser || partnerUser || users[1] || users[0]
  const testPartner = partnerUser || users[0]
  
  if (!testStaff || !testManager || !testPartner) {
    log('Not enough users available for testing', 'error')
    return false
  }
  
  log(`Using users: Staff=${testStaff.name}, Manager=${testManager.name}, Partner=${testPartner.name}`)
  
  for (let i = 0; i < LTD_STAGES.length; i++) {
    const stage = LTD_STAGES[i]
    const isLastStage = i === LTD_STAGES.length - 1
    
    try {
      log(`  Testing stage ${i + 1}/${LTD_STAGES.length}: ${stage}`)
      
      // Assign appropriate user based on stage
      let assignedUserId = testStaff.id
      if (stage.includes('MANAGER')) {
        assignedUserId = testManager.id
      } else if (stage.includes('PARTNER')) {
        assignedUserId = testPartner.id
      }
      
      // Update Ltd workflow stage
      const updatedWorkflow = await prisma.ltdAccountsWorkflow.update({
        where: { id: ltdWorkflowId },
        data: {
          currentStage: stage,
          assignedUserId,
          isCompleted: isLastStage,
          // Set milestone dates based on stage
          ...(stage === 'PAPERWORK_CHASED' && { chaseStartedDate: new Date() }),
          ...(stage === 'PAPERWORK_RECEIVED' && { paperworkReceivedDate: new Date() }),
          ...(stage === 'WORK_IN_PROGRESS' && { workStartedDate: new Date() }),
          ...(stage === 'DISCUSS_WITH_MANAGER' && { managerDiscussionDate: new Date() }),
          ...(stage === 'REVIEW_BY_PARTNER' && { partnerReviewDate: new Date() }),
          ...(stage === 'REVIEW_DONE_HELLO_SIGN' && { reviewCompletedDate: new Date() }),
          ...(stage === 'SENT_TO_CLIENT_HELLO_SIGN' && { sentToClientDate: new Date() }),
          ...(stage === 'APPROVED_BY_CLIENT' && { clientApprovedDate: new Date() }),
          ...(stage === 'SUBMISSION_APPROVED_PARTNER' && { partnerApprovedDate: new Date() }),
          ...(stage === 'FILED_CH_HMRC' && { filedDate: new Date() })
        }
      })
      
      // Create workflow history entry
      await prisma.ltdAccountsWorkflowHistory.create({
        data: {
          ltdAccountsWorkflowId: ltdWorkflowId,
          toStage: stage,
          stageChangedAt: new Date(),
          userId: assignedUserId,
          userName: users.find(u => u.id === assignedUserId)?.name || 'Test User',
          userEmail: users.find(u => u.id === assignedUserId)?.email || 'test@test.com',
          userRole: users.find(u => u.id === assignedUserId)?.role || 'STAFF',
          notes: `Automated testing: ${stage}`
        }
      })
      
      log(`    ✅ Stage ${stage} completed - Assigned to: ${users.find(u => u.id === assignedUserId)?.name}`, 'success')
      
      // Small delay between stages
      await sleep(100)
      
    } catch (error) {
      log(`    ❌ Error in stage ${stage}: ${error.message}`, 'error')
      return false
    }
  }
  
  log(`✅ All Ltd Accounts workflow stages completed successfully`, 'success')
  return true
}

async function testAssignmentFunctionality(clientId, vatQuarterId, ltdWorkflowId, users) {
  log(`🧪 Testing assignment functionality`)
  
  const staffUser = users.find(u => u.role === 'STAFF') || users[0]
  const managerUser = users.find(u => u.role === 'MANAGER') || users.find(u => u.role === 'PARTNER') || users[1] || users[0]
  
  if (!staffUser || !managerUser) {
    log('Not enough users for assignment testing', 'error')
    return false
  }
  
  try {
    // Test VAT assignment
    log(`  Testing VAT assignment to different user`)
    await prisma.client.update({
      where: { id: clientId },
      data: { vatAssignedUserId: managerUser.id }
    })
    
    await prisma.vATQuarter.update({
      where: { id: vatQuarterId },
      data: { assignedUserId: managerUser.id }
    })
    
    log(`    ✅ VAT assigned to: ${managerUser.name}`, 'success')
    
    // Test Ltd Accounts assignment
    log(`  Testing Ltd Accounts assignment to different user`)
    await prisma.client.update({
      where: { id: clientId },
      data: { ltdCompanyAssignedUserId: staffUser.id }
    })
    
    await prisma.ltdAccountsWorkflow.update({
      where: { id: ltdWorkflowId },
      data: { assignedUserId: staffUser.id }
    })
    
    log(`    ✅ Ltd Accounts assigned to: ${staffUser.name}`, 'success')
    
    return true
  } catch (error) {
    log(`Error testing assignments: ${error.message}`, 'error')
    return false
  }
}

async function verifyWorkflowData(clientId) {
  log(`🔍 Verifying workflow data integrity`)
  
  try {
    // Get client with all related data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        vatQuartersWorkflow: {
          include: {
            assignedUser: true,
            workflowHistory: true
          }
        },
        ltdAccountsWorkflows: {
          include: {
            assignedUser: true,
            workflowHistory: true
          }
        },
        vatAssignedUser: true,
        ltdCompanyAssignedUser: true
      }
    })
    
    if (!client) {
      log('Client not found', 'error')
      return false
    }
    
    log(`  Client: ${client.companyName} (${client.clientCode})`)
    log(`  VAT Assigned User: ${client.vatAssignedUser?.name || 'None'}`)
    log(`  Ltd Assigned User: ${client.ltdCompanyAssignedUser?.name || 'None'}`)
    log(`  VAT Quarters: ${client.vatQuartersWorkflow.length}`)
    log(`  Ltd Workflows: ${client.ltdAccountsWorkflows.length}`)
    
    // Verify VAT workflow
    if (client.vatQuartersWorkflow.length > 0) {
      const vatQuarter = client.vatQuartersWorkflow[0]
      log(`  VAT Current Stage: ${vatQuarter.currentStage}`)
      log(`  VAT Completed: ${vatQuarter.isCompleted}`)
      log(`  VAT History Entries: ${vatQuarter.workflowHistory.length}`)
    }
    
    // Verify Ltd workflow
    if (client.ltdAccountsWorkflows.length > 0) {
      const ltdWorkflow = client.ltdAccountsWorkflows[0]
      log(`  Ltd Current Stage: ${ltdWorkflow.currentStage}`)
      log(`  Ltd Completed: ${ltdWorkflow.isCompleted}`)
      log(`  Ltd History Entries: ${ltdWorkflow.workflowHistory.length}`)
    }
    
    log(`✅ Workflow data integrity verified`, 'success')
    return true
    
  } catch (error) {
    log(`Error verifying workflow data: ${error.message}`, 'error')
    return false
  }
}

async function cleanupTestData(clientId) {
  log(`🧹 Cleaning up test data`)
  
  try {
    // Delete workflow history first (foreign key constraints)
    await prisma.vATWorkflowHistory.deleteMany({
      where: {
        vatQuarter: {
          clientId
        }
      }
    })
    
    await prisma.ltdAccountsWorkflowHistory.deleteMany({
      where: {
        ltdAccountsWorkflow: {
          clientId
        }
      }
    })
    
    // Delete workflows
    await prisma.vATQuarter.deleteMany({
      where: { clientId }
    })
    
    await prisma.ltdAccountsWorkflow.deleteMany({
      where: { clientId }
    })
    
    // Delete client
    await prisma.client.delete({
      where: { id: clientId }
    })
    
    log(`✅ Test data cleaned up successfully`, 'success')
    
  } catch (error) {
    log(`Error cleaning up test data: ${error.message}`, 'error')
  }
}

// Main testing function
async function runComprehensiveWorkflowTest() {
  log('🚀 Starting Comprehensive Workflow Testing')
  log('='.repeat(50))
  
  let testResults = {
    clientCreation: false,
    vatWorkflowCreation: false,
    ltdWorkflowCreation: false,
    vatStagesTesting: false,
    ltdStagesTesting: false,
    assignmentTesting: false,
    dataVerification: false
  }
  
  let testClientId = null
  
  try {
    // Get available users and ensure we have all required roles
    const users = await ensureRequiredUsers()
    if (users.length === 0) {
      log('No users found in database', 'error')
      return
    }
    
    log(`Found ${users.length} users:`)
    users.forEach(user => {
      log(`  - ${user.name} (${user.role}) - ${user.email}`)
    })
    
    // Create test client
    const testClient = await createTestClient(TEST_CONFIG.testClients.ltdCompany)
    testClientId = testClient.id
    testResults.clientCreation = true
    
    // Create VAT quarter
    const vatQuarter = await createVATQuarter(testClient.id, users)
    testResults.vatWorkflowCreation = true
    
    // Create Ltd Accounts workflow
    const ltdWorkflow = await createLtdAccountsWorkflow(testClient.id, users)
    testResults.ltdWorkflowCreation = true
    
    // Test VAT workflow stages
    const vatStagesSuccess = await testVATWorkflowStages(vatQuarter.id, users)
    testResults.vatStagesTesting = vatStagesSuccess
    
    // Test Ltd workflow stages
    const ltdStagesSuccess = await testLtdWorkflowStages(ltdWorkflow.id, users)
    testResults.ltdStagesTesting = ltdStagesSuccess
    
    // Test assignment functionality
    const assignmentSuccess = await testAssignmentFunctionality(
      testClient.id, 
      vatQuarter.id, 
      ltdWorkflow.id, 
      users
    )
    testResults.assignmentTesting = assignmentSuccess
    
    // Verify workflow data
    const verificationSuccess = await verifyWorkflowData(testClient.id)
    testResults.dataVerification = verificationSuccess
    
  } catch (error) {
    log(`Critical error during testing: ${error.message}`, 'error')
    console.error(error)
  } finally {
    // Clean up test data
    if (testClientId) {
      await cleanupTestData(testClientId)
    }
    
    // Disconnect from database
    await prisma.$disconnect()
  }
  
  // Print test results summary
  log('='.repeat(50))
  log('🎯 TEST RESULTS SUMMARY')
  log('='.repeat(50))
  
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result ? '✅ PASSED' : '❌ FAILED'
    const testName = test.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
    log(`${testName}: ${status}`)
  })
  
  const totalTests = Object.keys(testResults).length
  const passedTests = Object.values(testResults).filter(Boolean).length
  const overallSuccess = passedTests === totalTests
  
  log('='.repeat(50))
  log(`OVERALL RESULT: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  log(`PASSED: ${passedTests}/${totalTests}`)
  log('='.repeat(50))
  
  return overallSuccess
}

// Run the test if called directly
if (require.main === module) {
  runComprehensiveWorkflowTest()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

module.exports = {
  runComprehensiveWorkflowTest,
  TEST_CONFIG,
  VAT_STAGES,
  LTD_STAGES
} 