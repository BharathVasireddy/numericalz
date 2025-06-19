/**
 * VAT Workflow Management System
 * 
 * Handles VAT quarter calculations, deadlines, and workflow stages
 * All dates are calculated in London timezone (Europe/London) for UK compliance
 */

export interface VATQuarterInfo {
  quarterPeriod: string
  quarterStartDate: Date
  quarterEndDate: Date
  filingDueDate: Date
  quarterGroup: string
}

/**
 * Calculate VAT quarter information based on quarter group and reference date
 * All calculations use London timezone for UK compliance
 */
export function calculateVATQuarter(
  quarterGroup: string,
  referenceDate: Date = new Date()
): VATQuarterInfo {
  // Convert reference date to London timezone
  const londonDate = new Date(referenceDate.toLocaleString('en-US', { timeZone: 'Europe/London' }))
  const year = londonDate.getFullYear()
  const month = londonDate.getMonth() + 1 // JavaScript months are 0-indexed

  let quarterEndMonth: number
  let quarterEndYear = year

  // Handle quarter groups with underscore format
  switch (quarterGroup) {
    case "1_4_7_10":
      if (month <= 1) {
        quarterEndMonth = 1 // January
      } else if (month <= 4) {
        quarterEndMonth = 4 // April
      } else if (month <= 7) {
        quarterEndMonth = 7 // July
      } else if (month <= 10) {
        quarterEndMonth = 10 // October
      } else {
        quarterEndMonth = 1 // January of next year
        quarterEndYear = year + 1
      }
      break

    case "2_5_8_11":
      if (month <= 2) {
        quarterEndMonth = 2 // February
      } else if (month <= 5) {
        quarterEndMonth = 5 // May
      } else if (month <= 8) {
        quarterEndMonth = 8 // August
      } else if (month <= 11) {
        quarterEndMonth = 11 // November
      } else {
        quarterEndMonth = 2 // February of next year
        quarterEndYear = year + 1
      }
      break

    case "3_6_9_12":
      if (month <= 3) {
        quarterEndMonth = 3 // March
      } else if (month <= 6) {
        quarterEndMonth = 6 // June
      } else if (month <= 9) {
        quarterEndMonth = 9 // September
      } else if (month <= 12) {
        quarterEndMonth = 12 // December
      } else {
        quarterEndMonth = 3 // March of next year
        quarterEndYear = year + 1
      }
      break

    default:
      throw new Error(`Invalid quarter group: ${quarterGroup}. Expected format: "1_4_7_10", "2_5_8_11", or "3_6_9_12"`)
  }

  // Calculate quarter end date (last day of the quarter month) in London timezone
  const quarterEndDate = new Date(quarterEndYear, quarterEndMonth, 0) // Last day of quarterEndMonth

  // Calculate quarter start date (3 months before end date)
  const quarterStartDate = new Date(quarterEndDate)
  quarterStartDate.setMonth(quarterStartDate.getMonth() - 2)
  quarterStartDate.setDate(1) // First day of the month

  // Calculate filing due date (last day of the month following quarter end)
  // UK VAT Rule: Filing due by the last day of the month following the quarter end
  // Example: June 30th quarter end → July 31st filing deadline
  const filingDueDate = new Date(quarterEndYear, quarterEndMonth + 1, 0) // Last day of month after quarter end

  // Generate quarter period string
  const quarterPeriod = `${formatDateForLondon(quarterStartDate)}_to_${formatDateForLondon(quarterEndDate)}`

  return {
    quarterPeriod,
    quarterStartDate,
    quarterEndDate,
    filingDueDate,
    quarterGroup
  }
}

/**
 * Get the next VAT quarter for a given quarter group
 */
export function getNextVATQuarter(quarterGroup: string, currentQuarterEndDate: Date): VATQuarterInfo {
  // Add 3 months to get to the next quarter
  const nextQuarterReference = new Date(currentQuarterEndDate)
  nextQuarterReference.setMonth(nextQuarterReference.getMonth() + 3)
  
  return calculateVATQuarter(quarterGroup, nextQuarterReference)
}

/**
 * Check if a VAT quarter is overdue based on filing due date
 * Uses London timezone for comparison
 */
export function isVATQuarterOverdue(filingDueDate: Date): boolean {
  const londonNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
  londonNow.setHours(0, 0, 0, 0)
  
  const dueDate = new Date(filingDueDate)
  dueDate.setHours(0, 0, 0, 0)
  
  return londonNow > dueDate
}

/**
 * Get days until VAT filing deadline
 * Uses London timezone for calculation
 */
export function getDaysUntilVATDeadline(filingDueDate: Date): number {
  const londonNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }))
  londonNow.setHours(0, 0, 0, 0)
  
  const dueDate = new Date(filingDueDate)
  dueDate.setHours(0, 0, 0, 0)
  
  const diffTime = dueDate.getTime() - londonNow.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format date as YYYY-MM-DD in London timezone
 */
function formatDateForLondon(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) // en-CA gives YYYY-MM-DD format
}

/**
 * Format date as YYYY-MM-DD (legacy function for compatibility)
 */
function formatDate(date: Date): string {
  return formatDateForLondon(date)
}

/**
 * Parse quarter period string back to dates
 */
export function parseQuarterPeriod(quarterPeriod: string): {
  startDate: Date
  endDate: Date
} {
  const parts = quarterPeriod.split('_to_')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid quarter period format: ${quarterPeriod}`)
  }
  const [startStr, endStr] = parts
  return {
    startDate: new Date(startStr),
    endDate: new Date(endStr)
  }
}

/**
 * Generate quarter period string for display
 */
export function formatQuarterPeriodForDisplay(quarterPeriod: string): string {
  const { startDate, endDate } = parseQuarterPeriod(quarterPeriod)
  
  const startMonth = startDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
  const startYear = startDate.getFullYear()
  const endMonth = endDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
  const endYear = endDate.getFullYear()
  
  if (startYear === endYear) {
    return `${startMonth} - ${endMonth} ${endYear}`
  } else {
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`
  }
}

/**
 * Calculate days between two dates using London timezone
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  // Convert both dates to London timezone for accurate calculation
  const londonStart = new Date(startDate.toLocaleString('en-US', { timeZone: 'Europe/London' }))
  londonStart.setHours(0, 0, 0, 0)
  
  const londonEnd = new Date(endDate.toLocaleString('en-US', { timeZone: 'Europe/London' }))
  londonEnd.setHours(0, 0, 0, 0)
  
  const diffTime = londonEnd.getTime() - londonStart.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * VAT Workflow Stage Display Names
 */
export const VAT_WORKFLOW_STAGE_NAMES = {
  CLIENT_BOOKKEEPING: "Client to do bookkeeping",
  WORK_IN_PROGRESS: "Work in progress",
  QUERIES_PENDING: "Queries pending",
  REVIEW_PENDING_MANAGER: "Review pending by manager",
  REVIEW_PENDING_PARTNER: "Review pending by partner",
  EMAILED_TO_PARTNER: "Emailed to partner",
  EMAILED_TO_CLIENT: "Emailed to client",
  CLIENT_APPROVED: "Client approved",
  FILED_TO_HMRC: "Filed to HMRC"
} as const

/**
 * Get the next stage in the VAT workflow
 */
export function getNextVATWorkflowStage(currentStage: string): string | null {
  const stages = Object.keys(VAT_WORKFLOW_STAGE_NAMES)
  const currentIndex = stages.indexOf(currentStage)
  
  if (currentIndex === -1 || currentIndex === stages.length - 1) {
    return null // Invalid stage or already at final stage
  }
  
  return stages[currentIndex + 1] || null
}

/**
 * Check if a stage requires manager/partner review or email
 */
export function stageRequiresNotification(stage: string): boolean {
  return [
    'REVIEW_PENDING_MANAGER',
    'REVIEW_PENDING_PARTNER',
    'EMAILED_TO_PARTNER',
    'EMAILED_TO_CLIENT'
  ].includes(stage)
} 