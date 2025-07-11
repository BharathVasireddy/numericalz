/**
 * VAT Clients API Route
 * 
 * This API endpoint retrieves all VAT-enabled clients with their quarter-level assignments.
 * 
 * CRITICAL SYSTEM ARCHITECTURE NOTES:
 * 
 * 1. VAT ASSIGNMENT SYSTEM (Post-Cleanup):
 *    - Uses QUARTER-LEVEL ASSIGNMENTS ONLY via VATQuarter.assignedUserId
 *    - NO client-level VAT assignments (Client.vatAssignedUserId REMOVED)
 *    - Each VAT quarter is independently assigned to users
 *    - No fallback assignment logic or priority hierarchies
 * 
 * 2. QUARTER INDEPENDENCE:
 *    - Each quarter (Q1, Q2, Q3, Q4) can have different assignees
 *    - Quarters start unassigned (assignedUserId = null)
 *    - Assignment happens during filing months via workflow management
 * 
 * 3. BUSINESS LOGIC:
 *    - Returns all VAT quarters (completed + incomplete) for month-specific workflows
 *    - Includes comprehensive milestone tracking data
 *    - Supports month-specific quarter filtering in frontend
 * 
 * 4. REMOVED FEATURES (Do NOT re-add):
 *    - Client.vatAssignedUserId field (cleaned up)
 *    - Client.vatAssignedUser relation (cleaned up)  
 *    - Complex 3-tier assignment priority system (simplified)
 *    - Client-level VAT assignment fallback logic (removed)
 * 
 * 5. FRONTEND INTEGRATION:
 *    - Used by VAT deadlines table (/dashboard/clients/vat-dt)
 *    - Supports month-specific quarter display and workflows
 *    - Enables independent quarter assignment management
 * 
 * @route GET /api/clients/vat-clients
 * @returns Array of VAT clients with quarter-level assignment data
 * @version 2.0 (Post-VAT-Cleanup)
 * @lastModified July 2025
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateVATQuarter, getNextVATQuarter } from '@/lib/vat-workflow'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authentication check - all VAT data requires authenticated access
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const monthFilter = searchParams.get('month')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25') // Reduced default for better performance
    const skip = (page - 1) * limit
    
    // PERFORMANCE OPTIMIZATION: Server-side filtering parameters
    const assignedUserId = searchParams.get('assignedUserId')
    const workflowStage = searchParams.get('workflowStage')
    
    // Build where clause for VAT-enabled clients only
    const whereClause: any = {
      isVatEnabled: true,
      isActive: true
    }

    // PERFORMANCE: Add server-side user assignment filtering
    if (assignedUserId) {
      whereClause.vatQuartersWorkflow = {
        some: {
          assignedUserId: assignedUserId
        }
      }
    }

    // PERFORMANCE: Add server-side workflow stage filtering (at client level)
    if (workflowStage) {
      let stageFilter: any = {}
      
      // Handle special filter cases
      if (workflowStage === 'completed') {
        stageFilter = { isCompleted: true }
      } else if (workflowStage === 'not_started') {
        stageFilter = { currentStage: 'PAPERWORK_PENDING_CHASE' }
      } else {
        // Regular workflow stage
        stageFilter = { currentStage: workflowStage as any }
      }
      
      // If user assignment filter is already applied, combine with stage filter
      if (whereClause.vatQuartersWorkflow?.some) {
        whereClause.vatQuartersWorkflow.some = {
          ...whereClause.vatQuartersWorkflow.some,
          ...stageFilter
        }
      } else {
        // Otherwise, create new filter for clients with at least one quarter in this stage
        whereClause.vatQuartersWorkflow = {
          some: stageFilter
        }
      }
    }

    // PERFORMANCE: Get total count and clients with optimized filtering
    const [vatClients, totalCount] = await Promise.all([
      // Fetch VAT clients with OPTIMIZED query structure and server-side filtering
      db.client.findMany({
        where: whereClause,
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          companyType: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          vatReturnsFrequency: true,
          vatQuarterGroup: true,
          nextVatReturnDue: true,
          isVatEnabled: true,
          createdAt: true,
          
          // OPTIMIZED: Get ALL VAT quarters (filtering is done at client level above)
          vatQuartersWorkflow: {
            select: {
              id: true,
              quarterPeriod: true,
              quarterStartDate: true,
              quarterEndDate: true,
              filingDueDate: true,
              currentStage: true,
              isCompleted: true,
              
              // QUARTER-LEVEL ASSIGNMENT: Minimal user data for performance
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              },
              
              // OPTIMIZED: Only essential milestone data
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
            take: 3 // Limit quarters per client for performance
          }
        },
        orderBy: [
          { nextVatReturnDue: 'asc' },
          { companyName: 'asc' }
        ],
        skip,
        take: limit
      }),
      
      // Count query with same filtering
      db.client.count({ where: whereClause })
    ])

    // PERFORMANCE OPTIMIZATION: Lightweight data transformation for remaining clients
    const processedClients = vatClients.map(client => {
      // If no quarters exist, create current quarter on-demand
      if (!client.vatQuartersWorkflow || client.vatQuartersWorkflow.length === 0) {
        if (!assignedUserId && client.vatQuarterGroup) {
          const currentQuarter = calculateVATQuarter(client.vatQuarterGroup)
          if (currentQuarter) {
            // Only create quarter if it matches the stage filter (or no stage filter)
            const quarterStage = 'PAPERWORK_PENDING_CHASE' as const
            
            // Check if this quarter matches the filter
            let shouldCreateQuarter = true
            if (workflowStage) {
              if (workflowStage === 'completed') {
                // Don't create new quarters when filtering by completed (new quarters are never completed)
                shouldCreateQuarter = false
              } else if (workflowStage === 'not_started') {
                // Create new quarters when filtering by not_started (new quarters start as PAPERWORK_PENDING_CHASE)
                shouldCreateQuarter = true
              } else {
                // For specific stages, only create if it matches
                shouldCreateQuarter = workflowStage === quarterStage
              }
            }
            
            if (shouldCreateQuarter) {
              return {
                ...client,
                vatQuartersWorkflow: [{
                  id: 'pending',
                  quarterPeriod: currentQuarter.quarterPeriod,
                  quarterStartDate: currentQuarter.quarterStartDate,
                  quarterEndDate: currentQuarter.quarterEndDate,
                  filingDueDate: currentQuarter.filingDueDate,
                  currentStage: quarterStage,
                  isCompleted: false,
                  assignedUser: null,
                // Initialize milestone fields
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
              }]
            }
          }
        }
      }
      }
      return client
    })

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)

    // PERFORMANCE: Log API performance for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 VAT Clients API: Fetched ${processedClients.length}/${totalCount} clients (page ${page}/${totalPages}) with server-side filtering`)
    }

    const response = NextResponse.json({
      success: true,
      clients: processedClients,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })

    // PERFORMANCE: Smart caching with stale-while-revalidate
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=15')
    
    return response

  } catch (error) {
    console.error('VAT clients API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch VAT clients'
    }, { status: 500 })
  }
} 