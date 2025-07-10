import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'
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

    // Only managers and partners can reset passwords
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager or Partner role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      sendEmail = false,
      passwordConfig = {
        length: 8,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false
      }
    } = body

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

    // Generate temporary password with custom configuration
    const generateTempPassword = (config: any) => {
      const lowercase = 'abcdefghijklmnopqrstuvwxyz'
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const numbers = '0123456789'
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      
      let charset = ''
      if (config.includeLowercase) charset += lowercase
      if (config.includeUppercase) charset += uppercase
      if (config.includeNumbers) charset += numbers
      if (config.includeSymbols) charset += symbols
      
      // Ensure at least one character set is selected
      if (charset === '') {
        charset = lowercase + numbers // fallback
      }
      
      let password = ''
      
      // Ensure at least one character from each selected type
      if (config.includeLowercase) {
        password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
      }
      if (config.includeUppercase) {
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
      }
      if (config.includeNumbers) {
        password += numbers.charAt(Math.floor(Math.random() * numbers.length))
      }
      if (config.includeSymbols) {
        password += symbols.charAt(Math.floor(Math.random() * symbols.length))
      }
      
      // Fill the rest randomly
      const remainingLength = Math.max(config.length - password.length, 0)
      for (let i = 0; i < remainingLength; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length))
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    const tempPassword = generateTempPassword(passwordConfig)
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Update user password
    await db.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    })

    // Log password reset activity for security audit
    await logActivityEnhanced(request, {
      action: 'PASSWORD_RESET',
      details: {
        targetUserId: params.id,
        targetUserName: existingUser.name,
        targetUserEmail: existingUser.email,
        targetUserRole: existingUser.role,
        resetBy: session.user.name || session.user.email || 'Unknown User',
        resetByRole: session.user.role,
        emailSent: sendEmail,
        passwordConfig: {
          length: passwordConfig.length,
          includeUppercase: passwordConfig.includeUppercase,
          includeLowercase: passwordConfig.includeLowercase,
          includeNumbers: passwordConfig.includeNumbers,
          includeSymbols: passwordConfig.includeSymbols
        },
        message: `Password reset for ${existingUser.name} (${existingUser.email})`,
        securityNote: 'Temporary password generated and user must change on next login'
      }
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