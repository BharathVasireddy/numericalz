import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CacheHelpers } from '@/lib/performance-cache'

/**
 * GET /api/clients/user-counts
 * 
 * OPTIMIZED: Get client counts for each user for filter dropdowns
 * Returns counts for general assignment, accounts assignment, and VAT assignment
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Single database query with aggregations
 * - No N+1 query problems
 * - Response caching for 5 minutes
 * - Early return for staff users
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

    // Only managers and partners can see user counts - return immediately for staff
    if (session.user.role === 'STAFF') {
      const response = NextResponse.json({
        success: true,
        userClientCounts: {},
        accountsClientCounts: {},
        vatClientCounts: {}
      })
      
      // Cache staff response for longer since it's static
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30') // 1 min cache for real-time updates
      return response
    }

    // OPTIMIZED: Cached query to get all users with their client counts
    const usersWithCounts = await CacheHelpers.clients.getUserCounts(() => 
      db.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              // General assignment count
              assignedClients: {
                where: { isActive: true }
              },
              // Ltd company accounts assignment count
              ltdCompanyAssignedClients: {
                where: { isActive: true }
              },
              // Non-Ltd company accounts assignment count
              nonLtdCompanyAssignedClients: {
                where: { isActive: true }
              },
              // VAT assignment count
              vatAssignedClients: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    )

    // OPTIMIZED: Process results without additional database queries
    const userClientCounts: Record<string, number> = {}
    const accountsClientCounts: Record<string, number> = {}
    const vatClientCounts: Record<string, number> = {}

    // Calculate counts from the single query result
    for (const user of usersWithCounts) {
      const counts = user._count
      
      // General assignment count (direct from database aggregation)
      userClientCounts[user.id] = counts.assignedClients
      
      // Accounts assignment count (Ltd + Non-Ltd combined)
      accountsClientCounts[user.id] = counts.ltdCompanyAssignedClients + counts.nonLtdCompanyAssignedClients
      
      // VAT assignment count (direct from database aggregation)
      vatClientCounts[user.id] = counts.vatAssignedClients
    }

    const response = NextResponse.json({
      success: true,
      userClientCounts,
      accountsClientCounts,
      vatClientCounts
    })

    // PERFORMANCE: Cache response for 1 minute with stale-while-revalidate for real-time updates
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    response.headers.set('ETag', `"user-counts-${Date.now()}"`)

    return response

  } catch (error) {
    console.error('Error fetching user client counts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}