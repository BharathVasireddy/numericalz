import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getNextNonLtdStages } from '@/lib/non-ltd-workflow-utils'
import { NonLtdAccountsWorkflowStage } from '@prisma/client'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { workflowNotificationService } from '@/lib/workflow-notifications'
import { AssignmentNotificationService } from '@/lib/assignment-notifications'
import { validateStageTransition } from '@/lib/workflow-validation'

const UpdateWorkflowSchema = z.object({
  currentStage: z.nativeEnum(NonLtdAccountsWorkflowStage).optional(), // FIXED: Make stage optional
  assignedUserId: z.string().nullable().optional(),
  notes: z.string().optional(),
  skipWarning: z.boolean().optional(), // Allow bypassing stage validation
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
    const validatedData = UpdateWorkflowSchema.parse(body)

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

    // Validate stage transition (only if stage is being changed and skipWarning is not true)
    if (validatedData.currentStage && !validatedData.skipWarning) {
      // FIXED: Use proper workflow validation to get skipped stages
      const validationResult = validateStageTransition(
        currentWorkflow.currentStage, // Convert enum to string
        validatedData.currentStage, // Convert enum to string
        'NON_LTD'
      )
      
      if (!validationResult.isValid) {
        return NextResponse.json({
          error: validationResult.message,
          currentStage: currentWorkflow.currentStage,
          skippedStages: validationResult.skippedStages, // FIXED: Return actual skipped stages
          allowedStages: validationResult.allowedNextStages,
          requiresSkipWarning: validationResult.isSkipping
        }, { status: 400 })
      }
    }

    // Update workflow stage (only if provided)
    if (validatedData.currentStage) {
      // Get milestone update data with backward movement support
      const milestoneUpdateData = getNonLtdMilestoneUpdateData(
        validatedData.currentStage,
        session.user.id,
        session.user.name || session.user.email || 'Unknown',
        currentWorkflow.currentStage // Pass current stage for undo operations
      )
      
      // Update workflow with new stage and milestone data
      await db.nonLtdAccountsWorkflow.update({
        where: { id: currentWorkflow.id },
        data: {
          currentStage: validatedData.currentStage,
          isCompleted: validatedData.currentStage === 'FILED_TO_HMRC',
          ...milestoneUpdateData
        }
      })
      
      // Create history entry
      await db.nonLtdAccountsWorkflowHistory.create({
        data: {
          nonLtdAccountsWorkflowId: currentWorkflow.id,
          fromStage: currentWorkflow.currentStage,
          toStage: validatedData.currentStage,
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown',
          userEmail: session.user.email || '',
          userRole: session.user.role,
          notes: validatedData.notes || `Stage updated to ${validatedData.currentStage}`
        }
      })

      // 🎯 AUTO-ASSIGNMENT LOGIC: Create and assign next workflow when marked as "FILED_TO_HMRC"
      if (validatedData.currentStage === 'FILED_TO_HMRC') {
        try {
          console.log('🔄 Starting auto-assignment for next non-ltd workflow...')
          
          // Calculate next year's dates (non-ltd companies have fixed dates)
          const currentYearEnd = new Date(currentWorkflow.yearEndDate)
          const nextYear = currentYearEnd.getFullYear() + 1
          
          // Non-ltd companies: Year end always April 5th, filing due always January 5th
          const nextYearEnd = new Date(nextYear, 3, 5) // April 5th next year
          const nextFilingDue = new Date(nextYear + 1, 0, 5) // January 5th year after next
          
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
                currentStage: 'WAITING_FOR_YEAR_END',
                isCompleted: false,
                // Auto-assign to the same user who completed the current workflow
                assignedUserId: currentWorkflow.assignedUserId
              }
            })

            console.log('✅ Created and auto-assigned next workflow:', {
              workflowId: newWorkflow.id,
              yearEndDate: newWorkflow.yearEndDate.toISOString().split('T')[0],
              assignedUserId: newWorkflow.assignedUserId,
              assignedUserName: currentWorkflow.assignedUser?.name || 'Unknown'
            })

            // Log the auto-assignment activity
            await logActivityEnhanced(request, {
              action: 'NON_LTD_NEXT_WORKFLOW_AUTO_ASSIGNED',
              clientId,
              details: {
                companyName: currentWorkflow.client.companyName,
                clientCode: currentWorkflow.client.clientCode,
                workflowType: 'NON_LTD',
                nextFilingPeriod: `${nextYear} accounts`,
                autoAssignedTo: currentWorkflow.assignedUser?.name || 'Unknown User',
                autoAssignedToId: currentWorkflow.assignedUserId,
                nextYearEndDate: nextYearEnd,
                nextFilingDueDate: nextFilingDue,
                comments: `Next workflow auto-created and assigned to ${currentWorkflow.assignedUser?.name || 'Unknown User'} after filing completion`,
                completedBy: session.user.name || session.user.email || 'Unknown User'
              }
            })

          } else {
            // Workflow exists but might be unassigned - assign it to the same user
            if (!existingNextWorkflow.assignedUserId && currentWorkflow.assignedUserId) {
              await db.nonLtdAccountsWorkflow.update({
                where: { id: existingNextWorkflow.id },
                data: { assignedUserId: currentWorkflow.assignedUserId }
              })

              console.log('✅ Auto-assigned existing next workflow:', {
                workflowId: existingNextWorkflow.id,
                yearEndDate: existingNextWorkflow.yearEndDate.toISOString().split('T')[0],
                assignedUserId: currentWorkflow.assignedUserId,
                assignedUserName: currentWorkflow.assignedUser?.name || 'Unknown'
              })

              // Log the auto-assignment activity
              await logActivityEnhanced(request, {
                action: 'NON_LTD_EXISTING_WORKFLOW_AUTO_ASSIGNED',
                clientId,
                details: {
                  companyName: currentWorkflow.client.companyName,
                  clientCode: currentWorkflow.client.clientCode,
                  workflowType: 'NON_LTD',
                  nextFilingPeriod: `${nextYear} accounts`,
                  autoAssignedTo: currentWorkflow.assignedUser?.name || 'Unknown User',
                  autoAssignedToId: currentWorkflow.assignedUserId,
                  nextYearEndDate: existingNextWorkflow.yearEndDate,
                  nextFilingDueDate: existingNextWorkflow.filingDueDate,
                  comments: `Existing next workflow auto-assigned to ${currentWorkflow.assignedUser?.name || 'Unknown User'} after filing completion`,
                  completedBy: session.user.name || session.user.email || 'Unknown User'
                }
              })
            } else {
              console.log('⚠️ Next workflow already exists and assigned, skipping auto-assignment')
            }
          }
        } catch (autoAssignmentError) {
          console.error('❌ Error during auto-assignment of next workflow:', autoAssignmentError)
          // Don't fail the main operation, just log the error
        }
      }
    }

    // Update assignment if provided
    if (validatedData.assignedUserId !== undefined) {
      await db.nonLtdAccountsWorkflow.update({
        where: { id: currentWorkflow.id },
        data: { assignedUserId: validatedData.assignedUserId }
      })
    }

    // Create workflow history entry for assignment changes only (stage changes are handled above)
    if (validatedData.assignedUserId !== undefined && !validatedData.currentStage) {
      await db.nonLtdAccountsWorkflowHistory.create({
        data: {
          nonLtdAccountsWorkflowId: currentWorkflow.id,
          fromStage: currentWorkflow.currentStage,
          toStage: currentWorkflow.currentStage,
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown',
          userEmail: session.user.email || '',
          userRole: session.user.role,
          notes: validatedData.notes || 'Assignment updated'
        }
      })
    }

    // Get updated workflow with all relations for logging
    const finalWorkflow = await db.nonLtdAccountsWorkflow.findUnique({
      where: { id: currentWorkflow.id },
      include: {
        client: true,
        assignedUser: true,
        workflowHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    // Log comprehensive activity (single consolidated log)
    if (validatedData.currentStage) {
      // ENHANCED: Detect undo operations for specific logging
      const isUndoFromFiledToHMRC = currentWorkflow.currentStage === 'FILED_TO_HMRC' && validatedData.currentStage !== 'FILED_TO_HMRC'
      const isUndoOperation = isUndoFromFiledToHMRC
      
      if (isUndoOperation) {
        // 🔧 CRITICAL FIX: Clean up orphaned workflow created during rollover
        try {
          // Find the next year's workflow that was created during filing
          const currentYearEnd = new Date(finalWorkflow?.yearEndDate || '')
          const nextYear = currentYearEnd.getFullYear() + 1
          const nextYearEnd = new Date(nextYear, 3, 5) // April 5th next year
          
          // Look for workflow created for next year
          const orphanedWorkflow = await db.nonLtdAccountsWorkflow.findFirst({
            where: {
              clientId: clientId,
              yearEndDate: nextYearEnd,
              isCompleted: false, // Only unstarted workflows
              currentStage: 'WAITING_FOR_YEAR_END' // Only auto-created workflows
            }
          })
          
          if (orphanedWorkflow) {
            // Delete the orphaned workflow and its history
            await db.nonLtdAccountsWorkflowHistory.deleteMany({
              where: { nonLtdAccountsWorkflowId: orphanedWorkflow.id }
            })
            
            await db.nonLtdAccountsWorkflow.delete({
              where: { id: orphanedWorkflow.id }
            })
            
            console.log('🧹 Cleaned up orphaned workflow created during rollover:', {
              workflowId: orphanedWorkflow.id,
              yearEndDate: orphanedWorkflow.yearEndDate.toISOString().split('T')[0],
              reason: 'Filing undone - rollover cancelled'
            })
          }
        } catch (cleanupError) {
          console.error('❌ Error cleaning up orphaned workflow during undo:', cleanupError)
          // Don't fail the main undo operation if cleanup fails
        }
        
        // Log specific undo operation
        await logActivityEnhanced(request, {
          action: 'NON_LTD_ACCOUNTS_FILING_UNDONE',
          clientId,
          details: {
            companyName: finalWorkflow?.client.companyName,
            clientCode: finalWorkflow?.client.clientCode,
            workflowType: 'NON_LTD',
            undoFromStage: currentWorkflow.currentStage,
            revertedToStage: validatedData.currentStage,
            filingPeriod: `${new Date(finalWorkflow?.yearEndDate || '').getFullYear()} accounts`,
            comments: validatedData.notes || 'Non-Ltd accounts filing undone - workflow reopened for corrections',
            undoneBy: session.user.name || session.user.email || 'Unknown User',
            yearEndDate: finalWorkflow?.yearEndDate
          }
        })
      } else {
        // Log regular stage change
        await logActivityEnhanced(request, {
          action: 'NON_LTD_WORKFLOW_STAGE_CHANGED',
          clientId,
          details: {
            companyName: finalWorkflow?.client.companyName,
            clientCode: finalWorkflow?.client.clientCode,
            workflowType: 'NON_LTD',
            oldStage: currentWorkflow.currentStage,
            newStage: validatedData.currentStage,
            comments: validatedData.notes,
            filingPeriod: `${new Date(finalWorkflow?.yearEndDate || '').getFullYear()} accounts`,
            yearEndDate: finalWorkflow?.yearEndDate
          }
        })
      }
    }

    // Only log assignment changes if there was an actual change
    if (validatedData.assignedUserId !== undefined && validatedData.assignedUserId !== currentWorkflow.assignedUserId) {
      // Get the client data for better logging
      const client = await db.client.findUnique({
        where: { id: clientId },
        include: {
          nonLtdCompanyAssignedUser: {
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
      const previousAssigneeName = currentWorkflow.assignedUserId ? 
        currentWorkflow.assignedUser?.name : null
      
      if (finalWorkflow?.assignedUser) {
        await logActivityEnhanced(request, {
          action: 'NON_LTD_WORKFLOW_ASSIGNED',
          clientId,
          details: {
            companyName: client?.companyName,
            clientCode: client?.clientCode,
            workflowType: 'NON_LTD',
            assigneeId: finalWorkflow.assignedUser.id,
            assigneeName: finalWorkflow.assignedUser.name,
            filingPeriod: `${new Date(finalWorkflow.yearEndDate).getFullYear()} accounts`,
            previousAssignee: previousAssigneeName,
            yearEndDate: finalWorkflow.yearEndDate
          }
        })

        // 📧 Send enhanced Non-Ltd assignment notification email
        AssignmentNotificationService.sendNonLtdAssignmentNotification(
          clientId,
          finalWorkflow.assignedUser.id,
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
          console.error('❌ Failed to send Non-Ltd assignment notification email:', emailError)
          // Don't fail the main request if email fails
        })
      } else {
        // Log unassignment
        await logActivityEnhanced(request, {
          action: 'NON_LTD_WORKFLOW_UNASSIGNED',
          clientId,
          details: {
            companyName: client?.companyName,
            clientCode: client?.clientCode,
            workflowType: 'NON_LTD',
            filingPeriod: `${new Date(finalWorkflow?.yearEndDate || '').getFullYear()} accounts`,
            previousAssignee: previousAssigneeName,
            yearEndDate: finalWorkflow?.yearEndDate
          }
        })
      }
    }

    // 📧 Send workflow stage change notifications (only if stage was updated)
    // Run notifications asynchronously to not block the response
    if (validatedData.currentStage) {
      const filingPeriod = new Date(finalWorkflow?.yearEndDate || '').getFullYear()
      // Fire and forget - don't await to improve performance
      workflowNotificationService.sendStageChangeNotifications({
        clientId,
        clientName: finalWorkflow?.client.companyName || '',
        clientCode: finalWorkflow?.client.clientCode || '',
        workflowType: 'ACCOUNTS', // FIXED: Use 'ACCOUNTS' for non-Ltd workflows
        fromStage: currentWorkflow.currentStage,
        toStage: validatedData.currentStage,
        changedBy: {
          id: session.user.id,
          name: session.user.name || session.user.email || 'Unknown',
          email: session.user.email || '',
          role: session.user.role || 'USER'
        },
        assignedUserId: finalWorkflow?.assignedUserId,
        comments: validatedData.notes,
        filingPeriod: `${filingPeriod}`
      }).catch(notificationError => {
        console.error('❌ Failed to send workflow notifications:', notificationError)
        // Don't fail the main request if notifications fail
      })
    }

    // 🔔 Send assignment notification if assignee was changed
    if (validatedData.assignedUserId !== undefined && validatedData.assignedUserId !== currentWorkflow.assignedUserId && validatedData.assignedUserId) {
      const filingPeriod = new Date(finalWorkflow?.yearEndDate || '').getFullYear()
      workflowNotificationService.sendAssignmentNotifications({
        workflowType: 'ACCOUNTS', // FIXED: Use 'ACCOUNTS' for non-Ltd workflows
        clientId,
        clientName: finalWorkflow?.client.companyName || '',
        assignedUserId: validatedData.assignedUserId,
        workflowId: currentWorkflow.id,
        assignedBy: {
          id: session.user.id,
          name: session.user.name || session.user.email || 'Unknown',
          email: session.user.email || '',
          role: session.user.role || 'USER'
        },
        filingPeriod: `${filingPeriod}`
      }).catch(notificationError => {
        console.error('❌ Failed to send non-Ltd accounts assignment notification:', notificationError)
        // Don't fail the main request if notifications fail
      })
    }

    return NextResponse.json({
      success: true,
      data: finalWorkflow,
      message: 'Workflow updated successfully'
    })

  } catch (error) {
    console.error('Non-Ltd workflow update error:', error)
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    const workflow = await db.nonLtdAccountsWorkflow.findFirst({
      where: { 
        clientId: clientId,
        isCompleted: false // Get the active workflow
      },
      include: {
        client: true,
        assignedUser: true,
        workflowHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        }
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: 'No active workflow found for this client' }, { status: 404 })
    }

    const nextStages = getNextNonLtdStages(workflow.currentStage)

    return NextResponse.json({
      success: true,
      data: {
        ...workflow,
        nextStages
      }
    })

  } catch (error) {
    console.error('Non-Ltd workflow get error:', error)
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Get milestone field mapping for a given stage
 */
function getNonLtdMilestoneFieldForStage(stage: string) {
  const milestoneMap: Record<string, { dateField?: string, userField?: string, nameField?: string }> = {
    'PAPERWORK_PENDING_CHASE': {
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
    'FILED_TO_HMRC': {
      dateField: 'filedToHMRCDate',
      userField: 'filedToHMRCByUserId',
      nameField: 'filedToHMRCByUserName'
    }
  }

  return milestoneMap[stage] || {}
}

/**
 * Enhanced milestone update function for Non-Ltd workflow
 * Handles both forward progression and backward movement (undo operations)
 */
function getNonLtdMilestoneUpdateData(stage: string, userId: string, userName: string, currentStage?: string) {
  const milestoneField = getNonLtdMilestoneFieldForStage(stage)
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
      'PAPERWORK_RECEIVED',
      'WORK_IN_PROGRESS',
      'DISCUSS_WITH_MANAGER',
      'REVIEW_BY_PARTNER',
      'REVIEW_DONE_HELLO_SIGN',
      'SENT_TO_CLIENT_HELLO_SIGN',
      'APPROVED_BY_CLIENT',
      'SUBMISSION_APPROVED_PARTNER',
      'FILED_TO_HMRC'
    ]
    
    const currentIndex = stageOrder.indexOf(currentStage)
    const newIndex = stageOrder.indexOf(stage)
    
    // If moving backwards, clear milestone dates for future stages
    if (currentIndex > newIndex) {
      const futureStagesToClear = stageOrder.slice(newIndex + 1, currentIndex + 1)
      
      futureStagesToClear.forEach(futureStage => {
        const futureMilestoneField = getNonLtdMilestoneFieldForStage(futureStage)
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