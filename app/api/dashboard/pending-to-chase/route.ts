import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateYearEnd } from '@/lib/year-end-utils'

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

    const pendingClients = []
    const today = new Date()

    // Get VAT quarters in "Pending to Chase" status with client data
    const vatQuarters = await db.vATQuarter.findMany({
      where: {
        currentStage: 'PAPERWORK_PENDING_CHASE',
        isCompleted: false
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            chaseTeamUserIds: true,
            accountingReferenceDate: true,
            lastAccountsMadeUpTo: true,
            incorporationDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Get Ltd Company workflows in "Pending to Chase" status with client data
    const ltdWorkflows = await db.ltdAccountsWorkflow.findMany({
      where: {
        currentStage: 'PAPERWORK_PENDING_CHASE',
        isCompleted: false
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            chaseTeamUserIds: true,
            accountingReferenceDate: true,
            lastAccountsMadeUpTo: true,
            incorporationDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Get all chase team users for the clients
    const allChaseTeamUserIds = new Set<string>()
    vatQuarters.forEach(vq => vq.client.chaseTeamUserIds.forEach(id => allChaseTeamUserIds.add(id)))
    ltdWorkflows.forEach(lw => lw.client.chaseTeamUserIds.forEach(id => allChaseTeamUserIds.add(id)))

    const chaseTeamUsers = await db.user.findMany({
      where: {
        id: {
          in: Array.from(allChaseTeamUserIds)
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    const chaseTeamUsersMap = new Map(chaseTeamUsers.map(user => [user.id, user]))

    // Process VAT quarters
    for (const vatQuarter of vatQuarters) {
      // For VAT quarters, use quarter end date instead of year end
      const quarterEndDate = new Date(vatQuarter.quarterEndDate)
      
      // Only show VAT quarters whose quarter end has already passed
      if (quarterEndDate > today) {
        continue // Skip quarters with future quarter ends
      }

      // Calculate days since quarter end
      const daysSinceQuarterEnd = Math.floor((today.getTime() - quarterEndDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine priority based on days since quarter end (VAT has shorter timelines)
      let priority: 'low' | 'medium' | 'high' = 'low'
      if (daysSinceQuarterEnd > 7) priority = 'high'      // More than 7 days since quarter end
      else if (daysSinceQuarterEnd > 3) priority = 'medium' // More than 3 days since quarter end

      // Get chase team members for this client
      const clientChaseTeam = vatQuarter.client.chaseTeamUserIds
        .map(id => chaseTeamUsersMap.get(id))
        .filter(Boolean)
        .map(user => ({
          id: user!.id,
          name: user!.name || user!.email,
          email: user!.email,
          role: user!.role
        }))

      // Calculate filing due date (VAT filing due date)
      const filingDueDate = vatQuarter.filingDueDate ? new Date(vatQuarter.filingDueDate) : null

      pendingClients.push({
        id: vatQuarter.id,
        clientId: vatQuarter.client.id,
        clientCode: vatQuarter.client.clientCode,
        companyName: vatQuarter.client.companyName,
        workflowType: 'VAT',
        quarterPeriod: vatQuarter.quarterPeriod,
        yearEnd: quarterEndDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        filingDate: filingDueDate ? filingDueDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : 'Not set',
        daysSinceYearEnd: daysSinceQuarterEnd, // Keep same field name for compatibility
        priority,
        chaseTeamMembers: clientChaseTeam
      })
    }

    // Process Ltd Company workflows
    for (const ltdWorkflow of ltdWorkflows) {
      // Calculate year end for this client
      const yearEnd = calculateYearEnd(ltdWorkflow.client)
      
      // Only show clients whose year end has already passed
      if (!yearEnd || yearEnd > today) {
        continue // Skip clients with future year ends
      }

      // Calculate days since year end
      const daysSinceYearEnd = Math.floor((today.getTime() - yearEnd.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine priority based on days since year end
      let priority: 'low' | 'medium' | 'high' = 'low'
      if (daysSinceYearEnd > 30) priority = 'high'      // More than 30 days since year end
      else if (daysSinceYearEnd > 14) priority = 'medium' // More than 14 days since year end

      // Get chase team members for this client
      const clientChaseTeam = ltdWorkflow.client.chaseTeamUserIds
        .map(id => chaseTeamUsersMap.get(id))
        .filter(Boolean)
        .map(user => ({
          id: user!.id,
          name: user!.name || user!.email,
          email: user!.email,
          role: user!.role
        }))

      // Calculate filing due date (accounts due date)
      const filingDueDate = ltdWorkflow.accountsDueDate ? new Date(ltdWorkflow.accountsDueDate) : null

      pendingClients.push({
        id: ltdWorkflow.id,
        clientId: ltdWorkflow.client.id,
        clientCode: ltdWorkflow.client.clientCode,
        companyName: ltdWorkflow.client.companyName,
        workflowType: 'ACCOUNTS',
        yearEnd: yearEnd.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        filingDate: filingDueDate ? filingDueDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : 'Not set',
        daysSinceYearEnd,
        priority,
        chaseTeamMembers: clientChaseTeam
      })
    }

    // Sort by priority (high first) and then by days since year end (most urgent first)
    pendingClients.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.daysSinceYearEnd - a.daysSinceYearEnd
    })

    return NextResponse.json({
      success: true,
      clients: pendingClients,
      totalCount: pendingClients.length
    })

  } catch (error) {
    console.error('Error fetching pending to chase clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending to chase clients' },
      { status: 500 }
    )
  }
}

// Handle updating workflow status to "PAPERWORK_CHASED"
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow managers and partners to update workflow status
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { workflowId, workflowType } = await request.json()

    if (!workflowId || !workflowType) {
      return NextResponse.json({ error: 'Missing workflowId or workflowType' }, { status: 400 })
    }

    if (workflowType === 'VAT') {
      // Update VAT quarter workflow
      const vatQuarter = await db.vATQuarter.findUnique({
        where: { id: workflowId },
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

      // Update to PAPERWORK_CHASED stage
      await db.vATQuarter.update({
        where: { id: workflowId },
        data: {
          currentStage: 'PAPERWORK_CHASED',
          chaseStartedDate: new Date(),
          chaseStartedByUserId: session.user.id,
          chaseStartedByUserName: session.user.name || session.user.email || 'Unknown',
          updatedAt: new Date()
        }
      })

      // Create workflow history entry
      await db.vATWorkflowHistory.create({
        data: {
          vatQuarterId: workflowId,
          fromStage: 'PAPERWORK_PENDING_CHASE',
          toStage: 'PAPERWORK_CHASED',
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown',
          userEmail: session.user.email || '',
          userRole: session.user.role || 'USER',
          notes: 'Started chasing from Pending to Chase widget'
        }
      })

      return NextResponse.json({
        success: true,
        message: `Started chasing VAT quarter for ${vatQuarter.client.companyName}`
      })

    } else if (workflowType === 'ACCOUNTS') {
      // Update Ltd Accounts workflow
      const ltdWorkflow = await db.ltdAccountsWorkflow.findUnique({
        where: { id: workflowId },
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

      if (!ltdWorkflow) {
        return NextResponse.json({ error: 'Ltd workflow not found' }, { status: 404 })
      }

      // Update to PAPERWORK_CHASED stage
      await db.ltdAccountsWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStage: 'PAPERWORK_CHASED',
          chaseStartedDate: new Date(),
          chaseStartedByUserId: session.user.id,
          chaseStartedByUserName: session.user.name || session.user.email || 'Unknown',
          updatedAt: new Date()
        }
      })

      // Create workflow history entry
      await db.ltdAccountsWorkflowHistory.create({
        data: {
          ltdAccountsWorkflowId: workflowId,
          fromStage: 'PAPERWORK_PENDING_CHASE',
          toStage: 'PAPERWORK_CHASED',
          stageChangedAt: new Date(),
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Unknown',
          userEmail: session.user.email || '',
          userRole: session.user.role || 'USER',
          notes: 'Started chasing from Pending to Chase widget'
        }
      })

      return NextResponse.json({
        success: true,
        message: `Started chasing accounts for ${ltdWorkflow.client.companyName}`
      })

    } else {
      return NextResponse.json({ error: 'Invalid workflow type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error updating workflow status:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow status' },
      { status: 500 }
    )
  }
} 