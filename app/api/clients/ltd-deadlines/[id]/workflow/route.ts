import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { LtdAccountsWorkflowStage } from '@prisma/client'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'

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
        ltdAccountsWorkflows: {
          orderBy: { filingPeriodEnd: 'desc' },
          take: 1
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check user permissions (staff can only update their own assignments)
    if (session.user.role === 'STAFF') {
      const isAssigned = client.ltdCompanyAssignedUserId === session.user.id ||
                        client.ltdAccountsWorkflows[0]?.assignedUserId === session.user.id
      
      if (!isAssigned) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

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
        updateData.isCompleted = stage === 'FILED_CH_HMRC'
        
        // Set milestone dates based on stage
        const milestoneField = getMilestoneFieldForStage(stage)
        if (milestoneField.dateField) {
          updateData[milestoneField.dateField] = new Date()
        }
        if (milestoneField.userField) {
          updateData[milestoneField.userField] = session.user.id
        }
        if (milestoneField.nameField) {
          updateData[milestoneField.nameField] = session.user.name || session.user.email || 'Unknown'
        }
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

    // Log comprehensive activity
    if (stage) {
      await logActivityEnhanced(request, ActivityHelpers.workflowStageChanged(
        'LTD',
        clientId,
        currentWorkflow?.currentStage || 'NOT_STARTED',
        stage,
        comments
      ))
    }

    if (assignedUserId !== undefined) {
      const assignedUser = workflow.assignedUser
      if (assignedUser) {
        await logActivityEnhanced(request, ActivityHelpers.workflowAssigned(
          'LTD',
          clientId,
          assignedUser.id,
          assignedUser.name
        ))
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