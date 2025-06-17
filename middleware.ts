import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next()

  // Add comprehensive anti-indexing headers
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, nocache')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  
  // Additional security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  // Prevent search engine indexing at header level
  response.headers.set('X-Search-Engine-Index', 'false')
  response.headers.set('X-Application-Type', 'internal-private')
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for real-time data
     * Only exclude static assets that should be cached
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
} 