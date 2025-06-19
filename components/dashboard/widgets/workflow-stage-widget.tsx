'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import { 
  Phone, 
  FileText, 
  Clock, 
  CheckCircle, 
  Send, 
  UserCheck, 
  Building,
  AlertCircle 
} from 'lucide-react'

interface WorkflowStageData {
  stage: string
  label: string
  count: number
  percentage: number
  color: string
  icon?: React.ReactNode
  avgDaysInStage: number
}

interface WorkflowStageWidgetProps {
  stages: WorkflowStageData[]
  title?: string
  type?: 'vat' | 'accounts' | 'ct'
  totalClients: number
}

export function WorkflowStageWidget({ 
  stages, 
  title = "Workflow Stage Distribution",
  type = 'vat',
  totalClients
}: WorkflowStageWidgetProps) {
  const router = useRouter()

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'CHASE_STARTED':
        return <Phone className="h-4 w-4" />
      case 'PAPERWORK_RECEIVED':
        return <FileText className="h-4 w-4" />
      case 'WORK_STARTED':
        return <Clock className="h-4 w-4" />
      case 'WORK_FINISHED':
        return <CheckCircle className="h-4 w-4" />
      case 'SENT_TO_CLIENT':
        return <Send className="h-4 w-4" />
      case 'CLIENT_APPROVED':
        return <UserCheck className="h-4 w-4" />
      case 'FILED_TO_HMRC':
        return <Building className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const handleStageClick = (stage: WorkflowStageData) => {
    let url = ''
    
    switch (type) {
      case 'vat':
        url = `/dashboard/clients/vat-dt?stage=${stage.stage}`
        break
      case 'accounts':
        url = `/dashboard/clients?type=accounts&stage=${stage.stage}`
        break
      case 'ct':
        url = `/dashboard/clients?type=ct&stage=${stage.stage}`
        break
    }
    
    router.push(url)
  }

  const handleViewAll = () => {
    switch (type) {
      case 'vat':
        router.push('/dashboard/clients/vat-dt')
        break
      case 'accounts':
        router.push('/dashboard/clients?type=accounts')
        break
      case 'ct':
        router.push('/dashboard/clients?type=ct')
        break
    }
  }

  const getStageColor = (color: string) => {
    const colors = {
      'gray': 'bg-gray-100 text-gray-700 border-gray-200',
      'blue': 'bg-blue-100 text-blue-700 border-blue-200',
      'yellow': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'green': 'bg-green-100 text-green-700 border-green-200',
      'purple': 'bg-purple-100 text-purple-700 border-purple-200',
      'orange': 'bg-orange-100 text-orange-700 border-orange-200',
      'red': 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {totalClients} clients
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {stages.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No workflow data available</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stages.map((stage) => (
                <button
                  key={stage.stage}
                  onClick={() => handleStageClick(stage)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getStageColor(stage.color)}`}>
                        {stage.icon || getStageIcon(stage.stage)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{stage.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg {stage.avgDaysInStage} days in stage
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {stage.count}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {stage.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <Progress 
                    value={stage.percentage} 
                    className="h-2"
                  />
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t">
              <button
                onClick={handleViewAll}
                className="w-full p-2 text-sm text-center text-muted-foreground hover:text-primary transition-colors"
              >
                View All {type.toUpperCase()} Workflows →
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
} 