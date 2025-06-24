'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Search,
  Filter,
  RefreshCw,
  User,
  Building,
  Calendar,
  Send,
  ArrowRight
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EmailLog {
  id: string
  createdAt: string
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
    clientCode: string
    companyName: string
  }
  triggeredByUser: {
    id: string
    name: string
    email: string
    role: string
  }
}

export default function EmailLogsPage() {
  const { data: session } = useSession()
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
    total: 0,
    hasMore: false
  })

  const fetchEmailLogs = async (reset = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: reset ? '0' : pagination.offset.toString()
      })
      
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('emailType', typeFilter)
      
      const response = await fetch(`/api/notifications/email-logs?${params}`)
      const result = await response.json()
      
      if (result.success) {
        if (reset) {
          setEmailLogs(result.data.emailLogs)
          setPagination(prev => ({ ...prev, offset: 0, ...result.data.pagination }))
        } else {
          setEmailLogs(prev => [...prev, ...result.data.emailLogs])
          setPagination(prev => ({ ...prev, ...result.data.pagination }))
        }
      }
    } catch (error) {
      console.error('Error fetching email logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmailLogs(true)
  }, [statusFilter, typeFilter])

  const handleRefresh = () => {
    fetchEmailLogs(true)
  }

  const handleLoadMore = () => {
    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))
    fetchEmailLogs(false)
  }

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

  const filteredLogs = emailLogs.filter(log => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      log.subject.toLowerCase().includes(searchLower) ||
      log.recipientEmail.toLowerCase().includes(searchLower) ||
      log.client?.companyName.toLowerCase().includes(searchLower) ||
      log.client?.clientCode.toLowerCase().includes(searchLower) ||
      log.triggeredByUser.name.toLowerCase().includes(searchLower)
    )
  })

  // Only allow partners and managers to view email logs
  if (session?.user.role !== 'PARTNER' && session?.user.role !== 'MANAGER') {
    return (
      <PageLayout maxWidth="xl">
        <PageContent>
          <div className="text-center py-12">
            <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only Partners and Managers can view email logs.</p>
          </div>
        </PageContent>
      </PageLayout>
    )
  }

  return (
    <>
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Email Logs"
          description="Complete audit trail of all email notifications sent by the system"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </PageHeader>
        
        <PageContent>
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search emails..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="BOUNCED">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter || 'all'} onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="WORKFLOW_REVIEW_COMPLETE">Workflow Review</SelectItem>
                      <SelectItem value="DEADLINE_REMINDER">Deadline Reminder</SelectItem>
                      <SelectItem value="CLIENT_NOTIFICATION">Client Notification</SelectItem>
                      <SelectItem value="WEEKLY_SUMMARY">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {filteredLogs.length} emails
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Logs List */}
            <Card>
              <CardContent className="p-0">
                {loading && emailLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading email logs...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No emails found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter || typeFilter 
                        ? 'Try adjusting your filters' 
                        : 'No emails have been sent yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {filteredLogs.map((log, index) => (
                      <div
                        key={log.id}
                        className={`p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                          index % 2 === 0 ? 'bg-muted/10' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              {getStatusIcon(log.status)}
                            </div>
                            
                            {/* Email Details */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate max-w-md">
                                  {log.subject}
                                </span>
                                {log.client && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 flex-shrink-0">
                                    {log.client.clientCode}
                                  </Badge>
                                )}
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs flex-shrink-0 ${getStatusColor(log.status)}`}
                                >
                                  {log.status}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">From:</span>
                                  <span>{log.fromName} &lt;{log.fromEmail}&gt;</span>
                                </div>
                                <ArrowRight className="h-3 w-3" />
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">To:</span>
                                  <span>{log.recipientName ? `${log.recipientName} <${log.recipientEmail}>` : log.recipientEmail}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(log.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{log.triggeredByUser.name}</span>
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {log.triggeredByUser.role}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{getEmailTypeDisplay(log.emailType)}</span>
                                </div>
                                {log.client && (
                                  <div className="flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    <span className="truncate max-w-32">{log.client.companyName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedEmail(log)
                                setShowPreview(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Load More */}
                    {pagination.hasMore && (
                      <div className="p-4 text-center border-t">
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            `Load More (${pagination.total - filteredLogs.length} remaining)`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </PageLayout>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Email Headers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedEmail.status)}
                      <Badge className={getStatusColor(selectedEmail.status)}>
                        {selectedEmail.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">From</label>
                    <p className="text-sm">{selectedEmail.fromName} &lt;{selectedEmail.fromEmail}&gt;</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">To</label>
                    <p className="text-sm">
                      {selectedEmail.recipientName 
                        ? `${selectedEmail.recipientName} <${selectedEmail.recipientEmail}>` 
                        : selectedEmail.recipientEmail}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email Type</label>
                    <p className="text-sm">{getEmailTypeDisplay(selectedEmail.emailType)}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{formatDate(selectedEmail.createdAt)}</p>
                  </div>
                  
                  {selectedEmail.sentAt && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Sent</label>
                      <p className="text-sm">{formatDate(selectedEmail.sentAt)}</p>
                    </div>
                  )}
                  
                  {selectedEmail.deliveredAt && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Delivered</label>
                      <p className="text-sm">{formatDate(selectedEmail.deliveredAt)}</p>
                    </div>
                  )}
                  
                  {selectedEmail.failedAt && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Failed</label>
                      <p className="text-sm text-red-600">{formatDate(selectedEmail.failedAt)}</p>
                      {selectedEmail.failureReason && (
                        <p className="text-xs text-red-600 mt-1">{selectedEmail.failureReason}</p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Triggered By</label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3" />
                      <span className="text-sm">{selectedEmail.triggeredByUser.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedEmail.triggeredByUser.role}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedEmail.client && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Client</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-3 w-3" />
                        <span className="text-sm">{selectedEmail.client.companyName}</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedEmail.client.clientCode}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <p className="text-base font-medium mt-1">{selectedEmail.subject}</p>
              </div>
              
              {/* Email Content */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Content</label>
                <div 
                  className="mt-2 p-6 border rounded-lg bg-white max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 