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

    // Get all active clients with assignment data
    const allClients = await db.client.findMany({
      where: { isActive: true },
      include: {
        assignedUser: true,
        ltdCompanyAssignedUser: true,
        vatAssignedUser: true,
        vatQuartersWorkflow: {
          where: { isCompleted: false },
          orderBy: { quarterEndDate: 'asc' },
          take: 1
        }
      }
    })

    // Calculate unassigned clients using consistent logic
    const unassignedCounts = {
      ltd: allClients.filter(c => 
        c.companyType === 'LIMITED_COMPANY' && !c.ltdCompanyAssignedUserId && !c.assignedUserId
      ).length,
      nonLtd: allClients.filter(c => 
        c.companyType !== 'LIMITED_COMPANY' && !c.assignedUserId
      ).length,
      vat: allClients.filter(c => 
        c.isVatEnabled && c.vatQuartersWorkflow?.some(q => !q.assignedUserId && !q.isCompleted)
      ).length
    }

    const response = NextResponse.json({
      success: true,
      data: { unassignedCounts }
    })

    // Set no-cache headers for real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Unassigned clients API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch unassigned clients data'
    }, { status: 500 })
  }
} 