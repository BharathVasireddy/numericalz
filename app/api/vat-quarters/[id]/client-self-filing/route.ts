import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'
// Disable all caching for real-time data
export const revalidate = 0

const ClientSelfFilingSchema = z.object({
  comments: z.string().optional(),
})

/**
 * PUT /api/vat-quarters/[id]/client-self-filing
 * 
 * Mark a VAT quarter as client self-filing (completed by client)
 * This sets the quarter to FILED_TO_HMRC status and marks as completed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: vatQuarterId } = params
    const body = await request.json()
    const { comments } = ClientSelfFilingSchema.parse(body)

    // Get the VAT quarter with client info
    const vatQuarter = await db.vATQuarter.findUnique({
      where: { id: vatQuarterId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            assignedUserId: true,
          }
        }
      }
    })

    if (!vatQuarter) {
      return NextResponse.json(
        { success: false, error: 'VAT quarter not found' },
        { status: 404 }
      )
    }

    // Check permissions - only managers and partners can mark as client self-filing
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Only managers and partners can mark quarters as client self-filing' },
        { status: 403 }
      )
    }

    const now = new Date()
    const userName = session.user.name || 'Unknown User'
    const userEmail = session.user.email || ''
    const userRole = session.user.role

    // Update VAT quarter to completed client self-filing state
    const updatedVATQuarter = await db.vATQuarter.update({
      where: { id: vatQuarterId },
      data: {
        currentStage: 'FILED_TO_HMRC',
        isCompleted: true,
        filedToHMRCDate: now,
        filedToHMRCByUserId: session.user.id,
        filedToHMRCByUserName: userName,
        updatedAt: now,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            vatQuarterGroup: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            vatAssignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        workflowHistory: {
          orderBy: { stageChangedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            fromStage: true,
            toStage: true,
            stageChangedAt: true,
            daysInPreviousStage: true,
            userName: true,
            userEmail: true,
            userRole: true,
            notes: true,
          }
        }
      }
    })

    // Create workflow history entry
    await db.vATWorkflowHistory.create({
      data: {
        vatQuarterId: vatQuarterId,
        fromStage: vatQuarter.currentStage,
        toStage: 'FILED_TO_HMRC',
        stageChangedAt: now,
        daysInPreviousStage: null, // Client self-filing doesn't track stage duration
        userId: session.user.id,
        userName: userName,
        userEmail: userEmail,
        userRole: userRole,
        notes: comments || 'Marked as client self-filing - client handles own VAT return',
      }
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'VAT_QUARTER_CLIENT_SELF_FILING',
        details: JSON.stringify({
          vatQuarterId: vatQuarterId,
          clientId: vatQuarter.client.id,
          companyName: vatQuarter.client.companyName,
          quarterPeriod: vatQuarter.quarterPeriod,
          filingDueDate: vatQuarter.filingDueDate,
          comments: comments,
          timestamp: now.toISOString(),
        }),
      },
    })

    const response = NextResponse.json({
      success: true,
      message: 'Quarter marked as client self-filing successfully',
      data: {
        vatQuarter: updatedVATQuarter,
      }
    })

    // Disable caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Error marking quarter as client self-filing:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to mark quarter as client self-filing' },
      { status: 500 }
    )
  }
}