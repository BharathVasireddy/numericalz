import { db } from '@/lib/db'

interface ActivityLogData {
  userId: string
  action: string
  clientId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

// Enhanced type definitions for better type safety
interface ActivityDetails {
  action?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  [key: string]: unknown;
}

interface ClientActivityDetails extends ActivityDetails {
  clientId?: string;
  clientName?: string;
  companyNumber?: string;
  assignedUser?: {
    id: string;
    name: string;
  };
}

interface UserActivityDetails extends ActivityDetails {
  userId?: string;
  userName?: string;
  role?: string;
  targetUserId?: string;
  targetUserName?: string;
}

/**
 * Log user activity to the database
 * 
 * @param data Activity log data
 * @returns Promise<boolean> Success status
 */
export async function logActivity(data: ActivityLogData): Promise<boolean> {
  try {
    await db.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        clientId: data.clientId,
        details: data.details ? JSON.stringify({
          ...data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }) : JSON.stringify({
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }),
      }
    })
    return true
  } catch (error) {
    console.error('Failed to log activity:', error)
    return false
  }
}

/**
 * Common activity types for consistency
 */
export const ActivityTypes = {
  // Authentication
  LOGIN: 'USER_LOGIN',
  LOGOUT: 'USER_LOGOUT',
  
  // Client Management
  CLIENT_CREATED: 'CLIENT_CREATED',
  CLIENT_UPDATED: 'CLIENT_UPDATED',
  CLIENT_DELETED: 'CLIENT_DELETED',
  CLIENT_ASSIGNED: 'CLIENT_ASSIGNED',
  CLIENT_UNASSIGNED: 'CLIENT_UNASSIGNED',
  CLIENT_VIEWED: 'CLIENT_VIEWED',
  
  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  
  // System
  EXPORT_DATA: 'EXPORT_DATA',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  
  // Communication
  EMAIL_SENT: 'EMAIL_SENT',
  COMMUNICATION_CREATED: 'COMMUNICATION_CREATED',
} as const

/**
 * Extract client IP from request headers
 * 
 * @param request NextRequest object
 * @returns IP address string
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded?.split(',')?.[0]?.trim() || 'unknown'
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

/**
 * Extract user agent from request headers
 * 
 * @param request NextRequest object
 * @returns User agent string
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Log client-related activity
 * 
 * @param userId User performing the action
 * @param action Action type
 * @param clientId Client ID
 * @param clientName Client name for context
 * @param details Additional details
 * @param request Optional request object for IP/UA
 */
export async function logClientActivity(
  userId: string,
  action: string,
  clientId?: string,
  details?: ClientActivityDetails,
  request?: Request
): Promise<boolean> {
  return logActivity({
    userId,
    action,
    clientId,
    details: {
      ...details
    },
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  })
}

/**
 * Log user management activity
 * 
 * @param performedBy User performing the action
 * @param action Action type
 * @param targetUserId Target user ID
 * @param targetUserName Target user name
 * @param details Additional details
 * @param request Optional request object for IP/UA
 */
export async function logUserActivity(
  performedBy: string,
  action: string,
  targetUserId?: string,
  targetUserName?: string,
  details?: UserActivityDetails,
  request?: Request
): Promise<boolean> {
  return logActivity({
    userId: performedBy,
    action,
    details: {
      ...details
    },
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  })
}

/**
 * Log system activity
 * 
 * @param userId User performing the action
 * @param action Action type
 * @param details Additional details
 * @param request Optional request object for IP/UA
 */
export async function logSystemActivity(
  userId: string,
  action: string,
  details?: ActivityDetails,
  request?: Request
): Promise<boolean> {
  return logActivity({
    userId,
    action,
    details: {
      ...details
    },
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
  })
} 