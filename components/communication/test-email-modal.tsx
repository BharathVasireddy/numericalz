'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, Loader2, Building } from 'lucide-react'
import { toast } from 'sonner'
import { 
  processEmailVariables, 
  extractVariablesFromContent, 
  getVariableDisplayData 
} from '@/lib/email-variables'

interface Client {
  id: string
  clientCode: string
  companyName: string
  email: string
  phone?: string
  contactName?: string
  companyNumber?: string
  vatNumber?: string
  nextAccountsDue?: string
  nextCorporationTaxDue?: string
  nextVatReturnDue?: string
  incorporationDate?: string
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  // Extended data for variable processing
  currentVATQuarter?: {
    quarterPeriod: string
    quarterStartDate: string
    quarterEndDate: string
    filingDueDate: string
    currentStage: string
    isCompleted: boolean
    assignedUser?: {
      id: string
      name: string
      email: string
    }
  }
  currentLtdAccountsWorkflow?: {
    filingPeriodEnd: string
    accountsDueDate: string
    ctDueDate: string
    currentStage: string
    isCompleted: boolean
    assignedUser?: {
      id: string
      name: string
      email: string
    }
  }
}

interface TestEmailModalProps {
  isOpen: boolean
  onClose: () => void
  templateData: {
    name: string
    subject: string
    htmlContent: string
    category: string
  }
}

export function TestEmailModal({ isOpen, onClose, templateData }: TestEmailModalProps) {
  const { data: session } = useSession()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [testEmail, setTestEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [previewData, setPreviewData] = useState({
    subject: '',
    htmlContent: ''
  })
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null)
  const [isLoadingClientDetails, setIsLoadingClientDetails] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      setTestEmail(session?.user?.email || '')
      updatePreview()
    }
  }, [isOpen, session])

  useEffect(() => {
    updatePreview()
  }, [selectedClientId, templateData, selectedClientDetails])

  useEffect(() => {
    if (selectedClientId) {
      fetchClientDetails(selectedClientId)
    } else {
      setSelectedClientDetails(null)
    }
  }, [selectedClientId])

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true)
      const response = await fetch('/api/clients?active=true&limit=100&sortBy=companyName&sortOrder=asc')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setIsLoadingClients(false)
    }
  }

  const fetchClientDetails = async (clientId: string) => {
    try {
      setIsLoadingClientDetails(true)
      
      // Fetch detailed client data including VAT quarters and accounts workflows
      const [clientResponse, vatResponse, ltdResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/vat-quarters`),
        fetch(`/api/clients/ltd-deadlines?clientId=${clientId}`)
      ])

      const clientData = await clientResponse.json()
      const vatData = vatResponse.ok ? await vatResponse.json() : null
      const ltdData = ltdResponse.ok ? await ltdResponse.json() : null

      if (clientData.success) {
        const client = clientData.client
        
        // Combine basic client data with VAT and accounts data
        const enhancedClient: Client = {
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          email: client.contactEmail || client.email,
          phone: client.contactPhone || client.phone,
          contactName: client.contactName,
          companyNumber: client.companyNumber,
          vatNumber: client.vatNumber,
          nextAccountsDue: client.nextAccountsDue,
          nextCorporationTaxDue: client.nextCorporationTaxDue,
          nextVatReturnDue: client.nextVatReturnDue,
          incorporationDate: client.incorporationDate,
          assignedUser: client.assignedUser,
        }

        // Add VAT quarter data if available
        if (vatData?.success && vatData.data?.vatQuarters?.length > 0) {
          const currentQuarter = vatData.data.vatQuarters[0] // Most recent quarter
          enhancedClient.currentVATQuarter = {
            quarterPeriod: currentQuarter.quarterPeriod,
            quarterStartDate: currentQuarter.quarterStartDate,
            quarterEndDate: currentQuarter.quarterEndDate,
            filingDueDate: currentQuarter.filingDueDate,
            currentStage: currentQuarter.currentStage,
            isCompleted: currentQuarter.isCompleted,
            assignedUser: currentQuarter.assignedUser
          }
        }

        // Add Ltd accounts workflow data if available
        if (ltdData?.success && ltdData.clients?.length > 0) {
          const clientLtdData = ltdData.clients.find((c: any) => c.id === clientId)
          if (clientLtdData?.currentLtdAccountsWorkflow) {
            enhancedClient.currentLtdAccountsWorkflow = {
              filingPeriodEnd: clientLtdData.currentLtdAccountsWorkflow.filingPeriodEnd,
              accountsDueDate: clientLtdData.currentLtdAccountsWorkflow.accountsDueDate,
              ctDueDate: clientLtdData.currentLtdAccountsWorkflow.ctDueDate,
              currentStage: clientLtdData.currentLtdAccountsWorkflow.currentStage,
              isCompleted: clientLtdData.currentLtdAccountsWorkflow.isCompleted,
              assignedUser: clientLtdData.currentLtdAccountsWorkflow.assignedUser
            }
          }
        }

        setSelectedClientDetails(enhancedClient)
      }
    } catch (error) {
      console.error('Error fetching client details:', error)
      toast.error('Failed to load client details')
    } finally {
      setIsLoadingClientDetails(false)
    }
  }

  const updatePreview = () => {
    const clientData = selectedClientDetails || clients.find(c => c.id === selectedClientId)
    
    if (clientData) {
      const populatedSubject = populateVariables(templateData.subject, clientData)
      const populatedContent = populateVariables(templateData.htmlContent, clientData)
      
      setPreviewData({
        subject: populatedSubject,
        htmlContent: populatedContent
      })
    } else {
      setPreviewData({
        subject: templateData.subject,
        htmlContent: templateData.htmlContent
      })
    }
  }

  const populateVariables = (content: string, client: Client) => {
    // Prepare VAT data from client's current VAT quarter
    const vatData = client.currentVATQuarter ? {
      quarterPeriod: client.currentVATQuarter.quarterPeriod,
      quarterStartDate: new Date(client.currentVATQuarter.quarterStartDate),
      quarterEndDate: new Date(client.currentVATQuarter.quarterEndDate),
      filingDueDate: new Date(client.currentVATQuarter.filingDueDate),
      daysUntilDue: Math.ceil((new Date(client.currentVATQuarter.filingDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      isOverdue: new Date() > new Date(client.currentVATQuarter.filingDueDate),
      currentStage: client.currentVATQuarter.currentStage,
      isCompleted: client.currentVATQuarter.isCompleted,
      assignedUser: client.currentVATQuarter.assignedUser
    } : null

    // Prepare accounts data from client's current accounts workflow
    const accountsData = client.currentLtdAccountsWorkflow ? {
      filingPeriodEnd: client.currentLtdAccountsWorkflow.filingPeriodEnd,
      accountsDueDate: new Date(client.currentLtdAccountsWorkflow.accountsDueDate),
      corporationTaxDueDate: new Date(client.currentLtdAccountsWorkflow.ctDueDate),
      daysUntilAccountsDue: Math.ceil((new Date(client.currentLtdAccountsWorkflow.accountsDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      daysUntilCTDue: Math.ceil((new Date(client.currentLtdAccountsWorkflow.ctDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      isAccountsOverdue: new Date() > new Date(client.currentLtdAccountsWorkflow.accountsDueDate),
      isCTOverdue: new Date() > new Date(client.currentLtdAccountsWorkflow.ctDueDate),
      currentStage: client.currentLtdAccountsWorkflow.currentStage,
      isCompleted: client.currentLtdAccountsWorkflow.isCompleted,
      assignedUser: client.currentLtdAccountsWorkflow.assignedUser
    } : null

    // Prepare dates data
    const datesData = {
      today: new Date(),
      nextAccountsDue: client.nextAccountsDue ? new Date(client.nextAccountsDue) : null,
      nextCorporationTaxDue: client.nextCorporationTaxDue ? new Date(client.nextCorporationTaxDue) : null,
      nextVatReturnDue: client.nextVatReturnDue ? new Date(client.nextVatReturnDue) : null,
      incorporationDate: client.incorporationDate ? new Date(client.incorporationDate) : null
    }

    // Use the comprehensive variable processing system
    return processEmailVariables(content, {
      client: {
        companyName: client.companyName,
        clientCode: client.clientCode,
        companyNumber: client.companyNumber,
        vatNumber: client.vatNumber,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        assignedUser: client.assignedUser
      },
      user: client.assignedUser,
      vat: vatData,
      accounts: accountsData,
      dates: datesData,
      system: {
        currentDate: new Date(),
        companyName: 'Numericalz'
      }
    })
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter a test email address')
      return
    }

    if (!selectedClientId) {
      toast.error('Please select a client to populate variables')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      setIsSending(true)
      const response = await fetch('/api/communication/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: previewData.subject,
          htmlContent: previewData.htmlContent,
          clientId: selectedClientId,
          templateName: templateData.name
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Test email sent successfully!', {
          description: data.details ? `Sent to ${data.details.recipient} for ${data.details.client}` : undefined
        })
        onClose()
      } else {
        // Handle specific error types with detailed messages
        if (response.status === 401) {
          toast.error('Authentication failed', {
            description: data.message || 'Please log in again'
          })
        } else if (response.status === 403) {
          toast.error('Access denied', {
            description: data.message || 'You do not have permission to send test emails'
          })
        } else if (response.status === 404) {
          toast.error('Client not found', {
            description: data.message || 'Please refresh and try again'
          })
        } else if (response.status === 400) {
          toast.error('Invalid request', {
            description: data.message || 'Please check your input and try again'
          })
        } else if (response.status === 500) {
          toast.error('Server error', {
            description: data.message || 'Please try again later or contact support'
          })
        } else if (response.status === 503) {
          toast.error('Service unavailable', {
            description: data.message || 'Email service is temporarily unavailable'
          })
        } else {
          toast.error('Failed to send test email', {
            description: data.message || 'An unexpected error occurred'
          })
        }
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error', {
          description: 'Please check your internet connection and try again'
        })
      } else {
        toast.error('Error sending test email', {
          description: 'An unexpected error occurred. Please try again.'
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Email Template</DialogTitle>
          <DialogDescription>
            Send a test email with populated client variables to see how your template looks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testEmail">Send Test Email To</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="clientSelect">Select Client for Variables</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingClients ? (
                        <SelectItem value="loading" disabled>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading clients...
                        </SelectItem>
                      ) : (
                        clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              {client.companyName} ({client.clientCode})
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedClient && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Selected Client Details:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Company:</span> {selectedClient.companyName}
                    </div>
                    <div>
                      <span className="font-medium">Code:</span> {selectedClient.clientCode}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedClient.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedClient.phone || 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Visual Preview</TabsTrigger>
                  <TabsTrigger value="variables">Variable Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="border-b pb-3 mb-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Subject:</div>
                      <div className="font-medium">
                        {previewData.subject || 'No subject'}
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium text-muted-foreground mb-2">Content:</div>
                    <div 
                      className="prose prose-sm max-w-none whitespace-pre-wrap"
                      style={{ 
                        lineHeight: '1.6',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: previewData.htmlContent || '<p class="text-muted-foreground">No content</p>' 
                      }}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="variables" className="space-y-4">
                  {(() => {
                    // Extract all variables used in the template
                    const usedVariables = extractVariablesFromContent(`${templateData.subject} ${templateData.htmlContent}`)
                    const selectedClient = clients.find(c => c.id === selectedClientId)
                    
                    if (usedVariables.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No variables found in this template.</p>
                          <p className="text-sm mt-2">Use the "Add Shortcodes" button to insert variables.</p>
                        </div>
                      )
                    }

                    if (!selectedClient) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Select a client above to see variable values.</p>
                        </div>
                      )
                    }

                    // Get the data object for variable processing
                    const variableData = {
                      client: {
                        companyName: selectedClient.companyName,
                        clientCode: selectedClient.clientCode,
                        companyNumber: selectedClient.companyNumber,
                        vatNumber: selectedClient.vatNumber,
                        contactName: selectedClient.contactName,
                        email: selectedClient.email,
                        phone: selectedClient.phone,
                        assignedUser: selectedClient.assignedUser
                      },
                      user: selectedClient.assignedUser,
                      vat: {
                        quarterPeriod: 'Jul-Sep 2024',
                        quarterStartDate: new Date('2024-07-01'),
                        quarterEndDate: new Date('2024-09-30'),
                        filingDueDate: new Date('2024-10-31'),
                        daysUntilDue: Math.ceil((new Date('2024-10-31').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                        isOverdue: new Date() > new Date('2024-10-31')
                      },
                      accounts: {
                        filingPeriod: '2024 accounts',
                        yearEndDate: new Date('2024-03-31'),
                        accountsDueDate: new Date('2024-12-31'),
                        corporationTaxDueDate: new Date('2025-03-31'),
                        daysUntilAccountsDue: Math.ceil((new Date('2024-12-31').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                        daysUntilCTDue: Math.ceil((new Date('2025-03-31').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                        isAccountsOverdue: new Date() > new Date('2024-12-31'),
                        isCTOverdue: new Date() > new Date('2025-03-31')
                      }
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Variables Used in This Template</h4>
                          <span className="text-sm text-muted-foreground">{usedVariables.length} variable{usedVariables.length !== 1 ? 's' : ''} found</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                          {usedVariables.map((variableKey) => {
                            const variableInfo = getVariableDisplayData(variableKey, variableData)
                            return (
                              <div key={variableKey} className="border rounded-lg p-3 bg-muted/20">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                      &#123;&#123;{variableKey}&#125;&#125;
                                    </div>
                                    {variableInfo.description && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {variableInfo.description}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">
                                      {variableInfo.value || <span className="text-muted-foreground italic">Not available</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                          <div className="flex items-start gap-2">
                            <div className="text-blue-600 mt-0.5">💡</div>
                            <div>
                              <div className="font-medium text-blue-900">Variable Preview</div>
                              <div className="text-blue-700 mt-1">
                                Values shown are live data from the selected client, plus sample data for VAT and accounts variables.
                                In actual emails, these will be populated with real workflow data.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendTest} 
            disabled={isSending || !selectedClientId || !testEmail.trim()}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            {isSending ? 'Sending...' : 'Send Test Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
