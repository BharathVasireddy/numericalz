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

    // Get search params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const companyType = searchParams.get('companyType') || ''
    const assignedUser = searchParams.get('assignedUser') || ''
    const status = searchParams.get('status') || ''

    // Build where clause based on user role and filters
    let whereClause: any = {}

    // Role-based filtering
    if (session.user.role === 'STAFF') {
      whereClause.assignedUserId = session.user.id
    }

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

    // Convert to CSV format
    const csvHeaders = [
      'Company Name',
      'Company Number',
      'Company Type',
      'Company Status',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'Assigned User',
      'Incorporation Date',
      'Next Accounts Due',
      'Next Confirmation Due',
      'Status',
      'Created Date'
    ]

    const csvRows = clients.map(client => [
      client.companyName || '',
      client.companyNumber || '',
      client.companyType || '',
      client.companyStatus || '',
      client.contactName || '',
      client.contactEmail || '',
      client.contactPhone || '',
      client.assignedUser?.name || 'Unassigned',
      client.incorporationDate ? new Date(client.incorporationDate).toLocaleDateString() : '',
      client.nextAccountsDue ? new Date(client.nextAccountsDue).toLocaleDateString() : '',
      client.nextConfirmationDue ? new Date(client.nextConfirmationDue).toLocaleDateString() : '',
      client.isActive ? 'Active' : 'Inactive',
      client.createdAt ? new Date(client.createdAt).toLocaleDateString() : ''
    ])

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          // Escape fields that contain commas, quotes, or newlines
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n')

    // Set headers for file download
    const headers = new Headers({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    return new NextResponse(csvContent, { headers })

  } catch (error) {
    console.error('Error exporting clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 