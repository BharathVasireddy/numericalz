#!/usr/bin/env node

/**
 * Debug VAT Quarter Assignments
 * 
 * This script checks the assignment status of VAT quarters
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugVATAssignments() {
  try {
    console.log('🔍 Debugging VAT Quarter Assignments\n')

    // Get all VAT quarters with detailed assignment info
    const vatQuarters = await prisma.vATQuarter.findMany({
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            isVatEnabled: true,
            vatQuarterGroup: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { client: { companyName: 'asc' } },
        { quarterEndDate: 'desc' }
      ]
    })

    console.log(`📊 Found ${vatQuarters.length} VAT quarters\n`)

    vatQuarters.forEach(quarter => {
      console.log(`🏢 ${quarter.client.companyName} (${quarter.client.clientCode})`)
      console.log(`   Client ID: ${quarter.client.id}`)
      console.log(`   Quarter ID: ${quarter.id}`)
      console.log(`   Quarter Period: ${quarter.quarterPeriod}`)
      console.log(`   Current Stage: ${quarter.currentStage}`)
      console.log(`   Is Completed: ${quarter.isCompleted}`)
      console.log(`   Assigned User ID: ${quarter.assignedUserId || 'NULL'}`)
      
      if (quarter.assignedUser) {
        console.log(`   ✅ Assigned to: ${quarter.assignedUser.name} (${quarter.assignedUser.email})`)
        console.log(`   👤 Role: ${quarter.assignedUser.role}`)
      } else {
        console.log(`   ❌ UNASSIGNED`)
      }
      
      console.log(`   Filing Due: ${quarter.filingDueDate.toISOString().split('T')[0]}`)
      console.log('')
    })

    // Also check the VAT clients API response
    console.log('🔍 Checking VAT Clients API Response...\n')

    const vatClients = await prisma.client.findMany({
      where: {
        isVatEnabled: true,
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        vatQuartersWorkflow: {
          select: {
            id: true,
            quarterPeriod: true,
            currentStage: true,
            assignedUserId: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true
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

    console.log('📊 VAT Clients API Data:\n')
    
    vatClients.forEach(client => {
      console.log(`🏢 ${client.companyName} (${client.clientCode})`)
      console.log(`   Client ID: ${client.id}`)
      console.log(`   Quarters: ${client.vatQuartersWorkflow.length}`)
      
      client.vatQuartersWorkflow.forEach(quarter => {
        console.log(`   📅 ${quarter.quarterPeriod}: ${quarter.currentStage}`)
        console.log(`      Quarter ID: ${quarter.id}`)
        console.log(`      Assigned User ID: ${quarter.assignedUserId || 'NULL'}`)
        
        if (quarter.assignedUser) {
          console.log(`      ✅ Assigned to: ${quarter.assignedUser.name}`)
        } else {
          console.log(`      ❌ UNASSIGNED`)
        }
      })
      
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error debugging VAT assignments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the debug script
debugVATAssignments() 