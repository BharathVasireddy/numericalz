'use client'

import React from 'react'
import { Building, Calendar, Clock, RefreshCw, FileText, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface RefreshProgress {
  isActive: boolean
  processed: number
  total: number
  progress: number
  estimatedTimeRemaining?: number
  mode?: 'normal' | 'fast'
}

interface LtdCompaniesHeaderProps {
  currentMonthName: string
  currentMonthClients: LtdClient[]
  next30DaysClients: LtdClient[]
  next60DaysClients: LtdClient[]
  next90DaysClients: LtdClient[]
  totalClients: number
  completedCount: number
  unassignedCount: number
  ctDueThisMonth: number  // Add CT due count prop
  csDueThisMonth: number  // Add CS due count prop
  refreshableClientsCount?: number  // Add count of clients that can be refreshed
  onBulkRefreshCompaniesHouse?: () => void  // Now points to fast refresh
  refreshProgress?: RefreshProgress  // New progress state
  children?: React.ReactNode
}

export function LtdCompaniesHeader({ 
  currentMonthName,
  currentMonthClients,
  next30DaysClients,
  next60DaysClients,
  next90DaysClients,
  totalClients,
  completedCount,
  unassignedCount,
  ctDueThisMonth,  // Use props instead of calculating
  csDueThisMonth,  // Use props instead of calculating
  refreshableClientsCount = 0,  // Add default value
  onBulkRefreshCompaniesHouse,
  refreshProgress = { isActive: false, processed: 0, total: 0, progress: 0 },  // New progress prop
  children
}: LtdCompaniesHeaderProps) {
  
  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    }
  }

  // Get button text based on refresh state
  const getRefreshButtonText = () => {
    if (!refreshProgress.isActive) {
      return `Refresh CH ⚡ (${refreshableClientsCount})`
    }

    const processed = refreshProgress.processed
    const total = refreshProgress.total
    const progress = refreshProgress.progress

    if (total === 0) {
      return `⚡ Starting...`
    }

    const progressText = `⚡ ${processed}/${total} (${progress}%)`
    
    if (refreshProgress.estimatedTimeRemaining && refreshProgress.estimatedTimeRemaining > 0) {
      const eta = formatTimeRemaining(refreshProgress.estimatedTimeRemaining)
      return `${progressText} - ${eta}`
    }

    return progressText
  }
  
  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 py-2 sm:py-4 lg:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        
        {/* Title and Refresh Button - More Compact Mobile Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
            <Building className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-700 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Limited Companies</h1>
            <div className="bg-blue-100 text-blue-800 px-1.5 py-0.5 sm:px-2 sm:py-1 lg:px-3 lg:py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0">
              {currentMonthName}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {onBulkRefreshCompaniesHouse && (
              <>
                {/* Fast Refresh Button - Enhanced Mobile Support */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={onBulkRefreshCompaniesHouse}
                  disabled={refreshProgress.isActive}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 min-w-[120px] sm:min-w-[140px] lg:min-w-[160px] text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9"
                  title={refreshProgress.isActive ? `Refreshing ${refreshProgress.processed}/${refreshProgress.total} clients` : `High-performance refresh for ${refreshableClientsCount} clients - 3-5x faster than standard refresh`}
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${refreshProgress.isActive ? 'animate-spin' : ''}`} />
                  <span className="truncate text-xs sm:text-sm">{getRefreshButtonText()}</span>
                </Button>
              </>
            )}
            {children}
          </div>
        </div>

        {/* Compact Mobile-Optimized Stats Grid - Mobile: 2 cols, SM: 3 cols, LG: 5 cols */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {/* Next 30 Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 lg:p-4 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 mb-1 sm:mb-1.5 lg:mb-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-blue-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">
                <span className="block sm:hidden">30 Days</span>
                <span className="hidden sm:block">Next 30 Days</span>
              </span>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{next30DaysClients.length}</div>
          </div>

          {/* Next 60 Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 lg:p-4 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 mb-1 sm:mb-1.5 lg:mb-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-amber-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">
                <span className="block sm:hidden">60 Days</span>
                <span className="hidden sm:block">Next 60 Days</span>
              </span>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{next60DaysClients.length}</div>
          </div>

          {/* Next 90 Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 lg:p-4 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 mb-1 sm:mb-1.5 lg:mb-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-orange-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">
                <span className="block sm:hidden">90 Days</span>
                <span className="hidden sm:block">Next 90 Days</span>
              </span>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{next90DaysClients.length}</div>
          </div>

          {/* CT Due This Month - Spans 2 cols on mobile when 5 items don't fit evenly */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-2 sm:p-3 lg:p-4 text-center col-span-1">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 mb-1 sm:mb-1.5 lg:mb-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-green-800 text-center leading-tight">
                <span className="block">CT Due</span>
                <span className="block text-xs">({currentMonthName})</span>
              </span>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900">{ctDueThisMonth}</div>
          </div>

          {/* CS Due This Month */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-2 sm:p-3 lg:p-4 text-center col-span-1">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 mb-1 sm:mb-1.5 lg:mb-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-purple-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-purple-800 text-center leading-tight">
                <span className="block">CS Due</span>
                <span className="block text-xs">({currentMonthName})</span>
              </span>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900">{csDueThisMonth}</div>
          </div>
        </div>

      </div>
    </div>
  )
} 