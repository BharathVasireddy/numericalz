'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Save, Send } from 'lucide-react'
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

export default function CreateTemplatePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
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
      setIsLoading(true)
      const response = await fetch('/api/communication/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Email template created successfully!')
        router.push('/dashboard/communication/templates')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Error creating template')
    } finally {
      setIsLoading(false)
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

  return (
    <PageLayout maxWidth="full">
      <PageHeader 
        title="Create Email Template"
        description="Design a new email template for client communication"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Templates
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowTestModal(true)}
            disabled={!formData.name || !formData.subject || !formData.htmlContent}
          >
            <Send className="h-5 w-5 mr-2" />
            Test Email
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-5 w-5 mr-2" />
            {isLoading ? 'Saving...' : 'Save Template'}
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
                  Basic information about your email template
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
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
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
                  />
                  <Label htmlFor="isActive">Active Template</Label>
                </div>
              </CardContent>
            </Card>

            {/* Email Content Card */}
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
                <CardDescription>
                  Design your email content using the rich text editor. Use the "Add Shortcodes" button to insert variables.
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
                  <span className="font-medium">Content Length:</span>
                  <div className="text-muted-foreground">
                    {formData.htmlContent.length} characters
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
                  <span className="font-medium">Images:</span>
                  <p className="text-muted-foreground">
                    Use "Add media" to insert images. Paste URLs or upload files.
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
          name: formData.name || 'New Template',
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          category: formData.category
        }}
      />
    </PageLayout>
  )
} 