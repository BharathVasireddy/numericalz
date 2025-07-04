import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

const FiledSchema = z.object({
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
    const { comments } = FiledSchema.parse(body)

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

    // Permission check removed - all users can complete filing
    // This allows staff, managers, and partners to complete workflow filings

    const currentWorkflow = client.ltdAccountsWorkflows[0]

    if (!currentWorkflow) {
      return NextResponse.json({ error: 'No active workflow found' }, { status: 404 })
    }

    // Update workflow to filed completion
    const workflow = await db.ltdAccountsWorkflow.update({
      where: { id: currentWorkflow.id },
      data: {
        currentStage: 'FILED_TO_HMRC',
        isCompleted: true,
        // Set filing milestone data
        filedDate: new Date(),
        filedByUserId: session.user.id,
        filedByUserName: session.user.name || session.user.email || 'Unknown'
      },
      include: {
        assignedUser: true
      }
    })

    // Create workflow history entry
    await db.ltdAccountsWorkflowHistory.create({
      data: {
        ltdAccountsWorkflowId: workflow.id,
        fromStage: currentWorkflow.currentStage,
        toStage: 'FILED_TO_HMRC',
        stageChangedAt: new Date(),
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown',
        userEmail: session.user.email || '',
        userRole: session.user.role,
        notes: comments || 'Filed to Companies House & HMRC'
      }
    })

    // Refresh Companies House data to get updated filing dates
    try {
      await fetch(`${request.nextUrl.origin}/api/clients/${clientId}/refresh-companies-house`, {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      })
    } catch (refreshError) {
      console.error('Error refreshing Companies House data:', refreshError)
      // Don't fail the filing completion if CH refresh fails
    }

    // Calculate next period's dates for display
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    const nextAccountsDue = new Date(nextYear + 1, 8, 30) // Next Sep 30
    const nextCTDue = new Date(nextYear + 1, 11, 31) // Next Dec 31
    const nextCSDue = new Date(nextYear + 1, 0, 31) // Next Jan 31

    return NextResponse.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        currentStage: workflow.currentStage,
        isCompleted: workflow.isCompleted,
        filedDate: workflow.filedDate,
        filedByUserName: workflow.filedByUserName
      },
      nextPeriod: {
        accountsDue: nextAccountsDue.toISOString(),
        ctDue: nextCTDue.toISOString(),
        csDue: nextCSDue.toISOString()
      }
    })

  } catch (error) {
    console.error('Error completing filing:', error)
    return NextResponse.json(
      { error: 'Failed to complete filing' },
      { status: 500 }
    )
  }
} 