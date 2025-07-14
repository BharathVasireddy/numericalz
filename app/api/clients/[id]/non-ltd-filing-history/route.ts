import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    // Verify client exists and user has access
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        companyType: 'NON_LIMITED_COMPANY',
        isActive: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Fetch all non-Ltd workflows for this client
    const nonLtdWorkflows = await db.nonLtdAccountsWorkflow.findMany({
      where: {
        clientId: clientId
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        workflowHistory: {
          orderBy: { stageChangedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: {
        yearEndDate: 'desc'
      }
    })

    // Calculate summary statistics
    const totalWorkflows = nonLtdWorkflows.length
    const completedWorkflows = nonLtdWorkflows.filter(w => w.isCompleted).length
    const activeWorkflows = totalWorkflows - completedWorkflows

    return NextResponse.json({
      success: true,
      data: {
        nonLtdWorkflows,
        totalWorkflows,
        completedWorkflows,
        activeWorkflows
      }
    })

  } catch (error) {
    console.error('Error fetching non-Ltd filing history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch non-Ltd filing history' },
      { status: 500 }
    )
  }
} 