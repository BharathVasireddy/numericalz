'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'
import { ArrowLeft, Save, RefreshCw, AlertTriangle, Clock, CheckCircle, Calculator } from 'lucide-react'
import { getYearEndForForm, calculateYearEnd, calculateCorporationTaxDue, formatCorporationTaxDue } from '@/lib/year-end-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AddressInput } from '@/components/clients/address-input'

interface EditClientFormProps {
  client: any
}

export function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [formData, setFormData] = useState({
    companyName: client.companyName || '',
    companyType: client.companyType || '',
    companyNumber: client.companyNumber || '',
    contactName: client.contactName || '',
    contactEmail: client.contactEmail || '',
    contactPhone: client.contactPhone || '',
    contactFax: client.contactFax || '',
    website: client.website || '',
    vatNumber: client.vatNumber || '',
    yearEstablished: client.yearEstablished?.toString() || '',
    numberOfEmployees: client.numberOfEmployees?.toString() || '',
    annualTurnover: client.annualTurnover?.toString() || '',
    paperworkFrequency: client.paperworkFrequency || '',
    isActive: client.isActive,
    notes: client.notes || '',
    // 🎯 Add editable CT due field
    nextCorporationTaxDue: client.nextCorporationTaxDue ? new Date(client.nextCorporationTaxDue).toISOString().split('T')[0] : '',
    // Address fields
    tradingAddress: client.tradingAddress || '',
    residentialAddress: client.residentialAddress || '',
    // VAT Information
    isVatEnabled: client.isVatEnabled || false,
    vatRegistrationDate: client.vatRegistrationDate ? new Date(client.vatRegistrationDate).toISOString().split('T')[0] : '',
    vatReturnsFrequency: client.vatReturnsFrequency || '',
    vatQuarterGroup: client.vatQuarterGroup || '',
    nextVatReturnDue: client.nextVatReturnDue ? new Date(client.nextVatReturnDue).toISOString().split('T')[0] : '',
    // Additional Services
    requiresPayroll: client.requiresPayroll || false,
    requiresBookkeeping: client.requiresBookkeeping || false,
    requiresManagementAccounts: client.requiresManagementAccounts || false,
    // Communication Preferences
    preferredContactMethod: client.preferredContactMethod || '',
    specialInstructions: client.specialInstructions || '',
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const parseAddress = (addressString: string | null) => {
    if (!addressString) return null
    try {
      return JSON.parse(addressString)
    } catch {
      return null
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Use centralized year end calculation
  const getYearEnd = (accountingRefDate: string | null, lastAccountsMadeUpTo: string | null) => {
    return getYearEndForForm({
      accountingReferenceDate: accountingRefDate,
      lastAccountsMadeUpTo: lastAccountsMadeUpTo,
      incorporationDate: client.incorporationDate
    })
  }

  // Use centralized CT calculation
  const calculateCTDue = (accountingReferenceDate: string | null, lastAccountsMadeUpTo: string | null) => {
    return formatCorporationTaxDue({
      accountingReferenceDate: accountingReferenceDate,
      lastAccountsMadeUpTo: lastAccountsMadeUpTo,
      incorporationDate: client.incorporationDate
    })
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
    if (!formData.companyNumber) return
    
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/companies-house/company/${formData.companyNumber}`)
      const data = await response.json()
      
      if (data.success) {
        showToast.success('Companies House data refreshed successfully')
        // Trigger a refetch of the client data
        router.refresh()
      } else {
        showToast.error(data.error || 'Failed to refresh Companies House data')
      }
    } catch (error: any) {
      showToast.error('Error refreshing Companies House data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished) : null,
          numberOfEmployees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : null,
          annualTurnover: formData.annualTurnover ? parseFloat(formData.annualTurnover) : null,
          // Convert date strings to Date objects for date fields
          vatRegistrationDate: formData.vatRegistrationDate ? new Date(formData.vatRegistrationDate) : null,
          nextVatReturnDue: formData.nextVatReturnDue ? new Date(formData.nextVatReturnDue) : null,
          // 🎯 Include CT due date
          nextCorporationTaxDue: formData.nextCorporationTaxDue ? new Date(formData.nextCorporationTaxDue) : null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Client updated successfully')
        router.push('/dashboard/clients')
        router.refresh()
      } else {
        showToast.error(data.error || 'Failed to update client')
      }
    } catch (error: any) {
      showToast.error('Error updating client')
    } finally {
      setIsLoading(false)
    }
  }

  // Get registered office address for copying
  const registeredOfficeAddress = parseAddress(client.registeredOfficeAddress)

  // 🎯 Calculate CT due date using centralized utility
  const handleCalculateCTDue = () => {
    const clientData = {
      accountingReferenceDate: client.accountingReferenceDate,
      lastAccountsMadeUpTo: client.lastAccountsMadeUpTo,
      incorporationDate: client.incorporationDate
    }
    
    const ctDue = calculateCorporationTaxDue(clientData)
    
    if (!ctDue) {
      showToast.error('No year end or last accounts date available to calculate from')
      return
    }
    
    const isoString = ctDue.toISOString()
    const formattedDate = isoString.substring(0, 10)
    handleInputChange('nextCorporationTaxDue', formattedDate)
    
    // Show success message with calculated dates
    const yearEnd = calculateYearEnd(clientData)
    if (yearEnd) {
      showToast.success(
        `CT due date calculated: ${ctDue.toLocaleDateString('en-GB')} (12 months after year end ${yearEnd.toLocaleDateString('en-GB')})`
      )
    } else {
      showToast.success(`CT due date calculated: ${ctDue.toLocaleDateString('en-GB')}`)
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
                <h1 className="text-xl md:text-2xl font-bold">Edit Client</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Update client information and settings
                </p>
              </div>
              <div className="flex items-center gap-2">
                {formData.companyNumber && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshCompaniesHouse}
                    disabled={isRefreshing}
                    className="btn-outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh CH Data
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/clients')}
                  className="btn-outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="pb-6">
            <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Basic Information</CardTitle>
                  <CardDescription>Company and identification details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        required
                        className="input-field"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyType">Company Type *</Label>
                      <Select
                        value={formData.companyType}
                        onValueChange={(value) => handleInputChange('companyType', value)}
                      >
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select company type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LIMITED_COMPANY">Limited Company</SelectItem>
                          <SelectItem value="NON_LIMITED_COMPANY">Non Limited Company</SelectItem>
                          <SelectItem value="DIRECTOR">Director</SelectItem>
                          <SelectItem value="SUB_CONTRACTOR">Sub Contractor</SelectItem>
                          <SelectItem value="SOLE_TRADER">Sole Trader</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyNumber">Company Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="companyNumber"
                          value={formData.companyNumber}
                          onChange={(e) => handleInputChange('companyNumber', e.target.value)}
                          placeholder="e.g., 12345678"
                          className="input-field"
                        />
                        {formData.companyNumber && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRefreshCompaniesHouse}
                            disabled={isRefreshing}
                            className="btn-outline"
                          >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="isActive">Status</Label>
                      <Select
                        value={formData.isActive ? 'active' : 'inactive'}
                        onValueChange={(value) => handleInputChange('isActive', value === 'active')}
                      >
                        <SelectTrigger className="input-field">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statutory Information (Read-only) */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Statutory Information</CardTitle>
                  <CardDescription>Important dates and deadlines (automatically updated from Companies House)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Year End</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={getYearEnd(client.accountingReferenceDate, client.lastAccountsMadeUpTo)}
                          readOnly
                          className="input-field bg-muted"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Accounts Due</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formatDate(client.nextAccountsDue)}
                          readOnly
                          className="input-field bg-muted"
                        />
                        {(() => {
                          const status = getDateStatus(client.nextAccountsDue)
                          const Icon = status.icon
                          return Icon ? <Icon className={`h-4 w-4 ${status.color}`} /> : null
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>CT Due</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={formData.nextCorporationTaxDue}
                            onChange={(e) => handleInputChange('nextCorporationTaxDue', e.target.value)}
                            className="input-field"
                          />
                          {(() => {
                            const status = getDateStatus(formData.nextCorporationTaxDue ? new Date(formData.nextCorporationTaxDue).toISOString() : null)
                            const Icon = status.icon
                            return Icon ? <Icon className={`h-4 w-4 ${status.color}`} /> : null
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCalculateCTDue}
                          className="text-xs"
                        >
                          <Calculator className="h-3 w-3 mr-1" />
                          Calculate from Year End
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>CS Due</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formatDate(client.nextConfirmationDue)}
                          readOnly
                          className="input-field bg-muted"
                        />
                        {(() => {
                          const status = getDateStatus(client.nextConfirmationDue)
                          const Icon = status.icon
                          return Icon ? <Icon className={`h-4 w-4 ${status.color}`} /> : null
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              {/* Registered Office Address (Read-only) */}
              <AddressInput
                title="Registered Office Address"
                description="Official registered address from Companies House (read-only)"
                value={client.registeredOfficeAddress}
                onChange={() => {}} // Read-only
                readOnly={true}
              />

              {/* Trading Address */}
              <AddressInput
                title="Trading Address"
                description="Business trading address (if different from registered office)"
                value={formData.tradingAddress}
                onChange={(value) => handleInputChange('tradingAddress', value)}
                copyFromAddress={registeredOfficeAddress}
                copyFromLabel="Registered Office"
              />

              {/* Residential Address */}
              <AddressInput
                title="Residential Address"
                description="Residential address for correspondence"
                value={formData.residentialAddress}
                onChange={(value) => handleInputChange('residentialAddress', value)}
                copyFromAddress={parseAddress(formData.tradingAddress) || registeredOfficeAddress}
                copyFromLabel={parseAddress(formData.tradingAddress) ? "Trading Address" : "Registered Office"}
              />

              {/* Contact Information */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Contact Information</CardTitle>
                  <CardDescription>Primary contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name *</Label>
                      <Input
                        id="contactName"
                        value={formData.contactName}
                        onChange={(e) => handleInputChange('contactName', e.target.value)}
                        required
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email Address *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        required
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone Number</Label>
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactFax">Fax Number</Label>
                      <Input
                        id="contactFax"
                        value={formData.contactFax}
                        onChange={(e) => handleInputChange('contactFax', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://example.com"
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">VAT Number</Label>
                      <Input
                        id="vatNumber"
                        value={formData.vatNumber}
                        onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                        placeholder="e.g., GB123456789"
                        className="input-field"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* VAT Information */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    VAT Information
                  </CardTitle>
                  <CardDescription>VAT registration and return details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isVatEnabled"
                      checked={formData.isVatEnabled}
                      onCheckedChange={(checked) => handleInputChange('isVatEnabled', checked as boolean)}
                    />
                    <Label htmlFor="isVatEnabled" className="text-sm font-medium">
                      VAT Registered
                    </Label>
                  </div>

                  {formData.isVatEnabled && (
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="vatRegistrationDate">VAT Registration Date</Label>
                        <Input
                          id="vatRegistrationDate"
                          type="date"
                          value={formData.vatRegistrationDate}
                          onChange={(e) => handleInputChange('vatRegistrationDate', e.target.value)}
                          className="input-field"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vatReturnsFrequency">VAT Returns Frequency</Label>
                        <Select
                          value={formData.vatReturnsFrequency}
                          onValueChange={(value) => handleInputChange('vatReturnsFrequency', value)}
                        >
                          <SelectTrigger className="input-field">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                            <SelectItem value="ANNUALLY">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.vatReturnsFrequency === 'QUARTERLY' && (
                        <div className="space-y-2">
                          <Label htmlFor="vatQuarterGroup">VAT Quarter Group</Label>
                          <Select
                            value={formData.vatQuarterGroup}
                            onValueChange={(value) => handleInputChange('vatQuarterGroup', value)}
                          >
                            <SelectTrigger className="input-field">
                              <SelectValue placeholder="Select quarter group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1_4_7_10">1/4/7/10 (Jan/Apr/Jul/Oct)</SelectItem>
                              <SelectItem value="2_5_8_11">2/5/8/11 (Feb/May/Aug/Nov)</SelectItem>
                              <SelectItem value="3_6_9_12">3/6/9/12 (Mar/Jun/Sep/Dec)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="nextVatReturnDue">Next VAT Return Due Date</Label>
                        <Input
                          id="nextVatReturnDue"
                          type="date"
                          value={formData.nextVatReturnDue}
                          onChange={(e) => handleInputChange('nextVatReturnDue', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Services */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Additional Services</CardTitle>
                  <CardDescription>Services required by this client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresPayroll"
                        checked={formData.requiresPayroll}
                        onCheckedChange={(checked) => handleInputChange('requiresPayroll', checked as boolean)}
                      />
                      <Label htmlFor="requiresPayroll" className="text-sm font-medium">
                        Payroll Services
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresBookkeeping"
                        checked={formData.requiresBookkeeping}
                        onCheckedChange={(checked) => handleInputChange('requiresBookkeeping', checked as boolean)}
                      />
                      <Label htmlFor="requiresBookkeeping" className="text-sm font-medium">
                        Bookkeeping Services
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresManagementAccounts"
                        checked={formData.requiresManagementAccounts}
                        onCheckedChange={(checked) => handleInputChange('requiresManagementAccounts', checked as boolean)}
                      />
                      <Label htmlFor="requiresManagementAccounts" className="text-sm font-medium">
                        Management Accounts
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Communication Preferences */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Communication Preferences</CardTitle>
                  <CardDescription>How to communicate with this client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                      <Select
                        value={formData.preferredContactMethod}
                        onValueChange={(value) => handleInputChange('preferredContactMethod', value)}
                      >
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select preferred method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="PHONE">Phone</SelectItem>
                          <SelectItem value="POST">Post</SelectItem>
                          <SelectItem value="IN_PERSON">In Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialInstructions">Special Instructions</Label>
                      <Textarea
                        id="specialInstructions"
                        placeholder="Any special instructions or notes for this client..."
                        value={formData.specialInstructions}
                        onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                        rows={3}
                        className="input-field"
                      />
                    </div>
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
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="yearEstablished">Year Established</Label>
                      <Input
                        id="yearEstablished"
                        type="number"
                        value={formData.yearEstablished}
                        onChange={(e) => handleInputChange('yearEstablished', e.target.value)}
                        placeholder="e.g., 2020"
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                      <Input
                        id="numberOfEmployees"
                        type="number"
                        value={formData.numberOfEmployees}
                        onChange={(e) => handleInputChange('numberOfEmployees', e.target.value)}
                        placeholder="e.g., 10"
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="annualTurnover">Annual Turnover (£)</Label>
                      <Input
                        id="annualTurnover"
                        type="number"
                        step="0.01"
                        value={formData.annualTurnover}
                        onChange={(e) => handleInputChange('annualTurnover', e.target.value)}
                        placeholder="e.g., 100000"
                        className="input-field"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paperworkFrequency">Paperwork Frequency</Label>
                      <Select
                        value={formData.paperworkFrequency}
                        onValueChange={(value) => handleInputChange('paperworkFrequency', value)}
                      >
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="ANNUALLY">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Notes</CardTitle>
                  <CardDescription>Additional information and notes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Add any additional notes about this client..."
                      rows={4}
                      className="input-field"
                    />
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Sticky Form Actions */}
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-border shadow-lg p-4 z-50">
            <div className="content-wrapper">
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  className="btn-outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-client-form"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 