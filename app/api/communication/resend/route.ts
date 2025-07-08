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

    // Get the original email log
    const originalEmail = await db.emailLog.findUnique({
      where: { id: validatedData.emailLogId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true
          }
        }
      }
    })

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
      subject: `[RESENT] ${validatedData.subject}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
            <h4 style="margin: 0; color: #1565c0;">📧 Resent Email</h4>
            <p style="margin: 5px 0 0 0; color: #1976d2; font-size: 14px;">
              This email was resent by <strong>${session.user.name}</strong> from the Numericalz email history.
              Original email was sent on ${new Date(originalEmail.createdAt).toLocaleString('en-GB')}.
            </p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
            ${validatedData.htmlContent}
          </div>
          <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px; font-size: 12px; color: #666;">
            <p style="margin: 0;">
              This email was resent from the Numericalz Internal Management System.
              Original email ID: ${validatedData.emailLogId}
            </p>
          </div>
        </div>
      `,
      emailType: 'RESENT_EMAIL',
      triggeredBy: session.user.id,
      clientId: validatedData.clientId,
      templateData: {
        isResent: true,
        originalEmailId: validatedData.emailLogId,
        resentBy: session.user.name,
        resentAt: new Date().toISOString(),
        originalSubject: originalEmail.subject,
        originalSentAt: originalEmail.createdAt.toISOString()
      }
    })

    if (result.success) {
      console.log('✅ Email resent successfully and logged to database')
      return NextResponse.json({ 
        success: true, 
        message: 'Email resent successfully',
        details: {
          recipient: validatedData.to,
          client: originalEmail.client ? `${originalEmail.client.companyName} (${originalEmail.client.clientCode})` : undefined,
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