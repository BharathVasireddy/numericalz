'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Save, Mail, Shield, AlertCircle, CheckCircle, Settings, Palette, Building2, Link, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface CommunicationSettings {
  // Email settings
  senderEmail: string
  senderName: string
  replyToEmail: string
  emailSignature: string
  enableTestMode: boolean
  
  // Branding settings
  firmName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  websiteUrl: string
  phoneNumber: string
  address: string
}

export default function CommunicationSettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<CommunicationSettings>({
    // Email settings
    senderEmail: '',
    senderName: '',
    replyToEmail: '',
    emailSignature: '',
    enableTestMode: false,
    
    // Branding settings
    firmName: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    websiteUrl: '',
    phoneNumber: '',
    address: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/communication/settings')
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to load settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error loading communication settings')
    } finally {
      setIsLoading(false)
    }
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateUrl = (url: string) => {
    if (!url) return true // Optional URLs are valid when empty
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const validateHexColor = (color: string) => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    return hexRegex.test(color)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!settings.senderEmail) {
      newErrors.senderEmail = 'Sender email is required'
    } else if (!validateEmail(settings.senderEmail)) {
      newErrors.senderEmail = 'Invalid email format'
    }

    if (!settings.senderName) {
      newErrors.senderName = 'Sender name is required'
    }

    if (settings.replyToEmail && !validateEmail(settings.replyToEmail)) {
      newErrors.replyToEmail = 'Invalid email format'
    }

    // Branding validation
    if (!settings.firmName) {
      newErrors.firmName = 'Firm name is required'
    }

    if (settings.logoUrl && !validateUrl(settings.logoUrl)) {
      newErrors.logoUrl = 'Invalid URL format'
    }

    if (settings.websiteUrl && !validateUrl(settings.websiteUrl)) {
      newErrors.websiteUrl = 'Invalid URL format'
    }

    if (!validateHexColor(settings.primaryColor)) {
      newErrors.primaryColor = 'Invalid hex color format (e.g., #2563eb)'
    }

    if (!validateHexColor(settings.secondaryColor)) {
      newErrors.secondaryColor = 'Invalid hex color format (e.g., #64748b)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please correct the errors before saving')
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/communication/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Settings saved successfully')
        setHasChanges(false)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error saving communication settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof CommunicationSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Check permissions
  if (!session) {
    return (
      <PageLayout>
        <PageContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to access communication settings.
            </AlertDescription>
          </Alert>
        </PageContent>
      </PageLayout>
    )
  }

  if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
    return (
      <PageLayout>
        <PageContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Only Partners and Managers can access communication settings.
            </AlertDescription>
          </Alert>
        </PageContent>
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="lg">
      <PageHeader 
        title="Communication Settings"
        description="Configure email settings and branding for all system communications"
      >
        <div className="flex items-center gap-3">
          {session.user.role === 'PARTNER' && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Full Access
            </Badge>
          )}
          {session.user.role === 'MANAGER' && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              View Only
            </Badge>
          )}
        </div>
      </PageHeader>

      <PageContent>
        <div className="space-y-6">
          {/* Branding Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Firm Branding
              </CardTitle>
              <CardDescription>
                Configure your firm's branding and visual identity for all communications and templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firmName">
                    Firm Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firmName"
                    value={settings.firmName}
                    onChange={(e) => handleInputChange('firmName', e.target.value)}
                    placeholder="Numericalz"
                    disabled={session.user.role !== 'PARTNER' || isLoading}
                    className={errors.firmName ? 'border-red-500' : ''}
                  />
                  {errors.firmName && (
                    <p className="text-sm text-red-500">{errors.firmName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your firm's official name for branding and communications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">
                    Logo URL
                  </Label>
                  <Input
                    id="logoUrl"
                    value={settings.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    disabled={session.user.role !== 'PARTNER' || isLoading}
                    className={errors.logoUrl ? 'border-red-500' : ''}
                  />
                  {errors.logoUrl && (
                    <p className="text-sm text-red-500">{errors.logoUrl}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Optional. URL to your firm's logo image
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">
                    Primary Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      value={settings.primaryColor}
                      onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      placeholder="#2563eb"
                      disabled={session.user.role !== 'PARTNER' || isLoading}
                      className={errors.primaryColor ? 'border-red-500' : ''}
                    />
                    <div 
                      className="w-12 h-10 rounded border border-input"
                      style={{ backgroundColor: validateHexColor(settings.primaryColor) ? settings.primaryColor : '#2563eb' }}
                    />
                  </div>
                  {errors.primaryColor && (
                    <p className="text-sm text-red-500">{errors.primaryColor}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Primary brand color in hex format (e.g., #2563eb)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">
                    Secondary Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      value={settings.secondaryColor}
                      onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      placeholder="#64748b"
                      disabled={session.user.role !== 'PARTNER' || isLoading}
                      className={errors.secondaryColor ? 'border-red-500' : ''}
                    />
                    <div 
                      className="w-12 h-10 rounded border border-input"
                      style={{ backgroundColor: validateHexColor(settings.secondaryColor) ? settings.secondaryColor : '#64748b' }}
                    />
                  </div>
                  {errors.secondaryColor && (
                    <p className="text-sm text-red-500">{errors.secondaryColor}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Secondary brand color in hex format (e.g., #64748b)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">
                  Website URL
                </Label>
                <Input
                  id="websiteUrl"
                  value={settings.websiteUrl}
                  onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                  placeholder="https://www.numericalz.com"
                  disabled={session.user.role !== 'PARTNER' || isLoading}
                  className={errors.websiteUrl ? 'border-red-500' : ''}
                />
                {errors.websiteUrl && (
                  <p className="text-sm text-red-500">{errors.websiteUrl}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional. Your firm's website URL
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={settings.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="+44 20 1234 5678"
                    disabled={session.user.role !== 'PARTNER' || isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Your firm's main phone number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    value={settings.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Business Street&#10;London EC1A 1BB&#10;United Kingdom"
                    rows={3}
                    disabled={session.user.role !== 'PARTNER' || isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Your firm's business address
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure sender details for all outgoing emails including test emails, notifications, and workflow communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">
                    Sender Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    value={settings.senderEmail}
                    onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                    placeholder="notifications@your-domain.com"
                    disabled={session.user.role !== 'PARTNER' || isLoading}
                    className={errors.senderEmail ? 'border-red-500' : ''}
                  />
                  {errors.senderEmail && (
                    <p className="text-sm text-red-500">{errors.senderEmail}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This email address will appear as the sender for all system emails
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">
                    Sender Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="senderName"
                    value={settings.senderName}
                    onChange={(e) => handleInputChange('senderName', e.target.value)}
                    placeholder="Numericalz"
                    disabled={session.user.role !== 'PARTNER' || isLoading}
                    className={errors.senderName ? 'border-red-500' : ''}
                  />
                  {errors.senderName && (
                    <p className="text-sm text-red-500">{errors.senderName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Display name that appears with the sender email
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyToEmail">Reply-To Email</Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  value={settings.replyToEmail}
                  onChange={(e) => handleInputChange('replyToEmail', e.target.value)}
                  placeholder="support@your-domain.com"
                  disabled={session.user.role !== 'PARTNER' || isLoading}
                  className={errors.replyToEmail ? 'border-red-500' : ''}
                />
                {errors.replyToEmail && (
                  <p className="text-sm text-red-500">{errors.replyToEmail}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional. Email address for replies to system emails
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="emailSignature">Email Signature</Label>
                <Textarea
                  id="emailSignature"
                  value={settings.emailSignature}
                  onChange={(e) => handleInputChange('emailSignature', e.target.value)}
                  placeholder="Best regards,&#10;Numericalz Team&#10;&#10;Email: info@numericalz.com&#10;Phone: +44 20 1234 5678"
                  rows={6}
                  disabled={session.user.role !== 'PARTNER' || isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Signature to append to all outgoing emails. HTML is supported.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Configuration Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Configuration Preview
              </CardTitle>
              <CardDescription>
                Preview of how your branding and emails will appear with current settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Branding Preview */}
                <div className="space-y-4">
                  <h4 className="font-medium">Branding Preview</h4>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <div className="flex items-center gap-4 mb-4">
                      {settings.logoUrl && (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <img 
                            src={settings.logoUrl} 
                            alt="Logo" 
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: settings.primaryColor }}>
                          {settings.firmName || 'Firm Name'}
                        </h3>
                        {settings.websiteUrl && (
                          <p className="text-sm text-muted-foreground">{settings.websiteUrl}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Contact Information</p>
                        <p className="text-muted-foreground">
                          {settings.phoneNumber || 'Phone not set'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-muted-foreground whitespace-pre-line">
                          {settings.address || 'Address not set'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Email Preview */}
                <div className="space-y-4">
                  <h4 className="font-medium">Email Configuration</h4>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-medium">
                          {settings.senderName || 'Not set'} &lt;{settings.senderEmail || 'Not set'}&gt;
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reply-To:</span>
                        <span className="font-medium">
                          {settings.replyToEmail || 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Signature:</span>
                        <span className="font-medium">
                          {settings.emailSignature ? 'Configured' : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {settings.senderEmail && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      All system communications will be sent from <strong>{settings.senderEmail}</strong> 
                      with branding from <strong>{settings.firmName}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {session.user.role === 'PARTNER' && (
            <div className="flex items-center justify-between">
              <div>
                {hasChanges && (
                  <p className="text-sm text-muted-foreground">You have unsaved changes</p>
                )}
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges || isLoading}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </PageContent>
    </PageLayout>
  )
} 