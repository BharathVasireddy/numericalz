import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only PARTNER and MANAGER can view activity logs
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Fetch activity logs for the user
    const activityLogs = await db.activityLog.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100, // Limit to last 100 activities
      include: {
        client: {
          select: {
            id: true,
            companyName: true
          }
        }
      }
    })

    // Helper function to format action names to human-readable format
    const formatActionName = (action: string): string => {
      const actionMap: Record<string, string> = {
        'CLIENT_CREATED': 'Created Client',
        'CLIENT_UPDATED': 'Updated Client',
        'CLIENT_DELETED': 'Deleted Client',
        'CLIENT_ASSIGNED': 'Assigned Client',
        'CLIENT_UNASSIGNED': 'Unassigned Client',
        'CLIENT_REASSIGNED': 'Reassigned Client',
        'VAT_ASSIGNED': 'Assigned VAT Work',
        'VAT_UNASSIGNED': 'Unassigned VAT Work',
        'ACCOUNTS_ASSIGNED': 'Assigned Accounts Work',
        'ACCOUNTS_UNASSIGNED': 'Unassigned Accounts Work',
        'USER_LOGIN': 'Logged In',
        'USER_LOGOUT': 'Logged Out',
        'PASSWORD_CHANGED': 'Changed Password',
        'PROFILE_UPDATED': 'Updated Profile',
        'VAT_WORKFLOW_UPDATED': 'Updated VAT Workflow',
        'VAT_QUARTER_CREATED': 'Created VAT Quarter',
        'DOCUMENT_UPLOADED': 'Uploaded Document',
        'DOCUMENT_DOWNLOADED': 'Downloaded Document',
        'EMAIL_SENT': 'Sent Email',
        'SYSTEM_ACCESS': 'Accessed System',
        'BULK_OPERATION': 'Performed Bulk Operation',
        'EXPORT_DATA': 'Exported Data',
        'IMPORT_DATA': 'Imported Data'
      }
      
      return actionMap[action] || action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }

    // Helper function to format details properly
    const formatDetails = (details: any, action: string, clientName?: string): string => {
      if (!details) {
        return formatActionName(action)
      }

      // If details is already a string, try to parse it as JSON first
      if (typeof details === 'string') {
        try {
          const parsed = JSON.parse(details)
          return formatDetails(parsed, action, clientName) // Recursive call with parsed object
        } catch (e) {
          return details
        }
      }

      // Handle the specific case where details is an object with numeric keys (array-like)
      // This happens when a JSON string gets converted incorrectly
      if (typeof details === 'object' && details !== null) {
        const keys = Object.keys(details)
        
        // Check if this looks like a string that was converted to an array-like object
        if (keys.length > 0 && keys.every(key => /^\d+$/.test(key))) {
          try {
            // Reconstruct the string from the character array
            const reconstructedString = keys
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => details[key])
              .join('')
            
            // Try to parse the reconstructed string as JSON
            const parsed = JSON.parse(reconstructedString)
            return formatDetails(parsed, action, clientName)
          } catch (e) {
            // If parsing fails, just return the reconstructed string
            const reconstructedString = keys
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => details[key])
              .join('')
            return reconstructedString
          }
        }

        // Handle normal object cases
        try {
          // Handle specific detail types
          if (details.workflowType && details.assigneeName) {
            return `${details.workflowType} work assigned to ${details.assigneeName}`
          }
          
          if (details.assigneeName) {
            return `Assigned to ${details.assigneeName}`
          }
          
          if (details.previousAssignee && details.newAssignee) {
            return `Reassigned from ${details.previousAssignee} to ${details.newAssignee}`
          }
          
          // For other objects, create a simple description
          const normalKeys = Object.keys(details)
          if (normalKeys.length > 0) {
            return `${formatActionName(action)} - ${normalKeys.join(', ')}`
          }
        } catch (e) {
          console.error('Error formatting details:', e)
        }
      }

      // Fallback to action name
      return formatActionName(action)
    }

    // Transform the data for frontend consumption
    const transformedLogs = activityLogs.map(log => ({
      id: log.id,
      action: formatActionName(log.action),
      resource: log.client ? 'Client' : 'System',
      resourceName: log.client?.companyName || 'System',
      timestamp: log.timestamp,
      details: formatDetails(log.details, log.action, log.client?.companyName)
    }))

    return NextResponse.json({
      success: true,
      data: transformedLogs
    })

  } catch (error) {
    console.error('Error fetching user activity log:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 