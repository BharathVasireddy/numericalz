/**
 * Assignment Notification Service
 * 
 * Handles sending detailed email notifications when users are assigned to client work
 * Supports both VAT quarters and Ltd company accounts assignments
 */

import { emailService, VATAssignmentParams, LtdAssignmentParams } from './email-service'
import { db } from './db'
import { logActivityEnhanced } from './activity-middleware'

interface AssignmentNotificationContext {
  assignedBy: {
    id: string
    name: string
    email: string
    role: string
  }
  request?: any // For activity logging
}

export class AssignmentNotificationService {
  /**
   * Send VAT assignment notification with full client and quarter details
   */
  static async sendVATAssignmentNotification(
    clientId: string,
    vatQuarterId: string,
    assignedUserId: string,
    context: AssignmentNotificationContext,
    previousAssignee?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get assigned user details
      const assignedUser = await db.user.findUnique({
        where: { id: assignedUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      })

      if (!assignedUser) {
        return { success: false, error: 'Assigned user not found' }
      }

      // Get client and VAT quarter details with all necessary information
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          companyName: true,
          companyNumber: true,
          clientCode: true,
          vatNumber: true
        }
      })

      const vatQuarter = await db.vATQuarter.findUnique({
        where: { id: vatQuarterId },
        select: {
          id: true,
          quarterPeriod: true,
          quarterStartDate: true,
          quarterEndDate: true,
          filingDueDate: true,
          currentStage: true
        }
      })

      if (!client || !vatQuarter) {
        return { success: false, error: 'Client or VAT quarter not found' }
      }

      // Prepare assignment notification parameters
      const assignmentParams: VATAssignmentParams = {
        to: {
          email: assignedUser.email,
          name: assignedUser.name || assignedUser.email
        },
        clientData: {
          id: client.id,
          companyName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          vatNumber: client.vatNumber || undefined,
          clientCode: client.clientCode
        },
        vatQuarter: {
          quarterPeriod: vatQuarter.quarterPeriod,
          quarterStartDate: vatQuarter.quarterStartDate.toISOString(),
          quarterEndDate: vatQuarter.quarterEndDate.toISOString(),
          filingDueDate: vatQuarter.filingDueDate.toISOString(),
          currentStage: vatQuarter.currentStage
        },
        assignedBy: {
          id: context.assignedBy.id,
          name: context.assignedBy.name || context.assignedBy.email,
          email: context.assignedBy.email
        },
        previousAssignee
      }

      // Send the assignment notification email
      const emailResult = await emailService.sendVATAssignmentNotification(assignmentParams)

      if (emailResult.success) {
        // Log the email notification activity
        if (context.request) {
          await logActivityEnhanced(context.request, {
            action: 'VAT_ASSIGNMENT_EMAIL_SENT',
            clientId,
            details: {
              recipientEmail: assignedUser.email,
              recipientName: assignedUser.name,
              companyName: client.companyName,
              quarterPeriod: vatQuarter.quarterPeriod,
              messageId: emailResult.messageId,
              emailType: 'VAT_ASSIGNMENT_NOTIFICATION'
            }
          })
        }

        console.log(`✅ VAT assignment notification sent to ${assignedUser.email} for ${client.companyName}`)
        return { success: true }
      } else {
        console.error(`❌ Failed to send VAT assignment notification: ${emailResult.error}`)
        return { success: false, error: emailResult.error }
      }

    } catch (error) {
      console.error('Error in VAT assignment notification service:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send Ltd Company assignment notification with full client and deadline details
   */
  static async sendLtdAssignmentNotification(
    clientId: string,
    assignedUserId: string,
    context: AssignmentNotificationContext,
    previousAssignee?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get assigned user details
      const assignedUser = await db.user.findUnique({
        where: { id: assignedUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      })

      if (!assignedUser) {
        return { success: false, error: 'Assigned user not found' }
      }

      // Get client details with all deadline information
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          companyName: true,
          companyNumber: true,
          clientCode: true,
          nextYearEnd: true,
          nextAccountsDue: true,
          nextCorporationTaxDue: true,
          ltdAccountsWorkflows: {
            where: {
              isCompleted: false
            },
            select: {
              id: true,
              currentStage: true,
              filingPeriodEnd: true
            },
            orderBy: {
              filingPeriodEnd: 'desc'
            },
            take: 1
          }
        }
      })

      if (!client) {
        return { success: false, error: 'Client not found' }
      }

      // Get current workflow or create filing period info
      const currentWorkflow = client.ltdAccountsWorkflows[0]
      const filingPeriod = currentWorkflow 
        ? `${currentWorkflow.filingPeriodEnd.getFullYear()} accounts`
        : client.nextYearEnd 
          ? `${new Date(client.nextYearEnd).getFullYear()} accounts`
          : 'Current period'

      // Prepare assignment notification parameters
      const assignmentParams: LtdAssignmentParams = {
        to: {
          email: assignedUser.email,
          name: assignedUser.name || assignedUser.email
        },
        clientData: {
          id: client.id,
          companyName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          clientCode: client.clientCode,
          nextYearEnd: client.nextYearEnd?.toISOString(),
          nextAccountsDue: client.nextAccountsDue?.toISOString(),
          nextCorporationTaxDue: client.nextCorporationTaxDue?.toISOString()
        },
        workflow: {
          currentStage: currentWorkflow?.currentStage || 'WAITING_FOR_YEAR_END',
          filingPeriod
        },
        assignedBy: {
          id: context.assignedBy.id,
          name: context.assignedBy.name || context.assignedBy.email,
          email: context.assignedBy.email
        },
        previousAssignee
      }

      // Send the assignment notification email
      const emailResult = await emailService.sendLtdAssignmentNotification(assignmentParams)

      if (emailResult.success) {
        // Log the email notification activity
        if (context.request) {
          await logActivityEnhanced(context.request, {
            action: 'LTD_ASSIGNMENT_EMAIL_SENT',
            clientId,
            details: {
              recipientEmail: assignedUser.email,
              recipientName: assignedUser.name,
              companyName: client.companyName,
              filingPeriod,
              messageId: emailResult.messageId,
              emailType: 'LTD_ASSIGNMENT_NOTIFICATION'
            }
          })
        }

        console.log(`✅ Ltd assignment notification sent to ${assignedUser.email} for ${client.companyName}`)
        return { success: true }
      } else {
        console.error(`❌ Failed to send Ltd assignment notification: ${emailResult.error}`)
        return { success: false, error: emailResult.error }
      }

    } catch (error) {
      console.error('Error in Ltd assignment notification service:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send notification when a client is assigned (general assignment)
   */
  static async sendGeneralClientAssignmentNotification(
    clientId: string,
    assignedUserId: string,
    context: AssignmentNotificationContext,
    previousAssignee?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get client details to determine if it's VAT-enabled or Ltd company
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          companyType: true,
          isVatEnabled: true,
          vatQuartersWorkflow: {
            where: {
              isCompleted: false
            },
            select: {
              id: true
            },
            take: 1
          }
        }
      })

      if (!client) {
        return { success: false, error: 'Client not found' }
      }

      const results: { success: boolean; error?: string }[] = []

      // If client has VAT enabled and has active quarters, send VAT notification
      if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
        const firstVatQuarter = client.vatQuartersWorkflow[0]
        if (firstVatQuarter) {
          const vatResult = await this.sendVATAssignmentNotification(
            clientId,
            firstVatQuarter.id,
            assignedUserId,
            context,
            previousAssignee
          )
          results.push(vatResult)
        }
      }

      // If client is a limited company, send Ltd notification
      if (client.companyType === 'LIMITED_COMPANY' || client.companyType === 'LIMITED') {
        const ltdResult = await this.sendLtdAssignmentNotification(
          clientId,
          assignedUserId,
          context,
          previousAssignee
        )
        results.push(ltdResult)
      }

      // Check if any notifications were sent successfully
      const anySuccess = results.some(result => result.success)
      const errors = results.filter(result => !result.success).map(result => result.error).filter(Boolean)

      return {
        success: anySuccess,
        error: errors.length > 0 ? errors.join('; ') : undefined
      }

    } catch (error) {
      console.error('Error in general client assignment notification:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
} 