/**
 * VAT Clients API Route
 * 
 * This API endpoint retrieves all VAT-enabled clients with their quarter-level assignments.
 * 
 * CRITICAL SYSTEM ARCHITECTURE NOTES:
 * 
 * 1. VAT ASSIGNMENT SYSTEM (Post-Cleanup):
 *    - Uses QUARTER-LEVEL ASSIGNMENTS ONLY via VATQuarter.assignedUserId
 *    - NO client-level VAT assignments (Client.vatAssignedUserId REMOVED)
 *    - Each VAT quarter is independently assigned to users
 *    - No fallback assignment logic or priority hierarchies
 * 
 * 2. QUARTER INDEPENDENCE:
 *    - Each quarter (Q1, Q2, Q3, Q4) can have different assignees
 *    - Quarters start unassigned (assignedUserId = null)
 *    - Assignment happens during filing months via workflow management
 * 
 * 3. BUSINESS LOGIC:
 *    - Returns all VAT quarters (completed + incomplete) for month-specific workflows
 *    - Includes comprehensive milestone tracking data
 *    - Supports month-specific quarter filtering in frontend
 * 
 * 4. REMOVED FEATURES (Do NOT re-add):
 *    - Client.vatAssignedUserId field (cleaned up)
 *    - Client.vatAssignedUser relation (cleaned up)  
 *    - Complex 3-tier assignment priority system (simplified)
 *    - Client-level VAT assignment fallback logic (removed)
 * 
 * 5. FRONTEND INTEGRATION:
 *    - Used by VAT deadlines table (/dashboard/clients/vat-dt)
 *    - Supports month-specific quarter display and workflows
 *    - Enables independent quarter assignment management
 * 
 * @route GET /api/clients/vat-clients
 * @returns Array of VAT clients with quarter-level assignment data
 * @version 2.0 (Post-VAT-Cleanup)
 * @lastModified July 2025
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateVATQuarter, getNextVATQuarter } from '@/lib/vat-workflow'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authentication check - all VAT data requires authenticated access
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract month filter from query parameters for month-specific workflows
    const { searchParams } = new URL(request.url)
    const monthFilter = searchParams.get('month')
    
    // Build where clause for VAT-enabled clients only
    const whereClause = {
      isVatEnabled: true,
      isActive: true
    }

    // Fetch VAT clients with comprehensive quarter-level assignment data
    // NOTE: This query structure reflects the quarter-level assignment system
    const vatClients = await db.client.findMany({
      where: whereClause,
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyType: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        vatReturnsFrequency: true,
        vatQuarterGroup: true,
        nextVatReturnDue: true,
        isVatEnabled: true,
        createdAt: true,
        
        // CRITICAL: No client-level VAT assignment data included
        // The old system included vatAssignedUser here - this has been REMOVED
        // Each VAT quarter has its own independent assignment via assignedUser below
        
        // Include all VAT quarters (both completed and incomplete) for month-specific workflows
        // This enables the frontend to show different quarters for different months
        vatQuartersWorkflow: {
          select: {
            id: true,
            quarterPeriod: true,
            quarterStartDate: true,
            quarterEndDate: true,
            filingDueDate: true,
            currentStage: true,
            isCompleted: true,
            
            // QUARTER-LEVEL ASSIGNMENT: This is the ONLY assignment that matters for VAT
            // No fallback to client-level assignments - this is the single source of truth
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            
            // Comprehensive milestone tracking data for workflow management
            // Each milestone tracks who completed it and when
            chaseStartedDate: true,
            chaseStartedByUserName: true,
            paperworkReceivedDate: true,
            paperworkReceivedByUserName: true,
            workStartedDate: true,
            workStartedByUserName: true,
            workFinishedDate: true,
            workFinishedByUserName: true,
            sentToClientDate: true,
            sentToClientByUserName: true,
            clientApprovedDate: true,
            clientApprovedByUserName: true,
            filedToHMRCDate: true,
            filedToHMRCByUserName: true
          },
          orderBy: {
            quarterEndDate: 'desc'
          }
          // NOTE: No 'take' limit here - we get all quarters for month-specific workflows
          // This allows frontend to show different quarters for different filing months
        }
      },
      orderBy: [
        { nextVatReturnDue: 'asc' },
        { companyName: 'asc' }
      ]
    })

    // Transform data for frontend consumption
    // Each client now has independent quarter assignments with full workflow visibility
    const transformedClients = await Promise.all(vatClients.map(async (client) => {
      // Skip if client doesn't have a quarter group
      if (!client.vatQuarterGroup) {
        return {
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyType: client.companyType,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          contactPhone: client.contactPhone,
          vatReturnsFrequency: client.vatReturnsFrequency,
          vatQuarterGroup: client.vatQuarterGroup,
          nextVatReturnDue: client.nextVatReturnDue,
          isVatEnabled: client.isVatEnabled,
          createdAt: client.createdAt.toISOString(),
          currentVATQuarter: null
        }
      }

      // Calculate what quarter should be shown/worked on based on filing deadlines
      // We want the quarter that files in the current month or next month, not the current quarter
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1 // 1-based month
      
      // Find which quarter files in the current month
      const quarterGroups = {
        '1_4_7_10': [2, 5, 8, 11], // Files in Feb, May, Aug, Nov
        '2_5_8_11': [3, 6, 9, 12], // Files in Mar, Jun, Sep, Dec  
        '3_6_9_12': [4, 7, 10, 1]  // Files in Apr, Jul, Oct, Jan
      }
      
      const filingMonths = quarterGroups[client.vatQuarterGroup as keyof typeof quarterGroups] || []
      
      // Check if current month is a filing month for this client
      let targetQuarterInfo
      if (filingMonths.includes(currentMonth)) {
        // Current month is a filing month - get the quarter that files this month
        // Filing month is the month AFTER quarter end, so quarter ends in previous month
        const quarterEndMonth = currentMonth === 1 ? 12 : currentMonth - 1
        const quarterEndYear = currentMonth === 1 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()
        const quarterEndDate = new Date(quarterEndYear, quarterEndMonth - 1, 15) // Mid-month to avoid edge cases
        targetQuarterInfo = calculateVATQuarter(client.vatQuarterGroup, quarterEndDate)
      } else {
        // Not a filing month - get the current quarter
        targetQuarterInfo = calculateVATQuarter(client.vatQuarterGroup, currentDate)
      }
      
      const currentQuarterInfo = targetQuarterInfo

      // Find the incomplete quarter that matches current period
      let currentQuarter = client.vatQuartersWorkflow?.find(q => 
        q.quarterPeriod === currentQuarterInfo.quarterPeriod && !q.isCompleted
      )

      // Check if we need to automatically update quarters to "PAPERWORK_PENDING_CHASE"
      // This should happen the day after quarter end for quarters that haven't been updated yet
      const londonNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
      
      // Find quarters that should be automatically updated to pending chase
      // Only update quarters that are currently in "WAITING_FOR_QUARTER_END" status
      const quartersToUpdate = client.vatQuartersWorkflow?.filter(q => {
        if (q.isCompleted || q.currentStage !== 'WAITING_FOR_QUARTER_END') return false
        
        const quarterEndDate = new Date(q.quarterEndDate)
        quarterEndDate.setHours(23, 59, 59, 999) // End of quarter end day
        
        // Check if we're past the quarter end date (next day or later)
        return londonNow > quarterEndDate
      })

      // Update quarters to pending chase status
      if (quartersToUpdate && quartersToUpdate.length > 0) {
        for (const quarterToUpdate of quartersToUpdate) {
          try {
            await db.vATQuarter.update({
              where: { id: quarterToUpdate.id },
              data: {
                currentStage: 'PAPERWORK_PENDING_CHASE',
                updatedAt: londonNow
              }
            })

            // Create workflow history entry for automatic update
            await db.vATWorkflowHistory.create({
              data: {
                vatQuarterId: quarterToUpdate.id,
                fromStage: quarterToUpdate.currentStage,
                toStage: 'PAPERWORK_PENDING_CHASE',
                stageChangedAt: londonNow,
                userId: null,
                userName: 'System Auto-Update',
                userEmail: 'system@numericalz.com',
                userRole: 'SYSTEM',
                notes: 'Automatically updated to pending chase - quarter end date passed'
              }
            })

            console.log(`🔄 Auto-updated VAT quarter ${quarterToUpdate.quarterPeriod} for client ${client.clientCode} to PAPERWORK_PENDING_CHASE`)
          } catch (error) {
            console.error(`Failed to auto-update quarter ${quarterToUpdate.id} for client ${client.id}:`, error)
          }
        }
      }

      // If no current incomplete quarter exists, check if we need to create it
      if (!currentQuarter) {
        // Check if current quarter already exists (maybe completed)
        const existingQuarter = client.vatQuartersWorkflow?.find(q => 
          q.quarterPeriod === currentQuarterInfo.quarterPeriod
        )

        if (!existingQuarter) {
          // Create current quarter if it doesn't exist at all
          try {
            // Determine appropriate default stage based on whether quarter has ended
            const quarterEndDate = new Date(currentQuarterInfo.quarterEndDate)
            quarterEndDate.setHours(23, 59, 59, 999)
            const defaultStage = londonNow > quarterEndDate ? 'PAPERWORK_PENDING_CHASE' : 'WAITING_FOR_QUARTER_END'
            
            const quarter = await db.vATQuarter.create({
              data: {
                clientId: client.id,
                quarterPeriod: currentQuarterInfo.quarterPeriod,
                quarterStartDate: currentQuarterInfo.quarterStartDate,
                quarterEndDate: currentQuarterInfo.quarterEndDate,
                filingDueDate: currentQuarterInfo.filingDueDate,
                quarterGroup: currentQuarterInfo.quarterGroup,
                assignedUserId: null, // Future quarters should be unassigned by default
                currentStage: defaultStage,
                isCompleted: false
              },
              include: {
                assignedUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                  }
                }
              }
            })
            
            // Create initial workflow history entry
            await db.vATWorkflowHistory.create({
              data: {
                vatQuarterId: quarter.id,
                toStage: defaultStage,
                stageChangedAt: new Date(),
                userId: session.user.id,
                userName: session.user.name || session.user.email || 'System',
                userEmail: session.user.email || '',
                userRole: session.user.role || 'SYSTEM',
                notes: `VAT quarter automatically created for current period - ${defaultStage === 'WAITING_FOR_QUARTER_END' ? 'waiting for quarter end' : 'quarter ended, ready for chase'}`,
              }
            })
            
            currentQuarter = {
              id: quarter.id,
              quarterPeriod: quarter.quarterPeriod,
              quarterStartDate: quarter.quarterStartDate,
              quarterEndDate: quarter.quarterEndDate,
              filingDueDate: quarter.filingDueDate,
              currentStage: quarter.currentStage,
              isCompleted: quarter.isCompleted,
              assignedUser: quarter.assignedUser,
              // Include milestone dates
              chaseStartedDate: quarter.chaseStartedDate,
              chaseStartedByUserName: quarter.chaseStartedByUserName,
              paperworkReceivedDate: quarter.paperworkReceivedDate,
              paperworkReceivedByUserName: quarter.paperworkReceivedByUserName,
              workStartedDate: quarter.workStartedDate,
              workStartedByUserName: quarter.workStartedByUserName,
              workFinishedDate: quarter.workFinishedDate,
              workFinishedByUserName: quarter.workFinishedByUserName,
              sentToClientDate: quarter.sentToClientDate,
              sentToClientByUserName: quarter.sentToClientByUserName,
              clientApprovedDate: quarter.clientApprovedDate,
              clientApprovedByUserName: quarter.clientApprovedByUserName,
              filedToHMRCDate: quarter.filedToHMRCDate,
              filedToHMRCByUserName: quarter.filedToHMRCByUserName
            }
            
            console.log(`Created new VAT quarter for client ${client.clientCode}: ${currentQuarterInfo.quarterPeriod}`)
          } catch (error) {
            console.error(`Failed to create quarter for client ${client.id}:`, error)
          }
        } else if (existingQuarter.isCompleted) {
          // The current quarter is completed, need to check if next quarter exists
          const nextQuarterInfo = getNextVATQuarter(client.vatQuarterGroup, existingQuarter.quarterEndDate)
          
          // Check if the next quarter is actually the "current" quarter now
          if (nextQuarterInfo.quarterPeriod === currentQuarterInfo.quarterPeriod) {
            // The "next" quarter is actually what should be current now
            currentQuarter = client.vatQuartersWorkflow?.find(q => 
              q.quarterPeriod === nextQuarterInfo.quarterPeriod && !q.isCompleted
            )
            
            if (!currentQuarter) {
              // Create the next quarter
              try {
                // Determine appropriate default stage based on whether quarter has ended
                const nextQuarterEndDate = new Date(nextQuarterInfo.quarterEndDate)
                nextQuarterEndDate.setHours(23, 59, 59, 999)
                const nextDefaultStage = londonNow > nextQuarterEndDate ? 'PAPERWORK_PENDING_CHASE' : 'WAITING_FOR_QUARTER_END'
                
                const quarter = await db.vATQuarter.create({
                  data: {
                    clientId: client.id,
                    quarterPeriod: nextQuarterInfo.quarterPeriod,
                    quarterStartDate: nextQuarterInfo.quarterStartDate,
                    quarterEndDate: nextQuarterInfo.quarterEndDate,
                    filingDueDate: nextQuarterInfo.filingDueDate,
                    quarterGroup: nextQuarterInfo.quarterGroup,
                    assignedUserId: null, // Future quarters should be unassigned by default
                    currentStage: nextDefaultStage,
                    isCompleted: false
                  },
                  include: {
                    assignedUser: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                      }
                    }
                  }
                })
                
                // Create initial workflow history entry
                await db.vATWorkflowHistory.create({
                  data: {
                    vatQuarterId: quarter.id,
                    toStage: nextDefaultStage,
                    stageChangedAt: new Date(),
                    userId: session.user.id,
                    userName: session.user.name || session.user.email || 'System',
                    userEmail: session.user.email || '',
                    userRole: session.user.role || 'SYSTEM',
                    notes: `VAT quarter automatically created - previous quarter completed - ${nextDefaultStage === 'WAITING_FOR_QUARTER_END' ? 'waiting for quarter end' : 'quarter ended, ready for chase'}`,
                  }
                })
                
                currentQuarter = {
                  id: quarter.id,
                  quarterPeriod: quarter.quarterPeriod,
                  quarterStartDate: quarter.quarterStartDate,
                  quarterEndDate: quarter.quarterEndDate,
                  filingDueDate: quarter.filingDueDate,
                  currentStage: quarter.currentStage,
                  isCompleted: quarter.isCompleted,
                  assignedUser: quarter.assignedUser,
                  // Include milestone dates (all null for new quarter)
                  chaseStartedDate: null,
                  chaseStartedByUserName: null,
                  paperworkReceivedDate: null,
                  paperworkReceivedByUserName: null,
                  workStartedDate: null,
                  workStartedByUserName: null,
                  workFinishedDate: null,
                  workFinishedByUserName: null,
                  sentToClientDate: null,
                  sentToClientByUserName: null,
                  clientApprovedDate: null,
                  clientApprovedByUserName: null,
                  filedToHMRCDate: null,
                  filedToHMRCByUserName: null
                }
                
                console.log(`Created next VAT quarter for client ${client.clientCode}: ${nextQuarterInfo.quarterPeriod} (previous quarter completed)`)
              } catch (error) {
                console.error(`Failed to create next quarter for client ${client.id}:`, error)
              }
            }
          }
        }
      }

      // Return client with the current quarter and all quarters
      return {
        id: client.id,
        clientCode: client.clientCode,
        companyName: client.companyName,
        companyType: client.companyType,
        contactName: client.contactName,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        vatReturnsFrequency: client.vatReturnsFrequency,
        vatQuarterGroup: client.vatQuarterGroup,
        nextVatReturnDue: client.nextVatReturnDue,
        isVatEnabled: client.isVatEnabled,
        createdAt: client.createdAt.toISOString(),
        currentVATQuarter: currentQuarter ? {
          id: currentQuarter.id,
          quarterPeriod: currentQuarter.quarterPeriod,
          quarterStartDate: currentQuarter.quarterStartDate.toISOString(),
          quarterEndDate: currentQuarter.quarterEndDate.toISOString(),
          filingDueDate: currentQuarter.filingDueDate.toISOString(),
          currentStage: currentQuarter.currentStage,
          isCompleted: currentQuarter.isCompleted,
          assignedUser: currentQuarter.assignedUser,
          chaseStartedDate: currentQuarter.chaseStartedDate?.toISOString(),
          chaseStartedByUserName: currentQuarter.chaseStartedByUserName,
          paperworkReceivedDate: currentQuarter.paperworkReceivedDate?.toISOString(),
          paperworkReceivedByUserName: currentQuarter.paperworkReceivedByUserName,
          workStartedDate: currentQuarter.workStartedDate?.toISOString(),
          workStartedByUserName: currentQuarter.workStartedByUserName,
          workFinishedDate: currentQuarter.workFinishedDate?.toISOString(),
          workFinishedByUserName: currentQuarter.workFinishedByUserName,
          sentToClientDate: currentQuarter.sentToClientDate?.toISOString(),
          sentToClientByUserName: currentQuarter.sentToClientByUserName,
          clientApprovedDate: currentQuarter.clientApprovedDate?.toISOString(),
          clientApprovedByUserName: currentQuarter.clientApprovedByUserName,
          filedToHMRCDate: currentQuarter.filedToHMRCDate?.toISOString(),
          filedToHMRCByUserName: currentQuarter.filedToHMRCByUserName
        } : null,
        vatQuartersWorkflow: client.vatQuartersWorkflow?.map(q => ({
          id: q.id,
          quarterPeriod: q.quarterPeriod,
          quarterStartDate: q.quarterStartDate.toISOString(),
          quarterEndDate: q.quarterEndDate.toISOString(),
          filingDueDate: q.filingDueDate.toISOString(),
          currentStage: q.currentStage,
          isCompleted: q.isCompleted,
          assignedUser: q.assignedUser,
          chaseStartedDate: q.chaseStartedDate?.toISOString(),
          chaseStartedByUserName: q.chaseStartedByUserName,
          paperworkReceivedDate: q.paperworkReceivedDate?.toISOString(),
          paperworkReceivedByUserName: q.paperworkReceivedByUserName,
          workStartedDate: q.workStartedDate?.toISOString(),
          workStartedByUserName: q.workStartedByUserName,
          workFinishedDate: q.workFinishedDate?.toISOString(),
          workFinishedByUserName: q.workFinishedByUserName,
          sentToClientDate: q.sentToClientDate?.toISOString(),
          sentToClientByUserName: q.sentToClientByUserName,
          clientApprovedDate: q.clientApprovedDate?.toISOString(),
          clientApprovedByUserName: q.clientApprovedByUserName,
          filedToHMRCDate: q.filedToHMRCDate?.toISOString(),
          filedToHMRCByUserName: q.filedToHMRCByUserName
        })) || []
      }
    }))

    return NextResponse.json({
      success: true,
      clients: transformedClients
    })

  } catch (error) {
    console.error('Error fetching VAT clients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 