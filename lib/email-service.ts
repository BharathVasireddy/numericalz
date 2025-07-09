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
            fromEmail: this.config.senderEmail,
            fromName: this.config.senderName,
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

      // Send email via Brevo API
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          sender: {
            email: this.config.senderEmail,
            name: this.config.senderName,
          },
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          replyTo: params.replyTo,
          subject: params.subject,
          htmlContent: this.wrapWithProfessionalTemplate(params.htmlContent),
          textContent: params.textContent || this.htmlToText(params.htmlContent),
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
            'X-Mailer': 'Numericalz Internal Management System',
            'Reply-To': this.config.senderEmail
          }
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
   * Wrap HTML content with professional template including Plus Jakarta Sans font
   */
  private wrapWithProfessionalTemplate(htmlContent: string): string {
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #374151; 
              margin: 0; 
              padding: 0; 
              background-color: #f8f9fa;
            }
            .email-container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: #ffffff; 
            }
            .content { 
              padding: 20px; 
            }
            h1, h2, h3, h4, h5, h6 { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              color: #1f2937; 
              margin-top: 0;
            }
            p { 
              margin-bottom: 16px; 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .otp-code { 
              background: #f3f4f6; 
              padding: 20px; 
              border-radius: 8px; 
              text-align: center; 
              margin: 20px 0; 
              font-family: 'Plus Jakarta Sans', 'Courier New', monospace; 
              font-size: 24px; 
              font-weight: 600; 
              color: #1f2937; 
              border: 2px solid #e5e7eb; 
              letter-spacing: 2px;
            }
            .workflow-stage { 
              background: #f0f9ff; 
              padding: 15px; 
              border-radius: 8px; 
              border-left: 4px solid #3b82f6; 
              margin: 20px 0; 
            }
            .assignment-card { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #e2e8f0; 
              margin: 20px 0; 
            }
            .action-button { 
              display: inline-block; 
              background: #3b82f6; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: 500; 
              margin: 20px 0; 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              color: #6b7280; 
              font-size: 14px; 
            }
            table { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            }
            td, th { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            }
            strong, b { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            }
            em, i { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            }
            ul, ol, li { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            }
            a { 
              color: #3b82f6; 
              text-decoration: none; 
            }
            a:hover { 
              text-decoration: underline; 
            }
            /* Force font inheritance for Gmail compatibility */
            * { 
              font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; 
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="content">
              ${htmlContent}
            </div>
          </div>
        </body>
      </html>
    `
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
})

// Export types for use in other modules
export type { 
  WorkflowEmailParams, 
  DeadlineReminderParams, 
  VATAssignmentParams,
  LtdAssignmentParams,
  EmailRecipient 
} 