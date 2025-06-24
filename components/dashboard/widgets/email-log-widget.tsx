'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  User,
  Building
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  workflowType?: string
  client?: {
    id: string
    clientCode: string
    companyName: string
  }
  triggeredBy: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface EmailLogWidgetProps {
  className?: string
}

export function EmailLogWidget({ className }: EmailLogWidgetProps) {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const fetchEmailLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/email-logs?limit=20')
      const result = await response.json()
      
      if (result.success) {
        setEmailLogs(result.data.emailLogs)
      }
    } catch (error) {
      console.error('Error fetching email logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmailLogs()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-3 w-3 text-amber-600" />
      case 'SENT': return <CheckCircle className="h-3 w-3 text-blue-600" />
      case 'DELIVERED': return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'FAILED': return <XCircle className="h-3 w-3 text-red-600" />
      case 'BOUNCED': return <AlertCircle className="h-3 w-3 text-red-600" />
      default: return <Clock className="h-3 w-3 text-gray-600" />
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
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const displayLogs = expanded ? emailLogs : emailLogs.slice(0, 5)

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-4 h-4 bg-muted rounded-full" />
                    <div className="space-y-1 flex-1">
                      <div className="w-3/4 h-3 bg-muted rounded" />
                      <div className="w-1/2 h-2 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="w-16 h-5 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
              {emailLogs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {emailLogs.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchEmailLogs()}
              className="h-7 px-2"
            >
              Refresh
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Track all email notifications sent by the system
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {emailLogs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No email notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(log.status)}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {log.subject}
                        </span>
                        {log.client && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {log.client.clientCode}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">To: {log.recipientEmail}</span>
                        <span>•</span>
                        <span>{formatDate(log.createdAt)}</span>
                        <span>•</span>
                        <span>{getEmailTypeDisplay(log.emailType)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(log.status)}`}
                    >
                      {log.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setSelectedEmail(log)
                        setShowPreview(true)
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {emailLogs.length > 5 && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? (
                      <>
                        Show Less <ChevronUp className="ml-1 h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Show All {emailLogs.length} Emails <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-4 overflow-y-auto">
              {/* Email Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
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
                    <label className="text-xs font-medium text-muted-foreground">Recipient</label>
                    <p className="text-sm">{selectedEmail.recipientEmail}</p>
                    {selectedEmail.recipientName && (
                      <p className="text-xs text-muted-foreground">{selectedEmail.recipientName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email Type</label>
                    <p className="text-sm">{getEmailTypeDisplay(selectedEmail.emailType)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
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
                      <span className="text-sm">{selectedEmail.triggeredBy.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedEmail.triggeredBy.role}
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
                <p className="text-sm font-medium mt-1">{selectedEmail.subject}</p>
              </div>
              
              {/* Email Content */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Content</label>
                <div 
                  className="mt-2 p-4 border rounded-lg bg-white max-h-96 overflow-y-auto"
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