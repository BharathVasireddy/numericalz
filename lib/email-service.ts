/**
 * Comprehensive Email Service
 * 
 * Handles all email notifications using Brevo (SendinBlue) API
 * Extends the OTP functionality to support workflow notifications, reminders, assignments, etc.
 */

import { EmailTemplates } from './email-templates'

interface EmailConfig {
  apiKey: string
  senderEmail: string
  senderName: string
  replyToEmail?: string
}

interface EmailSettings {
  senderEmail: string
  senderName: string
  replyToEmail: string
  emailSignature: string
  enableTestMode: boolean
}

interface EmailRecipient {
  email: string
  name: string
}

interface SendEmailParams {
  to: EmailRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  replyTo?: EmailRecipient
  emailType?: string
  triggeredBy?: string
  clientId?: string
  workflowType?: string
  workflowId?: string
  templateId?: string
  templateData?: any
}

interface WorkflowEmailParams {
  to: EmailRecipient
  clientName: string
  clientCode: string
  workflowType: 'VAT' | 'ACCOUNTS'
  action: 'approve' | 'rework'
  reviewedBy: 'PARTNER' | 'MANAGER'
  nextStage: string
  comments?: string
  reviewerName: string
  clientId: string
}

interface DeadlineReminderParams {
  to: EmailRecipient
  clientName: string
  clientCode: string
  deadlineType: 'VAT_RETURN' | 'ACCOUNTS' | 'CORPORATION_TAX' | 'CONFIRMATION_STATEMENT'
  dueDate: Date
  daysUntilDue: number
  isOverdue: boolean
}

interface VATAssignmentParams {
  to: EmailRecipient
  clientData: {
    id: string
    companyName: string
    companyNumber?: string
    vatNumber?: string
    clientCode: string
  }
  vatQuarter: {
    quarterPeriod: string
    quarterStartDate: string
    quarterEndDate: string
    filingDueDate: string
    currentStage: string
  }
  assignedBy: {
    id: string
    name: string
    email: string
  }
  previousAssignee?: string
}

interface LtdAssignmentParams {
  to: EmailRecipient
  clientData: {
    id: string
    companyName: string
    companyNumber?: string
    clientCode: string
    nextYearEnd?: string
    nextAccountsDue?: string
    nextCorporationTaxDue?: string
  }
  workflow: {
    currentStage: string
    filingPeriod: string
  }
  assignedBy: {
    id: string
    name: string
    email: string
  }
  previousAssignee?: string
}

class EmailService {
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
  }

  /**
   * Fetch current email settings from branding_settings table
   */
  private async getEmailSettings(): Promise<EmailSettings> {
    try {
      // Use direct PostgreSQL client to avoid Prisma issues
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
        
        // Validate email addresses and provide fallbacks
        const senderEmail = this.validateEmail(row.senderEmail) ? row.senderEmail : this.config.senderEmail
        const replyToEmail = this.validateEmail(row.replyToEmail) ? row.replyToEmail : this.config.replyToEmail || this.config.senderEmail
        
        console.log(`📧 Using email settings: ${row.senderName} <${senderEmail}>, Reply-To: ${replyToEmail}`)
        
        // Ensure replyToEmail is always valid
        if (!this.validateEmail(replyToEmail)) {
          console.warn(`⚠️ Invalid replyToEmail detected: ${replyToEmail}, falling back to senderEmail`)
          const fallbackReplyTo = senderEmail
          return {
            senderEmail,
            senderName: row.senderName || this.config.senderName,
            replyToEmail: fallbackReplyTo,
            emailSignature: row.emailSignature || '',
            enableTestMode: row.enableTestMode || false
          }
        }
        
        return {
          senderEmail,
          senderName: row.senderName || this.config.senderName,
          replyToEmail,
          emailSignature: row.emailSignature || '',
          enableTestMode: row.enableTestMode || false
        }
      }
      
      // Fallback to constructor config if no database settings
      return {
        senderEmail: this.config.senderEmail,
        senderName: this.config.senderName,
        replyToEmail: this.config.replyToEmail || this.config.senderEmail,
        emailSignature: '',
        enableTestMode: false
      }
    } catch (error) {
      console.error('❌ Failed to fetch email settings from database:', error)
      
      // Fallback to constructor config on error
      return {
        senderEmail: this.config.senderEmail,
        senderName: this.config.senderName,
        replyToEmail: this.config.replyToEmail || this.config.senderEmail,
        emailSignature: '',
        enableTestMode: false
      }
    }
  }

  /**
   * Validate email address format
   */
  private validateEmail(email: string): boolean {
    if (!email) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Send a generic email with automatic database logging (like Fluent SMTP)
   * Every email sent through this method is automatically logged to email_logs table
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!params.to || params.to.length === 0) {
      return {
        success: false,
        error: 'No recipients specified'
      }
    }
    
    const primaryRecipient = params.to[0]!
    let emailLogId: string | null = null
    
    try {
      // Fetch current email settings from database
      const emailSettings = await this.getEmailSettings()
      console.log(`📧 Using email settings: ${emailSettings.senderName} <${emailSettings.senderEmail}>, Reply-To: ${emailSettings.replyToEmail}`)
      
      // Import Prisma client for logging (dynamic import to avoid circular dependencies)
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      // Create email log entry BEFORE sending (like Fluent SMTP)
      try {
        const emailLog = await prisma.emailLog.create({
          data: {
            recipientEmail: primaryRecipient.email,
            recipientName: primaryRecipient.name,
            subject: params.subject,
            content: params.htmlContent,
            emailType: params.emailType || 'MANUAL',
            status: 'PENDING',
            clientId: params.clientId,
            workflowType: params.workflowType,
            workflowId: params.workflowId,
            triggeredBy: params.triggeredBy || undefined, // Use undefined for system-generated emails
            fromEmail: emailSettings.senderEmail,
            fromName: emailSettings.senderName,
            templateId: params.templateId,
            templateData: params.templateData ? JSON.stringify(params.templateData) : null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        emailLogId = emailLog.id
        console.log(`📧 Email logged to database: ${emailLogId} - ${params.subject}`)
      } catch (logError) {
        console.error('Failed to create email log entry:', logError)
        // Continue with sending even if logging fails
      }

      // Determine if this should be a high priority email (only templates)
      const isTemplateEmail = params.emailType === 'TEMPLATE' || 
                              params.emailType === 'VAT_BULK_EMAIL' || 
                              params.emailType === 'LTD_BULK_EMAIL' ||
                              params.templateId // Any email using a template

      // Build headers conditionally
      const emailHeaders: Record<string, string> = {
        'X-Mailer': 'Numericalz Internal Management System'
      }

      // Only add importance headers for template emails
      if (isTemplateEmail) {
        emailHeaders['X-Priority'] = '1'
        emailHeaders['X-MSMail-Priority'] = 'High'
        emailHeaders['Importance'] = 'High'
      }

      // Send email via Brevo API
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
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
          htmlContent: this.wrapWithCleanTemplate(params.htmlContent),
          textContent: params.textContent || this.htmlToText(params.htmlContent),
          headers: emailHeaders
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = `Email sending failed: ${response.status} ${response.statusText}`
        
        console.error('Email sending failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          logId: emailLogId
        })

        // Update email log with failure
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
          error: errorMessage
        }
      }

      const result = await response.json()
      console.log('✅ Email sent successfully:', {
        messageId: result.messageId,
        to: params.to.map(r => r.email).join(', '),
        subject: params.subject,
        logId: emailLogId
      })

      // Update email log with success
      if (emailLogId) {
        try {
          await prisma.emailLog.update({
            where: { id: emailLogId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              updatedAt: new Date()
            }
          })
        } catch (updateError) {
          console.error('Failed to update email log with success:', updateError)
        }
      }

      await prisma.$disconnect()
      return {
        success: true,
        messageId: result.messageId
      }
    } catch (error) {
      console.error('❌ Error sending email:', error)
      
      // Update email log with failure
      if (emailLogId) {
        try {
          const { PrismaClient } = require('@prisma/client')
          const prisma = new PrismaClient()
          await prisma.emailLog.update({
            where: { id: emailLogId },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: error instanceof Error ? error.message : 'Unknown error',
              updatedAt: new Date()
            }
          })
          await prisma.$disconnect()
        } catch (updateError) {
          console.error('Failed to update email log with error:', updateError)
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send workflow review notification email
   */
  async sendWorkflowNotification(params: WorkflowEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isApproved = params.action === 'approve'
    const actionEmoji = isApproved ? '✅' : '🔄'
    const actionText = isApproved ? 'Review Approved' : 'Rework Required'
    const actionColor = isApproved ? '#2e7d32' : '#f57c00'
    const actionBg = isApproved ? '#e8f5e8' : '#fff3e0'
    const workflowTypeDisplay = params.workflowType === 'VAT' ? 'VAT Return' : 'Annual Accounts'
    const reviewerRole = params.reviewedBy === 'PARTNER' ? 'Partner' : 'Manager'
    const nextStageText = this.getStageDisplayName(params.nextStage)

    const subject = `${actionEmoji} ${workflowTypeDisplay} ${actionText} - ${params.clientName} (${params.clientCode})`
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${actionText} ${actionEmoji}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Workflow Update Notification</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">Client: ${params.clientName}</h2>
            <p style="color: #666; font-size: 14px; margin: 0; background: #f1f3f4; padding: 8px 12px; border-radius: 4px; display: inline-block;">
              <strong>Client Code:</strong> ${params.clientCode}
            </p>
            
            <div style="margin: 20px 0; padding: 20px; background: ${actionBg}; border-radius: 8px; border-left: 4px solid ${actionColor};">
              <p style="margin: 0; color: ${actionColor}; font-size: 16px; font-weight: bold;">
                ${workflowTypeDisplay} ${isApproved ? 'Approved' : 'Requires Rework'}
              </p>
              <p style="margin: 8px 0 0 0; color: #666;">
                The ${workflowTypeDisplay} has been ${isApproved ? 'approved' : 'sent back for rework'} by the ${reviewerRole}.
              </p>
            </div>
            
            ${params.comments ? `
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
              <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 16px;">
                ${isApproved ? '💬 Review Comments:' : '🔧 Rework Instructions:'}
              </p>
              <p style="margin: 0; color: #555; line-height: 1.6;">${params.comments}</p>
            </div>
            ` : ''}
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; font-size: 18px;">📋 What's Next?</h3>
            <ul style="color: #666; padding-left: 20px; line-height: 1.8;">
              ${isApproved ? `
                <li>✅ ${reviewerRole} review completed successfully</li>
                <li>🚀 Work can proceed to the next stage: <strong>${nextStageText}</strong></li>
                <li>📊 Update workflow status when ready to continue</li>
                ${params.nextStage.includes('CLIENT') ? '<li>📧 Prepare client communication as needed</li>' : ''}
              ` : `
                <li>📝 Review the feedback provided above carefully</li>
                <li>🔧 Make the necessary corrections or improvements</li>
                <li>📊 Update the workflow once changes are complete</li>
                <li>🔄 The work will be re-reviewed once corrections are made</li>
              `}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/${params.workflowType === 'VAT' ? 'vat-dt' : 'ltd-companies'}?client=${params.clientId}" 
               style="background: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              📊 View Workflow Details
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 5px 0;"><strong>Numericalz Internal Management System</strong></p>
            <p style="margin: 5px 0;">Reviewed by: ${params.reviewerName} (${reviewerRole})</p>
            <p style="margin: 5px 0; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail({
      to: [params.to],
      subject,
      htmlContent,
      emailType: 'WORKFLOW_REVIEW_COMPLETE',
      clientId: params.clientId,
      workflowType: params.workflowType,
      templateData: {
        action: params.action,
        workflowType: params.workflowType,
        reviewedBy: params.reviewedBy,
        reviewerName: params.reviewerName,
        clientCode: params.clientCode,
        comments: params.comments
      }
    })
  }

  /**
   * Send deadline reminder email
   */
  async sendDeadlineReminder(params: DeadlineReminderParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const deadlineTypeMap = {
      'VAT_RETURN': { name: 'VAT Return', icon: '📊', color: '#1976d2' },
      'ACCOUNTS': { name: 'Annual Accounts', icon: '📋', color: '#2e7d32' },
      'CORPORATION_TAX': { name: 'Corporation Tax', icon: '💰', color: '#f57c00' },
      'CONFIRMATION_STATEMENT': { name: 'Confirmation Statement', icon: '📄', color: '#9c27b0' }
    }

    const deadlineInfo = deadlineTypeMap[params.deadlineType]
    const urgencyColor = params.isOverdue ? '#d32f2f' : params.daysUntilDue <= 7 ? '#f57c00' : '#2e7d32'
    const urgencyBg = params.isOverdue ? '#ffebee' : params.daysUntilDue <= 7 ? '#fff3e0' : '#e8f5e8'
    
    const statusText = params.isOverdue 
      ? `⚠️ OVERDUE by ${Math.abs(params.daysUntilDue)} days`
      : params.daysUntilDue <= 7 
        ? `⏰ Due in ${params.daysUntilDue} days`
        : `📅 Due in ${params.daysUntilDue} days`

    const subject = `${deadlineInfo.icon} ${statusText} - ${params.clientName} ${deadlineInfo.name}`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, ${deadlineInfo.color} 0%, ${urgencyColor} 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${deadlineInfo.icon} ${deadlineInfo.name} Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Deadline Notification</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0; font-size: 22px;">Client: ${params.clientName}</h2>
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0; background: #f1f3f4; padding: 8px 12px; border-radius: 4px; display: inline-block;">
              <strong>Client Code:</strong> ${params.clientCode}
            </p>
            
            <div style="background: ${urgencyBg}; padding: 20px; border-radius: 8px; border-left: 4px solid ${urgencyColor}; margin: 20px 0;">
              <p style="margin: 0; color: ${urgencyColor}; font-size: 18px; font-weight: bold;">
                ${statusText}
              </p>
              <p style="margin: 8px 0 0 0; color: #666; font-size: 16px;">
                Due Date: <strong>${params.dueDate.toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong>
              </p>
            </div>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; font-size: 18px;">📋 Action Required</h3>
            <ul style="color: #666; padding-left: 20px; line-height: 1.8;">
              ${params.isOverdue ? `
                <li>🚨 This ${deadlineInfo.name} is now overdue</li>
                <li>📞 Contact the client immediately if not yet filed</li>
                <li>⚡ Prioritize completion to avoid penalties</li>
              ` : params.daysUntilDue <= 7 ? `
                <li>⚠️ This ${deadlineInfo.name} is due very soon</li>
                <li>📊 Ensure all documentation is ready</li>
                <li>📧 Prepare for submission or client communication</li>
              ` : `
                <li>📅 Plan ahead for this upcoming ${deadlineInfo.name}</li>
                <li>📋 Gather necessary documentation</li>
                <li>📞 Contact client if information is needed</li>
              `}
              <li>📊 Update workflow status once completed</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard/clients" 
               style="background: ${deadlineInfo.color}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              📊 View Client Details
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 5px 0;"><strong>Numericalz Internal Management System</strong></p>
            <p style="margin: 5px 0; font-size: 12px;">This is an automated reminder. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail({
      to: [params.to],
      subject,
      htmlContent,
      emailType: 'DEADLINE_REMINDER',
      templateData: {
        deadlineType: params.deadlineType,
        clientName: params.clientName,
        clientCode: params.clientCode,
        daysUntilDue: params.daysUntilDue,
        isOverdue: params.isOverdue,
        dueDate: params.dueDate.toISOString()
      }
    })
  }

  /**
   * Send VAT assignment notification email
   */
  async sendVATAssignmentNotification(params: VATAssignmentParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Calculate days until due
      const filingDueDate = new Date(params.vatQuarter.filingDueDate)
      const today = new Date()
      const daysUntilDue = Math.ceil((filingDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const isOverdue = daysUntilDue < 0

      // Generate email using enhanced template
      const emailData = EmailTemplates.generateVATAssignmentEmail({
        assigneeName: params.to.name,
        companyName: params.clientData.companyName,
        companyNumber: params.clientData.companyNumber,
        vatNumber: params.clientData.vatNumber,
        clientCode: params.clientData.clientCode,
        quarterPeriod: params.vatQuarter.quarterPeriod,
        quarterStartDate: params.vatQuarter.quarterStartDate,
        quarterEndDate: params.vatQuarter.quarterEndDate,
        filingDueDate: params.vatQuarter.filingDueDate,
        daysUntilDue,
        currentStage: params.vatQuarter.currentStage,
        assignedBy: params.assignedBy.name,
        isOverdue,
        previousAssignee: params.previousAssignee
      })

      return this.sendEmail({
        to: [params.to],
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        emailType: 'VAT_ASSIGNMENT',
        clientId: params.clientData.id,
        workflowType: 'VAT',
        triggeredBy: params.assignedBy.id,
        templateData: {
          assigneeName: params.to.name,
          companyName: params.clientData.companyName,
          clientCode: params.clientData.clientCode,
          quarterPeriod: params.vatQuarter.quarterPeriod,
          assignedBy: params.assignedBy.name,
          previousAssignee: params.previousAssignee
        }
      })
    } catch (error) {
      console.error('Error sending VAT assignment notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send Ltd Company assignment notification email
   */
  async sendLtdAssignmentNotification(params: LtdAssignmentParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Calculate days until deadlines
      const accountsDueDate = params.clientData.nextAccountsDue ? new Date(params.clientData.nextAccountsDue) : new Date()
      const ctDueDate = params.clientData.nextCorporationTaxDue ? new Date(params.clientData.nextCorporationTaxDue) : new Date()
      const yearEndDate = params.clientData.nextYearEnd ? new Date(params.clientData.nextYearEnd) : new Date()
      
      const today = new Date()
      const daysUntilAccountsDue = Math.ceil((accountsDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const daysUntilCTDue = Math.ceil((ctDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      const isAccountsOverdue = daysUntilAccountsDue < 0
      const isCTOverdue = daysUntilCTDue < 0

      // Generate email using enhanced template
      const emailData = EmailTemplates.generateLtdAssignmentEmail({
        assigneeName: params.to.name,
        companyName: params.clientData.companyName,
        companyNumber: params.clientData.companyNumber,
        clientCode: params.clientData.clientCode,
        yearEndDate: yearEndDate.toISOString(),
        accountsDueDate: accountsDueDate.toISOString(),
        corporationTaxDueDate: ctDueDate.toISOString(),
        daysUntilAccountsDue,
        daysUntilCTDue,
        currentStage: params.workflow.currentStage,
        assignedBy: params.assignedBy.name,
        isAccountsOverdue,
        isCTOverdue,
        previousAssignee: params.previousAssignee,
        filingPeriod: params.workflow.filingPeriod
      })

      return this.sendEmail({
        to: [params.to],
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        emailType: 'LTD_ASSIGNMENT',
        clientId: params.clientData.id,
        workflowType: 'ACCOUNTS',
        triggeredBy: params.assignedBy.id,
        templateData: {
          assigneeName: params.to.name,
          companyName: params.clientData.companyName,
          clientCode: params.clientData.clientCode,
          filingPeriod: params.workflow.filingPeriod,
          assignedBy: params.assignedBy.name,
          previousAssignee: params.previousAssignee
        }
      })
    } catch (error) {
      console.error('Error sending Ltd assignment notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send enhanced workflow stage change notification
   */
  async sendEnhancedWorkflowStageChangeNotification(params: {
    to: EmailRecipient
    companyName: string
    clientCode: string
    workflowType: 'VAT' | 'ACCOUNTS'
    fromStage: string
    toStage: string
    changedBy: string
    comments?: string
    quarterPeriod?: string
    filingPeriod?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Generate email using enhanced template
      const emailData = EmailTemplates.generateWorkflowStageChangeEmail({
        assigneeName: params.to.name,
        companyName: params.companyName,
        clientCode: params.clientCode,
        workflowType: params.workflowType,
        fromStage: params.fromStage,
        toStage: params.toStage,
        changedBy: params.changedBy,
        comments: params.comments,
        quarterPeriod: params.quarterPeriod,
        filingPeriod: params.filingPeriod
      })

      return this.sendEmail({
        to: [params.to],
        subject: emailData.subject,
        htmlContent: emailData.htmlContent
      })
    } catch (error) {
      console.error('Error sending enhanced workflow stage change notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Wrap HTML content with clean, clipping-resistant template
   * Reduces Gmail truncation by using minimal HTML structure
   */
  private wrapWithCleanTemplate(htmlContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 20px;
      background: #f9f9f9;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .content { 
      line-height: 1.6; 
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #eee; 
      text-align: center; 
      color: #666; 
      font-size: 12px; 
    }
    a { color: #0066cc; }
    h1, h2, h3 { color: #333; }
    p { margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      ${htmlContent}
    </div>
    <div class="footer">
      <p>Numericalz Internal Management System</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
  }

  private getStageDisplayName(stage: string): string {
    // Implement your logic to get a display name for the stage
    return stage;
  }
}

// Create and export the email service instance
export const emailService = new EmailService({
  apiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'notifications@cloud9digital.in',
  senderName: 'Numericalz',
  replyToEmail: process.env.BREVO_REPLY_TO_EMAIL || 'support@numericalz.com'
})

// Export types for use in other modules
export type { 
  WorkflowEmailParams, 
  DeadlineReminderParams, 
  VATAssignmentParams,
  LtdAssignmentParams,
  EmailRecipient 
} 