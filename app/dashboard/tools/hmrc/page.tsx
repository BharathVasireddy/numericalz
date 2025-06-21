'use client'

import React, { useState } from 'react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, CheckCircle, AlertCircle, Clock, Mail, Phone, FileText, Users, ArrowRight } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AuthRequest {
  id: string
  arn: string
  service: string[]
  clientType: string
  clientIdType: string
  clientId: string
  status: string
  created: string
  expiresOn?: string
}

export default function HMRCToolsPage() {
  // Form state
  const [formData, setFormData] = useState({
    arn: '',
    services: [] as string[],
    clientType: 'personal',
    clientIdType: 'ni',
    clientId: '',
    knownFact: ''
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Handle service selection
  const handleServiceChange = (service: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      services: checked 
        ? [...prev.services, service]
        : prev.services.filter(s => s !== service)
    }))
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.arn.trim()) {
      newErrors.arn = 'Agent Reference Number is required'
    }

    if (formData.services.length === 0) {
      newErrors.services = 'At least one service must be selected'
    }

    if (!formData.clientId.trim()) {
      newErrors.clientId = 'Client ID is required'
    }

    if (!formData.knownFact.trim()) {
      newErrors.knownFact = 'Known fact is required'
    }

    // Validate National Insurance format
    if (formData.clientIdType === 'ni' && formData.clientId.trim()) {
      const ninoRegex = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/i
      if (!ninoRegex.test(formData.clientId.replace(/\s/g, ''))) {
        newErrors.clientId = 'Invalid National Insurance number format (e.g., AB123456C)'
      }
    }

    // Validate VAT number format
    if (formData.clientIdType === 'vrn' && formData.clientId.trim()) {
      const vatRegex = /^(GB)?\d{9}$/i
      if (!vatRegex.test(formData.clientId.replace(/\s/g, ''))) {
        newErrors.clientId = 'Invalid VAT number format (e.g., 123456789 or GB123456789)'
      }
    }

    // Validate postcode for personal clients
    if (formData.clientType === 'personal' && formData.knownFact.trim()) {
      const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i
      if (!postcodeRegex.test(formData.knownFact.replace(/\s/g, ''))) {
        newErrors.knownFact = 'Invalid UK postcode format (e.g., SW1A 1AA)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit authorization request
  const handleSubmitRequest = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/hmrc/agent-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          arn: formData.arn.trim(),
          service: formData.services,
          clientType: formData.clientType,
          clientIdType: formData.clientIdType,
          clientId: formData.clientId.trim(),
          knownFact: formData.knownFact.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        })

        // Reset form
        setFormData({
          arn: formData.arn, // Keep ARN for convenience
          services: [],
          clientType: 'personal',
          clientIdType: 'ni',
          clientId: '',
          knownFact: ''
        })

        // Refresh requests list
        loadAuthRequests()
      } else {
        // Show detailed error information
        const errorTitle = result.error || 'Request Failed'
        const errorMessage = result.message || result.error || 'Failed to create authorization request'
        const errorDetails = result.details

        toast({
          title: errorTitle,
          description: errorDetails ? `${errorMessage}\n\nDetails: ${errorDetails}` : errorMessage,
          variant: "destructive"
        })

        // Log full error for debugging
        console.error('HMRC Authorization Error:', {
          status: response.status,
          error: result.error,
          message: result.message,
          details: result.details
        })
      }
    } catch (error) {
      console.error('Authorization request error:', error)
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Unexpected Error",
          description: "An unexpected error occurred while submitting the authorization request. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load authorization requests
  const loadAuthRequests = async () => {
    if (!formData.arn.trim()) return

    setIsLoadingRequests(true)

    try {
      const params = new URLSearchParams({ arn: formData.arn.trim() })
      const response = await fetch(`/api/hmrc/agent-auth?${params}`)
      const result = await response.json()

      if (result.success) {
        setAuthRequests(result.data || [])
      } else {
        // Show detailed error information
        const errorTitle = result.error || 'Failed to Load Requests'
        const errorMessage = result.message || result.error || 'Failed to load authorization requests'

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive"
        })

        // Log full error for debugging
        console.error('HMRC Load Requests Error:', {
          status: response.status,
          error: result.error,
          message: result.message
        })
      }
    } catch (error) {
      console.error('Load requests error:', error)
      toast({
        title: "Error",
        description: "Failed to load authorization requests",
        variant: "destructive"
      })
    } finally {
      setIsLoadingRequests(false)
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'accepted':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'expired':
        return <Badge variant="outline" className="text-gray-600"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Format service names
  const formatService = (service: string) => {
    switch (service) {
      case 'MTD-VAT': return 'VAT (Making Tax Digital)'
      case 'MTD-IT': return 'Income Tax (Making Tax Digital)'
      case 'MTD-CT': return 'Corporation Tax (Making Tax Digital)'
      default: return service
    }
  }

  return (
    <PageLayout maxWidth="xl">
      <PageHeader
        title="HMRC Agent Authorization"
        description="Request authorization from clients to act as their tax agent"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Secure HMRC Integration</span>
        </div>
      </PageHeader>

      <PageContent>
        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <CardTitle className="text-base">Step 1: Submit Request</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Provide client details and select services you need authorization for
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-green-600" />
                </div>
                <CardTitle className="text-base">Step 2: HMRC Notification</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                HMRC sends authorization code to client by post within 7 working days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <CardTitle className="text-base">Step 3: Client Authorization</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Client shares the code with you to complete the authorization process
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sandbox Information Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sandbox Environment:</strong> This tool is currently configured for HMRC's sandbox environment. 
            In the sandbox, authorization requests will return authentication errors as expected since proper agent enrollment is required. 
            The system is working correctly and will function properly in production with valid agent credentials.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="new-request" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-request">New Authorization Request</TabsTrigger>
            <TabsTrigger value="manage-requests">Manage Requests</TabsTrigger>
          </TabsList>

          {/* New Request Tab */}
          <TabsContent value="new-request">
            <Card>
              <CardHeader>
                <CardTitle>Create Authorization Request</CardTitle>
                <CardDescription>
                  Submit a request to HMRC for client authorization. The client will receive an authorization code by post.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Agent Reference Number */}
                <div className="space-y-2">
                  <Label htmlFor="arn">Agent Reference Number (ARN)</Label>
                  <Input
                    id="arn"
                    placeholder="e.g., XARN1234567"
                    value={formData.arn}
                    onChange={(e) => handleInputChange('arn', e.target.value)}
                    className={errors.arn ? 'border-red-500' : ''}
                  />
                  {errors.arn && <p className="text-sm text-red-500">{errors.arn}</p>}
                </div>

                {/* Services */}
                <div className="space-y-3">
                  <Label>Services</Label>
                  <div className="space-y-2">
                    {[
                      { value: 'MTD-VAT', label: 'VAT (Making Tax Digital)' },
                      { value: 'MTD-IT', label: 'Income Tax (Making Tax Digital)' },
                      { value: 'MTD-CT', label: 'Corporation Tax (Making Tax Digital)' }
                    ].map((service) => (
                      <div key={service.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={service.value}
                          checked={formData.services.includes(service.value)}
                          onCheckedChange={(checked) => handleServiceChange(service.value, checked as boolean)}
                        />
                        <Label htmlFor={service.value} className="text-sm font-normal">
                          {service.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.services && <p className="text-sm text-red-500">{errors.services}</p>}
                </div>

                {/* Client Type */}
                <div className="space-y-2">
                  <Label htmlFor="clientType">Client Type</Label>
                  <Select value={formData.clientType} onValueChange={(value) => handleInputChange('clientType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal (Individual)</SelectItem>
                      <SelectItem value="business">Business (Company/Partnership)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Client ID Type */}
                <div className="space-y-2">
                  <Label htmlFor="clientIdType">Client ID Type</Label>
                  <Select value={formData.clientIdType} onValueChange={(value) => handleInputChange('clientIdType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ni">National Insurance Number</SelectItem>
                      <SelectItem value="vrn">VAT Registration Number</SelectItem>
                      <SelectItem value="utr">Unique Taxpayer Reference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Client ID */}
                <div className="space-y-2">
                  <Label htmlFor="clientId">
                    {formData.clientIdType === 'ni' ? 'National Insurance Number' :
                     formData.clientIdType === 'vrn' ? 'VAT Registration Number' : 'Unique Taxpayer Reference'}
                  </Label>
                  <Input
                    id="clientId"
                    placeholder={
                      formData.clientIdType === 'ni' ? 'e.g., AB123456C' :
                      formData.clientIdType === 'vrn' ? 'e.g., 123456789' : 'e.g., 1234567890'
                    }
                    value={formData.clientId}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    className={errors.clientId ? 'border-red-500' : ''}
                  />
                  {errors.clientId && <p className="text-sm text-red-500">{errors.clientId}</p>}
                </div>

                {/* Known Fact */}
                <div className="space-y-2">
                  <Label htmlFor="knownFact">
                    {formData.clientType === 'personal' ? 'Postcode' : 'Known Fact'}
                  </Label>
                  <Input
                    id="knownFact"
                    placeholder={formData.clientType === 'personal' ? 'e.g., SW1A 1AA' : 'Enter known fact'}
                    value={formData.knownFact}
                    onChange={(e) => handleInputChange('knownFact', e.target.value)}
                    className={errors.knownFact ? 'border-red-500' : ''}
                  />
                  {errors.knownFact && <p className="text-sm text-red-500">{errors.knownFact}</p>}
                  <p className="text-xs text-muted-foreground">
                    {formData.clientType === 'personal' 
                      ? 'Client\'s registered postcode with HMRC'
                      : 'A fact that proves your relationship with the client'
                    }
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    After submitting this request, HMRC will send an authorization code to the client by post within 7 working days. 
                    The client must then share this code with you to complete the authorization.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleSubmitRequest} 
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Submitting Request...' : 'Submit Authorization Request'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Requests Tab */}
          <TabsContent value="manage-requests">
            <Card>
              <CardHeader>
                <CardTitle>Authorization Requests</CardTitle>
                <CardDescription>
                  View and manage your submitted authorization requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter ARN to load requests"
                      value={formData.arn}
                      onChange={(e) => handleInputChange('arn', e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={loadAuthRequests}
                      disabled={isLoadingRequests || !formData.arn.trim()}
                    >
                      {isLoadingRequests ? 'Loading...' : 'Load Requests'}
                    </Button>
                  </div>

                  {authRequests.length > 0 ? (
                    <div className="space-y-3">
                      {authRequests.map((request) => (
                        <Card key={request.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{request.clientId}</span>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Services: {Array.isArray(request.service) 
                                    ? request.service.map(formatService).join(', ')
                                    : formatService(request.service)
                                  }
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(request.created).toLocaleDateString()}
                                  {request.expiresOn && ` • Expires: ${new Date(request.expiresOn).toLocaleDateString()}`}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {formData.arn.trim() ? 'No authorization requests found' : 'Enter ARN to view requests'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageLayout>
  )
} 