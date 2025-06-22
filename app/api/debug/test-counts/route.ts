import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Test the same logic as user-counts API
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
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        counts: {
          general: u._count.assignedClients,
          ltd: u._count.ltdCompanyAssignedClients,
          nonLtd: u._count.nonLtdCompanyAssignedClients,
          vat: u._count.vatAssignedClients,
          totalAccounts: u._count.ltdCompanyAssignedClients + u._count.nonLtdCompanyAssignedClients
        }
      })),
      userClientCounts: counts,
      accountsClientCounts: accountsCounts,
      vatClientCounts: vatCounts
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to get counts' }, { status: 500 })
  }
}