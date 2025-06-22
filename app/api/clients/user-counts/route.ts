import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and partners can see all user client counts
    if (session.user.role === 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get user client counts for active clients
    const userClientCounts = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedClients: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    // Transform to simple object mapping
    const counts: Record<string, number> = {}
    userClientCounts.forEach(user => {
      counts[user.id] = user._count.assignedClients
    })

    return NextResponse.json({
      success: true,
      userClientCounts: counts
    })

  } catch (error) {
    console.error('Error fetching user client counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user client counts' },
      { status: 500 }
    )
  }
}