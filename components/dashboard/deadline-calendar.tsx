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
  Download
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
  type: 'accounts' | 'confirmation'
  assignedUser?: {
    id: string
    name: string
  }
  isOverdue: boolean
  daysUntilDue: number
}

interface DeadlineCalendarProps {
  deadlines: DeadlineItem[]
  users: Array<{
    id: string
    name: string
  }>
}

type ViewType = 'month' | 'week' | 'list'

export function DeadlineCalendar({ deadlines, users }: DeadlineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('month')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Filter deadlines based on selected filters
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(deadline => {
      if (selectedUser !== 'all' && deadline.assignedUser?.id !== selectedUser) {
        return false
      }
      if (selectedType !== 'all' && deadline.type !== selectedType) {
        return false
      }
      return true
    })
  }, [deadlines, selectedUser, selectedType])

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
    if (deadline.isOverdue) return 'bg-red-100 text-red-800 border-red-200'
    if (deadline.daysUntilDue <= 7) return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getTypeIcon = (type: string) => {
    return type === 'accounts' ? FileText : CheckCircle
  }

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
          className={`bg-white p-2 min-h-[120px] ${
            !day.isCurrentMonth ? 'opacity-50' : ''
          } ${day.isToday ? 'bg-blue-50' : ''}`}
        >
          <div className={`text-sm font-medium mb-1 ${
            day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {day.date.getDate()}
          </div>
          
          <div className="space-y-1">
            {day.deadlines.slice(0, 3).map(deadline => {
              const Icon = getTypeIcon(deadline.type)
              return (
                <TooltipProvider key={deadline.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`text-xs p-1 rounded border cursor-pointer ${getDeadlineColor(deadline)}`}>
                        <div className="flex items-center gap-1">
                          <Icon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{deadline.clientName}</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{deadline.clientName}</p>
                        <p className="text-xs">
                          {deadline.type === 'accounts' ? 'Annual Accounts' : 'Confirmation Statement'}
                        </p>
                        <p className="text-xs">Due: {formatDate(deadline.dueDate)}</p>
                        {deadline.assignedUser && (
                          <p className="text-xs">Assigned: {deadline.assignedUser.name}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
            {day.deadlines.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
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
          
          <div className="space-y-2 min-h-[400px]">
            {day.deadlines.map(deadline => {
              const Icon = getTypeIcon(deadline.type)
              return (
                <Card key={deadline.id} className={`p-3 border ${getDeadlineColor(deadline)}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{deadline.clientName}</span>
                    </div>
                    <div className="text-xs opacity-80">
                      {deadline.type === 'accounts' ? 'Annual Accounts' : 'Confirmation Statement'}
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
                            {deadline.type === 'accounts' ? 'Annual Accounts' : 'Confirmation Statement'}
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
                          {deadline.isOverdue ? 'Overdue' : 
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Deadline Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Track client account deadlines and confirmation statements
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
          {/* Filters */}
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

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="accounts">Accounts</SelectItem>
              <SelectItem value="confirmation">Confirmations</SelectItem>
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
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {filteredDeadlines.filter(d => d.isOverdue).length}
                </div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {filteredDeadlines.filter(d => !d.isOverdue && d.daysUntilDue <= 7).length}
                </div>
                <div className="text-sm text-gray-600">Due Soon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredDeadlines.length}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardContent className="p-6">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'list' && renderListView()}
        </CardContent>
      </Card>
    </div>
  )
} 