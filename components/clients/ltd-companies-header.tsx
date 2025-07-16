'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, CheckCircle2, FileText, Building, Clock } from 'lucide-react'

interface LtdAccountsWorkflow {
  id: string
  filingPeriodStart: string
  filingPeriodEnd: string
  accountsDueDate: string
  ctDueDate: string
  csDueDate: string
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
  managerDiscussionDate?: string
  managerDiscussionByUserName?: string
  partnerReviewDate?: string
  partnerReviewByUserName?: string
  reviewCompletedDate?: string
  reviewCompletedByUserName?: string
  sentToClientDate?: string
  sentToClientByUserName?: string
  clientApprovedDate?: string
  clientApprovedByUserName?: string
  partnerApprovedDate?: string
  partnerApprovedByUserName?: string
  filedDate?: string
  filedByUserName?: string
  filedToCompaniesHouseDate?: string
  filedToCompaniesHouseByUserName?: string
  filedToHMRCDate?: string
  filedToHMRCByUserName?: string
}

interface LtdClient {
  id: string
  clientCode: string
  companyNumber?: string
  companyName: string
  companyType?: string
  contactEmail?: string
  incorporationDate?: string
  accountingReferenceDate?: string
  nextYearEnd?: string  // Companies House official year end date
  nextAccountsDue?: string
  lastAccountsMadeUpTo?: string
  nextCorporationTaxDue?: string
  nextConfirmationDue?: string
  
  // Ltd-specific assignee
  ltdCompanyAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
  // Current Ltd workflow info
  currentLtdAccountsWorkflow?: LtdAccountsWorkflow | null
}

interface LtdCompaniesHeaderProps {
  currentMonthName: string
  currentMonthClients: LtdClient[]
  next30DaysClients: LtdClient[]
  next60DaysClients: LtdClient[]
  totalClients: number
  completedCount: number
  unassignedCount: number
  children?: React.ReactNode
}

export function LtdCompaniesHeader({ 
  currentMonthName,
  currentMonthClients,
  next30DaysClients,
  next60DaysClients,
  totalClients,
  completedCount,
  unassignedCount,
  children
}: LtdCompaniesHeaderProps) {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const currentDay = new Date().getDate()
  const daysRemaining = daysInMonth - currentDay
  
  const urgencyColor = daysRemaining <= 10 ? 'text-red-600' : daysRemaining <= 20 ? 'text-orange-600' : 'text-green-600'
  
  const overdueCount = next30DaysClients.filter(client => {
    const workflow = client.currentLtdAccountsWorkflow
    if (!workflow) return false
    return new Date(workflow.accountsDueDate) < new Date()
  }).length
  
  const completionPercentage = totalClients > 0 ? Math.round((completedCount / totalClients) * 100) : 0

  return (
    <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,51,234,0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(79,70,229,0.08),transparent_70%)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - Title and current month */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ltd Companies</h1>
                <p className="text-sm text-gray-600">Filing management dashboard</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="bg-white/60 border-purple-200">
                <FileText className="h-3 w-3 mr-1" />
                Companies House
              </Badge>
              <Badge variant="outline" className="bg-white/60 border-indigo-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                Workflow Tracking
              </Badge>
            </div>
          </div>
          
          {/* Right side - Current month and stats */}
          <div className="flex items-center gap-6">
            {/* Current month display */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{currentMonthName}</div>
              <div className="text-sm text-gray-600">
                <span className={`font-medium ${urgencyColor}`}>
                  {daysRemaining} days remaining
                </span>
              </div>
            </div>
            
            {/* Quick stats */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{totalClients}</span>
                <span className="text-gray-600">total</span>
              </div>
              
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium">{completedCount}</span>
                <span className="text-gray-600">completed</span>
              </div>
              
              {overdueCount > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-600">{overdueCount}</span>
                  <span className="text-gray-600">overdue</span>
                </div>
              )}
              
              {unassignedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-600">{unassignedCount}</span>
                  <span className="text-gray-600">unassigned</span>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {children}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 bg-white/60 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {/* Additional stats for mobile */}
        <div className="lg:hidden mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{totalClients}</span>
            <span className="text-gray-600">total</span>
          </div>
          
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium">{completedCount}</span>
            <span className="text-gray-600">completed</span>
          </div>
          
          {overdueCount > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-600">{overdueCount}</span>
              <span className="text-gray-600">overdue</span>
            </div>
          )}
          
          {unassignedCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-orange-600">{unassignedCount}</span>
              <span className="text-gray-600">unassigned</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 