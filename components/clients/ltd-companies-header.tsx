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
  onBulkRefreshCompaniesHouse?: () => void
  refreshingCompaniesHouse?: boolean
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
  refreshingCompaniesHouse = false,
  children
}: LtdCompaniesHeaderProps) {
  
  // Remove the calculation logic since we now receive the counts as props
  
  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title and Refresh Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Building className="h-6 w-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Limited Companies</h1>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {currentMonthName}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {onBulkRefreshCompaniesHouse && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkRefreshCompaniesHouse}
                disabled={refreshingCompaniesHouse}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingCompaniesHouse ? 'animate-spin' : ''}`} />
                {refreshingCompaniesHouse ? 'Refreshing...' : `Refresh CH (${refreshableClientsCount})`}
              </Button>
            )}
            {children}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4">
          {/* Next 30 Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Next 30 Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{next30DaysClients.length}</div>
          </div>

          {/* Next 60 Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-gray-600">Next 60 Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{next60DaysClients.length}</div>
          </div>

          {/* Next 90 Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Next 90 Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{next90DaysClients.length}</div>
          </div>

          {/* CT Due This Month */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">CT Due ({currentMonthName})</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{ctDueThisMonth}</div>
          </div>

          {/* CS Due This Month */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">CS Due ({currentMonthName})</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{csDueThisMonth}</div>
          </div>
        </div>

      </div>
    </div>
  )
} 