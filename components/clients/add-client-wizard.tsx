'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { showToast } from '@/lib/toast'
import { 
  Building2, 
  Search, 
  CheckCircle, 
  ArrowLeft, 
  Save,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ClientCreatedModal } from './client-created-modal'

interface CompaniesHouseSearchResult {
  company_number: string
  title: string
  company_status: string
  company_type: string
  address?: {
    locality?: string
    postal_code?: string
  }
}

interface CompaniesHouseCompany {
  company_number: string
  company_name: string
  company_status: string
  company_status_detail?: string
  type: string
  date_of_creation?: string
  date_of_cessation?: string
  registered_office_address?: any
  sic_codes?: string[]
  accounts?: {
    next_due?: string
    last_accounts?: {
      made_up_to?: string
    }
    accounting_reference_date?: any
  }
  confirmation_statement?: {
    next_due?: string
    last_made_up_to?: string
  }
  jurisdiction?: string
  has_been_liquidated?: boolean
  has_charges?: boolean
  has_insolvency_history?: boolean
  officers?: any[]
  psc?: any[]
}

export function AddClientWizard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<CompaniesHouseSearchResult[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompaniesHouseCompany | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdClient, setCreatedClient] = useState<any>(null)

  const [formData, setFormData] = useState({
    clientCode: '',
    companyType: '',
    companyNumber: '',
  })

  // Auto-fetch company details when company number changes for Limited Companies
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (formData.companyType === 'LIMITED_COMPANY' && formData.companyNumber && !selectedCompany) {
        setLoading(true)
        try {
          const response = await fetch(`/api/companies-house/company/${formData.companyNumber}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              setSelectedCompany(data.data)
            }
          } else {
            // Handle API errors gracefully - don't block client creation
            console.warn('Companies House API not available:', response.status)
          }
        } catch (error) {
          console.warn('Companies House API error:', error)
          // Don't block the user - they can still create the client manually
        } finally {
          setLoading(false)
        }
      }
    }

    const timeoutId = setTimeout(fetchCompanyDetails, 500) // Debounce
    return () => clearTimeout(timeoutId)
  }, [formData.companyNumber, formData.companyType, selectedCompany])

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
        console.warn('Companies House search API not available:', response.status)
        setSearchResults([])
        // Could show a user-friendly message here
      }
    } catch (error) {
      console.warn('Companies House search error:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Select company from search results
  const selectCompany = async (companyNumber: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/companies-house/company/${companyNumber}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setSelectedCompany(data.data)
          setFormData(prev => ({
            ...prev,
            companyNumber: data.data.company_number
          }))
          setShowSearch(false)
          setSearchResults([])
          setCompanySearch('')
        }
      } else {
        console.warn('Companies House API not available:', response.status)
        // Still allow manual entry
        setFormData(prev => ({
          ...prev,
          companyNumber: companyNumber
        }))
        setShowSearch(false)
        setSearchResults([])
        setCompanySearch('')
      }
    } catch (error) {
      console.warn('Companies House API error:', error)
      // Still allow manual entry
      setFormData(prev => ({
        ...prev,
        companyNumber: companyNumber
      }))
      setShowSearch(false)
      setSearchResults([])
      setCompanySearch('')
    } finally {
      setLoading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyType) {
      showToast.error('Please select a client type')
      return
    }

    if (formData.companyType === 'LIMITED_COMPANY' && !formData.companyNumber) {
      showToast.error('Please enter a company number for Limited Companies')
      return
    }

    setLoading(true)
    try {
      // For Limited Companies, ensure we have company data
      let companyData = selectedCompany
      
      if (formData.companyType === 'LIMITED_COMPANY' && formData.companyNumber && !selectedCompany) {
        try {
          const response = await fetch(`/api/companies-house/company/${formData.companyNumber}`)
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.success && data.data) {
              companyData = data.data
            }
          }
        } catch (error) {
          console.warn('Companies House API not available during submission:', error)
          // Continue without Companies House data
        }
      }

      const clientData = {
        clientCode: formData.clientCode || undefined,
        companyType: formData.companyType,
        companyNumber: formData.companyNumber || undefined,
        companyName: companyData?.company_name || `${formData.companyType.replace('_', ' ')} Client`,
        isActive: true,
        // Include all Companies House data if available
        ...(companyData && {
          companyStatus: companyData.company_status,
          companyStatusDetail: companyData.company_status_detail,
          incorporationDate: companyData.date_of_creation ? new Date(companyData.date_of_creation) : undefined,
          cessationDate: companyData.date_of_cessation ? new Date(companyData.date_of_cessation) : undefined,
          registeredOfficeAddress: companyData.registered_office_address ? JSON.stringify(companyData.registered_office_address) : undefined,
          sicCodes: companyData.sic_codes ? companyData.sic_codes : undefined,
          nextAccountsDue: companyData.accounts?.next_due ? new Date(companyData.accounts.next_due) : undefined,
          lastAccountsMadeUpTo: companyData.accounts?.last_accounts?.made_up_to ? new Date(companyData.accounts.last_accounts.made_up_to) : undefined,
          accountingReferenceDate: companyData.accounts?.accounting_reference_date ? JSON.stringify(companyData.accounts.accounting_reference_date) : undefined,
          nextConfirmationDue: companyData.confirmation_statement?.next_due ? new Date(companyData.confirmation_statement.next_due) : undefined,
          lastConfirmationMadeUpTo: companyData.confirmation_statement?.last_made_up_to ? new Date(companyData.confirmation_statement.last_made_up_to) : undefined,
          jurisdiction: companyData.jurisdiction,
          hasBeenLiquidated: companyData.has_been_liquidated,
          hasCharges: companyData.has_charges,
          hasInsolvencyHistory: companyData.has_insolvency_history,
          // Officers and PSC data
          officers: companyData.officers,
          personsWithSignificantControl: companyData.psc,
        })
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Client created successfully')
        
        // Store created client data for modal
        setCreatedClient({
          id: data.data.id,
          companyName: data.data.companyName,
          companyNumber: data.data.companyNumber,
          clientCode: data.data.clientCode,
          createdAt: data.data.createdAt
        })
        
        // Show success modal
        setShowSuccessModal(true)
        
        // Reset form
        setFormData(prev => ({
          ...prev,
          clientCode: '',
          companyType: '',
          companyNumber: '',
        }))
        setSelectedCompany(null)
        setShowSearch(false)
        setSearchResults([])
        setCompanySearch('')
      } else {
        showToast.error(`Failed to create client: ${data.error}`)
      }
    } catch (error: any) {
      showToast.error('Failed to create client. Please try again.')
      console.error('Error creating client:', error)
    } finally {
      setLoading(false)
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
                <h1 className="text-xl md:text-2xl font-bold">Add New Client</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Create a new client record with automatic Companies House integration
                </p>
              </div>
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

          {/* Main Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Client Information
              </CardTitle>
              <CardDescription>
                Enter the basic client details to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Code */}
                <div className="space-y-2">
                  <Label htmlFor="clientCode">Client Code (Optional)</Label>
                  <Input
                    id="clientCode"
                    value={formData.clientCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientCode: e.target.value }))}
                    placeholder="e.g., CLI001, ACME-2024"
                    className="input-field"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this client. Leave blank to auto-generate.
                  </p>
                </div>

                {/* Company Type */}
                <div className="space-y-2">
                  <Label htmlFor="companyType">Client Type *</Label>
                  <Select
                    value={formData.companyType}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, companyType: value, companyNumber: '' }))
                      setSelectedCompany(null)
                      setShowSearch(value === 'LIMITED_COMPANY')
                      setSearchResults([])
                      setCompanySearch('')
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

                {/* Company Number or Search for Limited Companies */}
                {formData.companyType === 'LIMITED_COMPANY' && (
                  <div className="space-y-4">
                    {/* Company Search */}
                    <Card className="border-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Find Company
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Search by company name or enter company number directly
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Search by Name */}
                        <div className="space-y-2">
                          <Label>Search by Company Name</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter company name..."
                              value={companySearch}
                              onChange={(e) => setCompanySearch(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && searchCompanies(companySearch)}
                              className="input-field"
                            />
                            <Button
                              type="button"
                              onClick={() => searchCompanies(companySearch)}
                              disabled={searchLoading}
                              size="sm"
                              className="btn-primary"
                            >
                              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            <Label className="text-xs text-muted-foreground">Search Results</Label>
                            {searchResults.map((company) => (
                              <div
                                key={company.company_number}
                                className="p-3 border rounded-sm cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => selectCompany(company.company_number)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-sm">{company.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {company.company_number} • {company.company_status}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {company.company_type}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* OR Divider */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-px bg-border"></div>
                          <span className="text-xs text-muted-foreground">OR</span>
                          <div className="flex-1 h-px bg-border"></div>
                        </div>

                        {/* Direct Company Number Entry */}
                        <div className="space-y-2">
                          <Label htmlFor="companyNumber">Enter Company Number Directly</Label>
                          <Input
                            id="companyNumber"
                            value={formData.companyNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, companyNumber: e.target.value }))}
                            placeholder="e.g., 12345678"
                            disabled={!!selectedCompany}
                            className="input-field"
                          />
                          <p className="text-xs text-muted-foreground">
                            Company details will be automatically fetched
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Selected Company Display */}
                    {selectedCompany && (
                      <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-sm text-green-700 mb-3">
                            <CheckCircle className="h-4 w-4" />
                            Company Found - All Details Will Be Saved
                          </div>
                          <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Company Name:</span>
                              <span className="font-medium">{selectedCompany.company_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Company Number:</span>
                              <span>{selectedCompany.company_number}</span>
                            </div>
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
                                <span className="text-xs">{selectedCompany.sic_codes.slice(0, 3).join(', ')}{selectedCompany.sic_codes.length > 3 ? '...' : ''}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Company Number for Non-Limited Companies */}
                {formData.companyType && formData.companyType !== 'LIMITED_COMPANY' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyNumber">Company/Reference Number (Optional)</Label>
                    <Input
                      id="companyNumber"
                      value={formData.companyNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyNumber: e.target.value }))}
                      placeholder="Enter reference number if applicable"
                      className="input-field"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !formData.companyType}
                    className="btn-primary"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating Client...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Client
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {createdClient && (
        <ClientCreatedModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            setCreatedClient(null)
          }}
          client={createdClient}
        />
      )}
    </div>
  )
} 