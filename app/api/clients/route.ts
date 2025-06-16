import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * Generate a unique client code
 */
async function generateClientCode(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Get the last client code for this year
  const lastClient = await db.client.findFirst({
    where: {
      clientCode: {
        startsWith: `CLI${currentYear}-`
      }
    },
    orderBy: {
      clientCode: 'desc'
    }
  })

  let nextNumber = 1
  if (lastClient?.clientCode) {
    const match = lastClient.clientCode.match(/CLI\d{4}-(\d+)/)
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  return `CLI${currentYear}-${nextNumber.toString().padStart(3, '0')}`
}

/**
 * GET /api/clients
 * 
 * Fetch all clients with optional filtering and sorting
 * 
 * Query parameters:
 * - search: Search term for company name, number, or email
 * - companyType: Filter by company type
 * - assignedUserId: Filter by assigned user
 * - isActive: Filter by active status
 * - industry: Filter by industry
 * - sortBy: Sort field (default: companyName)
 * - sortOrder: Sort order (asc/desc, default: asc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const companyType = searchParams.get('companyType') || ''
    const assignedUserId = searchParams.get('assignedUserId') || ''
    const isActive = searchParams.get('active') || searchParams.get('isActive') // Support both 'active' and 'isActive' parameters
    const sortBy = searchParams.get('sortBy') || 'companyName'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: any = {}

    // Search across multiple fields
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { companyNumber: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Apply filters
    if (companyType) {
      where.companyType = companyType
    }

    if (assignedUserId) {
      if (assignedUserId === 'me') {
        where.assignedUserId = session.user.id
      } else if (assignedUserId === 'unassigned') {
        where.assignedUserId = null
      } else {
        where.assignedUserId = assignedUserId
      }
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    // For staff users, only show their assigned clients
    if (session.user.role === 'STAFF') {
      where.assignedUserId = session.user.id
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch clients with pagination
    const [clients, totalCount] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc',
        },
        skip,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      clients,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients
 * 
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    // TEMPORARY: Comment out auth check for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['companyName', 'companyType']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Generate client code if not provided
    const clientCode = body.clientCode || await generateClientCode()

    // Create client with all provided data
    const client = await db.client.create({
      data: {
        clientCode,
        companyName: body.companyName,
        companyType: body.companyType,
        companyNumber: body.companyNumber || null,
        companyStatus: body.companyStatus || null,
        companyStatusDetail: body.companyStatusDetail || null,
        incorporationDate: body.incorporationDate ? new Date(body.incorporationDate) : null,
        cessationDate: body.cessationDate ? new Date(body.cessationDate) : null,
        registeredOfficeAddress: body.registeredOfficeAddress || null,
        sicCodes: Array.isArray(body.sicCodes) 
          ? JSON.stringify(body.sicCodes)
          : typeof body.sicCodes === 'string' 
            ? body.sicCodes 
            : null,
        nextAccountsDue: body.nextAccountsDue ? new Date(body.nextAccountsDue) : null,
        lastAccountsMadeUpTo: body.lastAccountsMadeUpTo ? new Date(body.lastAccountsMadeUpTo) : null,
        accountingReferenceDate: body.accountingReferenceDate || null,
        nextConfirmationDue: body.nextConfirmationDue ? new Date(body.nextConfirmationDue) : null,
        lastConfirmationMadeUpTo: body.lastConfirmationMadeUpTo ? new Date(body.lastConfirmationMadeUpTo) : null,
        jurisdiction: body.jurisdiction || null,
        hasBeenLiquidated: body.hasBeenLiquidated || false,
        hasCharges: body.hasCharges || false,
        hasInsolvencyHistory: body.hasInsolvencyHistory || false,
        // Officers and PSC data
        officers: body.officers ? JSON.stringify(body.officers) : null,
        personsWithSignificantControl: body.personsWithSignificantControl ? JSON.stringify(body.personsWithSignificantControl) : null,
        contactName: body.contactName || 'To Be Updated',
        contactEmail: body.contactEmail || 'contact@tobeupdated.com',
        contactPhone: body.contactPhone || null,
        website: body.website || null,
        yearEstablished: body.yearEstablished ? parseInt(body.yearEstablished) : null,
        numberOfEmployees: body.numberOfEmployees ? parseInt(body.numberOfEmployees) : null,
        annualTurnover: body.annualTurnover ? parseFloat(body.annualTurnover) : null,
        assignedUserId: body.assignedUserId || null,
        notes: body.notes || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    })

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Client created successfully',
    })

  } catch (error) {
    console.error('Error creating client:', error)
    
    if (error instanceof Error) {
      // Handle Prisma unique constraint violations
      if (error.message.includes('Unique constraint failed')) {
        if (error.message.includes('companyNumber')) {
          return NextResponse.json(
            { success: false, error: 'A client with this company number already exists' },
            { status: 409 }
          )
        }
        if (error.message.includes('clientCode')) {
          return NextResponse.json(
            { success: false, error: 'A client with this client code already exists' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { success: false, error: 'A client with these details already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    )
  }
} 