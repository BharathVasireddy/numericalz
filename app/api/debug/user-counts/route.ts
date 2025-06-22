import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Temporarily disable auth for debugging
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Get detailed user assignment counts
    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedClients: {
          where: { isActive: true },
          select: { id: true, clientCode: true, companyName: true }
        },
        ltdCompanyAssignedClients: {
          where: { isActive: true },
          select: { id: true, clientCode: true, companyName: true }
        },
        nonLtdCompanyAssignedClients: {
          where: { isActive: true },
          select: { id: true, clientCode: true, companyName: true }
        },
        vatAssignedClients: {
          where: { isActive: true },
          select: { id: true, clientCode: true, companyName: true }
        }
      }
    })

    const debug = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      counts: {
        general: user.assignedClients.length,
        ltd: user.ltdCompanyAssignedClients.length,
        nonLtd: user.nonLtdCompanyAssignedClients.length,
        vat: user.vatAssignedClients.length,
        totalAccounts: user.ltdCompanyAssignedClients.length + user.nonLtdCompanyAssignedClients.length
      },
      clients: {
        general: user.assignedClients.map(c => `${c.clientCode}: ${c.companyName}`),
        ltd: user.ltdCompanyAssignedClients.map(c => `${c.clientCode}: ${c.companyName}`),
        nonLtd: user.nonLtdCompanyAssignedClients.map(c => `${c.clientCode}: ${c.companyName}`),
        vat: user.vatAssignedClients.map(c => `${c.clientCode}: ${c.companyName}`)
      }
    }))

    return NextResponse.json({
      success: true,
      debug
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to get debug info' }, { status: 500 })
  }
}