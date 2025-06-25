'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { PendingToChaseWidget } from './widgets/pending-to-chase-widget'
import { VATUnassignedWidget } from './widgets/vat-unassigned-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  FileCheck, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Crown,
  Shield,
  User,
  Building2,
  Receipt,
  CheckCircle,
  Calculator,
  BarChart3,
  Clock,
  Building,
  FileText,
  GripVertical
} from 'lucide-react'

interface ManagerDashboardProps {
  userId: string
}

interface DashboardData {
  clientCounts: {
    total: number
    ltd: number
    nonLtd: number
    vat: number
  }
  unassignedClients: {
    ltd: number
    nonLtd: number
    vat: number
  }
  teamMembers: Array<{
    id: string
    name: string
    role: string
    clientCount: number
    vatClients: number
    accountsClients: number
  }>
  monthlyDeadlines: {
    accounts: number
    vat: number
    cs: number
    ct: number
  }
  upcomingDeadlines: Array<{
    id: string
    companyName: string
    type: string
    date: string
    daysUntil: number
  }>
  monthName: string
}

interface DashboardWidget {
  id: string
  title: string
  component: React.ReactNode
  row: number
  col: number
}

export function ManagerDashboard({ userId }: ManagerDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/manager/${userId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        console.error('Failed to fetch dashboard data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  // Initialize widgets when data is loaded
  useEffect(() => {
    if (data && widgets.length === 0) { // Only initialize if widgets array is empty
      const defaultWidgets: DashboardWidget[] = [
        // Row 1
        {
          id: 'client-overview',
          title: 'Client Overview',
          component: <ClientOverviewWidget data={data} />,
          row: 1,
          col: 1
        },
        {
          id: 'monthly-deadlines',
          title: `${data.monthName} Deadlines`,
          component: <MonthlyDeadlinesWidget data={data} />,
          row: 1,
          col: 2
        },
        {
          id: 'unassigned-clients',
          title: 'Unassigned Clients',
          component: <UnassignedClientsWidget data={data} onNavigate={handleUnassignedNavigation} />,
          row: 1,
          col: 3
        },
        // Row 2
        {
          id: 'vat-unassigned',
          title: 'VAT Unassigned',
          component: <VATUnassignedWidget compact={true} />,
          row: 2,
          col: 1
        },
        {
          id: 'pending-to-chase',
          title: 'Pending to Chase',
          component: <PendingToChaseWidget userRole="MANAGER" userId={userId} />,
          row: 2,
          col: 2
        },
        {
          id: 'upcoming-deadlines',
          title: 'Upcoming Deadlines',
          component: <UpcomingDeadlinesWidget data={data} />,
          row: 2,
          col: 3
        },
        // Row 3
        {
          id: 'team-workload',
          title: 'Team Workload',
          component: <TeamWorkloadWidget data={data} />,
          row: 3,
          col: 1
        }
      ]

      // Load saved layout from localStorage or use default
      const savedLayout = localStorage.getItem('manager-dashboard-layout')
      if (savedLayout) {
        try {
          const parsedLayout = JSON.parse(savedLayout)
          setWidgets(parsedLayout.map((item: any) => ({
            ...item,
            component: defaultWidgets.find(w => w.id === item.id)?.component
          })))
        } catch {
          setWidgets(defaultWidgets)
        }
      } else {
        setWidgets(defaultWidgets)
      }
    }
  }, [data, userId])

  // Update widget components when data changes (without resetting layout)
  useEffect(() => {
    if (data && widgets.length > 0) {
      const updatedWidgets = widgets.map(widget => ({
        ...widget,
        component: getWidgetComponent(widget.id, data)
      }))
      setWidgets(updatedWidgets)
    }
  }, [data])

  const getWidgetComponent = (widgetId: string, data: DashboardData) => {
    switch (widgetId) {
      case 'client-overview':
        return <ClientOverviewWidget data={data} />
      case 'monthly-deadlines':
        return <MonthlyDeadlinesWidget data={data} />
      case 'unassigned-clients':
        return <UnassignedClientsWidget data={data} onNavigate={handleUnassignedNavigation} />
      case 'vat-unassigned':
        return <VATUnassignedWidget compact={true} />
      case 'pending-to-chase':
        return <PendingToChaseWidget userRole="MANAGER" userId={userId} />
      case 'upcoming-deadlines':
        return <UpcomingDeadlinesWidget data={data} />
      case 'team-workload':
        return <TeamWorkloadWidget data={data} />
      default:
        return null
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(widgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    
    if (!reorderedItem) return
    
    items.splice(result.destination.index, 0, reorderedItem)

    setWidgets(items)
    
    // Save layout to localStorage
    const layoutToSave = items.map(({ component, ...rest }) => rest)
    localStorage.setItem('manager-dashboard-layout', JSON.stringify(layoutToSave))
  }

  // Enhanced navigation handlers for unassigned clients
  const handleUnassignedNavigation = (type: 'ltd' | 'nonLtd' | 'vat') => {
    switch (type) {
      case 'ltd':
        window.location.href = '/dashboard/clients/ltd-companies?filter=unassigned'
        break
      case 'nonLtd':
        window.location.href = '/dashboard/clients/non-ltd-companies?filter=unassigned'
        break
      case 'vat':
        window.location.href = '/dashboard/clients/vat-dt?filter=unassigned&tab=all'
        break
    }
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

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of team performance, client assignments, and deadlines
            </p>
          </div>
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted h-32" />
              ))}
            </div>
            <div className="rounded-lg bg-muted h-48" />
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!data || !data.clientCounts || !data.unassignedClients || !data.teamMembers || !data.monthlyDeadlines) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of team performance, client assignments, and deadlines
            </p>
          </div>
          <div className="text-center text-muted-foreground">
            {data ? 'Invalid dashboard data structure' : 'Failed to load dashboard data'}
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
          <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag widgets to rearrange • Overview of team performance, client assignments, and deadlines
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
                      className={`grid gap-6 ${
                        rowNumber === 3 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
                      }`}
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
                                {getWidgetComponent(widget.id, data)}
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

// Widget Components (same as partner dashboard)
function ClientOverviewWidget({ data }: { data: DashboardData }) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Client Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-700">{data.clientCounts.total}</span>
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">Total Clients</p>
          </div>
          
          <div className="p-3 rounded-lg bg-green-50">
            <div className="flex items-center justify-between">
              <Building2 className="h-4 w-4 text-green-600" />
              <span className="text-lg font-bold text-green-700">{data.clientCounts.ltd}</span>
            </div>
            <p className="text-xs text-green-600 font-medium mt-1">Ltd Companies</p>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-50">
            <div className="flex items-center justify-between">
              <Building className="h-4 w-4 text-orange-600" />
              <span className="text-lg font-bold text-orange-700">{data.clientCounts.nonLtd}</span>
            </div>
            <p className="text-xs text-orange-600 font-medium mt-1">Non-Limited</p>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-50">
            <div className="flex items-center justify-between">
              <Receipt className="h-4 w-4 text-purple-600" />
              <span className="text-lg font-bold text-purple-700">{data.clientCounts.vat}</span>
            </div>
            <p className="text-xs text-purple-600 font-medium mt-1">VAT Enabled</p>
          </div>
        </div>
      </CardContent>
    </>
  )
}

function MonthlyDeadlinesWidget({ data }: { data: DashboardData }) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {data.monthName} Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Accounts</span>
            </div>
            <div className="text-xl font-bold text-blue-700">{data.monthlyDeadlines.accounts}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-green-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Receipt className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">VAT</span>
            </div>
            <div className="text-xl font-bold text-green-700">{data.monthlyDeadlines.vat}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-orange-600" />
              <span className="text-xs font-medium text-orange-600">Confirmations</span>
            </div>
            <div className="text-xl font-bold text-orange-700">{data.monthlyDeadlines.cs}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calculator className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">Corporation Tax</span>
            </div>
            <div className="text-xl font-bold text-purple-700">{data.monthlyDeadlines.ct}</div>
          </div>
        </div>
      </CardContent>
    </>
  )
}

function UnassignedClientsWidget({ 
  data, 
  onNavigate 
}: { 
  data: DashboardData
  onNavigate: (type: 'ltd' | 'nonLtd' | 'vat') => void 
}) {
  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Unassigned Clients
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
            {data.unassignedClients.ltd + data.unassignedClients.nonLtd + data.unassignedClients.vat} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div 
            className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
              data.unassignedClients.ltd > 0 
                ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                : 'opacity-60'
            }`}
            onClick={() => data.unassignedClients.ltd > 0 && onNavigate('ltd')}
          >
            <span className="text-sm text-amber-800">Ltd Accounts</span>
            <span className="font-bold text-amber-900">{data.unassignedClients.ltd}</span>
          </div>
          
          <div 
            className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
              data.unassignedClients.nonLtd > 0 
                ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                : 'opacity-60'
            }`}
            onClick={() => data.unassignedClients.nonLtd > 0 && onNavigate('nonLtd')}
          >
            <span className="text-sm text-amber-800">Non-Ltd Accounts</span>
            <span className="font-bold text-amber-900">{data.unassignedClients.nonLtd}</span>
          </div>
          
          <div 
            className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
              data.unassignedClients.vat > 0 
                ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                : 'opacity-60'
            }`}
            onClick={() => data.unassignedClients.vat > 0 && onNavigate('vat')}
          >
            <span className="text-sm text-amber-800">VAT Returns</span>
            <span className="font-bold text-amber-900">{data.unassignedClients.vat}</span>
          </div>
        </div>
        
        {(data.unassignedClients.ltd > 0 || data.unassignedClients.nonLtd > 0 || data.unassignedClients.vat > 0) && (
          <div className="pt-2 border-t border-amber-200">
            <p className="text-xs text-amber-700 text-center">
              Click on any section above to assign clients
            </p>
          </div>
        )}
      </CardContent>
    </>
  )
}

function UpcomingDeadlinesWidget({ data }: { data: DashboardData }) {
  if (!data.upcomingDeadlines || data.upcomingDeadlines.length === 0) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming deadlines</p>
          </div>
        </CardContent>
      </>
    )
  }

  const getDeadlineTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'accounts': return <FileText className="h-3 w-3 text-blue-600" />
      case 'vat': return <Receipt className="h-3 w-3 text-green-600" />
      case 'confirmation': return <CheckCircle className="h-3 w-3 text-orange-600" />
      case 'corporation tax': return <Calculator className="h-3 w-3 text-purple-600" />
      default: return <Calendar className="h-3 w-3 text-gray-600" />
    }
  }

  const getDeadlineTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'accounts': return 'text-blue-600'
      case 'vat': return 'text-green-600'
      case 'confirmation': return 'text-orange-600'
      case 'corporation tax': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.upcomingDeadlines.slice(0, 10).map((deadline) => (
            <div key={deadline.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getDeadlineTypeIcon(deadline.type)}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{deadline.companyName}</div>
                  <div className={`text-xs ${getDeadlineTypeColor(deadline.type)}`}>
                    {deadline.type}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-sm font-medium">
                  {new Date(deadline.date).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short' 
                  })}
                </div>
                <div className={`text-xs ${
                  deadline.daysUntil <= 7 ? 'text-red-600 font-medium' : 
                  deadline.daysUntil <= 14 ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  {deadline.daysUntil === 0 ? 'Today' : 
                   deadline.daysUntil === 1 ? '1 day' : 
                   `${deadline.daysUntil} days`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  )
}

function TeamWorkloadWidget({ data }: { data: DashboardData }) {
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return <Crown className="h-3 w-3 text-purple-600" />
      case 'manager': return <Shield className="h-3 w-3 text-blue-600" />
      default: return <User className="h-3 w-3 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return 'default'
      case 'manager': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.teamMembers.map((member) => {
            const totalClients = member.vatClients + member.accountsClients
            const hasWork = totalClients > 0
            
            return (
              <div key={member.id} className={`p-2 rounded-lg border transition-all duration-200 ${
                hasWork ? 'bg-slate-50 border-slate-200' : 'bg-gray-50 border-gray-200 opacity-70'
              }`}>
                {/* Member Header - More Compact */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getRoleIcon(member.role)}
                    <span className="text-sm font-medium truncate">{member.name}</span>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs px-1 py-0">
                      {member.role.charAt(0)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {member.vatClients > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 border border-blue-200">
                        <Receipt className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-bold text-blue-800">{member.vatClients}</span>
                      </div>
                    )}
                    {member.accountsClients > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 border border-green-200">
                        <FileText className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-bold text-green-800">{member.accountsClients}</span>
                      </div>
                    )}
                    {!hasWork && (
                      <span className="text-xs text-gray-500 px-2">No assignments</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {data.teamMembers.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-sm">No team members found</p>
            </div>
          )}
        </div>
      </CardContent>
    </>
  )
} 