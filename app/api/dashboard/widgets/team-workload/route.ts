import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and partners can access this endpoint
    if (!['MANAGER', 'PARTNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get ALL users in the system (not filtered by role)
    const teamWorkload = await db.user.findMany({
      where: { 
        isActive: true
        // Removed role filter - show ALL users
      },
      select: {
        id: true,
        name: true,
        role: true,
        // Client-level assignments
        assignedClients: {
          where: { isActive: true },
          select: { id: true }
        },
        vatAssignedClients: {
          where: { isActive: true },
          select: { id: true }
        },
        ltdCompanyAssignedClients: {
          where: { isActive: true },
          select: { id: true }
        },
        nonLtdCompanyAssignedClients: {
          where: { isActive: true },
          select: { id: true }
        },
        // Workflow-level assignments
        assignedVATQuarters: {
          where: { 
            client: { isActive: true },
            isCompleted: false
          },
          select: { 
            id: true,
            clientId: true
          }
        },
        assignedLtdAccountsWorkflows: {
          where: { 
            client: { isActive: true },
            isCompleted: false
          },
          select: { 
            id: true,
            clientId: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // Partners first, then managers, then staff
        { name: 'asc' }
      ]
    })

    // Transform the data to match the expected format
    const formattedTeamWorkload = teamWorkload.map(member => {
      // Get unique client IDs for VAT work (client-level + workflow-level)
      const vatClientIds = new Set([
        ...member.vatAssignedClients.map(c => c.id),
        ...member.assignedVATQuarters.map(q => q.clientId)
      ])

      // Get unique client IDs for accounts work (client-level + workflow-level)
      const accountsClientIds = new Set([
        ...member.ltdCompanyAssignedClients.map(c => c.id),
        ...member.nonLtdCompanyAssignedClients.map(c => c.id),
        ...member.assignedLtdAccountsWorkflows.map(w => w.clientId)
      ])

      return {
        id: member.id,
        name: member.name,
        role: member.role,
        clientCount: member.assignedClients.length,
        vatClients: vatClientIds.size,
        accountsClients: accountsClientIds.size
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        teamWorkload: formattedTeamWorkload
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Team workload API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch team workload data'
    }, { status: 500 })
  }
} 