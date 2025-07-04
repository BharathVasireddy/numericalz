'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Mail, Search, Filter, Eye, User, Building2, Clock, Send } from 'lucide-react'
import { toast } from 'sonner'

interface EmailLog {
  id: string
  recipientEmail: string
  recipientName?: string
  subject: string
  content: string
  emailType: string
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
  sentAt?: string
  deliveredAt?: string
  failedAt?: string
  failureReason?: string
  fromEmail?: string
  fromName?: string
  createdAt: string
  client?: {
    id: string
    companyName: string
    clientCode: string
  }
  triggeredByUser: {
    id: string
    name: string
    email: string
  }
  template?: {
    id: string
    name: string
    category: string
  }
}

const EMAIL_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SENT', label: 'Sent' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' }
]

const EMAIL_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'TEMPLATE', label: 'Template Email' },
  { value: 'MANUAL', label: 'Manual Email' },
  { value: 'WORKFLOW', label: 'Workflow Email' },
  { value: 'NOTIFICATION', label: 'Notification' }
]

export default function EmailHistoryPage() {
  const { data: session } = useSession()
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchEmailLogs()
  }, [currentPage, statusFilter, typeFilter, searchTerm])

  const fetchEmailLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { emailType: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/communication/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEmailLogs(data.emailLogs || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
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

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'secondary',
      SENT: 'default',
      DELIVERED: 'default',
      FAILED: 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.toLowerCase()}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-3 w-3 text-muted-foreground" />
      case 'SENT':
      case 'DELIVERED':
        return <Send className="h-3 w-3 text-green-600" />
      case 'FAILED':
        return <Mail className="h-3 w-3 text-destructive" />
      default:
        return <Mail className="h-3 w-3 text-muted-foreground" />
    }
  }

  const openPreviewDialog = (email: EmailLog) => {
    setSelectedEmail(email)
    setShowPreviewDialog(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, searchTerm])

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Email History"
        description="View all sent communications and their delivery status"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" />
            {totalCount} emails
          </Badge>
        </div>
      </PageHeader>

      <PageContent>
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by recipient, subject, or client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Communications
            </CardTitle>
            <CardDescription>
              Track all email communications sent to clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-4 h-4 bg-muted rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No emails found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No emails match your search criteria'
                    : 'No emails have been sent yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Sent By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(email.status)}
                            {getStatusBadge(email.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{email.recipientName || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{email.recipientEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={email.subject}>
                            {email.subject}
                          </div>
                        </TableCell>
                        <TableCell>
                          {email.client ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{email.client.clientCode}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{email.triggeredByUser.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {email.sentAt ? formatDate(email.sentAt) : formatDate(email.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreviewDialog(email)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} emails
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Email Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-6">
              {/* Email Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">To</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedEmail.recipientName || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">{selectedEmail.recipientEmail}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">From</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedEmail.fromName || 'Numericalz'}</div>
                    <div className="text-sm text-muted-foreground">{selectedEmail.fromEmail}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedEmail.status)}
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sent Date</Label>
                  <div className="mt-1 text-sm">
                    {selectedEmail.sentAt ? formatDate(selectedEmail.sentAt) : 'Not sent'}
                  </div>
                </div>
                {selectedEmail.client && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Client</Label>
                    <div className="mt-1">
                      <div className="font-medium">{selectedEmail.client.companyName}</div>
                      <div className="text-sm text-muted-foreground">{selectedEmail.client.clientCode}</div>
                    </div>
                  </div>
                )}
                {selectedEmail.template && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                    <div className="mt-1">
                      <div className="font-medium">{selectedEmail.template.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedEmail.template.category}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Subject */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                <div className="mt-1 p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">{selectedEmail.subject}</div>
                </div>
              </div>

              {/* Email Content */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Content</Label>
                <div className="mt-1 p-4 bg-muted/50 rounded-lg max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </div>

              {/* Failure Reason */}
              {selectedEmail.status === 'FAILED' && selectedEmail.failureReason && (
                <div>
                  <Label className="text-sm font-medium text-destructive">Failure Reason</Label>
                  <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="text-sm text-destructive">{selectedEmail.failureReason}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  )
} 