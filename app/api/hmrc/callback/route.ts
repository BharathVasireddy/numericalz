import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeCodeForToken } from '@/lib/hmrc-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('HMRC OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard/tools/hmrc?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/tools/hmrc?error=missing_code', request.url)
      )
    }

    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code)

    // Store token data in localStorage via client-side redirect
    const redirectUrl = new URL('/dashboard/tools/hmrc', request.url)
    redirectUrl.searchParams.set('token', tokenData.access_token)
    redirectUrl.searchParams.set('expires_in', tokenData.expires_in.toString())
    redirectUrl.searchParams.set('scope', tokenData.scope)
    if (tokenData.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', tokenData.refresh_token)
    }
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }

    return NextResponse.redirect(redirectUrl)
    
  } catch (error) {
    console.error('HMRC callback error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/dashboard/tools/hmrc?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
} 