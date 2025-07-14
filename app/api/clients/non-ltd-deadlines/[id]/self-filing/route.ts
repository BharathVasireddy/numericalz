import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'

const SelfFilingSchema = z.object({
  comments: z.string().optional(),
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

    // Check if user has permission to update workflows
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = SelfFilingSchema.parse(body)

    const clientId = params.id

    // Get current workflow for this client
    const currentWorkflow = await db.nonLtdAccountsWorkflow.findFirst({
      where: { 
        clientId: clientId,
        isCompleted: false // Get the active workflow
      },
      include: {
        client: true,
        assignedUser: true,
      }
    })

    if (!currentWorkflow) {
      return NextResponse.json({ error: 'No active workflow found for this client' }, { status: 404 })
    }

    // Update workflow to client self-filing stage
    const updatedWorkflow = await db.nonLtdAccountsWorkflow.update({
      where: { id: currentWorkflow.id },
      data: {
        currentStage: 'CLIENT_SELF_FILING',
        isCompleted: true, // Mark as completed since client handles filing
        filedToHMRCDate: new Date(),
        filedToHMRCByUserName: session.user.name || session.user.email || 'Unknown'
      },
      include: {
        client: true,
        assignedUser: true,
      }
    })

    // Create workflow history entry
    await db.nonLtdAccountsWorkflowHistory.create({
      data: {
        nonLtdAccountsWorkflowId: currentWorkflow.id,
        fromStage: currentWorkflow.currentStage,
        toStage: 'CLIENT_SELF_FILING',
        stageChangedAt: new Date(),
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown',
        userEmail: session.user.email || '',
        userRole: session.user.role,
        notes: validatedData.comments || 'Marked as client self-filing'
      }
    })

    // Log the client self-filing activity
    await logActivityEnhanced(request, {
      action: 'NON_LTD_WORKFLOW_CLIENT_SELF_FILING',
      clientId,
      details: {
        companyName: updatedWorkflow.client.companyName,
        clientCode: updatedWorkflow.client.clientCode,
        workflowType: 'NON_LTD',
        filingPeriod: `${new Date(updatedWorkflow.yearEndDate).getFullYear()} accounts`,
        comments: validatedData.comments || 'Client handling their own accounts filing',
        markedBy: session.user.name || session.user.email || 'Unknown User',
        yearEndDate: updatedWorkflow.yearEndDate
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedWorkflow,
      message: 'Workflow marked as client self-filing successfully'
    })

  } catch (error) {
    console.error('Non-Ltd self-filing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
} 