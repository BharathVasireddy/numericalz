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

// Note: Client-side utilities have been moved to @/lib/non-ltd-workflow-utils-client
// to prevent client-side database imports. Import from that file for client components.

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