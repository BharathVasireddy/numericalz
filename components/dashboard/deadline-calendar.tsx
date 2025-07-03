'use client'

import { useState, useMemo } from 'react'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Grid3X3, 
  Clock,
  FileText,
  CheckCircle,
  Building2,
  User,
  Filter,
  Download,
  Receipt,
  Calculator
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DeadlineItem {
  id: string
  clientId: string
  clientName: string
  companyNumber?: string
  dueDate: Date
  type: 'accounts' | 'confirmation' | 'corporation-tax' | 'vat'
  assignedUser?: {
    id: string
    name: string
  }
  isOverdue: boolean
  daysUntilDue: number
  isCompleted: boolean
  completedDate?: Date
}

interface DeadlineCalendarProps {
  deadlines: DeadlineItem[]
  users: Array<{
    id: string
    name: string
  }>
  userRole: string
  currentUserId: string
  currentUserName: string
}

type ViewType = 'month' | 'week' | 'list'
type ScopeType = 'my' | 'company'
type StatusFilterType = 'all' | 'due'

export function DeadlineCalendar({ deadlines, users, userRole, currentUserId, currentUserName }: DeadlineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('month')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [scope, setScope] = useState<ScopeType>('my')
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('due')

  const isManager = userRole === 'MANAGER'
  const isPartner = userRole === 'PARTNER'
  const canFilterByUser = true

  // Filter deadlines based on selected filters
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(deadline => {
      // Apply scope filter first
      if (scope === 'my') {
        // Show only deadlines assigned to current user
        if (deadline.assignedUser?.id !== currentUserId) {
          return false
        }
      }
      // For 'company' scope, show all deadlines (no additional filtering needed)
      
      // Apply user filter (now available to all users in company scope)
      if (scope === 'company' && canFilterByUser && selectedUser !== 'all') {
        if (deadline.assignedUser?.id !== selectedUser) {
          return false
        }
      }
      
      // Apply type filter
      if (selectedType !== 'all' && deadline.type !== selectedType) {
        return false
      }

      // Apply status filter
      if (statusFilter === 'due' && deadline.isCompleted) {
        return false
      }
      
      return true
    })
  }, [deadlines, selectedUser, selectedType, scope, currentUserId, canFilterByUser, statusFilter])

  // Generate calendar days for month view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      const dayDeadlines = filteredDeadlines.filter(deadline => 
        deadline.dueDate.toDateString() === current.toDateString()
      )
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        deadlines: dayDeadlines
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentDate, filteredDeadlines])

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      
      const dayDeadlines = filteredDeadlines.filter(deadline => 
        deadline.dueDate.toDateString() === day.toDateString()
      )
      
      days.push({
        date: day,
        isToday: day.toDateString() === new Date().toDateString(),
        deadlines: dayDeadlines
      })
    }
    
    return days
  }, [currentDate, filteredDeadlines])

  // Sort deadlines for list view
  const sortedDeadlines = useMemo(() => {
    return [...filteredDeadlines].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  }, [filteredDeadlines])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7))
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleExport = () => {
    const url = '/api/calendar/export?format=csv'
    const link = document.createElement('a')
    link.href = url
    link.download = `deadlines-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getDeadlineColor = (deadline: DeadlineItem) => {
    // If completed, use muted gray colors
    if (deadline.isCompleted) {
      return 'bg-gray-100 text-gray-600 border-gray-200 opacity-75'
    }

    // Base colors by category
    const categoryColors = {
      'accounts': {
        normal: 'bg-blue-100 text-blue-800 border-blue-200',
        urgent: 'bg-blue-200 text-blue-900 border-blue-300',
        overdue: 'bg-red-100 text-red-800 border-red-200'
      },
      'confirmation': {
        normal: 'bg-green-100 text-green-800 border-green-200',
        urgent: 'bg-green-200 text-green-900 border-green-300',
        overdue: 'bg-red-100 text-red-800 border-red-200'
      },
      'corporation-tax': {
        normal: 'bg-purple-100 text-purple-800 border-purple-200',
        urgent: 'bg-purple-200 text-purple-900 border-purple-300',
        overdue: 'bg-red-100 text-red-800 border-red-200'
      },
      'vat': {
        normal: 'bg-orange-100 text-orange-800 border-orange-200',
        urgent: 'bg-orange-200 text-orange-900 border-orange-300',
        overdue: 'bg-red-100 text-red-800 border-red-200'
      }
    }

    const colors = categoryColors[deadline.type] || categoryColors['accounts']
    
    if (deadline.isOverdue) return colors.overdue
    if (deadline.daysUntilDue <= 7) return colors.urgent
    return colors.normal
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'accounts':
        return FileText
      case 'confirmation':
        return CheckCircle
      case 'corporation-tax':
        return Receipt
      case 'vat':
        return Calculator
      default:
        return FileText
    }
  }

  // Calculate stats for the current view
  const stats = useMemo(() => {
    const total = filteredDeadlines.length
    const overdue = filteredDeadlines.filter(d => d.isOverdue).length
    const dueSoon = filteredDeadlines.filter(d => !d.isOverdue && d.daysUntilDue <= 7).length
    const upcoming = total - overdue - dueSoon

    return { total, overdue, dueSoon, upcoming }
  }, [filteredDeadlines])

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
          {day}
        </div>
      ))}
      
      {/* Days */}
      {monthDays.map((day, index) => (
        <div
          key={index}
          className={`bg-white p-1 min-h-[80px] ${
            !day.isCurrentMonth ? 'opacity-50' : ''
          } ${day.isToday ? 'bg-blue-50' : ''}`}
        >
          <div className="text-sm font-medium mb-1">
            {day.date.getDate()}
          </div>
          <div className="space-y-1">
            {day.deadlines.slice(0, 3).map(deadline => {
              const Icon = getTypeIcon(deadline.type)
              return (
                <TooltipProvider key={deadline.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`text-xs px-1 py-0.5 rounded border ${getDeadlineColor(deadline)} cursor-pointer`}
                      >
                        <div className="flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          <span className="truncate">{deadline.clientName}</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <div className="font-medium">{deadline.clientName}</div>
                        <div className="text-muted-foreground">
                          {deadline.type === 'accounts' ? 'Annual Accounts' : 
                           deadline.type === 'confirmation' ? 'Confirmation Statement' :
                           deadline.type === 'corporation-tax' ? 'Corporation Tax' :
                           deadline.type === 'vat' ? 'VAT Return' : deadline.type}
                        </div>
                        <div className="text-muted-foreground">
                          Due: {formatDate(deadline.dueDate)}
                        </div>
                        {deadline.assignedUser && (
                          <div className="text-muted-foreground">
                            Assigned: {deadline.assignedUser.name}
                          </div>
                        )}
                        {deadline.isCompleted ? (
                          <div className="text-green-600 font-medium">
                            ✓ Completed{deadline.completedDate && ` on ${deadline.completedDate.toLocaleDateString('en-GB')}`}
                          </div>
                        ) : deadline.isOverdue ? (
                          <div className="text-red-600 font-medium">
                            Overdue by {deadline.daysUntilDue} days
                          </div>
                        ) : null}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
            {day.deadlines.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{day.deadlines.length - 3} more
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-4">
      {weekDays.map((day, index) => (
        <div key={index} className="space-y-2">
          <div className={`text-center p-2 rounded ${
            day.isToday ? 'bg-blue-100 text-blue-800' : 'bg-gray-50'
          }`}>
            <div className="text-xs font-medium">
              {day.date.toLocaleDateString('en-GB', { weekday: 'short' })}
            </div>
            <div className={`text-lg font-bold ${
              day.isToday ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {day.date.getDate()}
            </div>
          </div>
          
          <div className="space-y-1 min-h-[300px]">
            {day.deadlines.map(deadline => {
              const Icon = getTypeIcon(deadline.type)
              return (
                <Card key={deadline.id} className={`p-2 border ${getDeadlineColor(deadline)}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{deadline.clientName}</span>
                    </div>
                    <div className="text-xs opacity-80">
                      {deadline.type === 'accounts' ? 'Annual Accounts' : 
                       deadline.type === 'confirmation' ? 'Confirmation Statement' :
                       deadline.type === 'corporation-tax' ? 'Corporation Tax' :
                       deadline.type === 'vat' ? 'VAT Return' : deadline.type}
                    </div>
                    {deadline.assignedUser && (
                      <div className="flex items-center gap-1 text-xs opacity-80">
                        <User className="h-3 w-3" />
                        {deadline.assignedUser.name}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  const renderListView = () => (
    <div className="space-y-4">
      {/* Group by date */}
      {Array.from(new Set(sortedDeadlines.map(d => d.dueDate.toDateString()))).map(dateString => {
        const date = new Date(dateString)
        const dayDeadlines = sortedDeadlines.filter(d => d.dueDate.toDateString() === dateString)
        
        return (
          <div key={dateString} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-1">
              <CalendarIcon className="h-4 w-4" />
              {date.toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              <Badge variant="outline" className="ml-auto">
                {dayDeadlines.length} deadline{dayDeadlines.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="grid gap-2">
              {dayDeadlines.map(deadline => {
                const Icon = getTypeIcon(deadline.type)
                return (
                  <Card key={deadline.id} className={`p-4 border ${getDeadlineColor(deadline)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium">{deadline.clientName}</div>
                          <div className="text-sm opacity-80">
                            {deadline.type === 'accounts' ? 'Annual Accounts' : 
                             deadline.type === 'confirmation' ? 'Confirmation Statement' :
                             deadline.type === 'corporation-tax' ? 'Corporation Tax' :
                             deadline.type === 'vat' ? 'VAT Return' : deadline.type}
                            {deadline.companyNumber && ` • ${deadline.companyNumber}`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {deadline.assignedUser && (
                          <div className="flex items-center gap-1 text-sm mb-1">
                            <User className="h-3 w-3" />
                            {deadline.assignedUser.name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {deadline.isCompleted ? (
                            <span className="text-green-600">✓ Completed</span>
                          ) : deadline.isOverdue ? 'Overdue' : 
                           deadline.daysUntilDue === 0 ? 'Due today' :
                           `${deadline.daysUntilDue} days left`}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
      
      {sortedDeadlines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No deadlines found with current filters</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {scope === 'my' ? 'My Deadline Calendar' : 'Company Deadline Tracker'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {scope === 'my' 
              ? `Your assigned client deadlines (${currentUserName})` 
              : 'Track all company client deadlines: accounts, confirmations, corporation tax, and VAT returns'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => view === 'week' ? navigateWeek('prev') : navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-lg font-semibold min-w-[200px] text-center">
            {view === 'week' ? (
              `Week of ${currentDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`
            ) : view === 'month' ? (
              currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            ) : (
              'All Deadlines'
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => view === 'week' ? navigateWeek('next') : navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Toggle & Filters */}
        <div className="flex items-center gap-2">
          {/* Scope Toggle Buttons */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={scope === 'my' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScope('my')}
              className="h-8"
            >
              <User className="h-4 w-4 mr-1" />
              My Deadlines
            </Button>
            <Button
              variant={scope === 'company' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScope('company')}
              className="h-8"
            >
              <Building2 className="h-4 w-4 mr-1" />
              Company Tracker
            </Button>
          </div>

          {/* Filters - Show user filter for managers and partners in company scope */}
          {scope === 'company' && canFilterByUser && (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Type Filter - Always available */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="accounts">Accounts</SelectItem>
              <SelectItem value="confirmation">Confirmations</SelectItem>
              <SelectItem value="corporation-tax">Corporation Tax</SelectItem>
              <SelectItem value="vat">VAT Returns</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter - Always available */}
          <Select value={statusFilter} onValueChange={(value: StatusFilterType) => setStatusFilter(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deadlines</SelectItem>
              <SelectItem value="due">Due Only</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="h-8"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="h-8"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="h-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {stats.dueSoon}
                </div>
                <div className="text-sm text-gray-600">Due Soon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardContent className="p-4">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'list' && renderListView()}
        </CardContent>
      </Card>
    </div>
  )
} 