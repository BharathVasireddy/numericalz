import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVATObligations, isValidVATNumber } from '@/lib/hmrc-api'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ObligationsQuerySchema = z.object({
  vrn: z.string().min(1, 'VRN is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(['O', 'F']).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryParams = {
      vrn: url.searchParams.get('vrn') || '',
      accessToken: url.searchParams.get('accessToken') || '',
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      status: url.searchParams.get('status') as 'O' | 'F' | undefined
    }

    // Validate query parameters
    const validatedParams = ObligationsQuerySchema.parse(queryParams)

    // Validate VRN format
    if (!isValidVATNumber(validatedParams.vrn)) {
      return NextResponse.json({ 
        error: 'Invalid VAT registration number format' 
      }, { status: 400 })
    }

    // Clean VRN (remove spaces and ensure uppercase)
    const cleanVrn = validatedParams.vrn.replace(/\s/g, '').toUpperCase()

    // Get VAT obligations from HMRC
    const obligationsResponse = await getVATObligations(
      cleanVrn,
      validatedParams.accessToken,
      validatedParams.from,
      validatedParams.to,
      validatedParams.status
    )

    return NextResponse.json({
      success: true,
      vrn: cleanVrn,
      obligations: obligationsResponse.obligations,
      retrievedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('VAT obligations error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    if (error instanceof Error) {
      // Handle HMRC API specific errors
      if (error.message === 'HMRC_TOKEN_EXPIRED') {
        return NextResponse.json({
          error: 'HMRC authentication token has expired. Please re-authenticate.',
          code: 'TOKEN_EXPIRED'
        }, { status: 401 })
      }

      if (error.message === 'HMRC_ACCESS_DENIED') {
        return NextResponse.json({
          error: 'Access denied by HMRC. Check your permissions and VRN.',
          code: 'ACCESS_DENIED'
        }, { status: 403 })
      }

      if (error.message === 'HMRC_RATE_LIMIT_EXCEEDED') {
        return NextResponse.json({
          error: 'HMRC rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT'
        }, { status: 429 })
      }

      if (error.message.includes('HMRC API error')) {
        return NextResponse.json({
          error: `HMRC API error: ${error.message}`,
          code: 'HMRC_API_ERROR'
        }, { status: 502 })
      }
    }

    return NextResponse.json({
      error: 'Failed to retrieve VAT obligations from HMRC',
      code: 'OBLIGATIONS_FAILED'
    }, { status: 500 })
  }
} 