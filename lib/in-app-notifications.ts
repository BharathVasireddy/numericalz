import { db } from '@/lib/db'
import { InAppNotificationCategory } from '@prisma/client'

export interface CreateNotificationData {
  userId: string
  category: InAppNotificationCategory
  type: string
  title: string
  message: string
  clientId?: string
  relatedId?: string
  metadata?: string
}

export interface NotificationTemplate {
  category: InAppNotificationCategory
  type: string
  title: string
  message: string
}

// Common notification templates
export const NOTIFICATION_TEMPLATES = {
  // VAT Notifications
  VAT_ASSIGNMENT: {
    category: 'VAT' as InAppNotificationCategory,
    type: 'VAT_ASSIGNMENT',
    title: 'VAT Quarter Assigned',
    message: 'You have been assigned a VAT quarter for {clientName}',
  },
  VAT_WORKFLOW_STAGE_CHANGE: {
    category: 'VAT' as InAppNotificationCategory,
    type: 'VAT_WORKFLOW_STAGE_CHANGE',
    title: 'VAT Workflow Updated',
    message: 'VAT workflow for {clientName} has been updated to {stage}',
  },
  VAT_DEADLINE_REMINDER: {
    category: 'VAT' as InAppNotificationCategory,
    type: 'VAT_DEADLINE_REMINDER',
    title: 'VAT Deadline Reminder',
    message: 'VAT return for {clientName} is due in {days} days',
  },
  
  // Accounts Notifications
  ACCOUNTS_ASSIGNMENT: {
    category: 'ACCOUNTS' as InAppNotificationCategory,
    type: 'ACCOUNTS_ASSIGNMENT',
    title: 'Accounts Work Assigned',
    message: 'You have been assigned accounts work for {clientName}',
  },
  ACCOUNTS_WORKFLOW_STAGE_CHANGE: {
    category: 'ACCOUNTS' as InAppNotificationCategory,
    type: 'ACCOUNTS_WORKFLOW_STAGE_CHANGE',
    title: 'Accounts Workflow Updated',
    message: 'Accounts workflow for {clientName} has been updated to {stage}',
  },
  ACCOUNTS_DEADLINE_REMINDER: {
    category: 'ACCOUNTS' as InAppNotificationCategory,
    type: 'ACCOUNTS_DEADLINE_REMINDER',
    title: 'Accounts Deadline Reminder',
    message: 'Accounts filing for {clientName} is due in {days} days',
  },
  
  // General Reminders
  GENERAL_REMINDER: {
    category: 'REMINDERS' as InAppNotificationCategory,
    type: 'GENERAL_REMINDER',
    title: 'Reminder',
    message: '{message}',
  },
  CLIENT_ASSIGNMENT: {
    category: 'REMINDERS' as InAppNotificationCategory,
    type: 'CLIENT_ASSIGNMENT',
    title: 'Client Assigned',
    message: 'You have been assigned a new client: {clientName}',
  },
} as const

/**
 * Create a new in-app notification
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await db.inAppNotification.create({
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
          },
        },
      },
    })
    
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Create a notification using a template
 */
export async function createNotificationFromTemplate(
  template: NotificationTemplate,
  userId: string,
  variables: Record<string, string> = {},
  options: {
    clientId?: string
    relatedId?: string
    metadata?: string
  } = {}
) {
  // Replace variables in title and message
  const title = replaceVariables(template.title, variables)
  const message = replaceVariables(template.message, variables)
  
  return createNotification({
    userId,
    category: template.category,
    type: template.type,
    title,
    message,
    clientId: options.clientId,
    relatedId: options.relatedId,
    metadata: options.metadata,
  })
}

/**
 * Create VAT assignment notification
 */
export async function createVATAssignmentNotification(
  userId: string,
  clientId: string,
  clientName: string,
  vatQuarterId: string
) {
  return createNotificationFromTemplate(
    NOTIFICATION_TEMPLATES.VAT_ASSIGNMENT,
    userId,
    { clientName },
    { clientId, relatedId: vatQuarterId }
  )
}

/**
 * Create VAT workflow stage change notification
 */
export async function createVATWorkflowStageNotification(
  userId: string,
  clientId: string,
  clientName: string,
  stage: string,
  vatQuarterId: string
) {
  return createNotificationFromTemplate(
    NOTIFICATION_TEMPLATES.VAT_WORKFLOW_STAGE_CHANGE,
    userId,
    { clientName, stage },
    { clientId, relatedId: vatQuarterId }
  )
}

/**
 * Create accounts assignment notification
 */
export async function createAccountsAssignmentNotification(
  userId: string,
  clientId: string,
  clientName: string,
  workflowId: string
) {
  return createNotificationFromTemplate(
    NOTIFICATION_TEMPLATES.ACCOUNTS_ASSIGNMENT,
    userId,
    { clientName },
    { clientId, relatedId: workflowId }
  )
}

/**
 * Create accounts workflow stage change notification
 */
export async function createAccountsWorkflowStageNotification(
  userId: string,
  clientId: string,
  clientName: string,
  stage: string,
  workflowId: string
) {
  return createNotificationFromTemplate(
    NOTIFICATION_TEMPLATES.ACCOUNTS_WORKFLOW_STAGE_CHANGE,
    userId,
    { clientName, stage },
    { clientId, relatedId: workflowId }
  )
}

/**
 * Create client assignment notification
 */
export async function createClientAssignmentNotification(
  userId: string,
  clientId: string,
  clientName: string
) {
  return createNotificationFromTemplate(
    NOTIFICATION_TEMPLATES.CLIENT_ASSIGNMENT,
    userId,
    { clientName },
    { clientId }
  )
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  return db.inAppNotification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return db.inAppNotification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
      updatedAt: new Date(),
    },
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string, category?: InAppNotificationCategory) {
  const whereClause: any = {
    userId,
    isRead: false,
  }

  if (category) {
    whereClause.category = category
  }

  return db.inAppNotification.updateMany({
    where: whereClause,
    data: {
      isRead: true,
      updatedAt: new Date(),
    },
  })
}

/**
 * Replace variables in text with values
 */
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value)
  })
  return result
} 