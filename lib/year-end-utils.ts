/**
 * Centralized Year End Calculation Utilities
 * 
 * This module provides consistent year end calculation logic across all pages
 * to avoid code duplication and ensure consistency.
 */

export interface ClientYearEndData {
  lastAccountsMadeUpTo?: string | Date | null
  incorporationDate?: string | Date | null
  nextAccountsDue?: string | Date | null
  nextYearEnd?: string | Date | null  // Companies House official year end date (next_made_up_to)
}



/**
 * Calculate the correct year end date based on UK accounting rules
 * 
 * Priority order:
 * 1. Use Companies House next_made_up_to if available (official year end) 
 * 2. Use last accounts made up to date + 1 year (established companies)
 * 3. Use incorporation date + 12 months (fallback for new companies)
 * 
 * @param clientData - Client data containing relevant dates
 * @returns Date object representing the year end, or null if cannot calculate
 */
export function calculateYearEnd(clientData: ClientYearEndData): Date | null {
  // Priority 1: Use Companies House official year end date if available
  if (clientData.nextYearEnd) {
    try {
      const yearEndDate = new Date(clientData.nextYearEnd)
      if (!isNaN(yearEndDate.getTime())) {
        return yearEndDate
      }
    } catch (e) {
      console.warn('Error parsing Companies House year end date:', e)
    }
  }
  
  // Priority 2: Use last accounts made up to date + 1 year
  if (clientData.lastAccountsMadeUpTo) {
    try {
      const lastAccountsDate = new Date(clientData.lastAccountsMadeUpTo)
      if (!isNaN(lastAccountsDate.getTime())) {
        // Add one year to last accounts made up to date
        lastAccountsDate.setFullYear(lastAccountsDate.getFullYear() + 1)
        return lastAccountsDate
      }
    } catch (error) {
      console.warn('Error parsing last accounts made up to date:', error)
    }
  }
  
  // Priority 3: Use incorporation date + 12 months (fallback)
  if (clientData.incorporationDate) {
    try {
      const incorpDate = new Date(clientData.incorporationDate)
      if (!isNaN(incorpDate.getTime())) {
        incorpDate.setFullYear(incorpDate.getFullYear() + 1)
        return incorpDate
      }
    } catch (error) {
      console.warn('Error parsing incorporation date:', error)
    }
  }
  
  return null
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