'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, CheckCircle2 } from 'lucide-react'
import { WorkflowStageDistribution } from './workflow-stage-distribution'

interface VATQuarter {
  id: string
  quarterPeriod: string
  quarterStartDate: string
  quarterEndDate: string
  filingDueDate: string
  currentStage: string
  isCompleted: boolean
  assignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  // Milestone dates with user attribution
  chaseStartedDate?: string
  chaseStartedByUserName?: string
  paperworkReceivedDate?: string
  paperworkReceivedByUserName?: string
  workStartedDate?: string
  workStartedByUserName?: string
  workFinishedDate?: string
  workFinishedByUserName?: string
  sentToClientDate?: string
  sentToClientByUserName?: string
  clientApprovedDate?: string
  clientApprovedByUserName?: string
  filedToHMRCDate?: string
  filedToHMRCByUserName?: string
}

interface VATClient {
  id: string
  clientCode: string
  companyName: string
  contactEmail?: string
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  createdAt: string // Client creation date to determine if old quarters are applicable
  
  // Current VAT quarter workflow info (for backward compatibility)
  currentVATQuarter?: VATQuarter
  
  // All VAT quarters for this client
  vatQuartersWorkflow?: VATQuarter[]
}

interface VATDeadlineHeaderProps {
  currentMonth: number
  currentMonthName: string
  currentMonthClients: VATClient[]
  getQuarterForMonth: (client: VATClient, monthNumber: number) => VATQuarter | null
}

export function VATDeadlineHeader({ 
  currentMonth, 
  currentMonthName, 
  currentMonthClients, 
  getQuarterForMonth 
}: VATDeadlineHeaderProps) {
  const currentYear = new Date().getFullYear()
  const currentDate = new Date()
  const currentDay = currentDate.getDate()
  
  // Calculate days remaining in current month
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate()
  const daysRemaining = lastDayOfMonth - currentDay + 1
  
  // Calculate completion stats
  const completedCount = currentMonthClients.filter(client => {
    const quarter = getQuarterForMonth(client, currentMonth)
    return quarter?.isCompleted || quarter?.currentStage === 'FILED_TO_HMRC'
  }).length
  
  const totalClients = currentMonthClients.length
  const completionRate = totalClients > 0 ? Math.round((completedCount / totalClients) * 100) : 0
  
  // Get urgency color
  const getUrgencyColor = () => {
    if (daysRemaining <= 5) return 'text-red-500'
    if (daysRemaining <= 10) return 'text-orange-500'
    return 'text-green-500'
  }

  return (
    <div className="relative bg-white border-b border-gray-100">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30" />
      
      <div className="relative px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left Side - Title and Current Month */}
            <div className="flex items-center gap-8">
              {/* Title */}
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  VAT Deadlines
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Filing management dashboard
                </p>
              </div>
              
              {/* Current Month Display */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {currentMonthName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentYear}
                  </div>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getUrgencyColor()}`}>
                    {daysRemaining}
                  </div>
                  <div className="text-xs text-gray-500">
                    days left
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Stats and Action */}
            <div className="flex items-center gap-6">
              {/* Quick Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{totalClients}</span> clients
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-green-600">{completedCount}</span> completed
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-purple-600">{completionRate}%</span> done
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <WorkflowStageDistribution 
                clients={currentMonthClients}
                monthNumber={currentMonth}
                monthName={currentMonthName}
                getQuarterForMonth={getQuarterForMonth}
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                Progress for {currentMonthName}
              </span>
              <span className="text-xs text-gray-500">
                {completedCount} of {totalClients} filed
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 