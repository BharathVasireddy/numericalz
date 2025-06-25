/**
 * Workflow Notification Service
 * 
 * Handles email notifications for workflow stage changes
 * Sends notifications to relevant stakeholders based on stage changes
 */

import { emailService } from './email-service'
import { db } from './db'

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

      // Send notifications to each recipient
      const notificationPromises = recipients.map(recipient => 
        this.sendStageChangeEmail(params, recipient)
      )

      const results = await Promise.allSettled(notificationPromises)
      
      // Log results
      results.forEach((result, index) => {
        const recipient = recipients[index]
        if (!recipient) {
          console.error(`❌ Missing recipient data for index ${index}`)
          return
        }
        
        if (result.status === 'fulfilled') {
          console.log(`✅ Stage change notification sent to ${recipient.email} (${recipient.reason})`)
        } else {
          console.error(`❌ Failed to send stage change notification to ${recipient.email}:`, result.reason)
        }
      })

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
    const subject = `📋 Workflow Update - ${params.clientName} (${params.clientCode})`
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Workflow Stage Change</h2>
        <p><strong>Client:</strong> ${params.clientName} (${params.clientCode})</p>
        <p><strong>Workflow:</strong> ${params.workflowType}</p>
        <p><strong>New Stage:</strong> ${params.toStage}</p>
        <p><strong>Changed by:</strong> ${params.changedBy.name}</p>
        ${params.comments ? `<p><strong>Comments:</strong> ${params.comments}</p>` : ''}
      </div>
    `

    // Send email
    const emailResult = await emailService.sendEmail({
      to: [{
        email: recipient.email,
        name: recipient.name || recipient.email
      }],
      subject,
      htmlContent
    })

    // Log email
    await db.emailLog.create({
      data: {
        fromEmail: 'notifications@cloud9digital.in',
        fromName: 'Numericalz',
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject,
        content: htmlContent,
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
      'FILED_CH_HMRC'
    ]
    
    const stageOrder = [...new Set([...vatStageOrder, ...ltdStageOrder])]
    
    const fromIndex = stageOrder.indexOf(fromStage)
    const toIndex = stageOrder.indexOf(toStage)
    
    if (fromIndex === -1 || toIndex === -1) return 'assignment'
    
    return toIndex > fromIndex ? 'forward' : 'backward'
  }
} 