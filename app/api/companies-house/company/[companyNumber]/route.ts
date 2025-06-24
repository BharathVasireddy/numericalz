import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getComprehensiveCompanyData } from '@/lib/companies-house'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Always fetch fresh data

/**
 * GET /api/companies-house/company/[companyNumber]
 * 
 * Get comprehensive company information from Companies House API including officers and PSC data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { companyNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { companyNumber } = params

    if (!companyNumber) {
      return NextResponse.json(
        { success: false, error: 'Company number is required' },
        { status: 400 }
      )
    }

    const { company: companyData, officers, psc } = await getComprehensiveCompanyData(companyNumber)

    const response = NextResponse.json({
      success: true,
      data: {
        ...companyData,
        officers,
        psc
      },
    })

    // Ensure no caching for real-time data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Companies House company details error:', error)
    
    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message === 'Company not found') {
        return NextResponse.json(
          { success: false, error: 'Company not found' },
          { status: 404 }
        )
      }
      
      if (error.message === 'Invalid API key') {
        return NextResponse.json(
          { success: false, error: 'Companies House API configuration error' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch company details' },
      { status: 500 }
    )
  }
} 