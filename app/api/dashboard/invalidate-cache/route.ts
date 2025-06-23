import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { invalidateDashboardCache, CacheHelpers } from '@/lib/performance-cache'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/invalidate-cache
 * 
 * Manually invalidate dashboard cache for real-time updates
 * Useful for production deployments or when immediate updates are needed
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow MANAGER and PARTNER roles to invalidate cache
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, scope } = body

    let invalidatedCount = 0

    switch (scope) {
      case 'dashboard':
        // Invalidate specific user dashboard or all dashboards
        invalidateDashboardCache(userId)
        invalidatedCount = userId ? 1 : 3 // 3 dashboard types (partner, manager, staff)
        break
        
      case 'clients':
        // Invalidate all client-related caches
        CacheHelpers.clients.invalidate()
        invalidatedCount = 10 // Approximate client cache entries
        break
        
      case 'users':
        // Invalidate all user-related caches
        CacheHelpers.users.invalidate()
        invalidatedCount = 5 // Approximate user cache entries
        break
        
      case 'all':
      default:
        // Invalidate all dashboard and related caches
        invalidateDashboardCache()
        CacheHelpers.clients.invalidate()
        CacheHelpers.users.invalidate()
        CacheHelpers.vat.invalidate()
        invalidatedCount = 20 // Approximate total cache entries
        break
    }

    const response = NextResponse.json({
      success: true,
      message: `Cache invalidated successfully`,
      invalidatedCount,
      scope: scope || 'all',
      userId: userId || 'all',
      timestamp: new Date().toISOString()
    })

    // Prevent caching of this response
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')

    return response

  } catch (error) {
    console.error('Cache invalidation API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to invalidate cache' 
      }, 
      { status: 500 }
    )
  }
}

/**
 * GET /api/dashboard/invalidate-cache
 * 
 * Get current cache status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow MANAGER and PARTNER roles to view cache status
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Import cache instance to get stats
    const { performanceCache } = await import('@/lib/performance-cache')
    const cacheStats = performanceCache.stats()

    const response = NextResponse.json({
      success: true,
      cacheStats,
      timestamp: new Date().toISOString()
    })

    // Short cache for stats (5 seconds)
    response.headers.set('Cache-Control', 'public, max-age=5')

    return response

  } catch (error) {
    console.error('Cache status API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get cache status' 
      }, 
      { status: 500 }
    )
  }
} 