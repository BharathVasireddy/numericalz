import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/users/[id]/settings
 * 
 * Get user settings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Users can only access their own settings, partners can access any settings
    if (session.user.role !== 'PARTNER' && session.user.id !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only access your own settings.' },
        { status: 403 }
      )
    }

    // Get user settings
    const userSettings = await db.userSettings.findUnique({
      where: { userId: params.id },
      include: {
        defaultAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    if (!userSettings) {
      // Create default settings if they don't exist
      const newSettings = await db.userSettings.create({
        data: {
          userId: params.id,
          emailNotifications: true,
          smsNotifications: false
        },
        include: {
          defaultAssignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        settings: newSettings
      })
    }

    return NextResponse.json({
      success: true,
      settings: userSettings
    })

  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/[id]/settings
 * 
 * Update user settings
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Users can only update their own settings, partners can update any settings
    if (session.user.role !== 'PARTNER' && session.user.id !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only update your own settings.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { defaultAssigneeId, emailNotifications, smsNotifications } = body

    // Validate defaultAssigneeId if provided
    if (defaultAssigneeId) {
      const assigneeUser = await db.user.findUnique({
        where: { id: defaultAssigneeId },
        select: { id: true, isActive: true }
      })

      if (!assigneeUser || !assigneeUser.isActive) {
        return NextResponse.json(
          { success: false, error: 'Invalid or inactive user selected for default assignee' },
          { status: 400 }
        )
      }
    }

    // Get current settings for change tracking
    const currentSettings = await db.userSettings.findUnique({
      where: { userId: params.id },
      include: {
        defaultAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Update or create settings
    const updatedSettings = await db.userSettings.upsert({
      where: { userId: params.id },
      update: {
        ...(defaultAssigneeId !== undefined && { 
          defaultAssigneeId: defaultAssigneeId === "" ? null : defaultAssigneeId 
        }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(smsNotifications !== undefined && { smsNotifications }),
        updatedAt: new Date()
      },
      create: {
        userId: params.id,
        defaultAssigneeId: (defaultAssigneeId && defaultAssigneeId !== "") ? defaultAssigneeId : null,
        emailNotifications: emailNotifications ?? true,
        smsNotifications: smsNotifications ?? false
      },
      include: {
        defaultAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Log settings changes activity
    const changes = []
    const oldDefaultAssignee = currentSettings?.defaultAssignee?.name || 'Auto-assign to creator'
    const newDefaultAssignee = updatedSettings.defaultAssignee?.name || 'Auto-assign to creator'
    
    if (defaultAssigneeId !== undefined && oldDefaultAssignee !== newDefaultAssignee) {
      changes.push(`Default Assignee: ${oldDefaultAssignee} → ${newDefaultAssignee}`)
    }
    if (emailNotifications !== undefined && emailNotifications !== currentSettings?.emailNotifications) {
      changes.push(`Email Notifications: ${currentSettings?.emailNotifications ? 'Enabled' : 'Disabled'} → ${emailNotifications ? 'Enabled' : 'Disabled'}`)
    }
    if (smsNotifications !== undefined && smsNotifications !== currentSettings?.smsNotifications) {
      changes.push(`SMS Notifications: ${currentSettings?.smsNotifications ? 'Enabled' : 'Disabled'} → ${smsNotifications ? 'Enabled' : 'Disabled'}`)
    }

    if (changes.length > 0) {
      await logActivityEnhanced(request, {
        action: 'USER_SETTINGS_UPDATED',
        details: {
          userId: params.id,
          changes: changes,
          message: `User settings updated: ${changes.join(', ')}`,
          oldSettings: {
            defaultAssigneeId: currentSettings?.defaultAssigneeId,
            defaultAssigneeName: currentSettings?.defaultAssignee?.name,
            emailNotifications: currentSettings?.emailNotifications,
            smsNotifications: currentSettings?.smsNotifications
          },
          newSettings: {
            defaultAssigneeId: updatedSettings.defaultAssigneeId,
            defaultAssigneeName: updatedSettings.defaultAssignee?.name,
            emailNotifications: updatedSettings.emailNotifications,
            smsNotifications: updatedSettings.smsNotifications
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
} 