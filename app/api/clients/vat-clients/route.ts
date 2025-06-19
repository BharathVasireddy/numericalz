import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * GET /api/clients/vat-clients
 * 
 * Get all clients with VAT enabled for the VAT deadline tracker
 * Includes current VAT quarter workflow information
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

    // Staff can only see their assigned clients
    if (session.user.role === 'STAFF') {
      whereClause.assignedUserId = session.user.id
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
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
                email: true
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

    // Transform the data to include current VAT quarter info
    const transformedClients = vatClients.map(client => ({
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
      // Include current VAT quarter workflow if exists (safely check for undefined)
      currentVATQuarter: client.vatQuartersWorkflow && client.vatQuartersWorkflow.length > 0 && client.vatQuartersWorkflow[0] ? {
        id: client.vatQuartersWorkflow[0].id,
        quarterPeriod: client.vatQuartersWorkflow[0].quarterPeriod,
        quarterStartDate: client.vatQuartersWorkflow[0].quarterStartDate.toISOString(),
        quarterEndDate: client.vatQuartersWorkflow[0].quarterEndDate.toISOString(),
        filingDueDate: client.vatQuartersWorkflow[0].filingDueDate.toISOString(),
        currentStage: client.vatQuartersWorkflow[0].currentStage,
        isCompleted: client.vatQuartersWorkflow[0].isCompleted,
        assignedUser: client.vatQuartersWorkflow[0].assignedUser,
        // Include milestone dates
        chaseStartedDate: client.vatQuartersWorkflow[0].chaseStartedDate?.toISOString(),
        chaseStartedByUserName: client.vatQuartersWorkflow[0].chaseStartedByUserName,
        paperworkReceivedDate: client.vatQuartersWorkflow[0].paperworkReceivedDate?.toISOString(),
        paperworkReceivedByUserName: client.vatQuartersWorkflow[0].paperworkReceivedByUserName,
        workStartedDate: client.vatQuartersWorkflow[0].workStartedDate?.toISOString(),
        workStartedByUserName: client.vatQuartersWorkflow[0].workStartedByUserName,
        workFinishedDate: client.vatQuartersWorkflow[0].workFinishedDate?.toISOString(),
        workFinishedByUserName: client.vatQuartersWorkflow[0].workFinishedByUserName,
        sentToClientDate: client.vatQuartersWorkflow[0].sentToClientDate?.toISOString(),
        sentToClientByUserName: client.vatQuartersWorkflow[0].sentToClientByUserName,
        clientApprovedDate: client.vatQuartersWorkflow[0].clientApprovedDate?.toISOString(),
        clientApprovedByUserName: client.vatQuartersWorkflow[0].clientApprovedByUserName,
        filedToHMRCDate: client.vatQuartersWorkflow[0].filedToHMRCDate?.toISOString(),
        filedToHMRCByUserName: client.vatQuartersWorkflow[0].filedToHMRCByUserName
      } : undefined
    }))

    // Return real-time data with no caching
    const response = NextResponse.json({
      success: true,
      clients: transformedClients,
      count: transformedClients.length
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