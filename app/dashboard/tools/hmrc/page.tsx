'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  Shield, 
  ExternalLink, 
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  RefreshCw,
  Send,
  Clock,
  UserCheck,
  X,
  Eye,
  Trash2
} from 'lucide-react'
import { 
  getHMRCAuthorizationUrl,
  HMRC_CONFIG,
  SUPPORTED_SERVICES,
  CLIENT_TYPES,
  CLIENT_ID_TYPES,
  AUTH_STATUS,
  isValidNationalInsurance,
  isValidVATNumber,
  isValidPostcode,
  formatNationalInsurance,
  formatPostcode
} from '@/lib/hmrc-api'

interface HMRCTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  expires_at: number
}

interface AuthorizationRequest {
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
  invitationId?: string
}

export default function HMRCAgentAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  
  // Authentication state
  const [tokens, setTokens] = useState<HMRCTokens | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    arn: '',
    service: ['MTD-VAT'],
    clientType: 'personal',
    clientIdType: 'ni',
    clientId: '',
    knownFact: '',
    agentType: 'main'
  })
  
  // Authorization requests state
  const [authRequests, setAuthRequests] = useState<AuthorizationRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Handle OAuth callback parameters
  useEffect(() => {
    const token = searchParams.get('token')
    const expiresIn = searchParams.get('expires_in')
    const refreshToken = searchParams.get('refresh_token')
    const scope = searchParams.get('scope')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      setError(`Authentication failed: ${oauthError}`)
      return
    }

    if (token && expiresIn && scope) {
      const tokenData: HMRCTokens = {
        access_token: token,
        refresh_token: refreshToken || undefined,
        expires_in: parseInt(expiresIn),
        scope,
        expires_at: Date.now() + (parseInt(expiresIn) * 1000)
      }
      
      setTokens(tokenData)
      localStorage.setItem('hmrc_tokens', JSON.stringify(tokenData))
      setSuccess('Successfully authenticated with HMRC!')
      
      // Clean up URL parameters
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('token')
      cleanUrl.searchParams.delete('expires_in')
      cleanUrl.searchParams.delete('refresh_token')
      cleanUrl.searchParams.delete('scope')
      window.history.replaceState({}, '', cleanUrl.toString())
    }
  }, [searchParams])

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('hmrc_tokens')
    if (storedTokens) {
      try {
        const parsedTokens: HMRCTokens = JSON.parse(storedTokens)
        // Check if token is still valid
        if (parsedTokens.expires_at > Date.now()) {
          setTokens(parsedTokens)
        } else {
          localStorage.removeItem('hmrc_tokens')
        }
      } catch (error) {
        localStorage.removeItem('hmrc_tokens')
      }
    }
  }, [])

  // Load authorization requests when tokens are available
  useEffect(() => {
    if (tokens && formData.arn) {
      loadAuthorizationRequests()
    }
  }, [tokens, formData.arn])

  const handleAuthenticate = () => {
    setIsLoading(true)
    setError(null)
    
    const authUrl = getHMRCAuthorizationUrl(`${Date.now()}`)
    window.location.href = authUrl
  }

  const handleLogout = () => {
    setTokens(null)
    localStorage.removeItem('hmrc_tokens')
    setSuccess('Logged out successfully')
    setAuthRequests([])
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleServiceChange = (service: string) => {
    setFormData(prev => ({ ...prev, service: [service] }))
  }

  const validateForm = (): string | null => {
    if (!formData.arn.trim()) return 'Agent Reference Number is required'
    if (!formData.clientId.trim()) return 'Client ID is required'
    if (!formData.knownFact.trim()) return 'Known fact is required'
    
    // Validate client ID format
    if (formData.clientIdType === 'ni' && !isValidNationalInsurance(formData.clientId)) {
      return 'Invalid National Insurance number format'
    }
    if (formData.clientIdType === 'vrn' && !isValidVATNumber(formData.clientId)) {
      return 'Invalid VAT registration number format'
    }
    
    // Validate known fact format (postcode for personal clients)
    if (formData.clientType === 'personal' && !isValidPostcode(formData.knownFact)) {
      return 'Invalid postcode format'
    }
    
    return null
  }

  const handleSubmitAuthorization = async () => {
    if (!tokens) {
      setError('Please authenticate with HMRC first')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/hmrc/agent-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          accessToken: tokens.access_token
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Authorization request submitted successfully! HMRC will send an authorization code to the client within 7 working days.')
        // Reset form
        setFormData(prev => ({ ...prev, clientId: '', knownFact: '' }))
        // Reload authorization requests
        await loadAuthorizationRequests()
      } else {
        setError(data.message || data.error || 'Failed to submit authorization request')
      }
    } catch (error) {
      console.error('Authorization request error:', error)
      setError('Failed to submit authorization request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAuthorizationRequests = async () => {
    if (!tokens || !formData.arn) return

    setLoadingRequests(true)
    try {
      const params = new URLSearchParams({
        arn: formData.arn,
        accessToken: tokens.access_token
      })

      const response = await fetch(`/api/hmrc/agent-auth?${params}`)
      const data = await response.json()

      if (data.success) {
        setAuthRequests(data.data || [])
      } else {
        console.error('Failed to load authorization requests:', data.error)
      }
    } catch (error) {
      console.error('Failed to load authorization requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case AUTH_STATUS.PENDING:
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case AUTH_STATUS.ACCEPTED:
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
      case AUTH_STATUS.REJECTED:
        return <Badge variant="outline" className="text-red-600"><X className="w-3 h-3 mr-1" />Rejected</Badge>
      case AUTH_STATUS.EXPIRED:
        return <Badge variant="outline" className="text-gray-600"><Clock className="w-3 h-3 mr-1" />Expired</Badge>
      case AUTH_STATUS.CANCELLED:
        return <Badge variant="outline" className="text-gray-600"><X className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatClientId = (id: string, type: string) => {
    if (type === 'ni') return formatNationalInsurance(id)
    return id
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

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">HMRC Agent Authorization</h1>
            </div>
            <p className="text-muted-foreground">
              Request client authorization through HMRC Making Tax Digital API
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Authentication Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication Status
              </CardTitle>
              <CardDescription>
                Connect to HMRC Making Tax Digital API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tokens ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700">Connected to HMRC</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(tokens.expires_at).toLocaleString()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-700">Not Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Authenticate with HMRC to begin
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {HMRC_CONFIG.ENVIRONMENT === 'sandbox' ? 'Sandbox' : 'Production'}
                  </Badge>
                  {tokens ? (
                    <Button variant="outline" onClick={handleLogout}>
                      Logout
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleAuthenticate}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Connect to HMRC
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          {tokens && (
            <Tabs defaultValue="request" className="space-y-6">
              <TabsList>
                <TabsTrigger value="request">New Authorization Request</TabsTrigger>
                <TabsTrigger value="manage">Manage Requests</TabsTrigger>
              </TabsList>

              {/* New Authorization Request */}
              <TabsContent value="request">
                <Card>
                  <CardHeader>
                    <CardTitle>Request Client Authorization</CardTitle>
                    <CardDescription>
                      Submit client details to request authorization. HMRC will send an authorization code to the client by post within 7 working days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Agent Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Agent Details</h3>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="arn">Agent Reference Number (ARN)</Label>
                          <Input
                            id="arn"
                            value={formData.arn}
                            onChange={(e) => handleInputChange('arn', e.target.value)}
                            placeholder="AARN1234567"
                            className="mt-1"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Your HMRC Agent Reference Number
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Service Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Service</h3>
                      <div>
                        <Label htmlFor="service">HMRC Service</Label>
                        <Select value={formData.service[0]} onValueChange={handleServiceChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SUPPORTED_SERVICES.VAT}>Making Tax Digital for VAT</SelectItem>
                            <SelectItem value={SUPPORTED_SERVICES.INCOME_TAX}>Making Tax Digital for Income Tax</SelectItem>
                            <SelectItem value={SUPPORTED_SERVICES.CORPORATION_TAX}>Making Tax Digital for Corporation Tax</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Client Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Client Details</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="clientType">Client Type</Label>
                          <Select 
                            value={formData.clientType} 
                            onValueChange={(value) => handleInputChange('clientType', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={CLIENT_TYPES.PERSONAL}>Personal</SelectItem>
                              <SelectItem value={CLIENT_TYPES.BUSINESS}>Business</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="clientIdType">Client ID Type</Label>
                          <Select 
                            value={formData.clientIdType} 
                            onValueChange={(value) => handleInputChange('clientIdType', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={CLIENT_ID_TYPES.NATIONAL_INSURANCE}>National Insurance Number</SelectItem>
                              <SelectItem value={CLIENT_ID_TYPES.VAT_REGISTRATION}>VAT Registration Number</SelectItem>
                              <SelectItem value={CLIENT_ID_TYPES.UTR}>Unique Taxpayer Reference</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="clientId">
                            {formData.clientIdType === 'ni' ? 'National Insurance Number' :
                             formData.clientIdType === 'vrn' ? 'VAT Registration Number' : 
                             'Unique Taxpayer Reference'}
                          </Label>
                          <Input
                            id="clientId"
                            value={formData.clientId}
                            onChange={(e) => handleInputChange('clientId', e.target.value)}
                            placeholder={
                              formData.clientIdType === 'ni' ? 'AB123456C' :
                              formData.clientIdType === 'vrn' ? '123456789' : 
                              '1234567890'
                            }
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="knownFact">
                            {formData.clientType === 'personal' ? 'Postcode' : 'Known Fact'}
                          </Label>
                          <Input
                            id="knownFact"
                            value={formData.knownFact}
                            onChange={(e) => handleInputChange('knownFact', e.target.value)}
                            placeholder={formData.clientType === 'personal' ? 'SW1A 1AA' : 'Enter known fact'}
                            className="mt-1"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            {formData.clientType === 'personal' 
                              ? 'Client\'s postcode as registered with HMRC' 
                              : 'Business postcode or other known fact'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSubmitAuthorization}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Submit Authorization Request
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Manage Requests */}
              <TabsContent value="manage">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Authorization Requests
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadAuthorizationRequests}
                        disabled={loadingRequests}
                        className="flex items-center gap-2"
                      >
                        {loadingRequests ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Refresh
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      View and manage your authorization requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingRequests ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading requests...</span>
                      </div>
                    ) : authRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No authorization requests found</p>
                        <p className="text-sm">Submit a new request to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {authRequests.map((request, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getStatusBadge(request.status)}
                                <span className="text-sm text-muted-foreground">
                                  {request.service.join(', ')}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Created: {new Date(request.created).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <div className="grid gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ARN:</span>
                                <span className="font-mono">{request.arn}</span>
                              </div>
                              {request.expiresOn && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Expires:</span>
                                  <span>{new Date(request.expiresOn).toLocaleDateString()}</span>
                                </div>
                              )}
                              {request.updated && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Updated:</span>
                                  <span>{new Date(request.updated).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            {request.status === AUTH_STATUS.PENDING && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                  <div className="text-sm text-blue-800">
                                    <p className="font-medium">Authorization code sent to client</p>
                                    <p>HMRC has sent an authorization code to the client by post. The client should receive it within 7 working days and share it with you to complete the authorization.</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Information Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                How Agent Authorization Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Submit Request</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter client details (National Insurance Number and postcode) to request authorization
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">HMRC Sends Code</h4>
                    <p className="text-sm text-muted-foreground">
                      HMRC automatically sends an authorization code to the client by post within 7 working days
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Client Shares Code</h4>
                    <p className="text-sm text-muted-foreground">
                      Client manually shares the authorization code with you to complete the agent authorization
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 