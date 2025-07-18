'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { 
  Mail, 
  Search, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  User,
  Building,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailLog {
  id: string
  createdAt: string
  recipientEmail: string
  recipientName?: string
  subject: string
  content: string
  emailType: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED'
  sentAt?: string
  deliveredAt?: string
  failedAt?: string
  failureReason?: string
  client?: {
    id: string
    companyName: string
    clientCode: string
  }
  triggeredByUser?: {
    id: string
    name: string
    email: string
    role: string
  }
}

const EMAIL_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'SENT', label: 'Sent' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PENDING', label: 'Pending' }
]

const EMAIL_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'OTP_LOGIN', label: 'OTP Login' },
  { value: 'TEST_EMAIL', label: 'Test Emails' },
  { value: 'RESENT_EMAIL', label: 'Resent Emails' },
  { value: 'VAT_ASSIGNMENT', label: 'VAT Assignment' },
  { value: 'LTD_ASSIGNMENT', label: 'Ltd Assignment' },
  { value: 'WORKFLOW_STAGE_CHANGE', label: 'Stage Change' },
  { value: 'WORKFLOW_REVIEW_COMPLETE', label: 'Workflow Review' },
  { value: 'DEADLINE_REMINDER', label: 'Deadline Reminder' },
  { value: 'MANUAL', label: 'Manual' }
]

export default function EmailHistoryPage() {
  const { data: session } = useSession()
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [users, setUsers] = useState<{id: string, name: string}[]>([])
  const [clients, setClients] = useState<{id: string, companyName: string, clientCode: string}[]>([])
  const pageSize = 50

  // Separate useEffect for filters (resets to page 1)
  useEffect(() => {
    setCurrentPage(1)
    fetchEmailLogs(true)
  }, [statusFilter, typeFilter, searchTerm, userFilter, clientFilter])

  // Separate useEffect for pagination (doesn't reset)
  useEffect(() => {
    if (currentPage > 1) {
      fetchEmailLogs(false)
    }
  }, [currentPage])

  // Load initial data and filter options
  useEffect(() => {
    loadFilterOptions()
    fetchEmailLogs(true)
  }, [])

  const loadFilterOptions = async () => {
    try {
      // Load users for filter
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      // Load clients for filter
      const clientsResponse = await fetch('/api/clients?limit=1000')
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json()
        setClients(clientsData.clients || [])
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }

  const handleDeleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email log? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/communication/history/${emailId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Email log deleted successfully')
        fetchEmailLogs(true) // Refresh the list
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete email log')
      }
    } catch (error) {
      console.error('Error deleting email:', error)
      toast.error('Failed to delete email log')
    }
  }

  const handleResendEmail = async (email: EmailLog) => {
    if (!confirm(`Resend this email to ${email.recipientEmail}?`)) {
      return
    }

    try {
      const response = await fetch('/api/communication/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailLogId: email.id,
          to: email.recipientEmail,
          subject: email.subject,
          htmlContent: email.content,
          clientId: email.client?.id
        })
      })

      if (response.ok) {
        toast.success('Email resent successfully')
        fetchEmailLogs(true) // Refresh to show new email log
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to resend email')
      }
    } catch (error) {
      console.error('Error resending email:', error)
      toast.error('Failed to resend email')
    }
  }

  const fetchEmailLogs = async (reset = false) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: reset ? '1' : currentPage.toString(),
        limit: pageSize.toString()
      })
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('emailType', typeFilter)
      if (userFilter !== 'all') params.append('userId', userFilter)
      if (clientFilter !== 'all') params.append('clientId', clientFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/communication/history?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setEmailLogs(data.emailLogs || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
        if (reset) setCurrentPage(1)
      } else {
        toast.error('Failed to fetch email history')
      }
    } catch (error) {
      console.error('Error fetching email logs:', error)
      toast.error('Error loading email history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <Send className="h-3 w-3 text-blue-500" />
      case 'DELIVERED': return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'FAILED': return <XCircle className="h-3 w-3 text-red-500" />
      case 'PENDING': return <Clock className="h-3 w-3 text-yellow-500" />
      default: return <Mail className="h-3 w-3 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openPreviewDialog = (email: EmailLog) => {
    setSelectedEmail(email)
    setShowPreviewDialog(true)
  }

  return (
    <PageLayout maxWidth="xl">
      <PageHeader
        title="Email History"
        description="Complete log of all emails sent from the system"
      />
      
      <PageContent>
        {/* Enhanced Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <SelectValue placeholder="User" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <SelectValue placeholder="Client" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clientCode} - {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => fetchEmailLogs(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div></div>
              <div className="text-sm text-muted-foreground">
                {totalCount} emails
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading emails...
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No emails found.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="w-48">To</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="w-24">Type</TableHead>
                        <TableHead className="w-32">From</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((email) => (
                        <TableRow key={email.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(email.status)}
                              <Badge variant="outline" className={getStatusColor(email.status)}>
                                {email.status.toLowerCase()}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(email.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{email.recipientEmail}</div>
                              {email.client && (
                                <div className="text-xs text-muted-foreground">
                                  {email.client.clientCode} - {email.client.companyName}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{email.subject}</div>
                            {email.failureReason && (
                              <div className="text-xs text-red-600 mt-1">
                                {email.failureReason}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {email.emailType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {email.triggeredByUser?.name || 'System'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPreviewDialog(email)}
                                title="Preview email"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendEmail(email)}
                                title="Resend email"
                                disabled={email.status === 'PENDING'}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEmail(email.id)}
                                title="Delete email log"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Simple Pagination */}
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Simple Email Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            {selectedEmail && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">To:</div>
                    <div className="text-sm">{selectedEmail.recipientEmail}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">From:</div>
                    <div className="text-sm">{selectedEmail.triggeredByUser?.name || 'System'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Subject:</div>
                    <div className="text-sm">{selectedEmail.subject}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Status:</div>
                    <Badge className={getStatusColor(selectedEmail.status)}>
                      {selectedEmail.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Date:</div>
                    <div className="text-sm">{formatDate(selectedEmail.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Type:</div>
                    <div className="text-sm">{selectedEmail.emailType}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">Content:</div>
                  <div 
                    className="border rounded-lg p-4 bg-background max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageLayout>
  )
} 