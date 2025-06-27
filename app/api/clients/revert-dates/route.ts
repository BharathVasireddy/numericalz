import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners can revert dates
    if (session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { companyNumber, oldDates } = body

    if (!companyNumber) {
      return NextResponse.json({ error: 'Company number is required' }, { status: 400 })
    }

    // Find the client by company number
    const client = await db.client.findFirst({
      where: { companyNumber },
      include: {
        assignedUser: true,
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (oldDates.nextYearEnd) {
      updateData.nextYearEnd = new Date(oldDates.nextYearEnd)
    }
    
    if (oldDates.nextAccountsDue) {
      updateData.nextAccountsDue = new Date(oldDates.nextAccountsDue)
    }
    
    if (oldDates.nextCorporationTaxDue) {
      updateData.nextCorporationTaxDue = new Date(oldDates.nextCorporationTaxDue)
    }
    
    if (oldDates.nextConfirmationDue) {
      updateData.nextConfirmationDue = new Date(oldDates.nextConfirmationDue)
    }
    
    if (oldDates.lastAccountsMadeUpTo) {
      updateData.lastAccountsMadeUpTo = new Date(oldDates.lastAccountsMadeUpTo)
    }
    
    if (oldDates.accountingReferenceDate) {
      updateData.accountingReferenceDate = oldDates.accountingReferenceDate
    }

    // Update the client
    const updatedClient = await db.client.update({
      where: { id: client.id },
      data: updateData,
      include: {
        assignedUser: true,
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        vatAssignedUser: true
      }
    })

    // Log the date revert activity
    await logActivityEnhanced(request, {
      action: 'CLIENT_UPDATED',
      clientId: client.id,
      details: {
        clientCode: client.clientCode,
        companyName: client.companyName,
        changes: ['Dates reverted for testing purposes'],
        updatedBy: session.user.name || session.user.email,
        reason: 'Testing date revert functionality'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Dates reverted successfully for ${client.companyName}`,
      client: updatedClient
    })

  } catch (error) {
    console.error('Error reverting client dates:', error)
    return NextResponse.json({ 
      error: 'Failed to revert client dates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 