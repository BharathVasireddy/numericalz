#!/usr/bin/env node

/**
 * Debug VAT Quarter Creation Issues
 * 
 * This script helps diagnose why VAT quarter creation is failing for specific clients
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugVATQuarterCreation() {
  try {
    console.log('🔍 Debugging VAT Quarter Creation Issues\n')

    // Get all VAT-enabled clients
    const vatClients = await prisma.client.findMany({
      where: {
        isVatEnabled: true,
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        isVatEnabled: true,
        vatQuarterGroup: true,
        vatReturnsFrequency: true,
        vatQuartersWorkflow: {
          select: {
            id: true,
            quarterPeriod: true,
            currentStage: true,
            assignedUser: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            quarterEndDate: 'desc'
          }
        }
      },
      orderBy: {
        companyName: 'asc'
      }
    })

    console.log(`📊 Found ${vatClients.length} VAT-enabled clients\n`)

    for (const client of vatClients) {
      console.log(`🏢 ${client.companyName} (${client.clientCode})`)
      console.log(`   ID: ${client.id}`)
      console.log(`   VAT Enabled: ${client.isVatEnabled}`)
      console.log(`   VAT Quarter Group: ${client.vatQuarterGroup || 'NOT SET'}`)
      console.log(`   VAT Frequency: ${client.vatReturnsFrequency || 'NOT SET'}`)
      
      // Check validation conditions
      const validationIssues = []
      
      if (!client.isVatEnabled) {
        validationIssues.push('❌ VAT not enabled')
      }
      
      if (!client.vatQuarterGroup) {
        validationIssues.push('❌ VAT quarter group not set')
      }
      
      if (validationIssues.length > 0) {
        console.log(`   🚨 VALIDATION ISSUES:`)
        validationIssues.forEach(issue => console.log(`      ${issue}`))
      } else {
        console.log(`   ✅ Validation passed`)
        
        // Check quarter group validity
        const validQuarterGroups = ['1_4_7_10', '2_5_8_11', '3_6_9_12']
        if (!validQuarterGroups.includes(client.vatQuarterGroup)) {
          console.log(`   ❌ Invalid VAT quarter group: ${client.vatQuarterGroup}`)
        } else {
          console.log(`   ✅ Valid VAT quarter group: ${client.vatQuarterGroup}`)
        }
        
        // Show existing quarters
        if (client.vatQuartersWorkflow.length > 0) {
          console.log(`   📊 Existing quarters:`)
          client.vatQuartersWorkflow.forEach(quarter => {
            console.log(`      - ${quarter.quarterPeriod}: ${quarter.currentStage}`)
          })
        } else {
          console.log(`   📊 No existing quarters - ready to create`)
        }
      }
      
      console.log('') // Empty line for readability
    }

  } catch (error) {
    console.error('❌ Error debugging VAT quarter creation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the debug script
debugVATQuarterCreation() 