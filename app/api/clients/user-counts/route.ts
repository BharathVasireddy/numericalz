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

    // Get user client counts for active clients with separate counts for different assignment types
    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedClients: {
              where: { isActive: true }
            },
            ltdCompanyAssignedClients: {
              where: { isActive: true }
            },
            nonLtdCompanyAssignedClients: {
              where: { isActive: true }
            },
            vatAssignedClients: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    // Transform to counts with combined unique client assignments
    const counts: Record<string, number> = {}
    const accountsCounts: Record<string, number> = {}
    const vatCounts: Record<string, number> = {}

    for (const user of users) {
      // General assignment count
      counts[user.id] = user._count.assignedClients
      
      // Accounts assignment count (Ltd + Non-Ltd)
      accountsCounts[user.id] = user._count.ltdCompanyAssignedClients + user._count.nonLtdCompanyAssignedClients
      
      // VAT assignment count
      vatCounts[user.id] = user._count.vatAssignedClients
    }

    return NextResponse.json({
      success: true,
      userClientCounts: counts,
      accountsClientCounts: accountsCounts,
      vatClientCounts: vatCounts
    })

  } catch (error) {
    console.error('Error fetching user client counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user client counts' },
      { status: 500 }
    )
  }
}