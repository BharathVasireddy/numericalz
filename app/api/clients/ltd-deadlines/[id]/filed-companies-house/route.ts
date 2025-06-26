import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCompanyDetails } from '@/lib/companies-house'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

const FiledCompaniesHouseSchema = z.object({
  workflowId: z.string(),
  confirmFiling: z.boolean(),
  ignoreCompaniesHouseWarning: z.boolean().optional().default(false)
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
    const { workflowId, confirmFiling, ignoreCompaniesHouseWarning } = FiledCompaniesHouseSchema.parse(body)

    // Get the workflow and client data
    const workflow = await db.ltdAccountsWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            companyNumber: true,
            nextYearEnd: true,
            nextAccountsDue: true
          }
        }
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate current stage - allow filing from SUBMISSION_APPROVED_PARTNER or earlier stages
    const validStagesForCompaniesHouseFiling = [
      'SUBMISSION_APPROVED_PARTNER',
      'APPROVED_BY_CLIENT',
      'SENT_TO_CLIENT_HELLO_SIGN',
      'REVIEW_DONE_HELLO_SIGN',
      'REVIEWED_BY_PARTNER',
      'REVIEW_BY_PARTNER'
    ]
    
    if (!validStagesForCompaniesHouseFiling.includes(workflow.currentStage)) {
      return NextResponse.json({ 
        error: `Cannot file to Companies House from stage: ${workflow.currentStage}. Must be at SUBMISSION_APPROVED_PARTNER or later stage.` 
      }, { status: 400 })
    }

    let companiesHouseWarning = null
    let freshCompaniesHouseData = null

    // Fetch fresh Companies House data if company number exists
    if (workflow.client.companyNumber) {
      try {
        console.log(`Fetching fresh Companies House data for ${workflow.client.companyNumber}`)
        
        // Define these outside the if block so they're available in all scenarios
        const currentYearEnd = new Date(workflow.filingPeriodEnd)
        const currentAccountsDue = new Date(workflow.accountsDueDate)
        
        freshCompaniesHouseData = await getCompanyDetails(workflow.client.companyNumber)
        
        if (freshCompaniesHouseData) {
          const freshYearEnd = freshCompaniesHouseData.accounts?.next_made_up_to 
            ? new Date(freshCompaniesHouseData.accounts.next_made_up_to)
            : null
          const freshAccountsDue = freshCompaniesHouseData.accounts?.next_due
            ? new Date(freshCompaniesHouseData.accounts.next_due)
            : null

          // Format dates for comparison display
          const currentYearEndStr = currentYearEnd.toLocaleDateString('en-GB')
          const currentAccountsDueStr = currentAccountsDue.toLocaleDateString('en-GB')
          const freshYearEndStr = freshYearEnd?.toLocaleDateString('en-GB') || 'Not available'
          const freshAccountsDueStr = freshAccountsDue?.toLocaleDateString('en-GB') || 'Not available'

          console.log('Date comparison:', {
            currentYearEnd: currentYearEndStr,
            currentAccountsDue: currentAccountsDueStr,
            freshYearEnd: freshYearEndStr,
            freshAccountsDue: freshAccountsDueStr
          })

          // Compare dates to check if filing has been processed by Companies House
          const yearEndMatches = freshYearEnd && 
            Math.abs(currentYearEnd.getTime() - freshYearEnd.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
          
          const accountsDueMatches = freshAccountsDue && 
            Math.abs(currentAccountsDue.getTime() - freshAccountsDue.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day

          // Check if dates are moving forward (indicating successful filing)
          const yearEndMovingForward = freshYearEnd && freshYearEnd.getTime() > currentYearEnd.getTime()
          const accountsDueMovingForward = freshAccountsDue && freshAccountsDue.getTime() > currentAccountsDue.getTime()
          const datesMovingForward = yearEndMovingForward && accountsDueMovingForward

          // Check if dates are moving backward (indicating old data or wrong period)
          const yearEndMovingBackward = freshYearEnd && freshYearEnd.getTime() < currentYearEnd.getTime()
          const accountsDueMovingBackward = freshAccountsDue && freshAccountsDue.getTime() < currentAccountsDue.getTime()
          const datesMovingBackward = yearEndMovingBackward || accountsDueMovingBackward

          console.log('Date movement analysis:', {
            yearEndMovingForward,
            accountsDueMovingForward,
            datesMovingForward,
            yearEndMovingBackward,
            accountsDueMovingBackward,
            datesMovingBackward
          })

          // Always show comparison, but determine the action based on date differences
          if (yearEndMatches && accountsDueMatches) {
            // Companies House still shows the same dates - filing might not be processed yet
            companiesHouseWarning = {
              type: 'SAME_DATES',
              message: 'Companies House shows the same dates as your current workflow. This suggests the filing may not have been processed yet, or the accounts are for the same period.',
              canProceed: false, // Don't allow progression with same dates
              currentData: {
                yearEnd: currentYearEndStr,
                accountsDue: currentAccountsDueStr
              },
              companiesHouseData: {
                yearEnd: freshYearEndStr,
                accountsDue: freshAccountsDueStr
              }
            }
          } else if (datesMovingForward) {
            // Companies House shows forward-moving dates - successful filing confirmed!
            companiesHouseWarning = {
              type: 'FORWARD_DATES',
              message: 'Excellent! Companies House shows new forward dates, confirming successful filing and updated deadlines.',
              canProceed: true, // Allow progression with forward dates
              currentData: {
                yearEnd: currentYearEndStr,
                accountsDue: currentAccountsDueStr
              },
              companiesHouseData: {
                yearEnd: freshYearEndStr,
                accountsDue: freshAccountsDueStr
              },
              updateAction: 'UPDATE_COMPANIES_HOUSE_DATA'
            }
          } else if (datesMovingBackward) {
            // Companies House shows backward-moving dates - likely old data or wrong period
            companiesHouseWarning = {
              type: 'BACKWARD_DATES',
              message: 'Warning: Companies House shows older dates than your current workflow. This may indicate old data or a different accounting period.',
              canProceed: false, // Don't allow progression with backward dates
              currentData: {
                yearEnd: currentYearEndStr,
                accountsDue: currentAccountsDueStr
              },
              companiesHouseData: {
                yearEnd: freshYearEndStr,
                accountsDue: freshAccountsDueStr
              }
            }
          } else if (freshYearEnd && freshAccountsDue) {
            // Companies House shows different dates but unclear direction
            companiesHouseWarning = {
              type: 'DIFFERENT_DATES',
              message: 'Companies House shows different dates. Please verify if this represents successful filing.',
              canProceed: true, // Allow progression but with caution
              currentData: {
                yearEnd: currentYearEndStr,
                accountsDue: currentAccountsDueStr
              },
              companiesHouseData: {
                yearEnd: freshYearEndStr,
                accountsDue: freshAccountsDueStr
              },
              updateAction: 'UPDATE_COMPANIES_HOUSE_DATA'
            }
          } else {
            // Missing Companies House data
            companiesHouseWarning = {
              type: 'MISSING_DATA',
              message: 'Some Companies House data is missing. Please verify the filing status manually.',
              canProceed: true, // Allow progression but with warning
              currentData: {
                yearEnd: currentYearEndStr,
                accountsDue: currentAccountsDueStr
              },
              companiesHouseData: {
                yearEnd: freshYearEndStr,
                accountsDue: freshAccountsDueStr
              }
            }
          }
        } else {
          // No Companies House data available
          companiesHouseWarning = {
            type: 'NO_DATA',
            message: 'Unable to fetch Companies House data. Please verify the filing status manually.',
            canProceed: true, // Allow progression but with warning
            currentData: {
              yearEnd: currentYearEnd.toLocaleDateString('en-GB'),
              accountsDue: currentAccountsDue.toLocaleDateString('en-GB')
            },
            companiesHouseData: {
              yearEnd: 'Not available',
              accountsDue: 'Not available'
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Companies House data:', error)
        // Create warning about API failure
        companiesHouseWarning = {
          type: 'API_ERROR',
          message: 'Failed to fetch Companies House data. Please verify the filing status manually.',
          canProceed: true, // Allow progression but with warning
          currentData: {
            yearEnd: new Date(workflow.filingPeriodEnd).toLocaleDateString('en-GB'),
            accountsDue: new Date(workflow.accountsDueDate).toLocaleDateString('en-GB')
          },
          companiesHouseData: {
            yearEnd: 'Error fetching data',
            accountsDue: 'Error fetching data'
          }
        }
      }
    }

    // If there's a warning, always return it for user review
    if (companiesHouseWarning && !ignoreCompaniesHouseWarning) {
      return NextResponse.json({
        success: false,
        requiresConfirmation: true,
        warning: companiesHouseWarning,
        freshData: freshCompaniesHouseData
      })
    }

    // Check if user is trying to proceed when they shouldn't be able to
    if (companiesHouseWarning && companiesHouseWarning.canProceed === false && !ignoreCompaniesHouseWarning) {
      return NextResponse.json({
        success: false,
        error: 'Cannot proceed: Companies House shows the same dates. Please ensure the filing has been processed before marking as complete.',
        warning: companiesHouseWarning
      }, { status: 400 })
    }

    // If user confirmed filing, proceed with the update
    if (confirmFiling) {
      // Update workflow to FILED_TO_COMPANIES_HOUSE stage
      const updatedWorkflow = await db.ltdAccountsWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStage: 'FILED_TO_COMPANIES_HOUSE',
          filedToCompaniesHouseDate: new Date(),
          filedToCompaniesHouseByUserId: session.user.id,
          filedToCompaniesHouseByUserName: session.user.name || 'Unknown User',
          updatedAt: new Date()
        }
      })

      // Create workflow history entry
      await db.ltdAccountsWorkflowHistory.create({
        data: {
          ltdAccountsWorkflowId: workflowId,
          fromStage: 'SUBMISSION_APPROVED_PARTNER',
          toStage: 'FILED_TO_COMPANIES_HOUSE',
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || 'Unknown User',
          userEmail: session.user.email || '',
          userRole: session.user.role || 'USER',
          notes: companiesHouseWarning 
            ? `Filed to Companies House. ${companiesHouseWarning.type === 'FILING_NOT_REFLECTED' ? 'Proceeded despite CH data not reflecting filing.' : 'Proceeded with filing.'}`
            : 'Filed to Companies House successfully.'
        }
      })

      return NextResponse.json({
        success: true,
        workflow: updatedWorkflow,
        message: 'Workflow updated to Filed to Companies House successfully'
      })
    }

    // If no confirmation provided, return error
    return NextResponse.json({ 
      error: 'Filing confirmation required' 
    }, { status: 400 })

  } catch (error) {
    console.error('Error updating workflow to Filed to Companies House:', error)
    
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