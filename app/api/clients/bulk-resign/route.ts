import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and managers can perform bulk operations
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied. Partner or Manager role required.' }, { status: 403 })
    }

    const { clientIds } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Client IDs are required' }, { status: 400 })
    }

    // Update all selected clients to inactive status
    const result = await db.client.updateMany({
      where: {
        id: { in: clientIds },
        isActive: true // Only update currently active clients
      },
      data: {
        isActive: false
      }
    })

    // Log bulk resignation activity
    await logActivityEnhanced(request, {
      action: 'BULK_CLIENT_RESIGNED',
      details: {
        message: `Bulk resigned ${result.count} clients`,
        requestedClients: clientIds.length,
        resignedClients: result.count,
        clientIds: clientIds,
        resignedBy: session.user.name || session.user.email || 'Unknown User',
        resignedByRole: session.user.role,
        operationType: 'BULK_RESIGNATION'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully resigned ${result.count} clients`,
      updatedCount: result.count
    })

  } catch (error) {
    console.error('Error in bulk resign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 