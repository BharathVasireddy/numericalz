import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllDeadlines } from '@/lib/deadline-utils'

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
      filteredDeadlines = deadlines.filter(deadline => 
        deadline.dueDate >= start && deadline.dueDate <= end
      )
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Client Name',
        'Company Number',
        'Type',
        'Due Date',
        'Assigned User',
        'Status',
        'Days Until Due'
      ]

      const csvRows = filteredDeadlines.map(deadline => [
        deadline.clientName,
        deadline.companyNumber || '',
        deadline.type === 'accounts' ? 'Annual Accounts' : 'Confirmation Statement',
        deadline.dueDate.toLocaleDateString('en-GB'),
        deadline.assignedUser?.name || 'Unassigned',
        deadline.isOverdue ? 'Overdue' : 'Due',
        deadline.daysUntilDue.toString()
      ])

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="deadlines-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: filteredDeadlines,
        total: filteredDeadlines.length,
        exported_at: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })

  } catch (error) {
    console.error('Error exporting calendar data:', error)
    return NextResponse.json(
      { error: 'Failed to export calendar data' },
      { status: 500 }
    )
  }
} 