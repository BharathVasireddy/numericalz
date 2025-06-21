import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeCodeForToken } from '@/lib/hmrc-api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, state } = await request.json()

    if (!code || !state) {
      return NextResponse.json({ 
        error: 'Missing authorization code or state' 
      }, { status: 400 })
    }

    // Decode and validate state
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())
      
      // Validate state contains expected fields
      if (!decodedState.userId || !decodedState.clientId || !decodedState.timestamp) {
        return NextResponse.json({ 
          error: 'Invalid state parameter' 
        }, { status: 400 })
      }

      // Check if state is not too old (5 minutes max)
      const stateAge = Date.now() - decodedState.timestamp
      if (stateAge > 5 * 60 * 1000) {
        return NextResponse.json({ 
          error: 'State parameter expired' 
        }, { status: 400 })
      }

      // Verify user matches session
      if (decodedState.userId !== session.user.id) {
        return NextResponse.json({ 
          error: 'User mismatch in state' 
        }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid state format' 
      }, { status: 400 })
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code)

    return NextResponse.json({
      success: true,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope
    })

  } catch (error) {
    console.error('HMRC callback error:', error)
    
    let errorMessage = 'Failed to exchange authorization code'
    if (error instanceof Error) {
      if (error.message.includes('HMRC token exchange failed')) {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 