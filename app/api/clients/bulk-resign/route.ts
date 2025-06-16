import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers can perform bulk operations
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
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