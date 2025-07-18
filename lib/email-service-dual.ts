/**
 * Dual Provider Email Service
 * 
 * Enhanced email service with automatic failover from Brevo to Resend
 * Handles all email types: workflow notifications, deadline reminders, templates, etc.
 * 
 * RELIABILITY FEATURES:
 * - Brevo primary, Resend fallback
 * - Automatic failover on Brevo failures
 * - Comprehensive error logging
 * - Service status tracking
 * - Email logging for both providers
 */

import { Resend } from 'resend'

// Enhanced email configuration supporting both providers
interface DualEmailConfig {
  // Brevo configuration (primary)
  brevoApiKey: string
  brevoSenderEmail: string
  brevoSenderName: string
  brevoReplyToEmail?: string
  
  // Resend configuration (fallback)
  resendApiKey: string
  resendSenderEmail: string
  resendSenderName: string
  resendReplyToEmail?: string
}

interface EmailSettings {
  senderEmail: string
  senderName: string
  replyToEmail: string
  emailSignature: string
  enableTestMode: boolean
}

interface SendEmailParams {
  to: Array<{ email: string; name?: string }>
  subject: string
  htmlContent: string
  textContent?: string
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  replyTo?: { email: string; name?: string }
  emailType?: string
  triggeredBy?: string
  clientId?: string
  templateData?: any
  priority?: 'HIGH' | 'NORMAL' | 'LOW'
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  service: 'brevo' | 'resend'
  failoverUsed?: boolean
  deliveryTime?: number
}

class DualEmailService {
  private config: DualEmailConfig
  private resend: Resend | null = null

  constructor(config: DualEmailConfig) {
    this.config = config

    // Initialize Resend if API key is available
    if (this.config.resendApiKey) {
      this.resend = new Resend(this.config.resendApiKey)
    } else {
      console.warn('⚠️ RESEND_API_KEY not provided - Resend fallback unavailable')
    }

    console.log('📧 Dual Email Service initialized:', {
      brevoAvailable: !!this.config.brevoApiKey,
      resendAvailable: !!this.resend,
      fallbackEnabled: !!(this.config.brevoApiKey && this.resend)
    })
  }

  /**
   * Validate email address format
   */
  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  /**
   * Fetch current email settings from branding_settings table
   */
  private async getEmailSettings(): Promise<EmailSettings> {
    try {
      const { Client } = require('pg')
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      })
      
      await client.connect()
      
      const result = await client.query('SELECT "senderEmail", "senderName", "replyToEmail", "emailSignature", "enableTestMode" FROM branding_settings ORDER BY id DESC LIMIT 1')
      
      await client.end()
      
      if (result.rows.length > 0) {
        const row = result.rows[0]
        
        // Use appropriate fallbacks based on which service we're using
        const senderEmail = this.validateEmail(row.senderEmail) ? row.senderEmail : 
          (this.config.brevoSenderEmail || this.config.resendSenderEmail)
        const replyToEmail = this.validateEmail(row.replyToEmail) ? row.replyToEmail : 
          (this.config.brevoReplyToEmail || this.config.resendReplyToEmail || senderEmail)
        
        return {
          senderEmail,
          senderName: row.senderName || this.config.brevoSenderName || this.config.resendSenderName,
          replyToEmail,
          emailSignature: row.emailSignature || '',
          enableTestMode: row.enableTestMode || false
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch email settings from database:', error)
    }
    
    // Fallback to config defaults
    return {
      senderEmail: this.config.brevoSenderEmail || this.config.resendSenderEmail,
      senderName: this.config.brevoSenderName || this.config.resendSenderName,
      replyToEmail: this.config.brevoReplyToEmail || this.config.resendReplyToEmail || 
        this.config.brevoSenderEmail || this.config.resendSenderEmail,
      emailSignature: '',
      enableTestMode: false
    }
  }

  /**
   * Send email via Brevo (primary method)
   */
  private async sendViaBrevo(params: SendEmailParams, emailSettings: EmailSettings): Promise<EmailResult> {
    if (!this.config.brevoApiKey) {
      throw new Error('Brevo API key not configured')
    }

    const startTime = Date.now()

    try {
      console.log('📧 Attempting to send email via Brevo (primary)...')
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.brevoApiKey,
        },
        body: JSON.stringify({
          sender: {
            email: emailSettings.senderEmail,
            name: emailSettings.senderName,
          },
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          replyTo: params.replyTo || { email: emailSettings.replyToEmail, name: emailSettings.senderName },
          subject: params.subject,
          htmlContent: await this.wrapWithCleanTemplate(params.htmlContent, emailSettings.emailSignature),
          textContent: params.textContent || this.htmlToText(params.htmlContent),
          headers: {
            'X-Mailer': 'Numericalz Internal Management System',
            'X-Service': 'Brevo-Primary',
            'X-Priority': params.priority === 'HIGH' ? '1' : params.priority === 'LOW' ? '5' : '3'
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Brevo API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      const deliveryTime = Date.now() - startTime

      console.log('✅ Email sent successfully via Brevo', { 
        messageId: result.messageId, 
        deliveryTime: `${deliveryTime}ms` 
      })
      
      return {
        success: true,
        messageId: result.messageId,
        service: 'brevo',
        deliveryTime
      }
    } catch (error) {
      console.error('❌ Brevo email failed:', error)
      throw error
    }
  }

  /**
   * Send email via Resend (fallback method)
   */
  private async sendViaResend(params: SendEmailParams, emailSettings: EmailSettings): Promise<EmailResult> {
    if (!this.resend) {
      throw new Error('Resend not initialized')
    }

    const startTime = Date.now()

    try {
      console.log('📧 Attempting to send email via Resend (fallback)...')
      
      const result = await this.resend.emails.send({
        from: `${emailSettings.senderName} <${emailSettings.senderEmail}>`,
        to: params.to.map(recipient => recipient.email),
        cc: params.cc?.map(recipient => recipient.email),
        bcc: params.bcc?.map(recipient => recipient.email),
        replyTo: params.replyTo?.email || emailSettings.replyToEmail,
        subject: params.subject,
        html: await this.wrapWithCleanTemplate(params.htmlContent, emailSettings.emailSignature),
        text: params.textContent || this.htmlToText(params.htmlContent),
        headers: {
          'X-Mailer': 'Numericalz Internal Management System',
          'X-Service': 'Resend-Fallback',
          'X-Priority': params.priority === 'HIGH' ? '1' : params.priority === 'LOW' ? '5' : '3'
        }
      })

      const deliveryTime = Date.now() - startTime

      console.log('✅ Email sent successfully via Resend', { 
        messageId: result.data?.id, 
        deliveryTime: `${deliveryTime}ms` 
      })
      
      return {
        success: true,
        messageId: result.data?.id,
        service: 'resend',
        deliveryTime,
        failoverUsed: true
      }
    } catch (error) {
      console.error('❌ Resend email failed:', error)
      throw error
    }
  }

  /**
   * Send email with automatic failover from Brevo to Resend
   */
  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    if (!params.to || params.to.length === 0) {
      return {
        success: false,
        error: 'No recipients specified',
        service: 'brevo'
      }
    }

    const primaryRecipient = params.to[0]!
    let emailLogId: string | null = null
    
    try {
      // Fetch current email settings from database
      const emailSettings = await this.getEmailSettings()
      console.log(`📧 Using email settings: ${emailSettings.senderName} <${emailSettings.senderEmail}>`)
      
      // Import Prisma client for logging
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      try {
        // Create email log entry
        const emailLog = await prisma.emailLog.create({
          data: {
            recipientEmail: primaryRecipient.email,
            recipientName: primaryRecipient.name,
            subject: params.subject,
            content: params.htmlContent,
            emailType: params.emailType || 'MANUAL',
            status: 'PENDING',
            triggeredBy: params.triggeredBy,
            clientId: params.clientId,
            templateData: params.templateData ? JSON.stringify(params.templateData) : null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        emailLogId = emailLog.id
        console.log(`📝 Email log created: ${emailLogId}`)
      } catch (logError) {
        console.error('Failed to create email log:', logError)
      }

      let emailResult: EmailResult

      // Try Brevo first (primary)
      if (this.config.brevoApiKey) {
        try {
          emailResult = await this.sendViaBrevo(params, emailSettings)
          
          // Update email log with success
          if (emailLogId) {
            try {
              await prisma.emailLog.update({
                where: { id: emailLogId },
                data: {
                  status: 'SENT',
                  sentAt: new Date(),
                  updatedAt: new Date(),
                  templateData: params.templateData ? 
                    JSON.stringify({
                      ...params.templateData,
                      service: 'brevo',
                      deliveryTime: emailResult.deliveryTime
                    }) : JSON.stringify({
                      service: 'brevo',
                      deliveryTime: emailResult.deliveryTime
                    })
                }
              })
            } catch (updateError) {
              console.error('Failed to update email log with success:', updateError)
            }
          }

          await prisma.$disconnect()
          return emailResult

        } catch (brevoError) {
          console.log('⚠️ Brevo failed, attempting Resend fallback...')
          
          // Try Resend fallback
          if (this.resend) {
            try {
              emailResult = await this.sendViaResend(params, emailSettings)
              
              // Update email log with fallback success
              if (emailLogId) {
                try {
                  await prisma.emailLog.update({
                    where: { id: emailLogId },
                    data: {
                      status: 'SENT',
                      sentAt: new Date(),
                      updatedAt: new Date(),
                      templateData: params.templateData ? 
                        JSON.stringify({
                          ...params.templateData,
                          service: 'resend',
                          fallbackUsed: true,
                          brevoError: brevoError instanceof Error ? brevoError.message : 'Unknown error',
                          deliveryTime: emailResult.deliveryTime
                        }) : JSON.stringify({
                          service: 'resend',
                          fallbackUsed: true,
                          brevoError: brevoError instanceof Error ? brevoError.message : 'Unknown error',
                          deliveryTime: emailResult.deliveryTime
                        })
                    }
                  })
                } catch (updateError) {
                  console.error('Failed to update email log with fallback success:', updateError)
                }
              }

              await prisma.$disconnect()
              return emailResult

            } catch (resendError) {
              console.error('❌ Both email services failed:', resendError)
              
              // Update email log with total failure
              if (emailLogId) {
                try {
                  await prisma.emailLog.update({
                    where: { id: emailLogId },
                    data: {
                      status: 'FAILED',
                      failedAt: new Date(),
                      failureReason: `Both services failed. Brevo: ${brevoError instanceof Error ? brevoError.message : 'Unknown'}. Resend: ${resendError instanceof Error ? resendError.message : 'Unknown'}`,
                      updatedAt: new Date()
                    }
                  })
                } catch (updateError) {
                  console.error('Failed to update email log with failure:', updateError)
                }
              }

              await prisma.$disconnect()
              return {
                success: false,
                error: `Both email services failed. Primary (Brevo): ${brevoError instanceof Error ? brevoError.message : 'Unknown error'}. Fallback (Resend): ${resendError instanceof Error ? resendError.message : 'Unknown error'}`,
                service: 'resend'
              }
            }
          } else {
            // No fallback available
            const errorMessage = `Primary service (Brevo) failed and no fallback configured. Error: ${brevoError instanceof Error ? brevoError.message : 'Unknown error'}`
            
            if (emailLogId) {
              try {
                await prisma.emailLog.update({
                  where: { id: emailLogId },
                  data: {
                    status: 'FAILED',
                    failedAt: new Date(),
                    failureReason: errorMessage,
                    updatedAt: new Date()
                  }
                })
              } catch (updateError) {
                console.error('Failed to update email log with failure:', updateError)
              }
            }

            await prisma.$disconnect()
            return {
              success: false,
              error: errorMessage,
              service: 'brevo'
            }
          }
        }
      } else {
        // No Brevo, try Resend only
        if (this.resend) {
          try {
            emailResult = await this.sendViaResend(params, emailSettings)
            
            if (emailLogId) {
              try {
                await prisma.emailLog.update({
                  where: { id: emailLogId },
                  data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    updatedAt: new Date(),
                    templateData: params.templateData ? 
                      JSON.stringify({
                        ...params.templateData,
                        service: 'resend',
                        deliveryTime: emailResult.deliveryTime
                      }) : JSON.stringify({
                        service: 'resend',
                        deliveryTime: emailResult.deliveryTime
                      })
                  }
                })
              } catch (updateError) {
                console.error('Failed to update email log with success:', updateError)
              }
            }

            await prisma.$disconnect()
            return emailResult

          } catch (error) {
            const errorMessage = `Resend-only sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            
            if (emailLogId) {
              try {
                await prisma.emailLog.update({
                  where: { id: emailLogId },
                  data: {
                    status: 'FAILED',
                    failedAt: new Date(),
                    failureReason: errorMessage,
                    updatedAt: new Date()
                  }
                })
              } catch (updateError) {
                console.error('Failed to update email log with failure:', updateError)
              }
            }

            await prisma.$disconnect()
            return {
              success: false,
              error: errorMessage,
              service: 'resend'
            }
          }
        } else {
          const errorMessage = 'No email service configured'
          
          if (emailLogId) {
            try {
              await prisma.emailLog.update({
                where: { id: emailLogId },
                data: {
                  status: 'FAILED',
                  failedAt: new Date(),
                  failureReason: errorMessage,
                  updatedAt: new Date()
                }
              })
            } catch (updateError) {
              console.error('Failed to update email log with failure:', updateError)
            }
          }

          await prisma.$disconnect()
          return {
            success: false,
            error: errorMessage,
            service: 'brevo'
          }
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in email service:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'brevo'
      }
    }
  }

  /**
   * Send workflow notification with dual provider support
   */
  async sendWorkflowNotification(params: {
    clientId: string
    recipientEmail: string
    recipientName: string
    workflowType: 'VAT' | 'ACCOUNTS'
    reviewType: 'APPROVED' | 'REWORK_REQUIRED'
    reviewerName: string
    comments?: string
    workflowDetails: any
  }): Promise<EmailResult> {
    // Create simple workflow notification HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">
          ${params.workflowType} Workflow ${params.reviewType === 'APPROVED' ? 'Approved' : 'Requires Rework'}
        </h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 16px;">
            Hello ${params.recipientName},
          </p>
          <p style="margin: 0; color: #374151;">
            The ${params.workflowType} workflow for <strong>${params.workflowDetails.clientName}</strong> has been 
            ${params.reviewType === 'APPROVED' ? 'approved' : 'returned for rework'} by ${params.reviewerName}.
          </p>
        </div>

        ${params.comments ? `
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #92400e;">Comments:</h4>
          <p style="margin: 0; color: #92400e;">${params.comments}</p>
        </div>
        ` : ''}

        <div style="margin: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/${params.clientId}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Client Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This is an automated notification from the Numericalz Internal Management System.
        </p>
      </div>
    `

    return this.sendEmail({
      to: [{ email: params.recipientEmail, name: params.recipientName }],
      subject: `${params.workflowType} Workflow ${params.reviewType === 'APPROVED' ? 'Approved' : 'Requires Rework'} - ${params.workflowDetails.clientName}`,
      htmlContent,
      emailType: 'WORKFLOW_NOTIFICATION',
      clientId: params.clientId,
      priority: 'HIGH',
      templateData: {
        workflowType: params.workflowType,
        reviewType: params.reviewType,
        reviewerName: params.reviewerName
      }
    })
  }

  /**
   * Send deadline reminder with dual provider support
   */
  async sendDeadlineReminder(params: {
    clientId: string
    recipientEmail: string
    recipientName: string
    deadlineType: string
    dueDate: Date
    urgencyLevel: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING'
    clientDetails: any
  }): Promise<EmailResult> {
    // Determine urgency styling
    const urgencyColors = {
      'OVERDUE': { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
      'DUE_SOON': { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
      'UPCOMING': { bg: '#f0f9ff', border: '#0ea5e9', text: '#0c4a6e' }
    }
    const colors = urgencyColors[params.urgencyLevel]

    // Create deadline reminder HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">
          ${params.deadlineType} Reminder
        </h2>
        
        <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; color: ${colors.text}; font-size: 18px;">
            ${params.urgencyLevel === 'OVERDUE' ? '⚠️ OVERDUE' : 
              params.urgencyLevel === 'DUE_SOON' ? '🕐 Due Soon' : '📅 Upcoming'}
          </h3>
          <p style="margin: 0; color: ${colors.text}; font-size: 16px;">
            <strong>${params.deadlineType}</strong> for <strong>${params.clientDetails.companyName}</strong>
          </p>
          <p style="margin: 8px 0 0 0; color: ${colors.text};">
            Due: ${params.dueDate.toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 16px;">
            Hello ${params.recipientName},
          </p>
          <p style="margin: 0; color: #374151;">
            This is a ${params.urgencyLevel.toLowerCase().replace('_', ' ')} reminder about an upcoming deadline 
            for ${params.clientDetails.companyName}.
          </p>
        </div>

        <div style="margin: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/${params.clientId}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Client Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This is an automated reminder from the Numericalz Internal Management System.
        </p>
      </div>
    `

    return this.sendEmail({
      to: [{ email: params.recipientEmail, name: params.recipientName }],
      subject: `${params.urgencyLevel === 'OVERDUE' ? '[OVERDUE] ' : ''}${params.deadlineType} Reminder - ${params.clientDetails.companyName}`,
      htmlContent,
      emailType: 'DEADLINE_REMINDER',
      clientId: params.clientId,
      priority: params.urgencyLevel === 'OVERDUE' ? 'HIGH' : 'NORMAL',
      templateData: {
        deadlineType: params.deadlineType,
        urgencyLevel: params.urgencyLevel,
        dueDate: params.dueDate.toISOString()
      }
    })
  }

  /**
   * HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Wrap email content with clean template
   */
  private async wrapWithCleanTemplate(htmlContent: string, signature?: string): Promise<string> {
    return `
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
            .content { 
              background-color: #ffffff; 
              padding: 20px; 
            }
            ${signature ? '.signature { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; }' : ''}
            h1, h2, h3, h4, h5, h6 { 
              font-family: 'Plus Jakarta Sans', Arial, sans-serif; 
              color: #1f2937; 
            }
            p { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="content">
              ${htmlContent}
              ${signature ? `<div class="signature">${signature}</div>` : ''}
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus(): Promise<{
    brevoAvailable: boolean
    resendAvailable: boolean
    fallbackEnabled: boolean
    recentStats?: any
  }> {
    return {
      brevoAvailable: !!this.config.brevoApiKey,
      resendAvailable: !!this.resend,
      fallbackEnabled: !!(this.config.brevoApiKey && this.resend)
    }
  }
}

// Create and export the dual email service instance
export const dualEmailService = new DualEmailService({
  // Brevo configuration (primary)
  brevoApiKey: process.env.BREVO_API_KEY || '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || 'notifications@cloud9digital.in',
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'Numericalz',
  brevoReplyToEmail: process.env.BREVO_REPLY_TO_EMAIL || 'support@numericalz.com',
  
  // Resend configuration (fallback)
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendSenderEmail: process.env.RESEND_SENDER_EMAIL || 'noreply@cloud9digital.in',
  resendSenderName: process.env.RESEND_SENDER_NAME || 'Numericalz',
  resendReplyToEmail: process.env.RESEND_REPLY_TO_EMAIL || 'support@numericalz.com'
})

export default dualEmailService 