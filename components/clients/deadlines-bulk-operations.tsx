'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Users, Mail, UserPlus, AlertTriangle, Loader2, X } from 'lucide-react'
import { showToast } from '@/lib/toast'
import { processEmailVariables } from '@/lib/email-variables'

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
}

interface DeadlinesBulkOperationsProps {
  selectedItems: string[]
  users: User[]
  onClearSelection: () => void
  onRefreshData: () => void
  type: 'vat' | 'ltd'  // Specify which type of deadlines table
}

/**
 * Bulk operations component for deadlines tables (VAT and Ltd)
 * 
 * Features:
 * - Partner and Manager access control
 * - Bulk assign users to VAT quarters or Ltd workflows
 * - Bulk email sending with template selection
 * - Confirmation dialogs for actions
 * - Selection count display
 * - Extensible for future bulk operations
 */
export function DeadlinesBulkOperations({ 
  selectedItems, 
  users, 
  onClearSelection, 
  onRefreshData,
  type 
}: DeadlinesBulkOperationsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()

  // Email modal state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedClientForPreview, setSelectedClientForPreview] = useState<string>('')
  const [clientsData, setClientsData] = useState<Array<{
    id: string, 
    companyName: string, 
    contactEmail: string,
    clientCode?: string,
    companyNumber?: string,
    contactName?: string,
    contactPhone?: string,
    address?: string,
    vatNumber?: string,
    accountingReferenceDate?: string,
    incorporationDate?: string,
    currentVATQuarter?: any,
    vatQuartersWorkflow?: any[]
  }>>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Only show for partners and managers
  if ((session?.user?.role !== 'PARTNER' && session?.user?.role !== 'MANAGER') || selectedItems.length === 0) {
    return null
  }

  const entityName = type === 'vat' ? 'VAT quarter' : 'Ltd workflow'
  const entityNamePlural = type === 'vat' ? 'VAT quarters' : 'Ltd workflows'

  const handleBulkAssign = async () => {
    if (!selectedUserId) {
      showToast.error('Please select a user to assign to')
      return
    }

    setIsLoading(true)
    try {
      const endpoint = type === 'vat' 
        ? '/api/vat-quarters/bulk'
        : '/api/clients/ltd-deadlines/bulk'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type === 'vat' ? 'quarterIds' : 'clientIds']: selectedItems,
          operation: 'assign',
          assignedUserId: selectedUserId
        })
      })

      if (response.ok) {
        const data = await response.json()
        const selectedUser = users.find(u => u.id === selectedUserId)
        showToast.success(`Successfully assigned ${selectedItems.length} ${entityNamePlural} to ${selectedUser?.name}`)
        onClearSelection()
        onRefreshData()
        setSelectedUserId('')
        setShowAssignModal(false)
      } else {
        const data = await response.json()
        showToast.error(data.error || `Failed to assign ${entityNamePlural}`)
      }
    } catch (error) {
      showToast.error(`Failed to assign ${entityNamePlural}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch email templates when modal opens
  const fetchEmailTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/communication/templates')
      if (response.ok) {
        const data = await response.json()
        console.log('📧 Email templates fetched:', data.templates)
        setEmailTemplates(data.templates || [])
      } else {
        showToast.error('Failed to load email templates')
      }
    } catch (error) {
      showToast.error('Failed to load email templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Fetch clients data for preview
  const fetchClientsData = async () => {
    setLoadingClients(true)
    try {
      // For VAT deadlines, fetch VAT clients; for Ltd deadlines, fetch Ltd clients
      const endpoint = type === 'vat' 
        ? '/api/clients/vat-clients?limit=1000'
        : '/api/clients/ltd-deadlines?limit=1000'
      
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        let clientsForPreview: Array<{
          id: string, 
          companyName: string, 
          contactEmail: string,
          clientCode?: string,
          companyNumber?: string,
          contactName?: string,
          contactPhone?: string,
          address?: string,
          vatNumber?: string,
          accountingReferenceDate?: string,
          incorporationDate?: string,
          currentVATQuarter?: any,
          vatQuartersWorkflow?: any[]
        }> = []
        
        if (type === 'vat') {
          // For VAT: selectedItems are quarter IDs, extract unique clients
          const vatClients = data.clients || []
          const selectedQuarterIds = selectedItems
          const uniqueClientIds = new Set<string>()
          
          vatClients.forEach((client: any) => {
            if (client.vatQuartersWorkflow) {
              client.vatQuartersWorkflow.forEach((quarter: any) => {
                if (selectedQuarterIds.includes(quarter.id)) {
                  uniqueClientIds.add(client.id)
                }
              })
            }
          })
          
          clientsForPreview = vatClients
            .filter((client: any) => uniqueClientIds.has(client.id))
            .map((client: any) => ({
              id: client.id,
              companyName: client.companyName,
              contactEmail: client.contactEmail, // Fixed: VAT API uses contactEmail
              clientCode: client.clientCode,
              companyNumber: client.companyNumber,
              contactName: client.contactName,
              contactPhone: client.contactPhone, // Fixed: VAT API uses contactPhone
              address: client.address,
              vatNumber: client.vatNumber,
              accountingReferenceDate: client.accountingReferenceDate,
              incorporationDate: client.incorporationDate,
              // Include VAT quarter data for variable replacement
              currentVATQuarter: client.vatQuartersWorkflow?.[0] || null,
              vatQuartersWorkflow: client.vatQuartersWorkflow || []
            }))
        } else {
          // For Ltd: selectedItems are client IDs directly
          const ltdClients = data.clients || []
          clientsForPreview = ltdClients
            .filter((client: any) => selectedItems.includes(client.id))
            .map((client: any) => ({
              id: client.id,
              companyName: client.companyName,
              contactEmail: client.contactEmail, // Fixed: Ltd API uses contactEmail 
              clientCode: client.clientCode,
              companyNumber: client.companyNumber,
              contactName: client.contactName,
              contactPhone: client.contactPhone, // Fixed: Ltd API uses contactPhone
              address: client.address,
              vatNumber: client.vatNumber,
              accountingReferenceDate: client.accountingReferenceDate,
              incorporationDate: client.incorporationDate,
              // Include quarter data (Ltd companies may have VAT quarters too)
              currentVATQuarter: client.vatQuartersWorkflow?.[0] || null,
              vatQuartersWorkflow: client.vatQuartersWorkflow || []
            }))
        }
        
        console.log('👥 Clients data for preview:', clientsForPreview)
        setClientsData(clientsForPreview)
        // Set first client as default for preview
        if (clientsForPreview.length > 0 && !selectedClientForPreview && clientsForPreview[0]) {
          setSelectedClientForPreview(clientsForPreview[0].id)
        }
      } else {
        showToast.error('Failed to load clients data')
      }
    } catch (error) {
      showToast.error('Failed to load clients data')
    } finally {
      setLoadingClients(false)
    }
  }

  const handleEmailModalOpen = () => {
    setShowEmailModal(true)
    fetchEmailTemplates()
    fetchClientsData()
  }

  // Use the proven email variable system that already works
  const replaceVariables = (text: string, clientData: any) => {
    if (!text || !clientData) {
      return text
    }
    
    // Build the same data structure as the working individual email system
    const emailData = {
      client: {
        companyName: clientData.companyName || '',
        clientCode: clientData.clientCode || '',
        companyNumber: clientData.companyNumber || '',
        vatNumber: clientData.vatNumber || '',
        contactName: clientData.contactName || '',
        email: clientData.contactEmail || '', // Use contactEmail field
        phone: clientData.contactPhone || '', // Use contactPhone field
        assignedUser: clientData.assignedUser || clientData.ltdCompanyAssignedUser || clientData.currentVATQuarter?.assignedUser
      },
      user: session?.user ? {
        name: session.user.name || '',
        email: session.user.email || ''
      } : null,
      workflow: clientData.currentVATQuarter ? {
        currentStage: clientData.currentVATQuarter.currentStage || '',
        workflowType: type || 'general',
        isCompleted: clientData.currentVATQuarter.isCompleted || false
      } : null,
      vat: type === 'vat' && clientData.currentVATQuarter ? {
        quarterPeriod: clientData.currentVATQuarter.quarterPeriod || '',
        quarterStartDate: clientData.currentVATQuarter.quarterStartDate ? new Date(clientData.currentVATQuarter.quarterStartDate) : null,
        quarterEndDate: clientData.currentVATQuarter.quarterEndDate ? new Date(clientData.currentVATQuarter.quarterEndDate) : null,
        filingDueDate: clientData.currentVATQuarter.filingDueDate ? new Date(clientData.currentVATQuarter.filingDueDate) : null,
        currentStage: clientData.currentVATQuarter.currentStage || '',
        isCompleted: clientData.currentVATQuarter.isCompleted || false,
        assignedUser: clientData.currentVATQuarter.assignedUser,
        quarterGroup: clientData.vatQuarterGroup || ''
      } : null,
      accounts: type === 'ltd' ? {
        filingPeriod: clientData.filingPeriodStart && clientData.filingPeriodEnd ? 
          `${clientData.filingPeriodStart}_to_${clientData.filingPeriodEnd}` : '',
        yearEndDate: clientData.nextYearEnd ? new Date(clientData.nextYearEnd) : null,
        accountsDueDate: clientData.nextAccountsDue ? new Date(clientData.nextAccountsDue) : null,
        corporationTaxDueDate: clientData.corporationTaxDue ? new Date(clientData.corporationTaxDue) : null,
        currentStage: clientData.currentStage || '',
        isCompleted: clientData.isCompleted || false,
        assignedUser: clientData.assignedUser
      } : null,
      system: {
        currentDate: new Date(),
        companyName: 'Numericalz'
      }
    }
    
    // Use the existing processEmailVariables function
    return processEmailVariables(text, emailData)
  }

  const handleBulkEmail = async () => {
    if (!selectedTemplateId) {
      showToast.error('Please select an email template')
      return
    }

    setIsLoading(true)
    try {
      const endpoint = type === 'vat' 
        ? '/api/vat-quarters/bulk'
        : '/api/clients/ltd-deadlines/bulk'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type === 'vat' ? 'quarterIds' : 'clientIds']: selectedItems,
          operation: 'email',
          templateId: selectedTemplateId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const selectedTemplate = emailTemplates.find(t => t.id === selectedTemplateId)
        showToast.success(
          `📧 Bulk email sent successfully! ${data.successCount} emails sent to ${entityNamePlural}` +
          (data.errorCount > 0 ? ` (${data.errorCount} failed)` : '') +
          `\n\nTemplate: ${selectedTemplate?.name}`
        )
        onClearSelection()
        onRefreshData()
        setShowEmailModal(false)
        setSelectedTemplateId('')
        setSelectedClientForPreview('')
        setClientsData([])
        setLoadingClients(false)
      } else {
        showToast.error(data.error || `Failed to send bulk emails to ${entityNamePlural}`)
      }
    } catch (error) {
      showToast.error(`Failed to send bulk emails to ${entityNamePlural}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="mb-4 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedItems.length} selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Bulk operations for {entityNamePlural}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {/* Bulk Assign Button */}
              <Button
                size="sm"
                onClick={() => setShowAssignModal(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Assign User
              </Button>

              {/* Bulk Email Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmailModalOpen}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </Button>

              {/* Clear Selection */}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Assign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Assign {entityNamePlural}
            </DialogTitle>
            <DialogDescription>
              Select a user to assign all {selectedItems.length} selected {entityNamePlural} to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="user-select" className="text-sm font-medium">
                Select User
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to assign to" />
                </SelectTrigger>
                <SelectContent>
                  {session?.user?.id && (
                    <SelectItem value={session.user.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-600">Assign to Me</span>
                        <span className="text-xs text-blue-500">({session.user.role})</span>
                      </div>
                    </SelectItem>
                  )}
                  {users
                    .filter(user => user.id !== session?.user?.id)
                    .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">({user.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!selectedUserId || isLoading}
            >
              {isLoading ? 'Assigning...' : `Assign ${selectedItems.length} ${entityNamePlural}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Send Bulk Email
              </DialogTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Selected Clients ({clientsData.length})
              </Badge>
            </div>
            <DialogDescription>
              Send emails to all {selectedItems.length} selected {entityNamePlural} using a template.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Top Container - Template Selection & Client Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Template Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-medium">Email Template</Label>
                </div>
                {loadingTemplates ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading templates...</span>
                  </div>
                ) : (
                  <Select 
                    value={selectedTemplateId} 
                    onValueChange={setSelectedTemplateId}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an email template" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Right: Client Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">Client for Preview</Label>
                </div>
                {loadingClients ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading clients...</span>
                  </div>
                ) : (
                  <Select 
                    value={selectedClientForPreview} 
                    onValueChange={setSelectedClientForPreview}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client for preview" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsData.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName}
                        </SelectItem>
                                      ))}
              </SelectContent>
            </Select>
          )}
          

              </div>
            </div>

            <Separator />

            {/* Bottom Container - Email Preview */}
            {selectedTemplateId && selectedClientForPreview && (() => {
              const selectedTemplate = emailTemplates.find(t => t.id === selectedTemplateId)
              const selectedClient = clientsData.find(c => c.id === selectedClientForPreview)
              
              // Debug logging
              console.log('📧 Selected template:', selectedTemplate?.name)
              console.log('👤 Selected client:', selectedClient?.companyName)
              console.log('🔗 Template ID:', selectedTemplateId)
              console.log('🔗 Client ID:', selectedClientForPreview)
              console.log('📋 All clients count:', clientsData.length)
              
              if (!selectedTemplate || !selectedClient) {
                console.log('❌ Missing template or client')
                return null
              }
              
              const previewSubject = replaceVariables(selectedTemplate.subject, selectedClient)
              const previewContent = replaceVariables(selectedTemplate.htmlContent, selectedClient)
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <Label className="text-sm font-medium">Email Preview</Label>
                    <Badge variant="outline" className="text-xs">
                      {selectedClient.companyName}
                    </Badge>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      {/* Email Subject */}
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <div className="text-xs text-gray-500 mb-1">Subject:</div>
                        <div className="font-medium text-gray-900">
                          {previewSubject || 'No subject'}
                        </div>
                      </div>
                      
                      {/* Email Content Preview */}
                      <div className="bg-white border border-gray-200 rounded p-3 max-h-60 overflow-y-auto">
                        <div className="text-xs text-gray-500 mb-2">Content Preview:</div>
                        <div 
                          className="prose prose-sm max-w-none text-gray-900"
                          dangerouslySetInnerHTML={{
                            __html: previewContent || 'No content'
                          }}
                        />
                      </div>
                      
                      {/* Email Recipient Info */}
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <div className="text-xs text-gray-500 mb-2">Recipient:</div>
                        <div className="space-y-2">
                          <div className="font-medium text-gray-900 text-base">
                            {selectedClient.companyName || '[No Company Name]'}
                          </div>
                          <div className="text-sm text-blue-600 flex items-center gap-2 bg-blue-50 p-2 rounded">
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">{selectedClient.contactEmail || '[No Email]'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkEmail}
              disabled={isLoading || !selectedTemplateId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send {selectedItems.length} Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 