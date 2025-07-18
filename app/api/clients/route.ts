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

  notes: z.string().optional(),
  vatNumber: z.string().optional(),
  paperworkFrequency: z.string().optional(),
  // Companies House data
  registeredOfficeAddress: z.string().optional(),
  sicCodes: z.string().optional(),
  nextAccountsDue: z.string().optional(),
  nextYearEnd: z.string().optional(),
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

// Validation schema for client creation
const CreateClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyType: z.string().min(1, 'Company type is required'),
  companyNumber: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  yearEstablished: z.string().optional(),
  numberOfEmployees: z.string().optional(),
  annualTurnover: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
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
 * OPTIMIZED: Fetch all clients with optional filtering and sorting
 * Enhanced with caching, optimized queries, and performance monitoring
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Check if this is a client code validation request
    const clientCode = searchParams.get('clientCode')
    if (clientCode) {
      const existingClient = await db.client.findFirst({
        where: { clientCode: clientCode },
        select: { id: true }
      })
      
      return NextResponse.json({
        exists: !!existingClient,
        message: existingClient ? 'Client code already exists' : 'Client code is available'
      })
    }
    
    const search = searchParams.get('search') || ''
    const companyType = searchParams.get('companyType') || ''
    const isActive = searchParams.get('active') === 'true'
    const sortBy = searchParams.get('sortBy') || 'companyName'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25') // Reduced from 50 for better performance

    // Build where clause
    const where: any = {
      isActive: isActive
    }

    // REMOVED: Role-based filtering - All users can see all clients on the main clients page
    // Staff users should be able to see all clients, not just their assigned ones

    // Search filter - simplified logic since we removed role-based filtering
    if (search) {
      const searchConditions = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { companyNumber: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { clientCode: { contains: search, mode: 'insensitive' } }
      ]

      // Apply search conditions for all users
      where.OR = searchConditions
    }

    // Company type filter
    if (companyType) {
      where.companyType = companyType
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Direct parallel database queries - optimized for performance
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
          nextYearEnd: true,
          lastAccountsMadeUpTo: true,
          incorporationDate: true,
          isActive: true,
          isVatEnabled: true,
          createdAt: true,
          
          // OPTIMIZED: Only essential user fields for list view
          assignedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          // Non-Ltd workflow data
          nonLtdCompanyAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          nonLtdAccountsWorkflows: {
            where: {
              isCompleted: false,
            },
            orderBy: {
              yearEndDate: 'desc'
            },
            take: 1, // Get the most recent workflow
            include: {
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              }
            }
          }
        },
        orderBy: (() => {
          // Handle special sorting cases
          if (sortBy === 'assignedUser') {
            return [
              { assignedUser: { name: sortOrder as 'asc' | 'desc' } },
              { companyName: 'asc' }
            ]
          } else {
            // Standard field sorting
            return { [sortBy]: sortOrder as 'asc' | 'desc' }
          }
        })(),
        skip,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)
    const responseTime = Date.now() - startTime

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Clients API Performance: ${responseTime}ms (${clients.length} clients, ${totalCount} total)`)
    }

    return NextResponse.json({
      success: true,
      clients,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        pageSize: limit
      },
      performance: {
        responseTime,
        clientsReturned: clients.length,
        totalClientsInDatabase: totalCount
      }
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
          nextYearEnd: body.nextYearEnd ? new Date(body.nextYearEnd) : null,
          lastAccountsMadeUpTo: body.lastAccountsMadeUpTo ? new Date(body.lastAccountsMadeUpTo) : null,
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
          // NO GENERAL ASSIGNMENT - clients created unassigned
          notes: body.notes || null,
          isActive: body.isActive !== undefined ? body.isActive : true,
        }
      })

    // Log client creation activity
    await logActivityEnhanced(request, ActivityHelpers.clientCreated({
      clientCode: client.clientCode,
      companyName: client.companyName,
      companyType: client.companyType,
      companyNumber: client.companyNumber
    }))

    // Return real-time response with no caching
    const response = NextResponse.json({
      success: true,
      data: client,
      message: 'Client created successfully - assign work types separately as needed',
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