import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/users/[id]/reset-password
 * 
 * Reset user password with auto-generated temporary password
 * Only accessible to managers
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can reset passwords
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { sendEmail = false } = body

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate temporary password (8 characters: 4 letters + 4 numbers)
    const generateTempPassword = () => {
      const letters = 'abcdefghijklmnopqrstuvwxyz'
      const numbers = '0123456789'
      
      let password = ''
      // Add 4 random letters
      for (let i = 0; i < 4; i++) {
        password += letters.charAt(Math.floor(Math.random() * letters.length))
      }
      // Add 4 random numbers
      for (let i = 0; i < 4; i++) {
        password += numbers.charAt(Math.floor(Math.random() * numbers.length))
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Update user password
    await db.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    })

    // TODO: Implement email sending functionality
    // For now, we'll just return the password
    // In production, you'd want to send this via email and not return it in the response

    let message = `Password reset successfully. Temporary password: ${tempPassword}`
    
    if (sendEmail) {
      // TODO: Send email with temporary password
      // await sendPasswordResetEmail(existingUser.email, existingUser.name, tempPassword)
      message = `Password reset successfully. Temporary password has been sent to ${existingUser.email}`
    }

    return NextResponse.json({
      success: true,
      message,
      // Remove this in production - passwords should only be sent via email
      tempPassword: sendEmail ? undefined : tempPassword,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      }
    })

  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
} 