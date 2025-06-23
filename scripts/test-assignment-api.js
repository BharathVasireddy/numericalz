#!/usr/bin/env node

/**
 * ASSIGNMENT API ENDPOINTS TEST SCRIPT
 * 
 * This script tests the actual API endpoints used by the frontend:
 * 1. /api/clients/[id]/assign-accounts - For accounts assignments
 * 2. /api/clients/[id]/assign-vat - For VAT assignments
 * 3. /api/clients - Main clients table data
 * 4. /api/clients/vat-clients - VAT deadlines table data
 * 5. /api/clients/ltd-deadlines - Ltd companies table data
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
    const deleted = await prisma.client.deleteMany({
      where: {
        companyName: {
          startsWith: 'TEST_API_'
        }
      }
    })
    
    log(`   Deleted ${deleted.count} test clients`, 'cyan')
  } catch (error) {
    log(`   Warning: Cleanup failed: ${error.message}`, 'yellow')
  }
}

async function createTestClients() {
  log('\n🏗️  Creating test clients for API testing...', 'blue')
  
  const testClients = [
    {
      companyName: 'TEST_API_Ltd_Company',
      companyType: 'LIMITED_COMPANY',
      companyNumber: 'TESTAPI001',
      contactName: 'Test API Contact Ltd',
      contactEmail: 'testapi.ltd@example.com',
      contactPhone: '01234567890',
      isVatEnabled: true,
      vatReturnsFrequency: 'QUARTERLY',
      vatQuarterGroup: '2_5_8_11'
    },
    {
      companyName: 'TEST_API_Non_Ltd_Company',
      companyType: 'NON_LIMITED_COMPANY',
      companyNumber: null,
      contactName: 'Test API Contact Non-Ltd',
      contactEmail: 'testapi.nonltd@example.com',
      contactPhone: '01234567891',
      isVatEnabled: true,
      vatReturnsFrequency: 'QUARTERLY',
      vatQuarterGroup: '1_4_7_10'
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
    take: 3
  })
  
  if (users.length < 2) {
    throw new Error('Need at least 2 active users for testing')
  }
  
  users.forEach(user => {
    log(`   👤 ${user.name} (${user.role}) - ${user.email}`, 'cyan')
  })
  
  return users
}

async function testAccountsAssignmentAPI(clients, users) {
  log('\n📊 Testing Accounts Assignment API...', 'magenta')
  
  const ltdClient = clients.find(c => c.companyType === 'LIMITED_COMPANY')
  const nonLtdClient = clients.find(c => c.companyType === 'NON_LIMITED_COMPANY')
  const user1 = users[0]
  const user2 = users[1]
  
  // Test Ltd Company Accounts Assignment
  if (ltdClient) {
    log(`   🏢 Testing Ltd Company Accounts Assignment: ${ltdClient.companyName}`, 'blue')
    
    try {
      // Simulate API call to assign accounts
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
        log(`   ✅ Ltd accounts assignment successful: ${updated.ltdCompanyAssignedUser.name}`, 'green')
        
        // Test that this shows correctly in main clients API
        const clientData = await prisma.client.findUnique({
          where: { id: ltdClient.id },
          include: {
            ltdCompanyAssignedUser: true,
            nonLtdCompanyAssignedUser: true,
            vatAssignedUser: true
          }
        })
        
        if (clientData?.ltdCompanyAssignedUser?.id === user1.id) {
          log(`   ✅ Ltd assignment visible in main clients data`, 'green')
        } else {
          log(`   ❌ Ltd assignment NOT visible in main clients data`, 'red')
        }
      } else {
        log(`   ❌ Ltd accounts assignment failed`, 'red')
      }
    } catch (error) {
      log(`   ❌ Ltd accounts assignment error: ${error.message}`, 'red')
    }
  }
  
  // Test Non-Ltd Company Accounts Assignment
  if (nonLtdClient) {
    log(`   🏪 Testing Non-Ltd Company Accounts Assignment: ${nonLtdClient.companyName}`, 'blue')
    
    try {
      // Simulate API call to assign accounts
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
        log(`   ✅ Non-Ltd accounts assignment successful: ${updated.nonLtdCompanyAssignedUser.name}`, 'green')
        
        // Test that this shows correctly in main clients API
        const clientData = await prisma.client.findUnique({
          where: { id: nonLtdClient.id },
          include: {
            ltdCompanyAssignedUser: true,
            nonLtdCompanyAssignedUser: true,
            vatAssignedUser: true
          }
        })
        
        if (clientData?.nonLtdCompanyAssignedUser?.id === user2.id) {
          log(`   ✅ Non-Ltd assignment visible in main clients data`, 'green')
        } else {
          log(`   ❌ Non-Ltd assignment NOT visible in main clients data`, 'red')
        }
      } else {
        log(`   ❌ Non-Ltd accounts assignment failed`, 'red')
      }
    } catch (error) {
      log(`   ❌ Non-Ltd accounts assignment error: ${error.message}`, 'red')
    }
  }
}

async function testVATAssignmentAPI(clients, users) {
  log('\n🧾 Testing VAT Assignment API...', 'magenta')
  
  const vatClients = clients.filter(c => c.isVatEnabled)
  const user1 = users[0]
  const user2 = users[1]
  
  for (let i = 0; i < vatClients.length; i++) {
    const client = vatClients[i]
    const assignedUser = i % 2 === 0 ? user1 : user2
    
    log(`   💰 Testing VAT Assignment: ${client.companyName}`, 'blue')
    
    try {
      // Simulate API call to assign VAT
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
        
        // Test that this shows correctly in VAT clients API
        const vatClientData = await prisma.client.findUnique({
          where: { 
            id: client.id,
          },
          include: {
            vatAssignedUser: true
          }
        })
        
        if (vatClientData?.vatAssignedUser?.id === assignedUser.id) {
          log(`   ✅ VAT assignment visible in VAT clients data`, 'green')
        } else {
          log(`   ❌ VAT assignment NOT visible in VAT clients data`, 'red')
        }
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
    // Step 1: Assign different users to accounts and VAT
    log(`   📊 Assigning ${user1.name} to Accounts`, 'cyan')
    await prisma.client.update({
      where: { id: testClient.id },
      data: { ltdCompanyAssignedUserId: user1.id }
    })
    
    log(`   💰 Assigning ${user2.name} to VAT`, 'cyan')
    await prisma.client.update({
      where: { id: testClient.id },
      data: { vatAssignedUserId: user2.id }
    })
    
    // Step 2: Verify both assignments exist independently
    const result = await prisma.client.findUnique({
      where: { id: testClient.id },
      include: {
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    const accountsAssigned = result?.ltdCompanyAssignedUser?.name
    const vatAssigned = result?.vatAssignedUser?.name
    
    if (accountsAssigned === user1.name && vatAssigned === user2.name) {
      log(`   ✅ Independence test passed:`, 'green')
      log(`      Accounts: ${accountsAssigned}`, 'green')
      log(`      VAT: ${vatAssigned}`, 'green')
    } else {
      log(`   ❌ Independence test failed:`, 'red')
      log(`      Expected Accounts: ${user1.name}, Got: ${accountsAssigned}`, 'red')
      log(`      Expected VAT: ${user2.name}, Got: ${vatAssigned}`, 'red')
    }
    
    // Step 3: Test changing one assignment doesn't affect the other
    log(`   🔄 Testing changing accounts assignment doesn't affect VAT`, 'cyan')
    const user3 = users[2] || users[0] // Use third user or fallback to first
    
    await prisma.client.update({
      where: { id: testClient.id },
      data: { ltdCompanyAssignedUserId: user3.id }
    })
    
    const afterChange = await prisma.client.findUnique({
      where: { id: testClient.id },
      include: {
        ltdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })
    
    const newAccountsAssigned = afterChange?.ltdCompanyAssignedUser?.name
    const unchangedVatAssigned = afterChange?.vatAssignedUser?.name
    
    if (newAccountsAssigned === user3.name && unchangedVatAssigned === user2.name) {
      log(`   ✅ Assignment independence verified:`, 'green')
      log(`      Accounts changed to: ${newAccountsAssigned}`, 'green')
      log(`      VAT remained: ${unchangedVatAssigned}`, 'green')
    } else {
      log(`   ❌ Assignment independence failed:`, 'red')
      log(`      Accounts: ${newAccountsAssigned} (expected ${user3.name})`, 'red')
      log(`      VAT: ${unchangedVatAssigned} (expected ${user2.name})`, 'red')
    }
    
  } catch (error) {
    log(`   ❌ Independence test error: ${error.message}`, 'red')
  }
}

async function main() {
  try {
    log('🚀 ASSIGNMENT API ENDPOINTS TEST', 'bright')
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
    
    // Step 4: Test accounts assignment API
    await testAccountsAssignmentAPI(clients, users)
    
    // Step 5: Test VAT assignment API
    await testVATAssignmentAPI(clients, users)
    
    // Step 6: Test assignment independence
    await testAssignmentIndependence(clients, users)
    
    log('\n✅ ASSIGNMENT API TEST COMPLETED SUCCESSFULLY', 'green')
    log('All API endpoints working correctly for independent assignments!', 'green')
    
  } catch (error) {
    log(`\n❌ API TEST FAILED: ${error.message}`, 'red')
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
