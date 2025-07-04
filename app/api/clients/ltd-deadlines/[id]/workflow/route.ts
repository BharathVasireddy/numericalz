import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { LtdAccountsWorkflowStage } from '@prisma/client'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'
import { workflowNotificationService } from '@/lib/workflow-notifications'
import { AssignmentNotificationService } from '@/lib/assignment-notifications'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

const WorkflowUpdateSchema = z.object({
  stage: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  comments: z.string().optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id
    const body = await request.json()
    const { stage, assignedUserId, comments } = WorkflowUpdateSchema.parse(body)

    // Verify client exists and user has access
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        companyType: 'LIMITED_COMPANY',
        isActive: true
      },
      include: {
        ltdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        ltdAccountsWorkflows: {
          orderBy: { filingPeriodEnd: 'desc' },
          take: 1
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Permission check removed - all users can update workflow assignments
    // This allows staff, managers, and partners to freely assign workflows to any user

    const currentWorkflow = client.ltdAccountsWorkflows[0]
    let workflow

    // Check if workflow is already completed (allow undo operations)
    if (currentWorkflow?.isCompleted) {
      const isUndoOperation = stage && stage !== 'FILED_CH_HMRC'
      if (!isUndoOperation) {
        return NextResponse.json({ 
          error: 'Cannot update workflow for completed Ltd accounts workflow' 
        }, { status: 400 })
      }
      
      // For undo operations, set isCompleted to false
      if (isUndoOperation) {
        await db.ltdAccountsWorkflow.update({
          where: { id: currentWorkflow.id },
          data: { isCompleted: false }
        })
      }
    }

    if (!currentWorkflow) {
      // Create new workflow if none exists
      const currentYear = new Date().getFullYear()
      const filingPeriodEnd = new Date(currentYear, 11, 31) // Dec 31 of current year
      const filingPeriodStart = new Date(currentYear, 0, 1) // Jan 1 of current year
      const accountsDueDate = new Date(currentYear + 1, 8, 30) // Sep 30 next year (9 months after year end)
      const ctDueDate = new Date(currentYear + 1, 11, 31) // Dec 31 next year (12 months after year end)
      const csDueDate = new Date(currentYear + 1, 0, 31) // Jan 31 next year (CS due)

      workflow = await db.ltdAccountsWorkflow.create({
        data: {
          clientId,
          filingPeriodStart,
          filingPeriodEnd,
          accountsDueDate,
          ctDueDate,
          csDueDate,
          currentStage: (stage as LtdAccountsWorkflowStage) || LtdAccountsWorkflowStage.PAPERWORK_PENDING_CHASE,
          assignedUserId: assignedUserId || client.ltdCompanyAssignedUserId,
          isCompleted: false
        },
        include: {
          assignedUser: true
        }
      })
      
      // SYNC: Also update client-level assignment if assignedUserId was provided
      if (assignedUserId !== undefined) {
        await db.client.update({
          where: { id: clientId },
          data: { ltdCompanyAssignedUserId: assignedUserId }
        })
      }
    } else {
      // Update existing workflow
      const updateData: any = {}
      
      if (stage) {
        updateData.currentStage = stage as LtdAccountsWorkflowStage
        updateData.isCompleted = stage === 'FILED_TO_HMRC'
        
        // ENHANCED: Set milestone dates with backward movement support
        const milestoneUpdateData = getLtdMilestoneUpdateData(
          stage,
          session.user.id,
          session.user.name || session.user.email || 'Unknown',
          currentWorkflow.currentStage // Pass current stage for undo operations
        )
        
        // Merge milestone updates into the main update data
        Object.assign(updateData, milestoneUpdateData)
      }
      
      if (assignedUserId !== undefined) {
        updateData.assignedUserId = assignedUserId
      }

      workflow = await db.ltdAccountsWorkflow.update({
        where: { id: currentWorkflow.id },
        data: updateData,
        include: {
          assignedUser: true
        }
      })
      
      // SYNC: Also update client-level assignment if assignedUserId was changed
      if (assignedUserId !== undefined) {
        await db.client.update({
          where: { id: clientId },
          data: { ltdCompanyAssignedUserId: assignedUserId }
        })
      }
    }

    // Create workflow history entry
    if (stage || assignedUserId !== undefined) {
      await db.ltdAccountsWorkflowHistory.create({
        data: {
          ltdAccountsWorkflowId: workflow.id,
          fromStage: currentWorkflow?.currentStage || null,
          toStage: (stage as LtdAccountsWorkflowStage) || currentWorkflow?.currentStage || LtdAccountsWorkflowStage.PAPERWORK_PENDING_CHASE,
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown',
          userEmail: session.user.email || '',
          userRole: session.user.role,
          notes: comments || null
        }
      })
    }

    // Log comprehensive activity (single consolidated log)
    if (stage) {
      // ENHANCED: Detect undo operations for specific logging
      const isUndoFromFiledToHMRC = currentWorkflow?.currentStage === 'FILED_TO_HMRC' && stage !== 'FILED_TO_HMRC'
      const isUndoFromFiledToCompaniesHouse = currentWorkflow?.currentStage === 'FILED_TO_COMPANIES_HOUSE' && stage !== 'FILED_TO_COMPANIES_HOUSE'
      const isUndoOperation = isUndoFromFiledToHMRC || isUndoFromFiledToCompaniesHouse
      
      if (isUndoOperation) {
        // Log specific undo operation
        await logActivityEnhanced(request, {
          action: 'LTD_ACCOUNTS_FILING_UNDONE',
          clientId,
          details: {
            companyName: client.companyName,
            clientCode: client.clientCode,
            workflowType: 'LTD',
            undoFromStage: currentWorkflow?.currentStage,
            revertedToStage: stage,
            filingPeriod: `${workflow.filingPeriodEnd.getFullYear()} accounts`,
            comments: comments || 'Accounts filing undone - workflow reopened for corrections',
            undoneBy: session.user.name || session.user.email || 'Unknown User',
            filingPeriodEnd: workflow.filingPeriodEnd.toISOString()
          }
        })
      } else {
        // Log regular stage change
        await logActivityEnhanced(request, {
          action: 'LTD_WORKFLOW_STAGE_CHANGED',
          clientId,
          details: {
            companyName: client.companyName,
            clientCode: client.clientCode,
            workflowType: 'LTD',
            oldStage: currentWorkflow?.currentStage || 'NOT_STARTED',
            newStage: stage,
            comments,
            quarterPeriod: `${workflow.filingPeriodEnd.getFullYear()} accounts`,
            filingPeriodEnd: workflow.filingPeriodEnd.toISOString()
          }
        })
      }
    }

    // Only log assignment changes if there was an actual change
    if (assignedUserId !== undefined && assignedUserId !== client.ltdCompanyAssignedUserId) {
      // Get the updated client data with the new assignment
      const updatedClient = await db.client.findUnique({
        where: { id: clientId },
        include: {
          ltdCompanyAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      })
      
      // Get previous assignee name for better logging
      const previousAssigneeName = client.ltdCompanyAssignedUserId ? 
        client.ltdCompanyAssignedUser?.name : null
      
      if (updatedClient?.ltdCompanyAssignedUser) {
        await logActivityEnhanced(request, {
          action: 'LTD_WORKFLOW_ASSIGNED',
          clientId,
          details: {
            companyName: client.companyName,
            clientCode: client.clientCode,
            workflowType: 'LTD',
            assigneeId: updatedClient.ltdCompanyAssignedUser.id,
            assigneeName: updatedClient.ltdCompanyAssignedUser.name,
            quarterPeriod: `${workflow.filingPeriodEnd.getFullYear()} accounts`,
            previousAssignee: previousAssigneeName,
            filingPeriodEnd: workflow.filingPeriodEnd.toISOString()
          }
        })

        // 📧 Send enhanced Ltd assignment notification email
        AssignmentNotificationService.sendLtdAssignmentNotification(
          clientId,
          updatedClient.ltdCompanyAssignedUser.id,
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
          console.error('❌ Failed to send Ltd assignment notification email:', emailError)
          // Don't fail the main request if email fails
        })
      } else {
        // Log unassignment
        await logActivityEnhanced(request, {
          action: 'LTD_WORKFLOW_UNASSIGNED',
          clientId,
          details: {
            companyName: client.companyName,
            clientCode: client.clientCode,
            workflowType: 'LTD',
            filingPeriod: `${workflow.filingPeriodEnd.getFullYear()} accounts`,
            previousAssignee: previousAssigneeName,
            filingPeriodEnd: workflow.filingPeriodEnd.toISOString()
          }
        })
      }
    }

    // Log workflow creation if it's a new workflow
    if (!currentWorkflow) {
      await logActivityEnhanced(request, {
        action: 'LTD_WORKFLOW_CREATED',
        clientId,
        details: {
          companyName: client.companyName,
          clientCode: client.clientCode,
          filingPeriodEnd: workflow.filingPeriodEnd.toISOString(),
          accountsDueDate: workflow.accountsDueDate.toISOString()
        }
      })
    }

    // 📧 Send workflow stage change notifications (only if stage was updated)
    // Run notifications asynchronously to not block the response
    if (stage) {
      const filingPeriodEnd = workflow.filingPeriodEnd.getFullYear()
      // Fire and forget - don't await to improve performance
      workflowNotificationService.sendStageChangeNotifications({
        clientId,
        clientName: client.companyName,
        clientCode: client.clientCode,
        workflowType: 'ACCOUNTS',
        fromStage: currentWorkflow?.currentStage || null,
        toStage: stage,
        changedBy: {
          id: session.user.id,
          name: session.user.name || session.user.email || 'Unknown',
          email: session.user.email || '',
          role: session.user.role || 'USER'
        },
        assignedUserId: workflow.assignedUserId,
        comments,
        filingPeriod: `${filingPeriodEnd}`
      }).catch(notificationError => {
        console.error('❌ Failed to send workflow notifications:', notificationError)
        // Don't fail the main request if notifications fail
      })
    }

    return NextResponse.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        currentStage: workflow.currentStage,
        assignedUser: workflow.assignedUser,
        isCompleted: workflow.isCompleted
      }
    })

  } catch (error) {
    console.error('Error updating Ltd workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    )
  }
}

/**
 * Get milestone field mapping for a given stage
 */
function getMilestoneFieldForStage(stage: string) {
  const milestoneMap: Record<string, { dateField?: string, userField?: string, nameField?: string }> = {
    'PAPERWORK_CHASED': {
      dateField: 'chaseStartedDate',
      userField: 'chaseStartedByUserId',
      nameField: 'chaseStartedByUserName'
    },
    'PAPERWORK_RECEIVED': {
      dateField: 'paperworkReceivedDate',
      userField: 'paperworkReceivedByUserId',
      nameField: 'paperworkReceivedByUserName'
    },
    'WORK_IN_PROGRESS': {
      dateField: 'workStartedDate',
      userField: 'workStartedByUserId',
      nameField: 'workStartedByUserName'
    },
    'DISCUSS_WITH_MANAGER': {
      dateField: 'managerDiscussionDate',
      userField: 'managerDiscussionByUserId',
      nameField: 'managerDiscussionByUserName'
    },
    'REVIEW_BY_PARTNER': {
      dateField: 'partnerReviewDate',
      userField: 'partnerReviewByUserId',
      nameField: 'partnerReviewByUserName'
    },
    'REVIEW_DONE_HELLO_SIGN': {
      dateField: 'reviewCompletedDate',
      userField: 'reviewCompletedByUserId',
      nameField: 'reviewCompletedByUserName'
    },
    'SENT_TO_CLIENT_HELLO_SIGN': {
      dateField: 'sentToClientDate',
      userField: 'sentToClientByUserId',
      nameField: 'sentToClientByUserName'
    },
    'APPROVED_BY_CLIENT': {
      dateField: 'clientApprovedDate',
      userField: 'clientApprovedByUserId',
      nameField: 'clientApprovedByUserName'
    },
    'SUBMISSION_APPROVED_PARTNER': {
      dateField: 'partnerApprovedDate',
      userField: 'partnerApprovedByUserId',
      nameField: 'partnerApprovedByUserName'
    },
    'FILED_TO_COMPANIES_HOUSE': {
      dateField: 'filedToCompaniesHouseDate',
      userField: 'filedToCompaniesHouseByUserId',
      nameField: 'filedToCompaniesHouseByUserName'
    },
    'FILED_TO_HMRC': {
      dateField: 'filedToHMRCDate',
      userField: 'filedToHMRCByUserId',
      nameField: 'filedToHMRCByUserName'
    },
    'FILED_CH_HMRC': {
      dateField: 'filedDate',
      userField: 'filedByUserId',
      nameField: 'filedByUserName'
    },
    'CLIENT_SELF_FILING': {
      dateField: 'clientSelfFilingDate',
      userField: 'clientSelfFilingByUserId',
      nameField: 'clientSelfFilingByUserName'
    }
  }

  return milestoneMap[stage] || {}
}

/**
 * Enhanced milestone update function for Ltd workflow
 * Handles both forward progression and backward movement (undo operations)
 */
function getLtdMilestoneUpdateData(stage: string, userId: string, userName: string, currentStage?: string) {
  const milestoneField = getMilestoneFieldForStage(stage)
  const updateData: any = {}
  const now = new Date()
  
  // Set the milestone date for the new stage
  if (milestoneField.dateField) {
    updateData[milestoneField.dateField] = now
  }
  if (milestoneField.userField) {
    updateData[milestoneField.userField] = userId
  }
  if (milestoneField.nameField) {
    updateData[milestoneField.nameField] = userName
  }
  
  // ENHANCED: Clear future milestone dates when moving backwards (undo operations)
  if (currentStage) {
    const stageOrder = [
      'PAPERWORK_PENDING_CHASE',
      'PAPERWORK_CHASED', 
      'PAPERWORK_RECEIVED',
      'WORK_IN_PROGRESS',
      'DISCUSS_WITH_MANAGER',
      'REVIEW_BY_PARTNER',
      'REVIEW_DONE_HELLO_SIGN',
      'SENT_TO_CLIENT_HELLO_SIGN',
      'APPROVED_BY_CLIENT',
      'SUBMISSION_APPROVED_PARTNER',
      'FILED_TO_COMPANIES_HOUSE',
      'FILED_TO_HMRC',
      'FILED_CH_HMRC',
      'CLIENT_SELF_FILING'
    ]
    
    const currentIndex = stageOrder.indexOf(currentStage)
    const newIndex = stageOrder.indexOf(stage)
    
    // If moving backwards, clear milestone dates for future stages
    if (currentIndex > newIndex) {
      const futureStagesToClear = stageOrder.slice(newIndex + 1, currentIndex + 1)
      
      futureStagesToClear.forEach(futureStage => {
        const futureMilestoneField = getMilestoneFieldForStage(futureStage)
        if (futureMilestoneField.dateField) {
          // Clear the milestone date and user attribution
          updateData[futureMilestoneField.dateField] = null
          if (futureMilestoneField.userField) {
            updateData[futureMilestoneField.userField] = null
          }
          if (futureMilestoneField.nameField) {
            updateData[futureMilestoneField.nameField] = null
          }
        }
      })
    }
  }
  
  return updateData
} 