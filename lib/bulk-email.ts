import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { emailService } from '@/lib/email-service'

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

      // Send email
      const emailResult = await emailService.sendEmail({
        to: [{ email: quarter.client.contactEmail, name: quarter.client.companyName }],
        subject: emailSubject,
        htmlContent: emailBody,
        emailType: 'VAT_BULK_EMAIL',
        clientId: quarter.client.id,
        workflowType: 'VAT',
        templateId: template.id,
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

      // Prepare email variables
      const emailVariables = {
        CLIENT_NAME: client.companyName,
        CLIENT_CODE: client.clientCode,
        ASSIGNED_USER_NAME: client.assignedUser?.name || 'Unassigned',
        CONTACT_EMAIL: client.contactEmail,
        CURRENT_DATE: new Date().toLocaleDateString('en-GB'),
        CURRENT_YEAR: new Date().getFullYear().toString()
      }

      // Replace template variables
      let emailSubject = customSubject || template.subject || `Accounts Filing - ${client.companyName}`
      let emailBody = customMessage || template.htmlContent || ''

      // Replace variables in subject and body
      Object.entries(emailVariables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), value)
        emailBody = emailBody.replace(new RegExp(placeholder, 'g'), value)
      })

      // Send email
      const emailResult = await emailService.sendEmail({
        to: [{ email: client.contactEmail, name: client.companyName }],
        subject: emailSubject,
        htmlContent: emailBody,
        emailType: 'LTD_BULK_EMAIL',
        clientId: client.id,
        workflowType: 'LTD',
        templateId: template.id,
        templateData: emailVariables
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