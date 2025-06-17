'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Building2, MapPin, Calendar, Users, DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CompaniesHouseCompany, CompaniesHouseSearchResult } from '@/lib/companies-house'

interface AddClientFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface User {
  id: string
  name: string
  email: string
}

export function AddClientForm({ onSuccess, onCancel }: AddClientFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<CompaniesHouseSearchResult[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompaniesHouseCompany | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [companySearch, setCompanySearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const [formData, setFormData] = useState({
    companyType: '',
    companyNumber: '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    tradingAddress: '',
    yearEstablished: '',
    numberOfEmployees: '',
    annualTurnover: '',
    assignedUserId: '',
    notes: '',
  })

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Include the current user (manager) in the list for assignment
        const response = await fetch('/api/users?includeSelf=true')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    if (session?.user?.role === 'MANAGER') {
      fetchUsers()
    }
  }, [session])

  // Search companies using Companies House API
  const searchCompanies = async (query: string) => {
    if (!query.trim()) return

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/companies-house/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data?.items || [])
      } else {
        console.error('Search failed:', response.statusText)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Get detailed company information
  const selectCompany = async (companyNumber: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/companies-house/company/${companyNumber}`)
      if (response.ok) {
        const data = await response.json()
        const company: CompaniesHouseCompany = data.data
        
        setSelectedCompany(company)
        setFormData(prev => ({
          ...prev,
          companyNumber: company.company_number,
          companyName: company.company_name,
          companyType: mapCompanyType(company.type),
        }))
        setShowSearch(false)
        setSearchResults([])
      } else {
        console.error('Failed to fetch company details')
      }
    } catch (error) {
      console.error('Error fetching company details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Map Companies House types to our types
  const mapCompanyType = (chType: string): string => {
    const typeMapping: Record<string, string> = {
      'ltd': 'LIMITED_COMPANY',
      'plc': 'LIMITED_COMPANY',
      'llp': 'NON_LIMITED_COMPANY',
      'partnership': 'NON_LIMITED_COMPANY',
      'sole-trader': 'NON_LIMITED_COMPANY',
      'private-unlimited': 'NON_LIMITED_COMPANY',
    }
    return typeMapping[chType.toLowerCase()] || 'NON_LIMITED_COMPANY'
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const submitData = {
        ...formData,
        yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished) : null,
        numberOfEmployees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : null,
        annualTurnover: formData.annualTurnover ? parseFloat(formData.annualTurnover) : null,
        // Include Companies House data if available
        ...(selectedCompany && {
          companyStatus: selectedCompany.company_status,
          companyStatusDetail: selectedCompany.company_status_detail,
          incorporationDate: selectedCompany.date_of_creation,
          cessationDate: selectedCompany.date_of_cessation,
          registeredOfficeAddress: selectedCompany.registered_office_address,
          sicCodes: selectedCompany.sic_codes,
          nextAccountsDue: selectedCompany.accounts?.next_due,
          lastAccountsMadeUpTo: selectedCompany.accounts?.last_accounts?.made_up_to,
          accountingReferenceDate: selectedCompany.accounts?.accounting_reference_date,
          nextConfirmationDue: selectedCompany.confirmation_statement?.next_due,
          lastConfirmationMadeUpTo: selectedCompany.confirmation_statement?.last_made_up_to,
          jurisdiction: selectedCompany.jurisdiction,
          hasBeenLiquidated: selectedCompany.has_been_liquidated,
          hasCharges: selectedCompany.has_charges,
          hasInsolvencyHistory: selectedCompany.has_insolvency_history,
        }),
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        onSuccess?.()
      } else {
        const error = await response.json()
        console.error('Error creating client:', error)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Add New Client
        </CardTitle>
        <CardDescription>
          Create a new client record with optional Companies House integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="companyType">Client Type *</Label>
            <Select
              value={formData.companyType}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, companyType: value }))
                // Show search for limited companies
                if (value === 'LIMITED_COMPANY') {
                  setShowSearch(true)
                } else {
                  setShowSearch(false)
                  setSelectedCompany(null)
                  setFormData(prev => ({ ...prev, companyNumber: '' }))
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIMITED_COMPANY">Limited Companies</SelectItem>
                <SelectItem value="NON_LIMITED_COMPANY">Non Limited Companies</SelectItem>
                <SelectItem value="DIRECTOR">Directors</SelectItem>
                <SelectItem value="SUB_CONTRACTOR">Sub Contractors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Companies House Search */}
          {showSearch && formData.companyType === 'LIMITED_COMPANY' && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Companies House Lookup
                </CardTitle>
                <CardDescription className="text-xs">
                  Search for the company to auto-populate details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter company name or number..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchCompanies(companySearch)}
                  />
                  <Button
                    type="button"
                    onClick={() => searchCompanies(companySearch)}
                    disabled={searchLoading}
                    size="sm"
                  >
                    {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((company) => (
                      <div
                        key={company.company_number}
                        className="p-3 border rounded-sm cursor-pointer hover:bg-muted/50"
                        onClick={() => selectCompany(company.company_number)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{company.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.company_number} • {company.company_status}
                            </p>
                            {company.address && (
                              <p className="text-xs text-muted-foreground">
                                {company.address.locality}, {company.address.postal_code}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {company.company_type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCompany && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-sm">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      Company selected: {selectedCompany.company_name}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyNumber">Company Number</Label>
              <Input
                id="companyNumber"
                value={formData.companyNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, companyNumber: e.target.value }))}
                placeholder="e.g., 12345678"
                disabled={!!selectedCompany}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company/Client Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter company or client name"
                required
                disabled={!!selectedCompany}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Primary contact person"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+44 20 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Business Information</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="yearEstablished">Year Established</Label>
                <Input
                  id="yearEstablished"
                  type="number"
                  value={formData.yearEstablished}
                  onChange={(e) => setFormData(prev => ({ ...prev, yearEstablished: e.target.value }))}
                  placeholder="2020"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                <Input
                  id="numberOfEmployees"
                  type="number"
                  value={formData.numberOfEmployees}
                  onChange={(e) => setFormData(prev => ({ ...prev, numberOfEmployees: e.target.value }))}
                  placeholder="10"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualTurnover">Annual Turnover (£)</Label>
                <Input
                  id="annualTurnover"
                  type="number"
                  value={formData.annualTurnover}
                  onChange={(e) => setFormData(prev => ({ ...prev, annualTurnover: e.target.value }))}
                  placeholder="100000"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradingAddress">Trading Address</Label>
              <Textarea
                id="tradingAddress"
                value={formData.tradingAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, tradingAddress: e.target.value }))}
                placeholder="If different from registered address..."
                rows={2}
              />
            </div>
          </div>

          {/* Assignment */}
          {session?.user?.role === 'MANAGER' && users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assignedUserId">Assign to Staff Member</Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignedUserId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this client..."
              rows={3}
            />
          </div>

          {/* Companies House Data Preview */}
          {selectedCompany && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Companies House Data
                </CardTitle>
                <CardDescription className="text-xs">
                  This data will be automatically included
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>{selectedCompany.company_status}</span>
                  </div>
                  {selectedCompany.date_of_creation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Incorporated:</span>
                      <span>{new Date(selectedCompany.date_of_creation).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedCompany.sic_codes && selectedCompany.sic_codes.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SIC Codes:</span>
                      <span>{selectedCompany.sic_codes.join(', ')}</span>
                    </div>
                  )}
                  {selectedCompany.accounts?.next_due && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Accounts Due:</span>
                      <span>{new Date(selectedCompany.accounts.next_due).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.companyType || !formData.companyName || !formData.contactName || !formData.contactEmail}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Client...
                </>
              ) : (
                'Create Client'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 