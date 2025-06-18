import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only PARTNER can export data
    if (session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Access denied. Only Partners can export data.' }, { status: 403 })
    }

    // Get search params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const companyType = searchParams.get('companyType') || ''
    const assignedUser = searchParams.get('assignedUser') || ''
    const status = searchParams.get('status') || ''

    // Build where clause based on filters (Partners see all data)
    let whereClause: any = {}

    // Search filtering
    if (searchQuery) {
      whereClause.OR = [
        { companyName: { contains: searchQuery, mode: 'insensitive' } },
        { companyNumber: { contains: searchQuery, mode: 'insensitive' } },
        { contactEmail: { contains: searchQuery, mode: 'insensitive' } },
        { contactName: { contains: searchQuery, mode: 'insensitive' } }
      ]
    }

    // Company type filtering
    if (companyType) {
      whereClause.companyType = companyType
    }

    // Assigned user filtering
    if (assignedUser === 'me') {
      whereClause.assignedUserId = session.user.id
    } else if (assignedUser === 'unassigned') {
      whereClause.assignedUserId = null
    }

    // Status filtering
    if (status) {
      whereClause.isActive = status === 'true'
    }

    // Fetch clients with assigned user info
    const clients = await db.client.findMany({
      where: whereClause,
      include: {
        assignedUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { companyName: 'asc' }
    })

    // Generate CSV headers
    const headers = [
      'Client Code',
      'Company Name',
      'Company Number',
      'Company Type',
      'Company Status',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'VAT Number',
      'Assigned To',
      'Assigned Email',
      'Next Accounts Due',
      'Next Confirmation Due',
      'Year Established',
      'Number of Employees',
      'Annual Turnover',
      'Is Active',
      'Created At'
    ]

    // Generate CSV rows
    const csvRows = [
      headers.join(','),
      ...clients.map(client => [
        client.clientCode || '',
        `"${client.companyName}"`,
        client.companyNumber || '',
        client.companyType,
        client.companyStatus || '',
        `"${client.contactName}"`,
        client.contactEmail,
        client.contactPhone || '',
        client.vatNumber || '',
        client.assignedUser?.name || '',
        client.assignedUser?.email || '',
        client.nextAccountsDue?.toISOString().split('T')[0] || '',
        client.nextConfirmationDue?.toISOString().split('T')[0] || '',
        client.yearEstablished || '',
        client.numberOfEmployees || '',
        client.annualTurnover || '',
        client.isActive ? 'Yes' : 'No',
        client.createdAt.toISOString().split('T')[0]
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting clients:', error)
    return NextResponse.json(
      { error: 'Failed to export clients' },
      { status: 500 }
    )
  }
} 