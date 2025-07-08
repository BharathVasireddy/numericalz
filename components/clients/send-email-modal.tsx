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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Load templates when modal opens
  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  // Update preview when template selection changes
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setSelectedTemplate(template)
        generatePreview(template)
      }
    }
  }, [selectedTemplateId, templates, client, workflowData])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/communication/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generatePreview = (template: EmailTemplate) => {
    if (!client || !template) return

    // Validate template has required properties
    if (!template.subject && !template.htmlContent) {
      console.warn('Template missing subject and htmlContent:', template)
      setPreviewSubject('Template Error: Missing subject')
      setPreviewContent('Template Error: Missing content')
      return
    }

    // Prepare data for variable processing
    const emailData = {
      client: {
        companyName: client.companyName || '',
        clientCode: client.clientCode || '',
        companyNumber: client.companyNumber || '',
        vatNumber: client.vatNumber || '',
        contactName: client.contactName || '',
        email: client.contactEmail || '',
        phone: client.phone || '',
        assignedUser: client.assignedUser || client.ltdCompanyAssignedUser || client.currentVATQuarter?.assignedUser
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
        yearEndDate: workflowData.filingPeriodEnd ? new Date(workflowData.filingPeriodEnd) : null,
        accountsDueDate: workflowData.accountsDueDate ? new Date(workflowData.accountsDueDate) : null,
        corporationTaxDueDate: workflowData.ctDueDate ? new Date(workflowData.ctDueDate) : null,
        currentStage: workflowData.currentStage || '',
        isCompleted: workflowData.isCompleted || false,
        assignedUser: workflowData.assignedUser
      } : null,
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
    if (!selectedTemplate || !client?.contactEmail) {
      toast({
        title: "Error",
        description: "Please select a template and ensure client has an email address",
        variant: "destructive"
      })
      return
    }

    try {
      setSending(true)
      
      const response = await fetch('/api/communication/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          clientId: client.id,
          toEmail: client.contactEmail,
          subject: previewSubject,
          content: previewContent,
          workflowType: workflowType || 'general',
          workflowId: workflowData?.id || null
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Email sent successfully to ${client.contactEmail}`,
          variant: "default"
        })
        onOpenChange(false)
        // Reset form
        setSelectedTemplateId('')
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
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {client?.companyName}
          </DialogTitle>
          <DialogDescription>
            Select a template and preview the email before sending to {client?.contactEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template-select">Select Email Template</Label>
            <Select 
              value={selectedTemplateId} 
              onValueChange={setSelectedTemplateId}
              disabled={loading}
            >
              <SelectTrigger id="template-select">
                <SelectValue placeholder={loading ? "Loading templates..." : "Choose a template"} />
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
            disabled={sending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={!selectedTemplate || !client?.contactEmail || sending}
            className="flex items-center gap-2"
          >
            {sending ? (
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