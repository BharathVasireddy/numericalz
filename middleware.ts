import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * PERFORMANCE OPTIMIZED Authentication middleware
 * 
 * - Fast token validation
 * - Minimal security headers
 * - Reduced processing overhead
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static assets and API auth routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next()
  }

  // Fast token check - only for protected routes
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/api/clients') ||
                          pathname.startsWith('/api/users') ||
                          pathname.startsWith('/api/companies-house') ||
                          pathname.startsWith('/api/calendar')

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Handle authenticated users on auth pages
  if (pathname.startsWith('/auth') && pathname !== '/auth/error') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Minimal response with essential security headers only
  const response = NextResponse.next()
  
  // Only essential security headers for performance
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  
  return response
}

export const config = {
  matcher: [
    /*
     * Simple matcher - only process dashboard and API routes
     */
    '/dashboard/:path*',
    '/api/clients/:path*',
    '/api/users/:path*',
    '/api/companies-house/:path*',
    '/api/calendar/:path*',
    '/auth/:path*',
    '/',
  ],
} 