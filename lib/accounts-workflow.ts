// Accounts workflow utility functions
export const ACCOUNTS_WORKFLOW_STAGE_NAMES = {
  WAITING_FOR_YEAR_END: 'Waiting for Year End',
  PAPERWORK_PENDING_CHASE: 'Awaiting Records',
  PAPERWORK_CHASED: 'Records Chased',
  PAPERWORK_RECEIVED: 'Records Received',
  WORK_IN_PROGRESS: 'Work in Progress',
  DISCUSS_WITH_MANAGER: 'Manager Discussion',
  REVIEW_BY_PARTNER: 'Partner Review',
  REVIEW_DONE_HELLO_SIGN: 'Review Complete',
  SENT_TO_CLIENT_HELLO_SIGN: 'Sent to Client',
  APPROVED_BY_CLIENT: 'Client Approved',
  SUBMISSION_APPROVED_PARTNER: 'Partner Approved',
  FILED_TO_COMPANIES_HOUSE: 'Filed to Companies House',
  FILED_TO_HMRC: 'Filed to HMRC',
  CLIENT_SELF_FILING: 'Client Self-Filing',
  REVIEWED_BY_MANAGER: 'Reviewed by Manager',
  REVIEWED_BY_PARTNER: 'Reviewed by Partner'
} as const

export type AccountsWorkflowStage = keyof typeof ACCOUNTS_WORKFLOW_STAGE_NAMES

export const ACCOUNTS_WORKFLOW_STAGE_ORDER: AccountsWorkflowStage[] = [
  'WAITING_FOR_YEAR_END',
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED',
  'PAPERWORK_RECEIVED',
  'WORK_IN_PROGRESS',
  'DISCUSS_WITH_MANAGER',
  'REVIEW_BY_PARTNER',
  'REVIEW_DONE_HELLO_SIGN',
  'SENT_TO_CLIENT_HELLO_SIGN',
  'APPROVED_BY_CLIENT',
  'SUBMISSION_APPROVED_PARTNER',
  'FILED_TO_COMPANIES_HOUSE',
  'FILED_TO_HMRC'
]

export const ACCOUNTS_WORKFLOW_FINAL_STAGES: AccountsWorkflowStage[] = [
  'FILED_TO_HMRC',
  'CLIENT_SELF_FILING'
]

export function formatAccountsPeriod(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const startMonth = start.toLocaleDateString('en-GB', { month: 'short' })
    const startYear = start.getFullYear()
    const endMonth = end.toLocaleDateString('en-GB', { month: 'short' })
    const endYear = end.getFullYear()
    
    if (startYear === endYear) {
      return `${startMonth} - ${endMonth} ${endYear}`
    } else {
      return `${startMonth} ${startYear} - ${endMonth} ${endYear}`
    }
  } catch {
    return 'Invalid period'
  }
}

export function formatAccountsPeriodForDisplay(startDate: string, endDate: string): string {
  try {
    const end = new Date(endDate)
    return end.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return 'Invalid date'
  }
}

export function calculateAccountsFilingDays(workflow: any): {
  totalDays: number
  businessDays: number
  stageDurations: { [key: string]: number }
} {
  if (!workflow.workflowHistory || workflow.workflowHistory.length === 0) {
    return { totalDays: 0, businessDays: 0, stageDurations: {} }
  }

  const history = workflow.workflowHistory
  const startDate = new Date(history[0].stageChangedAt)
  const endDate = workflow.isCompleted 
    ? new Date(history[history.length - 1].stageChangedAt)
    : new Date()

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Calculate business days (excluding weekends)
  let businessDays = 0
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate stage durations
  const stageDurations: { [key: string]: number } = {}
  for (let i = 0; i < history.length; i++) {
    const entry = history[i]
    if (entry.daysInPreviousStage && entry.fromStage) {
      stageDurations[entry.fromStage] = entry.daysInPreviousStage
    }
  }

  return { totalDays, businessDays, stageDurations }
}

export function getAccountsWorkflowProgress(currentStage: AccountsWorkflowStage): {
  currentIndex: number
  totalStages: number
  progressPercentage: number
} {
  const currentIndex = ACCOUNTS_WORKFLOW_STAGE_ORDER.indexOf(currentStage)
  const totalStages = ACCOUNTS_WORKFLOW_STAGE_ORDER.length
  const progressPercentage = currentIndex >= 0 ? ((currentIndex + 1) / totalStages) * 100 : 0

  return {
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
    totalStages,
    progressPercentage
  }
}

export function isAccountsWorkflowCompleted(currentStage: AccountsWorkflowStage): boolean {
  return ACCOUNTS_WORKFLOW_FINAL_STAGES.includes(currentStage)
}

export function getNextAccountsWorkflowStage(currentStage: AccountsWorkflowStage): AccountsWorkflowStage | null {
  const currentIndex = ACCOUNTS_WORKFLOW_STAGE_ORDER.indexOf(currentStage)
  if (currentIndex >= 0 && currentIndex < ACCOUNTS_WORKFLOW_STAGE_ORDER.length - 1) {
    const nextStage = ACCOUNTS_WORKFLOW_STAGE_ORDER[currentIndex + 1]
    return nextStage || null
  }
  return null
}

export function getPreviousAccountsWorkflowStage(currentStage: AccountsWorkflowStage): AccountsWorkflowStage | null {
  const currentIndex = ACCOUNTS_WORKFLOW_STAGE_ORDER.indexOf(currentStage)
  if (currentIndex > 0) {
    const previousStage = ACCOUNTS_WORKFLOW_STAGE_ORDER[currentIndex - 1]
    return previousStage || null
  }
  return null
}

export function getAccountsWorkflowStageColor(stage: AccountsWorkflowStage): string {
  const stageColors: { [key in AccountsWorkflowStage]: string } = {
    'WAITING_FOR_YEAR_END': 'bg-gray-100 text-gray-800',
    'PAPERWORK_PENDING_CHASE': 'bg-red-100 text-red-800',
    'PAPERWORK_CHASED': 'bg-orange-100 text-orange-800',
    'PAPERWORK_RECEIVED': 'bg-blue-100 text-blue-800',
    'WORK_IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
    'DISCUSS_WITH_MANAGER': 'bg-purple-100 text-purple-800',
    'REVIEW_BY_PARTNER': 'bg-purple-100 text-purple-800',
    'REVIEW_DONE_HELLO_SIGN': 'bg-indigo-100 text-indigo-800',
    'SENT_TO_CLIENT_HELLO_SIGN': 'bg-cyan-100 text-cyan-800',
    'APPROVED_BY_CLIENT': 'bg-emerald-100 text-emerald-800',
    'SUBMISSION_APPROVED_PARTNER': 'bg-green-100 text-green-800',
    'FILED_TO_COMPANIES_HOUSE': 'bg-green-100 text-green-800',
    'FILED_TO_HMRC': 'bg-green-100 text-green-800',
    'CLIENT_SELF_FILING': 'bg-blue-100 text-blue-800',
    'REVIEWED_BY_MANAGER': 'bg-purple-100 text-purple-800',
    'REVIEWED_BY_PARTNER': 'bg-purple-100 text-purple-800'
  }

  return stageColors[stage] || 'bg-gray-100 text-gray-800'
} 