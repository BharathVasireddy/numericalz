import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateVATQuarter, getNextVATQuarter } from '@/lib/vat-workflow'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * GET /api/clients/vat-clients
 * 
 * Get all clients with VAT enabled for the VAT deadline tracker
 * Includes current VAT quarter workflow information and VAT-specific assignee
 * Automatically creates current quarter if it doesn't exist
 * Fixed: Properly handles completed quarters and creates next quarters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build where clause based on user role
    let whereClause: any = {
      isVatEnabled: true,
      isActive: true
    }

    // Staff can only see their assigned clients (check both general and VAT-specific assignment)
    if (session.user.role === 'STAFF') {
      whereClause.OR = [
        { assignedUserId: session.user.id },
        { vatAssignedUserId: session.user.id }
      ]
    }

    // Fetch VAT-enabled clients with ALL recent quarter workflow info
    const vatClients = await db.client.findMany({
      where: whereClause,
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyType: true,
        contactEmail: true,
        contactPhone: true,
        vatReturnsFrequency: true,
        vatQuarterGroup: true,
        nextVatReturnDue: true,
        isVatEnabled: true,
        createdAt: true,
        
        // ENHANCED ASSIGNMENT - Include VAT-specific assignee
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
        },
        vatAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
        },
        
        // Include recent VAT quarters (both completed and incomplete)
        vatQuartersWorkflow: {
          select: {
            id: true,
            quarterPeriod: true,
            quarterStartDate: true,
            quarterEndDate: true,
            filingDueDate: true,
            currentStage: true,
            isCompleted: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            // Include milestone dates
            chaseStartedDate: true,
            chaseStartedByUserName: true,
            paperworkReceivedDate: true,
            paperworkReceivedByUserName: true,
            workStartedDate: true,
            workStartedByUserName: true,
            workFinishedDate: true,
            workFinishedByUserName: true,
            sentToClientDate: true,
            sentToClientByUserName: true,
            clientApprovedDate: true,
            clientApprovedByUserName: true,
            filedToHMRCDate: true,
            filedToHMRCByUserName: true
          },
          orderBy: {
            quarterEndDate: 'desc'
          },
          take: 3 // Get the 3 most recent quarters to handle transitions
        }
      },
      orderBy: [
        { nextVatReturnDue: 'asc' },
        { companyName: 'asc' }
      ]
    })

    // Process each client to ensure current quarter exists
    const processedClients = await Promise.all(vatClients.map(async (client) => {
      // Skip if client doesn't have a quarter group
      if (!client.vatQuarterGroup) {
        return {
      id: client.id,
      clientCode: client.clientCode,
      companyName: client.companyName,
      companyType: client.companyType,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      vatReturnsFrequency: client.vatReturnsFrequency,
      vatQuarterGroup: client.vatQuarterGroup,
      nextVatReturnDue: client.nextVatReturnDue,
      isVatEnabled: client.isVatEnabled,
      createdAt: client.createdAt.toISOString(),
          assignedUser: client.assignedUser,
          vatAssignedUser: client.vatAssignedUser,
          currentVATQuarter: undefined
        }
      }

      // Calculate what the current quarter should be based on today's date
      const currentDate = new Date()
      const currentQuarterInfo = calculateVATQuarter(client.vatQuarterGroup, currentDate)

      // Find the incomplete quarter that matches current period
      let currentQuarter = client.vatQuartersWorkflow?.find(q => 
        q.quarterPeriod === currentQuarterInfo.quarterPeriod && !q.isCompleted
      )

      // If no current incomplete quarter exists, check if we need to create it
      if (!currentQuarter) {
        // Check if current quarter already exists (maybe completed)
        const existingQuarter = client.vatQuartersWorkflow?.find(q => 
          q.quarterPeriod === currentQuarterInfo.quarterPeriod
        )

        if (!existingQuarter) {
          // Create current quarter if it doesn't exist at all
          try {
            const quarter = await db.vATQuarter.create({
              data: {
                clientId: client.id,
                quarterPeriod: currentQuarterInfo.quarterPeriod,
                quarterStartDate: currentQuarterInfo.quarterStartDate,
                quarterEndDate: currentQuarterInfo.quarterEndDate,
                filingDueDate: currentQuarterInfo.filingDueDate,
                quarterGroup: currentQuarterInfo.quarterGroup,
                assignedUserId: client.vatAssignedUser?.id || client.assignedUser?.id || null,
                currentStage: 'CLIENT_BOOKKEEPING',
                isCompleted: false
              },
              include: {
                assignedUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                  }
                }
              }
            })
            
            // Create initial workflow history entry
            await db.vATWorkflowHistory.create({
              data: {
                vatQuarterId: quarter.id,
                toStage: 'CLIENT_BOOKKEEPING',
                stageChangedAt: new Date(),
                userId: session.user.id,
                userName: session.user.name || session.user.email || 'System',
                userEmail: session.user.email || '',
                userRole: session.user.role || 'SYSTEM',
                notes: 'VAT quarter automatically created for current period',
              }
            })
            
            currentQuarter = {
              id: quarter.id,
              quarterPeriod: quarter.quarterPeriod,
              quarterStartDate: quarter.quarterStartDate,
              quarterEndDate: quarter.quarterEndDate,
              filingDueDate: quarter.filingDueDate,
              currentStage: quarter.currentStage,
              isCompleted: quarter.isCompleted,
              assignedUser: quarter.assignedUser,
              // Include milestone dates
              chaseStartedDate: quarter.chaseStartedDate,
              chaseStartedByUserName: quarter.chaseStartedByUserName,
              paperworkReceivedDate: quarter.paperworkReceivedDate,
              paperworkReceivedByUserName: quarter.paperworkReceivedByUserName,
              workStartedDate: quarter.workStartedDate,
              workStartedByUserName: quarter.workStartedByUserName,
              workFinishedDate: quarter.workFinishedDate,
              workFinishedByUserName: quarter.workFinishedByUserName,
              sentToClientDate: quarter.sentToClientDate,
              sentToClientByUserName: quarter.sentToClientByUserName,
              clientApprovedDate: quarter.clientApprovedDate,
              clientApprovedByUserName: quarter.clientApprovedByUserName,
              filedToHMRCDate: quarter.filedToHMRCDate,
              filedToHMRCByUserName: quarter.filedToHMRCByUserName
            }
            
            console.log(`Created new VAT quarter for client ${client.clientCode}: ${currentQuarterInfo.quarterPeriod}`)
          } catch (error) {
            console.error(`Failed to create quarter for client ${client.id}:`, error)
          }
        } else if (existingQuarter.isCompleted) {
          // The current quarter is completed, need to check if next quarter exists
          const nextQuarterInfo = getNextVATQuarter(client.vatQuarterGroup, existingQuarter.quarterEndDate)
          
          // Check if the next quarter is actually the "current" quarter now
          if (nextQuarterInfo.quarterPeriod === currentQuarterInfo.quarterPeriod) {
            // The "next" quarter is actually what should be current now
            currentQuarter = client.vatQuartersWorkflow?.find(q => 
              q.quarterPeriod === nextQuarterInfo.quarterPeriod && !q.isCompleted
            )
            
            if (!currentQuarter) {
              // Create the next quarter
              try {
                const quarter = await db.vATQuarter.create({
                  data: {
                    clientId: client.id,
                    quarterPeriod: nextQuarterInfo.quarterPeriod,
                    quarterStartDate: nextQuarterInfo.quarterStartDate,
                    quarterEndDate: nextQuarterInfo.quarterEndDate,
                    filingDueDate: nextQuarterInfo.filingDueDate,
                    quarterGroup: nextQuarterInfo.quarterGroup,
                    assignedUserId: client.vatAssignedUser?.id || client.assignedUser?.id || null,
                    currentStage: 'CLIENT_BOOKKEEPING',
                    isCompleted: false
                  },
                  include: {
                    assignedUser: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                      }
                    }
                  }
                })
                
                // Create initial workflow history entry
                await db.vATWorkflowHistory.create({
                  data: {
                    vatQuarterId: quarter.id,
                    toStage: 'CLIENT_BOOKKEEPING',
                    stageChangedAt: new Date(),
                    userId: session.user.id,
                    userName: session.user.name || session.user.email || 'System',
                    userEmail: session.user.email || '',
                    userRole: session.user.role || 'SYSTEM',
                    notes: 'VAT quarter automatically created - previous quarter completed',
                  }
                })
                
                currentQuarter = {
                  id: quarter.id,
                  quarterPeriod: quarter.quarterPeriod,
                  quarterStartDate: quarter.quarterStartDate,
                  quarterEndDate: quarter.quarterEndDate,
                  filingDueDate: quarter.filingDueDate,
                  currentStage: quarter.currentStage,
                  isCompleted: quarter.isCompleted,
                  assignedUser: quarter.assignedUser,
                  // Include milestone dates (all null for new quarter)
                  chaseStartedDate: null,
                  chaseStartedByUserName: null,
                  paperworkReceivedDate: null,
                  paperworkReceivedByUserName: null,
                  workStartedDate: null,
                  workStartedByUserName: null,
                  workFinishedDate: null,
                  workFinishedByUserName: null,
                  sentToClientDate: null,
                  sentToClientByUserName: null,
                  clientApprovedDate: null,
                  clientApprovedByUserName: null,
                  filedToHMRCDate: null,
                  filedToHMRCByUserName: null
                }
                
                console.log(`Created next VAT quarter for client ${client.clientCode}: ${nextQuarterInfo.quarterPeriod} (previous quarter completed)`)
              } catch (error) {
                console.error(`Failed to create next quarter for client ${client.id}:`, error)
              }
            }
          }
        }
      }

      // Return client with the current quarter
      return {
        id: client.id,
        clientCode: client.clientCode,
        companyName: client.companyName,
        companyType: client.companyType,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        vatReturnsFrequency: client.vatReturnsFrequency,
        vatQuarterGroup: client.vatQuarterGroup,
        nextVatReturnDue: client.nextVatReturnDue,
        isVatEnabled: client.isVatEnabled,
        createdAt: client.createdAt.toISOString(),
        assignedUser: client.assignedUser,
        vatAssignedUser: client.vatAssignedUser,
        currentVATQuarter: currentQuarter ? {
          id: currentQuarter.id,
          quarterPeriod: currentQuarter.quarterPeriod,
          quarterStartDate: currentQuarter.quarterStartDate.toISOString(),
          quarterEndDate: currentQuarter.quarterEndDate.toISOString(),
          filingDueDate: currentQuarter.filingDueDate.toISOString(),
          currentStage: currentQuarter.currentStage,
          isCompleted: currentQuarter.isCompleted,
          assignedUser: currentQuarter.assignedUser,
          // Include milestone dates
          chaseStartedDate: currentQuarter.chaseStartedDate?.toISOString(),
          chaseStartedByUserName: currentQuarter.chaseStartedByUserName,
          paperworkReceivedDate: currentQuarter.paperworkReceivedDate?.toISOString(),
          paperworkReceivedByUserName: currentQuarter.paperworkReceivedByUserName,
          workStartedDate: currentQuarter.workStartedDate?.toISOString(),
          workStartedByUserName: currentQuarter.workStartedByUserName,
          workFinishedDate: currentQuarter.workFinishedDate?.toISOString(),
          workFinishedByUserName: currentQuarter.workFinishedByUserName,
          sentToClientDate: currentQuarter.sentToClientDate?.toISOString(),
          sentToClientByUserName: currentQuarter.sentToClientByUserName,
          clientApprovedDate: currentQuarter.clientApprovedDate?.toISOString(),
          clientApprovedByUserName: currentQuarter.clientApprovedByUserName,
          filedToHMRCDate: currentQuarter.filedToHMRCDate?.toISOString(),
          filedToHMRCByUserName: currentQuarter.filedToHMRCByUserName
        } : undefined
      }
    }))

    return NextResponse.json({
      success: true,
      clients: processedClients
    })

  } catch (error) {
    console.error('Error fetching VAT clients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 