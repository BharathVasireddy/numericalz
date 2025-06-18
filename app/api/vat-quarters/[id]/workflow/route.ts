import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { getNextVATWorkflowStage, VAT_WORKFLOW_STAGE_NAMES, calculateDaysBetween } from '@/lib/vat-workflow'

/**
 * PUT /api/vat-quarters/[id]/workflow
 * Update VAT quarter workflow stage
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

    // Update VAT quarter
    const updatedVatQuarter = await prisma.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        currentStage: stage,
        assignedUserId: assignedUserId || vatQuarter.assignedUserId,
        isCompleted: stage === 'FILED_TO_HMRC',
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
        userRole: 'USER',
        notes: comments || `Stage updated to: ${VAT_WORKFLOW_STAGE_NAMES[stage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}`,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        vatQuarter: updatedVatQuarter,
        workflowHistory
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
