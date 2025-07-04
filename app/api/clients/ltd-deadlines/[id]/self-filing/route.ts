import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

const SelfFilingSchema = z.object({
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
    const { comments } = SelfFilingSchema.parse(body)

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

    // Permission check removed - all users can set self-filing
    // This allows staff, managers, and partners to set client self-filing

    const currentWorkflow = client.ltdAccountsWorkflows[0]
    let workflow

    if (!currentWorkflow) {
      // Create new workflow marked as self-filing
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
          currentStage: 'CLIENT_SELF_FILING',
          assignedUserId: null, // No assignment needed for self-filing
          isCompleted: true, // Mark as completed since client handles it
          // Set self-filing milestone data
          clientSelfFilingDate: new Date(),
          clientSelfFilingByUserId: session.user.id,
          clientSelfFilingByUserName: session.user.name || session.user.email || 'Unknown'
        }
      })
    } else {
      // Update existing workflow to self-filing
      workflow = await db.ltdAccountsWorkflow.update({
        where: { id: currentWorkflow.id },
        data: {
          currentStage: 'CLIENT_SELF_FILING',
          assignedUserId: null, // Remove assignment
          isCompleted: true, // Mark as completed
          // Set self-filing milestone data
          clientSelfFilingDate: new Date(),
          clientSelfFilingByUserId: session.user.id,
          clientSelfFilingByUserName: session.user.name || session.user.email || 'Unknown'
        }
      })
    }

    // Create workflow history entry
    await db.ltdAccountsWorkflowHistory.create({
      data: {
        ltdAccountsWorkflowId: workflow.id,
        fromStage: currentWorkflow?.currentStage || null,
        toStage: 'CLIENT_SELF_FILING',
        stageChangedAt: new Date(),
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown',
        userEmail: session.user.email || '',
        userRole: session.user.role,
        notes: comments || 'Client will handle their own accounts filing'
      }
    })

    return NextResponse.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        currentStage: workflow.currentStage,
        isCompleted: workflow.isCompleted
      }
    })

  } catch (error) {
    console.error('Error setting self-filing:', error)
    return NextResponse.json(
      { error: 'Failed to set self-filing' },
      { status: 500 }
    )
  }
} 