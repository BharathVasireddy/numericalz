import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const SendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'Content is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  templateId: z.string().min(1, 'Template ID is required')
})

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Send Email API: Starting request processing')

    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Send Email API: Authentication failed - No session')
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to send emails'
      }, { status: 401 })
    }

    console.log(`✅ Send Email API: User authenticated - ${session.user.name} (${session.user.email})`)

    // Validate request body
    let body, validatedData
    try {
      body = await request.json()
      validatedData = SendEmailSchema.parse(body)
      console.log(`✅ Send Email API: Request data validated for template ID "${validatedData.templateId}"`)
    } catch (validationError) {
      console.error('❌ Send Email API: Request validation failed:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Invalid request data',
          message: 'Please check your input and try again',
          details: validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, { status: 400 })
      }
      return NextResponse.json({
        error: 'Invalid request format',
        message: 'Please check your request format and try again'
      }, { status: 400 })
    }

    // Fetch client to verify it exists
    console.log(`🔍 Send Email API: Looking up client ID: ${validatedData.clientId}`)
    const client = await db.client.findUnique({
      where: { id: validatedData.clientId },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!client) {
      console.error(`❌ Send Email API: Client not found - ID: ${validatedData.clientId}`)
      return NextResponse.json({ 
        error: 'Client not found',
        message: 'The selected client could not be found. Please refresh and try again.'
      }, { status: 404 })
    }

    console.log(`✅ Send Email API: Client found - ${client.companyName} (${client.clientCode})`)

    // Get template to verify it exists
    console.log(`🔍 Send Email API: Looking up template ID: ${validatedData.templateId}`)
    const template = await db.emailTemplate.findUnique({
      where: { id: validatedData.templateId }
    })

    if (!template) {
      console.error(`❌ Send Email API: Template not found - ID: ${validatedData.templateId}`)
      return NextResponse.json({ 
        error: 'Template not found',
        message: 'The selected template could not be found. Please refresh and try again.'
      }, { status: 404 })
    }

    console.log(`✅ Send Email API: Template found - ${template.name}`)

    // Get sender email settings from database
    let senderEmail = 'notifications@cloud9digital.in'
    let senderName = 'Numericalz'
    try {
      const emailSettings = await db.settings.findMany({
        where: { key: { in: ['senderEmail', 'senderName'] } }
      })
      
      emailSettings.forEach(setting => {
        if (setting.key === 'senderEmail') senderEmail = setting.value
        if (setting.key === 'senderName') senderName = setting.value
      })
      
      console.log(`✅ Send Email API: Using configured sender: ${senderName} <${senderEmail}>`)
    } catch (error) {
      console.log(`⚠️ Send Email API: Using default sender settings due to error:`, error)
    }

    // Validate environment configuration
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ Send Email API: BREVO_API_KEY not configured')
      return NextResponse.json({
        error: 'Email service not configured',
        message: 'The email service is not properly configured. Please contact system administrator.'
      }, { status: 500 })
    }

    // Send email using Brevo API
    console.log(`📧 Send Email API: Sending email to ${validatedData.to}`)
    let brevoResponse
    try {
      brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY!
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [
            {
              email: validatedData.to,
              name: client.contactName || client.companyName
            }
          ],
          subject: validatedData.subject,
          htmlContent: validatedData.htmlContent,
          textContent: validatedData.htmlContent.replace(/<[^>]*>/g, '')
        })
      })
    } catch (networkError) {
      console.error('❌ Send Email API: Network error while sending email:', networkError)
      return NextResponse.json({
        error: 'Network error',
        message: 'Unable to connect to email service. Please check your internet connection and try again.'
      }, { status: 503 })
    }

    if (!brevoResponse.ok) {
      let errorDetails
      try {
        errorDetails = await brevoResponse.json()
      } catch {
        errorDetails = { message: 'Unknown error' }
      }
      
      console.error('❌ Send Email API: Brevo API error:', {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        error: errorDetails
      })

      if (brevoResponse.status === 401) {
        return NextResponse.json({
          error: 'Email service authentication failed',
          message: 'Email service configuration is invalid. Please contact system administrator.'
        }, { status: 500 })
      }

      if (brevoResponse.status === 400) {
        return NextResponse.json({
          error: 'Invalid email data',
          message: 'The email data is invalid. Please check your template content and try again.'
        }, { status: 400 })
      }

      return NextResponse.json({
        error: 'Email service error',
        message: 'Failed to send email. Please try again later or contact support.'
      }, { status: 500 })
    }

    console.log('✅ Send Email API: Email sent successfully via Brevo')

    // Log the email activity
    console.log('📝 Send Email API: Logging email activity to database')
    try {
      await db.emailLog.create({
        data: {
          subject: validatedData.subject,
          content: validatedData.htmlContent,
          recipientEmail: validatedData.to,
          recipientName: client.contactName || client.companyName,
          emailType: 'CLIENT_COMMUNICATION',
          status: 'SENT',
          sentAt: new Date(),
          triggeredBy: session.user.id,
          clientId: validatedData.clientId,
          templateId: validatedData.templateId,
          fromEmail: senderEmail,
          fromName: senderName
        }
      })
      console.log('✅ Send Email API: Email activity logged successfully')
    } catch (dbError) {
      console.error('❌ Send Email API: Failed to log email activity:', dbError)
      // Don't fail the request if logging fails, but warn the user
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent successfully, but activity logging failed',
        warning: 'Email was sent but may not appear in email history'
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent and logged successfully',
      details: {
        recipient: validatedData.to,
        client: `${client.companyName} (${client.clientCode})`,
        template: template.name,
        sentBy: session.user.name
      }
    })

  } catch (error) {
    console.error('❌ Send Email API: Unexpected error:', error)
    
    // Handle specific error types
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

    // Database connection errors
    if ((error instanceof Error && error.message?.includes('connection')) || 
        (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P1001')) {
      return NextResponse.json({
        error: 'Database connection error',
        message: 'Unable to connect to database. Please try again later.'
      }, { status: 503 })
    }

    // General database errors
    if (typeof error === 'object' && error !== null && 'code' in error && 
        typeof error.code === 'string' && error.code.startsWith('P')) {
      return NextResponse.json({
        error: 'Database error',
        message: 'A database error occurred. Please try again later.'
      }, { status: 500 })
    }
    
    // Generic server error
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later or contact support.',
      errorId: new Date().toISOString() // For tracking in logs
    }, { status: 500 })
  }
} 