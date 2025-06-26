import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

const FiledHMRCSchema = z.object({
  workflowId: z.string(),
  confirmFiling: z.boolean()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { workflowId, confirmFiling } = FiledHMRCSchema.parse(body)

    // Get the workflow
    const workflow = await db.ltdAccountsWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true
          }
        }
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate current stage
    if (workflow.currentStage !== 'FILED_TO_COMPANIES_HOUSE') {
      return NextResponse.json({ 
        error: 'Invalid workflow stage for HMRC filing. Must be filed to Companies House first.' 
      }, { status: 400 })
    }

    // If user confirmed filing, proceed with the update
    if (confirmFiling) {
      // Update workflow to FILED_TO_HMRC stage and mark as completed
      const updatedWorkflow = await db.ltdAccountsWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStage: 'FILED_TO_HMRC',
          filedToHMRCDate: new Date(),
          filedToHMRCByUserId: session.user.id,
          filedToHMRCByUserName: session.user.name || 'Unknown User',
          isCompleted: true, // Mark workflow as completed
          updatedAt: new Date()
        }
      })

      // Create workflow history entry
      await db.ltdAccountsWorkflowHistory.create({
        data: {
          ltdAccountsWorkflowId: workflowId,
          fromStage: 'FILED_TO_COMPANIES_HOUSE',
          toStage: 'FILED_TO_HMRC',
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || 'Unknown User',
          userEmail: session.user.email || '',
          userRole: session.user.role || 'USER',
          notes: 'Filed to HMRC successfully. Workflow completed.'
        }
      })

      return NextResponse.json({
        success: true,
        workflow: updatedWorkflow,
        message: 'Workflow completed successfully - Filed to HMRC',
        completed: true
      })
    }

    // If no confirmation provided, return error
    return NextResponse.json({ 
      error: 'Filing confirmation required' 
    }, { status: 400 })

  } catch (error) {
    console.error('Error updating workflow to Filed to HMRC:', error)
    
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