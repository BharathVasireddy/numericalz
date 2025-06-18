import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'
// Disable all caching for real-time data
export const revalidate = 0

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/users/[id]
 * 
 * Get user details by ID
 * Users can only access their own data, managers can access any user
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

    // Users can only access their own data, partners and managers can access any user
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER' && session.user.id !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only access your own data.' },
        { status: 403 }
      )
    }

    // Fetch user data
    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json({
      success: true,
      ...user,
    })

    // Disable all caching for real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/[id]
 * 
 * Update user details (activate/deactivate, role, etc.)
 * Only accessible to managers
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

    // Only partners and managers can update users
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Partner or Manager role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isActive, role, name, email } = body

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate role-based editing restrictions
    if (role === 'PARTNER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Only Partners can modify Partner roles' },
        { status: 403 }
      )
    }

    // Only PARTNER can edit other PARTNER users
    if (existingUser.role === 'PARTNER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Only Partners can edit other Partner accounts' },
        { status: 403 }
      )
    }

    // Prevent managers from deactivating themselves
    if (session.user.id === params.id && isActive === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(role && { role }),
        ...(name && { name }),
        ...(email && { email }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully',
    })

    // Disable all caching for real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * 
 * Delete a user
 * PARTNER: Can delete any account including other PARTNERs
 * MANAGER: Can delete STAFF accounts only
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only partners and managers can delete users
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Partner or Manager role required.' },
        { status: 403 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: params.id },
      include: {
        assignedClients: {
          where: { isActive: true }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Role-based deletion restrictions
    if (session.user.role === 'MANAGER') {
      // MANAGER can only delete STAFF accounts
      if (existingUser.role !== 'STAFF') {
        return NextResponse.json(
          { success: false, error: 'Managers can only delete Staff accounts' },
          { status: 403 }
        )
      }
    }
    // PARTNER can delete any account (no restrictions)

    // For managers, check if they have assigned clients
    if (existingUser.role === 'MANAGER') {
      if (existingUser.assignedClients.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot delete manager with ${existingUser.assignedClients.length} assigned client(s). Please reassign all clients to another staff member or manager before deletion.`,
            clientCount: existingUser.assignedClients.length
          },
          { status: 400 }
        )
      }
    }

    // Prevent managers from deleting themselves
    if (session.user.id === params.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Unassign all clients before deletion (only for staff members, managers should have 0 clients at this point)
    if (existingUser.assignedClients.length > 0) {
      await db.client.updateMany({
        where: { assignedUserId: params.id },
        data: { assignedUserId: null }
      })
    }

    // Delete user
    await db.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: `User deleted successfully. ${existingUser.assignedClients.length} clients have been unassigned.`,
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
} 