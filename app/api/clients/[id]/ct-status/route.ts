import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'
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
        lastAccountsMadeUpTo: true,
        nextYearEnd: true // Add year end for CT calculation
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
        const clientYearEndDate = client.nextYearEnd ? new Date(client.nextYearEnd) : null
        updateData = markCTAsFiled(client, session.user.id, nextYearEndDate, clientYearEndDate)
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
        companyName: true,
        clientCode: true,
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

    // Log CT status activity based on action type
    const actionDetails = {
      clientCode: updatedClient.clientCode,
      companyName: updatedClient.companyName,
      action: action,
      ctStatus: updatedClient.corporationTaxStatus,
      periodStart: updatedClient.corporationTaxPeriodStart?.toISOString(),
      periodEnd: updatedClient.corporationTaxPeriodEnd?.toISOString(),
      nextCTDue: updatedClient.nextCorporationTaxDue?.toISOString(),
      ctDueSource: updatedClient.ctDueSource,
      manualOverride: updatedClient.manualCTDueOverride
    }

    switch (action) {
      case 'mark_filed':
        await logActivityEnhanced(request, {
          action: 'CT_MARKED_AS_FILED',
          clientId: params.id,
          details: {
            ...actionDetails,
            message: `Corporation Tax marked as filed`,
            nextYearEnd: nextYearEnd ? new Date(nextYearEnd).toISOString() : null,
            advancedToNextPeriod: true
          }
        })
        break

      case 'set_manual':
        await logActivityEnhanced(request, {
          action: 'CT_MANUAL_DUE_SET',
          clientId: params.id,
          details: {
            ...actionDetails,
            message: `Manual CT due date set to ${new Date(manualDueDate).toLocaleDateString()}`,
            manualDueDate: new Date(manualDueDate).toISOString()
          }
        })
        break

      case 'reset_auto':
        await logActivityEnhanced(request, {
          action: 'CT_RESET_TO_AUTO',
          clientId: params.id,
          details: {
            ...actionDetails,
            message: `Corporation Tax due reset to auto-calculated date`,
            resetToAuto: true
          }
        })
        break

      case 'update_period':
        await logActivityEnhanced(request, {
          action: 'CT_PERIOD_UPDATED',
          clientId: params.id,
          details: {
            ...actionDetails,
            message: `Corporation Tax period updated due to year end change`,
            newYearEnd: new Date(nextYearEnd).toISOString(),
            periodUpdated: true
          }
        })
        break
    }

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