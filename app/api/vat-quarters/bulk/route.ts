import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { z } from 'zod'
import { sendBulkVATEmails } from '@/lib/bulk-email'

const VATBulkOperationSchema = z.object({
  quarterIds: z.array(z.string()).min(1, 'At least one quarter must be selected'),
  operation: z.enum(['assign', 'email'], {
    errorMap: () => ({ message: 'Invalid operation type' })
  }),
  // For assignment operations
  assignedUserId: z.string().optional(),
  // For email operations
  templateId: z.string().optional(),
  customSubject: z.string().optional(),
  customMessage: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and partners can perform bulk operations
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only managers and partners can perform bulk operations.' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { quarterIds, operation, assignedUserId, templateId, customSubject, customMessage } = VATBulkOperationSchema.parse(body)

    // Validate quarters exist and get data
    const quarters = await db.vATQuarter.findMany({
      where: { id: { in: quarterIds } },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            contactEmail: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (quarters.length !== quarterIds.length) {
      return NextResponse.json({ 
        error: 'Some quarters were not found' 
      }, { status: 404 })
    }

    let successCount = 0
    let errorCount = 0
    const results = []

    if (operation === 'assign') {
      // Bulk assignment operation
      if (!assignedUserId) {
        return NextResponse.json({ 
          error: 'User ID is required for assignment operation' 
        }, { status: 400 })
      }

      // Validate user exists (unless unassigning)
      let assignedUser = null
      if (assignedUserId !== 'unassigned') {
        assignedUser = await db.user.findUnique({
          where: { id: assignedUserId },
          select: { id: true, name: true, email: true }
        })

        if (!assignedUser) {
          return NextResponse.json({ 
            error: 'Assigned user not found' 
          }, { status: 404 })
        }
      }

      // Perform bulk assignment
      for (const quarter of quarters) {
        try {
          const previousAssignee = quarter.assignedUser?.name || 'Unassigned'
          const newAssignee = assignedUserId === 'unassigned' ? null : assignedUserId
          const newAssigneeName = assignedUserId === 'unassigned' ? 'Unassigned' : assignedUser?.name

          await db.vATQuarter.update({
            where: { id: quarter.id },
            data: { assignedUserId: newAssignee }
          })

          // Log the assignment activity
          await logActivityEnhanced(request, {
            action: assignedUserId === 'unassigned' ? 'VAT_QUARTER_UNASSIGNED' : 'VAT_QUARTER_ASSIGNED',
            clientId: quarter.client.id,
            details: {
              quarterPeriod: quarter.quarterPeriod,
              previousAssignee,
              newAssignee: newAssigneeName,
              assignedBy: session.user.name,
              bulkOperation: true
            }
          })

          results.push({
            quarterId: quarter.id,
            clientCode: quarter.client.clientCode,
            companyName: quarter.client.companyName,
            success: true,
            message: `Assigned to ${newAssigneeName}`
          })
          successCount++
        } catch (error) {
          console.error(`Error assigning quarter ${quarter.id}:`, error)
          results.push({
            quarterId: quarter.id,
            clientCode: quarter.client.clientCode,
            companyName: quarter.client.companyName,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          errorCount++
        }
      }
    } else if (operation === 'email') {
      // Bulk email operation
      if (!templateId) {
        return NextResponse.json({ 
          error: 'Template ID is required for email operation' 
        }, { status: 400 })
      }

      try {
        const emailResult = await sendBulkVATEmails({
          quarters,
          templateId,
          customSubject,
          customMessage,
          request
        })

        return NextResponse.json({
          success: true,
          operation: 'email',
          totalProcessed: emailResult.totalProcessed,
          successCount: emailResult.successCount,
          errorCount: emailResult.errorCount,
          results: emailResult.results,
          message: `Bulk email operation completed. ${emailResult.successCount} emails sent successfully, ${emailResult.errorCount} failed.`
        })
      } catch (error) {
        console.error('Bulk email error:', error)
        return NextResponse.json({ 
          error: 'Failed to send bulk emails',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      operation,
      totalProcessed: quarters.length,
      successCount,
      errorCount,
      results,
      message: `Bulk ${operation} operation completed. ${successCount} successful, ${errorCount} failed.`
    })

  } catch (error) {
    console.error('VAT bulk operation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 