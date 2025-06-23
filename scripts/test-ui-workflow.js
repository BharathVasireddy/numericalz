#!/usr/bin/env node

/**
 * UI Workflow Testing Script
 * Creates test data and verifies it appears correctly in web interface
 * 
 * Usage: node scripts/test-ui-workflow.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Test configuration
const UI_TEST_CONFIG = {
  testClients: [
    {
      companyName: 'UI TEST VAT CLIENT LTD',
      companyType: 'LIMITED_COMPANY',
      companyNumber: '11111111',
      contactName: 'VAT Test Manager',
      contactEmail: 'vat@uitest.com',
      contactPhone: '+44 20 1111 1111',
      handlesAnnualAccounts: true,
      isVatEnabled: true,
      vatQuarterGroup: '2_5_8_11'
    },
    {
      companyName: 'UI TEST ACCOUNTS CLIENT LTD',
      companyType: 'LIMITED_COMPANY', 
      companyNumber: '22222222',
      contactName: 'Accounts Test Manager',
      contactEmail: 'accounts@uitest.com',
      contactPhone: '+44 20 2222 2222',
      handlesAnnualAccounts: true,
      isVatEnabled: false,
      vatQuarterGroup: null
    },
    {
      companyName: 'UI TEST BOTH SERVICES LTD',
      companyType: 'LIMITED_COMPANY',
      companyNumber: '33333333', 
      contactName: 'Both Services Manager',
      contactEmail: 'both@uitest.com',
      contactPhone: '+44 20 3333 3333',
      handlesAnnualAccounts: true,
      isVatEnabled: true,
      vatQuarterGroup: '1_4_7_10'
    }
  ]
}

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString()
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
  console.log(`${prefix} [${timestamp}] ${message}`)
}

async function createUITestData() {
  log('🎨 Creating UI Test Data')
  log('='.repeat(50))
  
  try {
    // Get users for assignments
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true }
    })
    
    const staffUser = users.find(u => u.role === 'STAFF')
    const managerUser = users.find(u => u.role === 'MANAGER')
    const partnerUser = users.find(u => u.role === 'PARTNER')
    
    if (!staffUser || !managerUser || !partnerUser) {
      log('Missing required user roles for UI testing', 'error')
      return false
    }
    
    const createdClients = []
    
    // Create test clients
    for (let i = 0; i < UI_TEST_CONFIG.testClients.length; i++) {
      const clientData = UI_TEST_CONFIG.testClients[i]
      
      log(`Creating UI test client ${i + 1}: ${clientData.companyName}`)
      
      const client = await prisma.client.create({
        data: {
          clientCode: `UI-${Date.now()}-${i + 1}`,
          companyName: clientData.companyName,
          companyType: clientData.companyType,
          companyNumber: clientData.companyNumber,
          contactName: clientData.contactName,
          contactEmail: clientData.contactEmail,
          contactPhone: clientData.contactPhone,
          handlesAnnualAccounts: clientData.handlesAnnualAccounts,
          isVatEnabled: clientData.isVatEnabled,
          vatQuarterGroup: clientData.vatQuarterGroup,
          isActive: true,
          // Assign to different users for testing
          vatAssignedUserId: clientData.isVatEnabled ? [staffUser.id, managerUser.id, partnerUser.id][i % 3] : null,
          ltdCompanyAssignedUserId: clientData.handlesAnnualAccounts ? [managerUser.id, partnerUser.id, staffUser.id][i % 3] : null
        }
      })
      
      createdClients.push(client)
      log(`✅ Created: ${client.companyName} (${client.clientCode})`, 'success')
      
      // Create VAT quarter if VAT enabled
      if (clientData.isVatEnabled) {
        const now = new Date()
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0)
        const filingDue = new Date(quarterEnd.getFullYear(), quarterEnd.getMonth() + 1, 0)
        
        const vatQuarter = await prisma.vATQuarter.create({
          data: {
            clientId: client.id,
            quarterPeriod: `${quarterStart.toISOString().split('T')[0]}_to_${quarterEnd.toISOString().split('T')[0]}`,
            quarterStartDate: quarterStart,
            quarterEndDate: quarterEnd,
            filingDueDate: filingDue,
            quarterGroup: clientData.vatQuarterGroup,
            currentStage: ['PAPERWORK_PENDING_CHASE', 'WORK_IN_PROGRESS', 'REVIEW_PENDING_MANAGER'][i % 3],
            isCompleted: false,
            assignedUserId: client.vatAssignedUserId,
            // Add some milestone dates for testing
            ...(i === 1 && {
              chaseStartedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
              paperworkReceivedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
              workStartedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            })
          }
        })
        
        log(`  ✅ Created VAT quarter: ${vatQuarter.currentStage}`, 'success')
      }
      
      // Create Ltd Accounts workflow if handles annual accounts
      if (clientData.handlesAnnualAccounts) {
        const now = new Date()
        const yearEnd = new Date(now.getFullYear(), 11, 31) // Dec 31st
        const periodStart = new Date(yearEnd.getFullYear() - 1, 0, 1) // Jan 1st previous year
        const accountsDue = new Date(yearEnd.getFullYear() + 1, 8, 30) // 9 months after year end
        const ctDue = new Date(yearEnd.getFullYear() + 1, 11, 31) // 12 months after year end
        const csDue = new Date(yearEnd.getFullYear() + 1, 0, 31) // CS due date
        
        const ltdWorkflow = await prisma.ltdAccountsWorkflow.create({
          data: {
            clientId: client.id,
            filingPeriodStart: periodStart,
            filingPeriodEnd: yearEnd,
            accountsDueDate: accountsDue,
            ctDueDate: ctDue,
            csDueDate: csDue,
            currentStage: ['PAPERWORK_PENDING_CHASE', 'WORK_IN_PROGRESS', 'REVIEW_BY_PARTNER'][i % 3],
            isCompleted: false,
            assignedUserId: client.ltdCompanyAssignedUserId,
            // Add some milestone dates for testing
            ...(i === 2 && {
              chaseStartedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              paperworkReceivedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
              workStartedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            })
          }
        })
        
        log(`  ✅ Created Ltd workflow: ${ltdWorkflow.currentStage}`, 'success')
      }
    }
    
    log('='.repeat(50))
    log('🎨 UI TEST DATA SUMMARY')
    log('='.repeat(50))
    
    createdClients.forEach((client, index) => {
      log(`${index + 1}. ${client.companyName}`)
      log(`   Code: ${client.clientCode}`)
      log(`   VAT: ${client.isVatEnabled ? '✅' : '❌'} | Accounts: ${client.handlesAnnualAccounts ? '✅' : '❌'}`)
      log(`   VAT Assigned: ${client.vatAssignedUserId ? users.find(u => u.id === client.vatAssignedUserId)?.name : 'None'}`)
      log(`   Accounts Assigned: ${client.ltdCompanyAssignedUserId ? users.find(u => u.id === client.ltdCompanyAssignedUserId)?.name : 'None'}`)
      log('')
    })
    
    log('✅ UI test data created successfully!', 'success')
    log('')
    log('🌐 You can now test the following in the web interface:')
    log('1. Main clients table (/dashboard/clients) - should show all 3 test clients')
    log('2. VAT deadlines table (/dashboard/clients/vat-dt) - should show VAT clients with different stages')
    log('3. Ltd deadlines table (/dashboard/clients/ltd-companies) - should show all clients with different stages')
    log('4. Partner dashboard (/dashboard/partner) - should show updated assignment counts')
    log('5. Assignment functionality - try changing assignments and verify they update')
    log('6. Workflow modals - click on clients to open workflow modals and test stage changes')
    log('')
    log('⚠️  Remember to clean up test data when done: node scripts/cleanup-ui-test-data.js')
    
    return true
    
  } catch (error) {
    log(`Error creating UI test data: ${error.message}`, 'error')
    console.error(error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Cleanup function
async function cleanupUITestData() {
  log('🧹 Cleaning up UI test data')
  
  try {
    // Find all UI test clients
    const testClients = await prisma.client.findMany({
      where: {
        clientCode: {
          startsWith: 'UI-'
        }
      }
    })
    
    log(`Found ${testClients.length} UI test clients to clean up`)
    
    for (const client of testClients) {
      // Delete workflow history
      await prisma.vATWorkflowHistory.deleteMany({
        where: {
          vatQuarter: {
            clientId: client.id
          }
        }
      })
      
      await prisma.ltdAccountsWorkflowHistory.deleteMany({
        where: {
          ltdAccountsWorkflow: {
            clientId: client.id
          }
        }
      })
      
      // Delete workflows
      await prisma.vATQuarter.deleteMany({
        where: { clientId: client.id }
      })
      
      await prisma.ltdAccountsWorkflow.deleteMany({
        where: { clientId: client.id }
      })
      
      // Delete client
      await prisma.client.delete({
        where: { id: client.id }
      })
      
      log(`  ✅ Cleaned up: ${client.companyName}`, 'success')
    }
    
    log('✅ UI test data cleanup completed', 'success')
    
  } catch (error) {
    log(`Error cleaning up UI test data: ${error.message}`, 'error')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run based on command line argument
if (require.main === module) {
  const command = process.argv[2]
  
  if (command === 'cleanup') {
    cleanupUITestData()
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  } else {
    createUITestData()
      .then(success => process.exit(success ? 0 : 1))
      .catch(() => process.exit(1))
  }
}

module.exports = {
  createUITestData,
  cleanupUITestData
} 