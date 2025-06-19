import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateVATQuarter } from '@/lib/vat-workflow'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * GET /api/clients/vat-clients
 * 
 * Get all clients with VAT enabled for the VAT deadline tracker
 * Includes current VAT quarter workflow information and VAT-specific assignee
 * Automatically creates current quarter if it doesn't exist
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

    // Fetch VAT-enabled clients with current quarter workflow info
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
        
        // Include current VAT quarter workflow
        vatQuartersWorkflow: {
          where: {
            isCompleted: false
          },
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
          take: 1 // Get the most recent incomplete quarter
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

      // Check if we have an existing quarter that matches the current period
      const existingQuarter = client.vatQuartersWorkflow?.[0]
      const hasCurrentQuarter = existingQuarter && 
        existingQuarter.quarterPeriod === currentQuarterInfo.quarterPeriod

      if (!hasCurrentQuarter) {
        // Check if current quarter already exists
        try {
          let quarter = await db.vATQuarter.findUnique({
            where: {
              clientId_quarterPeriod: {
                clientId: client.id,
                quarterPeriod: currentQuarterInfo.quarterPeriod
              }
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

          if (!quarter) {
            // Create current quarter if it doesn't exist
            quarter = await db.vATQuarter.create({
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
            
            console.log(`Created new VAT quarter for client ${client.clientCode}: ${currentQuarterInfo.quarterPeriod}`)
          } else {
            console.log(`VAT quarter already exists for client ${client.clientCode}: ${currentQuarterInfo.quarterPeriod}`)
          }

          // Return client with the quarter
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
            currentVATQuarter: {
              id: quarter.id,
              quarterPeriod: quarter.quarterPeriod,
              quarterStartDate: quarter.quarterStartDate.toISOString(),
              quarterEndDate: quarter.quarterEndDate.toISOString(),
              filingDueDate: quarter.filingDueDate.toISOString(),
              currentStage: quarter.currentStage,
              isCompleted: quarter.isCompleted,
              assignedUser: quarter.assignedUser,
              // Include milestone dates
              chaseStartedDate: quarter.chaseStartedDate?.toISOString(),
              chaseStartedByUserName: quarter.chaseStartedByUserName,
              paperworkReceivedDate: quarter.paperworkReceivedDate?.toISOString(),
              paperworkReceivedByUserName: quarter.paperworkReceivedByUserName,
              workStartedDate: quarter.workStartedDate?.toISOString(),
              workStartedByUserName: quarter.workStartedByUserName,
              workFinishedDate: quarter.workFinishedDate?.toISOString(),
              workFinishedByUserName: quarter.workFinishedByUserName,
              sentToClientDate: quarter.sentToClientDate?.toISOString(),
              sentToClientByUserName: quarter.sentToClientByUserName,
              clientApprovedDate: quarter.clientApprovedDate?.toISOString(),
              clientApprovedByUserName: quarter.clientApprovedByUserName,
              filedToHMRCDate: quarter.filedToHMRCDate?.toISOString(),
              filedToHMRCByUserName: quarter.filedToHMRCByUserName
            }
          }
        } catch (error) {
          console.error(`Failed to create quarter for client ${client.id}:`, error)
          // Return client without quarter on error
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
      }

      // Return client with existing quarter
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
        currentVATQuarter: existingQuarter ? {
          id: existingQuarter.id,
          quarterPeriod: existingQuarter.quarterPeriod,
          quarterStartDate: existingQuarter.quarterStartDate.toISOString(),
          quarterEndDate: existingQuarter.quarterEndDate.toISOString(),
          filingDueDate: existingQuarter.filingDueDate.toISOString(),
          currentStage: existingQuarter.currentStage,
          isCompleted: existingQuarter.isCompleted,
          assignedUser: existingQuarter.assignedUser,
          // Include milestone dates
          chaseStartedDate: existingQuarter.chaseStartedDate?.toISOString(),
          chaseStartedByUserName: existingQuarter.chaseStartedByUserName,
          paperworkReceivedDate: existingQuarter.paperworkReceivedDate?.toISOString(),
          paperworkReceivedByUserName: existingQuarter.paperworkReceivedByUserName,
          workStartedDate: existingQuarter.workStartedDate?.toISOString(),
          workStartedByUserName: existingQuarter.workStartedByUserName,
          workFinishedDate: existingQuarter.workFinishedDate?.toISOString(),
          workFinishedByUserName: existingQuarter.workFinishedByUserName,
          sentToClientDate: existingQuarter.sentToClientDate?.toISOString(),
          sentToClientByUserName: existingQuarter.sentToClientByUserName,
          clientApprovedDate: existingQuarter.clientApprovedDate?.toISOString(),
          clientApprovedByUserName: existingQuarter.clientApprovedByUserName,
          filedToHMRCDate: existingQuarter.filedToHMRCDate?.toISOString(),
          filedToHMRCByUserName: existingQuarter.filedToHMRCByUserName
        } : undefined
      }
    }))

    // Return real-time data with no caching
    const response = NextResponse.json({
      success: true,
      clients: processedClients,
      count: processedClients.length
    })

    // Disable all caching for real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error('Error fetching VAT clients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 