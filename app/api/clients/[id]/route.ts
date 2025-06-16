import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    // Only managers can update clients
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Manager access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

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

    // Validate required fields
    const requiredFields = ['companyName', 'companyType', 'contactName', 'contactEmail']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Update client
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: {
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
        updatedAt: new Date(),
      },
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
 * Delete a specific client (Manager only)
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

    // Only managers can delete clients
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Manager access required' },
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