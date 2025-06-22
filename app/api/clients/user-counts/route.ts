import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/clients/user-counts
 * 
 * Get client counts for each user for filter dropdowns
 * Returns counts for general assignment, accounts assignment, and VAT assignment
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

    // Only managers and partners can see user counts
    if (session.user.role === 'STAFF') {
      return NextResponse.json({
        success: true,
        userClientCounts: {},
        accountsClientCounts: {},
        vatClientCounts: {}
      })
    }

    // Get all active users
    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    // Initialize count objects
    const userClientCounts: Record<string, number> = {}
    const accountsClientCounts: Record<string, number> = {}
    const vatClientCounts: Record<string, number> = {}

    // Get counts for each user
    for (const user of users) {
      // General assignment count
      const generalCount = await db.client.count({
        where: {
          isActive: true,
          assignedUserId: user.id
        }
      })
      userClientCounts[user.id] = generalCount

      // Accounts assignment count (with fallback logic)
      const accountsCount = await db.client.count({
        where: {
          isActive: true,
          OR: [
            // Specific assignments
            { 
              AND: [
                { companyType: 'LIMITED_COMPANY' },
                { ltdCompanyAssignedUserId: user.id }
              ]
            },
            {
              AND: [
                { companyType: { in: ['NON_LIMITED_COMPANY', 'DIRECTOR', 'SUB_CONTRACTOR'] } },
                { nonLtdCompanyAssignedUserId: user.id }
              ]
            },
            // Fallback to general assignment when specific assignment is null
            {
              AND: [
                { companyType: 'LIMITED_COMPANY' },
                { ltdCompanyAssignedUserId: null },
                { assignedUserId: user.id }
              ]
            },
            {
              AND: [
                { companyType: { in: ['NON_LIMITED_COMPANY', 'DIRECTOR', 'SUB_CONTRACTOR'] } },
                { nonLtdCompanyAssignedUserId: null },
                { assignedUserId: user.id }
              ]
            }
          ]
        }
      })
      accountsClientCounts[user.id] = accountsCount

      // VAT assignment count (with fallback logic)
      const vatCount = await db.client.count({
        where: {
          isActive: true,
          OR: [
            // Specific VAT assignment
            { vatAssignedUserId: user.id },
            // Fallback to general assignment when VAT assignment is null
            {
              AND: [
                { vatAssignedUserId: null },
                { assignedUserId: user.id }
              ]
            }
          ]
        }
      })
      vatClientCounts[user.id] = vatCount
    }

    return NextResponse.json({
      success: true,
      userClientCounts,
      accountsClientCounts,
      vatClientCounts
    })

  } catch (error) {
    console.error('Error fetching user client counts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}