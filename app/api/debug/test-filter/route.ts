import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testUserId = searchParams.get('userId') || 'cmc5889sp0000699mygkbm269' // Bharat's ID
    const filterType = searchParams.get('filter') || 'accounts' // accounts, vat, general

    let where: any = { isActive: true }

    if (filterType === 'accounts') {
      where.OR = [
        { ltdCompanyAssignedUserId: testUserId },
        { nonLtdCompanyAssignedUserId: testUserId }
      ]
    } else if (filterType === 'vat') {
      where.vatAssignedUserId = testUserId
    } else if (filterType === 'general') {
      where.assignedUserId = testUserId
    }

    console.log('WHERE clause:', JSON.stringify(where, null, 2))

    const clients = await db.client.findMany({
      where,
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyType: true,
        assignedUserId: true,
        ltdCompanyAssignedUserId: true,
        nonLtdCompanyAssignedUserId: true,
        vatAssignedUserId: true,
        assignedUser: {
          select: { name: true }
        },
        ltdCompanyAssignedUser: {
          select: { name: true }
        },
        nonLtdCompanyAssignedUser: {
          select: { name: true }
        },
        vatAssignedUser: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      filter: filterType,
      userId: testUserId,
      where,
      count: clients.length,
      clients
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to test filter' }, { status: 500 })
  }
}