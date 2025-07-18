'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  Building,
  Webhook,
  Activity
} from 'lucide-react'

interface EmailLogWithWebhook {
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
  templateData?: string // JSON string containing webhook data
  client?: {
    id: string
    clientCode: string
    companyName: string
  }
  triggeredByUser?: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface WebhookData {
  messageId?: string
  service?: string
  webhookReceived?: boolean
  webhookTimestamp?: string
  brevoEventType?: string
  deliveryStatus?: string
  bounceReason?: string
  spamScore?: number
  openTracking?: boolean
  clickTracking?: boolean
}

interface EnhancedEmailLogDisplayProps {
  emailLog: EmailLogWithWebhook
}

export function EnhancedEmailLogDisplay({ emailLog }: EnhancedEmailLogDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showWebhookData, setShowWebhookData] = useState(false)

  // Parse webhook data from templateData
  const webhookData: WebhookData = emailLog.templateData 
    ? (() => {
        try {
          return JSON.parse(emailLog.templateData)
        } catch {
          return {}
        }
      })()
    : {}

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-amber-600" />
      case 'SENT': return <CheckCircle className="h-4 w-4 text-blue-600" />
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

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Not available'
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getDeliveryTime = () => {
    if (emailLog.deliveredAt && emailLog.sentAt) {
      const sent = new Date(emailLog.sentAt)
      const delivered = new Date(emailLog.deliveredAt)
      const diffMs = delivered.getTime() - sent.getTime()
      const diffSeconds = Math.round(diffMs / 1000)
      return `${diffSeconds}s`
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(emailLog.status)}
            <div>
              <CardTitle className="text-lg">{emailLog.subject}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getStatusColor(emailLog.status)}>
                  {emailLog.status.toLowerCase()}
                </Badge>
                {webhookData.webhookReceived && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                    <Webhook className="h-3 w-3 mr-1" />
                    Webhook ✓
                  </Badge>
                )}
                {getDeliveryTime() && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    {getDeliveryTime()} delivery
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm font-medium text-gray-600">Recipient</div>
            <div className="text-sm">{emailLog.recipientEmail}</div>
            {emailLog.recipientName && (
              <div className="text-xs text-gray-500">{emailLog.recipientName}</div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Client</div>
            {emailLog.client ? (
              <div className="text-sm">
                {emailLog.client.clientCode} - {emailLog.client.companyName}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No client assigned</div>
            )}
          </div>
        </div>

        {/* Delivery Timeline */}
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-sm font-medium text-gray-600 mb-2">Delivery Timeline</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Created:</span>
              <span>{formatTimestamp(emailLog.createdAt)}</span>
            </div>
            {emailLog.sentAt && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Sent:</span>
                <span>{formatTimestamp(emailLog.sentAt)}</span>
              </div>
            )}
            {emailLog.deliveredAt && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-gray-600">Delivered:</span>
                <span>{formatTimestamp(emailLog.deliveredAt)}</span>
                {getDeliveryTime() && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {getDeliveryTime()}
                  </Badge>
                )}
              </div>
            )}
            {emailLog.failedAt && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Failed:</span>
                <span>{formatTimestamp(emailLog.failedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Webhook Data Section */}
        {webhookData.webhookReceived && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWebhookData(!showWebhookData)}
              className="mb-3"
            >
              <Activity className="h-4 w-4 mr-2" />
              Webhook Details
              {showWebhookData ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>

            {showWebhookData && (
              <div className="border rounded-lg p-3 bg-purple-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {webhookData.messageId && (
                    <div>
                      <span className="font-medium text-gray-600">Message ID:</span>
                      <div className="font-mono text-xs">{webhookData.messageId}</div>
                    </div>
                  )}
                  {webhookData.brevoEventType && (
                    <div>
                      <span className="font-medium text-gray-600">Event Type:</span>
                      <div>{webhookData.brevoEventType}</div>
                    </div>
                  )}
                  {webhookData.webhookTimestamp && (
                    <div>
                      <span className="font-medium text-gray-600">Webhook Received:</span>
                      <div>{formatTimestamp(webhookData.webhookTimestamp)}</div>
                    </div>
                  )}
                  {webhookData.service && (
                    <div>
                      <span className="font-medium text-gray-600">Email Service:</span>
                      <div className="capitalize">{webhookData.service}</div>
                    </div>
                  )}
                  {webhookData.bounceReason && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Bounce Reason:</span>
                      <div className="text-red-600">{webhookData.bounceReason}</div>
                    </div>
                  )}
                  {webhookData.spamScore && (
                    <div>
                      <span className="font-medium text-gray-600">Spam Score:</span>
                      <div>{webhookData.spamScore}/10</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Failure Reason */}
        {emailLog.failureReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-600 mb-1">Failure Reason</div>
            <div className="text-sm text-red-700">{emailLog.failureReason}</div>
          </div>
        )}

        {/* Detailed View */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-600">Email Type</div>
              <Badge variant="secondary">{emailLog.emailType}</Badge>
            </div>
            
            {emailLog.triggeredByUser && (
              <div>
                <div className="text-sm font-medium text-gray-600">Sent By</div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  {emailLog.triggeredByUser.name} ({emailLog.triggeredByUser.role})
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Email Content Preview</div>
              <div className="text-sm bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                {emailLog.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 