import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { 
  markCTAsFiled, 
  setManualCTDue, 
  resetToAutoCTDue,
  shouldUpdateCTDue,
  calculateCTPeriod
} from '@/lib/ct-tracking'

/**
 * PUT /api/clients/[id]/ct-status
 * 
 * Update Corporation Tax status and due date
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers and partners can update CT status
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, manualDueDate, nextYearEnd } = body

    // Get current client data
    const client = await db.client.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        corporationTaxStatus: true,
        corporationTaxPeriodStart: true,
        corporationTaxPeriodEnd: true,
        nextCorporationTaxDue: true,
        manualCTDueOverride: true,
        ctDueSource: true,
        lastCTStatusUpdate: true,
        ctStatusUpdatedBy: true,
        accountingReferenceDate: true,
        lastAccountsMadeUpTo: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    let updateData: any = {}

    switch (action) {
      case 'mark_filed':
        // Mark CT as filed and advance to next period
        const nextYearEndDate = nextYearEnd ? new Date(nextYearEnd) : null
        updateData = markCTAsFiled(client, session.user.id, nextYearEndDate)
        break

      case 'set_manual':
        // Set manual CT due date
        if (!manualDueDate) {
          return NextResponse.json(
            { success: false, error: 'Manual due date is required' },
            { status: 400 }
          )
        }
        updateData = setManualCTDue(new Date(manualDueDate), session.user.id)
        break

      case 'reset_auto':
        // Reset to auto-calculated CT due
        if (!client.corporationTaxPeriodEnd) {
          return NextResponse.json(
            { success: false, error: 'Cannot reset to auto - no year end available' },
            { status: 400 }
          )
        }
        updateData = resetToAutoCTDue(client.corporationTaxPeriodEnd, session.user.id)
        break

      case 'update_period':
        // Update CT period (when year end changes)
        const newYearEndDate = nextYearEnd ? new Date(nextYearEnd) : null
        if (!newYearEndDate) {
          return NextResponse.json(
            { success: false, error: 'Year end date is required' },
            { status: 400 }
          )
        }

        const updateResult = shouldUpdateCTDue(client, newYearEndDate, true)
        
        if (!updateResult.shouldUpdate) {
          return NextResponse.json({
            success: false,
            error: 'CT due update blocked',
            warnings: updateResult.warnings,
            reason: updateResult.reason
          }, { status: 400 })
        }

        updateData = {
          nextCorporationTaxDue: updateResult.newCTDue,
          corporationTaxPeriodStart: updateResult.newPeriodStart,
          corporationTaxPeriodEnd: updateResult.newPeriodEnd,
          lastCTStatusUpdate: new Date(),
          ctStatusUpdatedBy: session.user.id
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update client with new CT data
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        corporationTaxStatus: true,
        corporationTaxPeriodStart: true,
        corporationTaxPeriodEnd: true,
        nextCorporationTaxDue: true,
        manualCTDueOverride: true,
        ctDueSource: true,
        lastCTStatusUpdate: true,
        ctStatusUpdatedBy: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: `CT status updated successfully`
    })

  } catch (error: any) {
    console.error('Error updating CT status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 