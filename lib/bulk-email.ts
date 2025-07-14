import { db } from '@/lib/db'
import { emailService } from '@/lib/email-service'
import { processEmailVariables } from '@/lib/email-variables'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import type { NextRequest } from 'next/server'
import { createOptimizedEmailTemplate, analyzeEmailContent } from '@/lib/email-optimization'

interface VATQuarterWithClient {
  id: string
  quarterPeriod: string
  client: {
    id: string
    clientCode: string
    companyName: string
    contactEmail: string | null
  }
  assignedUser?: {
    id: string
    name: string
    email: string
  } | null
}

interface BulkVATEmailParams {
  quarters: VATQuarterWithClient[]
  templateId: string
  customSubject?: string
  customMessage?: string
  request: NextRequest
}

interface BulkEmailResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  results: Array<{
    quarterId: string
    clientCode: string
    companyName: string
    success: boolean
    message?: string
    error?: string
  }>
}

export async function sendBulkVATEmails({
  quarters,
  templateId,
  customSubject,
  customMessage,
  request
}: BulkVATEmailParams): Promise<BulkEmailResult> {
  let successCount = 0
  let errorCount = 0
  const results = []

  // Get email template
  const template = await db.emailTemplate.findUnique({
    where: { id: templateId }
  })

  if (!template) {
    throw new Error('Email template not found')
  }

  // Process each quarter
  for (const quarter of quarters) {
    try {
      // Check if client has email
      if (!quarter.client.contactEmail) {
        results.push({
          quarterId: quarter.id,
          clientCode: quarter.client.clientCode,
          companyName: quarter.client.companyName,
          success: false,
          error: 'No contact email available'
        })
        errorCount++
        continue
      }

      // Prepare email variables
      const emailVariables = {
        CLIENT_NAME: quarter.client.companyName,
        CLIENT_CODE: quarter.client.clientCode,
        VAT_QUARTER_PERIOD: quarter.quarterPeriod,
        ASSIGNED_USER_NAME: quarter.assignedUser?.name || 'Unassigned',
        CONTACT_EMAIL: quarter.client.contactEmail,
        CURRENT_DATE: new Date().toLocaleDateString('en-GB'),
        CURRENT_YEAR: new Date().getFullYear().toString()
      }

      // Replace template variables
      let emailSubject = customSubject || template.subject || `VAT Quarter ${quarter.quarterPeriod} - ${quarter.client.companyName}`
      let emailBody = customMessage || template.htmlContent || ''

      // Replace variables in subject and body
      Object.entries(emailVariables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value)
        emailBody = emailBody.replace(new RegExp(placeholder, 'g'), value)
      })

      // 🔧 GMAIL OPTIMIZATION: Optimize email content to prevent clipping
      const optimizedHtmlContent = await createOptimizedEmailTemplate(emailBody, {
        subject: emailSubject,
        companyName: 'Numericalz'
      })

      // Analyze email content for optimization insights
      const analysis = analyzeEmailContent(optimizedHtmlContent)
      if (!analysis.isOptimal) {
        console.warn(`📧 Bulk VAT Email: ${analysis.suggestions.join(', ')}`)
      }

      // Send email
      const emailResult = await emailService.sendEmail({
        to: [{ email: quarter.client.contactEmail, name: quarter.client.companyName }],
        subject: emailSubject,
        htmlContent: optimizedHtmlContent,
        emailType: 'VAT_BULK_EMAIL',
        clientId: quarter.client.id,
        workflowType: 'VAT',
        workflowId: quarter.id,
        templateId: templateId,
        templateData: emailVariables
      })

      if (emailResult.success) {
        // Log email activity
        await logActivityEnhanced(request, {
          action: 'VAT_BULK_EMAIL_SENT',
          clientId: quarter.client.id,
          details: {
            recipientEmail: quarter.client.contactEmail,
            templateName: template.name,
            templateId: template.id,
            quarterPeriod: quarter.quarterPeriod,
            messageId: emailResult.messageId,
            bulkOperation: true,
            emailType: 'VAT_BULK_NOTIFICATION'
          }
        })

        results.push({
          quarterId: quarter.id,
          clientCode: quarter.client.clientCode,
          companyName: quarter.client.companyName,
          success: true,
          message: 'Email sent successfully'
        })
        successCount++
      } else {
        results.push({
          quarterId: quarter.id,
          clientCode: quarter.client.clientCode,
          companyName: quarter.client.companyName,
          success: false,
          error: emailResult.error || 'Failed to send email'
        })
        errorCount++
      }
    } catch (error) {
      console.error(`Error sending email for quarter ${quarter.id}:`, error)
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

  return {
    totalProcessed: quarters.length,
    successCount,
    errorCount,
    results
  }
}

// Similar function for Ltd company bulk emails
interface LtdClientWithData {
  id: string
  clientCode: string
  companyName: string
  contactEmail: string | null
  companyNumber?: string
  vatNumber?: string
  contactName?: string
  phone?: string
  nextAccountsDue?: string
  nextCorporationTaxDue?: string
  nextConfirmationDue?: string
  nextYearEnd?: string
  filingPeriodStart?: string
  filingPeriodEnd?: string
  currentStage?: string
  isCompleted?: boolean
  assignedUser?: {
    id: string
    name: string
    email: string
  } | null
}

interface BulkLtdEmailParams {
  clients: LtdClientWithData[]
  templateId: string
  customSubject?: string
  customMessage?: string
  request: NextRequest
}

export async function sendBulkLtdEmails({
  clients,
  templateId,
  customSubject,
  customMessage,
  request
}: BulkLtdEmailParams): Promise<BulkEmailResult> {
  let successCount = 0
  let errorCount = 0
  const results = []

  // Get email template
  const template = await db.emailTemplate.findUnique({
    where: { id: templateId }
  })

  if (!template) {
    throw new Error('Email template not found')
  }

  // Process each client
  for (const client of clients) {
    try {
      // Check if client has email
      if (!client.contactEmail) {
        results.push({
          quarterId: client.id, // Using client ID as the identifier
          clientCode: client.clientCode,
          companyName: client.companyName,
          success: false,
          error: 'No contact email available'
        })
        errorCount++
        continue
      }

      // Prepare comprehensive email data using the proper variable system
      const emailData = {
        client: {
          companyName: client.companyName || '',
          clientCode: client.clientCode || '',
          companyNumber: client.companyNumber || '',
          vatNumber: client.vatNumber || '',
          contactName: client.contactName || '',
          email: client.contactEmail || '',
          phone: client.phone || '',
          assignedUser: client.assignedUser
        },
        user: client.assignedUser ? {
          name: client.assignedUser.name || '',
          email: client.assignedUser.email || ''
        } : null,
        workflow: {
          currentStage: client.currentStage || '',
          workflowType: 'LTD',
          isCompleted: client.isCompleted || false
        },
        accounts: {
          filingPeriod: client.filingPeriodStart && client.filingPeriodEnd ? 
            `${client.filingPeriodStart}_to_${client.filingPeriodEnd}` : '',
          yearEndDate: client.nextYearEnd ? new Date(client.nextYearEnd) : null,
          accountsDueDate: client.nextAccountsDue ? new Date(client.nextAccountsDue) : null,
          corporationTaxDueDate: client.nextCorporationTaxDue ? new Date(client.nextCorporationTaxDue) : null,
          confirmationStatementDueDate: client.nextConfirmationDue ? new Date(client.nextConfirmationDue) : null,
          daysUntilAccountsDue: client.nextAccountsDue ? Math.ceil((new Date(client.nextAccountsDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
          daysUntilCTDue: client.nextCorporationTaxDue ? Math.ceil((new Date(client.nextCorporationTaxDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
          daysUntilCSDue: client.nextConfirmationDue ? Math.ceil((new Date(client.nextConfirmationDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
          isAccountsOverdue: client.nextAccountsDue ? new Date() > new Date(client.nextAccountsDue) : false,
          isCTOverdue: client.nextCorporationTaxDue ? new Date() > new Date(client.nextCorporationTaxDue) : false,
          isCSOverdue: client.nextConfirmationDue ? new Date() > new Date(client.nextConfirmationDue) : false,
          currentStage: client.currentStage || '',
          isCompleted: client.isCompleted || false,
          assignedUser: client.assignedUser
        },
        system: {
          currentDate: new Date(),
          companyName: 'Numericalz'
        }
      }

      // Use the comprehensive variable processing system
      const emailSubject = customSubject || template.subject || `Accounts Filing - ${client.companyName}`
      const emailBody = customMessage || template.htmlContent || ''
      
      const processedSubject = processEmailVariables(emailSubject, emailData)
      const processedBody = processEmailVariables(emailBody, emailData)

      // 🔧 GMAIL OPTIMIZATION: Optimize email content to prevent clipping
      const optimizedHtmlContent = await createOptimizedEmailTemplate(processedBody, {
        subject: processedSubject,
        companyName: 'Numericalz'
      })

      // Analyze email content for optimization insights
      const analysis = analyzeEmailContent(optimizedHtmlContent)
      if (!analysis.isOptimal) {
        console.warn(`📧 Bulk LTD Email: ${analysis.suggestions.join(', ')}`)
      }

      // Send email
      const emailResult = await emailService.sendEmail({
        to: [{ email: client.contactEmail, name: client.companyName }],
        subject: processedSubject,
        htmlContent: optimizedHtmlContent,
        emailType: 'LTD_BULK_EMAIL',
        clientId: client.id,
        workflowType: 'LTD',
        workflowId: client.id,
        templateId: templateId,
        templateData: emailData
      })

      if (emailResult.success) {
        // Log email activity
        await logActivityEnhanced(request, {
          action: 'LTD_BULK_EMAIL_SENT',
          clientId: client.id,
          details: {
            recipientEmail: client.contactEmail,
            templateName: template.name,
            templateId: template.id,
            messageId: emailResult.messageId,
            bulkOperation: true,
            emailType: 'LTD_BULK_NOTIFICATION'
          }
        })

        results.push({
          quarterId: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          success: true,
          message: 'Email sent successfully'
        })
        successCount++
      } else {
        results.push({
          quarterId: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          success: false,
          error: emailResult.error || 'Failed to send email'
        })
        errorCount++
      }
    } catch (error) {
      console.error(`Error sending email for client ${client.id}:`, error)
      results.push({
        quarterId: client.id,
        clientCode: client.clientCode,
        companyName: client.companyName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      errorCount++
    }
  }

  return {
    totalProcessed: clients.length,
    successCount,
    errorCount,
    results
  }
} 