/**
 * Centralized Year End Calculation Utilities
 * 
 * This module provides consistent year end calculation logic across all pages
 * to avoid code duplication and ensure consistency.
 */

export interface ClientYearEndData {
  accountingReferenceDate?: string | null
  lastAccountsMadeUpTo?: string | Date | null
  incorporationDate?: string | Date | null
  nextAccountsDue?: string | Date | null
}

/**
 * Calculate the correct year end date based on UK accounting rules
 * 
 * Priority order:
 * 1. If company has filed accounts before → last accounts + 1 year
 * 2. If first-time filer → calculate first year end after incorporation (6-18 month rule)
 * 3. Fallback → current/next year based on accounting reference date
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Date object representing the year end, or null if cannot calculate
 */
export function calculateYearEnd(clientData: ClientYearEndData): Date | null {
  const { accountingReferenceDate, lastAccountsMadeUpTo, incorporationDate } = clientData
  
  // Priority 1: If company has filed accounts before, calculate next year end from that
  if (lastAccountsMadeUpTo) {
    try {
      const lastAccountsDate = typeof lastAccountsMadeUpTo === 'string' 
        ? new Date(lastAccountsMadeUpTo) 
        : lastAccountsMadeUpTo
        
      if (!isNaN(lastAccountsDate.getTime())) {
        // Next year end is one year after last accounts made up to
        const nextYearEnd = new Date(lastAccountsDate)
        nextYearEnd.setFullYear(nextYearEnd.getFullYear() + 1)
        return nextYearEnd
      }
    } catch (e) {
      console.warn('Error parsing last accounts date:', e)
    }
  }
  
  // Priority 2: Parse accounting reference date
  if (!accountingReferenceDate) return null
  
  try {
    // Handle both ISO date format (from API transformation) and JSON format (original)
    
    // First, try to parse as ISO date (API transformed format)
    const isoDate = new Date(accountingReferenceDate)
    if (!isNaN(isoDate.getTime()) && accountingReferenceDate.includes('T')) {
      // This is already the calculated year end date from the API
      return isoDate
    }
    
    // Parse JSON format from Companies House
    const parsed = JSON.parse(accountingReferenceDate)
    if (!parsed.day || !parsed.month) return null
    
    const today = new Date()
    const currentYear = today.getFullYear()
    
    // Priority 2a: First-time filer logic
    if (!lastAccountsMadeUpTo && incorporationDate) {
      const incorpDate = typeof incorporationDate === 'string' 
        ? new Date(incorporationDate) 
        : incorporationDate
        
      if (!isNaN(incorpDate.getTime())) {
        const incorpYear = incorpDate.getFullYear()
        
        // Calculate first accounting reference date after incorporation
        let firstYearEnd = new Date(incorpYear, parseInt(parsed.month) - 1, parseInt(parsed.day))
        
        // UK Rule: First accounting period must be at least 6 months but can be up to 18 months
        // If the ARD in incorporation year is too close (less than 6 months), use next year
        const monthsDifference = (firstYearEnd.getTime() - incorpDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        
        if (firstYearEnd <= incorpDate || monthsDifference < 6) {
          firstYearEnd.setFullYear(incorpYear + 1)
        }
        
        return firstYearEnd
      }
    }
    
    // Priority 2b: Established company logic
    let yearEnd = new Date(currentYear, parseInt(parsed.month) - 1, parseInt(parsed.day))
    
    // If this year's year end has passed, use next year
    if (yearEnd <= today) {
      yearEnd.setFullYear(currentYear + 1)
    }
    
    return yearEnd
    
  } catch (e) {
    console.warn('Error parsing accounting reference date:', e)
    
    // Final fallback: try to parse as regular date string
    try {
      const date = new Date(accountingReferenceDate)
      return isNaN(date.getTime()) ? null : date
    } catch (e) {
      return null
    }
  }
}

/**
 * Format year end date for display
 * 
 * @param clientData - Client data containing relevant dates
 * @param format - Display format ('short' for "30 Sept 2024", 'numeric' for "30/09/2024")
 * @returns Formatted date string or fallback message
 */
export function formatYearEnd(
  clientData: ClientYearEndData, 
  format: 'short' | 'numeric' = 'short',
  fallback: string = 'Not set'
): string {
  const yearEnd = calculateYearEnd(clientData)
  
  if (!yearEnd) return fallback
  
  return yearEnd.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: format === 'short' ? 'short' : '2-digit',
    year: 'numeric'
  })
}

/**
 * Get year end for display in tables (compact format)
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Formatted date string or "—" for empty
 */
export function getYearEndForTable(clientData: ClientYearEndData): string {
  return formatYearEnd(clientData, 'short', '—')
}

/**
 * Get year end for forms (with "Not set" fallback)
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Formatted date string or "Not set"
 */
export function getYearEndForForm(clientData: ClientYearEndData): string {
  return formatYearEnd(clientData, 'short', 'Not set')
}

/**
 * Calculate Corporation Tax due date from year end
 * CT due = 12 months after year end (UK standard)
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Date object representing CT due date, or null if cannot calculate
 */
export function calculateCorporationTaxDue(clientData: ClientYearEndData): Date | null {
  const yearEnd = calculateYearEnd(clientData)
  if (!yearEnd) return null
  
  const ctDue = new Date(yearEnd)
  ctDue.setFullYear(ctDue.getFullYear() + 1)
  return ctDue
}

/**
 * Format Corporation Tax due date for display
 * 
 * @param clientData - Client data containing relevant dates
 * @param format - Display format
 * @returns Formatted CT due date string
 */
export function formatCorporationTaxDue(
  clientData: ClientYearEndData,
  format: 'short' | 'numeric' = 'numeric',
  fallback: string = 'Not set'
): string {
  const ctDue = calculateCorporationTaxDue(clientData)
  
  if (!ctDue) return fallback
  
  return ctDue.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: format === 'short' ? 'short' : '2-digit',
    year: 'numeric'
  })
}

/**
 * Calculate Accounts due date from year end
 * Accounts due = 9 months after year end (UK standard)
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Date object representing accounts due date, or null if cannot calculate
 */
export function calculateAccountsDue(clientData: ClientYearEndData): Date | null {
  const yearEnd = calculateYearEnd(clientData)
  if (!yearEnd) return null
  
  const accountsDue = new Date(yearEnd)
  accountsDue.setMonth(accountsDue.getMonth() + 9)
  return accountsDue
}

/**
 * Format Accounts due date for display
 * 
 * @param clientData - Client data containing relevant dates
 * @param format - Display format
 * @returns Formatted accounts due date string
 */
export function formatAccountsDue(
  clientData: ClientYearEndData,
  format: 'short' | 'numeric' = 'numeric',
  fallback: string = 'Not set'
): string {
  const accountsDue = calculateAccountsDue(clientData)
  
  if (!accountsDue) return fallback
  
  return accountsDue.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: format === 'short' ? 'short' : '2-digit',
    year: 'numeric'
  })
}

/**
 * Calculate all statutory dates for a company
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Object containing all calculated dates
 */
export function calculateAllStatutoryDates(clientData: ClientYearEndData) {
  const yearEnd = calculateYearEnd(clientData)
  const accountsDue = calculateAccountsDue(clientData)
  const ctDue = calculateCorporationTaxDue(clientData)
  
  return {
    yearEnd,
    accountsDue,
    corporationTaxDue: ctDue,
    // Add more statutory dates as needed
    formatted: {
      yearEnd: formatYearEnd(clientData),
      accountsDue: formatAccountsDue(clientData),
      corporationTaxDue: formatCorporationTaxDue(clientData)
    }
  }
}

/**
 * Validate if database dates match calculated dates
 * 
 * @param clientData - Client data with database dates
 * @param calculatedDates - Calculated dates from statutory rules
 * @returns Validation results with discrepancies
 */
export function validateStatutoryDates(
  clientData: ClientYearEndData & {
    nextAccountsDue?: string | Date | null
    nextCorporationTaxDue?: string | Date | null
  },
  calculatedDates: ReturnType<typeof calculateAllStatutoryDates>
) {
  const results = {
    yearEnd: { consistent: true, dbValue: null as string | null, calculatedValue: null as string | null },
    accountsDue: { consistent: true, dbValue: null as string | null, calculatedValue: null as string | null },
    corporationTaxDue: { consistent: true, dbValue: null as string | null, calculatedValue: null as string | null }
  }
  
  // Check accounts due
  if (clientData.nextAccountsDue && calculatedDates.accountsDue) {
    const dbDate = typeof clientData.nextAccountsDue === 'string' 
      ? new Date(clientData.nextAccountsDue) 
      : clientData.nextAccountsDue
    
    results.accountsDue.dbValue = dbDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    results.accountsDue.calculatedValue = calculatedDates.formatted.accountsDue
    results.accountsDue.consistent = results.accountsDue.dbValue === results.accountsDue.calculatedValue
  }
  
  // Check corporation tax due
  if (clientData.nextCorporationTaxDue && calculatedDates.corporationTaxDue) {
    const dbDate = typeof clientData.nextCorporationTaxDue === 'string' 
      ? new Date(clientData.nextCorporationTaxDue) 
      : clientData.nextCorporationTaxDue
    
    results.corporationTaxDue.dbValue = dbDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    results.corporationTaxDue.calculatedValue = calculatedDates.formatted.corporationTaxDue
    results.corporationTaxDue.consistent = results.corporationTaxDue.dbValue === results.corporationTaxDue.calculatedValue
  }
  
  return results
} 