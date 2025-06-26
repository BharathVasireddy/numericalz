import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { db } from '@/lib/db'

interface ActivityContext {
  action: string
  clientId?: string
  details?: any
  metadata?: any
}

// Enhanced activity logging for comprehensive tracking
export async function logActivityEnhanced(
  req: NextRequest,
  context: ActivityContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return

    const userAgent = req.headers.get('user-agent') || 'Unknown'
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'Unknown'

    await logActivity({
      action: context.action,
      userId: session.user.id,
      clientId: context.clientId,
      details: {
        ...context.details,
        userAgent,
        ip,
        timestamp: new Date().toISOString(),
        ...context.metadata
      }
    })
  } catch (error) {
    console.error('Activity logging failed:', error)
    // Don't fail the main request if logging fails
  }
}

// Activity types for comprehensive tracking
export const ComprehensiveActivityTypes = {
  // Authentication & Session
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  // Client Management
  CLIENT_CREATED: 'CLIENT_CREATED',
  CLIENT_UPDATED: 'CLIENT_UPDATED',
  CLIENT_VIEWED: 'CLIENT_VIEWED',
  CLIENT_DELETED: 'CLIENT_DELETED',
  CLIENT_ASSIGNED: 'CLIENT_ASSIGNED',
  CLIENT_UNASSIGNED: 'CLIENT_UNASSIGNED',
  CLIENT_RESIGNED: 'CLIENT_RESIGNED',
  CLIENT_REACTIVATED: 'CLIENT_REACTIVATED',
  CLIENT_COMPANIES_HOUSE_REFRESH: 'CLIENT_COMPANIES_HOUSE_REFRESH',

  // Workflow Management - Ltd Companies
  LTD_WORKFLOW_CREATED: 'LTD_WORKFLOW_CREATED',
  LTD_WORKFLOW_UPDATED: 'LTD_WORKFLOW_UPDATED',
  LTD_WORKFLOW_STAGE_CHANGED: 'LTD_WORKFLOW_STAGE_CHANGED',
  LTD_WORKFLOW_ASSIGNED: 'LTD_WORKFLOW_ASSIGNED',
  LTD_WORKFLOW_COMPLETED: 'LTD_WORKFLOW_COMPLETED',
  LTD_WORKFLOW_CLIENT_SELF_FILING: 'LTD_WORKFLOW_CLIENT_SELF_FILING',
  LTD_ACCOUNTS_FILED: 'LTD_ACCOUNTS_FILED',

  // Workflow Management - VAT
  VAT_QUARTER_CREATED: 'VAT_QUARTER_CREATED',
  VAT_QUARTER_UPDATED: 'VAT_QUARTER_UPDATED',
  VAT_QUARTER_STAGE_CHANGED: 'VAT_QUARTER_STAGE_CHANGED',
  VAT_QUARTER_ASSIGNED: 'VAT_QUARTER_ASSIGNED',
  VAT_QUARTER_COMPLETED: 'VAT_QUARTER_COMPLETED',
  VAT_QUARTER_CLIENT_SELF_FILING: 'VAT_QUARTER_CLIENT_SELF_FILING',
  VAT_RETURN_FILED: 'VAT_RETURN_FILED',

  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_PERMISSIONS_CHANGED: 'USER_PERMISSIONS_CHANGED',

  // Data Operations
  DATA_EXPORTED: 'DATA_EXPORTED',
  DATA_IMPORTED: 'DATA_IMPORTED',
  BULK_OPERATION: 'BULK_OPERATION',
  BULK_ASSIGNMENT: 'BULK_ASSIGNMENT',
  BULK_RESIGNATION: 'BULK_RESIGNATION',

  // System Operations
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_RESTORED: 'BACKUP_RESTORED',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',

  // Communication
  EMAIL_SENT: 'EMAIL_SENT',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  REMINDER_SENT: 'REMINDER_SENT',

  // Reports & Analytics
  REPORT_GENERATED: 'REPORT_GENERATED',
  DASHBOARD_VIEWED: 'DASHBOARD_VIEWED',
  ANALYTICS_ACCESSED: 'ANALYTICS_ACCESSED',

  // Security
  FAILED_LOGIN_ATTEMPT: 'FAILED_LOGIN_ATTEMPT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SECURITY_ALERT: 'SECURITY_ALERT',

  // File Operations
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DOWNLOADED: 'FILE_DOWNLOADED',
  FILE_DELETED: 'FILE_DELETED',

  // API Operations
  API_ACCESS: 'API_ACCESS',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
}

// Enhanced type definitions for activity middleware
interface ClientUpdateData {
  id?: string;
  companyName?: string;
  companyNumber?: string;
  contactName?: string;
  contactEmail?: string;
  assignedUserId?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface ActivityHelperData {
  clientId?: string;
  userId?: string;
  oldData?: ClientUpdateData;
  newData?: ClientUpdateData;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Helper functions for specific activity types
export const ActivityHelpers = {
  // Client activities
  clientCreated: (clientData: any) => ({
    action: ComprehensiveActivityTypes.CLIENT_CREATED,
    details: {
      companyName: clientData.companyName,
      clientCode: clientData.clientCode,
      companyNumber: clientData.companyNumber
    }
  }),

  clientUpdated: (clientId: string, oldData: ClientUpdateData, newData: ClientUpdateData) => ({
    action: ComprehensiveActivityTypes.CLIENT_UPDATED,
    clientId,
    details: {
      oldData,
      newData,
      changes: Object.keys(newData).filter(key => 
        oldData[key] !== newData[key]
      ),
      timestamp: new Date().toISOString(),
    }
  }),

  clientViewed: (clientId: string, clientData: any) => ({
    action: ComprehensiveActivityTypes.CLIENT_VIEWED,
    clientId,
    details: {
      companyName: clientData.companyName,
      clientCode: clientData.clientCode
    }
  }),

  // Workflow activities
  workflowStageChanged: (workflowType: 'LTD' | 'VAT', clientId: string, oldStage: string, newStage: string, comments?: string, quarterPeriod?: string) => ({
    action: workflowType === 'LTD' ? ComprehensiveActivityTypes.LTD_WORKFLOW_STAGE_CHANGED : ComprehensiveActivityTypes.VAT_QUARTER_STAGE_CHANGED,
    clientId,
    details: {
      workflowType,
      oldStage,
      newStage,
      comments,
      quarterPeriod
    }
  }),

  workflowAssigned: (workflowType: 'LTD' | 'VAT', clientId: string, assigneeId: string, assigneeName: string, quarterPeriod?: string, previousAssignee?: string) => ({
    action: workflowType === 'LTD' ? ComprehensiveActivityTypes.LTD_WORKFLOW_ASSIGNED : ComprehensiveActivityTypes.VAT_QUARTER_ASSIGNED,
    clientId,
    details: {
      workflowType,
      assigneeId,
      assigneeName,
      quarterPeriod,
      previousAssignee
    }
  }),

  // User activities
  userLogin: (loginMethod: string) => ({
    action: ComprehensiveActivityTypes.USER_LOGIN,
    details: {
      loginMethod,
      timestamp: new Date().toISOString()
    }
  }),

  userLogout: () => ({
    action: ComprehensiveActivityTypes.USER_LOGOUT,
    details: {
      timestamp: new Date().toISOString()
    }
  }),

  // Bulk operations
  bulkAssignment: (clientIds: string[], assigneeId: string, assigneeName: string) => ({
    action: ComprehensiveActivityTypes.BULK_ASSIGNMENT,
    details: {
      clientCount: clientIds.length,
      clientIds,
      assigneeId,
      assigneeName
    }
  })
}

// Activity log retrieval functions
export async function getUserActivityLog(userId: string, limit: number = 100) {
  return await db.activityLog.findMany({
    where: { userId },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          clientCode: true
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  })
}

export async function getClientActivityLog(clientId: string, limit: number = 100) {
  return await db.activityLog.findMany({
    where: { clientId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      client: {
        select: {
          id: true,
          companyName: true,
          clientCode: true
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  })
}

export async function getSystemActivityLog(limit: number = 100) {
  return await db.activityLog.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      client: {
        select: {
          id: true,
          companyName: true,
          clientCode: true
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  })
}