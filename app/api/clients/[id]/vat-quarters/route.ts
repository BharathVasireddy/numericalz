import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { calculateVATQuarter, getNextVATQuarter, VAT_WORKFLOW_STAGE_NAMES } from '@/lib/vat-workflow'

/**
 * GET /api/clients/[id]/vat-quarters
 * Get all VAT quarters for a client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    // Get client to verify it exists and user has access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        isVatEnabled: true,
        vatQuarterGroup: true,
        assignedUserId: true,
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all VAT quarters for this client
    const vatQuarters = await prisma.vATQuarter.findMany({
      where: { clientId },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        workflowHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        quarterEndDate: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        client,
        vatQuarters
      }
    })

  } catch (error) {
    console.error('Error fetching VAT quarters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VAT quarters' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients/[id]/vat-quarters
 * Create a new VAT quarter for a client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id
    const body = await request.json()

    // Get client to verify it exists and is VAT enabled
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        isVatEnabled: true,
        vatQuarterGroup: true,
        assignedUserId: true,
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.isVatEnabled || !client.vatQuarterGroup) {
      return NextResponse.json({ 
        error: 'Client must be VAT enabled with a quarter group selected' 
      }, { status: 400 })
    }

    // Calculate quarter information
    const referenceDate = body.referenceDate ? new Date(body.referenceDate) : new Date()
    const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, referenceDate)

    // Check if quarter already exists
    const existingQuarter = await prisma.vATQuarter.findFirst({
      where: {
        clientId,
        quarterPeriod: quarterInfo.quarterPeriod
      }
    })

    if (existingQuarter) {
      return NextResponse.json({ 
        error: 'VAT quarter already exists for this period' 
      }, { status: 400 })
    }

    // Create new VAT quarter
    const vatQuarter = await prisma.vATQuarter.create({
      data: {
        clientId,
        quarterPeriod: quarterInfo.quarterPeriod,
        quarterStartDate: quarterInfo.quarterStartDate,
        quarterEndDate: quarterInfo.quarterEndDate,
        filingDueDate: quarterInfo.filingDueDate,
        quarterGroup: quarterInfo.quarterGroup,
        assignedUserId: client.assignedUserId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Create initial workflow history entry
    await prisma.vATWorkflowHistory.create({
      data: {
        vatQuarterId: vatQuarter.id,
        toStage: 'CLIENT_BOOKKEEPING',
        stageChangedAt: new Date(),
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown User',
        userEmail: session.user.email || '',
        userRole: 'USER',
        notes: 'VAT quarter created - awaiting client bookkeeping',
      }
    })

    return NextResponse.json({
      success: true,
      data: vatQuarter,
      message: 'VAT quarter created successfully'
    })

  } catch (error) {
    console.error('Error creating VAT quarter:', error)
    return NextResponse.json(
      { error: 'Failed to create VAT quarter' },
      { status: 500 }
    )
  }
} 