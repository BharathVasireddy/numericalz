import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAgentAuthorisation, getAgentAuthorisations } from '@/lib/hmrc-api'

// Request validation schema
const AgentAuthSchema = z.object({
  arn: z.string().min(1, 'Agent Reference Number is required'),
  service: z.array(z.string()).min(1, 'At least one service is required'),
  clientType: z.enum(['personal', 'business']),
  clientIdType: z.enum(['ni', 'vrn', 'utr']),
  clientId: z.string().min(1, 'Client ID is required'),
  knownFact: z.string().min(1, 'Known fact is required'),
  agentType: z.enum(['main', 'supporting']).optional(),
  accessToken: z.string().min(1, 'Access token is required')
})

const GetAuthsSchema = z.object({
  arn: z.string().min(1, 'Agent Reference Number is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  service: z.string().optional(),
  status: z.string().optional(),
  createdOnOrAfter: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = AgentAuthSchema.parse(body)
    
    const { arn, accessToken, ...authRequest } = validatedData

    // Create agent authorization request
    const result = await createAgentAuthorisation(arn, authRequest, accessToken)

    return NextResponse.json({
      success: true,
      message: 'Authorization request created successfully',
      data: result
    })

  } catch (error) {
    console.error('Agent authorization error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    if (error instanceof Error) {
      // Handle HMRC API specific errors
      if (error.message.includes('CLIENT_REGISTRATION_NOT_FOUND')) {
        return NextResponse.json({
          error: 'Client not found',
          message: 'The client details provided do not match HMRC records'
        }, { status: 404 })
      }
      
      if (error.message.includes('POSTCODE_DOES_NOT_MATCH')) {
        return NextResponse.json({
          error: 'Known fact mismatch',
          message: 'The postcode provided does not match HMRC records'
        }, { status: 400 })
      }
      
      if (error.message.includes('DUPLICATE_AUTHORISATION_REQUEST')) {
        return NextResponse.json({
          error: 'Duplicate request',
          message: 'An authorization request for this service already exists'
        }, { status: 409 })
      }
      
      if (error.message.includes('ALREADY_AUTHORISED')) {
        return NextResponse.json({
          error: 'Already authorized',
          message: 'The client has already authorized the agent for this service'
        }, { status: 409 })
      }
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create authorization request'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryData = {
      arn: searchParams.get('arn'),
      accessToken: searchParams.get('accessToken'),
      service: searchParams.get('service'),
      status: searchParams.get('status'),
      createdOnOrAfter: searchParams.get('createdOnOrAfter')
    }

    const validatedData = GetAuthsSchema.parse(queryData)
    const { arn, accessToken, ...filters } = validatedData

    // Remove undefined values from filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    )

    // Get agent authorizations
    const authorizations = await getAgentAuthorisations(
      arn, 
      accessToken, 
      Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined
    )

    return NextResponse.json({
      success: true,
      data: authorizations
    })

  } catch (error) {
    console.error('Get authorizations error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to retrieve authorizations'
    }, { status: 500 })
  }
} 