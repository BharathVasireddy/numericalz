/**
 * Companies House API Client
 * 
 * Provides functions to interact with the UK Companies House API
 * Documentation: https://developer.company-information.service.gov.uk/
 */

import { calculateCorporationTaxDue } from '@/lib/year-end-utils'

const COMPANIES_HOUSE_BASE_URL = 'https://api.company-information.service.gov.uk'
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY

if (!API_KEY) {
  console.warn('COMPANIES_HOUSE_API_KEY not found in environment variables')
}

// Rate limiting: 600 requests per 5 minutes
const RATE_LIMIT = {
  requests: 600,
  windowMs: 5 * 60 * 1000, // 5 minutes
}

interface CompaniesHouseAddress {
  address_line_1?: string
  address_line_2?: string
  locality?: string
  region?: string
  postal_code?: string
  country?: string
}

interface CompaniesHouseAccounts {
  next_due?: string
  next_made_up_to?: string  // Year end date from Companies House
  last_accounts?: {
    made_up_to?: string
    type?: string
  }
  accounting_reference_date?: {
    day?: string
    month?: string
  }
}

interface CompaniesHouseConfirmationStatement {
  next_due?: string
  last_made_up_to?: string
}

interface CompaniesHouseOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  date_of_birth?: {
    month?: number;
    year?: number;
  };
  nationality?: string;
  occupation?: string;
}

interface CompaniesHousePersonWithSignificantControl {
  name?: string;
  kind: string;
  natures_of_control?: string[];
  notified_on?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  date_of_birth?: {
    month?: number;
    year?: number;
  };
  nationality?: string;
}

export interface CompaniesHouseCompany {
  company_number: string
  company_name: string
  company_status: string
  company_status_detail?: string
  type: string
  date_of_creation?: string
  date_of_cessation?: string
  registered_office_address?: CompaniesHouseAddress
  sic_codes?: string[]
  accounts?: CompaniesHouseAccounts
  confirmation_statement?: CompaniesHouseConfirmationStatement
  jurisdiction?: string
  has_been_liquidated?: boolean
  has_charges?: boolean
  has_insolvency_history?: boolean
}

export interface CompaniesHouseSearchResult {
  company_number: string
  title: string
  company_status: string
  company_type: string
  date_of_creation?: string
  address?: CompaniesHouseAddress
}

export interface CompaniesHouseSearchResponse {
  items: CompaniesHouseSearchResult[]
  items_per_page: number
  start_index: number
  total_results: number
}

/**
 * Make authenticated request to Companies House API
 */
async function makeRequest(endpoint: string): Promise<any> {
  if (!API_KEY) {
    throw new Error('Companies House API key not configured')
  }

  const url = `${COMPANIES_HOUSE_BASE_URL}${endpoint}`
  const auth = Buffer.from(`${API_KEY}:`).toString('base64')

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data from Companies House
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Company not found')
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      if (response.status === 401) {
        throw new Error('Invalid API key')
      }
      throw new Error(`Companies House API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to connect to Companies House API')
  }
}

/**
 * Search for companies by name or number
 */
export async function searchCompanies(
  query: string,
  itemsPerPage: number = 20,
  startIndex: number = 0
): Promise<CompaniesHouseSearchResponse> {
  const endpoint = `/search/companies?q=${encodeURIComponent(query)}&items_per_page=${itemsPerPage}&start_index=${startIndex}`
  return await makeRequest(endpoint)
}

/**
 * Get detailed company information by company number
 */
export async function getCompanyDetails(companyNumber: string): Promise<CompaniesHouseCompany> {
  const cleanNumber = companyNumber.replace(/\s/g, '').toUpperCase()
  const endpoint = `/company/${cleanNumber}`
  return await makeRequest(endpoint)
}

/**
 * Get company officers (directors) by company number
 */
export async function getCompanyOfficers(companyNumber: string): Promise<any> {
  const cleanNumber = companyNumber.replace(/\s/g, '').toUpperCase()
  const endpoint = `/company/${cleanNumber}/officers`
  return await makeRequest(endpoint)
}

/**
 * Get persons with significant control (PSC) by company number
 */
export async function getCompanyPSC(companyNumber: string): Promise<any> {
  const cleanNumber = companyNumber.replace(/\s/g, '').toUpperCase()
  const endpoint = `/company/${cleanNumber}/persons-with-significant-control`
  return await makeRequest(endpoint)
}

/**
 * Get comprehensive company data including officers and PSC
 */
export async function getComprehensiveCompanyData(companyNumber: string): Promise<{
  company: CompaniesHouseCompany | null
  officers: any
  psc: any
}> {
  const cleanNumber = companyNumber.replace(/\s/g, '').toUpperCase()
  
  try {
    // Fetch all data in parallel
    const [company, officers, psc] = await Promise.allSettled([
      getCompanyDetails(cleanNumber),
      getCompanyOfficers(cleanNumber),
      getCompanyPSC(cleanNumber)
    ])

    return {
      company: company.status === 'fulfilled' ? company.value : null,
      officers: officers.status === 'fulfilled' ? officers.value : null,
      psc: psc.status === 'fulfilled' ? psc.value : null
    }
  } catch (error) {
    // If main company data fails, throw error
    // Officers and PSC are optional
    const company = await getCompanyDetails(cleanNumber)
    return {
      company,
      officers: null,
      psc: null
    }
  }
}

/**
 * Transform Companies House data to our database format
 */
export function transformCompaniesHouseData(
  chData: CompaniesHouseCompany,
  userInput: {
    contactName: string
    contactEmail: string
    contactPhone?: string
    website?: string
    tradingAddress?: string
    residentialAddress?: string
    yearEstablished?: number
    numberOfEmployees?: number
    annualTurnover?: number
    assignedUserId?: string
    notes?: string
  },
  officers?: any,
  psc?: any
) {
  // Only calculate year end and CT due dates - use Companies House data for accounts due
  const clientDataForCalculation = {
    accountingReferenceDate: chData.accounts?.accounting_reference_date ? JSON.stringify(chData.accounts.accounting_reference_date) : null,
    lastAccountsMadeUpTo: chData.accounts?.last_accounts?.made_up_to ? new Date(chData.accounts.last_accounts.made_up_to) : null,
    incorporationDate: chData.date_of_creation ? new Date(chData.date_of_creation) : null,
    nextMadeUpTo: chData.accounts?.next_made_up_to ? new Date(chData.accounts.next_made_up_to) : null
  }
  
  const calculatedCTDue = calculateCorporationTaxDue(clientDataForCalculation)

  return {
    companyNumber: chData.company_number,
    companyName: chData.company_name,
    companyType: mapCompanyType(chData.type),
    companyStatus: chData.company_status,
    companyStatusDetail: chData.company_status_detail || null,
    incorporationDate: chData.date_of_creation ? new Date(chData.date_of_creation) : null,
    cessationDate: chData.date_of_cessation ? new Date(chData.date_of_cessation) : null,
    registeredOfficeAddress: chData.registered_office_address ? JSON.stringify(chData.registered_office_address) : null,
    sicCodes: chData.sic_codes ? JSON.stringify(chData.sic_codes) : null,
    // 🎯 CRITICAL: Use Companies House accounts due date directly (official HMRC deadline)
    nextAccountsDue: chData.accounts?.next_due ? new Date(chData.accounts.next_due) : null,
    // 🎯 NEW: Store Companies House official year end date
    nextYearEnd: chData.accounts?.next_made_up_to ? new Date(chData.accounts.next_made_up_to) : null,
    // Only calculate CT due date (12 months after year end)
    nextCorporationTaxDue: calculatedCTDue,
    // Keep Companies House reference data for future calculations
    lastAccountsMadeUpTo: chData.accounts?.last_accounts?.made_up_to ? new Date(chData.accounts.last_accounts.made_up_to) : null,
    accountingReferenceDate: chData.accounts?.accounting_reference_date ? JSON.stringify(chData.accounts.accounting_reference_date) : null,
    // Confirmation statements come from Companies House (we don't calculate these)
    nextConfirmationDue: chData.confirmation_statement?.next_due ? new Date(chData.confirmation_statement.next_due) : null,
    lastConfirmationMadeUpTo: chData.confirmation_statement?.last_made_up_to ? new Date(chData.confirmation_statement.last_made_up_to) : null,
    jurisdiction: chData.jurisdiction || null,
    hasBeenLiquidated: chData.has_been_liquidated || false,
    hasCharges: chData.has_charges || false,
    hasInsolvencyHistory: chData.has_insolvency_history || false,
    
    // Officers and PSC data
    officers: officers ? JSON.stringify(officers) : null,
    personsWithSignificantControl: psc ? JSON.stringify(psc) : null,
    
    // User input fields
    contactName: userInput.contactName,
    contactEmail: userInput.contactEmail,
    contactPhone: userInput.contactPhone || null,
    website: userInput.website || null,
    tradingAddress: userInput.tradingAddress || null,
    residentialAddress: userInput.residentialAddress || null,
    yearEstablished: userInput.yearEstablished || null,
    numberOfEmployees: userInput.numberOfEmployees || null,
    annualTurnover: userInput.annualTurnover || null,
    assignedUserId: userInput.assignedUserId || null,
    notes: userInput.notes || null,
  }
}

/**
 * Map Companies House company types to our 4 types
 */
export function mapCompanyType(chType: string): string {
  const typeMapping: Record<string, string> = {
    'ltd': 'LIMITED_COMPANY',
    'plc': 'LIMITED_COMPANY',
    'llp': 'NON_LIMITED_COMPANY',
    'partnership': 'NON_LIMITED_COMPANY',
    'sole-trader': 'NON_LIMITED_COMPANY',
    'private-unlimited': 'NON_LIMITED_COMPANY',
    'private-limited-guarant-nsc': 'NON_LIMITED_COMPANY',
    'private-limited-guarant-nsc-limited-exemption': 'NON_LIMITED_COMPANY',
    'other': 'NON_LIMITED_COMPANY'
  }
  
  return typeMapping[chType.toLowerCase()] || 'NON_LIMITED_COMPANY'
}

/**
 * Validate UK company number format
 */
export function isValidCompanyNumber(companyNumber: string): boolean {
  // UK company numbers are 8 digits, sometimes prefixed with letters
  const regex = /^([A-Z]{0,2})?(\d{6,8})$/
  return regex.test(companyNumber.toUpperCase().replace(/\s/g, ''))
}

/**
 * Format company number for display
 */
export function formatCompanyNumber(companyNumber: string): string {
  const cleaned = companyNumber.toUpperCase().replace(/\s/g, '')
  if (cleaned.length === 8 && /^\d+$/.test(cleaned)) {
    return cleaned.replace(/(\d{2})(\d{6})/, '$1$2')
  }
  return cleaned
}

export interface CompanyData {
  // ... existing fields ...
  officers?: CompaniesHouseOfficer[];
  personsWithSignificantControl?: CompaniesHousePersonWithSignificantControl[];
  // ... existing code ...
} 