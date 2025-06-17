import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllDeadlines } from '@/lib/deadline-utils'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch deadlines
    const deadlines = await getAllDeadlines()

    // Filter by date range if provided
    let filteredDeadlines = deadlines
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      filteredDeadlines = deadlines.filter(deadline => {
        const dueDate = new Date(deadline.dueDate)
        return dueDate >= start && dueDate <= end
      })
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Client Name',
        'Company Number',
        'Due Date',
        'Type',
        'Assigned User',
        'Days Until Due',
        'Status'
      ]

      const csvRows = filteredDeadlines.map(deadline => [
        deadline.clientName,
        deadline.companyNumber || '',
        deadline.dueDate.toISOString().split('T')[0],
        deadline.type === 'accounts' ? 'Accounts' : 'Confirmation Statement',
        deadline.assignedUser?.name || 'Unassigned',
        deadline.daysUntilDue.toString(),
        deadline.isOverdue ? 'Overdue' : 'Due'
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="deadlines-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Default to JSON format
    return NextResponse.json({
      success: true,
      data: filteredDeadlines,
      count: filteredDeadlines.length
    })

  } catch (error) {
    console.error('Error exporting calendar data:', error)
    return NextResponse.json(
      { error: 'Failed to export calendar data' },
      { status: 500 }
    )
  }
} 