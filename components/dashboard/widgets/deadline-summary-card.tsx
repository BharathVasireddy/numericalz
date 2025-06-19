'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Calendar, AlertCircle, CheckCircle, Clock, FileText, Building } from 'lucide-react'

interface DeadlineSummaryCardProps {
  title: string
  type: 'vat' | 'accounts' | 'ct' | 'confirmation'
  stats: {
    overdue: number
    dueSoon: number // Next 7 days
    upcoming: number // Next 30 days
    completed: number // This month
  }
  icon?: React.ReactNode
  color?: string
}

export function DeadlineSummaryCard({ 
  title, 
  type, 
  stats, 
  icon,
  color = 'blue' 
}: DeadlineSummaryCardProps) {
  const router = useRouter()
  
  const total = stats.overdue + stats.dueSoon + stats.upcoming

  const handleClick = (filter?: 'overdue' | 'dueSoon' | 'upcoming' | 'completed') => {
    // Navigate to appropriate page with filters
    let url = ''
    
    switch (type) {
      case 'vat':
        url = '/dashboard/clients/vat-dt'
        if (filter) {
          // Add query params for filtering
          url += `?filter=${filter}`
        }
        break
      case 'accounts':
      case 'ct':
        url = '/dashboard/clients'
        if (filter) {
          url += `?type=${type}&filter=${filter}`
        }
        break
      case 'confirmation':
        url = '/dashboard/clients'
        if (filter) {
          url += `?type=confirmation&filter=${filter}`
        }
        break
    }
    
    router.push(url)
  }

  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'vat':
        return <FileText className="h-5 w-5" />
      case 'accounts':
        return <Building className="h-5 w-5" />
      case 'ct':
        return <Calendar className="h-5 w-5" />
      case 'confirmation':
        return <CheckCircle className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getColorClasses = () => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
      green: 'text-green-600 bg-green-50 hover:bg-green-100',
      purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
      orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
      red: 'text-red-600 bg-red-50 hover:bg-red-100',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={() => handleClick()}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className={`p-2 rounded-lg ${getColorClasses()}`}>
            {getIcon()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Count */}
        <div className="text-center pb-2 border-b">
          <p className="text-3xl font-bold">{total}</p>
          <p className="text-sm text-muted-foreground">Total Pending</p>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          {stats.overdue > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClick('overdue')
              }}
              className="flex items-center justify-between p-2 rounded-md hover:bg-red-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Overdue</span>
              </div>
              <Badge variant="destructive" className="group-hover:scale-105 transition-transform">
                {stats.overdue}
              </Badge>
            </button>
          )}

          {stats.dueSoon > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClick('dueSoon')
              }}
              className="flex items-center justify-between p-2 rounded-md hover:bg-orange-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Due Soon</span>
              </div>
              <Badge className="bg-orange-100 text-orange-700 group-hover:scale-105 transition-transform">
                {stats.dueSoon}
              </Badge>
            </button>
          )}

          {stats.upcoming > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClick('upcoming')
              }}
              className="flex items-center justify-between p-2 rounded-md hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Upcoming</span>
              </div>
              <Badge className="bg-blue-100 text-blue-700 group-hover:scale-105 transition-transform">
                {stats.upcoming}
              </Badge>
            </button>
          )}

          {stats.completed > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClick('completed')
              }}
              className="flex items-center justify-between p-2 rounded-md hover:bg-green-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <Badge className="bg-green-100 text-green-700 group-hover:scale-105 transition-transform">
                {stats.completed}
              </Badge>
            </button>
          )}
        </div>

        {/* View All Link */}
        <div className="pt-2 border-t">
          <p className="text-xs text-center text-muted-foreground hover:text-primary transition-colors">
            Click to view all {title.toLowerCase()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 