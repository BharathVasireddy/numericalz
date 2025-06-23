/**
 * Custom API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Standardized API response handler
 * Throws ApiError for non-ok responses
 * 
 * @param response Fetch response object
 * @returns Parsed JSON data
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {}
    
    try {
      errorData = await response.json()
    } catch {
      // If response body is not JSON, use status text
      errorData = { message: response.statusText }
    }
    
    throw new ApiError(
      errorData.message || errorData.error || 'Request failed',
      response.status,
      errorData.code,
      errorData.details
    )
  }
  
  return response.json()
}

/**
 * Standardized fetch wrapper with error handling
 * 
 * @param url Request URL
 * @param options Fetch options
 * @returns Parsed JSON response
 */
export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
  
  return handleApiResponse<T>(response)
}

/**
 * Get user-friendly error message from any error type
 * 
 * @param error Error object of any type
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}

/**
 * Log error with context information
 * 
 * @param error Error to log
 * @param context Context information
 */
export function logError(error: unknown, context?: string): void {
  const contextStr = context ? ` in ${context}` : ''
  console.error(`Error${contextStr}:`, error)
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
} 