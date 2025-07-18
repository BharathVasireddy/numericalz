'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'
import { CTFilingSummary } from './ct-filing-summary'
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  RefreshCw,
  FileText,
  Clock,
  User,
  TrendingUp
} from 'lucide-react'
import { VAT_WORKFLOW_STAGE_NAMES, formatQuarterPeriodForDisplay } from '@/lib/vat-workflow'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { CTStatusManager } from './ct-status-manager'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'

interface ClientDetailViewProps {
  client: any // Full client object with relations
  currentUser: any
}

// Enhanced type definitions for Companies House data
interface OfficerData {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
  };
}

interface PSCData {
  name?: string;
  kind: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
  };
}

/**
 * Client detail view component
 * 
 * Features:
 * - Complete client information display
 * - Companies House data visualization
 * - Contact and business information
 * - Statutory dates with status indicators
 * - Recent activity and communications
 * - Quick action buttons
 */
export function ClientDetailView({ client, currentUser }: ClientDetailViewProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch (e) {
      return 'Not set'
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'Not set'
    }
  }

  // Use direct Companies House year end date (no calculation needed)
  const formatYearEndDate = () => {
    if (client.nextYearEnd) {
      return new Date(client.nextYearEnd).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
    return 'Not set'
  }

  const isDateOverdue = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const isDateSoon = (dateString: string | null, daysThreshold: number = 30) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= daysThreshold && diffDays > 0
  }

  const getDaysUntilDue = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDaysUntilDue = (dateString: string | null) => {
    const days = getDaysUntilDue(dateString)
    if (days === null) return ''
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
    if (days === 0) return 'Due today'
    return `Due in ${days} day${days === 1 ? '' : 's'}`
  }



  const handleRefreshCompaniesHouse = async () => {
    if (!client.companyNumber) return
    
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/clients/${client.id}/refresh-companies-house`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        router.refresh()
        // Show success message
        showToast.success('Companies House data refreshed successfully')
      } else {
        const error = await response.json()
        showToast.error(error.error || 'Failed to refresh Companies House data')
      }
    } catch (error) {
      console.error('Error refreshing Companies House data:', error)
      showToast.error('Error refreshing Companies House data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const getDisplayEmail = (email: string) => {
    return email === 'contact@tobeupdated.com' || !email ? 'TBU' : email
  }

  const handleRefreshContactName = async () => {
    if (!client.companyNumber || client.companyType !== 'LIMITED_COMPANY') {
      showToast.error('Contact name refresh is only available for Limited Companies')
      return
    }
    
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/clients/${client.id}/refresh-contact-name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.changed) {
          router.refresh()
          showToast.success(`Contact name updated to: ${result.changes.newContactName}`)
        } else {
          showToast.info('Contact name already matches director name')
        }
      } else {
        const error = await response.json()
        showToast.error(error.error || 'Failed to refresh contact name')
      }
    } catch (error) {
      console.error('Error refreshing contact name:', error)
      showToast.error('Error refreshing contact name')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{client.companyName}</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Client Code: {client.clientCode || 'Not assigned'} • 
                  Company Number: {client.companyNumber || 'Not applicable'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/clients/${client.id}/filing-history`)}
                  className="btn-outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Filing History
                </Button>
                {client.companyNumber && (
                  <Button
                    variant="outline"
                    onClick={handleRefreshCompaniesHouse}
                    disabled={isRefreshing}
                    className="btn-outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh CH Data
                  </Button>
                )}
                {(currentUser.role === 'MANAGER' || currentUser.role === 'PARTNER') && (
                  <Button
                    onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                    className="btn-primary"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Client
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Status Overview */}
          <div className="grid gap-2 md:gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="hover-lift">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium">
                      {client.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Badge variant={client.isActive ? 'default' : 'secondary'}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <p className="text-sm font-medium">
                      {client.assignedUser?.name || 'Unassigned'}
                    </p>
                  </div>
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Company Type</p>
                    <p className="text-sm font-medium">
                      {client.companyType === 'LIMITED_COMPANY' ? 'Limited Company' :
                       client.companyType === 'NON_LIMITED_COMPANY' ? 'Non Limited Company' :
                       client.companyType === 'DIRECTOR' ? 'Director' :
                       client.companyType === 'SUB_CONTRACTOR' ? 'Sub Contractor' :
                       client.companyType}
                    </p>
                  </div>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Year End</p>
                    <p className="text-sm font-medium">
                      {formatYearEndDate()}
                    </p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid - Dynamic Layout */}
          <div className="two-col-adaptive">
            {/* Left Column */}
            <div className="card-stack">
              {/* Basic Information */}
              <Card className="shadow-professional">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Company Name:</span>
                      <span className="text-sm font-medium">{client.companyName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Client Code:</span>
                      <span className="text-sm font-mono">{client.clientCode || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Company Number:</span>
                      <span className="text-sm font-mono">{client.companyNumber || 'Not applicable'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Company Status:</span>
                      <span className="text-sm">{client.companyStatus || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Incorporated:</span>
                      <span className="text-sm">{client.incorporationDate ? formatDate(client.incorporationDate) : 'Not available'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact & Business Information Combined */}
              <Card className="shadow-professional">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact & Business Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    {/* Contact Information */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Contact Person:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{client.contactName || 'Not provided'}</span>
                        {client.companyType === 'LIMITED_COMPANY' && client.companyNumber && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshContactName}
                            disabled={isRefreshing}
                            className="h-6 w-6 p-0"
                            title="Refresh contact name from Companies House director data"
                          >
                            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium">{getDisplayEmail(client.contactEmail) || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Phone:</span>
                      <span className="text-sm font-medium">{client.contactPhone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Website:</span>
                      <span className="text-sm font-medium">{client.website || 'Not provided'}</span>
                    </div>
                    
                    {/* Separator */}
                    <div className="border-t my-3"></div>
                    
                    {/* Business Information */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">VAT Number:</span>
                      <span className="text-sm font-medium">{client.vatNumber || 'Not registered'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Year Established:</span>
                      <span className="text-sm font-medium">{client.yearEstablished || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Employees:</span>
                      <span className="text-sm font-medium">{client.numberOfEmployees || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Turnover:</span>
                      <span className="text-sm font-medium">
                        {client.annualTurnover ? `£${client.annualTurnover.toLocaleString()}` : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Paperwork Frequency:</span>
                      <span className="text-sm font-medium">
                        {client.paperworkFrequency === 'MONTHLY' ? 'Monthly' :
                         client.paperworkFrequency === 'QUARTERLY' ? 'Quarterly' :
                         client.paperworkFrequency === 'ANNUALLY' ? 'Annually' :
                         client.paperworkFrequency || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Client Added:</span>
                      <span className="text-sm font-medium">{formatDateTime(client.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes Section - Only show if exists */}
              {client.notes && (
                <Card className="shadow-professional">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notes</CardTitle>
                    <CardDescription>Additional client information</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="card-stack">
              {/* Statutory Dates & Deadlines */}
              <Card className="shadow-professional">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Statutory Dates & Deadlines</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    {/* Year End */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Year End:</span>
                      <span className="text-sm font-medium">
                        {formatYearEndDate()}
                      </span>
                    </div>

                    {/* Accounts Due */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Accounts Due:</span>
                      <span className={`text-sm font-medium ${
                        client.nextAccountsDue && isDateOverdue(client.nextAccountsDue) ? 'text-red-600' : 
                        client.nextAccountsDue && isDateSoon(client.nextAccountsDue, 30) ? 'text-amber-600' : 
                        'text-foreground'
                      }`}>
                        {client.nextAccountsDue ? formatDate(client.nextAccountsDue) : 'Not set'}
                      </span>
                    </div>

                    {/* Corporation Tax Due */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Corporation Tax Due:</span>
                      <span className={`text-sm font-medium ${
                        client.nextCorporationTaxDue && isDateOverdue(client.nextCorporationTaxDue) ? 'text-red-600' : 
                        client.nextCorporationTaxDue && isDateSoon(client.nextCorporationTaxDue, 30) ? 'text-amber-600' : 
                        'text-foreground'
                      }`}>
                        {client.nextCorporationTaxDue ? formatDate(client.nextCorporationTaxDue) : 'Not set'}
                      </span>
                    </div>

                    {/* CS Due Date */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CS Due Date:</span>
                      <span className={`text-sm font-medium ${
                        client.nextConfirmationDue && isDateOverdue(client.nextConfirmationDue) ? 'text-red-600' : 
                        client.nextConfirmationDue && isDateSoon(client.nextConfirmationDue, 30) ? 'text-amber-600' : 
                        'text-foreground'
                      }`}>
                        {client.nextConfirmationDue ? formatDate(client.nextConfirmationDue) : 'Not set'}
                      </span>
                    </div>

                    {/* Last Accounts */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Accounts:</span>
                      <span className="text-sm font-medium">
                        {client.lastAccountsMadeUpTo ? formatDate(client.lastAccountsMadeUpTo) : 'Not available'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 🎯 CT Status Management */}
              <CTStatusManager 
                client={client} 
                currentUser={currentUser}
              />

              {/* VAT Information - Only show if VAT enabled */}
              {client.isVatEnabled && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">VAT Information</CardTitle>
                    <CardDescription>VAT registration and return details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      {client.vatNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">VAT Number:</span>
                          <span className="text-sm font-medium font-mono">{client.vatNumber}</span>
                        </div>
                      )}
                      
                      {client.vatRegistrationDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Registration Date:</span>
                          <span className="text-sm font-medium">{formatDate(client.vatRegistrationDate)}</span>
                        </div>
                      )}
                      
                      {client.vatReturnsFrequency && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Returns Frequency:</span>
                          <Badge variant="outline" className={
                            client.vatReturnsFrequency === 'QUARTERLY' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            client.vatReturnsFrequency === 'MONTHLY' ? 'bg-green-100 text-green-800 border-green-200' :
                            client.vatReturnsFrequency === 'ANNUALLY' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            ''
                          }>
                            {client.vatReturnsFrequency.charAt(0) + client.vatReturnsFrequency.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                      )}
                      
                      {client.vatQuarterGroup && client.vatReturnsFrequency === 'QUARTERLY' && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Quarter Group:</span>
                          <span className="text-sm font-medium font-mono">{client.vatQuarterGroup}</span>
                        </div>
                      )}
                      
                      {client.nextVatReturnDue && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Next VAT Due:</span>
                          <span className={`text-sm font-medium ${
                            isDateOverdue(client.nextVatReturnDue) ? 'text-red-600' : 
                            isDateSoon(client.nextVatReturnDue, 30) ? 'text-amber-600' : 
                            'text-foreground'
                          }`}>
                            {formatDate(client.nextVatReturnDue)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Current VAT Workflow Status */}
                    {client.vatQuartersWorkflow && client.vatQuartersWorkflow.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Current Workflow</span>
                          </div>
                          {(() => {
                            const currentQuarter = client.vatQuartersWorkflow[0]
                            const displayPeriod = formatQuarterPeriodForDisplay(currentQuarter.quarterPeriod)
                            const stageName = VAT_WORKFLOW_STAGE_NAMES[currentQuarter.currentStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES] || currentQuarter.currentStage
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Quarter Period:</span>
                                  <span className="text-sm font-medium">{displayPeriod}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Current Stage:</span>
                                  <Badge variant="outline" className={
                                    currentQuarter.isCompleted 
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : 'bg-blue-100 text-blue-800 border-blue-200'
                                  }>
                                    {currentQuarter.isCompleted ? 'Completed' : stageName}
                                  </Badge>
                                </div>
                                {currentQuarter.assignedUser && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Assigned To:</span>
                                    <span className="text-sm font-medium">{currentQuarter.assignedUser.name}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Filing History Card */}
              <Card className="shadow-professional border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Filing History
                      </CardTitle>
                      <CardDescription>View complete filing history and compliance status</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {client.isVatEnabled && (
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">VAT Returns</p>
                            <p className="text-xs text-muted-foreground">
                              {client.vatReturnsFrequency ? `${client.vatReturnsFrequency.charAt(0) + client.vatReturnsFrequency.slice(1).toLowerCase()} returns` : 'Not configured'}
                            </p>
                          </div>
                        </div>
                        {client.nextVatReturnDue && (
                          <span className="text-xs text-muted-foreground">
                            Next: {formatDate(client.nextVatReturnDue)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {client.companyType !== 'SOLE_TRADER' && (
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Annual Accounts</p>
                            <p className="text-xs text-muted-foreground">
                              Companies House filing
                            </p>
                          </div>
                        </div>
                        {client.nextAccountsDue && (
                          <span className="text-xs text-muted-foreground">
                            Due: {formatDate(client.nextAccountsDue)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {client.companyType === 'LIMITED_COMPANY' && (
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Corporation Tax</p>
                            <p className="text-xs text-muted-foreground">
                              CT600 return filing
                            </p>
                          </div>
                        </div>
                        {client.nextCorporationTaxDue && (
                          <div className="text-xs text-muted-foreground">
                            <div>Due: {formatDate(client.nextCorporationTaxDue)}</div>
                            <div className={`mt-1 ${
                              isDateOverdue(client.nextCorporationTaxDue) ? 'text-red-600' :
                              isDateSoon(client.nextCorporationTaxDue, 30) ? 'text-amber-600' :
                              'text-muted-foreground'
                            }`}>
                              {formatDaysUntilDue(client.nextCorporationTaxDue)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      onClick={() => router.push(`/dashboard/clients/${client.id}/filing-history`)}
                      className="w-full"
                      variant="default"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Complete Filing History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Corporation Tax Filing Summary - Only show for Limited Companies */}
              {client.companyType === 'LIMITED_COMPANY' && (
                <CTFilingSummary 
                  client={{
                    id: client.id,
                    companyName: client.companyName,
                    companyNumber: client.companyNumber,
                    nextYearEnd: client.nextYearEnd,
                    nextCorporationTaxDue: client.nextCorporationTaxDue,
                    corporationTaxStatus: client.corporationTaxStatus,
                    corporationTaxPeriodEnd: client.corporationTaxPeriodEnd,
                    corporationTaxPeriodStart: client.corporationTaxPeriodStart,
                    ctDueSource: client.ctDueSource,
                    lastCTStatusUpdate: client.lastCTStatusUpdate,
                    ctStatusUpdatedBy: client.ctStatusUpdatedBy,
                    manualCTDueOverride: client.manualCTDueOverride
                  }}
                  onViewFullHistory={() => router.push(`/dashboard/clients/${client.id}/filing-history`)}
                />
              )}

              {/* Companies House Data - Only show if company number exists */}
              {client.companyNumber && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Companies House Data</CardTitle>
                    <CardDescription>Official company information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      {client.registeredOfficeAddress && (
                        <div>
                          <span className="text-sm text-muted-foreground">Registered Office:</span>
                          <p className="text-sm mt-1">
                            {JSON.parse(client.registeredOfficeAddress).address_line_1}
                            {JSON.parse(client.registeredOfficeAddress).address_line_2 && 
                              `, ${JSON.parse(client.registeredOfficeAddress).address_line_2}`}
                            {JSON.parse(client.registeredOfficeAddress).locality && 
                              `, ${JSON.parse(client.registeredOfficeAddress).locality}`}
                            {JSON.parse(client.registeredOfficeAddress).postal_code && 
                              `, ${JSON.parse(client.registeredOfficeAddress).postal_code}`}
                          </p>
                        </div>
                      )}
                      
                      {client.sicCodes && (
                        <div>
                          <span className="text-sm text-muted-foreground">SIC Codes:</span>
                          <p className="text-sm mt-1">{client.sicCodes}</p>
                        </div>
                      )}
                      
                      {client.jurisdiction && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Jurisdiction:</span>
                          <span className="text-sm capitalize">{client.jurisdiction.replace('-', ' ')}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Liquidated</p>
                          <p className="text-sm font-medium">
                            {client.hasBeenLiquidated ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Charges</p>
                          <p className="text-sm font-medium">
                            {client.hasCharges ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Insolvency</p>
                          <p className="text-sm font-medium">
                            {client.hasInsolvencyHistory ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              <Card className="shadow-professional">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
                      <CardDescription>Latest actions and updates</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActivityLogModal(true)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      View Full Log
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.activityLogs && client.activityLogs.length > 0 ? (
                    <div className="space-y-3">
                      {client.activityLogs.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-2 rounded-sm border border-border">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.user?.name || 'System'} • {formatDateTime(log.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Address Information - Dynamic Grid - Only show if any addresses exist */}
          {(client.registeredOfficeAddress || client.tradingAddress || client.residentialAddress) && (
            <div className="auto-fit-cards">
              {/* Registered Office Address */}
              {client.registeredOfficeAddress && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Registered Office Address</CardTitle>
                    <CardDescription>Official registered address from Companies House</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        try {
                          const address = JSON.parse(client.registeredOfficeAddress)
                          return (
                            <div className="text-sm">
                              {address.address_line_1 && <p>{address.address_line_1}</p>}
                              {address.address_line_2 && <p>{address.address_line_2}</p>}
                              {address.locality && <p>{address.locality}</p>}
                              {address.region && <p>{address.region}</p>}
                              {address.postal_code && <p className="font-medium">{address.postal_code}</p>}
                              {address.country && <p className="text-muted-foreground">{address.country}</p>}
                            </div>
                          )
                        } catch {
                          return <p className="text-sm text-muted-foreground">Invalid address format</p>
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trading Address */}
              {client.tradingAddress && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Trading Address</CardTitle>
                    <CardDescription>Business trading address</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        try {
                          const address = JSON.parse(client.tradingAddress)
                          return (
                            <div className="text-sm">
                              {address.address_line_1 && <p>{address.address_line_1}</p>}
                              {address.address_line_2 && <p>{address.address_line_2}</p>}
                              {address.locality && <p>{address.locality}</p>}
                              {address.region && <p>{address.region}</p>}
                              {address.postal_code && <p className="font-medium">{address.postal_code}</p>}
                              {address.country && <p className="text-muted-foreground">{address.country}</p>}
                            </div>
                          )
                        } catch {
                          return <p className="text-sm text-muted-foreground">Invalid address format</p>
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Residential Address */}
              {client.residentialAddress && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Residential Address</CardTitle>
                    <CardDescription>Residential address for correspondence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        try {
                          const address = JSON.parse(client.residentialAddress)
                          return (
                            <div className="text-sm">
                              {address.address_line_1 && <p>{address.address_line_1}</p>}
                              {address.address_line_2 && <p>{address.address_line_2}</p>}
                              {address.locality && <p>{address.locality}</p>}
                              {address.region && <p>{address.region}</p>}
                              {address.postal_code && <p className="font-medium">{address.postal_code}</p>}
                              {address.country && <p className="text-muted-foreground">{address.country}</p>}
                            </div>
                          )
                        } catch {
                          return <p className="text-sm text-muted-foreground">Invalid address format</p>
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Owner Information - Only show if data exists */}
          {(client.officers || client.personsWithSignificantControl) && (
            <div className="responsive-card-grid">
              {/* Company Officers */}
              {client.officers && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Company Officers</CardTitle>
                    <CardDescription>Directors and company officers from Companies House</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        if (!client.officers) {
                          return <p className="text-sm text-muted-foreground">No officer data available</p>
                        }
                        try {
                          const officers = JSON.parse(client.officers)
                          if (officers.items && officers.items.length > 0) {
                            return officers.items.map((officer: OfficerData, index: number) => {
                              // Determine officer status
                              const isResigned = officer.resigned_on
                              const status = isResigned ? 'Resigned' : 'Active'
                              const statusColor = isResigned ? 'text-red-600' : 'text-green-600'
                              const statusBg = isResigned ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                              
                              return (
                                <div key={index} className={`p-3 border rounded-sm ${statusBg}`}>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-medium text-sm">{officer.name}</h4>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={isResigned ? "outline" : "secondary"} className={`text-xs ${statusColor}`}>
                                          {status}
                                        </Badge>
                                        <span className="text-xs bg-muted px-2 py-1 rounded">
                                          {officer.officer_role?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                      {officer.appointed_on && (
                                        <p>
                                          Appointed: {new Date(officer.appointed_on).toLocaleDateString('en-GB')}
                                        </p>
                                      )}
                                      {officer.resigned_on && (
                                        <p className="text-red-600">
                                          Resigned: {new Date(officer.resigned_on).toLocaleDateString('en-GB')}
                                        </p>
                                      )}
                                      {officer.nationality && (
                                        <p>
                                          Nationality: {officer.nationality}
                                        </p>
                                      )}
                                      {officer.occupation && (
                                        <p>
                                          Occupation: {officer.occupation}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          } else {
                            return <p className="text-sm text-muted-foreground">No officers found</p>
                          }
                        } catch {
                          return <p className="text-sm text-muted-foreground">Unable to parse officer data</p>
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Persons with Significant Control */}
              {client.personsWithSignificantControl && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Persons with Significant Control</CardTitle>
                    <CardDescription>PSC information from Companies House</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        if (!client.personsWithSignificantControl) {
                          return <p className="text-sm text-muted-foreground">No PSC data available</p>
                        }
                        try {
                          const psc = JSON.parse(client.personsWithSignificantControl)
                          if (psc.items && psc.items.length > 0) {
                            return psc.items.map((person: PSCData, index: number) => {
                              // Determine PSC status
                              const isCeased = person.ceased_on
                              const status = isCeased ? 'Ceased' : 'Active'
                              const statusColor = isCeased ? 'text-red-600' : 'text-green-600'
                              const statusBg = isCeased ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                              
                              return (
                                <div key={index} className={`p-3 border rounded-sm ${statusBg}`}>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-medium text-sm">{person.name}</h4>
                                      <Badge variant={isCeased ? "outline" : "secondary"} className={`text-xs ${statusColor}`}>
                                        {status}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                                      {person.kind && (
                                        <p>
                                          Type: {person.kind.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                        </p>
                                      )}
                                      {person.notified_on && (
                                        <p>
                                          Notified: {new Date(person.notified_on).toLocaleDateString('en-GB')}
                                        </p>
                                      )}
                                      {person.ceased_on && (
                                        <p className="text-red-600">
                                          Ceased: {new Date(person.ceased_on).toLocaleDateString('en-GB')}
                                        </p>
                                      )}
                                      {person.natures_of_control && person.natures_of_control.length > 0 && (
                                        <div>
                                          <p>Nature of Control:</p>
                                          <ul className="list-disc list-inside ml-2">
                                            {person.natures_of_control.map((nature: string, i: number) => (
                                              <li key={i}>{nature.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          } else {
                            return <p className="text-sm text-muted-foreground">No PSC information found</p>
                          }
                        } catch {
                          return <p className="text-sm text-muted-foreground">Unable to parse PSC data</p>
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Activity Log Modal */}
      <Dialog open={showActivityLogModal} onOpenChange={setShowActivityLogModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Client Activity Log - {client.companyName}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <ActivityLogViewer 
              clientId={client.id} 
              title={`Activity History for ${client.companyName}`}
              showFilters={true}
              showExport={true}
              limit={200}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 