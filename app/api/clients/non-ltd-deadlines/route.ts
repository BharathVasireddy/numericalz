import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50') // Optimized limit
    const skip = (page - 1) * limit
    
    // Get filters (matching Ltd companies structure)
    const assignedFilter = searchParams.get('assignedFilter') // 'assigned_to_me', 'all'
    const userFilter = searchParams.get('userFilter') || 'all' // specific user ID or 'all'
    const workflowStageFilter = searchParams.get('workflowStageFilter') || 'all'
    const searchTerm = searchParams.get('searchTerm') || ''
    const sortField = searchParams.get('sortField') || 'filingDue'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // PERFORMANCE OPTIMIZATION: Role-based filtering to reduce data set
    const whereClause: any = {
      companyType: 'NON_LIMITED_COMPANY',
      isActive: true,
    }

    // Apply assigned filter for ALL user roles when "assigned_to_me" is selected
    if (assignedFilter === 'assigned_to_me') {
      whereClause.OR = [
        { nonLtdCompanyAssignedUserId: session.user.id }, // Non-Ltd specific assignment
        { 
          nonLtdAccountsWorkflows: {
            some: {
              assignedUserId: session.user.id, // Workflow-level assignment
              isCompleted: false // Only active workflows
            }
          }
        }
      ]
      
      // DEBUG: Log the filter being applied
      console.log('🔍 Non-Ltd "assigned_to_me" filter applied for user:', session.user.id)
      console.log('🔍 Filter conditions:', JSON.stringify(whereClause.OR, null, 2))
    }

    // Apply search term
    if (searchTerm) {
      whereClause.OR = [
        { clientCode: { contains: searchTerm, mode: 'insensitive' } },
        { companyName: { contains: searchTerm, mode: 'insensitive' } },
        { contactName: { contains: searchTerm, mode: 'insensitive' } },
        { contactEmail: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // PERFORMANCE: Get total count first (efficient count query)
    const totalCount = await db.client.count({
      where: whereClause
    })

    // PERFORMANCE OPTIMIZATION: More efficient query with minimal includes
    const clients = await db.client.findMany({
      where: whereClause,
      select: {
        // Client basic info
        id: true,
        clientCode: true,
        companyName: true,
        companyType: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        
        // Non-Ltd specific assignment
        nonLtdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        
        // General assignment fallback
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        
        // OPTIMIZED: Only get the most recent active workflow with minimal fields
        nonLtdAccountsWorkflows: {
          where: {
            OR: [
              { isCompleted: false }, // Active workflows first
              { 
                isCompleted: true,
                filedToHMRCDate: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Recently completed (last 30 days)
                }
              }
            ]
          },
          orderBy: [
            { isCompleted: 'asc' }, // Active workflows first
            { yearEndDate: 'desc' } // Then most recent
          ],
          take: 1, // Only get the most relevant workflow
          select: {
            id: true,
            yearEndDate: true,
            filingDueDate: true,
            currentStage: true,
            isCompleted: true,
            
            // Assignment info
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            
            // Milestone dates with user attribution (optimized selection)
            chaseStartedDate: true,
            chaseStartedByUserName: true,
            paperworkReceivedDate: true,
            paperworkReceivedByUserName: true,
            workStartedDate: true,
            workStartedByUserName: true,
            managerDiscussionDate: true,
            managerDiscussionByUserName: true,
            partnerReviewDate: true,
            partnerReviewByUserName: true,
            reviewCompletedDate: true,
            reviewCompletedByUserName: true,
            sentToClientDate: true,
            sentToClientByUserName: true,
            clientApprovedDate: true,
            clientApprovedByUserName: true,
            partnerApprovedDate: true,
            partnerApprovedByUserName: true,

            filedToHMRCDate: true,
            filedToHMRCByUserName: true,
          }
        }
      },
      skip,
      take: limit,
      orderBy: getSortOrder(sortField, sortOrder),
    })

    // Process clients and auto-create workflows if needed
    const processedClients = await Promise.all(
      clients.map(async (client) => {
        let currentWorkflow = client.nonLtdAccountsWorkflows[0] || null

        // Auto-create workflow if none exists
        if (!currentWorkflow) {
          const currentYear = new Date().getFullYear()
          const yearEndDate = new Date(currentYear, 3, 5) // April 5th
          const filingDueDate = new Date(currentYear + 1, 0, 5) // January 5th next year
          
          currentWorkflow = await db.nonLtdAccountsWorkflow.create({
            data: {
              clientId: client.id,
              yearEndDate: yearEndDate,
              filingDueDate: filingDueDate,
              currentStage: 'WAITING_FOR_YEAR_END',
              isCompleted: false,
            },
            select: {
              id: true,
              yearEndDate: true,
              filingDueDate: true,
              currentStage: true,
              isCompleted: true,
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              },
              chaseStartedDate: true,
              chaseStartedByUserName: true,
              paperworkReceivedDate: true,
              paperworkReceivedByUserName: true,
              workStartedDate: true,
              workStartedByUserName: true,
              managerDiscussionDate: true,
              managerDiscussionByUserName: true,
              partnerReviewDate: true,
              partnerReviewByUserName: true,
              reviewCompletedDate: true,
              reviewCompletedByUserName: true,
              sentToClientDate: true,
              sentToClientByUserName: true,
              clientApprovedDate: true,
              clientApprovedByUserName: true,
              partnerApprovedDate: true,
              partnerApprovedByUserName: true,

              filedToHMRCDate: true,
              filedToHMRCByUserName: true,
            }
          })
        }

        // Apply workflow stage filter
        if (workflowStageFilter !== 'all') {
          if (workflowStageFilter === 'not_started' && currentWorkflow?.currentStage !== 'WAITING_FOR_YEAR_END') {
            return null
          }
          if (workflowStageFilter === 'completed' && !currentWorkflow?.isCompleted) {
            return null
          }
          if (workflowStageFilter !== 'not_started' && workflowStageFilter !== 'completed' && 
              currentWorkflow?.currentStage !== workflowStageFilter) {
            return null
          }
        }

        return {
          ...client,
          currentNonLtdAccountsWorkflow: currentWorkflow
        }
      })
    )

    // Filter out nulls from workflow stage filtering
    const filteredClients = processedClients.filter(client => client !== null)

    return NextResponse.json({
      success: true,
      clients: filteredClients,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        pageSize: limit
      }
    })

  } catch (error) {
    console.error('Error fetching non-Ltd companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch non-Ltd companies' },
      { status: 500 }
    )
  }
}

// Helper function to get sort order
function getSortOrder(sortField: string, sortOrder: string) {
  const order = (sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc'
  
  switch (sortField) {
    case 'clientCode':
      return { clientCode: order }
    case 'companyName':
      return { companyName: order }
    case 'filingDue':
      // For related fields, we'll sort by the main field and handle complex sorting in the client
      return { companyName: order }
    case 'yearEnd':
      return { companyName: order }
    case 'workflowStage':
      return { companyName: order }
    default:
      return { companyName: 'asc' as const }
  }
} 