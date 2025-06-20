import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { getNextVATWorkflowStage, VAT_WORKFLOW_STAGE_NAMES, calculateDaysBetween } from '@/lib/vat-workflow'

/**
 * Map workflow stages to their corresponding milestone date fields
 * Based on user requirements for workflow stage → timeline milestone mapping
 */
const STAGE_TO_MILESTONE_MAP: { [key: string]: string } = {
  'CLIENT_BOOKKEEPING': 'filedToHMRCDate', // Client to do bookkeeping = Filed to HMRC (client handles their own VAT filing)
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

    // Check if quarter is already completed
    if (vatQuarter.isCompleted) {
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

    // Special handling for CLIENT_BOOKKEEPING stage
    // When set to CLIENT_BOOKKEEPING, automatically complete the workflow
    // since the client is handling their own VAT filing
    if (stage === 'CLIENT_BOOKKEEPING') {
      // Mark as completed and set filed date since client handles filing
      milestoneUpdateData.filedToHMRCDate = new Date()
      milestoneUpdateData.filedToHMRCByUserId = session.user.id
      milestoneUpdateData.filedToHMRCByUserName = session.user.name || session.user.email || 'Unknown User'
    }

    // Special handling for paperwork received - set when moving from CLIENT_BOOKKEEPING
    if (vatQuarter.currentStage === 'CLIENT_BOOKKEEPING' && stage !== 'CLIENT_BOOKKEEPING') {
      milestoneUpdateData.paperworkReceivedDate = new Date()
      milestoneUpdateData.paperworkReceivedByUserId = session.user.id
      milestoneUpdateData.paperworkReceivedByUserName = session.user.name || session.user.email || 'Unknown User'
    }

    // Update VAT quarter with milestone dates
    const updatedVatQuarter = await prisma.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        currentStage: stage,
        assignedUserId: assignedUserId || vatQuarter.assignedUserId,
        isCompleted: stage === 'FILED_TO_HMRC' || stage === 'CLIENT_BOOKKEEPING',
        ...milestoneUpdateData
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            vatQuarterGroup: true,
          }
        }
      }
    })

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
