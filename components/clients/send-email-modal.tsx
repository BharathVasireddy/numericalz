'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Send, Eye, RefreshCw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { processEmailVariables } from '@/lib/email-variables'
import { toast } from '@/hooks/use-toast'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  category: string
}

interface SendEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: any // Client data from deadline table
  workflowData?: any // VAT quarter or Ltd workflow data
  workflowType?: 'vat' | 'ltd' // Type of workflow
}

export function SendEmailModal({ 
  open, 
  onOpenChange, 
  client, 
  workflowData, 
  workflowType 
}: SendEmailModalProps) {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [customSubject, setCustomSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewContent, setPreviewContent] = useState('')
  
  // 🔧 FIX: Add state for fresh client data to ensure latest email is used
  const [freshClientData, setFreshClientData] = useState<any>(null)
  const [isFetchingFreshData, setIsFetchingFreshData] = useState(false)

  // Fetch email templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/communication/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates || [])
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      }
    }

    if (open) {
      fetchTemplates()
    }
  }, [open])

  // 🔧 FIX: Fetch fresh client data when modal opens to get latest email
  useEffect(() => {
    const fetchFreshClientData = async () => {
      if (!open || !client?.id) return
      
      setIsFetchingFreshData(true)
      try {
        console.log('📧 Fetching fresh client data for email modal...')
        const response = await fetch(`/api/clients/${client.id}`, {
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.client) {
            setFreshClientData(data.client)
            console.log('✅ Fresh client data loaded:', {
              oldEmail: client.contactEmail,
              newEmail: data.client.contactEmail,
              emailChanged: client.contactEmail !== data.client.contactEmail
            })
          }
        }
      } catch (error) {
        console.warn('Could not fetch fresh client data:', error)
        // Fallback to original client data
        setFreshClientData(client)
      } finally {
        setIsFetchingFreshData(false)
      }
    }

    fetchFreshClientData()
  }, [open, client?.id])

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(template)
      generatePreview(template)
    }
  }

  // Use fresh client data if available, otherwise fall back to original
  const activeClient = freshClientData || client

  const generatePreview = (template: EmailTemplate) => {
    if (!activeClient || !template) return

    // Validate template has required properties
    if (!template.subject && !template.htmlContent) {
      console.warn('Template missing subject and htmlContent:', template)
      setPreviewSubject('Template Error: Missing subject')
      setPreviewContent('Template Error: Missing content')
      return
    }

    // Prepare data for variable processing using fresh client data
    const emailData = {
      client: {
        companyName: activeClient.companyName || '',
        clientCode: activeClient.clientCode || '',
        companyNumber: activeClient.companyNumber || '',
        vatNumber: activeClient.vatNumber || '',
        contactName: activeClient.contactName || '',
        email: activeClient.contactEmail || '', // Use fresh email data
        phone: activeClient.phone || '',
        assignedUser: activeClient.assignedUser || activeClient.ltdCompanyAssignedUser || activeClient.currentVATQuarter?.assignedUser
      },
      user: session?.user ? {
        name: session.user.name || '',
        email: session.user.email || ''
      } : null,
      workflow: workflowData ? {
        currentStage: workflowData.currentStage || '',
        workflowType: workflowType || 'general',
        isCompleted: workflowData.isCompleted || false
      } : null,
      vat: workflowType === 'vat' && workflowData ? {
        quarterPeriod: workflowData.quarterPeriod || '',
        quarterStartDate: workflowData.quarterStartDate ? new Date(workflowData.quarterStartDate) : null,
        quarterEndDate: workflowData.quarterEndDate ? new Date(workflowData.quarterEndDate) : null,
        filingDueDate: workflowData.filingDueDate ? new Date(workflowData.filingDueDate) : null,
        currentStage: workflowData.currentStage || '',
        isCompleted: workflowData.isCompleted || false,
        assignedUser: workflowData.assignedUser,
        quarterGroup: client.vatQuarterGroup || ''
      } : null,
      accounts: workflowType === 'ltd' && workflowData ? {
        filingPeriod: workflowData.filingPeriodStart && workflowData.filingPeriodEnd ? 
          `${workflowData.filingPeriodStart}_to_${workflowData.filingPeriodEnd}` : '',
        yearEndDate: client.nextYearEnd ? new Date(client.nextYearEnd) : null, // Use official Companies House year end date
        accountsDueDate: workflowData.accountsDueDate ? new Date(workflowData.accountsDueDate) : null,
        corporationTaxDueDate: workflowData.ctDueDate ? new Date(workflowData.ctDueDate) : null,
        confirmationStatementDueDate: client.nextConfirmationDue ? new Date(client.nextConfirmationDue) : null,
        daysUntilAccountsDue: workflowData.accountsDueDate ? Math.ceil((new Date(workflowData.accountsDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        daysUntilCTDue: workflowData.ctDueDate ? Math.ceil((new Date(workflowData.ctDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        daysUntilCSDue: client.nextConfirmationDue ? Math.ceil((new Date(client.nextConfirmationDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        isAccountsOverdue: workflowData.accountsDueDate ? new Date() > new Date(workflowData.accountsDueDate) : false,
        isCTOverdue: workflowData.ctDueDate ? new Date() > new Date(workflowData.ctDueDate) : false,
        isCSOverdue: client.nextConfirmationDue ? new Date() > new Date(client.nextConfirmationDue) : false,
        currentStage: workflowData.currentStage || '',
        isCompleted: workflowData.isCompleted || false,
        assignedUser: workflowData.assignedUser
      } : {
        // Fallback to client-level data if no workflow exists
        filingPeriod: client.nextAccountsDue ? `${new Date(client.nextAccountsDue).getFullYear() - 1} accounts` : '',
        yearEndDate: client.nextYearEnd ? new Date(client.nextYearEnd) : null,
        accountsDueDate: client.nextAccountsDue ? new Date(client.nextAccountsDue) : null,
        corporationTaxDueDate: client.nextCorporationTaxDue ? new Date(client.nextCorporationTaxDue) : null,
        confirmationStatementDueDate: client.nextConfirmationDue ? new Date(client.nextConfirmationDue) : null,
        daysUntilAccountsDue: client.nextAccountsDue ? Math.ceil((new Date(client.nextAccountsDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        daysUntilCTDue: client.nextCorporationTaxDue ? Math.ceil((new Date(client.nextCorporationTaxDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        daysUntilCSDue: client.nextConfirmationDue ? Math.ceil((new Date(client.nextConfirmationDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        isAccountsOverdue: client.nextAccountsDue ? new Date() > new Date(client.nextAccountsDue) : false,
        isCTOverdue: client.nextCorporationTaxDue ? new Date() > new Date(client.nextCorporationTaxDue) : false,
        isCSOverdue: client.nextConfirmationDue ? new Date() > new Date(client.nextConfirmationDue) : false,
        currentStage: '',
        isCompleted: false,
        assignedUser: client.assignedUser
      },
      system: {
        currentDate: new Date(),
        companyName: 'Numericalz'
      }
    }

    // Process variables in subject and content
    const processedSubject = processEmailVariables(template.subject || '', emailData)
    const processedContent = processEmailVariables(template.htmlContent || '', emailData)

    setPreviewSubject(processedSubject)
    setPreviewContent(processedContent)
  }

  const handleSendEmail = async () => {
    if (!selectedTemplate || !activeClient?.contactEmail) {
      toast({
        title: "Error",
        description: "Please select a template and ensure client has an email address",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/communication/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: activeClient.contactEmail,
          subject: previewSubject,
          htmlContent: previewContent,
          clientId: activeClient.id,
          templateId: selectedTemplate.id
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Email sent successfully to ${activeClient.contactEmail}`,
          variant: "default"
        })
        onOpenChange(false)
        // Reset form
        setSelectedTemplate(null)
        setPreviewContent('')
        setPreviewSubject('')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {activeClient?.companyName}
          </DialogTitle>
          <DialogDescription>
            Select a template and preview the email before sending to {activeClient?.contactEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template-select">Select Email Template</Label>
            <Select 
              value={selectedTemplate?.id} 
              onValueChange={handleTemplateSelect}
              disabled={isLoading}
            >
              <SelectTrigger id="template-select">
                <SelectValue placeholder={isLoading ? "Loading templates..." : "Choose a template"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Preview */}
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <Label>Email Preview</Label>
              </div>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Subject:</Label>
                      <div className="mt-1 p-2 bg-muted rounded text-sm">
                        {previewSubject || 'No subject'}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Content:</Label>
                      <div className="mt-1 p-3 bg-muted rounded text-sm max-h-60 overflow-y-auto">
                        <div 
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br>') }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={!selectedTemplate || !activeClient?.contactEmail || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 