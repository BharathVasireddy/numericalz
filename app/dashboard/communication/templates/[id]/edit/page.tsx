'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { RichTextEditor } from '@/components/communication/rich-text-editor'
import { TestEmailModal } from '@/components/communication/test-email-modal'
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const TEMPLATE_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'VAT_WORKFLOW', label: 'VAT Workflow' },
  { value: 'ACCOUNTS_WORKFLOW', label: 'Accounts Workflow' },
  { value: 'CHASE_REMINDERS', label: 'Chase Reminders' },
  { value: 'DEADLINE_NOTIFICATIONS', label: 'Deadline Notifications' },
  { value: 'COMPLETION_NOTIFICATIONS', label: 'Completion Notifications' },
  { value: 'QUERY_REQUESTS', label: 'Query Requests' },
  { value: 'APPROVAL_REQUESTS', label: 'Approval Requests' },
  { value: 'FILING_CONFIRMATIONS', label: 'Filing Confirmations' },
  { value: 'WELCOME_ONBOARDING', label: 'Welcome & Onboarding' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SYSTEM_NOTIFICATIONS', label: 'System Notifications' }
]

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  category: string
  description?: string
  isActive: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    name: string
    email: string
  }
}

export default function EditTemplatePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string
  
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    category: 'GENERAL',
    description: '',
    isActive: true
  })

  useEffect(() => {
    if (templateId) {
      fetchTemplate()
    }
  }, [templateId])

  const fetchTemplate = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/communication/templates/${templateId}`)
      
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.template)
        setFormData({
          name: data.template.name,
          subject: data.template.subject,
          htmlContent: data.template.htmlContent,
          category: data.template.category,
          description: data.template.description || '',
          isActive: data.template.isActive
        })
      } else {
        toast.error('Failed to fetch template')
        router.push('/dashboard/communication/templates')
      }
    } catch (error) {
      console.error('Error fetching template:', error)
      toast.error('Error loading template')
      router.push('/dashboard/communication/templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required')
      return
    }
    
    if (!formData.subject.trim()) {
      toast.error('Email subject is required')
      return
    }

    if (!formData.htmlContent.trim()) {
      toast.error('Email content is required')
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch(`/api/communication/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Email template updated successfully!')
        router.push('/dashboard/communication/templates')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Error updating template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    router.push('/dashboard/communication/templates')
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Check if user can edit this template
  const canEdit = session?.user?.role === 'PARTNER' || 
                  session?.user?.role === 'MANAGER' || 
                  (template && template.creator?.id === session?.user?.id)

  if (isLoading) {
    return (
      <PageLayout maxWidth="xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!template) {
    return (
      <PageLayout maxWidth="xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Template not found</h2>
            <p className="text-muted-foreground mb-4">The template you're looking for doesn't exist.</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Templates
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!canEdit) {
    return (
      <PageLayout maxWidth="xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to edit this template.</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Templates
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="full">
      <PageHeader 
        title={`Edit: ${template.name}`}
        description="Update your email template"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Templates
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowTestModal(true)}
          >
            <Send className="h-5 w-5 mr-2" />
            Test Email
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Editor Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Template Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>
                  Update the basic information about your email template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="e.g., VAT Return Request"
                      disabled={template.isSystem}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => updateFormData('category', value)}
                      disabled={template.isSystem}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => updateFormData('subject', e.target.value)}
                    placeholder="e.g., VAT Return Paperwork Required - {{client.companyName}}"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can use shortcodes in the subject line too
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Brief description of when to use this template..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => updateFormData('isActive', checked)}
                    disabled={template.isSystem}
                  />
                  <Label htmlFor="isActive">Active Template</Label>
                  {template.isSystem && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (System templates cannot be deactivated)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Content Card */}
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
                <CardDescription>
                  Update your email content using the rich text editor. Use the "Add Shortcodes" button to insert variables.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={formData.htmlContent}
                  onChange={(content) => updateFormData('htmlContent', content)}
                  templateCategory={formData.category}
                  placeholder="Start writing your email template..."
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Category:</span>
                  <div className="text-muted-foreground">
                    {TEMPLATE_CATEGORIES.find(c => c.value === formData.category)?.label}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="text-muted-foreground">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <div className="text-muted-foreground">
                    {template.isSystem ? 'System Template' : 'Custom Template'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Content Length:</span>
                  <div className="text-muted-foreground">
                    {formData.htmlContent.length} characters
                  </div>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="text-muted-foreground">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <div className="text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">💡 Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Use Shortcodes:</span>
                  <p className="text-muted-foreground">
                    Click "Add Shortcodes" to insert client data, dates, and system variables.
                  </p>
                </div>
                <div>
                  <span className="font-medium">Subject Variables:</span>
                  <p className="text-muted-foreground">
                    You can use shortcodes in email subjects too for personalization.
                  </p>
                </div>
                <div>
                  <span className="font-medium">Visual vs Code:</span>
                  <p className="text-muted-foreground">
                    Switch between Visual editor and HTML code view as needed.
                  </p>
                </div>
                <div>
                  <span className="font-medium">System Templates:</span>
                  <p className="text-muted-foreground">
                    {template.isSystem 
                      ? 'This is a system template. Some fields cannot be modified.'
                      : 'This is a custom template. You have full edit access.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </PageContent>

      {/* Test Email Modal */}
      <TestEmailModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        templateData={{
          name: formData.name,
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          category: formData.category
        }}
      />
    </PageLayout>
  )
} 