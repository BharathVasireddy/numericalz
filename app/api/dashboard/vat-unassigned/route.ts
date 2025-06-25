import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getVATFilingMonthsForQuarterGroup } from '@/lib/vat-workflow'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow managers and partners to access this endpoint
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current month in London timezone
    const londonNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
    const currentMonth = londonNow.getMonth() + 1 // JavaScript months are 0-indexed

    const unassignedVATClients = []

    // Get all VAT-enabled clients with their quarters
    const vatClients = await db.client.findMany({
      where: {
        isVatEnabled: true,
        vatQuarterGroup: { not: null }
      },
      include: {
        vatQuartersWorkflow: {
          where: {
            isCompleted: false
          },
          orderBy: {
            quarterEndDate: 'desc'
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        vatAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Process each VAT client
    for (const client of vatClients) {
      // Check if current month is a filing month for this client's quarter group
      const filingMonths = getVATFilingMonthsForQuarterGroup(client.vatQuarterGroup!)
      
      if (!filingMonths.includes(currentMonth)) {
        continue // Skip clients that don't file this month
      }

      // Find the current quarter that should be filing this month
      // Filing month is the month AFTER quarter end
      const quarterEndMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const currentYear = londonNow.getFullYear()
      const quarterEndYear = currentMonth === 1 ? currentYear - 1 : currentYear

      // Look for VAT quarters that end in the previous month (filing this month)
      const currentQuarter = client.vatQuartersWorkflow.find(quarter => {
        const quarterEndDate = new Date(quarter.quarterEndDate)
        return quarterEndDate.getMonth() + 1 === quarterEndMonth &&
               quarterEndDate.getFullYear() === quarterEndYear
      })

      // Only include if quarter exists and is past quarter end date
      if (!currentQuarter) continue

      const quarterEndDate = new Date(currentQuarter.quarterEndDate)
      if (quarterEndDate > londonNow) continue // Skip future quarters

      // Check if quarter has no assigned user
      if (!currentQuarter.assignedUserId) {
        // Calculate days since quarter end
        const daysSinceQuarterEnd = Math.floor((londonNow.getTime() - quarterEndDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Determine priority based on days since quarter end
        let priority: 'low' | 'medium' | 'high' = 'low'
        if (daysSinceQuarterEnd > 7) priority = 'high'      // More than 7 days since quarter end
        else if (daysSinceQuarterEnd > 3) priority = 'medium' // More than 3 days since quarter end

        // Calculate filing due date
        const filingDueDate = new Date(currentQuarter.filingDueDate)

        unassignedVATClients.push({
          id: currentQuarter.id,
          clientId: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          quarterPeriod: currentQuarter.quarterPeriod,
          quarterEndDate: quarterEndDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          filingDueDate: filingDueDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          currentStage: currentQuarter.currentStage,
          daysSinceQuarterEnd,
          priority,
          generalAssignedUser: client.assignedUser,
          vatAssignedUser: client.vatAssignedUser
        })
      }
    }

    // Sort by priority (high first) and then by days since quarter end (most urgent first)
    unassignedVATClients.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.daysSinceQuarterEnd - a.daysSinceQuarterEnd
    })

    return NextResponse.json({
      success: true,
      clients: unassignedVATClients,
      totalCount: unassignedVATClients.length,
      currentMonth: londonNow.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    })

  } catch (error) {
    console.error('Error fetching unassigned VAT clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unassigned VAT clients' },
      { status: 500 }
    )
  }
}

// Handle quick assignment of VAT quarter to a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow managers and partners to assign VAT quarters
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { vatQuarterId, assignedUserId } = await request.json()

    if (!vatQuarterId || !assignedUserId) {
      return NextResponse.json({ error: 'Missing vatQuarterId or assignedUserId' }, { status: 400 })
    }

    // Get the VAT quarter and assigned user
    const vatQuarter = await db.vATQuarter.findUnique({
      where: { id: vatQuarterId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true
          }
        }
      }
    })

    if (!vatQuarter) {
      return NextResponse.json({ error: 'VAT quarter not found' }, { status: 404 })
    }

    const assignedUser = await db.user.findUnique({
      where: { id: assignedUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
    }

    // Update VAT quarter with assigned user
    await db.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        assignedUserId: assignedUserId,
        updatedAt: new Date()
      }
    })

    // Create workflow history entry
    await db.vATWorkflowHistory.create({
      data: {
        vatQuarterId: vatQuarterId,
        fromStage: vatQuarter.currentStage,
        toStage: vatQuarter.currentStage, // Same stage, just assignment change
        stageChangedAt: new Date(),
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown',
        userEmail: session.user.email || '',
        userRole: session.user.role || 'USER',
        notes: `Assigned VAT quarter to ${assignedUser.name || assignedUser.email} from Unassigned VAT widget`
      }
    })

    return NextResponse.json({
      success: true,
      message: `VAT quarter assigned to ${assignedUser.name || assignedUser.email} for ${vatQuarter.client.companyName}`
    })

  } catch (error) {
    console.error('Error assigning VAT quarter:', error)
    return NextResponse.json(
      { error: 'Failed to assign VAT quarter' },
      { status: 500 }
    )
  }
} 