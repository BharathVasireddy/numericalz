import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchCompanies } from '@/lib/companies-house'

// Force dynamic rendering for this route since it uses request parameters
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Always fetch fresh data

/**
 * GET /api/companies-house/search
 * 
 * Search for companies using Companies House API
 * 
 * Query parameters:
 * - q: Search query (company name or number)
 * - items_per_page: Results per page (default: 20, max: 100)
 * - start_index: Starting index (default: 0)
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
    const query = searchParams.get('q')
    const itemsPerPage = parseInt(searchParams.get('items_per_page') || '20')
    const startIndex = parseInt(searchParams.get('start_index') || '0')

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (itemsPerPage > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum items per page is 100' },
        { status: 400 }
      )
    }

    const results = await searchCompanies(query, itemsPerPage, startIndex)

    const response = NextResponse.json({
      success: true,
      data: results,
    })

    // Ensure no caching for real-time data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Companies House search error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to search companies' },
      { status: 500 }
    )
  }
} 