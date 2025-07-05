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
import { 
  Mail, 
  Search, 
  Filter, 
  Eye, 
  User, 
  Building2, 
  Clock, 
  Send, 
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Building,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailLog {
  id: string
  createdAt: string
  updatedAt: string
  fromEmail: string
  fromName: string
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
  workflowType?: string
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
  template?: {
    id: string
    name: string
    category: string
  }
}

// Enhanced status options (from Email Logs)
const EMAIL_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SENT', label: 'Sent' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'BOUNCED', label: 'Bounced' }
]

// Enhanced email types (from Email Logs)
const EMAIL_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'TEMPLATE', label: 'Template Email' },
  { value: 'MANUAL', label: 'Manual Email' },
  { value: 'WORKFLOW', label: 'Workflow Email' },
  { value: 'NOTIFICATION', label: 'Notification' },
  { value: 'TEST_EMAIL', label: 'Test Email' },
  { value: 'WORKFLOW_REVIEW_COMPLETE', label: 'Workflow Review' },
  { value: 'DEADLINE_REMINDER', label: 'Deadline Reminder' },
  { value: 'CLIENT_NOTIFICATION', label: 'Client Notification' },
  { value: 'WEEKLY_SUMMARY', label: 'Weekly Summary' }
]

export default function EmailHistoryPage() {
  const { data: session } = useSession()
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  
  // Enhanced pagination (supporting both styles)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [paginationMode, setPaginationMode] = useState<'page' | 'loadMore'>('loadMore')
  const [pageSize, setPageSize] = useState(100)
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 100,
    total: 0,
    hasMore: false
  })
  
  // Enhanced filter options
  const [clients, setClients] = useState<{id: string, clientCode: string, companyName: string}[]>([])
  const [users, setUsers] = useState<{id: string, name: string, role: string}[]>([])

  useEffect(() => {
    fetchEmailLogs(true)
  }, [statusFilter, typeFilter, clientFilter, userFilter, searchTerm])

  useEffect(() => {
    fetchClients()
    fetchUsers()
  }, [])

  const fetchEmailLogs = async (reset = false) => {
    try {
      setLoading(true)
      
      let params: URLSearchParams
      
      if (paginationMode === 'loadMore') {
        // Load more style (offset-based)
        params = new URLSearchParams({
          limit: pageSize.toString(),
          offset: reset ? '0' : pagination.offset.toString()
        })
      } else {
        // Standard pagination (page-based)
        params = new URLSearchParams({
          page: reset ? '1' : currentPage.toString(),
          limit: pageSize.toString()
        })
      }
      
      // Add filters
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('emailType', typeFilter)
      if (clientFilter !== 'all') params.append('clientId', clientFilter)
      if (userFilter !== 'all') params.append('userId', userFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/communication/history?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (paginationMode === 'loadMore') {
          // Handle load more response
          if (reset) {
            setEmailLogs(data.data.emailLogs)
            setPagination(prev => ({ ...prev, offset: 0, ...data.data.pagination }))
          } else {
            setEmailLogs(prev => [...prev, ...data.data.emailLogs])
            setPagination(prev => ({ ...prev, ...data.data.pagination }))
          }
        } else {
          // Handle standard pagination response
          setEmailLogs(data.emailLogs || [])
          setTotalPages(data.totalPages || 1)
          setTotalCount(data.totalCount || 0)
          if (reset) setCurrentPage(1)
        }
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

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=1000&select=basic')
      const result = await response.json()
      if (result.success) {
        setClients(result.data.clients.map((client: any) => ({
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName
        })))
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const result = await response.json()
      if (result.success) {
        setUsers(result.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          role: user.role
        })))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleRefresh = () => {
    fetchEmailLogs(true)
  }

  const handleLoadMore = () => {
    if (paginationMode === 'loadMore') {
      setPagination(prev => ({ ...prev, offset: prev.offset + pageSize }))
      fetchEmailLogs(false)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPagination(prev => ({ ...prev, limit: newSize }))
    fetchEmailLogs(true)
  }

  const handleViewAll = () => {
    setPageSize(1000)
    setPagination(prev => ({ ...prev, limit: 1000 }))
    fetchEmailLogs(true)
  }

  // Enhanced status functions (from Email Logs)
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-amber-600" />
      case 'SENT': return <Send className="h-4 w-4 text-blue-600" />
      case 'DELIVERED': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-600" />
      case 'BOUNCED': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'SENT': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200'
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200'
      case 'BOUNCED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEmailTypeDisplay = (type: string) => {
    switch (type) {
      case 'WORKFLOW_REVIEW_COMPLETE': return 'Workflow Review'
      case 'DEADLINE_REMINDER': return 'Deadline Reminder'
      case 'CLIENT_NOTIFICATION': return 'Client Notification'
      case 'WEEKLY_SUMMARY': return 'Weekly Summary'
      case 'TEST_EMAIL': return 'Test Email'
      default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }
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

  const openPreviewDialog = (email: EmailLog) => {
    setSelectedEmail(email)
    setShowPreviewDialog(true)
  }

  // Reset to first page when filters change
  useEffect(() => {
    if (paginationMode === 'page') {
      setCurrentPage(1)
    } else {
      setPagination(prev => ({ ...prev, offset: 0 }))
    }
  }, [statusFilter, typeFilter, searchTerm, clientFilter, userFilter])

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Email History"
        description="Complete email communication tracking with delivery status and technical details"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" />
            {totalCount || pagination.total || 0} emails
          </Badge>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Enhanced Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="xl:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 md:left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by recipient, subject, or client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 md:pl-14"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
              
              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
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
              
              {/* Client Filter */}
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clientCode} - {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* User Filter */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Pagination Mode Toggle and Page Size Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">View mode:</span>
                  <Select value={paginationMode} onValueChange={(value: 'page' | 'loadMore') => setPaginationMode(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">Pages</SelectItem>
                      <SelectItem value="loadMore">Load More</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Page size:</span>
                  <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={handleViewAll} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Email List */}
        <Card>
          <CardHeader>
            <CardTitle>Email Communications</CardTitle>
            <CardDescription>
              Complete history of all email communications with delivery tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading emails...
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No emails found matching your criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {emailLogs.map((email) => (
                  <div key={email.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(email.status)}
                          <Badge className={getStatusColor(email.status)}>
                            {email.status.toLowerCase()}
                          </Badge>
                          <Badge variant="outline">
                            {getEmailTypeDisplay(email.emailType)}
                          </Badge>
                          {email.template && (
                            <Badge variant="secondary">
                              {email.template.name}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{email.subject}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {email.recipientEmail}
                              {email.recipientName && (
                                <span>({email.recipientName})</span>
                              )}
                            </div>
                            
                            {email.client && (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {email.client.clientCode} - {email.client.companyName}
                              </div>
                            )}
                            
                            {email.triggeredByUser && (
                              <div className="flex items-center gap-1">
                                <Send className="h-3 w-3" />
                                {email.triggeredByUser.name}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created: {formatDate(email.createdAt)}
                            </div>
                            
                            {email.sentAt && (
                              <div className="flex items-center gap-1">
                                <Send className="h-3 w-3" />
                                Sent: {formatDate(email.sentAt)}
                              </div>
                            )}
                            
                            {email.deliveredAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Delivered: {formatDate(email.deliveredAt)}
                              </div>
                            )}
                            
                            {email.failedAt && (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3 w-3" />
                                Failed: {formatDate(email.failedAt)}
                              </div>
                            )}
                          </div>
                          
                          {email.failureReason && (
                            <div className="text-xs text-red-600 mt-1">
                              Failure reason: {email.failureReason}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPreviewDialog(email)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex justify-center mt-6">
                  {paginationMode === 'loadMore' ? (
                    pagination.hasMore && (
                      <Button onClick={handleLoadMore} disabled={loading}>
                        {loading ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Load More
                      </Button>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
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
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Email Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
            </DialogHeader>
            {selectedEmail && (
              <div className="space-y-4">
                {/* Email Metadata */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedEmail.status)}
                      <Badge className={getStatusColor(selectedEmail.status)}>
                        {selectedEmail.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Type</div>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {getEmailTypeDisplay(selectedEmail.emailType)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">From</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedEmail.fromName} &lt;{selectedEmail.fromEmail}&gt;
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">To</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedEmail.recipientName && `${selectedEmail.recipientName} `}
                      &lt;{selectedEmail.recipientEmail}&gt;
                    </div>
                  </div>
                  
                  {selectedEmail.client && (
                    <div>
                      <div className="text-sm font-medium">Client</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedEmail.client.clientCode} - {selectedEmail.client.companyName}
                      </div>
                    </div>
                  )}
                  
                  {selectedEmail.triggeredByUser && (
                    <div>
                      <div className="text-sm font-medium">Sent By</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedEmail.triggeredByUser.name} ({selectedEmail.triggeredByUser.role})
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(selectedEmail.createdAt)}
                    </div>
                  </div>
                  
                  {selectedEmail.sentAt && (
                    <div>
                      <div className="text-sm font-medium">Sent</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDate(selectedEmail.sentAt)}
                      </div>
                    </div>
                  )}
                  
                  {selectedEmail.deliveredAt && (
                    <div>
                      <div className="text-sm font-medium">Delivered</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDate(selectedEmail.deliveredAt)}
                      </div>
                    </div>
                  )}
                  
                  {selectedEmail.failedAt && (
                    <div>
                      <div className="text-sm font-medium text-red-600">Failed</div>
                      <div className="text-sm text-red-600 mt-1">
                        {formatDate(selectedEmail.failedAt)}
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedEmail.failureReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800">Failure Reason</div>
                    <div className="text-sm text-red-700 mt-1">{selectedEmail.failureReason}</div>
                  </div>
                )}
                
                {/* Subject */}
                <div>
                  <div className="text-sm font-medium">Subject</div>
                  <div className="text-sm text-muted-foreground mt-1">{selectedEmail.subject}</div>
                </div>
                
                {/* Content */}
                <div>
                  <div className="text-sm font-medium">Content</div>
                  <div className="mt-2 border rounded-lg p-4 bg-background">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.content }} />
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageLayout>
  )
} 