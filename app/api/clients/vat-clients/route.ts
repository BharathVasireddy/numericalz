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
    const limit = parseInt(searchParams.get('limit') || '25') // Reduced from unlimited
    const skip = (page - 1) * limit
    
    // Build where clause for VAT-enabled clients only
    const whereClause = {
      isVatEnabled: true,
      isActive: true
    }

    // PERFORMANCE OPTIMIZATION: Get total count and paginated results in parallel
    const [vatClients, totalCount] = await Promise.all([
      // Fetch VAT clients with OPTIMIZED query structure
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
          
          // OPTIMIZED: Limit VAT quarters to reduce data load
          // Only fetch recent quarters (last 3) + current active quarter
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
            take: 4 // PERFORMANCE: Limit to 4 most recent quarters
          }
        },
        orderBy: [
          { nextVatReturnDue: 'asc' },
          { companyName: 'asc' }
        ],
        skip,
        take: limit
      }),
      
      // Get total count for pagination
      db.client.count({ where: whereClause })
    ])

    // PERFORMANCE OPTIMIZATION: Calculate additional quarters on-demand
    // For each client, create placeholder for quarters that might be needed
    const processedClients = vatClients.map(client => {
      // If no quarters exist, create current quarter on-demand
      if (!client.vatQuartersWorkflow || client.vatQuartersWorkflow.length === 0) {
        if (!client.vatQuarterGroup) return client
        const currentQuarter = calculateVATQuarter(client.vatQuarterGroup)
        if (currentQuarter) {
          return {
            ...client,
            vatQuartersWorkflow: [{
              id: 'pending',
              quarterPeriod: currentQuarter.quarterPeriod,
              quarterStartDate: currentQuarter.quarterStartDate,
              quarterEndDate: currentQuarter.quarterEndDate,
              filingDueDate: currentQuarter.filingDueDate,
              currentStage: 'PAPERWORK_PENDING_CHASE' as const,
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
      return client
    })

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      clients: processedClients,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        pageSize: limit
      },
      performance: {
        clientsReturned: processedClients.length,
        totalClientsInDatabase: totalCount,
        quartersLimited: true
      }
    })

  } catch (error) {
    console.error('VAT Clients API Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch VAT clients',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 