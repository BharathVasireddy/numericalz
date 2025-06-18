import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'
import { calculateVATQuarter, VAT_WORKFLOW_STAGE_NAMES } from '@/lib/vat-workflow'

/**
 * POST /api/vat-quarters/bulk
 * Bulk operations for VAT quarters
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has manager/partner role for bulk operations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['MANAGER', 'PARTNER'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for bulk operations' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { operation, data } = body

    switch (operation) {
      case 'CREATE_QUARTERS':
        return await bulkCreateQuarters(data, session.user.id)
      
      case 'UPDATE_STAGES':
        return await bulkUpdateStages(data, session.user)
      
      case 'ASSIGN_USERS':
        return await bulkAssignUsers(data, session.user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid bulk operation' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in bulk VAT operations:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}

/**
 * Bulk create VAT quarters for multiple clients
 */
async function bulkCreateQuarters(data: any, userId: string) {
  const { clientIds, referenceDate } = data

  if (!clientIds || !Array.isArray(clientIds)) {
    return NextResponse.json({ 
      error: 'Client IDs array is required' 
    }, { status: 400 })
  }

  const results = []
  const errors = []

  for (const clientId of clientIds) {
    try {
      // Get client with VAT settings
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
        errors.push({ clientId, error: 'Client not found' })
        continue
      }

      if (!client.isVatEnabled || !client.vatQuarterGroup) {
        errors.push({ 
          clientId, 
          error: 'Client must be VAT enabled with quarter group' 
        })
        continue
      }

      // Calculate quarter information
      const refDate = referenceDate ? new Date(referenceDate) : new Date()
      const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, refDate)

      // Check if quarter already exists
      const existingQuarter = await prisma.vATQuarter.findFirst({
        where: {
          clientId,
          quarterPeriod: quarterInfo.quarterPeriod
        }
      })

      if (existingQuarter) {
        errors.push({ 
          clientId, 
          error: 'Quarter already exists for this period' 
        })
        continue
      }

      // Create VAT quarter
      const vatQuarter = await prisma.vATQuarter.create({
        data: {
          clientId,
          quarterPeriod: quarterInfo.quarterPeriod,
          quarterStartDate: quarterInfo.quarterStartDate,
          quarterEndDate: quarterInfo.quarterEndDate,
          filingDueDate: quarterInfo.filingDueDate,
          quarterGroup: quarterInfo.quarterGroup,
          assignedUserId: client.assignedUserId,
        }
      })

      // Create initial workflow history
      await prisma.vATWorkflowHistory.create({
        data: {
          vatQuarterId: vatQuarter.id,
          toStage: 'CLIENT_BOOKKEEPING',
          stageChangedAt: new Date(),
          userId,
          userName: 'System (Bulk Operation)',
          userEmail: '',
          userRole: 'SYSTEM',
          notes: 'VAT quarter created via bulk operation',
        }
      })

      results.push({ 
        clientId, 
        vatQuarterId: vatQuarter.id,
        quarterPeriod: quarterInfo.quarterPeriod 
      })

    } catch (error) {
      console.error(`Error creating quarter for client ${clientId}:`, error)
      errors.push({ clientId, error: 'Failed to create quarter' })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      created: results,
      errors,
      summary: {
        total: clientIds.length,
        successful: results.length,
        failed: errors.length
      }
    }
  })
}

/**
 * Bulk update workflow stages
 */
async function bulkUpdateStages(data: any, user: any) {
  const { vatQuarterIds, stage, comments } = data

  if (!vatQuarterIds || !Array.isArray(vatQuarterIds)) {
    return NextResponse.json({ 
      error: 'VAT quarter IDs array is required' 
    }, { status: 400 })
  }

  if (!stage || !Object.keys(VAT_WORKFLOW_STAGE_NAMES).includes(stage)) {
    return NextResponse.json({ 
      error: 'Valid workflow stage is required' 
    }, { status: 400 })
  }

  const results = []
  const errors = []

  for (const vatQuarterId of vatQuarterIds) {
    try {
      // Update VAT quarter
      const updatedQuarter = await prisma.vATQuarter.update({
        where: { id: vatQuarterId },
        data: {
          currentStage: stage,
          isCompleted: stage === 'FILED_TO_HMRC',
        }
      })

      // Create workflow history
      await prisma.vATWorkflowHistory.create({
        data: {
          vatQuarterId,
          toStage: stage,
          stageChangedAt: new Date(),
          userId: user.id,
          userName: user.name || user.email || 'Unknown User',
          userEmail: user.email || '',
          userRole: 'USER',
          notes: comments || `Bulk update to: ${VAT_WORKFLOW_STAGE_NAMES[stage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}`,
        }
      })

      results.push({ vatQuarterId, stage })

    } catch (error) {
      console.error(`Error updating quarter ${vatQuarterId}:`, error)
      errors.push({ vatQuarterId, error: 'Failed to update stage' })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      updated: results,
      errors,
      summary: {
        total: vatQuarterIds.length,
        successful: results.length,
        failed: errors.length
      }
    }
  })
}

/**
 * Bulk assign users to VAT quarters
 */
async function bulkAssignUsers(data: any, userId: string) {
  const { vatQuarterIds, assignedUserId } = data

  if (!vatQuarterIds || !Array.isArray(vatQuarterIds)) {
    return NextResponse.json({ 
      error: 'VAT quarter IDs array is required' 
    }, { status: 400 })
  }

  if (!assignedUserId) {
    return NextResponse.json({ 
      error: 'Assigned user ID is required' 
    }, { status: 400 })
  }

  // Verify assigned user exists
  const assignedUser = await prisma.user.findUnique({
    where: { id: assignedUserId },
    select: { id: true, name: true, email: true }
  })

  if (!assignedUser) {
    return NextResponse.json({ 
      error: 'Assigned user not found' 
    }, { status: 404 })
  }

  const results = []
  const errors = []

  for (const vatQuarterId of vatQuarterIds) {
    try {
      // Update VAT quarter assignment
      await prisma.vATQuarter.update({
        where: { id: vatQuarterId },
        data: { assignedUserId }
      })

      // Create workflow history entry
      await prisma.vATWorkflowHistory.create({
        data: {
          vatQuarterId,
          toStage: 'CLIENT_BOOKKEEPING',
          stageChangedAt: new Date(),
          userId,
          userName: 'System (Bulk Assignment)',
          userEmail: '',
          userRole: 'SYSTEM',
          notes: `Assigned to: ${assignedUser.name || assignedUser.email}`,
        }
      })

      results.push({ vatQuarterId, assignedUserId })

    } catch (error) {
      console.error(`Error assigning quarter ${vatQuarterId}:`, error)
      errors.push({ vatQuarterId, error: 'Failed to assign user' })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      assigned: results,
      errors,
      summary: {
        total: vatQuarterIds.length,
        successful: results.length,
        failed: errors.length
      }
    }
  })
} 