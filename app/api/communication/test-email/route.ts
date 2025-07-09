import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const TestEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'Content is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  templateName: z.string().min(1, 'Template name is required')
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Test Email API: Starting request processing')

    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Test Email API: Authentication failed - No session')
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to send test emails'
      }, { status: 401 })
    }

    console.log(`✅ Test Email API: User authenticated - ${session.user.name} (${session.user.email})`)

    // Validate request body
    let body, validatedData
    try {
      body = await request.json()
      validatedData = TestEmailSchema.parse(body)
      console.log(`✅ Test Email API: Request data validated for template "${validatedData.templateName}"`)
    } catch (validationError) {
      console.error('❌ Test Email API: Request validation failed:', validationError)
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
    console.log(`🔍 Test Email API: Looking up client ID: ${validatedData.clientId}`)
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
      console.error(`❌ Test Email API: Client not found - ID: ${validatedData.clientId}`)
      return NextResponse.json({ 
        error: 'Client not found',
        message: 'The selected client could not be found. Please refresh and try again.'
      }, { status: 404 })
    }

    console.log(`✅ Test Email API: Client found - ${client.companyName} (${client.clientCode})`)

    // Get sender email settings from database
    let senderEmail = 'notifications@cloud9digital.in'
    let senderName = 'Numericalz'
    let emailSignature = ''
    try {
      const emailSettings = await db.settings.findMany({
        where: { key: { in: ['senderEmail', 'senderName', 'emailSignature'] } }
      })
      
      emailSettings.forEach(setting => {
        if (setting.key === 'senderEmail') senderEmail = setting.value
        if (setting.key === 'senderName') senderName = setting.value
        if (setting.key === 'emailSignature') emailSignature = setting.value
      })
      
      console.log(`✅ Test Email API: Using configured sender: ${senderName} <${senderEmail}>`)
    } catch (error) {
      console.log(`⚠️ Test Email API: Using default sender settings due to error:`, error)
    }

    // Validate environment configuration
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ Test Email API: BREVO_API_KEY not configured')
      return NextResponse.json({
        error: 'Email service not configured',
        message: 'The email service is not properly configured. Please contact system administrator.'
      }, { status: 500 })
    }

    // Send email using Brevo API
    console.log(`📧 Test Email API: Sending test email to ${validatedData.to}`)
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
              name: session.user.name || 'Test User'
            }
          ],
          subject: `[TEST] ${validatedData.subject}`,
          htmlContent: `
            <html>
              <head>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                  body { 
                    font-family: 'Plus Jakarta Sans', Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #374151; 
                    margin: 0; 
                    padding: 0; 
                  }
                  .email-container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: #ffffff; 
                  }
                  .test-banner { 
                    background-color: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin-bottom: 20px; 
                    border-left: 4px solid #007bff; 
                  }
                  .test-banner h3 { 
                    margin: 0; 
                    color: #007bff; 
                    font-family: 'Plus Jakarta Sans', Arial, sans-serif; 
                  }
                  .test-banner p { 
                    margin: 5px 0 0 0; 
                    color: #6c757d; 
                    font-size: 14px; 
                  }
                  .content { 
                    background-color: #ffffff; 
                    padding: 20px; 
                    border-radius: 8px; 
                    border: 1px solid #e9ecef; 
                  }
                  .signature { 
                    margin-top: 24px; 
                    border-top: 1px solid #e5e7eb; 
                    padding-top: 16px; 
                  }
                  .test-footer { 
                    margin-top: 20px; 
                    padding: 15px; 
                    background-color: #f8f9fa; 
                    border-radius: 8px; 
                    font-size: 12px; 
                    color: #6c757d; 
                  }
                  h1, h2, h3, h4, h5, h6 { 
                    font-family: 'Plus Jakarta Sans', Arial, sans-serif; 
                    color: #1f2937; 
                  }
                  p { 
                    margin-bottom: 16px; 
                  }
                </style>
              </head>
              <body>
                <div class="email-container">
                  <div class="test-banner">
                    <h3>Test Email</h3>
                    <p>
                      This is a test email for template: <strong>${validatedData.templateName}</strong><br>
                      Test client: <strong>${client.companyName} (${client.clientCode})</strong><br>
                      Sent by: <strong>${session.user.name || 'Unknown'}</strong>
                    </p>
                  </div>
                  <div class="content">
                    ${validatedData.htmlContent}
                    ${emailSignature ? `<div class="signature">${emailSignature}</div>` : ''}
                  </div>
                  <div class="test-footer">
                    <p style="margin: 0;">
                      This email was sent as a test from the Numericalz email template system. 
                      In production, emails would be sent directly without this test banner.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
          textContent: `
[TEST EMAIL]
Template: ${validatedData.templateName}
Test Client: ${client.companyName} (${client.clientCode})
Sent by: ${session.user.name || 'Unknown'}

---

${validatedData.htmlContent.replace(/<[^>]*>/g, '')}

${emailSignature ? `\n\n${emailSignature.replace(/<[^>]*>/g, '')}` : ''}

---
This email was sent as a test from the Numericalz email template system.
          `,
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
            'X-Mailer': 'Numericalz Internal Management System',
            'Reply-To': senderEmail
          }
        })
      })
    } catch (networkError) {
      console.error('❌ Test Email API: Network error while sending email:', networkError)
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
      
      console.error('❌ Test Email API: Brevo API error:', {
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
        message: 'Failed to send test email. Please try again later or contact support.'
      }, { status: 500 })
    }

    console.log('✅ Test Email API: Email sent successfully via Brevo')

    // Log the test email activity
    console.log('📝 Test Email API: Logging email activity to database')
    try {
      await db.emailLog.create({
        data: {
          subject: `[TEST] ${validatedData.subject}`,
          content: validatedData.htmlContent,
          recipientEmail: validatedData.to,
          recipientName: session.user.name || 'Test User',
          emailType: 'TEST_EMAIL',
          status: 'SENT',
          sentAt: new Date(),
                  triggeredBy: session.user.id,
        clientId: validatedData.clientId,
        fromEmail: senderEmail,
        fromName: senderName,
          templateData: JSON.stringify({
            isTest: true,
            templateName: validatedData.templateName,
            testSentBy: session.user.name,
            clientCompanyName: client.companyName,
            clientCode: client.clientCode
          })
        }
      })
      console.log('✅ Test Email API: Email activity logged successfully')
    } catch (dbError) {
      console.error('❌ Test Email API: Failed to log email activity:', dbError)
      // Don't fail the request if logging fails, but warn the user
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully, but activity logging failed',
        warning: 'Email was sent but may not appear in email history'
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent and logged successfully',
      details: {
        recipient: validatedData.to,
        client: `${client.companyName} (${client.clientCode})`,
        template: validatedData.templateName,
        sentBy: session.user.name
      }
    })

  } catch (error) {
    console.error('❌ Test Email API: Unexpected error:', error)
    
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