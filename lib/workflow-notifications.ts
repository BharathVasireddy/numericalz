/**
 * Workflow Notification Service
 * 
 * Handles both email and in-app notifications for workflow stage changes
 * Sends notifications to relevant stakeholders based on stage changes
 */

import { emailService } from './email-service'
import { EmailTemplates } from './email-templates'
import { db } from './db'
import { 
  createVATWorkflowStageNotification, 
  createAccountsWorkflowStageNotification,
  createVATAssignmentNotification,
  createAccountsAssignmentNotification
} from './in-app-notifications'

interface StageChangeNotificationParams {
  clientId: string
  clientName: string
  clientCode: string
  workflowType: 'VAT' | 'ACCOUNTS'
  fromStage: string | null
  toStage: string
  changedBy: {
    id: string
    name: string
    email: string
    role: string
  }
  assignedUserId?: string | null
  comments?: string
  quarterPeriod?: string // For VAT workflows
  filingPeriod?: string // For Ltd workflows
}

interface NotificationRecipient {
  id: string
  name: string | null
  email: string
  role: string
  reason: string // Why they're receiving this notification
}

export const workflowNotificationService = {
  async sendStageChangeNotifications(params: StageChangeNotificationParams): Promise<void> {
    try {
      // Get all relevant recipients
      const recipients = await this.getNotificationRecipients(params)
      
      if (recipients.length === 0) {
        console.log('⚠️ No recipients found for workflow stage change notification')
        return
      }

      // Send email notifications to each recipient
      const emailPromises = recipients.map(recipient => 
        this.sendStageChangeEmail(params, recipient)
      )

      // Create in-app notifications for each recipient
      const inAppPromises = recipients.map(recipient => 
        this.createInAppNotification(params, recipient)
      )

      // Send both email and in-app notifications
      const [emailResults, inAppResults] = await Promise.allSettled([
        Promise.allSettled(emailPromises),
        Promise.allSettled(inAppPromises)
      ])
      
      // Log email results
      if (emailResults.status === 'fulfilled') {
        emailResults.value.forEach((result, index) => {
          const recipient = recipients[index]
          if (!recipient) {
            console.error(`❌ Missing recipient data for index ${index}`)
            return
          }
          
          if (result.status === 'fulfilled') {
            console.log(`✅ Email notification sent to ${recipient.email} (${recipient.reason})`)
          } else {
            console.error(`❌ Failed to send email notification to ${recipient.email}:`, result.reason)
          }
        })
      }

      // Log in-app notification results
      if (inAppResults.status === 'fulfilled') {
        inAppResults.value.forEach((result, index) => {
          const recipient = recipients[index]
          if (!recipient) {
            console.error(`❌ Missing recipient data for index ${index}`)
            return
          }
          
          if (result.status === 'fulfilled') {
            console.log(`✅ In-app notification created for ${recipient.email} (${recipient.reason})`)
          } else {
            console.error(`❌ Failed to create in-app notification for ${recipient.email}:`, result.reason)
          }
        })
      }

    } catch (error) {
      console.error('❌ Error in sendStageChangeNotifications:', error)
    }
  },

  async getNotificationRecipients(params: StageChangeNotificationParams) {
    const recipients: Array<{
      id: string
      name: string | null
      email: string
      role: string
      reason: string
    }> = []

    try {
      // Get client data including assigned user and chase team
      const client = await db.client.findUnique({
        where: { id: params.clientId },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      if (!client) {
        console.error('❌ Client not found for notification:', params.clientId)
        return recipients
      }

      // Fetch chase team users if they exist
      let chaseTeamUsers: Array<{
        id: string
        name: string | null
        email: string
        role: string
      }> = []
      
      if (client.chaseTeamUserIds && client.chaseTeamUserIds.length > 0) {
        chaseTeamUsers = await db.user.findMany({
          where: {
            id: {
              in: client.chaseTeamUserIds
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      }

      // Get all managers and partners (always notify them)
      const managersAndPartners = await db.user.findMany({
        where: {
          role: {
            in: ['MANAGER', 'PARTNER']
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })

      // Add managers and partners
      managersAndPartners.forEach(user => {
        if (!recipients.find(r => r.id === user.id)) {
          recipients.push({
            ...user,
            reason: `${user.role.toLowerCase()} - workflow oversight`
          })
        }
      })

      // Add assigned user if different from changed by user
      if (client.assignedUser && client.assignedUser.id !== params.changedBy.id) {
        if (!recipients.find(r => r.id === client.assignedUser!.id)) {
          recipients.push({
            ...client.assignedUser,
            reason: 'assigned user'
          })
        }
      }

      // Add chase team members for chase-related stages
      if (this.isChaseRelatedStage(params.toStage) || this.isChaseRelatedStage(params.fromStage)) {
        chaseTeamUsers.forEach(user => {
          if (!recipients.find(r => r.id === user.id)) {
            recipients.push({
              ...user,
              reason: 'chase team member'
            })
          }
        })
      }

      // Add specific assignee for the workflow if different from client assigned user
      if (params.assignedUserId && params.assignedUserId !== client.assignedUserId) {
        const workflowAssignee = await db.user.findUnique({
          where: { id: params.assignedUserId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })

        if (workflowAssignee && !recipients.find(r => r.id === workflowAssignee.id)) {
          recipients.push({
            ...workflowAssignee,
            reason: 'workflow assignee'
          })
        }
      }

      return recipients

    } catch (error) {
      console.error('❌ Error getting notification recipients:', error)
      return recipients
    }
  },

  async sendStageChangeEmail(params: StageChangeNotificationParams, recipient: any): Promise<void> {
    // Generate email content using enhanced template
    const emailTemplate = EmailTemplates.generateWorkflowStageChangeEmail({
      assigneeName: recipient.name || recipient.email,
      companyName: params.clientName,
      clientCode: params.clientCode,
      workflowType: params.workflowType,
      fromStage: params.fromStage || 'Initial',
      toStage: params.toStage,
      changedBy: params.changedBy.name,
      comments: params.comments,
      quarterPeriod: params.quarterPeriod,
      filingPeriod: params.filingPeriod
    })

    // Send email using enhanced template
    const emailResult = await emailService.sendEnhancedWorkflowStageChangeNotification({
      to: {
        email: recipient.email,
        name: recipient.name || recipient.email
      },
      companyName: params.clientName,
      clientCode: params.clientCode,
      workflowType: params.workflowType,
      fromStage: params.fromStage || 'Initial',
      toStage: params.toStage,
      changedBy: params.changedBy.name,
      comments: params.comments,
      quarterPeriod: params.quarterPeriod,
      filingPeriod: params.filingPeriod
    })

    // Log email with full HTML content
    await db.emailLog.create({
      data: {
        fromEmail: 'notifications@cloud9digital.in',
        fromName: 'Numericalz',
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: emailTemplate.subject,
        content: emailTemplate.htmlContent,
        emailType: 'WORKFLOW_STAGE_CHANGE',
        status: emailResult.success ? 'SENT' : 'FAILED',
        sentAt: emailResult.success ? new Date() : null,
        failedAt: emailResult.success ? null : new Date(),
        failureReason: emailResult.success ? null : emailResult.error,
        clientId: params.clientId,
        workflowType: params.workflowType.toLowerCase(),
        triggeredBy: params.changedBy.id
      }
    })
  },

  /**
   * Create in-app notification for workflow stage change
   */
  async createInAppNotification(params: StageChangeNotificationParams, recipient: any): Promise<void> {
    try {
      const stageDisplayName = this.getStageDisplayName(params.toStage)
      
      if (params.workflowType === 'VAT') {
        await createVATWorkflowStageNotification(
          recipient.id,
          params.clientId,
          params.clientName,
          stageDisplayName,
          params.quarterPeriod || ''
        )
      } else if (params.workflowType === 'ACCOUNTS') {
        await createAccountsWorkflowStageNotification(
          recipient.id,
          params.clientId,
          params.clientName,
          stageDisplayName,
          params.filingPeriod || ''
        )
      }
    } catch (error) {
      console.error('❌ Error creating in-app notification:', error)
      throw error
    }
  },

  /**
   * Send assignment notifications (both email and in-app)
   */
  async sendAssignmentNotifications(params: {
    workflowType: 'VAT' | 'ACCOUNTS'
    clientId: string
    clientName: string
    assignedUserId: string
    workflowId: string
    assignedBy: {
      id: string
      name: string
      email: string
      role: string
    }
    quarterPeriod?: string
    filingPeriod?: string
  }): Promise<void> {
    try {
      // Create in-app notification for assigned user
      if (params.workflowType === 'VAT') {
        await createVATAssignmentNotification(
          params.assignedUserId,
          params.clientId,
          params.clientName,
          params.workflowId
        )
      } else if (params.workflowType === 'ACCOUNTS') {
        await createAccountsAssignmentNotification(
          params.assignedUserId,
          params.clientId,
          params.clientName,
          params.workflowId
        )
      }

      console.log(`✅ Assignment notification created for user ${params.assignedUserId}`)

    } catch (error) {
      console.error('❌ Error creating assignment notification:', error)
      throw error
    }
  },

  /**
   * Check if a stage is chase-related
   */
  isChaseRelatedStage(stage: string | null): boolean {
    if (!stage) return false
    return ['PAPERWORK_PENDING_CHASE', 'PAPERWORK_CHASED'].includes(stage)
  },

  /**
   * Get display name for a stage
   */
  getStageDisplayName(stage: string | null): string {
    if (!stage) return 'Initial'
    
    const stageNames: Record<string, string> = {
      // VAT Stages
      'PAPERWORK_PENDING_CHASE': 'Pending to chase',
      'PAPERWORK_CHASED': 'Paperwork chased',
      'PAPERWORK_RECEIVED': 'Paperwork received',
      'WORK_IN_PROGRESS': 'Work in progress',
      'QUERIES_PENDING': 'Queries pending',
      'REVIEW_PENDING_MANAGER': 'Review pending by manager',
      'REVIEWED_BY_MANAGER': 'Reviewed by manager',
      'REVIEW_PENDING_PARTNER': 'Review pending by partner',
      'REVIEWED_BY_PARTNER': 'Reviewed by partner',
      'EMAILED_TO_PARTNER': 'Emailed to partner',
      'EMAILED_TO_CLIENT': 'Emailed to client',
      'CLIENT_APPROVED': 'Client approved',
      'FILED_TO_HMRC': 'Filed to HMRC',
      
      // Ltd Stages
      'DISCUSS_WITH_MANAGER': 'To discuss with manager',
      'REVIEW_BY_PARTNER': 'To review by partner',
      'REVIEW_DONE_HELLO_SIGN': 'Review done - HelloSign',
      'SENT_TO_CLIENT_HELLO_SIGN': 'Sent to client (HelloSign)',
      'APPROVED_BY_CLIENT': 'Approved by client',
      'SUBMISSION_APPROVED_PARTNER': 'Submission approved by partner',
      'FILED_TO_COMPANIES_HOUSE': 'Filed to Companies House',
  'FILED_CH_HMRC': 'Filed to Companies House & HMRC',
      'CLIENT_SELF_FILING': 'Client self-filing'
    }
    
    return stageNames[stage] || stage.replace(/_/g, ' ').toLowerCase()
  },

  /**
   * Get emoji for a stage
   */
  getStageEmoji(stage: string): string {
    const stageEmojis: Record<string, string> = {
      'PAPERWORK_PENDING_CHASE': '📞',
      'PAPERWORK_CHASED': '📤',
      'PAPERWORK_RECEIVED': '📥',
      'WORK_IN_PROGRESS': '⚙️',
      'QUERIES_PENDING': '❓',
      'REVIEW_PENDING_MANAGER': '👔',
      'REVIEWED_BY_MANAGER': '✅',
      'REVIEW_PENDING_PARTNER': '👑',
      'REVIEWED_BY_PARTNER': '✅',
      'EMAILED_TO_PARTNER': '📧',
      'EMAILED_TO_CLIENT': '📧',
      'CLIENT_APPROVED': '✅',
      'FILED_TO_HMRC': '🏛️',
      'DISCUSS_WITH_MANAGER': '💬',
      'REVIEW_BY_PARTNER': '👑',
      'REVIEW_DONE_HELLO_SIGN': '✍️',
      'SENT_TO_CLIENT_HELLO_SIGN': '📧',
      'APPROVED_BY_CLIENT': '✅',
      'SUBMISSION_APPROVED_PARTNER': '✅',
      'FILED_TO_COMPANIES_HOUSE': '🏢',
  'FILED_CH_HMRC': '🏛️',
      'CLIENT_SELF_FILING': '👤'
    }
    
    return stageEmojis[stage] || '📋'
  },

  /**
   * Determine the direction of the stage change
   */
  getChangeDirection(fromStage: string | null, toStage: string): 'forward' | 'backward' | 'assignment' {
    if (!fromStage) return 'assignment'
    
    // Define stage order for comparison
    const vatStageOrder = [
      'PAPERWORK_PENDING_CHASE', 'PAPERWORK_CHASED', 'PAPERWORK_RECEIVED',
      'WORK_IN_PROGRESS', 'QUERIES_PENDING', 'REVIEW_PENDING_MANAGER',
      'REVIEWED_BY_MANAGER', 'REVIEW_PENDING_PARTNER', 'REVIEWED_BY_PARTNER',
      'EMAILED_TO_PARTNER', 'EMAILED_TO_CLIENT', 'CLIENT_APPROVED', 'FILED_TO_HMRC'
    ]
    
    const ltdStageOrder = [
      'PAPERWORK_PENDING_CHASE', 'PAPERWORK_CHASED', 'PAPERWORK_RECEIVED',
      'WORK_IN_PROGRESS', 'DISCUSS_WITH_MANAGER', 'REVIEWED_BY_MANAGER',
      'REVIEW_BY_PARTNER', 'REVIEWED_BY_PARTNER', 'REVIEW_DONE_HELLO_SIGN',
      'SENT_TO_CLIENT_HELLO_SIGN', 'APPROVED_BY_CLIENT', 'SUBMISSION_APPROVED_PARTNER',
      'FILED_TO_COMPANIES_HOUSE', 'FILED_TO_HMRC'
    ]
    
    const stageOrder = [...new Set([...vatStageOrder, ...ltdStageOrder])]
    
    const fromIndex = stageOrder.indexOf(fromStage)
    const toIndex = stageOrder.indexOf(toStage)
    
    if (fromIndex === -1 || toIndex === -1) return 'assignment'
    
    return toIndex > fromIndex ? 'forward' : 'backward'
  }
} 