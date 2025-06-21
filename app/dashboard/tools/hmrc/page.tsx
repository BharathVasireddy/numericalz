'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  Shield, 
  ExternalLink, 
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { 
  getHMRCAuthorizationUrl,
  HMRC_CONFIG
} from '@/lib/hmrc-api'

export default function HMRCAgentAuthPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authInfo, setAuthInfo] = useState<any>(null)

  // Check for auth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')

    if (error) {
      setAuthError(`HMRC Authentication failed: ${error}`)
      return
    }

    if (code && state) {
      handleAuthCallback(code, state)
    }

    // Check for stored token
    const storedToken = localStorage.getItem('hmrc_access_token')
    const storedInfo = localStorage.getItem('hmrc_auth_info')
    if (storedToken) {
      setAuthToken(storedToken)
      setIsAuthenticated(true)
      if (storedInfo) {
        setAuthInfo(JSON.parse(storedInfo))
      }
    }
  }, [])

  const handleAuthCallback = async (code: string, state: string) => {
    try {
      const response = await fetch('/api/hmrc/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      })

      const data = await response.json()

      if (data.success) {
        setAuthToken(data.access_token)
        setIsAuthenticated(true)
        setAuthInfo({
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          scope: data.scope,
          authenticated_at: new Date().toISOString()
        })
        
        localStorage.setItem('hmrc_access_token', data.access_token)
        localStorage.setItem('hmrc_refresh_token', data.refresh_token)
        localStorage.setItem('hmrc_auth_info', JSON.stringify({
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          scope: data.scope,
          authenticated_at: new Date().toISOString()
        }))
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        setAuthError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setAuthError('Failed to complete authentication')
    }
  }

  const initiateHMRCAuth = () => {
    if (!session?.user?.id) {
      setAuthError('Please log in to authenticate with HMRC')
      return
    }

    const authUrl = getHMRCAuthorizationUrl(
      session.user.id,
      'numericalz-client',
      'read:vat write:vat',
      '/dashboard/tools/hmrc'
    )

    window.location.href = authUrl
  }

  const clearAuthentication = () => {
    setIsAuthenticated(false)
    setAuthToken(null)
    setAuthInfo(null)
    setAuthError(null)
    localStorage.removeItem('hmrc_access_token')
    localStorage.removeItem('hmrc_refresh_token')
    localStorage.removeItem('hmrc_auth_info')
  }

  const testConnection = async () => {
    if (!authToken) return

    try {
      const response = await fetch('/api/hmrc/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vrn: '123456789', // Test VRN for sandbox
          accessToken: authToken
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('Connection test successful!')
      } else {
        alert(`Connection test failed: ${result.error}`)
      }
    } catch (error) {
      alert('Connection test failed')
    }
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/tools')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tools
            </Button>
          </div>

          <div className="page-header">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">HMRC Agent Authorization</h1>
                <p className="text-muted-foreground">
                  Authenticate with HMRC Making Tax Digital API for agent services
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {HMRC_CONFIG.ENVIRONMENT === 'sandbox' ? 'Sandbox' : 'Production'}
              </Badge>
            </div>
          </div>

          {/* Error Alert */}
          {authError && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <div className="grid gap-6">
            {/* Authentication Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isAuthenticated ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                  Authentication Status
                </CardTitle>
                <CardDescription>
                  {isAuthenticated 
                    ? 'Successfully authenticated with HMRC API'
                    : 'Not authenticated - click below to start the authorization process'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        This will redirect you to HMRC's authorization server to grant access to your agent account.
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={initiateHMRCAuth}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Authorize with HMRC
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Token Type:</span>
                        <p className="text-muted-foreground">{authInfo?.token_type || 'Bearer'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Scope:</span>
                        <p className="text-muted-foreground">{authInfo?.scope || 'read:vat write:vat'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Authenticated:</span>
                        <p className="text-muted-foreground">
                          {authInfo?.authenticated_at 
                            ? new Date(authInfo.authenticated_at).toLocaleString()
                            : 'Recently'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Environment:</span>
                        <p className="text-muted-foreground">{HMRC_CONFIG.ENVIRONMENT}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={testConnection}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Test Connection
                      </Button>
                      <Button 
                        onClick={clearAuthentication}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        Clear Authorization
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>About Agent Authorization</CardTitle>
                <CardDescription>
                  Understanding HMRC Making Tax Digital agent authorization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <h4 className="font-medium mb-2">What this does:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Authenticates your agent account with HMRC</li>
                      <li>Grants access to Making Tax Digital APIs</li>
                      <li>Enables VAT return submission and retrieval</li>
                      <li>Provides access to client obligations</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Environment:</h4>
                    <p className="text-sm text-muted-foreground">
                      Currently using HMRC {HMRC_CONFIG.ENVIRONMENT} environment. 
                      {HMRC_CONFIG.ENVIRONMENT === 'sandbox' && ' This is safe for testing and will not affect real data.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Security:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Uses OAuth 2.0 authorization flow</li>
                      <li>Tokens are stored securely in browser storage</li>
                      <li>All communication is encrypted (HTTPS)</li>
                      <li>Follows HMRC security guidelines</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 