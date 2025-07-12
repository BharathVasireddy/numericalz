import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { emailService } from '@/lib/email-service'
import { z } from 'zod'

const ResendEmailSchema = z.object({
  emailLogId: z.string().min(1, 'Email log ID is required'),
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'Content is required'),
  clientId: z.string().optional()
})

// POST /api/communication/resend - Resend email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = ResendEmailSchema.parse(body)

    // Get the original email log (production-compatible query - no template fields)
    const originalEmail = await db.emailLog.findUnique({
      where: { id: validatedData.emailLogId },
      select: {
        id: true,
        createdAt: true,
        recipientEmail: true,
        recipientName: true,
        subject: true,
        content: true,
        emailType: true,
        status: true,
        clientId: true,
        triggeredBy: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        failureReason: true
      }
    })
    
    // Get client data separately if clientId exists
    let clientData = null
    if (originalEmail?.clientId) {
      clientData = await db.client.findUnique({
        where: { id: originalEmail.clientId },
        select: {
          id: true,
          companyName: true,
          clientCode: true
        }
      })
    }

    if (!originalEmail) {
      return NextResponse.json({ 
        error: 'Original email log not found',
        message: 'Cannot resend email - original email log not found'
      }, { status: 404 })
    }

    console.log(`📧 Resending email: ${originalEmail.subject} to ${validatedData.to}`)

    // Resend email using centralized email service (this will automatically log it)
    const result = await emailService.sendEmail({
      to: [{ email: validatedData.to, name: originalEmail.recipientName || 'Recipient' }],
      subject: validatedData.subject, // Use original subject without [RESENT] prefix
      htmlContent: validatedData.htmlContent, // Use original content without resend notice
      emailType: originalEmail.emailType || 'MANUAL', // Use original email type
      triggeredBy: session.user.id,
      clientId: validatedData.clientId,
      templateData: {
        resentBy: session.user.name,
        resentAt: new Date().toISOString(),
        originalEmailId: validatedData.emailLogId
      }
    })

    if (result.success) {
      console.log('✅ Email resent successfully and logged to database')
      return NextResponse.json({ 
        success: true, 
        message: 'Email resent successfully',
        details: {
          recipient: validatedData.to,
          client: clientData ? `${clientData.companyName} (${clientData.clientCode})` : undefined,
          resentBy: session.user.name,
          originalEmailId: validatedData.emailLogId
        }
      })
    } else {
      console.error('❌ Failed to resend email:', result.error)
      return NextResponse.json({
        error: 'Failed to resend email',
        message: result.error || 'An error occurred while resending the email'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error resending email:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        message: 'Please check your input and try again',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while resending the email'
    }, { status: 500 })
  }
} 