'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { TestEmailModal } from '@/components/communication/test-email-modal'
import { Mail, Plus, Search, Edit, Trash2, Copy, Eye, Send } from 'lucide-react'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: string
  category: string
  isActive: boolean
  isSystem: boolean
  description?: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    name: string
    email: string
  }
}

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

export default function EmailTemplatesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/communication/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        toast.error('Failed to fetch email templates')
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Error loading templates')
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleCreateTemplate = () => {
    router.push('/dashboard/communication/templates/create')
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    router.push(`/dashboard/communication/templates/${template.id}/edit`)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/communication/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Email template deleted successfully')
        fetchTemplates()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Error deleting template')
    }
  }

  const openPreviewDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setShowPreviewDialog(true)
  }

  const openTestModal = (template: EmailTemplate) => {
    setTestTemplate(template)
    setShowTestModal(true)
  }

  const duplicateTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch('/api/communication/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent || '',
          category: template.category,
          description: template.description || '',
          isActive: template.isActive
        })
      })

      if (response.ok) {
        toast.success('Template duplicated successfully')
        fetchTemplates()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to duplicate template')
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error('Error duplicating template')
    }
  }

  const getCategoryLabel = (category: string) => {
    const found = TEMPLATE_CATEGORIES.find(cat => cat.value === category)
    return found ? found.label : category
  }

  const canManageTemplates = session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER'

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Email Templates"
        description="Manage email templates for client communication"
      >
        {canManageTemplates && (
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-5 w-5 mr-2" />
            Create Template
          </Button>
        )}
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'No templates match your search criteria' 
                  : 'Get started by creating your first email template'}
              </p>
              {canManageTemplates && (
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-sm truncate">
                        {template.subject}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreviewDialog(template)}
                        className="h-9 w-9 p-0"
                        title="Preview template"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTestModal(template)}
                        className="h-9 w-9 p-0"
                        title="Test email template"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                      {canManageTemplates && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                            className="h-9 w-9 p-0"
                            title="Edit template"
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplate(template)}
                            className="h-9 w-9 p-0"
                            title="Duplicate template"
                          >
                            <Copy className="h-5 w-5" />
                          </Button>
                          {!template.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                              title="Delete template"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryLabel(template.category)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {template.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                      <Badge 
                        variant={template.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>
                      Created by {template.creator?.name || 'Unknown'}
                    </span>
                    <span>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Template Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                Preview how the email template will look
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Name:</strong> {selectedTemplate.name}
                  </div>
                  <div>
                    <strong>Category:</strong> {getCategoryLabel(selectedTemplate.category)}
                  </div>
                  <div>
                    <strong>Subject:</strong> {selectedTemplate.subject}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-2">Email Content</h4>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }}
                  />
                </div>
                
                {selectedTemplate.textContent && (
                  <div className="border rounded-lg p-4 bg-muted">
                    <h4 className="font-semibold mb-2">Plain Text Version</h4>
                    <pre className="text-sm whitespace-pre-wrap">
                      {selectedTemplate.textContent}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Email Modal */}
        {testTemplate && (
          <TestEmailModal
            isOpen={showTestModal}
            onClose={() => setShowTestModal(false)}
            templateData={{
              name: testTemplate.name,
              subject: testTemplate.subject,
              htmlContent: testTemplate.htmlContent,
              category: testTemplate.category
            }}
          />
        )}
      </PageContent>
    </PageLayout>
  )
} 