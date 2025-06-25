import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Debug VAT - Current user:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    })

    // Check all clients assigned to this user
    const assignedClients = await db.client.findMany({
      where: {
        OR: [
          { assignedUserId: session.user.id },
          { vatAssignedUserId: session.user.id }
        ],
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        isVatEnabled: true,
        assignedUserId: true,
        vatAssignedUserId: true,
        assignedUser: {
          select: { name: true, email: true }
        },
        vatAssignedUser: {
          select: { name: true, email: true }
        }
      }
    })

    console.log('🔍 Debug VAT - All assigned clients:', assignedClients.length)

    // Check VAT-enabled clients specifically
    const vatClients = await db.client.findMany({
      where: {
        OR: [
          { assignedUserId: session.user.id },
          { vatAssignedUserId: session.user.id }
        ],
        isVatEnabled: true,
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        isVatEnabled: true,
        vatQuarterGroup: true,
        vatReturnsFrequency: true,
        assignedUserId: true,
        vatAssignedUserId: true
      }
    })

    console.log('🔍 Debug VAT - VAT-enabled assigned clients:', vatClients.length)

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      },
      totalAssignedClients: assignedClients.length,
      vatEnabledClients: vatClients.length,
      assignedClients,
      vatClients
    })

  } catch (error) {
    console.error('Debug VAT error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
} 