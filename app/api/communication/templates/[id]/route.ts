import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255, 'Name too long'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject too long'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  category: z.enum([
    'GENERAL',
    'VAT_WORKFLOW',
    'ACCOUNTS_WORKFLOW',
    'CHASE_REMINDERS',
    'DEADLINE_NOTIFICATIONS',
    'COMPLETION_NOTIFICATIONS',
    'QUERY_REQUESTS',
    'APPROVAL_REQUESTS',
    'FILING_CONFIRMATIONS',
    'WELCOME_ONBOARDING',
    'MARKETING',
    'SYSTEM_NOTIFICATIONS'
  ]),
  description: z.string().optional(),
  isActive: z.boolean()
})

// GET /api/communication/templates/[id] - Get specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await db.emailTemplate.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Error fetching email template:', error)
    return NextResponse.json({
      error: 'Failed to fetch email template'
    }, { status: 500 })
  }
}

// PUT /api/communication/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update templates
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Partners and Managers can update templates.' 
      }, { status: 403 })
    }

    const template = await db.emailTemplate.findUnique({
      where: { id: params.id }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if it's a system template and user is not the creator
    if (template.isSystem && session.user.role !== 'PARTNER') {
      return NextResponse.json({
        error: 'Cannot modify system templates'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = UpdateTemplateSchema.parse(body)

    // Check if new name conflicts with existing template (excluding current one)
    if (validatedData.name !== template.name) {
      const existingTemplate = await db.emailTemplate.findUnique({
        where: { name: validatedData.name }
      })

      if (existingTemplate) {
        return NextResponse.json({
          error: 'A template with this name already exists'
        }, { status: 409 })
      }
    }

    const updatedTemplate = await db.emailTemplate.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: 'Email template updated successfully'
    })

  } catch (error) {
    console.error('Error updating email template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Failed to update email template'
    }, { status: 500 })
  }
}

// DELETE /api/communication/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to delete templates
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Partners and Managers can delete templates.' 
      }, { status: 403 })
    }

    const template = await db.emailTemplate.findUnique({
      where: { id: params.id }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Prevent deletion of system templates
    if (template.isSystem) {
      return NextResponse.json({
        error: 'Cannot delete system templates'
      }, { status: 403 })
    }

    // Check if template is being used in any email logs
    const emailLogsCount = await db.emailLog.count({
      where: { templateId: params.id }
    })

    if (emailLogsCount > 0) {
      return NextResponse.json({
        error: `Cannot delete template. It has been used in ${emailLogsCount} email(s). Consider deactivating it instead.`
      }, { status: 409 })
    }

    await db.emailTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting email template:', error)
    return NextResponse.json({
      error: 'Failed to delete email template'
    }, { status: 500 })
  }
} 