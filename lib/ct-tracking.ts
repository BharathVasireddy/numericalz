/**
 * Corporation Tax Tracking Utilities
 * 
 * Implements smart CT due date management to prevent issues where:
 * - CT due dates get incorrectly updated when accounts are filed
 * - Previous CT periods are still pending
 * - Manual overrides are needed by accountants
 */

export type CTStatus = 'PENDING' | 'FILED' | 'OVERDUE'
export type CTDueSource = 'AUTO' | 'MANUAL'

export interface CTTrackingData {
  corporationTaxStatus: CTStatus | string | null
  corporationTaxPeriodStart: Date | string | null
  corporationTaxPeriodEnd: Date | string | null
  nextCorporationTaxDue: Date | string | null
  manualCTDueOverride: Date | string | null
  ctDueSource: CTDueSource | string | null
  lastCTStatusUpdate: Date | string | null
  ctStatusUpdatedBy: string | null
}

export interface CTUpdateResult {
  shouldUpdate: boolean
  newCTDue: Date | null
  newPeriodStart: Date | null
  newPeriodEnd: Date | null
  warnings: string[]
  reason: string
}

/**
 * Calculate the next CT due date from a given year end
 * CT is due 12 months after the end of the accounting period (year end)
 * 
 * IMPORTANT: This function calculates the CT600 FILING deadline, not payment deadline
 * - CT600 filing: 12 months after year end
 * - CT payment: 9 months and 1 day after year end (different deadline)
 */
export function calculateCTDueFromYearEnd(yearEndDate: Date): Date {
  const ctDue = new Date(yearEndDate)
  ctDue.setFullYear(ctDue.getFullYear() + 1)
  return ctDue
}

/**
 * Calculate CT period dates from last accounts and accounting reference date
 */
export function calculateCTPeriod(
  lastAccountsMadeUpTo: Date | null,
  accountingReferenceDate: string | null
): { periodStart: Date | null; periodEnd: Date | null } {
  let periodEnd: Date | null = null
  let periodStart: Date | null = null

  // Try to calculate from last accounts first (most accurate)
  if (lastAccountsMadeUpTo) {
    periodStart = new Date(lastAccountsMadeUpTo)
    periodStart.setDate(periodStart.getDate() + 1) // Day after last accounts
    
    periodEnd = new Date(lastAccountsMadeUpTo)
    periodEnd.setFullYear(periodEnd.getFullYear() + 1) // One year later
    
    return { periodStart, periodEnd }
  }

  // Fallback to accounting reference date
  if (accountingReferenceDate) {
    try {
      const parsed = JSON.parse(accountingReferenceDate)
      if (parsed.day && parsed.month) {
        const today = new Date()
        const currentYear = today.getFullYear()
        
        // Calculate current period end
        periodEnd = new Date(currentYear, parsed.month - 1, parsed.day)
        if (periodEnd < today) {
          periodEnd.setFullYear(currentYear + 1)
        }
        
        // Period start is one year before period end
        periodStart = new Date(periodEnd)
        periodStart.setFullYear(periodStart.getFullYear() - 1)
        periodStart.setDate(periodStart.getDate() + 1)
        
        return { periodStart, periodEnd }
      }
    } catch (e) {
      console.warn('Error parsing accounting reference date:', e)
    }
  }

  return { periodStart: null, periodEnd: null }
}

/**
 * Determine if CT status should be marked as overdue
 */
export function getCTStatus(
  currentStatus: CTStatus | string | null,
  ctDueDate: Date | string | null,
  currentDate: Date = new Date()
): CTStatus {
  if (currentStatus === 'FILED') return 'FILED'
  if (!ctDueDate) return 'PENDING'
  
  const dueDate = typeof ctDueDate === 'string' ? new Date(ctDueDate) : ctDueDate
  return dueDate < currentDate ? 'OVERDUE' : 'PENDING'
}

/**
 * Smart CT Due update logic - prevents incorrect updates
 */
export function shouldUpdateCTDue(
  currentData: Partial<CTTrackingData>,
  newYearEnd: Date,
  companiesHouseUpdated: boolean = false
): CTUpdateResult {
  const warnings: string[] = []
  
  // If manual override exists, don't auto-update
  if (currentData.ctDueSource === 'MANUAL' && currentData.manualCTDueOverride) {
    return {
      shouldUpdate: false,
      newCTDue: null,
      newPeriodStart: null,
      newPeriodEnd: null,
      warnings: ['Manual CT due override exists - auto-update skipped'],
      reason: 'Manual override active'
    }
  }

  // If previous CT period is still pending, be cautious
  if (currentData.corporationTaxStatus === 'PENDING' && currentData.nextCorporationTaxDue) {
    const existingCTDue = new Date(currentData.nextCorporationTaxDue)
    const newCTDue = calculateCTDueFromYearEnd(newYearEnd)
    
    // If the new CT due would be significantly different, warn
    const daysDifference = Math.abs(newCTDue.getTime() - existingCTDue.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDifference > 30 && companiesHouseUpdated) {
      warnings.push(
        `Previous CT period (due ${existingCTDue.toLocaleDateString('en-GB')}) is still PENDING. ` +
        `New calculation would be ${newCTDue.toLocaleDateString('en-GB')}. ` +
        `Please verify if previous CT was filed before updating.`
      )
      
      return {
        shouldUpdate: false,
        newCTDue: null,
        newPeriodStart: null,
        newPeriodEnd: null,
        warnings,
        reason: 'Previous CT period still pending with significant date change'
      }
    }
  }

  // Safe to update - calculate new period
  const { periodStart, periodEnd } = calculateCTPeriod(null, null)
  const newCTDue = calculateCTDueFromYearEnd(newYearEnd)
  
  return {
    shouldUpdate: true,
    newCTDue,
    newPeriodStart: newYearEnd ? new Date(newYearEnd.getTime() - (365 * 24 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000)) : null,
    newPeriodEnd: newYearEnd,
    warnings,
    reason: 'Safe to update CT due date'
  }
}

/**
 * Mark CT as filed and advance to next period
 */
export function markCTAsFiled(
  currentData: Partial<CTTrackingData>,
  filedByUserId: string,
  nextYearEnd?: Date | null
): Partial<CTTrackingData> {
  const now = new Date()
  
  // Calculate next period if year end provided
  let nextCTDue: Date | null = null
  let nextPeriodStart: Date | null = null
  let nextPeriodEnd: Date | null = nextYearEnd || null
  
  if (nextYearEnd) {
    nextCTDue = calculateCTDueFromYearEnd(nextYearEnd)
    nextPeriodStart = currentData.corporationTaxPeriodEnd ? 
      new Date((typeof currentData.corporationTaxPeriodEnd === 'string' ? new Date(currentData.corporationTaxPeriodEnd) : currentData.corporationTaxPeriodEnd).getTime() + (24 * 60 * 60 * 1000)) : null
    nextPeriodEnd = nextYearEnd
  }
  
  return {
    corporationTaxStatus: 'FILED',
    nextCorporationTaxDue: nextCTDue,
    corporationTaxPeriodStart: nextPeriodStart,
    corporationTaxPeriodEnd: nextPeriodEnd,
    manualCTDueOverride: null, // Clear manual override
    ctDueSource: 'AUTO',
    lastCTStatusUpdate: now,
    ctStatusUpdatedBy: filedByUserId
  }
}

/**
 * Set manual CT due override
 */
export function setManualCTDue(
  manualDueDate: Date,
  updatedByUserId: string
): Partial<CTTrackingData> {
  const now = new Date()
  
  return {
    nextCorporationTaxDue: manualDueDate,
    manualCTDueOverride: manualDueDate,
    ctDueSource: 'MANUAL',
    lastCTStatusUpdate: now,
    ctStatusUpdatedBy: updatedByUserId
  }
}

/**
 * Reset to auto-calculated CT due
 */
export function resetToAutoCTDue(
  yearEnd: Date,
  updatedByUserId: string
): Partial<CTTrackingData> {
  const now = new Date()
  const autoCTDue = calculateCTDueFromYearEnd(yearEnd)
  
  return {
    nextCorporationTaxDue: autoCTDue,
    manualCTDueOverride: null,
    ctDueSource: 'AUTO',
    lastCTStatusUpdate: now,
    ctStatusUpdatedBy: updatedByUserId
  }
}

/**
 * Get CT tracking summary for display
 */
export function getCTTrackingSummary(data: Partial<CTTrackingData>): {
  status: string
  dueDate: string
  source: string
  periodInfo: string
  warnings: string[]
} {
  const warnings: string[] = []
  
  // Check for overdue
  if (data.corporationTaxStatus === 'OVERDUE') {
    warnings.push('Corporation Tax is overdue')
  }
  
  // Check for manual override
  if (data.ctDueSource === 'MANUAL') {
    warnings.push('CT due date has been manually overridden')
  }
  
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Not set'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }
  
  return {
    status: (data.corporationTaxStatus as string) || 'PENDING',
    dueDate: formatDate(data.nextCorporationTaxDue),
    source: (data.ctDueSource as string) || 'AUTO',
    periodInfo: data.corporationTaxPeriodStart && data.corporationTaxPeriodEnd ?
      `${formatDate(data.corporationTaxPeriodStart)} to ${formatDate(data.corporationTaxPeriodEnd)}` :
      'Period not set',
    warnings
  }
} 