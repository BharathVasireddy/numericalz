'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, FileCheck, AlertTriangle } from 'lucide-react'

interface ReviewItem {
  id: string
  clientName: string
  clientCode: string
  type: 'vat' | 'accounts' | 'ct'
  stage: string
  submittedBy: string
  submittedDate: Date
  daysWaiting: number
  priority: 'high' | 'medium' | 'low'
}

interface WorkReviewWidgetProps {
  items: ReviewItem[]
  title?: string
}

export function WorkReviewWidget({ items, title = "Work Pending Review" }: WorkReviewWidgetProps) {
  const router = useRouter()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-orange-600 bg-orange-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vat':
        return 'VAT Return'
      case 'accounts':
        return 'Annual Accounts'
      case 'ct':
        return 'Corporation Tax'
      default:
        return type.toUpperCase()
    }
  }

  const handleItemClick = (item: ReviewItem) => {
    // Navigate to the specific client with review tab open
    router.push(`/dashboard/clients/${item.id}?tab=review`)
  }

  const handleViewAll = () => {
    router.push('/dashboard/review-queue')
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {items.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No items pending review</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{item.clientName}</p>
                        <span className="text-xs text-muted-foreground">({item.clientCode})</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(item.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          by {item.submittedBy}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {item.daysWaiting}d
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {items.length > 5 && (
              <div className="mt-4 pt-3 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewAll}
                >
                  View all {items.length} items
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 