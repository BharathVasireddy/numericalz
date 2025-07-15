/**
 * Non-Ltd Accounts Workflow Client-Side Utilities
 * 
 * These utilities are safe to use on the client side as they don't
 * import any server-side dependencies like the database client.
 */

import type { NonLtdAccountsWorkflowStage } from '@prisma/client'

// Client-side utility functions for filing history component
export const NON_LTD_WORKFLOW_STAGE_NAMES: Record<NonLtdAccountsWorkflowStage, string> = {
  WAITING_FOR_YEAR_END: 'Waiting for Year End',
  PAPERWORK_PENDING_CHASE: 'Paperwork Pending Chase',
  PAPERWORK_CHASED: 'Paperwork Chased',
  PAPERWORK_RECEIVED: 'Paperwork Received',
  WORK_IN_PROGRESS: 'Work in Progress',
  DISCUSS_WITH_MANAGER: 'Discuss with Manager',
  REVIEWED_BY_MANAGER: 'Reviewed by Manager',
  REVIEW_BY_PARTNER: 'Review by Partner',
  REVIEWED_BY_PARTNER: 'Reviewed by Partner',
  REVIEW_DONE_HELLO_SIGN: 'Review Done (HelloSign)',
  SENT_TO_CLIENT_HELLO_SIGN: 'Sent to Client (HelloSign)',
  APPROVED_BY_CLIENT: 'Approved by Client',
  SUBMISSION_APPROVED_PARTNER: 'Submission Approved by Partner',
  FILED_TO_HMRC: 'Filed to HMRC',
  CLIENT_SELF_FILING: 'Client Self-Filing'
}

export const getNonLtdWorkflowStageColor = (stage: NonLtdAccountsWorkflowStage): string => {
  switch (stage) {
    case 'PAPERWORK_PENDING_CHASE':
      return 'bg-yellow-100 text-yellow-800'
    case 'PAPERWORK_RECEIVED':
      return 'bg-blue-100 text-blue-800'
    case 'WORK_IN_PROGRESS':
      return 'bg-purple-100 text-purple-800'
    case 'DISCUSS_WITH_MANAGER':
      return 'bg-indigo-100 text-indigo-800'
    case 'REVIEW_BY_PARTNER':
      return 'bg-orange-100 text-orange-800'
    case 'REVIEW_DONE_HELLO_SIGN':
      return 'bg-cyan-100 text-cyan-800'
    case 'SENT_TO_CLIENT_HELLO_SIGN':
      return 'bg-pink-100 text-pink-800'
    case 'APPROVED_BY_CLIENT':
      return 'bg-green-100 text-green-800'
    case 'SUBMISSION_APPROVED_PARTNER':
      return 'bg-emerald-100 text-emerald-800'
    case 'FILED_TO_HMRC':
      return 'bg-green-100 text-green-800'
    case 'CLIENT_SELF_FILING':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getNonLtdWorkflowProgress = (stage: NonLtdAccountsWorkflowStage): number => {
  const stageOrder = [
    'PAPERWORK_PENDING_CHASE',
    'PAPERWORK_RECEIVED',
    'WORK_IN_PROGRESS',
    'DISCUSS_WITH_MANAGER',
    'REVIEW_BY_PARTNER',
    'REVIEW_DONE_HELLO_SIGN',
    'SENT_TO_CLIENT_HELLO_SIGN',
    'APPROVED_BY_CLIENT',
    'SUBMISSION_APPROVED_PARTNER',
    'FILED_TO_HMRC',
    'CLIENT_SELF_FILING'
  ]
  
  const stageIndex = stageOrder.indexOf(stage)
  if (stageIndex === -1) return 0
  
  return Math.round(((stageIndex + 1) / stageOrder.length) * 100)
}

export const formatNonLtdPeriod = (yearEndDate: string): string => {
  try {
    const date = new Date(yearEndDate)
    const year = date.getFullYear()
    return `${year - 1}-${year} Tax Year`
  } catch {
    return 'Unknown Period'
  }
}

export const formatNonLtdPeriodForDisplay = (yearEndDate: string): string => {
  try {
    const date = new Date(yearEndDate)
    const year = date.getFullYear()
    return `${year - 1}/${year} Tax Year`
  } catch {
    return 'Unknown Period'
  }
}

export const calculateNonLtdFilingDays = (workflow: any): number => {
  if (!workflow.filingDueDate) return 0
  
  const today = new Date()
  const filingDue = new Date(workflow.filingDueDate)
  const diffTime = filingDue.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
} 