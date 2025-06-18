'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { ClientPostCreationQuestionnaire } from './client-post-creation-questionnaire'
import { NonLtdCompanyForm } from './non-ltd-company-form'
import { calculateCTDueFromYearEnd, calculateCTPeriod } from '@/lib/ct-tracking'

interface CompaniesHouseSearchResult {
  company_number: string
  title: string
  company_status: string
  company_type: string
  address?: {
    locality?: string
    postal_code?: string
  }
  ownerNames?: string[]
  ownerDetails?: Array<{
    name: string
    status: 'active' | 'resigned'
    role?: string
  }>
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
  ownerNames?: string[]
  ownerDetails?: Array<{
    name: string
    status: 'active' | 'resigned'
    role?: string
  }>
}

export function AddClientWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<CompaniesHouseSearchResult[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompaniesHouseCompany | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [createdClient, setCreatedClient] = useState<any>(null)

  // Debug logging for questionnaire state
  useEffect(() => {
    console.log('🎯 showQuestionnaire changed:', showQuestionnaire)
  }, [showQuestionnaire])

  useEffect(() => {
    console.log('🎯 createdClient changed:', createdClient)
  }, [createdClient])

  // Get company type from URL parameter
  const typeParam = searchParams.get('type')
  
  const [formData, setFormData] = useState({
    clientCode: '',
    companyType: typeParam || '',
    companyNumber: '',
  })

  // Set initial search visibility based on pre-selected company type
  useEffect(() => {
    if (typeParam === 'LIMITED_COMPANY') {
      setShowSearch(true)
    }
  }, [typeParam])

  // Non Ltd Company form data
  const [nonLtdFormData, setNonLtdFormData] = useState({
    clientName: '',
    contactEmail: '',
    contactPhone: '',
    contactFax: '',
    natureOfTrade: '',
    tradingAddressLine1: '',
    tradingAddressLine2: '',
    tradingAddressCountry: '',
    tradingAddressPostCode: '',
    residentialAddressLine1: '',
    residentialAddressLine2: '',
    residentialAddressCountry: '',
    residentialAddressPostCode: '',
    vatNumber: '',
    vatQuarters: '',
    nationalInsuranceNumber: '',
    utrNumber: '',
    paperworkFrequency: '',
    paperWorkReceived: false,
    paperWorkReceivedDate: '',
    jobCompleted: false,
    jobCompletedDate: '',
    sa100Filed: false,
    sa100FiledDate: '',
    workStatus: '',
    additionalComments: '',
    staff: '',
    previousYearEnded: '',
    previousYearWorkReceivedDate: '',
    previousYearJobCompletedDate: '',
    previousYearSA100FiledDate: '',
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
      console.log('🔍 Starting search for:', query)
      const response = await fetch(`/api/companies-house/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        const searchResults = data.data?.items || []
        console.log('📋 Search results received:', searchResults.length, 'companies')
        
        // Fetch owner names for each search result
        console.log('🔄 Fetching owner names for each company...')
        const resultsWithOwners = await Promise.all(
          searchResults.map(async (company: CompaniesHouseSearchResult, index: number) => {
            try {
              console.log(`📞 Fetching details for company ${index + 1}:`, company.company_number, company.title)
              // Fetch detailed company info to get owner names
              const detailResponse = await fetch(`/api/companies-house/company/${company.company_number}`)
              if (detailResponse.ok) {
                const detailData = await detailResponse.json()
                const ownerNames: string[] = []
                
                console.log(`📊 Company detail data for ${company.company_number}:`, detailData.data)
                console.log(`👥 Officers data for ${company.company_number}:`, detailData.data.officers)
                console.log(`🏛️ PSC data for ${company.company_number}:`, detailData.data.psc)
                
                // Add directors/officers names
                if (detailData.data.officers?.items) {
                  detailData.data.officers.items.forEach((officer: any) => {
                    const status = officer.resigned_on ? 'resigned' : 'active'
                    const role = officer.officer_role
                    
                    ;(company as any).ownerDetails = (company as any).ownerDetails || []
                    ;(company as any).ownerDetails.push({
                      name: officer.name,
                      status,
                      role
                    })
                    
                    // Add ALL officers to ownerNames (both active and resigned)
                    if (officer.name && !ownerNames.includes(officer.name)) {
                      ownerNames.push(officer.name)
                    }
                  })
                }
                
                // Add PSC (People with Significant Control) names
                if (detailData.data.psc?.items) {
                  detailData.data.psc.items.forEach((person: any) => {
                    const status = person.ceased_on ? 'resigned' : 'active'
                    const role = person.kind || 'Person with Significant Control'
                    
                    ;;(company as any).ownerDetails = (company as any).ownerDetails || []
                    ;(company as any).ownerDetails.push({
                      name: person.name,
                      status,
                      role
                    })
                    
                    // Add ALL PSC to ownerNames (both active and ceased)
                    if (person.name && !ownerNames.includes(person.name)) {
                      ownerNames.push(person.name)
                    }
                  })
                }
                
                console.log(`🎉 Final owner names for ${company.company_number}:`, ownerNames)
                console.log(`📋 Final owner details for ${company.company_number}:`, (company as any).ownerDetails)
                return { ...company, ownerNames, ownerDetails: (company as any).ownerDetails }
              } else {
                console.error(`❌ Failed to fetch details for ${company.company_number}:`, detailResponse.status)
              }
            } catch (error) {
              console.error(`💥 Error fetching owners for ${company.company_number}:`, error)
            }
            return { ...company, ownerNames: [] }
          })
        )
        
        console.log('🏁 Final results with owners:', resultsWithOwners)
        setSearchResults(resultsWithOwners)
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
      // Find the selected company from search results to get owner names
      const searchResult = searchResults.find(company => company.company_number === companyNumber)
      
      const response = await fetch(`/api/companies-house/company/${companyNumber}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Use owner names from search results if available, otherwise extract from detail data
          let ownerNames: string[] = searchResult?.ownerNames || []
          let ownerDetails = searchResult?.ownerDetails || []
          
          // If we don't have owner names from search, extract them from detail data
          if (ownerNames.length === 0) {
            // Add directors/officers names
            if (data.data.officers?.items) {
              data.data.officers.items.forEach((officer: any) => {
                const status = officer.resigned_on ? 'resigned' : 'active'
                const role = officer.officer_role
                
                ownerDetails.push({
                  name: officer.name,
                  status,
                  role
                })
                
                // Add ALL officers to ownerNames (both active and resigned)
                if (officer.name && !ownerNames.includes(officer.name)) {
                  ownerNames.push(officer.name)
                }
              })
            }
            
            // Add PSC (People with Significant Control) names
            if (data.data.psc?.items) {
              data.data.psc.items.forEach((person: any) => {
                const status = person.ceased_on ? 'resigned' : 'active'
                const role = person.kind || 'Person with Significant Control'
                
                ownerDetails.push({
                  name: person.name,
                  status,
                  role
                })
                
                // Add ALL PSC to ownerNames (both active and ceased)
                if (person.name && !ownerNames.includes(person.name)) {
                  ownerNames.push(person.name)
                }
              })
            }
          }
          
          setSelectedCompany({ ...data.data, ownerNames, ownerDetails })
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

  // Handle form submission for Limited Companies
  const handleLtdCompanySubmit = async (e: React.FormEvent) => {
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
        contactName: companyData?.company_name || `${formData.companyType.replace('_', ' ')} Contact`,
        contactEmail: 'contact@example.com', // This will need to be filled manually later
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
          // 🎯 Auto-calculate CT due from year end (12 months)
          nextCorporationTaxDue: (() => {
            if (companyData.accounts?.last_accounts?.made_up_to) {
              const lastAccountsDate = new Date(companyData.accounts.last_accounts.made_up_to)
              // First calculate the year end (last accounts + 1 year)
              const yearEnd = new Date(lastAccountsDate)
              yearEnd.setFullYear(yearEnd.getFullYear() + 1)
              // Then calculate CT due from the year end
              return calculateCTDueFromYearEnd(yearEnd)
            }
            if (companyData.accounts?.accounting_reference_date) {
              const { day, month } = companyData.accounts.accounting_reference_date
              if (day && month) {
                const today = new Date()
                const currentYear = today.getFullYear()
                const yearEnd = new Date(currentYear, month - 1, day)
                if (yearEnd < today) {
                  yearEnd.setFullYear(currentYear + 1)
                }
                return calculateCTDueFromYearEnd(yearEnd)
              }
            }
            return undefined
          })(),
          nextConfirmationDue: companyData.confirmation_statement?.next_due ? new Date(companyData.confirmation_statement.next_due) : undefined,
          lastConfirmationMadeUpTo: companyData.confirmation_statement?.last_made_up_to ? new Date(companyData.confirmation_statement.last_made_up_to) : undefined,
          jurisdiction: companyData.jurisdiction,
          hasBeenLiquidated: companyData.has_been_liquidated,
          hasCharges: companyData.has_charges,
          hasInsolvencyHistory: companyData.has_insolvency_history,
          // Officers and PSC data
          officers: companyData.officers,
          personsWithSignificantControl: companyData.psc,
          // 🎯 CT Tracking fields
          corporationTaxStatus: 'PENDING',
          corporationTaxPeriodStart: (() => {
            const { periodStart } = calculateCTPeriod(
              companyData.accounts?.last_accounts?.made_up_to ? new Date(companyData.accounts.last_accounts.made_up_to) : null,
              companyData.accounts?.accounting_reference_date ? JSON.stringify(companyData.accounts.accounting_reference_date) : null
            )
            return periodStart
          })(),
          corporationTaxPeriodEnd: (() => {
            const { periodEnd } = calculateCTPeriod(
              companyData.accounts?.last_accounts?.made_up_to ? new Date(companyData.accounts.last_accounts.made_up_to) : null,
              companyData.accounts?.accounting_reference_date ? JSON.stringify(companyData.accounts.accounting_reference_date) : null
            )
            return periodEnd
          })(),
          ctDueSource: 'AUTO',
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
        
        // Store created client data for questionnaire
        setCreatedClient({
          id: data.data.id,
          companyName: data.data.companyName,
          companyNumber: data.data.companyNumber,
          clientCode: data.data.clientCode,
          companyType: data.data.companyType,
          createdAt: data.data.createdAt
        })
        
        // Show questionnaire modal instead of success modal
        setShowQuestionnaire(true)
        
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

  // Handle form submission for Non Ltd Companies
  const handleNonLtdCompanySubmit = async () => {
    if (!nonLtdFormData.clientName || !nonLtdFormData.contactEmail) {
      showToast.error('Please fill in required fields')
      return
    }

    setLoading(true)
    try {
      const clientData = {
        clientCode: formData.clientCode || undefined,
        companyType: formData.companyType,
        companyName: nonLtdFormData.clientName,
        contactName: nonLtdFormData.clientName,
        contactEmail: nonLtdFormData.contactEmail,
        contactPhone: nonLtdFormData.contactPhone || undefined,
        contactFax: nonLtdFormData.contactFax || undefined,
        vatNumber: nonLtdFormData.vatNumber || undefined,
        paperworkFrequency: nonLtdFormData.paperworkFrequency || undefined,
        isActive: true,
        // Non Ltd Company specific fields
        natureOfTrade: nonLtdFormData.natureOfTrade || undefined,
        tradingAddressLine1: nonLtdFormData.tradingAddressLine1 || undefined,
        tradingAddressLine2: nonLtdFormData.tradingAddressLine2 || undefined,
        tradingAddressCountry: nonLtdFormData.tradingAddressCountry || undefined,
        tradingAddressPostCode: nonLtdFormData.tradingAddressPostCode || undefined,
        residentialAddressLine1: nonLtdFormData.residentialAddressLine1 || undefined,
        residentialAddressLine2: nonLtdFormData.residentialAddressLine2 || undefined,
        residentialAddressCountry: nonLtdFormData.residentialAddressCountry || undefined,
        residentialAddressPostCode: nonLtdFormData.residentialAddressPostCode || undefined,
        vatQuarters: nonLtdFormData.vatQuarters || undefined,
        nationalInsuranceNumber: nonLtdFormData.nationalInsuranceNumber || undefined,
        utrNumber: nonLtdFormData.utrNumber || undefined,
        paperWorkReceived: nonLtdFormData.paperWorkReceived,
        paperWorkReceivedDate: nonLtdFormData.paperWorkReceivedDate ? new Date(nonLtdFormData.paperWorkReceivedDate) : undefined,
        jobCompleted: nonLtdFormData.jobCompleted,
        jobCompletedDate: nonLtdFormData.jobCompletedDate ? new Date(nonLtdFormData.jobCompletedDate) : undefined,
        sa100Filed: nonLtdFormData.sa100Filed,
        sa100FiledDate: nonLtdFormData.sa100FiledDate ? new Date(nonLtdFormData.sa100FiledDate) : undefined,
        workStatus: nonLtdFormData.workStatus || undefined,
        additionalComments: nonLtdFormData.additionalComments || undefined,
        staff: nonLtdFormData.staff || undefined,
        previousYearEnded: nonLtdFormData.previousYearEnded ? new Date(nonLtdFormData.previousYearEnded) : undefined,
        previousYearWorkReceivedDate: nonLtdFormData.previousYearWorkReceivedDate ? new Date(nonLtdFormData.previousYearWorkReceivedDate) : undefined,
        previousYearJobCompletedDate: nonLtdFormData.previousYearJobCompletedDate ? new Date(nonLtdFormData.previousYearJobCompletedDate) : undefined,
        previousYearSA100FiledDate: nonLtdFormData.previousYearSA100FiledDate ? new Date(nonLtdFormData.previousYearSA100FiledDate) : undefined,
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
        
        // Store created client data for questionnaire
        setCreatedClient({
          id: data.data.id,
          companyName: data.data.companyName,
          companyNumber: data.data.companyNumber,
          clientCode: data.data.clientCode,
          companyType: data.data.companyType,
          createdAt: data.data.createdAt
        })
        
        // Show questionnaire modal instead of success modal
        setShowQuestionnaire(true)
        
        // Reset forms
        setFormData({
          clientCode: '',
          companyType: '',
          companyNumber: '',
        })
        setNonLtdFormData({
          clientName: '',
          contactEmail: '',
          contactPhone: '',
          contactFax: '',
          natureOfTrade: '',
          tradingAddressLine1: '',
          tradingAddressLine2: '',
          tradingAddressCountry: '',
          tradingAddressPostCode: '',
          residentialAddressLine1: '',
          residentialAddressLine2: '',
          residentialAddressCountry: '',
          residentialAddressPostCode: '',
          vatNumber: '',
          vatQuarters: '',
          nationalInsuranceNumber: '',
          utrNumber: '',
          paperworkFrequency: '',
          paperWorkReceived: false,
          paperWorkReceivedDate: '',
          jobCompleted: false,
          jobCompletedDate: '',
          sa100Filed: false,
          sa100FiledDate: '',
          workStatus: '',
          additionalComments: '',
          staff: '',
          previousYearEnded: '',
          previousYearWorkReceivedDate: '',
          previousYearJobCompletedDate: '',
          previousYearSA100FiledDate: '',
        })
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

  const handleQuestionnaireComplete = (updatedClient: any) => {
    // Update the created client data with questionnaire results
    setCreatedClient(updatedClient)
    
    // Hide questionnaire and show success modal
    setShowQuestionnaire(false)
    setShowSuccessModal(true)
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {formData.companyType === 'LIMITED_COMPANY' 
                    ? 'Add New Limited Company' 
                    : formData.companyType === 'NON_LIMITED_COMPANY'
                    ? 'Add New Non Limited Company'
                    : formData.companyType === 'DIRECTOR'
                    ? 'Add New Director'
                    : formData.companyType === 'SUB_CONTRACTOR'
                    ? 'Add New Sub Contractor'
                    : 'Add New Client'
                  }
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {formData.companyType === 'LIMITED_COMPANY'
                    ? 'Create a new limited company client with Companies House integration'
                    : formData.companyType === 'NON_LIMITED_COMPANY'
                    ? 'Create a new non limited company client record'
                    : 'Create a new client record with automatic data integration'
                  }
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

          {/* Client Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Client Type
              </CardTitle>
              <CardDescription>
                Select the type of client you want to add
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Limited Company Form */}
          {formData.companyType === 'LIMITED_COMPANY' && (
            <form onSubmit={handleLtdCompanySubmit}>
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
                              <div className="flex-1">
                                <p className="font-medium text-sm">{company.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {company.company_number} • {company.company_status}
                                </p>
                                {company.ownerDetails && company.ownerDetails.length > 0 ? (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Directors/Owners:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {company.ownerDetails
                                        .slice(0, 4)
                                        .map((owner, index) => (
                                          <Badge 
                                            key={`owner-${index}`} 
                                            variant={owner.status === 'active' ? "secondary" : "outline"} 
                                            className={`text-xs ${owner.status === 'resigned' ? 'opacity-70' : ''}`}
                                          >
                                            {owner.name}
                                            <span className={`ml-1 ${owner.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>●</span>
                                          </Badge>
                                        ))}
                                      {company.ownerDetails.length > 4 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{company.ownerDetails.length - 4} more
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <span className="text-green-600">●</span> Active • <span className="text-red-500">●</span> Resigned
                                    </p>
                                  </div>
                                ) : company.ownerNames && company.ownerNames.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Directors/Owners:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {company.ownerNames.slice(0, 4).map((name, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {name}
                                        </Badge>
                                      ))}
                                      {company.ownerNames.length > 4 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{company.ownerNames.length - 4} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
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
                        {selectedCompany.ownerNames && selectedCompany.ownerNames.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs font-medium">Directors/Owners:</span>
                            <div className="flex flex-wrap gap-1">
                              {selectedCompany.ownerNames.map((name, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !formData.companyType || (formData.companyType === 'LIMITED_COMPANY' && !formData.companyNumber)}
                    className="btn-primary"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
              </div>
            </form>
          )}

          {/* Non Limited Company Form */}
          {formData.companyType === 'NON_LIMITED_COMPANY' && (
            <NonLtdCompanyForm
              formData={nonLtdFormData}
              onFormDataChange={setNonLtdFormData}
              onSubmit={handleNonLtdCompanySubmit}
              loading={loading}
            />
          )}

          {/* Other Company Types (Directors, Sub Contractors) */}
          {(formData.companyType === 'DIRECTOR' || formData.companyType === 'SUB_CONTRACTOR') && (
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {formData.companyType === 'DIRECTOR' ? 'Director' : 'Sub Contractor'} Form
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Form for {formData.companyType === 'DIRECTOR' ? 'directors' : 'sub contractors'} will be implemented based on specific requirements.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setFormData(prev => ({ ...prev, companyType: '' }))}
                  className="btn-outline"
                >
                  Select Different Type
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Post-Creation Questionnaire */}
          {showQuestionnaire && createdClient && (
            <ClientPostCreationQuestionnaire
              client={createdClient}
              isOpen={showQuestionnaire}
              onComplete={handleQuestionnaireComplete}
            />
          )}

          {/* Success Modal */}
          {showSuccessModal && createdClient && (
            <ClientCreatedModal
              client={createdClient}
              isOpen={showSuccessModal}
              onClose={() => {
                setShowSuccessModal(false)
                setCreatedClient(null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
} 