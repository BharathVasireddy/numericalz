'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { TestEmailModal } from '@/components/communication/test-email-modal'
import { Mail, Plus, Search, Edit, Trash2, Copy, Eye, Send, MoreHorizontal, Calendar } from 'lucide-react'
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
              <Search className="absolute left-3 md:left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 md:pl-14"
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

        {/* Templates List */}
        <div className="border rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Loading templates...
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center">
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
            </div>
          ) : (
                         <div className="table-container">
               <table className="data-table w-full table-fixed">
                <thead>
                  <tr className="border-b">
                    <th className="col-template-name text-left p-4 font-medium">Template Name</th>
                    <th className="col-template-subject text-left p-4 font-medium">Subject</th>
                    <th className="col-template-category text-left p-4 font-medium">Category</th>
                    <th className="col-template-status text-left p-4 font-medium">Status</th>
                    <th className="col-template-creator text-left p-4 font-medium">Creator</th>
                    <th className="col-template-date text-left p-4 font-medium">Created</th>
                    <th className="col-template-actions text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="border-b hover:bg-muted/50 transition-colors">
                      {/* Template Name */}
                      <td className="col-template-name p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium" title={template.name}>
                              {template.name}
                            </div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground truncate" title={template.description}>
                                {template.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="col-template-subject p-4">
                        <div className="truncate" title={template.subject}>
                          {template.subject}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="col-template-category p-4">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="col-template-status p-4">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={template.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {template.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {template.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Creator */}
                      <td className="col-template-creator p-4">
                        <div className="text-sm">
                          {template.creator?.name || 'Unknown'}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="col-template-date p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="col-template-actions p-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Actions */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreviewDialog(template)}
                            className="h-8 w-8 p-0"
                            title="Preview template"
                          >
                            <Eye className="action-trigger-icon" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTestModal(template)}
                            className="h-8 w-8 p-0"
                            title="Test email template"
                          >
                            <Send className="action-trigger-icon" />
                          </Button>
                          
                          {/* More Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="action-trigger-icon" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canManageTemplates && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Template
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate Template
                                  </DropdownMenuItem>
                                  {!template.isSystem && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Template
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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