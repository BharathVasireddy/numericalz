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

    // Get team workload data
    let teamWorkload

    if (session.user.role === 'PARTNER') {
      // Partner sees all staff workload
      teamWorkload = await db.user.findMany({
        where: { 
          isActive: true,
          role: { in: ['STAFF', 'MANAGER'] }
        },
        select: {
          id: true,
          name: true,
          role: true,
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
          }
        },
        orderBy: [
          { role: 'desc' }, // Managers first, then staff
          { name: 'asc' }
        ]
      })
    } else {
      // Manager sees only their team (staff members)
      teamWorkload = await db.user.findMany({
        where: { 
          isActive: true,
          role: 'STAFF'
        },
        select: {
          id: true,
          name: true,
          role: true,
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
          }
        },
        orderBy: { name: 'asc' }
      })
    }

    // Transform the data to match the expected format
    const formattedTeamWorkload = teamWorkload.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      clientCount: member.assignedClients.length,
      vatClients: member.vatAssignedClients.length,
      accountsClients: member.ltdCompanyAssignedClients.length + member.nonLtdCompanyAssignedClients.length
    }))

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