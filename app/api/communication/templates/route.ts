import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const CreateTemplateSchema = z.object({
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
  ]).default('GENERAL'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

// GET /api/communication/templates - Get all email templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')

    const whereClause: any = {}
    if (category && category !== 'all') {
      whereClause.category = category
    }
    if (active === 'true') {
      whereClause.isActive = true
    }

    const templates = await db.emailTemplate.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isSystem: 'desc' }, // System templates first
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json({
      error: 'Failed to fetch email templates'
    }, { status: 500 })
  }
}

// POST /api/communication/templates - Create new email template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create templates
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only Partners and Managers can create templates.' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CreateTemplateSchema.parse(body)

    // Check if template name already exists
    const existingTemplate = await db.emailTemplate.findUnique({
      where: { name: validatedData.name }
    })

    if (existingTemplate) {
      return NextResponse.json({
        error: 'A template with this name already exists'
      }, { status: 409 })
    }

    const template = await db.emailTemplate.create({
      data: {
        ...validatedData,
        createdBy: session.user.id,
        variables: JSON.stringify([
          '{{client.companyName}}',
          '{{client.contactName}}',
          '{{client.contactEmail}}',
          '{{user.name}}',
          '{{user.email}}',
          '{{currentDate}}',
          '{{quarterPeriod}}',
          '{{filingDueDate}}'
        ]) // Default variables
      },
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
      template,
      message: 'Email template created successfully'
    })

  } catch (error) {
    console.error('Error creating email template:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Failed to create email template'
    }, { status: 500 })
  }
} 