'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  FileText, 
  Building, 
  CheckCircle, 
  Clock,
  TrendingUp,
  User,
  Building2,
  Receipt,
  Calculator,
  AlertTriangle,
  GripVertical
} from 'lucide-react'

interface StaffDashboardProps {
  userId: string
}

interface DashboardData {
  deadlines: {
    vat: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
    accounts: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
    ct: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
    confirmation: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
  }
  notifications: Array<{
    id: string
    type: 'deadline' | 'review' | 'assignment' | 'completion' | 'overdue' | 'system'
    title: string
    message: string
    clientName?: string
    clientCode?: string
    priority: 'high' | 'medium' | 'low'
    read: boolean
    createdAt: Date
    actionUrl?: string
  }>
  stats: {
    totalClients: number
    activeClients: number
    completedThisMonth: number
    overallProgress: number
  }
  recentActivity: Array<{
    id: string
    action: string
    clientName: string
    timestamp: Date | string
    type: 'vat' | 'accounts' | 'ct' | 'general'
  }>
}

interface DashboardWidget {
  id: string
  title: string
  component: React.ReactNode
  row: number
  col: number
}

export function StaffDashboard({ userId }: StaffDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  // Default widget layout
  const defaultWidgets: DashboardWidget[] = [
    // Row 1
    { id: 'stats', title: 'Your Statistics', component: null, row: 1, col: 1 },
    { id: 'deadlines', title: 'Your Deadlines', component: null, row: 1, col: 2 },
    { id: 'notifications', title: 'Priority Notifications', component: null, row: 1, col: 3 },
    
    // Row 2
    { id: 'recent-activity', title: 'Recent Activity', component: null, row: 2, col: 1 },
    { id: 'quick-actions', title: 'Quick Actions', component: null, row: 2, col: 2 },
    { id: 'urgent-alert', title: 'Urgent Deadlines', component: null, row: 2, col: 3 },
  ]

  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets)

  // Load layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('staff-dashboard-layout')
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout)
        const updatedWidgets = defaultWidgets.map(widget => {
          const saved = parsedLayout.find((s: any) => s.id === widget.id)
          return saved ? { ...widget, row: saved.row, col: saved.col } : widget
        })
        setWidgets(updatedWidgets)
      } catch (error) {
        console.error('Error loading dashboard layout:', error)
      }
    }
  }, [])

  // Update widgets with components when data is available
  useEffect(() => {
    if (data) {
      const updatedWidgets = widgets.map(widget => ({
        ...widget,
        component: getWidgetComponent(widget.id, data)
      }))
      setWidgets(updatedWidgets)
    }
  }, [data])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/staff/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(widgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    
    if (!reorderedItem) return // Add safety check
    
    items.splice(result.destination.index, 0, reorderedItem)

    setWidgets(items)
    
    // Save layout to localStorage
    const layoutToSave = items.map(({ component, ...rest }) => rest)
    localStorage.setItem('staff-dashboard-layout', JSON.stringify(layoutToSave))
  }

  // Organize widgets by rows for layout
  const organizeWidgetsByRows = () => {
    const rows: { [key: number]: DashboardWidget[] } = {}
    widgets.forEach(widget => {
      if (!rows[widget.row]) rows[widget.row] = []
      rows[widget.row]!.push(widget) // Add non-null assertion
    })
    
    // Sort widgets within each row by column
    Object.keys(rows).forEach(rowKey => {
      const rowNum = parseInt(rowKey)
      if (rows[rowNum]) {
        rows[rowNum].sort((a, b) => a.col - b.col)
      }
    })
    
    return rows
  }

  const getWidgetComponent = (widgetId: string, data: DashboardData) => {
    switch (widgetId) {
      case 'stats':
        return <YourStatisticsWidget data={data} />
      case 'deadlines':
        return <YourDeadlinesWidget data={data} />
      case 'notifications':
        return <PriorityNotificationsWidget data={data} />
      case 'recent-activity':
        return <RecentActivityWidget data={data} getActivityTypeIcon={getActivityTypeIcon} />
      case 'quick-actions':
        return <QuickActionsWidget router={router} />
      case 'urgent-alert':
        return <UrgentDeadlinesWidget data={data} router={router} />
      default:
        return null
    }
  }

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'vat': return <Receipt className="h-3 w-3 text-green-600" />
      case 'accounts': return <FileText className="h-3 w-3 text-blue-600" />
      case 'ct': return <Calculator className="h-3 w-3 text-purple-600" />
      default: return <Building className="h-3 w-3 text-gray-600" />
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'vat': return 'text-green-600'
      case 'accounts': return 'text-blue-600'
      case 'ct': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your work overview and upcoming deadlines
            </p>
          </div>
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted h-32" />
              ))}
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-lg bg-muted h-48" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-lg bg-muted h-64" />
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!data) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your work overview and upcoming deadlines
            </p>
          </div>
          <div className="text-center text-muted-foreground">
            Failed to load dashboard data
          </div>
        </div>
      </PageLayout>
    )
  }

  const widgetRows = organizeWidgetsByRows()

  return (
    <PageLayout maxWidth="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Welcome back, {session?.user?.name}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag widgets to rearrange • Your work overview and upcoming deadlines
          </p>
        </div>

        {/* Draggable Dashboard Grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {Object.keys(widgetRows).sort().map(rowKey => {
              const rowNumber = parseInt(rowKey)
              const rowWidgets = widgetRows[rowNumber]
              
              return (
                <Droppable key={`row-${rowNumber}`} droppableId={`row-${rowNumber}`} direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {rowWidgets?.map((widget, index) => (
                        <Draggable key={widget.id} draggableId={widget.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${
                                snapshot.isDragging ? 'rotate-2 shadow-xl' : ''
                              } transition-transform duration-200`}
                            >
                              <Card className="relative group">
                                <div
                                  {...provided.dragHandleProps}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing z-10"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {widget.component}
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      </div>
    </PageLayout>
  )
}

// Widget Components
function YourStatisticsWidget({ data }: { data: DashboardData }) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Your Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-700">{data.stats.totalClients}</span>
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">Total Clients</p>
          </div>
          
          <div className="p-3 rounded-lg bg-green-50">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-lg font-bold text-green-700">{data.stats.activeClients}</span>
            </div>
            <p className="text-xs text-green-600 font-medium mt-1">Active</p>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-50">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <span className="text-lg font-bold text-purple-700">{data.stats.completedThisMonth}</span>
            </div>
            <p className="text-xs text-purple-600 font-medium mt-1">Completed</p>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-50">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-lg font-bold text-orange-700">{data.stats.overallProgress}%</span>
            </div>
            <p className="text-xs text-orange-600 font-medium mt-1">Progress</p>
          </div>
        </div>
      </CardContent>
    </>
  )
}

function YourDeadlinesWidget({ data }: { data: DashboardData }) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Your Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-3 w-3 text-red-600" />
                <span className="text-sm font-medium text-red-800">VAT Returns</span>
              </div>
              <span className="text-lg font-bold text-red-700">
                {data.deadlines.vat.overdue + data.deadlines.vat.dueSoon}
              </span>
            </div>
            <div className="text-xs text-red-600">
              {data.deadlines.vat.overdue} overdue • {data.deadlines.vat.dueSoon} due soon
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Accounts</span>
              </div>
              <span className="text-lg font-bold text-blue-700">
                {data.deadlines.accounts.overdue + data.deadlines.accounts.dueSoon}
              </span>
            </div>
            <div className="text-xs text-blue-600">
              {data.deadlines.accounts.overdue} overdue • {data.deadlines.accounts.dueSoon} due soon
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-3 w-3 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Corp Tax</span>
              </div>
              <span className="text-lg font-bold text-purple-700">
                {data.deadlines.ct.overdue + data.deadlines.ct.dueSoon}
              </span>
            </div>
            <div className="text-xs text-purple-600">
              {data.deadlines.ct.overdue} overdue • {data.deadlines.ct.dueSoon} due soon
            </div>
          </div>
        </div>
      </CardContent>
    </>
  )
}

function PriorityNotificationsWidget({ data }: { data: DashboardData }) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Priority Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.notifications.slice(0, 3).map((notification) => (
          <div key={notification.id} className={`p-3 rounded-lg border ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                {notification.clientName && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {notification.clientName}
                  </Badge>
                )}
              </div>
              <Badge 
                variant={notification.priority === 'high' ? 'destructive' : notification.priority === 'medium' ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {notification.priority}
              </Badge>
            </div>
          </div>
        ))}
        {data.notifications.length === 0 && (
          <div className="text-center py-4">
            <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
          </div>
        )}
      </CardContent>
    </>
  )
}

function RecentActivityWidget({ 
  data, 
  getActivityTypeIcon 
}: { 
  data: DashboardData
  getActivityTypeIcon: (type: string) => React.ReactNode
}) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.recentActivity.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
            {getActivityTypeIcon(activity.type)}
            <div className="flex-1">
              <p className="text-sm font-medium">{activity.action}</p>
              <p className="text-xs text-muted-foreground">{activity.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {data.recentActivity.length === 0 && (
          <div className="text-center py-6">
            <Clock className="h-6 w-6 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </CardContent>
    </>
  )
}

function QuickActionsWidget({ router }: { router: any }) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2">
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => router.push('/dashboard/clients')}
          >
            <Building className="h-4 w-4" />
            <span className="text-xs">My Clients</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => router.push('/dashboard/clients/vat-dt')}
          >
            <Receipt className="h-4 w-4" />
            <span className="text-xs">VAT Returns</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => router.push('/dashboard/clients/ltd-companies')}
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs">Accounts</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => router.push('/dashboard/calendar')}
          >
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Calendar</span>
          </Button>
        </div>
      </CardContent>
    </>
  )
}

function UrgentDeadlinesWidget({ data, router }: { data: DashboardData, router: any }) {
  const totalOverdueAndDueSoon = 
    data.deadlines.vat.overdue + data.deadlines.vat.dueSoon +
    data.deadlines.accounts.overdue + data.deadlines.accounts.dueSoon +
    data.deadlines.ct.overdue + data.deadlines.ct.dueSoon +
    data.deadlines.confirmation.overdue + data.deadlines.confirmation.dueSoon

  if (totalOverdueAndDueSoon === 0) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            All Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-sm font-medium text-green-700">No urgent deadlines!</p>
            <p className="text-xs text-muted-foreground">Great work staying on top of everything</p>
          </div>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Urgent Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-900">
                {totalOverdueAndDueSoon} urgent deadline{totalOverdueAndDueSoon !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-700">
                Review your deadlines and prioritize your work accordingly
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => router.push('/dashboard/clients')}
          >
            View Deadlines
          </Button>
        </div>
      </CardContent>
    </>
  )
} 