const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * SAFE ASSIGNMENT MIGRATION SCRIPT
 * 
 * This script copies client-level assignments to workflow-level assignments
 * WITHOUT removing or changing the existing schema.
 * 
 * SAFETY FEATURES:
 * - Only copies to UNASSIGNED workflows (preserves existing assignments)
 * - Provides detailed logging of all changes
 * - Can be run multiple times safely
 * - Does not modify client-level assignments (keeps them intact)
 */

async function migrateClientAssignments() {
  console.log('🔄 Starting Safe Assignment Migration...')
  console.log('⚠️  This will COPY assignments, not remove them')
  console.log('⚠️  Existing workflow assignments will NOT be overwritten')
  console.log('')

  try {
    // Step 1: Get all clients with any type of assignment
    console.log('📋 Step 1: Finding clients with assignments...')
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { assignedUserId: { not: null } },
          { vatAssignedUserId: { not: null } },
          { ltdCompanyAssignedUserId: { not: null } }
        ]
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        vatAssignedUser: { select: { id: true, name: true } },
        ltdCompanyAssignedUser: { select: { id: true, name: true } },
        vatQuartersWorkflow: {
          select: { id: true, quarterPeriod: true, assignedUserId: true }
        },
        ltdAccountsWorkflows: {
          select: { id: true, filingPeriodEnd: true, assignedUserId: true }
        }
      }
    })

    console.log(`✅ Found ${clients.length} clients with assignments`)
    console.log('')

    let stats = {
      clientsProcessed: 0,
      vatQuartersUpdated: 0,
      ltdWorkflowsUpdated: 0,
      skippedAlreadyAssigned: 0
    }

    // Step 2: Process each client
    for (const client of clients) {
      console.log(`📋 Processing: ${client.companyName} (${client.clientCode})`)
      
      // Copy VAT assignments
      if (client.vatAssignedUserId && client.vatQuartersWorkflow.length > 0) {
        console.log(`   VAT assigned to: ${client.vatAssignedUser?.name}`)
        
        // Find unassigned VAT quarters
        const unassignedVATQuarters = client.vatQuartersWorkflow.filter(q => !q.assignedUserId)
        console.log(`   Found ${unassignedVATQuarters.length} unassigned VAT quarters`)
        
        if (unassignedVATQuarters.length > 0) {
          const quarterIds = unassignedVATQuarters.map(q => q.id)
          await prisma.vATQuarter.updateMany({
            where: { id: { in: quarterIds } },
            data: { assignedUserId: client.vatAssignedUserId }
          })
          
          console.log(`   ✅ Updated ${unassignedVATQuarters.length} VAT quarters`)
          stats.vatQuartersUpdated += unassignedVATQuarters.length
        }
        
        // Count already assigned quarters
        const alreadyAssignedVAT = client.vatQuartersWorkflow.filter(q => q.assignedUserId)
        if (alreadyAssignedVAT.length > 0) {
          console.log(`   ⚠️  Skipped ${alreadyAssignedVAT.length} already assigned VAT quarters`)
          stats.skippedAlreadyAssigned += alreadyAssignedVAT.length
        }
      }

      // Copy Ltd Company assignments
      if (client.ltdCompanyAssignedUserId && client.ltdAccountsWorkflows.length > 0) {
        console.log(`   Ltd Accounts assigned to: ${client.ltdCompanyAssignedUser?.name}`)
        
        // Find unassigned Ltd workflows
        const unassignedLtdWorkflows = client.ltdAccountsWorkflows.filter(w => !w.assignedUserId)
        console.log(`   Found ${unassignedLtdWorkflows.length} unassigned Ltd workflows`)
        
        if (unassignedLtdWorkflows.length > 0) {
          const workflowIds = unassignedLtdWorkflows.map(w => w.id)
          await prisma.ltdAccountsWorkflow.updateMany({
            where: { id: { in: workflowIds } },
            data: { assignedUserId: client.ltdCompanyAssignedUserId }
          })
          
          console.log(`   ✅ Updated ${unassignedLtdWorkflows.length} Ltd workflows`)
          stats.ltdWorkflowsUpdated += unassignedLtdWorkflows.length
        }
        
        // Count already assigned workflows
        const alreadyAssignedLtd = client.ltdAccountsWorkflows.filter(w => w.assignedUserId)
        if (alreadyAssignedLtd.length > 0) {
          console.log(`   ⚠️  Skipped ${alreadyAssignedLtd.length} already assigned Ltd workflows`)
          stats.skippedAlreadyAssigned += alreadyAssignedLtd.length
        }
      }

      stats.clientsProcessed++
      console.log('')
    }

    // Step 3: Summary
    console.log('🎉 Migration Complete!')
    console.log('📊 Summary:')
    console.log(`   Clients processed: ${stats.clientsProcessed}`)
    console.log(`   VAT quarters updated: ${stats.vatQuartersUpdated}`)
    console.log(`   Ltd workflows updated: ${stats.ltdWorkflowsUpdated}`)
    console.log(`   Already assigned (skipped): ${stats.skippedAlreadyAssigned}`)
    console.log('')
    console.log('⚠️  IMPORTANT: Client-level assignments are still intact!')
    console.log('⚠️  This migration can be safely run multiple times.')
    console.log('⚠️  Next step: Test that workflow assignments are working correctly.')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  migrateClientAssignments()
    .then(() => {
      console.log('✅ Migration script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateClientAssignments } 