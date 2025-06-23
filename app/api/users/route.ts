import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CacheHelpers } from '@/lib/performance-cache'
import bcrypt from 'bcryptjs'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'
// Disable all caching for real-time data
export const revalidate = 0

/**
 * GET /api/users
 * 
 * OPTIMIZED: Get all users for assignment purposes
 * Only accessible to partners and managers
 * Enhanced with caching and circuit breaker for better performance
 * 
 * Query parameters:
 * - includeSelf: Include the current user in the results (default: false)
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

    // Only partners and managers can fetch users for assignment
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Partner or Manager role required.' },
        { status: 403 }
      )
    }

    // Check if we should include the current user
    const { searchParams } = new URL(request.url)
    const includeSelf = searchParams.get('includeSelf') === 'true'

    // Build the where clause conditionally
    const whereClause: any = {
      isActive: true // Only fetch active users
    }

    // Exclude current user unless includeSelf is true
    if (!includeSelf) {
      whereClause.id = {
        not: session.user.id
      }
    }

    // OPTIMIZED: Cached database query for better performance
    const cacheKey = includeSelf ? 'active-with-self' : 'active-without-self'
    const users = await CacheHelpers.users.getAll(() => 
      db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: [
          { role: 'asc' },  // Partners first, then managers, then staff
          { name: 'asc' }
        ]
      })
    )

    const response = NextResponse.json({
      success: true,
      users,
    })

    // PERFORMANCE: Smart caching based on role and request type
    if (includeSelf) {
      // Cache for 5 minutes when including self (used in dropdowns)
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    } else {
      // Cache for 10 minutes when excluding self (used in assignment modals)
      response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=120')
    }
    
    // Add ETag for conditional requests
    const etag = `"users-${session.user.role}-${includeSelf}-${users.length}"`
    response.headers.set('ETag', etag)
    
    // Handle conditional requests (304 Not Modified)
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 })
    }
    
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
 * Create a new user
 * Only accessible to partners and managers
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

    // Only partners and managers can create users
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Partner or Manager role required.' },
        { status: 403 }
      )
    }

    const { name, email, password, role } = await request.json()

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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate role - only PARTNER can create other PARTNER users
    if (role && !['STAFF', 'MANAGER', 'PARTNER'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be STAFF, MANAGER, or PARTNER' },
        { status: 400 }
      )
    }

    // Only PARTNER can create other PARTNER users
    if (role === 'PARTNER' && session.user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: 'Only Partners can create other Partner accounts' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
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
      message: 'User created successfully',
      user: newUser,
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
} 