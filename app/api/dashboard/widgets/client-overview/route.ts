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

    // Get all active clients
    const allClients = await db.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        companyType: true,
        isVatEnabled: true
      }
    })

    // Calculate client counts using consistent logic
    const clientCounts = {
      total: allClients.length,
      ltd: allClients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
      nonLtd: allClients.filter(c => c.companyType !== 'LIMITED_COMPANY').length,
      vat: allClients.filter(c => c.isVatEnabled).length
    }

    const response = NextResponse.json({
      success: true,
      data: { clientCounts }
    })

    // Set no-cache headers for real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Client overview API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch client overview data'
    }, { status: 500 })
  }
} 