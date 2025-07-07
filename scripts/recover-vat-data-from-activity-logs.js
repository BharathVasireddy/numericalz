const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Function to calculate quarter group from quarter period
function calculateQuarterGroup(quarterPeriod) {
  // Extract end date from quarter period like "2025-04-01_to_2025-06-30"
  const endDateStr = quarterPeriod.split('_to_')[1]
  if (!endDateStr) return '3_6_9_12' // Default fallback
  
  const endDate = new Date(endDateStr)
  const endMonth = endDate.getMonth() + 1 // getMonth() returns 0-11
  
  // Determine quarter group based on end month
  if ([3, 6, 9, 12].includes(endMonth)) return '3_6_9_12'
  if ([1, 4, 7, 10].includes(endMonth)) return '1_4_7_10'  
  if ([2, 5, 8, 11].includes(endMonth)) return '2_5_8_11'
  
  return '3_6_9_12' // Default fallback
}

// Function to ensure DateTime from string
function ensureDateTime(dateValue, fallback = new Date()) {
  if (!dateValue) return fallback
  if (dateValue instanceof Date) return dateValue
  return new Date(dateValue)
}

async function recoverVATDataFromActivityLogs() {
  console.log('🔄 Starting VAT data recovery from activity logs...')
  
  try {
    // Get all VAT-related activity logs
    const vatActivityLogs = await prisma.activityLog.findMany({
      where: {
        action: {
          in: [
            'VAT_QUARTER_ASSIGNED',
            'VAT_QUARTER_STAGE_CHANGED',
            'VAT_RETURN_FILED',
            'VAT_ASSIGNMENT_EMAIL_SENT',
            'VAT_RETURN_FILING_UNDONE',
            'VAT_QUARTER_UNASSIGNED'
          ]
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    })
    
    console.log(`📊 Found ${vatActivityLogs.length} VAT activity log entries`)
    
    if (vatActivityLogs.length === 0) {
      console.log('⚠️ No VAT activity logs found to recover from')
      return
    }
    
    // Group activity logs by client and quarter period
    const quarterMap = new Map()
    
    for (const log of vatActivityLogs) {
      try {
        const details = JSON.parse(log.details)
        
        // Use clientId from the activity log record itself, not from details
        if (details.quarterPeriod && log.clientId) {
          const key = `${log.clientId}-${details.quarterPeriod}`
          
          if (!quarterMap.has(key)) {
            quarterMap.set(key, {
              clientId: log.clientId, // Use log.clientId
              quarterPeriod: details.quarterPeriod,
              quarterStartDate: details.quarterStartDate,
              quarterEndDate: details.quarterEndDate,
              filingDueDate: details.filingDueDate,
              assignedUserId: null,
              currentStage: 'PAPERWORK_PENDING_CHASE',
              isCompleted: false,
              workflowHistory: [],
              lastAssignment: null,
              createdAt: log.timestamp
            })
          }
          
          const quarter = quarterMap.get(key)
          
          // Track assignments
          if (log.action === 'VAT_QUARTER_ASSIGNED' && details.assigneeId) {
            quarter.assignedUserId = details.assigneeId
            quarter.lastAssignment = {
              userId: log.userId,
              timestamp: log.timestamp,
              assigneeId: details.assigneeId,
              assigneeName: details.assigneeName
            }
          }
          
          // Track unassignments
          if (log.action === 'VAT_QUARTER_UNASSIGNED') {
            quarter.assignedUserId = null
          }
          
          // Track stage changes
          if (log.action === 'VAT_QUARTER_STAGE_CHANGED') {
            quarter.workflowHistory.push({
              vatQuarterId: null, // Will be set after quarter creation
              userId: log.userId,
              oldStage: details.oldStage || null,
              newStage: details.newStage,
              comments: details.comments || '',
              timestamp: log.timestamp
            })
            
            quarter.currentStage = details.newStage
            quarter.updatedAt = log.timestamp
            
            // Check if completed
            if (details.newStage === 'FILED_TO_HMRC') {
              quarter.isCompleted = true
              quarter.filedToHMRCDate = log.timestamp
            }
          }
          
          // Track filing
          if (log.action === 'VAT_RETURN_FILED') {
            quarter.isCompleted = true
            quarter.filedToHMRCDate = log.timestamp
            quarter.updatedAt = log.timestamp
          }
          
          // Track undoing
          if (log.action === 'VAT_RETURN_FILING_UNDONE') {
            quarter.isCompleted = false
            quarter.filedToHMRCDate = null
            quarter.currentStage = details.revertedToStage || 'CLIENT_APPROVED'
            quarter.updatedAt = log.timestamp
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not parse activity log ${log.id}:`, error.message)
      }
    }
    
    console.log(`📋 Reconstructed ${quarterMap.size} VAT quarters from activity logs`)
    
    // Create VAT quarters
    let createdQuarters = 0
    let createdHistoryEntries = 0
    
    for (const [key, quarterData] of quarterMap) {
      try {
        console.log(`\n🔄 Creating VAT quarter: ${quarterData.quarterPeriod} for client ${quarterData.clientId}`)
        
        // Calculate quarter group
        const quarterGroup = calculateQuarterGroup(quarterData.quarterPeriod)
        
        // Ensure required DateTime fields
        const quarterStartDate = ensureDateTime(quarterData.quarterStartDate)
        const quarterEndDate = ensureDateTime(quarterData.quarterEndDate)  
        const filingDueDate = ensureDateTime(quarterData.filingDueDate)
        
        console.log(`   📊 Quarter group: ${quarterGroup}`)
        console.log(`   📅 Start: ${quarterStartDate.toISOString().split('T')[0]}`)
        console.log(`   📅 End: ${quarterEndDate.toISOString().split('T')[0]}`)
        console.log(`   📅 Filing due: ${filingDueDate.toISOString().split('T')[0]}`)
        
        // Create VAT quarter
        const vatQuarter = await prisma.vATQuarter.create({
          data: {
            clientId: quarterData.clientId,
            quarterPeriod: quarterData.quarterPeriod,
            quarterGroup: quarterGroup,
            quarterStartDate: quarterStartDate,
            quarterEndDate: quarterEndDate,
            filingDueDate: filingDueDate,
            assignedUserId: quarterData.assignedUserId,
            currentStage: quarterData.currentStage,
            isCompleted: quarterData.isCompleted,
            
            // Milestone dates based on workflow stage
            paperworkReceivedDate: quarterData.workflowHistory.find(h => h.newStage === 'PAPERWORK_RECEIVED')?.timestamp || null,
            workStartedDate: quarterData.workflowHistory.find(h => h.newStage === 'WORK_IN_PROGRESS')?.timestamp || null,
            workFinishedDate: quarterData.workflowHistory.find(h => h.newStage === 'WORK_FINISHED')?.timestamp || null,
            sentToClientDate: quarterData.workflowHistory.find(h => h.newStage === 'EMAILED_TO_CLIENT')?.timestamp || null,
            clientApprovedDate: quarterData.workflowHistory.find(h => h.newStage === 'CLIENT_APPROVED')?.timestamp || null,
            filedToHMRCDate: quarterData.filedToHMRCDate ? new Date(quarterData.filedToHMRCDate) : null,
            
            createdAt: new Date(quarterData.createdAt),
            updatedAt: new Date(quarterData.updatedAt || quarterData.createdAt)
          }
        })
        
        createdQuarters++
        console.log(`✅ Created VAT quarter: ${quarterData.quarterPeriod}`)
        
        // Create workflow history entries
        for (const historyEntry of quarterData.workflowHistory) {
          try {
            // Get user details for workflow history
            const user = await prisma.user.findUnique({
              where: { id: historyEntry.userId }
            })
            
            await prisma.vATWorkflowHistory.create({
              data: {
                vatQuarterId: vatQuarter.id,
                userId: historyEntry.userId,
                userName: user?.name || 'Unknown User',
                userEmail: user?.email || 'unknown@example.com',
                userRole: user?.role || 'STAFF',
                fromStage: historyEntry.oldStage,
                toStage: historyEntry.newStage,
                notes: historyEntry.comments,
                stageChangedAt: new Date(historyEntry.timestamp)
              }
            })
            createdHistoryEntries++
          } catch (historyError) {
            console.warn(`⚠️ Failed to create workflow history entry: ${historyError.message}`)
          }
        }
        
        if (quarterData.workflowHistory.length > 0) {
          console.log(`   📝 Created ${quarterData.workflowHistory.length} workflow history entries`)
        }
        
        if (quarterData.lastAssignment) {
          console.log(`   👤 Assigned to: ${quarterData.lastAssignment.assigneeName}`)
        }
        
        console.log(`   📊 Current stage: ${quarterData.currentStage}`)
        console.log(`   ✅ Completed: ${quarterData.isCompleted}`)
        
      } catch (error) {
        console.error(`❌ Failed to create VAT quarter ${key}:`, error.message)
        console.error('Full error:', error)
      }
    }
    
    console.log('\n🎉 VAT data recovery completed!')
    console.log(`📊 Recovery summary:`)
    console.log(`   - VAT quarters created: ${createdQuarters}`)
    console.log(`   - Workflow history entries created: ${createdHistoryEntries}`)
    console.log(`   - Activity logs processed: ${vatActivityLogs.length}`)
    
    // Verify the recovery
    const totalQuarters = await prisma.vATQuarter.count()
    const assignedQuarters = await prisma.vATQuarter.count({
      where: { assignedUserId: { not: null } }
    })
    const completedQuarters = await prisma.vATQuarter.count({
      where: { isCompleted: true }
    })
    
    console.log(`\n📋 Current VAT system state:`)
    console.log(`   - Total VAT quarters: ${totalQuarters}`)
    console.log(`   - Assigned quarters: ${assignedQuarters}`)
    console.log(`   - Completed quarters: ${completedQuarters}`)
    console.log(`   - Unassigned quarters: ${totalQuarters - assignedQuarters}`)
    
  } catch (error) {
    console.error('❌ VAT data recovery failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run recovery if called directly
if (require.main === module) {
  recoverVATDataFromActivityLogs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { recoverVATDataFromActivityLogs } 