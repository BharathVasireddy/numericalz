/**
 * Non-Ltd Accounts Workflow Server-Side Utilities
 * 
 * Non-Ltd companies have fixed dates:
 * - Year end: 5th April every year (UK tax year end)
 * - Filing due: 9 months from year end (5th January)
 */

import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { NonLtdAccountsWorkflowStage } from '@prisma/client'
import { 
  calculateNonLtdYearEnd, 
  calculateNonLtdFilingDue, 
  getCurrentNonLtdTaxYear 
} from '@/lib/non-ltd-workflow-utils'

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

/**
 * Create a new non-Ltd workflow for a client
 */
export async function createNonLtdWorkflow(clientId: string, taxYear?: number) {
  const year = taxYear || getCurrentNonLtdTaxYear()
  const yearEnd = calculateNonLtdYearEnd(year)
  const filingDue = calculateNonLtdFilingDue(yearEnd)
  
  const workflow = await db.nonLtdAccountsWorkflow.create({
    data: {
      clientId,
      yearEndDate: yearEnd,
      filingDueDate: filingDue,
      currentStage: 'PAPERWORK_PENDING_CHASE',
      isCompleted: false
    }
  })
  
  return workflow
}

/**
 * Update workflow stage with milestone tracking
 */
export async function updateNonLtdWorkflowStage(
  workflowId: string, 
  newStage: NonLtdAccountsWorkflowStage,
  notes?: string,
  session?: any
) {
  const workflow = await db.nonLtdAccountsWorkflow.findUnique({
    where: { id: workflowId }
  })
  
  if (!workflow) {
    throw new Error('Workflow not found')
  }
  
  const user = session?.user
  const milestoneData = getNonLtdMilestoneUpdateData(newStage, user, workflow.currentStage)
  
  // Update workflow with new stage and milestone
  const updatedWorkflow = await db.nonLtdAccountsWorkflow.update({
    where: { id: workflowId },
    data: {
      currentStage: newStage,
      isCompleted: newStage === 'FILED_TO_HMRC',
      ...milestoneData
    }
  })
  
  // Create history entry
  await db.nonLtdAccountsWorkflowHistory.create({
    data: {
      nonLtdAccountsWorkflowId: workflowId,
      fromStage: workflow.currentStage,
      toStage: newStage,
      stageChangedAt: new Date(),
      userId: user?.id || 'system',
      userName: user?.name || 'System',
      userEmail: user?.email || 'system@numericalz.com',
      userRole: user?.role || 'SYSTEM',
      notes: notes || `Stage updated to ${newStage}`
    }
  })
  
  return updatedWorkflow
}

/**
 * Get milestone update data based on stage
 * Enhanced to handle both forward progression and backward movement (undo operations)
 */
function getNonLtdMilestoneUpdateData(stage: NonLtdAccountsWorkflowStage, user: any, currentStage?: NonLtdAccountsWorkflowStage) {
  const now = new Date()
  const userId = user?.id
  const userName = user?.name
  const updateData: any = {}
  
  // Set milestone date for the new stage
  switch (stage) {
    case 'PAPERWORK_PENDING_CHASE':
      updateData.chaseStartedDate = now
      updateData.chaseStartedByUserId = userId
      updateData.chaseStartedByUserName = userName
      break
    case 'PAPERWORK_RECEIVED':
      updateData.paperworkReceivedDate = now
      updateData.paperworkReceivedByUserId = userId
      updateData.paperworkReceivedByUserName = userName
      break
    case 'WORK_IN_PROGRESS':
      updateData.workStartedDate = now
      updateData.workStartedByUserId = userId
      updateData.workStartedByUserName = userName
      break
    case 'DISCUSS_WITH_MANAGER':
      updateData.managerDiscussionDate = now
      updateData.managerDiscussionByUserId = userId
      updateData.managerDiscussionByUserName = userName
      break
    case 'REVIEW_BY_PARTNER':
      updateData.partnerReviewDate = now
      updateData.partnerReviewByUserId = userId
      updateData.partnerReviewByUserName = userName
      break
    case 'REVIEW_DONE_HELLO_SIGN':
      updateData.reviewCompletedDate = now
      updateData.reviewCompletedByUserId = userId
      updateData.reviewCompletedByUserName = userName
      break
    case 'SENT_TO_CLIENT_HELLO_SIGN':
      updateData.sentToClientDate = now
      updateData.sentToClientByUserId = userId
      updateData.sentToClientByUserName = userName
      break
    case 'APPROVED_BY_CLIENT':
      updateData.clientApprovedDate = now
      updateData.clientApprovedByUserId = userId
      updateData.clientApprovedByUserName = userName
      break
    case 'SUBMISSION_APPROVED_PARTNER':
      updateData.partnerApprovedDate = now
      updateData.partnerApprovedByUserId = userId
      updateData.partnerApprovedByUserName = userName
      break
    case 'FILED_TO_HMRC':
      updateData.filedToHMRCDate = now
      updateData.filedToHMRCByUserId = userId
      updateData.filedToHMRCByUserName = userName
      break
  }
  
  // ENHANCED: Clear future milestone dates when moving backwards (undo operations)
  if (currentStage) {
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
      'FILED_TO_HMRC'
    ]
    
    const currentIndex = stageOrder.indexOf(currentStage)
    const newIndex = stageOrder.indexOf(stage)
    
    // If moving backwards, clear milestone dates for future stages
    if (currentIndex > newIndex) {
      const futureStagesToClear = stageOrder.slice(newIndex + 1, currentIndex + 1)
      
      futureStagesToClear.forEach(futureStage => {
        switch (futureStage) {
          case 'PAPERWORK_RECEIVED':
            updateData.paperworkReceivedDate = null
            updateData.paperworkReceivedByUserId = null
            updateData.paperworkReceivedByUserName = null
            break
          case 'WORK_IN_PROGRESS':
            updateData.workStartedDate = null
            updateData.workStartedByUserId = null
            updateData.workStartedByUserName = null
            break
          case 'DISCUSS_WITH_MANAGER':
            updateData.managerDiscussionDate = null
            updateData.managerDiscussionByUserId = null
            updateData.managerDiscussionByUserName = null
            break
          case 'REVIEW_BY_PARTNER':
            updateData.partnerReviewDate = null
            updateData.partnerReviewByUserId = null
            updateData.partnerReviewByUserName = null
            break
          case 'REVIEW_DONE_HELLO_SIGN':
            updateData.reviewCompletedDate = null
            updateData.reviewCompletedByUserId = null
            updateData.reviewCompletedByUserName = null
            break
          case 'SENT_TO_CLIENT_HELLO_SIGN':
            updateData.sentToClientDate = null
            updateData.sentToClientByUserId = null
            updateData.sentToClientByUserName = null
            break
          case 'APPROVED_BY_CLIENT':
            updateData.clientApprovedDate = null
            updateData.clientApprovedByUserId = null
            updateData.clientApprovedByUserName = null
            break
          case 'SUBMISSION_APPROVED_PARTNER':
            updateData.partnerApprovedDate = null
            updateData.partnerApprovedByUserId = null
            updateData.partnerApprovedByUserName = null
            break
          case 'FILED_TO_HMRC':
            updateData.filedToHMRCDate = null
            updateData.filedToHMRCByUserId = null
            updateData.filedToHMRCByUserName = null
            break
        }
      })
    }
  }
  
  return updateData
}

/**
 * Get stage field name for milestone tracking
 */
function getStageFieldName(stage: NonLtdAccountsWorkflowStage): string {
  switch (stage) {
    case 'PAPERWORK_PENDING_CHASE':
      return 'chaseStartedDate'
    case 'PAPERWORK_RECEIVED':
      return 'paperworkReceivedDate'
    case 'WORK_IN_PROGRESS':
      return 'workStartedDate'
    case 'DISCUSS_WITH_MANAGER':
      return 'managerDiscussionDate'
    case 'REVIEW_BY_PARTNER':
      return 'partnerReviewDate'
    case 'FILED_TO_HMRC':
      return 'filedToHMRCDate'
    default:
      return ''
  }
} 