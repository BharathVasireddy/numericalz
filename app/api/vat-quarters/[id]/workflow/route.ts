import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { getNextVATWorkflowStage, VAT_WORKFLOW_STAGE_NAMES, calculateDaysBetween } from '@/lib/vat-workflow'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'
import { workflowNotificationService } from '@/lib/workflow-notifications'

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
 */
function getMilestoneUpdateData(stage: string, userId: string, userName: string) {
  const milestoneField = STAGE_TO_MILESTONE_MAP[stage]
  if (!milestoneField) return {}

  const now = new Date()
  const updateData: any = {}
  
  // Set the milestone date
  updateData[milestoneField] = now
  
  // Set the corresponding user ID and name fields
  updateData[`${milestoneField.replace('Date', 'ByUserId')}`] = userId
  updateData[`${milestoneField.replace('Date', 'ByUserName')}`] = userName
  
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

    // Validate stage
    if (!stage || !Object.keys(VAT_WORKFLOW_STAGE_NAMES).includes(stage)) {
      return NextResponse.json({ 
        error: 'Invalid workflow stage' 
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

    // Check if quarter is already completed (allow undo operations)
    const isUndoOperation = vatQuarter.isCompleted && stage !== 'FILED_TO_HMRC'
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

    // Prepare milestone update data
    const milestoneUpdateData = getMilestoneUpdateData(
      stage, 
      session.user.id, 
      session.user.name || session.user.email || 'Unknown User'
    )


    // Determine assignee - use provided assignedUserId or auto-assign based on stage
    let finalAssigneeId = assignedUserId
    // Only auto-assign if assignedUserId is not explicitly provided (undefined)
    // If assignedUserId is null, respect that as "unassigned"
    if (assignedUserId === undefined) {
      finalAssigneeId = await getAutoAssigneeForStage(stage, vatQuarter.assignedUserId, prisma)
    }

    // Update VAT quarter with milestone dates
    const updatedVatQuarter = await prisma.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        currentStage: stage,
        assignedUserId: finalAssigneeId,
        isCompleted: stage === 'FILED_TO_HMRC',
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

    // Create workflow history entry
    const workflowHistory = await prisma.vATWorkflowHistory.create({
      data: {
        vatQuarterId,
        fromStage: currentHistory?.toStage,
        toStage: stage,
        stageChangedAt: new Date(),
        daysInPreviousStage: daysSinceLastUpdate,
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown User',
        userEmail: session.user.email || '',
        userRole: session.user.role || 'USER',
        notes: comments || `Stage updated to: ${VAT_WORKFLOW_STAGE_NAMES[stage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}`,
      }
    })

    // Log comprehensive activity for VAT workflow updates
    await logActivityEnhanced(request, ActivityHelpers.workflowStageChanged(
      'VAT',
      updatedVatQuarter.clientId,
      currentHistory?.toStage || 'NOT_STARTED',
      stage,
      comments,
      updatedVatQuarter.quarterPeriod
    ))

    // Log assignment changes if assignee was updated (including unassignment)
    if (assignedUserId !== undefined && finalAssigneeId !== vatQuarter.assignedUserId) {
      if (finalAssigneeId) {
        // Assignment to a user
        const assignedUser = updatedVatQuarter.assignedUser
        const previousAssigneeName = vatQuarter.assignedUserId ? 
          (await prisma.user.findUnique({ 
            where: { id: vatQuarter.assignedUserId }, 
            select: { name: true } 
          }))?.name || 'Unknown User' : 'Unassigned'
        
        if (assignedUser) {
          await logActivityEnhanced(request, ActivityHelpers.workflowAssigned(
            'VAT',
            updatedVatQuarter.clientId,
            assignedUser.id,
            assignedUser.name,
            updatedVatQuarter.quarterPeriod,
            previousAssigneeName
          ))
        }
      } else {
        // Unassignment - get previous assignee name
        const previousAssigneeName = vatQuarter.assignedUserId ? 
          (await prisma.user.findUnique({ 
            where: { id: vatQuarter.assignedUserId }, 
            select: { name: true } 
          }))?.name || 'Unknown User' : 'Unknown'
          
        await logActivityEnhanced(request, {
          action: 'VAT_WORKFLOW_UNASSIGNED',
          clientId: updatedVatQuarter.clientId,
          details: {
            companyName: updatedVatQuarter.client.companyName,
            quarterPeriod: updatedVatQuarter.quarterPeriod,
            previousAssignee: previousAssigneeName
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
    try {
      await workflowNotificationService.sendStageChangeNotifications({
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
      })
    } catch (notificationError) {
      console.error('❌ Failed to send workflow notifications:', notificationError)
      // Don't fail the main request if notifications fail
    }

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
