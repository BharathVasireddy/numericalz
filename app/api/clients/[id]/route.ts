import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { VAT_QUARTER_GROUPS, calculateVATQuarter, isVATFilingMonth } from '@/lib/vat-workflow'
import { logClientActivity, ActivityTypes } from '@/lib/activity-logger'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

// Helper function to parse address JSON and map to database fields
function parseAddressFields(addressString: string, type: 'trading' | 'residential') {
  if (!addressString || addressString.trim() === '') {
    return {}
  }

  try {
    const address = JSON.parse(addressString)
    const prefix = type === 'trading' ? 'tradingAddress' : 'residentialAddress'
    
    return {
      [`${prefix}Line1`]: address.address_line_1 || null,
      [`${prefix}Line2`]: address.address_line_2 || null,
      [`${prefix}Country`]: address.country || null,
      [`${prefix}PostCode`]: address.postal_code || null,
      // Note: locality/region are not in schema, skipping them
    }
  } catch (error) {
    console.warn(`Failed to parse ${type} address:`, error)
    return {}
  }
}

// Helper function to reconstruct JSON address from individual database fields
function reconstructAddressFields(client: any, type: 'trading' | 'residential'): string | null {
  const prefix = type === 'trading' ? 'tradingAddress' : 'residentialAddress'
  
  const addressLine1 = client[`${prefix}Line1`]
  const addressLine2 = client[`${prefix}Line2`]
  const country = client[`${prefix}Country`]
  const postCode = client[`${prefix}PostCode`]
  
  // Only reconstruct if we have at least one address field
  if (!addressLine1 && !addressLine2 && !country && !postCode) {
    return null
  }
  
  const address = {
    address_line_1: addressLine1 || '',
    address_line_2: addressLine2 || '',
    country: country || '',
    postal_code: postCode || '',
    locality: '', // Not stored in database
    region: '', // Not stored in database
  }
  
  // Remove empty fields
  Object.keys(address).forEach(key => {
    if (!address[key as keyof typeof address]) {
      delete address[key as keyof typeof address]
    }
  })
  
  return Object.keys(address).length > 0 ? JSON.stringify(address) : null
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

    // Reconstruct JSON address fields for the edit form
    const tradingAddress = reconstructAddressFields(client, 'trading')
    const residentialAddress = reconstructAddressFields(client, 'residential')
    
    console.log('🔍 GET /api/clients/[id] - Reconstructed addresses:', {
      tradingAddress,
      residentialAddress,
      originalFields: {
        tradingAddressLine1: client.tradingAddressLine1,
        tradingAddressLine2: client.tradingAddressLine2,
        tradingAddressCountry: client.tradingAddressCountry,
        tradingAddressPostCode: client.tradingAddressPostCode,
      }
    })
    
    const clientWithAddresses = {
      ...client,
      chaseTeamUsers,
      tradingAddress,
      residentialAddress,
    }

    return NextResponse.json({
      success: true,
      client: clientWithAddresses,
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
    
    // 🛡️ Client code validation: Allow changes but ensure uniqueness
    if (body.clientCode !== undefined) {
      // Check if client code is being changed
      const existingClient = await db.client.findUnique({
        where: { id: params.id },
        select: { clientCode: true }
      })
      
      if (existingClient && body.clientCode !== existingClient.clientCode) {
        // Check if the new client code is already in use
        const duplicateClient = await db.client.findFirst({
          where: { 
            clientCode: body.clientCode,
            id: { not: params.id } // Exclude current client
          },
          select: { id: true }
        })
        
        if (duplicateClient) {
          return NextResponse.json(
            { success: false, error: 'Client code already exists. Please choose a different code.' },
            { status: 400 }
          )
        }
      }
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
        clientCode: body.clientCode || null,
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
        // Corporation Tax due date (editable field)
        nextCorporationTaxDue: body.nextCorporationTaxDue ? new Date(body.nextCorporationTaxDue) : null,
        // Handle address fields - parse JSON address data to individual fields
        ...parseAddressFields(body.tradingAddress, 'trading'),
        ...parseAddressFields(body.residentialAddress, 'residential'),
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

    // 🚀 AUTOMATIC VAT QUARTER CREATION - New Feature!
    // If client just enabled VAT with quarter group during their filing month, create quarter automatically
    if (isQuestionnaireUpdate && 
        body.isVatEnabled === true && 
        body.vatQuarterGroup && 
        updatedClient.vatQuarterGroup) {
      
      try {
        // Check if current month is a filing month for this quarter group
        const londonNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
        const currentMonth = londonNow.getMonth() + 1
        
        if (isVATFilingMonth(updatedClient.vatQuarterGroup, currentMonth)) {
          console.log(`🎯 Client ${updatedClient.clientCode} enabled VAT during filing month - creating quarter automatically`)
          
          // Check if quarter already exists
          const quarterInfo = calculateVATQuarter(updatedClient.vatQuarterGroup)
          const existingQuarter = await db.vATQuarter.findFirst({
            where: {
              clientId: updatedClient.id,
              quarterPeriod: quarterInfo.quarterPeriod
            }
          })
          
          if (!existingQuarter) {
            // Determine initial stage based on quarter end date
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const quarterEndDate = new Date(quarterInfo.quarterEndDate)
            quarterEndDate.setHours(0, 0, 0, 0)
            
            const initialStage = today > quarterEndDate ? 'PAPERWORK_PENDING_CHASE' : 'WAITING_FOR_QUARTER_END'
            
            // Create the VAT quarter in database
            const newVATQuarter = await db.vATQuarter.create({
              data: {
                clientId: updatedClient.id,
                quarterPeriod: quarterInfo.quarterPeriod,
                quarterStartDate: quarterInfo.quarterStartDate,
                quarterEndDate: quarterInfo.quarterEndDate,
                filingDueDate: quarterInfo.filingDueDate,
                quarterGroup: quarterInfo.quarterGroup,
                currentStage: initialStage,
                isCompleted: false,
                assignedUserId: null // Start unassigned (ready for manager assignment)
              }
            })
            
            // Create initial workflow history
            await db.vATWorkflowHistory.create({
              data: {
                vatQuarterId: newVATQuarter.id,
                toStage: initialStage,
                stageChangedAt: new Date(),
                userId: session.user.id,
                userName: session.user.name || session.user.email || 'Unknown User',
                userEmail: session.user.email || '',
                userRole: session.user.role || 'USER',
                notes: `VAT quarter auto-created during client onboarding - Current month (${currentMonth}) is filing month for quarter group ${updatedClient.vatQuarterGroup}`
              }
            })
            
            console.log(`✅ Auto-created VAT quarter ${quarterInfo.quarterPeriod} for client ${updatedClient.clientCode}`)
            console.log(`   Quarter ID: ${newVATQuarter.id}`)
            console.log(`   Stage: ${initialStage}`)
            console.log(`   Filing Due: ${quarterInfo.filingDueDate.toISOString().split('T')[0]}`)
            console.log(`   🎯 Client will now appear in VAT unassigned dashboard widgets!`)
          } else {
            console.log(`⚠️ VAT quarter ${quarterInfo.quarterPeriod} already exists for client ${updatedClient.clientCode}`)
          }
        } else {
          console.log(`📅 Current month (${currentMonth}) is not a filing month for quarter group ${updatedClient.vatQuarterGroup} - quarter will be auto-created on next filing month`)
        }
      } catch (autoQuarterError) {
        // Don't fail the main request if auto-quarter creation fails
        console.error('❌ Error auto-creating VAT quarter:', autoQuarterError)
        console.error(`   Client: ${updatedClient.clientCode} (${updatedClient.companyName})`)
        console.error(`   Quarter Group: ${updatedClient.vatQuarterGroup}`)
        // Continue with normal response - auto-creation is a bonus feature
      }
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