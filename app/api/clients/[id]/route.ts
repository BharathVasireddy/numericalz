import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { VAT_QUARTER_GROUPS } from '@/lib/vat-workflow'
import { logClientActivity, ActivityTypes } from '@/lib/activity-logger'

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
        vatAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ltdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        nonLtdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        vatQuartersWorkflow: {
          where: { isCompleted: false },
          select: {
            assignedUserId: true,
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
    if (session.user.role === 'STAFF') {
      const isAssigned = client.assignedUserId === session.user.id ||
                        client.vatAssignedUserId === session.user.id ||
                        client.ltdCompanyAssignedUserId === session.user.id ||
                        client.nonLtdCompanyAssignedUserId === session.user.id ||
                        client.vatQuartersWorkflow.some(quarter => quarter.assignedUserId === session.user.id)
      
      if (!isAssigned) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Fetch chase team users separately if they exist
    let chaseTeamUsers: Array<{
      id: string
      name: string | null
      email: string
      role: string
    }> = []
    if (client.chaseTeamUserIds && client.chaseTeamUserIds.length > 0) {
      chaseTeamUsers = await db.user.findMany({
        where: {
          id: {
            in: client.chaseTeamUserIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        chaseTeamUsers,
      },
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
    
    // 🛡️ CRITICAL PROTECTION: Client codes can NEVER be modified
    if (body.clientCode !== undefined) {
      return NextResponse.json(
        { success: false, error: 'Client codes cannot be modified once assigned' },
        { status: 400 }
      )
    }

    // Debug logging
    console.log('🔍 PUT /api/clients/[id] - Received body:', JSON.stringify(body, null, 2))
    console.log('🔍 PUT /api/clients/[id] - Client ID:', params.id)
    console.log('🔍 PUT /api/clients/[id] - User role:', session.user.role)

    // Check if this is a questionnaire update (less restrictive) or full update (manager only)
    const isQuestionnaireUpdate = Object.keys(body).every(key => 
      ['isVatEnabled', 'vatNumber', 'vatRegistrationDate', 'vatReturnsFrequency', 'nextVatReturnDue', 
       'requiresPayroll', 'requiresBookkeeping', 'requiresManagementAccounts', 
       'preferredContactMethod', 'specialInstructions', 'vatQuarterGroup', 'chaseTeamUserIds'].includes(key)
    )
    
    console.log('🔍 PUT /api/clients/[id] - Is questionnaire update:', isQuestionnaireUpdate)

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

    // Validate questionnaire data before processing
    if (isQuestionnaireUpdate) {
      if (body.vatRegistrationDate && body.vatRegistrationDate.trim() && isNaN(Date.parse(body.vatRegistrationDate))) {
        return NextResponse.json(
          { success: false, error: 'Invalid VAT registration date format' },
          { status: 400 }
        )
      }
      
      if (body.nextVatReturnDue && body.nextVatReturnDue.trim() && isNaN(Date.parse(body.nextVatReturnDue))) {
        return NextResponse.json(
          { success: false, error: 'Invalid VAT return due date format' },
          { status: 400 }
        )
      }
      
      if (body.vatReturnsFrequency && !['QUARTERLY', 'MONTHLY', 'ANNUALLY'].includes(body.vatReturnsFrequency)) {
        return NextResponse.json(
          { success: false, error: 'Invalid VAT returns frequency' },
          { status: 400 }
        )
      }
      
      if (body.vatQuarterGroup && !Object.keys(VAT_QUARTER_GROUPS).includes(body.vatQuarterGroup)) {
        return NextResponse.json(
          { success: false, error: 'Invalid VAT quarter group' },
          { status: 400 }
        )
      }
      
      if (body.preferredContactMethod && !['EMAIL', 'PHONE', 'POST', 'IN_PERSON'].includes(body.preferredContactMethod)) {
        return NextResponse.json(
          { success: false, error: 'Invalid preferred contact method' },
          { status: 400 }
        )
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
        ...(body.vatNumber !== undefined && { vatNumber: body.vatNumber || null }),
        ...(body.vatRegistrationDate !== undefined && { 
          vatRegistrationDate: (body.vatRegistrationDate && body.vatRegistrationDate.trim()) ? new Date(body.vatRegistrationDate) : null 
        }),
        ...(body.vatReturnsFrequency !== undefined && { vatReturnsFrequency: body.vatReturnsFrequency }),
        ...(body.vatQuarterGroup !== undefined && { vatQuarterGroup: body.vatQuarterGroup }),
        ...(body.nextVatReturnDue !== undefined && { 
          nextVatReturnDue: (body.nextVatReturnDue && body.nextVatReturnDue.trim()) ? new Date(body.nextVatReturnDue) : null 
        }),
        ...(body.requiresPayroll !== undefined && { requiresPayroll: body.requiresPayroll }),
        ...(body.requiresBookkeeping !== undefined && { requiresBookkeeping: body.requiresBookkeeping }),
        ...(body.requiresManagementAccounts !== undefined && { requiresManagementAccounts: body.requiresManagementAccounts }),
        ...(body.preferredContactMethod !== undefined && { preferredContactMethod: body.preferredContactMethod }),
        ...(body.specialInstructions !== undefined && { specialInstructions: body.specialInstructions }),
        ...(body.chaseTeamUserIds !== undefined && { chaseTeamUserIds: body.chaseTeamUserIds }),
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
          vatRegistrationDate: (body.vatRegistrationDate && body.vatRegistrationDate.trim()) ? new Date(body.vatRegistrationDate) : null 
        }),
        ...(body.vatReturnsFrequency !== undefined && { vatReturnsFrequency: body.vatReturnsFrequency }),
        ...(body.vatQuarterGroup !== undefined && { vatQuarterGroup: body.vatQuarterGroup }),
        ...(body.nextVatReturnDue !== undefined && { 
          nextVatReturnDue: (body.nextVatReturnDue && body.nextVatReturnDue.trim()) ? new Date(body.nextVatReturnDue) : null 
        }),
        ...(body.requiresPayroll !== undefined && { requiresPayroll: body.requiresPayroll }),
        ...(body.requiresBookkeeping !== undefined && { requiresBookkeeping: body.requiresBookkeeping }),
        ...(body.requiresManagementAccounts !== undefined && { requiresManagementAccounts: body.requiresManagementAccounts }),
        ...(body.preferredContactMethod !== undefined && { preferredContactMethod: body.preferredContactMethod }),
        ...(body.specialInstructions !== undefined && { specialInstructions: body.specialInstructions }),
        ...(body.chaseTeamUserIds !== undefined && { chaseTeamUserIds: body.chaseTeamUserIds }),
      }
    }

    console.log('🔍 PUT /api/clients/[id] - Final updateData:', JSON.stringify(updateData, null, 2))

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

    // Fetch chase team users separately if they exist
    let chaseTeamUsers: Array<{
      id: string
      name: string | null
      email: string
      role: string
    }> = []
    if (updatedClient.chaseTeamUserIds && updatedClient.chaseTeamUserIds.length > 0) {
      chaseTeamUsers = await db.user.findMany({
        where: {
          id: {
            in: updatedClient.chaseTeamUserIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      client: {
        ...updatedClient,
        chaseTeamUsers,
      },
      message: 'Client updated successfully',
    })

  } catch (error) {
    console.error('❌ Error updating client:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      clientId: params.id,
      updateData: 'See previous logs'
    })
    
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
      
      // Handle validation errors
      if (error.message.includes('Invalid value') || error.message.includes('Expected')) {
        console.error('❌ Prisma validation error:', error.message)
        console.error('❌ Full error:', error)
        return NextResponse.json(
          { success: false, error: `Validation error: ${error.message}` },
          { status: 400 }
        )
      }
      
      // Handle any database constraint errors
      if (error.message.includes('constraint') || error.message.includes('violates')) {
        console.error('❌ Database constraint error:', error.message)
        return NextResponse.json(
          { success: false, error: `Database constraint error: ${error.message}` },
          { status: 400 }
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
 * FIXED: Delete a specific client with proper cascading delete logic
 * Handles all related records to prevent foreign key constraint violations
 * (Manager and Partner only)
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
      include: {
        // Include related records to understand dependencies
        ltdAccountsWorkflows: true,
        vatQuartersWorkflow: true,
        activityLogs: true
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // CRITICAL: Use database transaction to ensure all related records are deleted properly
    await db.$transaction(async (tx) => {
      console.log(`🗑️ Deleting client ${params.id} with cascading deletes...`)
      
      // 1. Delete VAT workflow history first (if any)
      if (existingClient.vatQuartersWorkflow.length > 0) {
        console.log(`   Deleting ${existingClient.vatQuartersWorkflow.length} VAT quarters...`)
        
        for (const vatQuarter of existingClient.vatQuartersWorkflow) {
          // Delete VAT workflow history for this quarter (correct model name)
          await tx.vATWorkflowHistory.deleteMany({
            where: { vatQuarterId: vatQuarter.id }
          })
        }
        
        // Delete VAT quarters (correct model name)
        await tx.vATQuarter.deleteMany({
          where: { clientId: params.id }
        })
      }
      
      // 2. Delete Ltd Accounts workflows and their history
      if (existingClient.ltdAccountsWorkflows.length > 0) {
        console.log(`   Deleting ${existingClient.ltdAccountsWorkflows.length} Ltd accounts workflows...`)
        
        for (const workflow of existingClient.ltdAccountsWorkflows) {
          // Delete workflow history for this workflow (correct field name)
          await tx.ltdAccountsWorkflowHistory.deleteMany({
            where: { ltdAccountsWorkflowId: workflow.id }
          })
        }
        
        // Delete Ltd accounts workflows
        await tx.ltdAccountsWorkflow.deleteMany({
          where: { clientId: params.id }
        })
      }
      
      // 3. Delete activity logs
      if (existingClient.activityLogs.length > 0) {
        console.log(`   Deleting ${existingClient.activityLogs.length} activity logs...`)
        await tx.activityLog.deleteMany({
          where: { clientId: params.id }
        })
      }
      
      // 4. Delete any communications
      await tx.communication.deleteMany({
        where: { clientId: params.id }
      })
      
      // 5. Finally, delete the client
      console.log(`   Deleting client record...`)
      await tx.client.delete({
        where: { id: params.id }
      })
      
      console.log(`✅ Client ${params.id} and all related records deleted successfully`)
    })

    // Log the deletion activity
    await logClientActivity(
      session.user.id,
      ActivityTypes.CLIENT_DELETED,
      params.id,
      {
        clientName: existingClient.companyName,
        companyNumber: existingClient.companyNumber || undefined,
        reason: `Deleted client: ${existingClient.companyName} (${existingClient.clientCode})`
      },
      request
    )

    return NextResponse.json({
      success: true,
      message: 'Client and all related records deleted successfully',
      deletedClient: {
        id: existingClient.id,
        companyName: existingClient.companyName,
        clientCode: existingClient.clientCode
      }
    })

  } catch (error) {
    console.error('❌ Error deleting client:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete client: There are still related records. Please contact support.',
            details: error.message
          },
          { status: 409 }
        )
      }
      
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Client not found or already deleted' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete client',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 