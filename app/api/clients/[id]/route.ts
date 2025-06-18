import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/clients/[id]
 * 
 * Get a specific client by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const client = await db.client.findUnique({
      where: { id: params.id },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check permissions - staff can only view their assigned clients
    if (session.user.role === 'STAFF' && client.assignedUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      client,
    })

  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/clients/[id]
 * 
 * Update a specific client
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Check if this is a questionnaire update (less restrictive) or full update (manager only)
    const isQuestionnaireUpdate = Object.keys(body).every(key => 
      ['isVatEnabled', 'vatNumber', 'vatRegistrationDate', 'vatReturnsFrequency', 'nextVatReturnDue', 
       'requiresPayroll', 'requiresBookkeeping', 'requiresManagementAccounts', 
       'preferredContactMethod', 'specialInstructions'].includes(key)
    )

    // Only managers and partners can do full updates, but anyone can do questionnaire updates
    if (!isQuestionnaireUpdate && session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Manager or Partner access required for full client updates' },
        { status: 403 }
      )
    }

    // Check if client exists
    const existingClient = await db.client.findUnique({
      where: { id: params.id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Validate required fields only for full updates (not questionnaire updates)
    if (!isQuestionnaireUpdate) {
      const requiredFields = ['companyName', 'companyType', 'contactName', 'contactEmail']
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json(
            { success: false, error: `${field} is required` },
            { status: 400 }
          )
        }
      }
    }

    // Prepare update data based on update type
    let updateData: any = {
      updatedAt: new Date(),
    }

    if (isQuestionnaireUpdate) {
      // Only update questionnaire fields
      updateData = {
        ...updateData,
        ...(body.isVatEnabled !== undefined && { isVatEnabled: body.isVatEnabled }),
        ...(body.vatNumber !== undefined && { vatNumber: body.vatNumber }),
        ...(body.vatRegistrationDate !== undefined && { 
          vatRegistrationDate: body.vatRegistrationDate ? new Date(body.vatRegistrationDate) : null 
        }),
        ...(body.vatReturnsFrequency !== undefined && { vatReturnsFrequency: body.vatReturnsFrequency }),
        ...(body.vatQuarterGroup !== undefined && { vatQuarterGroup: body.vatQuarterGroup }),
        ...(body.nextVatReturnDue !== undefined && { 
          nextVatReturnDue: body.nextVatReturnDue ? new Date(body.nextVatReturnDue) : null 
        }),
        ...(body.requiresPayroll !== undefined && { requiresPayroll: body.requiresPayroll }),
        ...(body.requiresBookkeeping !== undefined && { requiresBookkeeping: body.requiresBookkeeping }),
        ...(body.requiresManagementAccounts !== undefined && { requiresManagementAccounts: body.requiresManagementAccounts }),
        ...(body.preferredContactMethod !== undefined && { preferredContactMethod: body.preferredContactMethod }),
        ...(body.specialInstructions !== undefined && { specialInstructions: body.specialInstructions }),
      }
    } else {
      // Full update - include all fields
      updateData = {
        ...updateData,
        companyName: body.companyName,
        companyType: body.companyType,
        companyNumber: body.companyNumber || null,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone || null,
        contactFax: body.contactFax || null,
        website: body.website || null,
        vatNumber: body.vatNumber || null,
        yearEstablished: body.yearEstablished ? parseInt(body.yearEstablished) : null,
        numberOfEmployees: body.numberOfEmployees ? parseInt(body.numberOfEmployees) : null,
        annualTurnover: body.annualTurnover ? parseFloat(body.annualTurnover) : null,
        paperworkFrequency: body.paperworkFrequency || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        notes: body.notes || null,
        // Address fields
        tradingAddress: body.tradingAddress || null,
        residentialAddress: body.residentialAddress || null,
        // Post-creation questionnaire fields
        ...(body.isVatEnabled !== undefined && { isVatEnabled: body.isVatEnabled }),
        ...(body.vatRegistrationDate !== undefined && { 
          vatRegistrationDate: body.vatRegistrationDate ? new Date(body.vatRegistrationDate) : null 
        }),
        ...(body.vatReturnsFrequency !== undefined && { vatReturnsFrequency: body.vatReturnsFrequency }),
        ...(body.vatQuarterGroup !== undefined && { vatQuarterGroup: body.vatQuarterGroup }),
        ...(body.nextVatReturnDue !== undefined && { 
          nextVatReturnDue: body.nextVatReturnDue ? new Date(body.nextVatReturnDue) : null 
        }),
        ...(body.requiresPayroll !== undefined && { requiresPayroll: body.requiresPayroll }),
        ...(body.requiresBookkeeping !== undefined && { requiresBookkeeping: body.requiresBookkeeping }),
        ...(body.requiresManagementAccounts !== undefined && { requiresManagementAccounts: body.requiresManagementAccounts }),
        ...(body.preferredContactMethod !== undefined && { preferredContactMethod: body.preferredContactMethod }),
        ...(body.specialInstructions !== undefined && { specialInstructions: body.specialInstructions }),
      }
    }

    // Update client
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      client: updatedClient,
      message: 'Client updated successfully',
    })

  } catch (error) {
    console.error('Error updating client:', error)
    
    if (error instanceof Error) {
      // Handle Prisma unique constraint violations
      if (error.message.includes('Unique constraint failed')) {
        if (error.message.includes('companyNumber')) {
          return NextResponse.json(
            { success: false, error: 'A client with this company number already exists' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { success: false, error: 'A client with these details already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[id]
 * 
 * Delete a specific client (Manager and Partner only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers and partners can delete clients
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Manager or Partner access required' },
        { status: 403 }
      )
    }

    // Check if client exists
    const existingClient = await db.client.findUnique({
      where: { id: params.id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Delete client
    await db.client.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    )
  }
} 