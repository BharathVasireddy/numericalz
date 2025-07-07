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
  RefreshCw
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
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'NOTIFICATION', label: 'Notification' },
  { value: 'DEADLINE_REMINDER', label: 'Deadline' },
  { value: 'MANUAL', label: 'Manual' }
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
  const pageSize = 50

  useEffect(() => {
    fetchEmailLogs(true)
  }, [statusFilter, typeFilter, searchTerm, currentPage])

  const fetchEmailLogs = async (reset = false) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: reset ? '1' : currentPage.toString(),
        limit: pageSize.toString()
      })
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('emailType', typeFilter)
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
        {/* Simple Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
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
                <SelectTrigger className="w-32">
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
                <SelectTrigger className="w-32">
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
              
              <Button onClick={() => fetchEmailLogs(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>
                  {totalCount} emails found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                        <TableHead className="w-16">Actions</TableHead>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPreviewDialog(email)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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