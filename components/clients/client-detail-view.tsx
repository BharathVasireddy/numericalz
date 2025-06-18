'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'
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
  UserPlus, 
  RefreshCw,
  FileText,
  Clock,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AssignUserModal } from '@/components/clients/assign-user-modal'
import { CTStatusManager } from './ct-status-manager'

interface ClientDetailViewProps {
  client: any // Full client object with relations
  currentUser: any
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
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getYearEnd = (accountingRefDate: string | null, lastAccountsMadeUpTo: string | null) => {
    // If we have last accounts made up to date, calculate next year end from that
    if (lastAccountsMadeUpTo) {
      try {
        const lastAccountsDate = new Date(lastAccountsMadeUpTo)
        if (!isNaN(lastAccountsDate.getTime())) {
          // Next year end is one year after last accounts made up to
          const nextYearEnd = new Date(lastAccountsDate)
          nextYearEnd.setFullYear(nextYearEnd.getFullYear() + 1)
          
          return nextYearEnd.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }
      } catch (e) {
        // Fall through to accounting reference date calculation
      }
    }
    
    // Fallback to accounting reference date calculation if no last accounts
    if (!accountingRefDate) return 'Not set'
    try {
      const parsed = JSON.parse(accountingRefDate)
      if (parsed.day && parsed.month) {
        // Companies House provides day/month only for accounting reference date
        // We need to calculate the next year end based on current date
        const today = new Date()
        const currentYear = today.getFullYear()
        
        // Create this year's year end date
        const thisYearEnd = new Date(currentYear, parsed.month - 1, parsed.day)
        
        // If this year's year end has passed, next year end is next year
        // If this year's year end hasn't passed, next year end is this year
        const nextYearEnd = thisYearEnd <= today 
          ? new Date(currentYear + 1, parsed.month - 1, parsed.day)
          : thisYearEnd
        
        // Return the next year end date in full format
        return nextYearEnd.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      }
    } catch (e) {
      // Fallback for invalid JSON - treat as date string
      const date = new Date(accountingRefDate)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit',
          year: 'numeric'
        })
      }
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

  const getDateStatus = (dateString: string | null) => {
    if (!dateString) return { status: 'none', icon: null, color: 'text-muted-foreground' }
    if (isDateOverdue(dateString)) return { status: 'overdue', icon: AlertTriangle, color: 'text-red-600' }
    if (isDateSoon(dateString)) return { status: 'soon', icon: Clock, color: 'text-amber-600' }
    return { status: 'ok', icon: CheckCircle, color: 'text-green-600' }
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

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/users?includeSelf=true')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users || [])
      } else {
        console.error('Failed to fetch users:', data.error)
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAssignUser = async () => {
    await fetchUsers()
    setShowAssignModal(true)
  }

  const handleAssignSuccess = () => {
    // Refresh the page to show updated assignment
    router.refresh()
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
                  <>
                    <Button
                      variant="outline"
                      onClick={handleAssignUser}
                      disabled={loadingUsers}
                      className="btn-outline"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {loadingUsers ? 'Loading...' : 'Assign User'}
                    </Button>
                    <Button
                      onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                      className="btn-primary"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Client
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Overview */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="hover-lift">
              <CardContent className="p-4">
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
              <CardContent className="p-4">
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
              <CardContent className="p-4">
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Year End</p>
                    <p className="text-sm font-medium">
                      {getYearEnd(client.accountingReferenceDate, client.lastAccountsMadeUpTo)}
                    </p>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Basic Information</CardTitle>
                  <CardDescription>Company and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Company Name:</span>
                      <span className="text-sm font-medium">{client.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Client Code:</span>
                      <span className="text-sm font-mono">{client.clientCode || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Company Number:</span>
                      <span className="text-sm font-mono">{client.companyNumber || 'Not applicable'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Company Status:</span>
                      <span className="text-sm">{client.companyStatus || 'Unknown'}</span>
                    </div>
                    {client.incorporationDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Incorporated:</span>
                        <span className="text-sm">{formatDate(client.incorporationDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Contact Information</CardTitle>
                  <CardDescription>Primary contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{client.contactName}</p>
                        <p className="text-xs text-muted-foreground">Contact Person</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{getDisplayEmail(client.contactEmail)}</p>
                        <p className="text-xs text-muted-foreground">Email Address</p>
                      </div>
                    </div>
                    {client.contactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{client.contactPhone}</p>
                          <p className="text-xs text-muted-foreground">Phone Number</p>
                        </div>
                      </div>
                    )}
                    {client.contactFax && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{client.contactFax}</p>
                          <p className="text-xs text-muted-foreground">Fax Number</p>
                        </div>
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{client.website}</p>
                          <p className="text-xs text-muted-foreground">Website</p>
                        </div>
                      </div>
                    )}
                    {client.vatNumber && (
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{client.vatNumber}</p>
                          <p className="text-xs text-muted-foreground">VAT Number</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Business Information</CardTitle>
                  <CardDescription>Additional business details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {client.yearEstablished && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Year Established:</span>
                        <span className="text-sm font-medium">{client.yearEstablished}</span>
                      </div>
                    )}
                    {client.numberOfEmployees && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Number of Employees:</span>
                        <span className="text-sm font-medium">{client.numberOfEmployees}</span>
                      </div>
                    )}
                    {client.annualTurnover && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Annual Turnover:</span>
                        <span className="text-sm font-medium">£{client.annualTurnover.toLocaleString()}</span>
                      </div>
                    )}
                    {client.paperworkFrequency && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Paperwork Frequency:</span>
                        <span className="text-sm font-medium">
                          {client.paperworkFrequency === 'MONTHLY' ? 'Monthly' :
                           client.paperworkFrequency === 'QUARTERLY' ? 'Quarterly' :
                           client.paperworkFrequency === 'ANNUALLY' ? 'Annually' :
                           client.paperworkFrequency}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Client Added:</span>
                      <span className="text-sm font-medium">{formatDateTime(client.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Statutory Dates */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Statutory Dates & Deadlines</CardTitle>
                  <CardDescription>Important filing dates and deadlines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Accounts Due:</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDateStatus(client.nextAccountsDue)
                          const Icon = status.icon
                          return (
                            <>
                              {Icon && <Icon className={`h-3 w-3 ${status.color}`} />}
                              <span className={`text-sm font-medium ${status.color}`}>
                                {formatDate(client.nextAccountsDue)}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">CT Due:</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDateStatus(client.nextCorporationTaxDue)
                          const Icon = status.icon
                          return (
                            <>
                              {Icon && <Icon className={`h-3 w-3 ${status.color}`} />}
                              <span className={`text-sm font-medium ${status.color}`}>
                                {formatDate(client.nextCorporationTaxDue)}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">CS Due:</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = getDateStatus(client.nextConfirmationDue)
                          const Icon = status.icon
                          return (
                            <>
                              {Icon && <Icon className={`h-3 w-3 ${status.color}`} />}
                              <span className={`text-sm font-medium ${status.color}`}>
                                {formatDate(client.nextConfirmationDue)}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {client.lastAccountsMadeUpTo && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Accounts:</span>
                        <span className="text-sm">{formatDate(client.lastAccountsMadeUpTo)}</span>
                      </div>
                    )}

                    {client.lastConfirmationMadeUpTo && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last CS:</span>
                        <span className="text-sm">{formatDate(client.lastConfirmationMadeUpTo)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 🎯 CT Status Management */}
              <CTStatusManager 
                client={client} 
                currentUser={currentUser}
              />

              {/* VAT Information */}
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
                          <div className="flex items-center gap-2">
                            {(() => {
                              const status = getDateStatus(client.nextVatReturnDue)
                              const Icon = status.icon
                              return (
                                <>
                                  {Icon && <Icon className={`h-3 w-3 ${status.color}`} />}
                                  <span className={`text-sm font-medium ${status.color}`}>
                                    {formatDate(client.nextVatReturnDue)}
                                  </span>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Companies House Data */}
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
              {client.activityLogs && client.activityLogs.length > 0 && (
                <Card className="shadow-professional">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
                    <CardDescription>Latest actions and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {client.notes && (
            <Card className="shadow-professional">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Notes</CardTitle>
                <CardDescription>Additional client information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Address Information */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
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

          {/* Owner Information */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {/* Company Officers */}
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
                        return officers.items.map((officer: any, index: number) => {
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

            {/* Persons with Significant Control */}
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
                        return psc.items.map((person: any, index: number) => {
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
          </div>
        </div>
      </div>
      
      {/* Assign User Modal */}
      <AssignUserModal
        client={client}
        users={users}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={handleAssignSuccess}
      />
    </div>
  )
} 