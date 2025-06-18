/**
 * VAT Workflow Utilities
 * Handles UK VAT quarter calculations, deadline management, and workflow automation
 */

export interface VATQuarterInfo {
  quarterPeriod: string
  quarterStartDate: Date
  quarterEndDate: Date
  filingDueDate: Date
  quarterGroup: string
}

/**
 * Calculate VAT quarter information based on quarter group and current date
 */
export function calculateVATQuarter(
  quarterGroup: string,
  referenceDate: Date = new Date()
): VATQuarterInfo {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1 // JavaScript months are 0-indexed

  // Determine which quarter we're currently in based on the group
  let quarterEndMonth: number
  let quarterEndYear = year

  switch (quarterGroup) {
    case "1/4/7/10":
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

    case "2/5/8/11":
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

    case "3/6/9/12":
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
      throw new Error(`Invalid quarter group: ${quarterGroup}`)
  }

  // Calculate quarter end date (last day of the month)
  const quarterEndDate = new Date(quarterEndYear, quarterEndMonth - 1, 1)
  quarterEndDate.setMonth(quarterEndDate.getMonth() + 1)
  quarterEndDate.setDate(0) // Last day of previous month

  // Calculate quarter start date (3 months before end date)
  const quarterStartDate = new Date(quarterEndDate)
  quarterStartDate.setMonth(quarterStartDate.getMonth() - 2)
  quarterStartDate.setDate(1) // First day of the month

  // Calculate filing due date (1 month + 7 days after quarter end)
  const filingDueDate = new Date(quarterEndDate)
  filingDueDate.setMonth(filingDueDate.getMonth() + 1)
  filingDueDate.setDate(7)

  // Generate quarter period string
  const quarterPeriod = `${formatDate(quarterStartDate)}_to_${formatDate(quarterEndDate)}`

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
 */
export function isVATQuarterOverdue(filingDueDate: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dueDate = new Date(filingDueDate)
  dueDate.setHours(0, 0, 0, 0)
  
  return today > dueDate
}

/**
 * Get days until VAT filing deadline
 */
export function getDaysUntilVATDeadline(filingDueDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dueDate = new Date(filingDueDate)
  dueDate.setHours(0, 0, 0, 0)
  
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!
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
  
  const startMonth = startDate.toLocaleDateString('en-GB', { month: 'short' })
  const startYear = startDate.getFullYear()
  const endMonth = endDate.toLocaleDateString('en-GB', { month: 'short' })
  const endYear = endDate.getFullYear()
  
  if (startYear === endYear) {
    return `${startMonth} - ${endMonth} ${endYear}`
  } else {
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`
  }
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  const diffTime = end.getTime() - start.getTime()
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