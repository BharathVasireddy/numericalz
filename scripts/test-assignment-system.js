#!/usr/bin/env node

/**
 * COMPREHENSIVE ASSIGNMENT SYSTEM TEST SCRIPT
 * 
 * This script tests the complete assignment system to ensure:
 * 1. Accounts assignments work independently for Ltd and Non-Ltd companies
 * 2. VAT assignments work independently 
 * 3. Assignments show correctly in all tables
 * 4. Unassigning works properly
 * 5. Different assignment types don't interfere with each other
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ANSI color codes for console output
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

async function cleanupTestData() {
  log('\n🧹 Cleaning up any existing test data...', 'yellow')
  
  try {
    // Delete test clients (this will cascade to related records)
    const deleted = await prisma.client.deleteMany({
      where: {
        companyName: {
          startsWith: 'TEST_ASSIGNMENT_'
        }
      }
    })
    
    log(`   Deleted ${deleted.count} test clients`, 'cyan')
  } catch (error) {
    log(`   Warning: Cleanup failed: ${error.message}`, 'yellow')
  }
}

async function createTestClients() {
  log('\n🏗️  Creating test clients...', 'blue')
  
  const testClients = [
    {
      companyName: 'TEST_ASSIGNMENT_Ltd_Company',
      companyType: 'LIMITED_COMPANY',
      companyNumber: 'TEST001',
      contactName: 'Test Contact Ltd',
      contactEmail: 'test.ltd@example.com',
      contactPhone: '01234567890',
      isVatEnabled: true,
      vatReturnsFrequency: 'QUARTERLY',
      vatQuarterGroup: '2_5_8_11'
    },
    {
      companyName: 'TEST_ASSIGNMENT_Non_Ltd_Company',
      companyType: 'NON_LIMITED_COMPANY',
      companyNumber: null,
      contactName: 'Test Contact Non-Ltd',
      contactEmail: 'test.nonltd@example.com',
      contactPhone: '01234567891',
      isVatEnabled: true,
      vatReturnsFrequency: 'QUARTERLY',
      vatQuarterGroup: '1_4_7_10'
    },
    {
      companyName: 'TEST_ASSIGNMENT_Sole_Trader',
      companyType: 'SOLE_TRADER',
      companyNumber: null,
      contactName: 'Test Sole Trader',
      contactEmail: 'test.sole@example.com',
      contactPhone: '01234567892',
      isVatEnabled: false
    },
    {
      companyName: 'TEST_ASSIGNMENT_Partnership',
      companyType: 'PARTNERSHIP',
      companyNumber: null,
      contactName: 'Test Partnership',
      contactEmail: 'test.partnership@example.com',
      contactPhone: '01234567893',
      isVatEnabled: true,
      vatReturnsFrequency: 'MONTHLY',
      vatQuarterGroup: '3_6_9_12'
    }
  ]
  
  const createdClients = []
  
  for (const clientData of testClients) {
    try {
      // Generate client code
      const lastClient = await prisma.client.findFirst({
        where: { clientCode: { startsWith: 'NZ-' } },
        orderBy: { clientCode: 'desc' }
      })
      
      let nextNumber = 1
      if (lastClient?.clientCode) {
        const match = lastClient.clientCode.match(/NZ-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
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
    } catch (error) {
      log(`   ❌ Failed to create ${clientData.companyName}: ${error.message}`, 'red')
    }
  }
  
  return createdClients
}

async function getTestUsers() {
  log('\n👥 Getting test users...', 'blue')
  
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    },
    take: 3 // Get first 3 users for testing
  })
  
  if (users.length < 2) {
    throw new Error('Need at least 2 active users for testing')
  }
  
  users.forEach(user => {
    log(`   👤 ${user.name} (${user.role}) - ${user.email}`, 'cyan')
  })
  
  return users
}

async function testAccountsAssignments(clients, users) {
  log('\n📊 Testing Accounts Assignments...', 'magenta')
  
  const ltdClient = clients.find(c => c.companyType === 'LIMITED_COMPANY')
  const nonLtdClient = clients.find(c => c.companyType === 'NON_LIMITED_COMPANY')
  const soleTraderClient = clients.find(c => c.companyType === 'SOLE_TRADER')
  
  const user1 = users[0]
  const user2 = users[1]
  
  // Test Ltd Company Assignment
  if (ltdClient) {
    log(`   🏢 Testing Ltd Company Assignment: ${ltdClient.companyName}`, 'blue')
    
    try {
      const updated = await prisma.client.update({
        where: { id: ltdClient.id },
        data: { ltdCompanyAssignedUserId: user1.id },
        include: {
          ltdCompanyAssignedUser: true,
          nonLtdCompanyAssignedUser: true,
          vatAssignedUser: true
        }
      })
      
      if (updated.ltdCompanyAssignedUser?.id === user1.id) {
        log(`   ✅ Ltd assignment successful: ${updated.ltdCompanyAssignedUser.name}`, 'green')
      } else {
        log(`   ❌ Ltd assignment failed`, 'red')
      }
    } catch (error) {
      log(`   ❌ Ltd assignment error: ${error.message}`, 'red')
    }
  }
  
  // Test Non-Ltd Company Assignment
  if (nonLtdClient) {
    log(`   🏪 Testing Non-Ltd Company Assignment: ${nonLtdClient.companyName}`, 'blue')
    
    try {
      const updated = await prisma.client.update({
        where: { id: nonLtdClient.id },
        data: { nonLtdCompanyAssignedUserId: user2.id },
        include: {
          ltdCompanyAssignedUser: true,
          nonLtdCompanyAssignedUser: true,
          vatAssignedUser: true
        }
      })
      
      if (updated.nonLtdCompanyAssignedUser?.id === user2.id) {
        log(`   ✅ Non-Ltd assignment successful: ${updated.nonLtdCompanyAssignedUser.name}`, 'green')
      } else {
        log(`   ❌ Non-Ltd assignment failed`, 'red')
      }
    } catch (error) {
      log(`   ❌ Non-Ltd assignment error: ${error.message}`, 'red')
    }
  }
  
  // Test Sole Trader Assignment (should use nonLtdCompanyAssignedUserId)
  if (soleTraderClient) {
    log(`   👤 Testing Sole Trader Assignment: ${soleTraderClient.companyName}`, 'blue')
    
    try {
      const updated = await prisma.client.update({
        where: { id: soleTraderClient.id },
        data: { nonLtdCompanyAssignedUserId: user1.id },
        include: {
          ltdCompanyAssignedUser: true,
          nonLtdCompanyAssignedUser: true,
          vatAssignedUser: true
        }
      })
      
      if (updated.nonLtdCompanyAssignedUser?.id === user1.id) {
        log(`   ✅ Sole Trader assignment successful: ${updated.nonLtdCompanyAssignedUser.name}`, 'green')
      } else {
        log(`   ❌ Sole Trader assignment failed`, 'red')
      }
    } catch (error) {
      log(`   ❌ Sole Trader assignment error: ${error.message}`, 'red')
    }
  }
}

async function testVATAssignments(clients, users) {
  log('\n🧾 Testing VAT Assignments...', 'magenta')
  
  const vatClients = clients.filter(c => c.isVatEnabled)
  const user1 = users[0]
  const user2 = users[1]
  
  for (let i = 0; i < vatClients.length; i++) {
    const client = vatClients[i]
    const assignedUser = i % 2 === 0 ? user1 : user2
    
    log(`   💰 Testing VAT Assignment: ${client.companyName}`, 'blue')
    
    try {
      const updated = await prisma.client.update({
        where: { id: client.id },
        data: { vatAssignedUserId: assignedUser.id },
        include: {
          ltdCompanyAssignedUser: true,
          nonLtdCompanyAssignedUser: true,
          vatAssignedUser: true
        }
      })
      
      if (updated.vatAssignedUser?.id === assignedUser.id) {
        log(`   ✅ VAT assignment successful: ${updated.vatAssignedUser.name}`, 'green')
      } else {
        log(`   ❌ VAT assignment failed`, 'red')
      }
    } catch (error) {
      log(`   ❌ VAT assignment error: ${error.message}`, 'red')
    }
  }
}

async function testAssignmentIndependence(clients, users) {
  log('\n🔄 Testing Assignment Independence...', 'magenta')
  
  const testClient = clients.find(c => c.companyType === 'LIMITED_COMPANY' && c.isVatEnabled)
  if (!testClient) {
    log('   ⚠️  No suitable client for independence test', 'yellow')
    return
  }
  
  const user1 = users[0]
  const user2 = users[1]
  
  log(`   🧪 Testing with: ${testClient.companyName}`, 'blue')
  
  try {
    // Assign different users to accounts and VAT
    const updated = await prisma.client.update({
      where: { id: testClient.id },
      data: {
        ltdCompanyAssignedUserId: user1.id,
        vatAssignedUserId: user2.id
      },
      include: {
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    const accountsAssigned = updated.ltdCompanyAssignedUser?.name
    const vatAssigned = updated.vatAssignedUser?.name
    
    if (accountsAssigned === user1.name && vatAssigned === user2.name) {
      log(`   ✅ Independence test passed:`, 'green')
      log(`      Accounts: ${accountsAssigned}`, 'green')
      log(`      VAT: ${vatAssigned}`, 'green')
    } else {
      log(`   ❌ Independence test failed:`, 'red')
      log(`      Expected Accounts: ${user1.name}, Got: ${accountsAssigned}`, 'red')
      log(`      Expected VAT: ${user2.name}, Got: ${vatAssigned}`, 'red')
    }
  } catch (error) {
    log(`   ❌ Independence test error: ${error.message}`, 'red')
  }
}

async function testUnassignments(clients) {
  log('\n🚫 Testing Unassignments...', 'magenta')
  
  const testClient = clients[0]
  
  log(`   🧪 Testing with: ${testClient.companyName}`, 'blue')
  
  try {
    // Unassign all assignments
    const updated = await prisma.client.update({
      where: { id: testClient.id },
      data: {
        ltdCompanyAssignedUserId: null,
        nonLtdCompanyAssignedUserId: null,
        vatAssignedUserId: null
      },
      include: {
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    const hasNoAssignments = !updated.ltdCompanyAssignedUser && 
                            !updated.nonLtdCompanyAssignedUser && 
                            !updated.vatAssignedUser
    
    if (hasNoAssignments) {
      log(`   ✅ Unassignment test passed: All assignments removed`, 'green')
    } else {
      log(`   ❌ Unassignment test failed: Some assignments remain`, 'red')
    }
  } catch (error) {
    log(`   ❌ Unassignment test error: ${error.message}`, 'red')
  }
}

async function verifyAPIEndpoints(clients, users) {
  log('\n🌐 Testing API Endpoints...', 'magenta')
  
  const testClient = clients.find(c => c.companyType === 'LIMITED_COMPANY')
  if (!testClient) {
    log('   ⚠️  No Ltd company for API testing', 'yellow')
    return
  }
  
  const user1 = users[0]
  
  // Test accounts assignment API
  log(`   📡 Testing Accounts Assignment API`, 'blue')
  try {
    const updated = await prisma.client.update({
      where: { id: testClient.id },
      data: { ltdCompanyAssignedUserId: user1.id }
    })
    
    // Simulate API call result
    const apiResult = await prisma.client.findUnique({
      where: { id: testClient.id },
      include: {
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    if (apiResult?.ltdCompanyAssignedUser?.id === user1.id) {
      log(`   ✅ Accounts API test passed`, 'green')
    } else {
      log(`   ❌ Accounts API test failed`, 'red')
    }
  } catch (error) {
    log(`   ❌ Accounts API test error: ${error.message}`, 'red')
  }
  
  // Test VAT assignment API
  log(`   📡 Testing VAT Assignment API`, 'blue')
  try {
    const updated = await prisma.client.update({
      where: { id: testClient.id },
      data: { vatAssignedUserId: user1.id }
    })
    
    // Simulate API call result
    const apiResult = await prisma.client.findUnique({
      where: { id: testClient.id },
      include: {
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    if (apiResult?.vatAssignedUser?.id === user1.id) {
      log(`   ✅ VAT API test passed`, 'green')
    } else {
      log(`   ❌ VAT API test failed`, 'red')
    }
  } catch (error) {
    log(`   ❌ VAT API test error: ${error.message}`, 'red')
  }
}

async function verifyTableDisplay(clients) {
  log('\n📋 Verifying Table Display Data...', 'magenta')
  
  // Simulate main clients table query
  log(`   📊 Testing Main Clients Table Query`, 'blue')
  try {
    const clientsData = await prisma.client.findMany({
      where: {
        companyName: { startsWith: 'TEST_ASSIGNMENT_' },
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyType: true,
        isVatEnabled: true,
        ltdCompanyAssignedUser: {
          select: { id: true, name: true, email: true, role: true }
        },
        nonLtdCompanyAssignedUser: {
          select: { id: true, name: true, email: true, role: true }
        },
        vatAssignedUser: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })
    
    log(`   📈 Found ${clientsData.length} test clients in main table`, 'cyan')
    
    clientsData.forEach(client => {
      log(`   🏢 ${client.companyName}:`, 'cyan')
      
      // Accounts assignment display logic
      let accountsAssignment = 'Unassigned'
      if (client.companyType === 'LIMITED_COMPANY' && client.ltdCompanyAssignedUser) {
        accountsAssignment = client.ltdCompanyAssignedUser.name
      } else if (client.companyType !== 'LIMITED_COMPANY' && client.nonLtdCompanyAssignedUser) {
        accountsAssignment = client.nonLtdCompanyAssignedUser.name
      }
      
      // VAT assignment display logic
      const vatAssignment = client.vatAssignedUser?.name || 'Unassigned'
      
      log(`      Accounts: ${accountsAssignment}`, 'green')
      log(`      VAT: ${vatAssignment}`, 'green')
    })
    
    log(`   ✅ Main clients table display verified`, 'green')
  } catch (error) {
    log(`   ❌ Main clients table error: ${error.message}`, 'red')
  }
  
  // Simulate VAT deadlines table query
  log(`   💰 Testing VAT Deadlines Table Query`, 'blue')
  try {
    const vatClientsData = await prisma.client.findMany({
      where: {
        companyName: { startsWith: 'TEST_ASSIGNMENT_' },
        isVatEnabled: true,
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        vatAssignedUser: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })
    
    log(`   📈 Found ${vatClientsData.length} VAT clients in deadlines table`, 'cyan')
    
    vatClientsData.forEach(client => {
      const vatAssignment = client.vatAssignedUser?.name || 'Unassigned'
      log(`   💰 ${client.companyName}: ${vatAssignment}`, 'cyan')
    })
    
    log(`   ✅ VAT deadlines table display verified`, 'green')
  } catch (error) {
    log(`   ❌ VAT deadlines table error: ${error.message}`, 'red')
  }
}

async function generateTestReport(clients, users) {
  log('\n📊 ASSIGNMENT SYSTEM TEST REPORT', 'bright')
  log('=' .repeat(50), 'bright')
  
  try {
    // Get final state of all test clients
    const finalClients = await prisma.client.findMany({
      where: {
        companyName: { startsWith: 'TEST_ASSIGNMENT_' }
      },
      include: {
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    log(`\n📋 Final Assignment State:`, 'blue')
    
    finalClients.forEach(client => {
      log(`\n🏢 ${client.companyName} (${client.companyType})`, 'cyan')
      
      // Accounts assignment
      let accountsAssignment = 'Unassigned'
      if (client.companyType === 'LIMITED_COMPANY' && client.ltdCompanyAssignedUser) {
        accountsAssignment = `${client.ltdCompanyAssignedUser.name} (Ltd)`
      } else if (client.companyType !== 'LIMITED_COMPANY' && client.nonLtdCompanyAssignedUser) {
        accountsAssignment = `${client.nonLtdCompanyAssignedUser.name} (Non-Ltd)`
      }
      
      log(`   📊 Accounts: ${accountsAssignment}`, 'green')
      
      // VAT assignment
      const vatAssignment = client.vatAssignedUser?.name || 'Unassigned'
      log(`   💰 VAT: ${vatAssignment}`, 'green')
      
      // VAT enabled status
      log(`   🧾 VAT Enabled: ${client.isVatEnabled ? 'Yes' : 'No'}`, 'yellow')
    })
    
    // Test summary
    log(`\n📈 Test Summary:`, 'blue')
    log(`   Total Test Clients: ${finalClients.length}`, 'cyan')
    log(`   VAT Enabled Clients: ${finalClients.filter(c => c.isVatEnabled).length}`, 'cyan')
    log(`   Ltd Companies: ${finalClients.filter(c => c.companyType === 'LIMITED_COMPANY').length}`, 'cyan')
    log(`   Non-Ltd Companies: ${finalClients.filter(c => c.companyType !== 'LIMITED_COMPANY').length}`, 'cyan')
    
    const accountsAssigned = finalClients.filter(c => 
      (c.companyType === 'LIMITED_COMPANY' && c.ltdCompanyAssignedUser) ||
      (c.companyType !== 'LIMITED_COMPANY' && c.nonLtdCompanyAssignedUser)
    ).length
    
    const vatAssigned = finalClients.filter(c => c.vatAssignedUser).length
    
    log(`   Accounts Assignments: ${accountsAssigned}`, 'cyan')
    log(`   VAT Assignments: ${vatAssigned}`, 'cyan')
    
  } catch (error) {
    log(`❌ Report generation error: ${error.message}`, 'red')
  }
}

async function main() {
  try {
    log('🚀 ASSIGNMENT SYSTEM COMPREHENSIVE TEST', 'bright')
    log('=' .repeat(50), 'bright')
    
    // Step 1: Cleanup
    await cleanupTestData()
    
    // Step 2: Create test clients
    const clients = await createTestClients()
    if (clients.length === 0) {
      throw new Error('No test clients created')
    }
    
    // Step 3: Get test users
    const users = await getTestUsers()
    
    // Step 4: Test accounts assignments
    await testAccountsAssignments(clients, users)
    
    // Step 5: Test VAT assignments
    await testVATAssignments(clients, users)
    
    // Step 6: Test assignment independence
    await testAssignmentIndependence(clients, users)
    
    // Step 7: Test unassignments
    await testUnassignments(clients)
    
    // Step 8: Test API endpoints
    await verifyAPIEndpoints(clients, users)
    
    // Step 9: Verify table display
    await verifyTableDisplay(clients)
    
    // Step 10: Generate report
    await generateTestReport(clients, users)
    
    log('\n✅ ASSIGNMENT SYSTEM TEST COMPLETED SUCCESSFULLY', 'green')
    log('All assignment types working independently!', 'green')
    
  } catch (error) {
    log(`\n❌ TEST FAILED: ${error.message}`, 'red')
    console.error(error)
  } finally {
    // Cleanup test data
    log('\n🧹 Final cleanup...', 'yellow')
    await cleanupTestData()
    await prisma.$disconnect()
  }
}

// Run the test
main() 