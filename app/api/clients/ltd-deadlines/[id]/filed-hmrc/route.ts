import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCompanyDetails } from '@/lib/companies-house'

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
            clientCode: true,
            companyNumber: true,
            assignedUserId: true
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

      // 📧 Send email notifications for HMRC filing completion
      try {
        const workflowNotificationService = await import('@/lib/workflow-notifications')
        await workflowNotificationService.workflowNotificationService.sendStageChangeNotifications({
          clientId: workflow.client.id,
          clientName: workflow.client.companyName,
          clientCode: workflow.client.clientCode || '',
          workflowType: 'ACCOUNTS',
          fromStage: 'FILED_TO_COMPANIES_HOUSE',
          toStage: 'FILED_TO_HMRC',
          changedBy: {
            id: session.user.id,
            name: session.user.name || 'Unknown User',
            email: session.user.email || '',
            role: session.user.role || 'USER'
          },
          assignedUserId: updatedWorkflow.assignedUserId,
          comments: 'Filed to HMRC successfully. Workflow completed. New CT due date calculated.',
          filingPeriod: `${updatedWorkflow.filingPeriodEnd.getFullYear()}`
        })
        console.log('✅ Email notifications sent for HMRC filing completion')
      } catch (emailError) {
        console.error('❌ Failed to send email notifications for HMRC filing:', emailError)
        // Don't fail the main operation if email fails
      }

      // 🎯 NEW REQUIREMENT: Update CT due date after HMRC filing
      console.log('🔄 Starting CT due date update and rollover for client:', workflow.client.companyName)
      
      try {
        // Fetch fresh Companies House data for CT calculation
        if (workflow.client.companyNumber) {
          console.log('📡 Fetching fresh Companies House data for CT calculation...')
          const companyData = await getCompanyDetails(workflow.client.companyNumber)
          
          if (companyData) {
            // Calculate new dates from Companies House data
            const newYearEnd = companyData.accounts?.next_made_up_to ? 
              new Date(companyData.accounts.next_made_up_to) : null
            const newAccountsDue = companyData.accounts?.next_due ? 
              new Date(companyData.accounts.next_due) : null
            const newConfirmationDue = companyData.confirmation_statement?.next_due ? 
              new Date(companyData.confirmation_statement.next_due) : null
            
            // 🎯 NEW: Calculate NEW CT due date (Year end + 12 months)
            const newCTDue = newYearEnd ? (() => {
              const ctDue = new Date(newYearEnd)
              ctDue.setFullYear(ctDue.getFullYear() + 1)
              return ctDue
            })() : null

            console.log('📅 New dates from Companies House:', {
              yearEnd: newYearEnd?.toISOString().split('T')[0],
              accountsDue: newAccountsDue?.toISOString().split('T')[0],
              confirmationDue: newConfirmationDue?.toISOString().split('T')[0],
              ctDue: newCTDue?.toISOString().split('T')[0] // 🎯 NEW: CT due date
            })

            // Update client with new dates INCLUDING CT due date
            await db.client.update({
              where: { id: workflow.client.id },
              data: {
                nextYearEnd: newYearEnd,
                nextAccountsDue: newAccountsDue,
                nextConfirmationDue: newConfirmationDue,
                // 🎯 NEW: Update CT due date after HMRC filing
                nextCorporationTaxDue: newCTDue,
                corporationTaxStatus: 'FILED', // Mark previous CT as filed
                lastCTStatusUpdate: new Date(),
                ctStatusUpdatedBy: session.user.id,
                updatedAt: new Date()
              }
            })

            console.log('✅ Updated client with new Companies House dates')

            // Create new workflow for next year if we have the required dates
            if (newYearEnd && newAccountsDue) {
              // Calculate filing period start (day after previous year end)
              const newFilingPeriodStart = new Date(workflow.filingPeriodEnd)
              newFilingPeriodStart.setDate(newFilingPeriodStart.getDate() + 1)

              // Set default assignee to null (unassigned)
              const defaultAssignedUserId = null

              // Calculate CT due date for new workflow (year end + 12 months)
              const workflowCTDue = new Date(newYearEnd)
              workflowCTDue.setFullYear(workflowCTDue.getFullYear() + 1)

              const newWorkflow = await db.ltdAccountsWorkflow.create({
                data: {
                  clientId: workflow.client.id,
                  filingPeriodStart: newFilingPeriodStart,
                  filingPeriodEnd: newYearEnd,
                  accountsDueDate: newAccountsDue,
                  ctDueDate: workflowCTDue, // Use calculated date for workflow
                  csDueDate: newConfirmationDue || newAccountsDue,
                  currentStage: 'WAITING_FOR_YEAR_END', // Default status
                  assignedUserId: defaultAssignedUserId, // Unassigned
                  isCompleted: false,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })

              console.log('✅ Created new workflow for next year:', {
                id: newWorkflow.id,
                filingPeriodStart: newWorkflow.filingPeriodStart.toISOString().split('T')[0],
                filingPeriodEnd: newWorkflow.filingPeriodEnd.toISOString().split('T')[0],
                assignedUserId: newWorkflow.assignedUserId,
                currentStage: newWorkflow.currentStage
              })

              // Create initial workflow history entry for the new workflow
              await db.ltdAccountsWorkflowHistory.create({
                data: {
                  ltdAccountsWorkflowId: newWorkflow.id,
                  fromStage: null,
                  toStage: 'WAITING_FOR_YEAR_END',
                  stageChangedAt: new Date(),
                  userId: session.user.id,
                  userName: session.user.name || 'System',
                  userEmail: session.user.email || '',
                  userRole: session.user.role || 'USER',
                  notes: 'New workflow created automatically after completing previous year filing.'
                }
              })

              console.log('🎉 Automatic rollover completed successfully!')
              
              return NextResponse.json({
                success: true,
                workflow: updatedWorkflow,
                message: '🎉 Congratulations! HMRC filing completed successfully.',
                completed: true,
                congratulatory: true, // 🎯 NEW: Flag for congratulatory display
                rollover: {
                  newWorkflow: {
                    id: newWorkflow.id,
                    filingPeriodStart: newWorkflow.filingPeriodStart,
                    filingPeriodEnd: newWorkflow.filingPeriodEnd,
                    currentStage: newWorkflow.currentStage,
                    assignedUserId: newWorkflow.assignedUserId
                  },
                  updatedDates: {
                    yearEnd: newYearEnd,
                    accountsDue: newAccountsDue,
                    confirmationDue: newConfirmationDue,
                    // 🎯 NEW: Include new CT due date in response
                    ctDue: newCTDue
                  },
                  // 🎯 NEW: Show new CT due date prominently
                  newCTDueDate: newCTDue ? {
                    date: newCTDue.toISOString(),
                    formatted: newCTDue.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    }),
                    yearEnd: newYearEnd?.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long', 
                      year: 'numeric'
                    })
                  } : null
                }
              })
            } else {
              console.log('⚠️ Could not create new workflow - missing required dates')
            }
          } else {
            console.log('⚠️ Could not fetch Companies House data for rollover')
          }
        } else {
          console.log('⚠️ No company number available for Companies House lookup')
        }
      } catch (rolloverError) {
        console.error('❌ Error during automatic rollover:', rolloverError)
        // Don't fail the main operation, just log the error
      }

      return NextResponse.json({
        success: true,
        workflow: updatedWorkflow,
        message: '🎉 Congratulations! HMRC filing completed successfully.',
        completed: true,
        congratulatory: true // 🎯 NEW: Flag for congratulatory display
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