#!/usr/bin/env node

/**
 * Ltd Companies Workflow Rollover Script
 * 
 * This script handles the automatic rollover of Ltd companies workflows to the next year.
 * It runs as a scheduled job to check for workflows that need to be rolled over.
 * 
 * Rollover Criteria:
 * 1. Workflow is completed (FILED_CH_HMRC)
 * 2. At least 1 month has passed since filing date
 * 3. Companies House data has been refreshed with new year end dates
 * 4. No existing workflow for the next period
 * 
 * Rollover Process:
 * 1. Create new workflow for next year
 * 2. Set stage to WAITING_FOR_YEAR_END
 * 3. Remove assignment (set to null)
 * 4. Use updated Companies House dates
 * 5. Log the rollover activity
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function rolloverLtdWorkflows() {
  console.log('🔄 Starting Ltd Companies Workflow Rollover Process...')
  console.log('=' .repeat(60))
  
  try {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    
    console.log(`📅 Checking for workflows filed before: ${oneMonthAgo.toLocaleDateString('en-GB')}`)
    
    // Find completed workflows that are eligible for rollover
    const eligibleWorkflows = await prisma.ltdAccountsWorkflow.findMany({
      where: {
        isCompleted: true,
        currentStage: 'FILED_CH_HMRC',
        filedDate: {
          lte: oneMonthAgo // Filed at least 1 month ago
        }
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true,
            companyNumber: true,
            nextYearEnd: true,
            nextAccountsDue: true,
            nextCorporationTaxDue: true,
            nextConfirmationDue: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${eligibleWorkflows.length} workflows eligible for rollover`)
    
    if (eligibleWorkflows.length === 0) {
      console.log('✅ No workflows need rollover at this time')
      return
    }
    
    let rolledOver = 0
    let skipped = 0
    let errors = 0
    
    for (const workflow of eligibleWorkflows) {
      try {
        console.log(`\n🏢 Processing: ${workflow.client.companyName} (${workflow.client.clientCode})`)
        
        // Check if there's already a newer workflow for this client
        const newerWorkflow = await prisma.ltdAccountsWorkflow.findFirst({
          where: {
            clientId: workflow.clientId,
            filingPeriodEnd: {
              gt: workflow.filingPeriodEnd
            }
          }
        })
        
        if (newerWorkflow) {
          console.log(`   ⏭️  Skipped - newer workflow already exists`)
          skipped++
          continue
        }
        
        // Calculate next year's dates based on current workflow
        const currentPeriodEnd = new Date(workflow.filingPeriodEnd)
        const nextPeriodStart = new Date(currentPeriodEnd)
        nextPeriodStart.setDate(nextPeriodStart.getDate() + 1) // Day after current period end
        
        const nextPeriodEnd = new Date(currentPeriodEnd)
        nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1) // Same date next year
        
        // Use Companies House data for due dates if available, otherwise calculate
        let nextAccountsDue, nextCTDue, nextCSDue
        
        if (workflow.client.nextYearEnd && workflow.client.nextAccountsDue) {
          // Use Companies House official dates
          nextAccountsDue = new Date(workflow.client.nextAccountsDue)
          
          // Calculate CT due (12 months after year end)
          const yearEnd = new Date(workflow.client.nextYearEnd)
          nextCTDue = new Date(yearEnd)
          nextCTDue.setFullYear(nextCTDue.getFullYear() + 1)
          
          // Calculate CS due (usually same as CT due or incorporation anniversary)
          nextCSDue = workflow.client.nextConfirmationDue 
            ? new Date(workflow.client.nextConfirmationDue)
            : new Date(nextCTDue) // Fallback to CT due date
            
          console.log(`   📅 Using Companies House dates:`)
          console.log(`      Year End: ${new Date(workflow.client.nextYearEnd).toLocaleDateString('en-GB')}`)
          console.log(`      Accounts Due: ${nextAccountsDue.toLocaleDateString('en-GB')}`)
        } else {
          // Calculate dates based on current workflow pattern
          nextAccountsDue = new Date(workflow.accountsDueDate)
          nextAccountsDue.setFullYear(nextAccountsDue.getFullYear() + 1)
          
          nextCTDue = new Date(workflow.ctDueDate)
          nextCTDue.setFullYear(nextCTDue.getFullYear() + 1)
          
          nextCSDue = new Date(workflow.csDueDate)
          nextCSDue.setFullYear(nextCSDue.getFullYear() + 1)
          
          console.log(`   📅 Using calculated dates (CH data not available):`)
          console.log(`      Accounts Due: ${nextAccountsDue.toLocaleDateString('en-GB')}`)
        }
        
        // Create new workflow for next year
        const newWorkflow = await prisma.ltdAccountsWorkflow.create({
          data: {
            clientId: workflow.clientId,
            filingPeriodStart: nextPeriodStart,
            filingPeriodEnd: nextPeriodEnd,
            accountsDueDate: nextAccountsDue,
            ctDueDate: nextCTDue,
            csDueDate: nextCSDue,
            currentStage: 'WAITING_FOR_YEAR_END', // Special rollover stage
            assignedUserId: null, // Unassigned as requested
            isCompleted: false
          }
        })
        
        // Get system user for rollover history
        const systemUser = await prisma.user.findFirst({
          where: { role: 'PARTNER' },
          select: { id: true }
        })
        
        // Create workflow history entry for the rollover
        if (systemUser) {
          await prisma.ltdAccountsWorkflowHistory.create({
            data: {
              ltdAccountsWorkflowId: newWorkflow.id,
              fromStage: null,
              toStage: 'WAITING_FOR_YEAR_END',
              stageChangedAt: new Date(),
              userId: systemUser.id, // Use real user ID
              userName: 'System Rollover',
              userEmail: 'system@numericalz.com',
              userRole: 'SYSTEM',
              notes: `Automatic rollover from completed ${currentPeriodEnd.getFullYear()} accounts workflow. Filed on ${workflow.filedDate?.toLocaleDateString('en-GB')}. Waiting for ${nextPeriodEnd.getFullYear()} year end.`
            }
          })
        }
        
        console.log(`   ✅ Created new workflow for ${nextPeriodEnd.getFullYear()} accounts`)
        console.log(`      Period: ${nextPeriodStart.toLocaleDateString('en-GB')} to ${nextPeriodEnd.toLocaleDateString('en-GB')}`)
        console.log(`      Status: WAITING_FOR_YEAR_END`)
        console.log(`      Assignment: Unassigned`)
        
        rolledOver++
        
      } catch (error) {
        console.error(`   ❌ Error processing ${workflow.client.companyName}:`, error.message)
        errors++
      }
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('📊 ROLLOVER SUMMARY:')
    console.log(`   ✅ Successfully rolled over: ${rolledOver}`)
    console.log(`   ⏭️  Skipped (already exists): ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📋 Total processed: ${eligibleWorkflows.length}`)
    
    if (rolledOver > 0) {
      console.log('\n🎉 Workflow rollover completed successfully!')
      console.log('📧 Consider sending notifications to managers about new workflows.')
    }
    
  } catch (error) {
    console.error('❌ Fatal error in rollover process:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Add waiting for year end stage check function
async function checkYearEndStatus() {
  console.log('\n🔍 Checking workflows waiting for year end...')
  
  const today = new Date()
  
  // Get system user for automated operations
  const systemUser = await prisma.user.findFirst({
    where: { role: 'PARTNER' },
    select: { id: true, name: true, email: true }
  })
  
  if (!systemUser) {
    console.error('❌ No Partner user found for system operations')
    return
  }
  
  // Find workflows in WAITING_FOR_YEAR_END that have passed their year end
  const waitingWorkflows = await prisma.ltdAccountsWorkflow.findMany({
    where: {
      currentStage: 'WAITING_FOR_YEAR_END',
      filingPeriodEnd: {
        lte: today // Year end has passed
      }
    },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          clientCode: true
        }
      }
    }
  })
  
  console.log(`📊 Found ${waitingWorkflows.length} workflows ready to start`)
  
  let updated = 0
  
  for (const workflow of waitingWorkflows) {
    try {
      // Update to PAPERWORK_PENDING_CHASE to start the workflow
      await prisma.ltdAccountsWorkflow.update({
        where: { id: workflow.id },
        data: {
          currentStage: 'PAPERWORK_PENDING_CHASE'
        }
      })
      
      // Create workflow history entry
      await prisma.ltdAccountsWorkflowHistory.create({
        data: {
          ltdAccountsWorkflowId: workflow.id,
          fromStage: 'WAITING_FOR_YEAR_END',
          toStage: 'PAPERWORK_PENDING_CHASE',
          stageChangedAt: new Date(),
          userId: systemUser.id,
          userName: 'System Auto-Update',
          userEmail: 'system@numericalz.com',
          userRole: 'SYSTEM',
          notes: `Year end passed (${new Date(workflow.filingPeriodEnd).toLocaleDateString('en-GB')}). Workflow automatically started.`
        }
      })
      
      console.log(`   ✅ ${workflow.client.companyName}: WAITING_FOR_YEAR_END → PAPERWORK_PENDING_CHASE`)
      updated++
      
    } catch (error) {
      console.error(`   ❌ Error updating ${workflow.client.companyName}:`, error.message)
    }
  }
  
  if (updated > 0) {
    console.log(`\n🎯 Updated ${updated} workflows to start paperwork chase`)
  }
}

// Main execution
async function main() {
  try {
    await rolloverLtdWorkflows()
    await checkYearEndStatus()
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { rolloverLtdWorkflows, checkYearEndStatus } 