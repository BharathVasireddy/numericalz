import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { calculateNonLtdYearEnd, calculateNonLtdFilingDue } from '@/lib/non-ltd-workflow-utils'

const FiledHMRCSchema = z.object({
  workflowId: z.string(),
  confirmFiling: z.boolean(),
  comments: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to file to HMRC
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = FiledHMRCSchema.parse(body)

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

    // Update workflow to filed to HMRC stage
    const updatedWorkflow = await db.nonLtdAccountsWorkflow.update({
      where: { id: currentWorkflow.id },
      data: {
        currentStage: 'FILED_TO_HMRC',
        isCompleted: true,
        filedToHMRCDate: new Date(),
        filedToHMRCByUserId: session.user.id,
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
        toStage: 'FILED_TO_HMRC',
        stageChangedAt: new Date(),
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown',
        userEmail: session.user.email || '',
        userRole: session.user.role,
        notes: validatedData.comments || 'Filed to HMRC successfully'
      }
    })

    // Log the HMRC filing activity
    await logActivityEnhanced(request, {
      action: 'NON_LTD_ACCOUNTS_FILED',
      clientId,
      details: {
        companyName: updatedWorkflow.client.companyName,
        clientCode: updatedWorkflow.client.clientCode,
        workflowType: 'NON_LTD',
        filingPeriod: `${new Date(updatedWorkflow.yearEndDate).getFullYear()} accounts`,
        comments: validatedData.comments || 'Non-Ltd accounts filed to HMRC',
        filedBy: session.user.name || session.user.email || 'Unknown User',
        yearEndDate: updatedWorkflow.yearEndDate,
        filedDate: new Date().toISOString()
      }
    })

    // 🎯 NEW: AUTOMATIC ROLLOVER LOGIC - Create next year's workflow
    try {
      console.log('🔄 Starting automatic rollover for non-ltd company...')
      
      // Calculate next year's dates (non-ltd companies have fixed dates)
      const currentYearEnd = new Date(currentWorkflow.yearEndDate)
      const nextYear = currentYearEnd.getFullYear() + 1
      
      // Non-ltd companies: Year end always April 5th, filing due always January 5th
      const nextYearEnd = calculateNonLtdYearEnd(nextYear)
      const nextFilingDue = calculateNonLtdFilingDue(nextYearEnd)
      
      console.log('📅 Calculated next year dates:', {
        currentYearEnd: currentYearEnd.toISOString().split('T')[0],
        nextYearEnd: nextYearEnd.toISOString().split('T')[0],
        nextFilingDue: nextFilingDue.toISOString().split('T')[0]
      })

      // Check if workflow for next year already exists
      const existingNextWorkflow = await db.nonLtdAccountsWorkflow.findFirst({
        where: {
          clientId: clientId,
          yearEndDate: nextYearEnd
        }
      })

      if (!existingNextWorkflow) {
        // Create new workflow for next year
        const newWorkflow = await db.nonLtdAccountsWorkflow.create({
          data: {
            clientId: clientId,
            yearEndDate: nextYearEnd,
            filingDueDate: nextFilingDue,
            currentStage: 'WAITING_FOR_YEAR_END', // Default stage for new workflow
            assignedUserId: null, // Unassigned - will be assigned when year end passes
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        console.log('✅ Created new workflow for next year:', {
          id: newWorkflow.id,
          yearEndDate: newWorkflow.yearEndDate.toISOString().split('T')[0],
          filingDueDate: newWorkflow.filingDueDate.toISOString().split('T')[0],
          currentStage: newWorkflow.currentStage,
          assignedUserId: newWorkflow.assignedUserId
        })

        // Create initial workflow history entry for the new workflow
        await db.nonLtdAccountsWorkflowHistory.create({
          data: {
            nonLtdAccountsWorkflowId: newWorkflow.id,
            fromStage: null,
            toStage: 'WAITING_FOR_YEAR_END',
            stageChangedAt: new Date(),
            userId: session.user.id,
            userName: session.user.name || session.user.email || 'System',
            userEmail: session.user.email || '',
            userRole: session.user.role || 'USER',
            notes: 'New workflow created automatically after completing previous year filing.'
          }
        })

        console.log('🎉 Automatic rollover completed successfully!')
        
        return NextResponse.json({
          success: true,
          data: updatedWorkflow,
          message: '🎉 Congratulations! Non-Ltd accounts filed to HMRC successfully.',
          completed: true,
          congratulatory: true,
          rollover: {
            newWorkflow: {
              id: newWorkflow.id,
              yearEndDate: newWorkflow.yearEndDate,
              filingDueDate: newWorkflow.filingDueDate,
              currentStage: newWorkflow.currentStage,
              assignedUserId: newWorkflow.assignedUserId
            },
            updatedDates: {
              yearEnd: nextYearEnd,
              filingDue: nextFilingDue
            },
            newFilingDueDate: {
              date: nextFilingDue.toISOString(),
              formatted: nextFilingDue.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              }),
              yearEnd: nextYearEnd.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long', 
                year: 'numeric'
              })
            }
          }
        })
      } else {
        console.log('⚠️ Workflow for next year already exists, skipping creation')
      }
    } catch (rolloverError) {
      console.error('❌ Error during automatic rollover:', rolloverError)
      // Don't fail the main operation, just log the error
    }

    return NextResponse.json({
      success: true,
      data: updatedWorkflow,
      message: '🎉 Congratulations! Non-Ltd accounts filed to HMRC successfully.',
      congratulatory: true
    })

  } catch (error) {
    console.error('Non-Ltd HMRC filing error:', error)
    
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