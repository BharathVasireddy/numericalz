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

interface Client {
  id: string
  clientCode: string
  companyName: string
  email: string
  phone?: string
  contactName?: string
  assignedUser?: {
    id: string
    name: string
    email: string
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

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      setTestEmail(session?.user?.email || '')
      updatePreview()
    }
  }, [isOpen, session])

  useEffect(() => {
    updatePreview()
  }, [selectedClientId, templateData])

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

  const updatePreview = () => {
    const selectedClient = clients.find(c => c.id === selectedClientId)
    
    if (selectedClient) {
      const populatedSubject = populateVariables(templateData.subject, selectedClient)
      const populatedContent = populateVariables(templateData.htmlContent, selectedClient)
      
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
    let populated = content

    // Client variables
    populated = populated.replace(/\{\{client\.companyName\}\}/g, client.companyName || '')
    populated = populated.replace(/\{\{client\.clientCode\}\}/g, client.clientCode || '')
    populated = populated.replace(/\{\{client\.email\}\}/g, client.email || '')
    populated = populated.replace(/\{\{client\.phone\}\}/g, client.phone || '')
    populated = populated.replace(/\{\{client\.contactName\}\}/g, client.contactName || '')

    // User variables
    if (client.assignedUser) {
      populated = populated.replace(/\{\{user\.name\}\}/g, client.assignedUser.name || '')
      populated = populated.replace(/\{\{user\.email\}\}/g, client.assignedUser.email || '')
    }

    // Date variables
    const today = new Date()
    populated = populated.replace(/\{\{date\.today\}\}/g, today.toLocaleDateString('en-GB'))
    populated = populated.replace(/\{\{date\.todayLong\}\}/g, today.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))

    // System variables
    populated = populated.replace(/\{\{system\.firmName\}\}/g, 'Numericalz')
    populated = populated.replace(/\{\{system\.firmEmail\}\}/g, 'info@numericalz.com')
    populated = populated.replace(/\{\{system\.firmPhone\}\}/g, '+44 20 1234 5678')

    return populated
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
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: previewData.htmlContent || '<p class="text-muted-foreground">No content</p>' 
                      }}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="variables" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Client Variables</h4>
                      <div className="space-y-1 text-muted-foreground">
                        <div><code>&#123;&#123;client.companyName&#125;&#125;</code> → {selectedClient?.companyName || 'Not selected'}</div>
                        <div><code>&#123;&#123;client.clientCode&#125;&#125;</code> → {selectedClient?.clientCode || 'Not selected'}</div>
                        <div><code>&#123;&#123;client.email&#125;&#125;</code> → {selectedClient?.email || 'Not selected'}</div>
                        <div><code>&#123;&#123;client.phone&#125;&#125;</code> → {selectedClient?.phone || 'Not selected'}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">System Variables</h4>
                      <div className="space-y-1 text-muted-foreground">
                        <div><code>&#123;&#123;system.firmName&#125;&#125;</code> → Numericalz</div>
                        <div><code>&#123;&#123;system.firmEmail&#125;&#125;</code> → info@numericalz.com</div>
                        <div><code>&#123;&#123;date.today&#125;&#125;</code> → {new Date().toLocaleDateString('en-GB')}</div>
                        <div><code>&#123;&#123;user.name&#125;&#125;</code> → {selectedClient?.assignedUser?.name || 'Not assigned'}</div>
                      </div>
                    </div>
                  </div>
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
