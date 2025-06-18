import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * GET /api/users/staff
 * 
 * Get all users with their client assignments for staff management
 * Accessible to PARTNER and MANAGER roles
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

    // Only PARTNER and MANAGER can access staff data
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. PARTNER or MANAGER role required.' },
        { status: 403 }
      )
    }

    // Fetch all users with their client assignments
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        assignedClients: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            companyName: true,
            companyType: true,
            nextAccountsDue: true,
            nextConfirmationDue: true,
          }
        },
        _count: {
          select: {
            assignedClients: {
              where: {
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      users,
    })

  } catch (error) {
    console.error('Error fetching staff data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff data' },
      { status: 500 }
    )
  }
} 