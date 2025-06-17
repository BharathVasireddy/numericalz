import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbOperation } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * GET /api/users
 * 
 * Get all users for assignment purposes
 * Only accessible to managers
 * Optimized with caching for better performance
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can fetch users for assignment
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager role required.' },
        { status: 403 }
      )
    }

    // Optimized database query with retry logic
    const users = await dbOperation(async () => {
      return db.user.findMany({
        where: {
          id: {
            not: session.user.id
          },
          isActive: true // Only fetch active users
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: 'asc'
        }
      })
    })

    const response = NextResponse.json({
      success: true,
      users,
    })

    // Cache for 5 minutes to improve performance
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    
    return response

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * 
 * Create a new user (team member)
 * Only accessible to managers
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can create users
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, role } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate role
    if (role && !['STAFF', 'MANAGER'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be STAFF or MANAGER' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'STAFF',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully'
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
} 