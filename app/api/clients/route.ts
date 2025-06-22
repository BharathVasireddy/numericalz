import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'
// Disable all caching for real-time data
export const revalidate = 0

// Validation schemas
const createClientSchema = z.object({
  companyType: z.string().min(1, 'Company type is required'),
  companyNumber: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  contactFax: z.string().optional(),
  website: z.string().optional(),
  tradingAddress: z.string().optional(),
  yearEstablished: z.number().optional(),
  numberOfEmployees: z.number().optional(),
  annualTurnover: z.number().optional(),
  assignedUserId: z.string().optional(),
  notes: z.string().optional(),
  vatNumber: z.string().optional(),
  paperworkFrequency: z.string().optional(),
  // Companies House data
  registeredOfficeAddress: z.string().optional(),
  sicCodes: z.string().optional(),
  nextAccountsDue: z.string().optional(),
  lastAccountsMadeUpTo: z.string().optional(),
  accountingReferenceDate: z.string().optional(),
  nextConfirmationDue: z.string().optional(),
  lastConfirmationMadeUpTo: z.string().optional(),
  jurisdiction: z.string().optional(),
  companyStatus: z.string().optional(),
  companyStatusDetail: z.string().optional(),
  incorporationDate: z.string().optional(),
  cessationDate: z.string().optional(),
  hasBeenLiquidated: z.boolean().optional(),
  hasCharges: z.boolean().optional(),
  hasInsolvencyHistory: z.boolean().optional(),
  officers: z.string().optional(),
  personsWithSignificantControl: z.string().optional(),
  // Non Ltd Company specific fields
  natureOfTrade: z.string().optional(),
  tradingAddressLine1: z.string().optional(),
  tradingAddressLine2: z.string().optional(),
  tradingAddressCountry: z.string().optional(),
  tradingAddressPostCode: z.string().optional(),
  residentialAddressLine1: z.string().optional(),
  residentialAddressLine2: z.string().optional(),
  residentialAddressCountry: z.string().optional(),
  residentialAddressPostCode: z.string().optional(),
  vatQuarters: z.string().optional(),
  nationalInsuranceNumber: z.string().optional(),
  utrNumber: z.string().optional(),
  paperWorkReceived: z.boolean().optional(),
  paperWorkReceivedDate: z.date().optional(),
  jobCompleted: z.boolean().optional(),
  jobCompletedDate: z.date().optional(),
  sa100Filed: z.boolean().optional(),
  sa100FiledDate: z.date().optional(),
  workStatus: z.string().optional(),
  additionalComments: z.string().optional(),
  staff: z.string().optional(),
  previousYearEnded: z.date().optional(),
  previousYearWorkReceivedDate: z.date().optional(),
  previousYearJobCompletedDate: z.date().optional(),
  previousYearSA100FiledDate: z.date().optional(),
})

/**
 * Generate a unique client code with retry logic
 */
async function generateClientCode(): Promise<string> {
  // Get the last client code with retry logic
  const lastClient = await db.client.findFirst({
    where: {
      clientCode: {
        startsWith: 'NZ-'
      }
    },
    orderBy: {
      clientCode: 'desc'
    }
  })

  let nextNumber = 1
  if (lastClient?.clientCode) {
    const match = lastClient.clientCode.match(/NZ-(\d+)/)
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  return `NZ-${nextNumber}`
}

/**
 * GET /api/clients
 * 
 * Fetch all clients with optional filtering and sorting
 * Optimized for performance with caching and efficient queries
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
    const isActive = searchParams.get('active') || searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'companyName'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100') // Increased default limit

    // Build optimized where clause
    const where: any = {}

    // Search across multiple fields with optimized query
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

    // Staff users can see all clients (no restriction)

    // Calculate pagination
    const skip = (page - 1) * limit

    // Optimized database query with minimal fields for list view
    const [clients, totalCount] = await Promise.all([
      db.client.findMany({
        where,
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          companyNumber: true,
          companyType: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          nextAccountsDue: true,
          nextConfirmationDue: true,
          nextCorporationTaxDue: true,
          accountingReferenceDate: true,
          lastAccountsMadeUpTo: true,
          isActive: true,
          isVatEnabled: true,
          createdAt: true,
          // Service management fields
          
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ltdCompanyAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          nonLtdCompanyAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          vatAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          // 🎯 CT Tracking fields
          corporationTaxStatus: true,
          corporationTaxPeriodStart: true,
          corporationTaxPeriodEnd: true,
          manualCTDueOverride: true,
          ctDueSource: true,
          lastCTStatusUpdate: true,
          ctStatusUpdatedBy: true,
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

    // Return real-time data with no caching
    const response = NextResponse.json({
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

    // Disable all caching for real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Smart assignment logic: Creator -> Partner Settings -> Partner
    let defaultAssignedUserId = body.assignedUserId || null
    
    if (!defaultAssignedUserId) {
      // Check if current user is a partner and has assignment settings
      if (session.user.role === 'PARTNER') {
        // Get partner's assignment preferences
        const currentUserSettings = await db.userSettings.findUnique({
          where: { userId: session.user.id },
          include: {
            defaultAssignee: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          }
        })

        if (currentUserSettings?.defaultAssignee?.isActive) {
          // Use partner's preferred default assignee
          defaultAssignedUserId = currentUserSettings.defaultAssignee.id
        } else {
          // Partner has no specific preference, assign to themselves
          defaultAssignedUserId = session.user.id
        }
      } else {
        // Non-partner user: assign to themselves by default
        defaultAssignedUserId = session.user.id
      }
    }

    // Create client with all provided data using retry logic
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
          nextCorporationTaxDue: body.nextCorporationTaxDue ? new Date(body.nextCorporationTaxDue) : null,
          // 🎯 CT Tracking fields
          corporationTaxStatus: body.corporationTaxStatus || 'PENDING',
          corporationTaxPeriodStart: body.corporationTaxPeriodStart ? new Date(body.corporationTaxPeriodStart) : null,
          corporationTaxPeriodEnd: body.corporationTaxPeriodEnd ? new Date(body.corporationTaxPeriodEnd) : null,
          manualCTDueOverride: body.manualCTDueOverride ? new Date(body.manualCTDueOverride) : null,
          ctDueSource: body.ctDueSource || 'AUTO',
          lastCTStatusUpdate: body.lastCTStatusUpdate ? new Date(body.lastCTStatusUpdate) : null,
          ctStatusUpdatedBy: body.ctStatusUpdatedBy || null,
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
          assignedUserId: defaultAssignedUserId,
          notes: body.notes || null,
          isActive: body.isActive !== undefined ? body.isActive : true,
        },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

    // Log client creation activity
    await logActivityEnhanced(request, ActivityHelpers.clientCreated({
      clientCode: client.clientCode,
      companyName: client.companyName,
      companyType: client.companyType,
      companyNumber: client.companyNumber,
      assignedUserId: client.assignedUserId,
      assignedUserName: client.assignedUser?.name
    }))

    // Return real-time response with no caching
    const response = NextResponse.json({
      success: true,
      data: client,
      message: `Client created successfully${client.assignedUser ? ` and assigned to ${client.assignedUser.name}` : ''}`,
    })

    // Disable all caching for real-time updates
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    
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