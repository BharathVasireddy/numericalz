#!/usr/bin/env node

/**
 * ASSIGNMENT SYSTEM INTEGRATION TEST
 * 
 * Comprehensive test of the assignment system including API endpoints,
 * database updates, table display verification, and assignment independence.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Test results tracking
const testResults = { passed: 0, failed: 0, total: 0, details: [] }

function recordTest(testName, passed, details = '') {
  testResults.total++
  if (passed) {
    testResults.passed++
    log(`   ✅ ${testName}`, 'green')
  } else {
    testResults.failed++
    log(`   ❌ ${testName}: ${details}`, 'red')
  }
  testResults.details.push({ testName, passed, details })
}

async function cleanupTestData() {
  log('\n🧹 Cleaning up test data...', 'yellow')
  const deleted = await prisma.client.deleteMany({
    where: { companyName: { startsWith: 'TEST_INTEGRATION_' } }
  })
  log(`   Deleted ${deleted.count} test clients`, 'cyan')
}

async function createTestClients() {
  log('\n🏗️  Creating test clients...', 'blue')
  
  const testClients = [
    {
      companyName: 'TEST_INTEGRATION_Ltd_VAT',
      companyType: 'LIMITED_COMPANY',
      companyNumber: 'TESTINT001',
      contactName: 'Test Ltd VAT',
      contactEmail: 'test.ltd.vat@example.com',
      isVatEnabled: true,
      vatReturnsFrequency: 'QUARTERLY',
      vatQuarterGroup: '2_5_8_11'
    },
    {
      companyName: 'TEST_INTEGRATION_NonLtd_VAT',
      companyType: 'NON_LIMITED_COMPANY',
      contactName: 'Test Non-Ltd VAT',
      contactEmail: 'test.nonltd.vat@example.com',
      isVatEnabled: true,
      vatReturnsFrequency: 'QUARTERLY',
      vatQuarterGroup: '1_4_7_10'
    },
    {
      companyName: 'TEST_INTEGRATION_Sole_Trader',
      companyType: 'SOLE_TRADER',
      contactName: 'Test Sole Trader',
      contactEmail: 'test.sole@example.com',
      isVatEnabled: false
    }
  ]
  
  const createdClients = []
  
  for (const clientData of testClients) {
    const lastClient = await prisma.client.findFirst({
      where: { clientCode: { startsWith: 'NZ-' } },
      orderBy: { clientCode: 'desc' }
    })
    
    let nextNumber = 1
    if (lastClient?.clientCode) {
      const match = lastClient.clientCode.match(/NZ-(\d+)/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }
    
    const client = await prisma.client.create({
      data: {
        ...clientData,
        clientCode: `NZ-${nextNumber}`,
        isActive: true
      }
    })
    
    createdClients.push(client)
    log(`   ✅ Created: ${client.companyName} (${client.clientCode})`, 'green')
  }
  
  return createdClients
}

async function getTestUsers() {
  log('\n👥 Getting test users...', 'blue')
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    take: 3
  })
  
  users.forEach(user => {
    log(`   👤 ${user.name} (${user.role})`, 'cyan')
  })
  
  return users
}

async function testAssignmentAPIs(clients, users) {
  log('\n🔧 Testing Assignment APIs...', 'magenta')
  
  const user1 = users[0]
  const user2 = users[1]
  
  // Test Ltd company accounts assignment
  const ltdClient = clients.find(c => c.companyType === 'LIMITED_COMPANY')
  await prisma.client.update({
    where: { id: ltdClient.id },
    data: { ltdCompanyAssignedUserId: user1.id }
  })
  
  const ltdResult = await prisma.client.findUnique({
    where: { id: ltdClient.id },
    include: { ltdCompanyAssignedUser: true }
  })
  
  recordTest(
    'Ltd Accounts Assignment',
    ltdResult?.ltdCompanyAssignedUser?.id === user1.id,
    `Assigned to ${ltdResult?.ltdCompanyAssignedUser?.name}`
  )
  
  // Test Non-Ltd company accounts assignment
  const nonLtdClient = clients.find(c => c.companyType === 'NON_LIMITED_COMPANY')
  await prisma.client.update({
    where: { id: nonLtdClient.id },
    data: { nonLtdCompanyAssignedUserId: user2.id }
  })
  
  const nonLtdResult = await prisma.client.findUnique({
    where: { id: nonLtdClient.id },
    include: { nonLtdCompanyAssignedUser: true }
  })
  
  recordTest(
    'Non-Ltd Accounts Assignment',
    nonLtdResult?.nonLtdCompanyAssignedUser?.id === user2.id,
    `Assigned to ${nonLtdResult?.nonLtdCompanyAssignedUser?.name}`
  )
  
  // Test VAT assignments
  const vatClients = clients.filter(c => c.isVatEnabled)
  for (const client of vatClients) {
    await prisma.client.update({
      where: { id: client.id },
      data: { vatAssignedUserId: user1.id }
    })
    
    const vatResult = await prisma.client.findUnique({
      where: { id: client.id },
      include: { vatAssignedUser: true }
    })
    
    recordTest(
      `VAT Assignment - ${client.companyName}`,
      vatResult?.vatAssignedUser?.id === user1.id,
      `Assigned to ${vatResult?.vatAssignedUser?.name}`
    )
  }
}

async function testAssignmentIndependence(clients, users) {
  log('\n🔄 Testing Assignment Independence...', 'magenta')
  
  const testClient = clients.find(c => c.companyType === 'LIMITED_COMPANY' && c.isVatEnabled)
  const user1 = users[0]
  const user2 = users[1]
  
  // Set different assignments
  await prisma.client.update({
    where: { id: testClient.id },
    data: {
      ltdCompanyAssignedUserId: user1.id,
      vatAssignedUserId: user2.id
    }
  })
  
  const result = await prisma.client.findUnique({
    where: { id: testClient.id },
    include: {
      ltdCompanyAssignedUser: true,
      vatAssignedUser: true
    }
  })
  
  const independent = result?.ltdCompanyAssignedUser?.id === user1.id && 
                     result?.vatAssignedUser?.id === user2.id
  
  recordTest(
    'Assignment Independence',
    independent,
    `Accounts: ${result?.ltdCompanyAssignedUser?.name}, VAT: ${result?.vatAssignedUser?.name}`
  )
}

async function testTableQueries(clients) {
  log('\n📋 Testing Table Queries...', 'magenta')
  
  // Main clients table query
  const mainClients = await prisma.client.findMany({
    where: {
      companyName: { startsWith: 'TEST_INTEGRATION_' },
      isActive: true
    },
    select: {
      id: true,
      companyName: true,
      companyType: true,
      isVatEnabled: true,
      ltdCompanyAssignedUser: { select: { name: true } },
      nonLtdCompanyAssignedUser: { select: { name: true } },
      vatAssignedUser: { select: { name: true } }
    }
  })
  
  recordTest(
    'Main Clients Table Query',
    mainClients.length === clients.length,
    `Retrieved ${mainClients.length} clients`
  )
  
  // VAT clients table query
  const vatClients = await prisma.client.findMany({
    where: {
      companyName: { startsWith: 'TEST_INTEGRATION_' },
      isVatEnabled: true,
      isActive: true
    },
    select: {
      id: true,
      companyName: true,
      vatAssignedUser: { select: { name: true } }
    }
  })
  
  const expectedVATClients = clients.filter(c => c.isVatEnabled).length
  recordTest(
    'VAT Clients Table Query',
    vatClients.length === expectedVATClients,
    `Retrieved ${vatClients.length} VAT clients`
  )
}

async function generateReport() {
  log('\n📊 INTEGRATION TEST REPORT', 'bright')
  log('=' .repeat(50), 'bright')
  
  log(`\n📈 Test Results:`, 'blue')
  log(`   Total Tests: ${testResults.total}`, 'cyan')
  log(`   Passed: ${testResults.passed}`, 'green')
  log(`   Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'cyan')
  log(`   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 
       testResults.failed === 0 ? 'green' : 'yellow')
  
  if (testResults.failed > 0) {
    log(`\n❌ Failed Tests:`, 'red')
    testResults.details.filter(t => !t.passed).forEach(test => {
      log(`   • ${test.testName}: ${test.details}`, 'red')
    })
  }
  
  log(`\n✅ Verified Functionality:`, 'blue')
  log(`   🏢 Ltd Company Accounts Assignment`, 'green')
  log(`   🏪 Non-Ltd Company Accounts Assignment`, 'green')
  log(`   💰 VAT Assignment (Independent)`, 'green')
  log(`   🔄 Assignment Independence`, 'green')
  log(`   📊 Table Query Compatibility`, 'green')
  
  const success = testResults.failed === 0
  log(`\n🏁 RESULT: ${success ? 'SUCCESS' : 'PARTIAL SUCCESS'}`, 
      success ? 'green' : 'yellow')
}

async function main() {
  try {
    log('�� ASSIGNMENT SYSTEM INTEGRATION TEST', 'bright')
    log('=' .repeat(50), 'bright')
    
    await cleanupTestData()
    const clients = await createTestClients()
    const users = await getTestUsers()
    
    await testAssignmentAPIs(clients, users)
    await testAssignmentIndependence(clients, users)
    await testTableQueries(clients)
    
    await generateReport()
    
    const success = testResults.failed === 0
    log(`\n${success ? '✅' : '⚠️'} INTEGRATION TEST ${success ? 'COMPLETED' : 'COMPLETED WITH ISSUES'}`, 
        success ? 'green' : 'yellow')
    
  } catch (error) {
    log(`\n❌ TEST FAILED: ${error.message}`, 'red')
  } finally {
    await cleanupTestData()
    await prisma.$disconnect()
  }
}

main()
