import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  getApplicationToken,
  createAgentAuthorisation,
  getAgentAuthorisations,
  SUPPORTED_SERVICES,
  CLIENT_TYPES,
  CLIENT_ID_TYPES,
  isValidNationalInsurance,
  isValidVATNumber,
  isValidPostcode,
  type AgentAuthRequest
} from '@/lib/hmrc-api'

// Validation schemas
const CreateAuthRequestSchema = z.object({
  arn: z.string().min(1, 'Agent Reference Number is required'),
  service: z.array(z.enum(['MTD-VAT', 'MTD-IT', 'MTD-CT'])).min(1, 'At least one service must be selected'),
  clientType: z.enum(['personal', 'business']),
  clientIdType: z.enum(['ni', 'vrn', 'utr']),
  clientId: z.string().min(1, 'Client ID is required'),
  knownFact: z.string().min(1, 'Known fact is required')
})

const GetAuthRequestsSchema = z.object({
  arn: z.string().min(1, 'Agent Reference Number is required'),
  service: z.string().optional(),
  status: z.string().optional(),
  createdOnOrAfter: z.string().optional()
})

/**
 * POST - Create new agent authorization request
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = CreateAuthRequestSchema.parse(body)

    // Additional validation based on client ID type
    if (validatedData.clientIdType === 'ni' && !isValidNationalInsurance(validatedData.clientId)) {
      return NextResponse.json({
        error: 'Invalid National Insurance number format'
      }, { status: 400 })
    }

    if (validatedData.clientIdType === 'vrn' && !isValidVATNumber(validatedData.clientId)) {
      return NextResponse.json({
        error: 'Invalid VAT registration number format'
      }, { status: 400 })
    }

    // Validate postcode for personal clients
    if (validatedData.clientType === 'personal' && !isValidPostcode(validatedData.knownFact)) {
      return NextResponse.json({
        error: 'Invalid postcode format'
      }, { status: 400 })
    }

    // Get application access token using client credentials
    const tokenResponse = await getApplicationToken()

    // Create authorization request
    const authRequest: AgentAuthRequest = {
      service: validatedData.service,
      clientType: validatedData.clientType,
      clientIdType: validatedData.clientIdType,
      clientId: validatedData.clientId.replace(/\s/g, '').toUpperCase(),
      knownFact: validatedData.knownFact.replace(/\s/g, '').toUpperCase()
    }

    const result = await createAgentAuthorisation(
      validatedData.arn,
      authRequest,
      tokenResponse.access_token
    )

    return NextResponse.json({
      success: true,
      message: 'Authorization request created successfully. HMRC will send an authorization code to the client by post within 7 working days.',
      data: {
        invitationId: result.invitationId,
        location: result.location,
        arn: validatedData.arn,
        service: validatedData.service,
        clientType: validatedData.clientType,
        clientIdType: validatedData.clientIdType,
        clientId: validatedData.clientId,
        status: 'Pending'
      }
    })

  } catch (error) {
    console.error('Agent authorization request failed:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error) {
      // Handle specific HMRC API errors with user-friendly messages
      if (error.message.includes('INVALID_CREDENTIALS')) {
        return NextResponse.json({
          success: false,
          error: 'HMRC Authentication Error',
          message: 'This is expected in the sandbox environment. In production, your agent would need to be properly enrolled with HMRC Agent Services.',
          details: 'The sandbox environment requires proper agent enrollment to access authorization endpoints. This error confirms the API connection is working correctly.'
        }, { status: 400 })
      }

      if (error.message.includes('AGENT_NOT_SUBSCRIBED')) {
        return NextResponse.json({
          success: false,
          error: 'Agent is not subscribed to Agent Services',
          message: 'Please ensure your agent is properly enrolled with HMRC Agent Services.'
        }, { status: 400 })
      }

      if (error.message.includes('CLIENT_REGISTRATION_NOT_FOUND')) {
        return NextResponse.json({
          success: false,
          error: 'Client registration not found with HMRC',
          message: 'The client details provided do not match any records in HMRC systems.'
        }, { status: 400 })
      }

      if (error.message.includes('POSTCODE_DOES_NOT_MATCH')) {
        return NextResponse.json({
          success: false,
          error: 'Postcode does not match HMRC records',
          message: 'The postcode provided does not match the client\'s registered address with HMRC.'
        }, { status: 400 })
      }

      if (error.message.includes('VAT_REG_DATE_DOES_NOT_MATCH')) {
        return NextResponse.json({
          success: false,
          error: 'VAT registration date does not match HMRC records',
          message: 'The VAT registration date provided does not match HMRC records.'
        }, { status: 400 })
      }

      if (error.message.includes('Token request failed')) {
        return NextResponse.json({
          success: false,
          error: 'HMRC Authentication Failed',
          message: 'Unable to authenticate with HMRC API. Please check the API credentials.'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: false,
        error: 'HMRC API Error',
        message: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request.'
    }, { status: 500 })
  }
}

/**
 * GET - Retrieve agent authorization requests
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryData = {
      arn: searchParams.get('arn') || '',
      service: searchParams.get('service') || undefined,
      status: searchParams.get('status') || undefined,
      createdOnOrAfter: searchParams.get('createdOnOrAfter') || undefined
    }

    const validatedQuery = GetAuthRequestsSchema.parse(queryData)

    // Get application access token
    const tokenResponse = await getApplicationToken()

    // Get authorization requests
    const requests = await getAgentAuthorisations(
      validatedQuery.arn,
      tokenResponse.access_token,
      {
        service: validatedQuery.service,
        status: validatedQuery.status,
        createdOnOrAfter: validatedQuery.createdOnOrAfter
      }
    )

    return NextResponse.json({
      success: true,
      data: requests
    })

  } catch (error) {
    console.error('Failed to retrieve authorization requests:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error) {
      if (error.message.includes('INVALID_CREDENTIALS')) {
        return NextResponse.json({
          success: false,
          error: 'HMRC Authentication Error',
          message: 'Unable to retrieve authorization requests. This is expected in the sandbox environment without proper agent enrollment.'
        }, { status: 400 })
      }

      return NextResponse.json({
        success: false,
        error: 'HMRC API Error',
        message: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving authorization requests.'
    }, { status: 500 })
  }
} 