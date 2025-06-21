/**
 * HMRC API Client for Agent Authorization
 * 
 * Simplified tool for HMRC Making Tax Digital API agent authentication
 * Documentation: https://developer.service.hmrc.gov.uk/
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

// OAuth 2.0 Scopes for different HMRC services
export const HMRC_SCOPES = {
  VAT: 'read:vat write:vat',
  OBLIGATIONS: 'read:vat-obligations',
  SUBMISSIONS: 'write:vat-returns',
  CORPORATION_TAX: 'read:corporation-tax write:corporation-tax'
} as const

// HMRC API Interfaces
export interface HMRCTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface HMRCOAuthState {
  userId: string
  clientId: string
  returnUrl?: string
  timestamp: number
}

export interface HMRCVATObligation {
  start: string
  end: string
  due: string
  status: 'O' | 'F' // Open or Fulfilled
  periodKey: string
  received?: string
}

/**
 * Generate OAuth 2.0 authorization URL for HMRC
 */
export function getHMRCAuthorizationUrl(
  userId: string, 
  clientId: string, 
  scopes: string = HMRC_SCOPES.VAT,
  returnUrl?: string
): string {
  const state = Buffer.from(JSON.stringify({
    userId,
    clientId,
    returnUrl,
    timestamp: Date.now()
  } as HMRCOAuthState)).toString('base64')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: HMRC_CONFIG.CLIENT_ID,
    scope: scopes,
    state,
    redirect_uri: HMRC_CONFIG.REDIRECT_URI
  })

  const baseUrl = HMRC_CONFIG.ENVIRONMENT === 'production' 
    ? HMRC_CONFIG.PRODUCTION_URL 
    : HMRC_CONFIG.SANDBOX_URL

  return `${baseUrl}/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  authorizationCode: string
): Promise<HMRCTokenResponse> {
  const baseUrl = HMRC_CONFIG.ENVIRONMENT === 'production' 
    ? HMRC_CONFIG.PRODUCTION_URL 
    : HMRC_CONFIG.SANDBOX_URL
  
  const tokenUrl = `${baseUrl}/oauth/token`
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: HMRC_CONFIG.CLIENT_ID,
    client_secret: HMRC_CONFIG.CLIENT_SECRET,
    redirect_uri: HMRC_CONFIG.REDIRECT_URI,
    code: authorizationCode
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HMRC token exchange failed: ${response.status} - ${error}`)
  }

  return await response.json()
}

/**
 * Refresh HMRC access token
 */
export async function refreshHMRCToken(refreshToken: string): Promise<HMRCTokenResponse> {
  const baseUrl = HMRC_CONFIG.ENVIRONMENT === 'production' 
    ? HMRC_CONFIG.PRODUCTION_URL 
    : HMRC_CONFIG.SANDBOX_URL
  
  const tokenUrl = `${baseUrl}/oauth/token`
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: HMRC_CONFIG.CLIENT_ID,
    client_secret: HMRC_CONFIG.CLIENT_SECRET,
    refresh_token: refreshToken
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HMRC token refresh failed: ${response.status} - ${error}`)
  }

  return await response.json()
}

/**
 * Make authenticated request to HMRC API
 */
async function makeHMRCRequest(
  endpoint: string, 
  accessToken: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<any> {
  const baseUrl = HMRC_CONFIG.ENVIRONMENT === 'production' 
    ? HMRC_CONFIG.PRODUCTION_URL 
    : HMRC_CONFIG.SANDBOX_URL
  
  const url = `${baseUrl}${endpoint}`
  
  const requestHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.hmrc.1.0+json',
    'Content-Type': 'application/json',
    ...headers
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    requestOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, requestOptions)

  if (response.status === 401) {
    throw new Error('HMRC API: Unauthorized - token may have expired')
  }

  if (response.status === 403) {
    throw new Error('HMRC API: Forbidden - insufficient permissions')
  }

  if (response.status === 429) {
    throw new Error('HMRC API: Rate limit exceeded')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HMRC API Error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

/**
 * Validate UK VAT number format
 */
export function isValidVATNumber(vrn: string): boolean {
  if (!vrn) return false
  
  // Remove whitespace and convert to uppercase
  const cleanVrn = vrn.replace(/\s/g, '').toUpperCase()
  
  // UK VAT number format: GB followed by 9 digits
  const ukVatRegex = /^GB\d{9}$/
  
  return ukVatRegex.test(cleanVrn)
}

/**
 * Format VAT number for display
 */
export function formatVATNumber(vrn: string): string {
  if (!vrn) return ''
  
  const cleanVrn = vrn.replace(/\s/g, '').toUpperCase()
  
  if (cleanVrn.startsWith('GB') && cleanVrn.length === 11) {
    // Format as GB123 456 789
    return `${cleanVrn.slice(0, 5)} ${cleanVrn.slice(5, 8)} ${cleanVrn.slice(8)}`
  }
  
  return cleanVrn
}

/**
 * Get VAT obligations for a VRN (for testing connection)
 */
export async function getVATObligations(
  vrn: string,
  accessToken: string,
  from?: string,
  to?: string,
  status?: 'O' | 'F'
): Promise<{ obligations: HMRCVATObligation[] }> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (status) params.set('status', status)
  
  const queryString = params.toString()
  const endpoint = `/organisations/vat/${vrn}/obligations${queryString ? `?${queryString}` : ''}`
  
  return await makeHMRCRequest(endpoint, accessToken)
}

export default {
  getHMRCAuthorizationUrl,
  exchangeCodeForToken,
  refreshHMRCToken,
  getVATObligations,
  isValidVATNumber,
  formatVATNumber,
  HMRC_SCOPES,
  HMRC_CONFIG
} 