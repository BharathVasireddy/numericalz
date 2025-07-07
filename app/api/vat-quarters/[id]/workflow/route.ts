/**
 * VAT Quarter Workflow API Route
 * 
 * This API endpoint manages VAT quarter workflow stages and assignments.
 * 
 * CRITICAL SYSTEM ARCHITECTURE NOTES:
 * 
 * 1. VAT ASSIGNMENT SYSTEM (Post-Cleanup):
 *    - Manages QUARTER-LEVEL ASSIGNMENTS ONLY via VATQuarter.assignedUserId
 *    - NO client-level VAT assignments (Client.vatAssignedUserId REMOVED)
 *    - Each VAT quarter is independently assigned and managed
 *    - No fallback assignment logic or priority hierarchies
 * 
 * 2. QUARTER INDEPENDENCE LOGIC:
 *    - Each quarter assignment is completely independent
 *    - Assignment changes do NOT sync to client-level fields
 *    - Future quarters are unassigned when current quarter is assigned
 *    - No inheritance from client or other quarters
 * 
 * 3. WORKFLOW STAGE MANAGEMENT:
 *    - 11-stage VAT workflow progression
 *    - Automatic milestone date tracking with user attribution
 *    - Comprehensive workflow history logging
 *    - Stage-specific business logic and validations
 * 
 * 4. ASSIGNMENT MANAGEMENT:
 *    - Users can assign/reassign quarters to any user
 *    - Assignment changes trigger email notifications
 *    - Future quarter unassignment maintains workflow independence
 *    - Workload calculations based on quarter assignments only
 * 
 * 5. REMOVED FEATURES (Do NOT re-add):
 *    - Client.vatAssignedUserId field sync (cleaned up)
 *    - Client.vatAssignedUser relation sync (cleaned up)
 *    - Complex 3-tier assignment priority system (simplified)
 *    - Client-level VAT assignment fallback logic (removed)
 * 
 * 6. BUSINESS LOGIC RULES:
 *    - Only current/active quarters need assignment
 *    - Future quarters remain unassigned until their filing month
 *    - Completed quarters maintain their assignment history
 *    - Assignment notifications sent for all assignment changes
 * 
 * @route PUT /api/vat-quarters/[id]/workflow
 * @param {string} id - VAT quarter ID
 * @body {VATWorkflowStage} stage - New workflow stage
 * @body {string} assignedUserId - User ID for quarter assignment
 * @body {string} comments - Optional comments for workflow change
 * @returns Updated VAT quarter with workflow history
 * @version 2.0 (Post-VAT-Cleanup)
 * @lastModified July 2025
 */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { getNextVATWorkflowStage, VAT_WORKFLOW_STAGE_NAMES, calculateDaysBetween } from '@/lib/vat-workflow'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'
import { workflowNotificationService } from '@/lib/workflow-notifications'
import { AssignmentNotificationService } from '@/lib/assignment-notifications'

/**
 * Map workflow stages to their corresponding milestone date fields
 * Based on user requirements for workflow stage → timeline milestone mapping
 */
const STAGE_TO_MILESTONE_MAP: { [key: string]: string } = {
  'PAPERWORK_PENDING_CHASE': 'chaseStartedDate', // Pending to chase = Chase started (when partner starts chasing)
  'PAPERWORK_CHASED': 'chaseStartedDate', // Paperwork chased = Chase started
  'PAPERWORK_RECEIVED': 'paperworkReceivedDate', // Paperwork received = Paperwork received
  'WORK_IN_PROGRESS': 'workStartedDate', // Work in progress = Work in progress (renamed from Work Started)
  'QUERIES_PENDING': 'workStartedDate', // Queries pending = Work in progress
  'REVIEW_PENDING_MANAGER': 'workStartedDate', // Review pending by manager = Work in progress
  'REVIEW_PENDING_PARTNER': 'workFinishedDate', // Review pending by Partner = Work finished
  'EMAILED_TO_PARTNER': 'workFinishedDate', // Emailed to partner = Work finished
  'EMAILED_TO_CLIENT': 'sentToClientDate', // Emailed to client = Sent to client
  'CLIENT_APPROVED': 'clientApprovedDate', // Client approved = Client approved
  'FILED_TO_HMRC': 'filedToHMRCDate' // Filed to HMRC = Filed to HMRC
}

/**
 * Get milestone update data for a given stage and user
 * Handles both forward progression and backward movement (undo operations)
 */
function getMilestoneUpdateData(stage: string, userId: string, userName: string, currentStage?: string) {
  const milestoneField = STAGE_TO_MILESTONE_MAP[stage]
  if (!milestoneField) return {}

  const now = new Date()
  const updateData: any = {}
  
  // Set the milestone date for the new stage
  updateData[milestoneField] = now
  
  // Set the corresponding user ID and name fields
  updateData[`${milestoneField.replace('Date', 'ByUserId')}`] = userId
  updateData[`${milestoneField.replace('Date', 'ByUserName')}`] = userName
  
  // ENHANCED: Clear future milestone dates when moving backwards (undo operations)
  if (currentStage) {
    const stageOrder = [
      'WAITING_FOR_QUARTER_END',
      'PAPERWORK_PENDING_CHASE', 
      'PAPERWORK_CHASED',
      'PAPERWORK_RECEIVED',
      'WORK_IN_PROGRESS',
      'QUERIES_PENDING',
      'REVIEW_PENDING_MANAGER',
      'REVIEWED_BY_MANAGER',
      'REVIEW_PENDING_PARTNER',
      'REVIEWED_BY_PARTNER',
      'EMAILED_TO_PARTNER',
      'EMAILED_TO_CLIENT',
      'CLIENT_APPROVED',
      'FILED_TO_HMRC'
    ]
    
    const currentIndex = stageOrder.indexOf(currentStage)
    const newIndex = stageOrder.indexOf(stage)
    
    // If moving backwards, clear milestone dates for future stages
    if (currentIndex > newIndex) {
      const futureStagesToClear = stageOrder.slice(newIndex + 1, currentIndex + 1)
      
      futureStagesToClear.forEach(futureStage => {
        const futureMilestoneField = STAGE_TO_MILESTONE_MAP[futureStage]
        if (futureMilestoneField) {
          // Clear the milestone date and user attribution
          updateData[futureMilestoneField] = null
          updateData[`${futureMilestoneField.replace('Date', 'ByUserId')}`] = null
          updateData[`${futureMilestoneField.replace('Date', 'ByUserName')}`] = null
        }
      })
    }
  }
  
  return updateData
}

/**
 * Auto-assignment logic based on workflow stage and user roles
 */
const getAutoAssigneeForStage = async (stage: string, currentAssigneeId: string | null, prisma: any) => {
  // Get all users with their roles
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true }
  })

  const partners = users.filter((u: any) => u.role === 'PARTNER')
  const managers = users.filter((u: any) => u.role === 'MANAGER')  
  const staff = users.filter((u: any) => u.role === 'STAFF')

  switch (stage) {
    case 'PAPERWORK_PENDING_CHASE':
    case 'PAPERWORK_CHASED':
      // Auto-assign to first available partner
      return partners.length > 0 ? partners[0].id : currentAssigneeId

    case 'PAPERWORK_RECEIVED':
    case 'WORK_IN_PROGRESS':
    case 'QUERIES_PENDING':
      // Auto-assign to first available staff member
      return staff.length > 0 ? staff[0].id : currentAssigneeId

    case 'REVIEW_PENDING_MANAGER':
      // Auto-assign to first available manager
      return managers.length > 0 ? managers[0].id : currentAssigneeId

    case 'REVIEW_PENDING_PARTNER':
    case 'EMAILED_TO_PARTNER':
      // Auto-assign to first available partner
      return partners.length > 0 ? partners[0].id : currentAssigneeId

    case 'EMAILED_TO_CLIENT':
    case 'CLIENT_APPROVED':
    case 'FILED_TO_HMRC':
      // Keep current assignee or assign to staff
      return currentAssigneeId || (staff.length > 0 ? staff[0].id : null)

    default:
      return currentAssigneeId
  }
}

/**
 * PUT /api/vat-quarters/[id]/workflow
 * Update VAT quarter workflow stage with milestone date tracking
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vatQuarterId = params.id
    const body = await request.json()
    const { stage, comments, assignedUserId } = body

    // Validate stage only if it's provided
    if (stage && !Object.keys(VAT_WORKFLOW_STAGE_NAMES).includes(stage)) {
      return NextResponse.json({ 
        error: 'Invalid workflow stage' 
      }, { status: 400 })
    }

    // Check if we have either a stage change OR an assignment change
    const isStageChange = stage !== undefined
    const isAssignmentChange = assignedUserId !== undefined
    
    if (!isStageChange && !isAssignmentChange) {
      return NextResponse.json({ 
        error: 'Please provide either a stage change or assignment change' 
      }, { status: 400 })
    }

    // Get current VAT quarter
    const vatQuarter = await prisma.vATQuarter.findUnique({
      where: { id: vatQuarterId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true,
            assignedUserId: true,
          }
        },
        workflowHistory: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!vatQuarter) {
      return NextResponse.json({ error: 'VAT quarter not found' }, { status: 404 })
    }

    // Determine effective stage - use provided stage or current stage
    const effectiveStage = stage || vatQuarter.currentStage
    const isActualStageChange = stage && stage !== vatQuarter.currentStage

    // Check if quarter is already completed (allow undo operations)
    const isUndoOperation = vatQuarter.isCompleted && effectiveStage !== 'FILED_TO_HMRC'
    if (vatQuarter.isCompleted && !isUndoOperation) {
      return NextResponse.json({ 
        error: 'Cannot update workflow for completed VAT quarter' 
      }, { status: 400 })
    }

    // Get current stage and calculate days
    const currentHistory = vatQuarter.workflowHistory[0]
    const daysSinceLastUpdate = currentHistory 
      ? calculateDaysBetween(currentHistory.createdAt, new Date())
      : 0

    // Prepare milestone update data (only if there's an actual stage change)
    const milestoneUpdateData = isActualStageChange ? getMilestoneUpdateData(
      effectiveStage, 
      session.user.id, 
      session.user.name || session.user.email || 'Unknown User',
      vatQuarter.currentStage // Pass current stage for undo operations
    ) : {}


    // Determine assignee - use provided assignedUserId or auto-assign based on stage
    let finalAssigneeId = assignedUserId
    // Only auto-assign if assignedUserId is not explicitly provided (undefined)
    // If assignedUserId is null, respect that as "unassigned"
    if (assignedUserId === undefined) {
      finalAssigneeId = await getAutoAssigneeForStage(effectiveStage, vatQuarter.assignedUserId, prisma)
    }

    // Update VAT quarter with milestone dates
    const updatedVatQuarter = await prisma.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        currentStage: effectiveStage,
        assignedUserId: finalAssigneeId,
        isCompleted: effectiveStage === 'FILED_TO_HMRC',
        ...milestoneUpdateData
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true,
            vatQuarterGroup: true,
          }
        }
      }
    })
    
    // REMOVED: Client-level VAT assignment sync to maintain quarter independence
    // Each VAT quarter assignment is independent and should not affect client-level assignment
    // or other quarters. This ensures true quarter workflow independence.
    
    if (finalAssigneeId !== vatQuarter.assignedUserId) {
      // REQUIREMENT: Unassign future quarters for this client (only current quarter should have assigned user)
      // Find all future VAT quarters for this client and unassign them
      const currentQuarterEndDate = new Date(vatQuarter.quarterEndDate)
      await prisma.vATQuarter.updateMany({
        where: {
          clientId: updatedVatQuarter.clientId,
          id: { not: vatQuarterId }, // Exclude current quarter
          quarterEndDate: { gt: currentQuarterEndDate }, // Only future quarters
          assignedUserId: { not: null } // Only assigned quarters
        },
        data: {
          assignedUserId: null // Unassign future quarters
        }
      })
    }

    // Create workflow history entry only if there's an actual stage change
    let workflowHistory = null
    if (isActualStageChange) {
      workflowHistory = await prisma.vATWorkflowHistory.create({
        data: {
          vatQuarterId,
          fromStage: currentHistory?.toStage,
          toStage: effectiveStage,
          stageChangedAt: new Date(),
          daysInPreviousStage: daysSinceLastUpdate,
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown User',
          userEmail: session.user.email || '',
          userRole: session.user.role || 'USER',
          notes: comments || `Stage updated to: ${VAT_WORKFLOW_STAGE_NAMES[effectiveStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}`,
        }
      })
    }

    // Log comprehensive activity for VAT workflow updates (only if stage actually changed)
    if (isActualStageChange) {
      // ENHANCED: Detect undo operations for specific logging
      const isUndoFromFiledToHMRC = vatQuarter.currentStage === 'FILED_TO_HMRC' && effectiveStage !== 'FILED_TO_HMRC'
      
      if (isUndoFromFiledToHMRC) {
        // Log specific undo operation
        await logActivityEnhanced(request, {
          action: 'VAT_RETURN_FILING_UNDONE',
          clientId: updatedVatQuarter.clientId,
          details: {
            companyName: updatedVatQuarter.client.companyName,
            clientCode: updatedVatQuarter.client.clientCode,
            workflowType: 'VAT',
            undoFromStage: vatQuarter.currentStage,
            revertedToStage: effectiveStage,
            quarterPeriod: updatedVatQuarter.quarterPeriod,
            comments: comments || 'Filing undone - workflow reopened for corrections',
            undoneBy: session.user.name || session.user.email || 'Unknown User',
            quarterStartDate: updatedVatQuarter.quarterStartDate.toISOString(),
            quarterEndDate: updatedVatQuarter.quarterEndDate.toISOString(),
            filingDueDate: updatedVatQuarter.filingDueDate.toISOString()
          }
        })
      } else {
        // Log regular stage change
        await logActivityEnhanced(request, {
          action: 'VAT_QUARTER_STAGE_CHANGED',
          clientId: updatedVatQuarter.clientId,
          details: {
            companyName: updatedVatQuarter.client.companyName,
            clientCode: updatedVatQuarter.client.clientCode,
            workflowType: 'VAT',
            oldStage: currentHistory?.toStage || 'NOT_STARTED',
            newStage: effectiveStage,
            comments,
            quarterPeriod: updatedVatQuarter.quarterPeriod,
            quarterStartDate: updatedVatQuarter.quarterStartDate.toISOString(),
            quarterEndDate: updatedVatQuarter.quarterEndDate.toISOString(),
            filingDueDate: updatedVatQuarter.filingDueDate.toISOString()
          }
        })
      }
    }

    // Log assignment changes if assignee was updated (including unassignment)
    if (assignedUserId !== undefined && finalAssigneeId !== vatQuarter.assignedUserId) {
      if (finalAssigneeId) {
        // Assignment to a user
        const assignedUser = updatedVatQuarter.assignedUser
        const previousAssigneeName = vatQuarter.assignedUserId ? 
          (await prisma.user.findUnique({ 
            where: { id: vatQuarter.assignedUserId }, 
            select: { name: true } 
          }))?.name : null
        
        await logActivityEnhanced(request, {
          action: 'VAT_QUARTER_ASSIGNED',
          clientId: updatedVatQuarter.clientId,
          details: {
            companyName: updatedVatQuarter.client.companyName,
            clientCode: updatedVatQuarter.client.clientCode,
            workflowType: 'VAT',
            assigneeId: assignedUser?.id,
            assigneeName: assignedUser?.name,
            quarterPeriod: updatedVatQuarter.quarterPeriod,
            previousAssignee: previousAssigneeName,
            quarterStartDate: updatedVatQuarter.quarterStartDate.toISOString(),
            quarterEndDate: updatedVatQuarter.quarterEndDate.toISOString(),
            filingDueDate: updatedVatQuarter.filingDueDate.toISOString()
          }
        })

        // 📧 Send enhanced VAT assignment notification email
        AssignmentNotificationService.sendVATAssignmentNotification(
          updatedVatQuarter.clientId,
          vatQuarterId,
          finalAssigneeId,
          {
            assignedBy: {
              id: session.user.id,
              name: session.user.name || session.user.email || 'Unknown',
              email: session.user.email || '',
              role: session.user.role || 'USER'
            },
            request
          },
          previousAssigneeName || undefined
        ).catch(emailError => {
          console.error('❌ Failed to send VAT assignment notification email:', emailError)
          // Don't fail the main request if email fails
        })
      } else {
        // Unassignment
        const previousAssigneeName = vatQuarter.assignedUserId ? 
          (await prisma.user.findUnique({ 
            where: { id: vatQuarter.assignedUserId }, 
            select: { name: true } 
          }))?.name : null
        
        await logActivityEnhanced(request, {
          action: 'VAT_QUARTER_UNASSIGNED',
          clientId: updatedVatQuarter.clientId,
          details: {
            companyName: updatedVatQuarter.client.companyName,
            clientCode: updatedVatQuarter.client.clientCode,
            workflowType: 'VAT',
            quarterPeriod: updatedVatQuarter.quarterPeriod,
            previousAssignee: previousAssigneeName,
            quarterStartDate: updatedVatQuarter.quarterStartDate.toISOString(),
            quarterEndDate: updatedVatQuarter.quarterEndDate.toISOString(),
            filingDueDate: updatedVatQuarter.filingDueDate.toISOString()
          }
        })
      }
    }

    // Log completion if workflow was completed
    if (stage === 'FILED_TO_HMRC') {
      await logActivityEnhanced(request, {
        action: 'VAT_RETURN_FILED',
        clientId: updatedVatQuarter.clientId,
        details: {
          companyName: updatedVatQuarter.client.companyName,
          quarterPeriod: updatedVatQuarter.quarterPeriod,
          filingDueDate: updatedVatQuarter.filingDueDate,
          daysInWorkflow: daysSinceLastUpdate
        }
      })
    }

    // 📧 Send workflow stage change notifications
    // Run notifications asynchronously to not block the response
    workflowNotificationService.sendStageChangeNotifications({
      clientId: updatedVatQuarter.clientId,
      clientName: updatedVatQuarter.client.companyName,
      clientCode: vatQuarter.client.clientCode || `Client-${updatedVatQuarter.clientId.slice(0, 8)}`,
      workflowType: 'VAT',
      fromStage: currentHistory?.toStage || null,
      toStage: stage,
      changedBy: {
        id: session.user.id,
        name: session.user.name || session.user.email || 'Unknown',
        email: session.user.email || '',
        role: session.user.role || 'USER'
      },
      assignedUserId: finalAssigneeId,
      comments,
      quarterPeriod: updatedVatQuarter.quarterPeriod
    }).catch(notificationError => {
      console.error('❌ Failed to send workflow notifications:', notificationError)
      // Don't fail the main request if notifications fail
    })

    return NextResponse.json({
      success: true,
      data: {
        vatQuarter: updatedVatQuarter,
        workflowHistory,
        milestonesUpdated: Object.keys(milestoneUpdateData)
      },
      message: `Workflow stage updated to: ${VAT_WORKFLOW_STAGE_NAMES[stage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}`
    })

  } catch (error) {
    console.error('Error updating VAT workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update VAT workflow' },
      { status: 500 }
    )
  }
}
