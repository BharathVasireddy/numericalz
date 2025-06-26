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

    // Validate current stage
    if (workflow.currentStage !== 'SUBMISSION_APPROVED_PARTNER') {
      return NextResponse.json({ 
        error: 'Invalid workflow stage for Companies House filing' 
      }, { status: 400 })
    }

    let companiesHouseWarning = null
    let freshCompaniesHouseData = null

    // Fetch fresh Companies House data if company number exists
    if (workflow.client.companyNumber && !ignoreCompaniesHouseWarning) {
      try {
        console.log(`Fetching fresh Companies House data for ${workflow.client.companyNumber}`)
        freshCompaniesHouseData = await getCompanyDetails(workflow.client.companyNumber)
        
        if (freshCompaniesHouseData) {
          const currentYearEnd = workflow.filingPeriodEnd
          const currentAccountsDue = workflow.accountsDueDate
          const freshYearEnd = freshCompaniesHouseData.accounts?.next_made_up_to 
            ? new Date(freshCompaniesHouseData.accounts.next_made_up_to)
            : null
          const freshAccountsDue = freshCompaniesHouseData.accounts?.next_due
            ? new Date(freshCompaniesHouseData.accounts.next_due)
            : null

          // Compare dates to check if filing has been processed by Companies House
          const yearEndMatches = freshYearEnd && 
            Math.abs(currentYearEnd.getTime() - freshYearEnd.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
          
          const accountsDueMatches = freshAccountsDue && 
            Math.abs(currentAccountsDue.getTime() - freshAccountsDue.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day

          if (yearEndMatches && accountsDueMatches) {
            // Companies House still shows the same dates - filing might not be processed yet
            companiesHouseWarning = {
              type: 'FILING_NOT_REFLECTED',
              message: 'Companies House data still shows the filing is not done. Do you still want to proceed?',
              currentYearEnd: currentYearEnd.toLocaleDateString('en-GB'),
              currentAccountsDue: currentAccountsDue.toLocaleDateString('en-GB'),
              companiesHouseYearEnd: freshYearEnd?.toLocaleDateString('en-GB'),
              companiesHouseAccountsDue: freshAccountsDue?.toLocaleDateString('en-GB')
            }
          } else if (freshYearEnd && freshAccountsDue && (!yearEndMatches || !accountsDueMatches)) {
            // Companies House shows different dates - new data available
            companiesHouseWarning = {
              type: 'NEW_DATA_AVAILABLE',
              message: 'New year end and accounts due date available from Companies House. Would you like to update?',
              currentYearEnd: currentYearEnd.toLocaleDateString('en-GB'),
              currentAccountsDue: currentAccountsDue.toLocaleDateString('en-GB'),
              newYearEnd: freshYearEnd.toLocaleDateString('en-GB'),
              newAccountsDue: freshAccountsDue.toLocaleDateString('en-GB'),
              updateAction: 'UPDATE_COMPANIES_HOUSE_DATA'
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Companies House data:', error)
        // Continue without warning if CH API fails
      }
    }

    // If there's a warning and user hasn't confirmed to ignore it, return the warning
    if (companiesHouseWarning && !ignoreCompaniesHouseWarning) {
      return NextResponse.json({
        success: false,
        requiresConfirmation: true,
        warning: companiesHouseWarning,
        freshData: freshCompaniesHouseData
      })
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