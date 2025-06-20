/**
 * Auto-assignment Script for VAT Quarters
 * 
 * Runs on the 1st of each month at midnight to auto-assign VAT quarters
 * to Partners for chasing when it's a filing month for their quarter group.
 */

const { PrismaClient } = require('@prisma/client')

async function autoAssignVATPartners() {
  const db = new PrismaClient()
  
  try {
    console.log('🔄 Starting VAT Partner auto-assignment process...')
    
    // Get current date in London timezone
    const londonDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
    const currentMonth = londonDate.getMonth() + 1 // JavaScript months are 0-indexed
    const currentYear = londonDate.getFullYear()
    
    console.log(`📅 Processing for month: ${currentMonth}/${currentYear}`)
    
    // Get all active Partners
    const partners = await db.user.findMany({
      where: {
        role: 'PARTNER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
    
    if (partners.length === 0) {
      console.log('⚠️ No active Partners found. Skipping auto-assignment.')
      return
    }
    
    console.log(`👥 Found ${partners.length} active Partners:`, partners.map(p => p.name))
    
    // Determine which quarter groups file this month
    const quarterGroupsToProcess = []
    
    // Quarter groups and their filing months
    const quarterGroupFilingMonths = {
      '1_4_7_10': [2, 5, 8, 11], // Feb, May, Aug, Nov
      '2_5_8_11': [3, 6, 9, 12], // Mar, Jun, Sep, Dec  
      '3_6_9_12': [4, 7, 10, 1]  // Apr, Jul, Oct, Jan
    }
    
    // Find quarter groups that file this month
    Object.entries(quarterGroupFilingMonths).forEach(([quarterGroup, filingMonths]) => {
      if (filingMonths.includes(currentMonth)) {
        quarterGroupsToProcess.push(quarterGroup)
      }
    })
    
    if (quarterGroupsToProcess.length === 0) {
      console.log(`📋 No quarter groups file in month ${currentMonth}. No auto-assignment needed.`)
      return
    }
    
    console.log(`📋 Quarter groups that file this month: ${quarterGroupsToProcess.join(', ')}`)
    
    // Get VAT quarters that need partner assignment (including mid-month creations)
    const vatQuartersToAssign = await db.vATQuarter.findMany({
      where: {
        currentStage: 'PAPERWORK_PENDING_CHASE',
        assignedUserId: null, // Not yet assigned
        client: {
          isVatEnabled: true,
          vatQuarterGroup: {
            in: quarterGroupsToProcess
          }
        }
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            vatQuarterGroup: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    })
    
    console.log(`📊 Found ${vatQuartersToAssign.length} VAT quarters to assign`)
    
    if (vatQuartersToAssign.length === 0) {
      console.log('✅ No VAT quarters need partner assignment.')
      return
    }
    
    // Auto-assign VAT quarters to Partners (round-robin)
    let partnerIndex = 0
    const assignmentResults = []
    const now = new Date()
    
    for (const vatQuarter of vatQuartersToAssign) {
      const assignedPartner = partners[partnerIndex]
      
      try {
        // Update VAT quarter with partner assignment
        await db.vATQuarter.update({
          where: { id: vatQuarter.id },
          data: {
            assignedUserId: assignedPartner.id,
            chaseStartedDate: now,
            chaseStartedByUserId: assignedPartner.id,
            chaseStartedByUserName: assignedPartner.name,
            updatedAt: now
          }
        })
        
        // Create workflow history entry
        await db.vATWorkflowHistory.create({
          data: {
            vatQuarterId: vatQuarter.id,
            fromStage: null, // Initial assignment
            toStage: 'PAPERWORK_PENDING_CHASE',
            stageChangedAt: now,
            daysInPreviousStage: null,
            userId: assignedPartner.id,
            userName: assignedPartner.name,
            userEmail: assignedPartner.email,
            userRole: 'PARTNER',
            notes: `Auto-assigned to Partner for chasing on 1st of filing month (${currentMonth}/${currentYear})`
          }
        })
        
        // Log activity
        await db.activityLog.create({
          data: {
            userId: assignedPartner.id,
            action: 'VAT_QUARTER_AUTO_ASSIGNED',
            details: JSON.stringify({
              vatQuarterId: vatQuarter.id,
              clientId: vatQuarter.client.id,
              companyName: vatQuarter.client.companyName,
              quarterPeriod: vatQuarter.quarterPeriod,
              quarterGroup: vatQuarter.client.vatQuarterGroup,
              filingMonth: currentMonth,
              autoAssignedAt: now.toISOString()
            })
          }
        })
        
        assignmentResults.push({
          success: true,
          vatQuarterId: vatQuarter.id,
          clientName: vatQuarter.client.companyName,
          assignedPartner: assignedPartner.name,
          quarterGroup: vatQuarter.client.vatQuarterGroup
        })
        
        console.log(`✅ Assigned ${vatQuarter.client.companyName} (${vatQuarter.client.vatQuarterGroup}) to ${assignedPartner.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to assign ${vatQuarter.client.companyName} to ${assignedPartner.name}:`, error)
        assignmentResults.push({
          success: false,
          vatQuarterId: vatQuarter.id,
          clientName: vatQuarter.client.companyName,
          error: error.message
        })
      }
      
      // Round-robin to next partner
      partnerIndex = (partnerIndex + 1) % partners.length
    }
    
    // Summary
    const successCount = assignmentResults.filter(r => r.success).length
    const failureCount = assignmentResults.filter(r => !r.success).length
    
    console.log('\n📋 AUTO-ASSIGNMENT SUMMARY')
    console.log('=======================================')
    console.log(`✅ Successfully assigned: ${successCount}`)
    console.log(`❌ Failed assignments: ${failureCount}`)
    console.log(`📅 Filing month: ${currentMonth}/${currentYear}`)
    console.log(`👥 Partners involved: ${partners.map(p => p.name).join(', ')}`)
    
    if (failureCount > 0) {
      console.log('\n❌ FAILED ASSIGNMENTS:')
      assignmentResults.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.clientName}: ${result.error}`)
      })
    }
    
    console.log('\n✅ Auto-assignment process completed successfully!')
    
  } catch (error) {
    console.error('❌ Auto-assignment process failed:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

/**
 * Auto-assign VAT quarters created mid-month to Partners
 * This function can be called when a new VAT quarter is created
 */
async function autoAssignMidMonthVATQuarters(vatQuarterId) {
  const db = new PrismaClient()
  
  try {
    console.log(`🔄 Processing mid-month auto-assignment for VAT quarter: ${vatQuarterId}`)
    
    // Get the VAT quarter with client info
    const vatQuarter = await db.vATQuarter.findUnique({
      where: { id: vatQuarterId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            vatQuarterGroup: true,
            isVatEnabled: true
          }
        }
      }
    })
    
    if (!vatQuarter) {
      console.log('❌ VAT quarter not found')
      return false
    }
    
    if (!vatQuarter.client.isVatEnabled) {
      console.log('⚠️ Client does not have VAT enabled')
      return false
    }
    
    if (vatQuarter.assignedUserId) {
      console.log('⚠️ VAT quarter already has an assigned user')
      return false
    }
    
    if (vatQuarter.currentStage !== 'PAPERWORK_PENDING_CHASE') {
      console.log('⚠️ VAT quarter is not in PAPERWORK_PENDING_CHASE stage')
      return false
    }
    
    // Get current date in London timezone
    const londonDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
    const currentMonth = londonDate.getMonth() + 1
    
    // Check if this is a filing month for the quarter group
    const quarterGroupFilingMonths = {
      '1_4_7_10': [2, 5, 8, 11], // Feb, May, Aug, Nov
      '2_5_8_11': [3, 6, 9, 12], // Mar, Jun, Sep, Dec  
      '3_6_9_12': [4, 7, 10, 1]  // Apr, Jul, Oct, Jan
    }
    
    const filingMonths = quarterGroupFilingMonths[vatQuarter.client.vatQuarterGroup]
    if (!filingMonths || !filingMonths.includes(currentMonth)) {
      console.log(`⚠️ Current month ${currentMonth} is not a filing month for quarter group ${vatQuarter.client.vatQuarterGroup}`)
      return false
    }
    
    // Get all active Partners
    const partners = await db.user.findMany({
      where: {
        role: 'PARTNER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
    
    if (partners.length === 0) {
      console.log('❌ No active Partners found')
      return false
    }
    
    // Simple round-robin assignment (can be enhanced to consider workload)
    const assignedPartner = partners[0] // For now, assign to first partner
    const now = new Date()
    
    // Update VAT quarter with partner assignment
    await db.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        assignedUserId: assignedPartner.id,
        chaseStartedDate: now,
        chaseStartedByUserId: assignedPartner.id,
        chaseStartedByUserName: assignedPartner.name,
        updatedAt: now
      }
    })
    
    // Create workflow history entry
    await db.vATWorkflowHistory.create({
      data: {
        vatQuarterId: vatQuarterId,
        fromStage: null,
        toStage: 'PAPERWORK_PENDING_CHASE',
        stageChangedAt: now,
        daysInPreviousStage: null,
        userId: assignedPartner.id,
        userName: assignedPartner.name,
        userEmail: assignedPartner.email,
        userRole: 'PARTNER',
        notes: `Auto-assigned to Partner for mid-month creation (${currentMonth}/${londonDate.getFullYear()})`
      }
    })
    
    // Log activity
    await db.activityLog.create({
      data: {
        userId: assignedPartner.id,
        action: 'VAT_QUARTER_MID_MONTH_AUTO_ASSIGNED',
        details: JSON.stringify({
          vatQuarterId: vatQuarterId,
          clientId: vatQuarter.client.id,
          companyName: vatQuarter.client.companyName,
          quarterPeriod: vatQuarter.quarterPeriod,
          quarterGroup: vatQuarter.client.vatQuarterGroup,
          filingMonth: currentMonth,
          autoAssignedAt: now.toISOString()
        })
      }
    })
    
    console.log(`✅ Mid-month auto-assigned ${vatQuarter.client.companyName} to ${assignedPartner.name}`)
    return true
    
  } catch (error) {
    console.error('❌ Mid-month auto-assignment failed:', error)
    return false
  } finally {
    await db.$disconnect()
  }
}

// Run the auto-assignment if this script is executed directly
if (require.main === module) {
  autoAssignVATPartners().catch(console.error)
}

module.exports = { autoAssignVATPartners, autoAssignMidMonthVATQuarters }