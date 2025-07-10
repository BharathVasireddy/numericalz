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
  const [customSubject, setCustomSubject] = useState<string>('')
  const [customMessage, setCustomMessage] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)

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

  const handleEmailModalOpen = () => {
    setShowEmailModal(true)
    fetchEmailTemplates()
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
          templateId: selectedTemplateId,
          customSubject: customSubject.trim() || undefined,
          customMessage: customMessage.trim() || undefined
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
        setCustomSubject('')
        setCustomMessage('')
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Send Bulk Email
            </DialogTitle>
            <DialogDescription>
              Send emails to all {selectedItems.length} selected {entityNamePlural} using a template.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template-select">Email Template</Label>
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
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground">{template.subject}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Optional Customization */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Optional Customization</Label>
              
              <div className="space-y-2">
                <Label htmlFor="custom-subject">Custom Subject (optional)</Label>
                <Input
                  id="custom-subject"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Leave blank to use template subject"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-message">Custom Message (optional)</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Leave blank to use template content"
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Preview Info */}
            {selectedTemplateId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Email Preview</span>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Recipients:</strong> {selectedItems.length} {entityNamePlural}</p>
                  <p><strong>Template:</strong> {emailTemplates.find(t => t.id === selectedTemplateId)?.name}</p>
                  <p><strong>Subject:</strong> {customSubject.trim() || emailTemplates.find(t => t.id === selectedTemplateId)?.subject}</p>
                </div>
              </div>
            )}
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