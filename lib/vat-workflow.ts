/**
 * VAT Workflow Management System
 * 
 * Handles VAT quarter calculations, deadlines, and workflow stages
 * All dates are calculated in London timezone (Europe/London) for UK compliance
 */

// Valid VAT quarter groups
export const VAT_QUARTER_GROUPS = {
  '1_4_7_10': 'Jan/Apr/Jul/Oct',
  '2_5_8_11': 'Feb/May/Aug/Nov', 
  '3_6_9_12': 'Mar/Jun/Sep/Dec'
} as const

export type VATQuarterGroup = keyof typeof VAT_QUARTER_GROUPS

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

  // Calculate quarter end date (last day of the quarter month) in UTC
  const quarterEndDate = new Date(Date.UTC(quarterEndYear, quarterEndMonth, 0)) // Last day of quarterEndMonth

  // Calculate quarter start date (first day of the quarter)
  // For 3_6_9_12: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar
  // Quarter starts 2 months before the end month (June quarter starts in April)
  const quarterStartMonth = quarterEndMonth - 2 // 2 months before end, not 3
  const quarterStartYear = quarterStartMonth > 0 ? quarterEndYear : quarterEndYear - 1
  const adjustedStartMonth = quarterStartMonth > 0 ? quarterStartMonth : quarterStartMonth + 12
  const quarterStartDate = new Date(Date.UTC(quarterStartYear, adjustedStartMonth - 1, 1)) // -1 because JS months are 0-indexed

  // Calculate filing due date (last day of month following quarter end)
  // UK VAT Rule: Filing due by last day of month following quarter end
  // Example: June 30th quarter end → July 31st filing deadline
  const filingDueDate = new Date(Date.UTC(quarterEndYear, quarterEndMonth + 1, 0)) // Month after quarter end, day 0 = last day

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
  PAPERWORK_PENDING_CHASE: "Pending to chase",
  PAPERWORK_CHASED: "Paperwork chased",
  PAPERWORK_RECEIVED: "Paperwork received",
  WORK_IN_PROGRESS: "Work in progress",
  QUERIES_PENDING: "Queries pending",
  REVIEW_PENDING_MANAGER: "Review pending by manager",
  REVIEWED_BY_MANAGER: "Reviewed by manager",
  REVIEW_PENDING_PARTNER: "Review pending by partner",
  REVIEWED_BY_PARTNER: "Reviewed by partner",
  EMAILED_TO_PARTNER: "Emailed to partner",
  EMAILED_TO_CLIENT: "Emailed to client",
  CLIENT_APPROVED: "Client approved",
  FILED_TO_HMRC: "Filed to HMRC"
} as const

/**
 * Selectable VAT Workflow Stages
 */
export const SELECTABLE_VAT_WORKFLOW_STAGES = {
  PAPERWORK_PENDING_CHASE: "Pending to chase",
  PAPERWORK_CHASED: "Paperwork chased",
  PAPERWORK_RECEIVED: "Paperwork received",
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

/**
 * Check if a stage is a "reviewed" status stage (not selectable in dropdowns)
 */
export function isReviewedStage(stage: string): boolean {
  return [
    'REVIEWED_BY_MANAGER',
    'REVIEWED_BY_PARTNER'
  ].includes(stage)
}

/**
 * Get the filing month name from a VAT quarter
 * Returns the month name when filing is due (month after quarter end)
 */
export function getVATFilingMonthName(quarterInfo: VATQuarterInfo | { filingDueDate: Date | string }): string {
  const filingDate = quarterInfo.filingDueDate instanceof Date 
    ? quarterInfo.filingDueDate 
    : new Date(quarterInfo.filingDueDate)
    
  return filingDate.toLocaleDateString('en-GB', { month: 'long', timeZone: 'Europe/London' })
}

/**
 * Get the quarter end month name from a VAT quarter
 */
export function getVATQuarterEndMonthName(quarterInfo: VATQuarterInfo | { quarterEndDate: Date | string }): string {
  const endDate = quarterInfo.quarterEndDate instanceof Date 
    ? quarterInfo.quarterEndDate 
    : new Date(quarterInfo.quarterEndDate)
    
  return endDate.toLocaleDateString('en-GB', { month: 'long', timeZone: 'Europe/London' })
}

/**
 * Get filing months for a quarter group
 * Returns array of month numbers (1-12) when filing is due for this quarter group
 */
export function getVATFilingMonthsForQuarterGroup(quarterGroup: string): number[] {
  switch (quarterGroup) {
    case '1_4_7_10':
      return [2, 5, 8, 11] // Feb, May, Aug, Nov
    case '2_5_8_11':
      return [3, 6, 9, 12] // Mar, Jun, Sep, Dec
    case '3_6_9_12':
      return [4, 7, 10, 1]  // Apr, Jul, Oct, Jan
    default:
      return []
  }
}

/**
 * Check if a given month is a filing month for a quarter group
 */
export function isVATFilingMonth(quarterGroup: string, monthNumber: number): boolean {
  const filingMonths = getVATFilingMonthsForQuarterGroup(quarterGroup)
  return filingMonths.includes(monthNumber)
}

/**
 * Calculate total days from start to completion for a VAT quarter
 * Returns the number of days between the first workflow stage and HMRC filing
 */
export function calculateTotalFilingDays(vatQuarter: {
  chaseStartedDate?: string | Date | null
  paperworkReceivedDate?: string | Date | null
  workStartedDate?: string | Date | null
  filedToHMRCDate?: string | Date | null
  createdAt?: string | Date
}): number | null {
  let startDate: Date | null = null
  let endDate: Date | null = null

  // Find the earliest milestone date as start
  const dates = [
    vatQuarter.chaseStartedDate,
    vatQuarter.paperworkReceivedDate,
    vatQuarter.workStartedDate,
    vatQuarter.createdAt
  ].filter(Boolean)

  if (dates.length > 0) {
    const sortedDates = dates.map(d => new Date(d!)).sort((a, b) => a.getTime() - b.getTime())
    startDate = sortedDates[0] || null
  }

  // Filing to HMRC is the end date
  if (vatQuarter.filedToHMRCDate) {
    endDate = new Date(vatQuarter.filedToHMRCDate)
  }

  if (startDate && endDate) {
    return calculateDaysBetween(startDate, endDate)
  }

  return null
}

/**
 * Calculate duration for each stage in a VAT workflow
 * Returns an object with stage names and their durations in days
 */
export function calculateStageDurations(vatQuarter: {
  chaseStartedDate?: string | Date | null
  paperworkReceivedDate?: string | Date | null
  workStartedDate?: string | Date | null
  workFinishedDate?: string | Date | null
  sentToClientDate?: string | Date | null
  clientApprovedDate?: string | Date | null
  filedToHMRCDate?: string | Date | null
  createdAt?: string | Date
}, workflowHistory?: Array<{
  toStage: string
  stageChangedAt: string | Date
  daysInPreviousStage?: number | null
}>): { [stageName: string]: number | null } {
  const stageDurations: { [stageName: string]: number | null } = {}

  // Map of milestone dates to calculate stage durations
  const milestones = [
    { stage: 'PAPERWORK_PENDING_CHASE', startDate: vatQuarter.createdAt, endDate: vatQuarter.chaseStartedDate },
    { stage: 'PAPERWORK_CHASED', startDate: vatQuarter.chaseStartedDate, endDate: vatQuarter.paperworkReceivedDate },
    { stage: 'PAPERWORK_RECEIVED', startDate: vatQuarter.paperworkReceivedDate, endDate: vatQuarter.workStartedDate },
    { stage: 'WORK_IN_PROGRESS', startDate: vatQuarter.workStartedDate, endDate: vatQuarter.workFinishedDate },
    { stage: 'WORK_FINISHED', startDate: vatQuarter.workFinishedDate, endDate: vatQuarter.sentToClientDate },
    { stage: 'SENT_TO_CLIENT', startDate: vatQuarter.sentToClientDate, endDate: vatQuarter.clientApprovedDate },
    { stage: 'CLIENT_APPROVED', startDate: vatQuarter.clientApprovedDate, endDate: vatQuarter.filedToHMRCDate }
  ]

  // Calculate duration for each stage
  milestones.forEach(({ stage, startDate, endDate }) => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      stageDurations[stage] = calculateDaysBetween(start, end)
    } else {
      stageDurations[stage] = null
    }
  })

  // If workflow history is available, use it for more accurate stage durations
  if (workflowHistory && workflowHistory.length > 0) {
    workflowHistory.forEach(entry => {
      if (entry.daysInPreviousStage !== null && entry.daysInPreviousStage !== undefined) {
        const stageName = VAT_WORKFLOW_STAGE_NAMES[entry.toStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES] || entry.toStage
        stageDurations[stageName] = entry.daysInPreviousStage
      }
    })
  }

  return stageDurations
}

/**
 * Get a human-readable summary of VAT workflow progress
 */
export function getVATWorkflowProgressSummary(vatQuarter: {
  currentStage: string
  isCompleted: boolean
  chaseStartedDate?: string | Date | null
  paperworkReceivedDate?: string | Date | null
  workStartedDate?: string | Date | null
  workFinishedDate?: string | Date | null
  sentToClientDate?: string | Date | null
  clientApprovedDate?: string | Date | null
  filedToHMRCDate?: string | Date | null
  createdAt?: string | Date
}): {
  totalDays: number | null
  stageDurations: { [stageName: string]: number | null }
  progressPercentage: number
  currentStageDisplay: string
  timeToCompletion: string | null
} {
  const totalDays = calculateTotalFilingDays(vatQuarter)
  const stageDurations = calculateStageDurations(vatQuarter)
  
  // Calculate progress percentage based on current stage
  const stageProgressMap: { [key: string]: number } = {
    'PAPERWORK_PENDING_CHASE': 5,
    'PAPERWORK_CHASED': 10,
    'PAPERWORK_RECEIVED': 20,
    'WORK_IN_PROGRESS': 30,
    'QUERIES_PENDING': 40,
    'REVIEW_PENDING_MANAGER': 60,
    'REVIEW_PENDING_PARTNER': 70,
    'EMAILED_TO_PARTNER': 80,
    'EMAILED_TO_CLIENT': 85,
    'CLIENT_APPROVED': 95,
    'FILED_TO_HMRC': 100
  }
  
  const progressPercentage = stageProgressMap[vatQuarter.currentStage] || 0
  const currentStageDisplay = VAT_WORKFLOW_STAGE_NAMES[vatQuarter.currentStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES] || vatQuarter.currentStage
  
  // Calculate time to completion estimate
  let timeToCompletion: string | null = null
  if (vatQuarter.isCompleted && totalDays) {
    timeToCompletion = `Completed in ${totalDays} days`
  } else if (totalDays && !vatQuarter.isCompleted) {
    timeToCompletion = `${totalDays} days in progress`
  }
  
  return {
    totalDays,
    stageDurations,
    progressPercentage,
    currentStageDisplay,
    timeToCompletion
  }
} 