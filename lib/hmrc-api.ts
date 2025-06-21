/**
 * HMRC Agent Authorisation API Client
 * 
 * Implements the HMRC Agent Authorisation flow for requesting client authorization
 * Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/agent-authorisation-api/1.0
 */

// HMRC Sandbox Configuration
export const HMRC_CONFIG = {
  CLIENT_ID: 'DjbFKograkCTR4F4sde3XkZOFA3R',
  CLIENT_SECRET: '416b9226-1736-4026-93fb-949fed59655e',
  SANDBOX_URL: 'https://test-api.service.hmrc.gov.uk',
  PRODUCTION_URL: 'https://api.service.hmrc.gov.uk',
  ENVIRONMENT: 'sandbox',
  REDIRECT_URI: 'http://localhost:3000/dashboard/tools/hmrc'
}

// OAuth 2.0 Scopes for Agent Authorisation
export const HMRC_SCOPES = {
  AGENT_AUTH: 'read:agent-authorisation write:agent-authorisation'
} as const

// Supported services for agent authorization
export const SUPPORTED_SERVICES = {
  VAT: 'MTD-VAT',
  INCOME_TAX: 'MTD-IT',
  CORPORATION_TAX: 'MTD-CT'
} as const

// Client types
export const CLIENT_TYPES = {
  PERSONAL: 'personal',
  BUSINESS: 'business'
} as const

// Client identifier types
export const CLIENT_ID_TYPES = {
  NATIONAL_INSURANCE: 'ni',
  VAT_REGISTRATION: 'vrn',
  UTR: 'utr'
} as const

// Authorization request status
export const AUTH_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled'
} as const

/**
 * Types and Interfaces
 */
export interface HMRCTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface AgentAuthRequest {
  service: string[]
  clientType: string
  clientIdType: string
  clientId: string
  knownFact: string
  agentType?: string
}

export interface AuthorisationInvitation {
  _links: {
    self: {
      href: string
    }
  }
  created: string
  expiresOn?: string
  arn: string
  service: string[]
  status: string
  clientActionUrl?: string
  agentType?: string
  updated?: string
}

export interface HMRCError {
  code: string
  message: string
}

/**
 * Generate HMRC OAuth 2.0 authorization URL
 */
export function getHMRCAuthorizationUrl(state?: string): string {
  const baseUrl = `${HMRC_CONFIG.SANDBOX_URL}/oauth/authorize`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: HMRC_CONFIG.CLIENT_ID,
    scope: HMRC_SCOPES.AGENT_AUTH,
    redirect_uri: HMRC_CONFIG.REDIRECT_URI,
    ...(state && { state })
  })
  
  return `${baseUrl}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<HMRCTokenResponse> {
  const response = await fetch(`${HMRC_CONFIG.SANDBOX_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HMRC_CONFIG.CLIENT_ID,
      client_secret: HMRC_CONFIG.CLIENT_SECRET,
      redirect_uri: HMRC_CONFIG.REDIRECT_URI
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return await response.json()
}

/**
 * Refresh access token
 */
export async function refreshHMRCToken(refreshToken: string): Promise<HMRCTokenResponse> {
  const response = await fetch(`${HMRC_CONFIG.SANDBOX_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: HMRC_CONFIG.CLIENT_ID,
      client_secret: HMRC_CONFIG.CLIENT_SECRET
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return await response.json()
}

/**
 * Make authenticated request to HMRC API
 */
async function makeHMRCRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${HMRC_CONFIG.SANDBOX_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  // Handle different response types
  if (response.status === 204) {
    return { success: true }
  }

  if (response.status === 201) {
    // For creation responses, return location header
    const location = response.headers.get('Location')
    return { success: true, location }
  }

  if (!response.ok) {
    let errorData: HMRCError
    try {
      errorData = await response.json()
    } catch {
      errorData = { code: 'UNKNOWN_ERROR', message: response.statusText }
    }
    throw new Error(`HMRC API Error: ${errorData.code} - ${errorData.message}`)
  }

  return await response.json()
}

/**
 * Create agent authorization request
 * This sends a request to HMRC to authorize an agent for a client
 * HMRC will send an authorization code to the client by post
 */
export async function createAgentAuthorisation(
  arn: string,
  authRequest: AgentAuthRequest,
  accessToken: string
): Promise<{ success: boolean; location?: string; invitationId?: string }> {
  const endpoint = `/agents/${arn}/invitations`
  
  const result = await makeHMRCRequest(endpoint, accessToken, {
    method: 'POST',
    body: JSON.stringify(authRequest)
  })

  // Extract invitation ID from location header
  let invitationId: string | undefined
  if (result.location) {
    const matches = result.location.match(/\/invitations\/([^\/]+)$/)
    invitationId = matches?.[1]
  }

  return {
    success: result.success,
    location: result.location,
    invitationId
  }
}

/**
 * Get all authorization requests for an agent
 */
export async function getAgentAuthorisations(
  arn: string,
  accessToken: string,
  filters?: {
    service?: string
    status?: string
    createdOnOrAfter?: string
  }
): Promise<AuthorisationInvitation[]> {
  let endpoint = `/agents/${arn}/invitations`
  
  if (filters) {
    const params = new URLSearchParams()
    if (filters.service) params.set('service', filters.service)
    if (filters.status) params.set('status', filters.status)
    if (filters.createdOnOrAfter) params.set('createdOnOrAfter', filters.createdOnOrAfter)
    
    const queryString = params.toString()
    if (queryString) {
      endpoint += `?${queryString}`
    }
  }
  
  const result = await makeHMRCRequest(endpoint, accessToken)
  return Array.isArray(result) ? result : []
}

/**
 * Get specific authorization request
 */
export async function getAgentAuthorisation(
  arn: string,
  invitationId: string,
  accessToken: string
): Promise<AuthorisationInvitation> {
  const endpoint = `/agents/${arn}/invitations/${invitationId}`
  return await makeHMRCRequest(endpoint, accessToken)
}

/**
 * Cancel authorization request
 */
export async function cancelAgentAuthorisation(
  arn: string,
  invitationId: string,
  accessToken: string
): Promise<{ success: boolean }> {
  const endpoint = `/agents/${arn}/invitations/${invitationId}`
  return await makeHMRCRequest(endpoint, accessToken, {
    method: 'DELETE'
  })
}

/**
 * Check relationship status
 */
export async function checkRelationshipStatus(
  arn: string,
  relationshipRequest: Omit<AgentAuthRequest, 'clientType'>,
  accessToken: string
): Promise<{ authorized: boolean }> {
  const endpoint = `/agents/${arn}/relationships`
  
  try {
    const result = await makeHMRCRequest(endpoint, accessToken, {
      method: 'POST',
      body: JSON.stringify(relationshipRequest)
    })
    return { authorized: true }
  } catch (error) {
    // 404 means relationship not found (not authorized)
    if (error instanceof Error && error.message.includes('RELATIONSHIP_NOT_FOUND')) {
      return { authorized: false }
    }
    throw error
  }
}

/**
 * Validate UK National Insurance number format
 */
export function isValidNationalInsurance(nino: string): boolean {
  if (!nino) return false
  
  // Remove whitespace and convert to uppercase
  const cleanNino = nino.replace(/\s/g, '').toUpperCase()
  
  // UK NINO format: 2 letters, 6 digits, 1 letter (e.g., AB123456C)
  const ninoRegex = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/
  
  return ninoRegex.test(cleanNino)
}

/**
 * Validate UK VAT number format
 */
export function isValidVATNumber(vrn: string): boolean {
  if (!vrn) return false
  
  // Remove whitespace and convert to uppercase
  const cleanVrn = vrn.replace(/\s/g, '').toUpperCase()
  
  // UK VAT number format: 9 digits or GB followed by 9 digits
  const vatRegex = /^(GB)?\d{9}$/
  
  return vatRegex.test(cleanVrn)
}

/**
 * Validate UK postcode format
 */
export function isValidPostcode(postcode: string): boolean {
  if (!postcode) return false
  
  // Remove whitespace and convert to uppercase
  const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase()
  
  // UK postcode format
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/
  
  return postcodeRegex.test(cleanPostcode)
}

/**
 * Format National Insurance number
 */
export function formatNationalInsurance(nino: string): string {
  if (!nino) return ''
  
  const cleanNino = nino.replace(/\s/g, '').toUpperCase()
  
  if (cleanNino.length === 9) {
    return `${cleanNino.slice(0, 2)} ${cleanNino.slice(2, 4)} ${cleanNino.slice(4, 6)} ${cleanNino.slice(6, 8)} ${cleanNino.slice(8)}`
  }
  
  return nino
}

/**
 * Format postcode
 */
export function formatPostcode(postcode: string): string {
  if (!postcode) return ''
  
  const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase()
  
  // Add space before last 3 characters
  if (cleanPostcode.length >= 5) {
    const firstPart = cleanPostcode.slice(0, -3)
    const lastPart = cleanPostcode.slice(-3)
    return `${firstPart} ${lastPart}`
  }
  
  return postcode
}

export default {
  getHMRCAuthorizationUrl,
  exchangeCodeForToken,
  refreshHMRCToken,
  createAgentAuthorisation,
  getAgentAuthorisations,
  getAgentAuthorisation,
  cancelAgentAuthorisation,
  checkRelationshipStatus,
  isValidNationalInsurance,
  isValidVATNumber,
  isValidPostcode,
  formatNationalInsurance,
  formatPostcode,
  HMRC_SCOPES,
  HMRC_CONFIG,
  SUPPORTED_SERVICES,
  CLIENT_TYPES,
  CLIENT_ID_TYPES,
  AUTH_STATUS
} 