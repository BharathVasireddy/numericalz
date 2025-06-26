// Workflow validation utilities for VAT and Ltd workflows
// Prevents stage skipping and provides validation feedback

export interface WorkflowValidationResult {
  isValid: boolean
  isSkipping: boolean
  skippedStages: string[]
  message: string
  allowedNextStages: string[]
}

// VAT Workflow Stage Order (sequential progression)
export const VAT_WORKFLOW_STAGE_ORDER = [
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED', 
  'PAPERWORK_RECEIVED',
  'WORK_IN_PROGRESS',
  'QUERIES_PENDING',
  'REVIEW_PENDING_MANAGER',
  'REVIEWED_BY_MANAGER',
  'REVIEW_PENDING_PARTNER', 
  'REVIEWED_BY_PARTNER',
  'EMAILED_TO_PARTNER',
  'EMAILED_TO_CLIENT',
  'CLIENT_APPROVED',
  'FILED_TO_HMRC'
] as const

// Ltd Workflow Stage Order (sequential progression)
export const LTD_WORKFLOW_STAGE_ORDER = [
  'WAITING_FOR_YEAR_END',
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED',
  'PAPERWORK_RECEIVED', 
  'WORK_IN_PROGRESS',
  'DISCUSS_WITH_MANAGER',
  'REVIEWED_BY_MANAGER',
  'REVIEW_BY_PARTNER',
  'REVIEWED_BY_PARTNER',
  'REVIEW_DONE_HELLO_SIGN',
  'SENT_TO_CLIENT_HELLO_SIGN',
  'APPROVED_BY_CLIENT',
  'SUBMISSION_APPROVED_PARTNER',
  'FILED_TO_COMPANIES_HOUSE',
  'FILED_TO_HMRC'
] as const

// Stages that are automatically set by the system (not selectable by users)
export const AUTO_SET_STAGES = [
  'REVIEWED_BY_MANAGER',
  'REVIEWED_BY_PARTNER'
] as const

// Stages that can be sent back to (regression is allowed)
export const REGRESSION_ALLOWED_STAGES = [
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED',
  'PAPERWORK_RECEIVED',
  'WORK_IN_PROGRESS'
] as const

/**
 * Get the stage order array for a workflow type
 */
function getStageOrder(workflowType: 'VAT' | 'LTD'): readonly string[] {
  return workflowType === 'VAT' ? VAT_WORKFLOW_STAGE_ORDER : LTD_WORKFLOW_STAGE_ORDER
}

/**
 * Get the index of a stage in the workflow order
 */
function getStageIndex(stage: string, workflowType: 'VAT' | 'LTD'): number {
  const stageOrder = getStageOrder(workflowType)
  return stageOrder.indexOf(stage)
}

/**
 * Get the next allowed stages for a current stage
 */
export function getNextAllowedStages(currentStage: string, workflowType: 'VAT' | 'LTD'): string[] {
  const stageOrder = getStageOrder(workflowType)
  const currentIndex = getStageIndex(currentStage, workflowType)
  
  if (currentIndex === -1) return []
  
  const allowedStages: string[] = []
  
  // Allow progression to next stage
  if (currentIndex < stageOrder.length - 1) {
    const nextStage = stageOrder[currentIndex + 1]
    if (nextStage) {
      allowedStages.push(nextStage)
    }
  }
  
  // Allow regression to earlier stages (for rework)
  REGRESSION_ALLOWED_STAGES.forEach(stage => {
    const stageIndex = getStageIndex(stage, workflowType)
    if (stageIndex !== -1 && stageIndex < currentIndex && !allowedStages.includes(stage)) {
      allowedStages.push(stage)
    }
  })
  
  return allowedStages
}

/**
 * Validate if a stage transition is allowed
 */
export function validateStageTransition(
  fromStage: string | null,
  toStage: string,
  workflowType: 'VAT' | 'LTD'
): WorkflowValidationResult {
  const stageOrder = getStageOrder(workflowType)
  
  // If no current stage (new workflow), allow any starting stage
  if (!fromStage) {
    return {
      isValid: true,
      isSkipping: false,
      skippedStages: [],
      message: 'Valid initial stage selection',
      allowedNextStages: getNextAllowedStages(toStage, workflowType)
    }
  }
  
  const fromIndex = getStageIndex(fromStage, workflowType)
  const toIndex = getStageIndex(toStage, workflowType)
  
  // Invalid stages
  if (fromIndex === -1 || toIndex === -1) {
    return {
      isValid: false,
      isSkipping: false,
      skippedStages: [],
      message: 'Invalid stage detected',
      allowedNextStages: []
    }
  }
  
  // Same stage (no change)
  if (fromStage === toStage) {
    return {
      isValid: true,
      isSkipping: false,
      skippedStages: [],
      message: 'No stage change',
      allowedNextStages: getNextAllowedStages(toStage, workflowType)
    }
  }
  
  // Backward progression (regression for rework)
  if (toIndex < fromIndex) {
    if (REGRESSION_ALLOWED_STAGES.includes(toStage as any)) {
      return {
        isValid: true,
        isSkipping: false,
        skippedStages: [],
        message: 'Valid regression for rework',
        allowedNextStages: getNextAllowedStages(toStage, workflowType)
      }
    } else {
      return {
        isValid: false,
        isSkipping: false,
        skippedStages: [],
        message: 'Regression not allowed to this stage',
        allowedNextStages: getNextAllowedStages(fromStage, workflowType)
      }
    }
  }
  
  // Forward progression - check for skipping
  const expectedNextIndex = fromIndex + 1
  
  if (toIndex === expectedNextIndex) {
    // Valid next stage progression
    return {
      isValid: true,
      isSkipping: false,
      skippedStages: [],
      message: 'Valid stage progression',
      allowedNextStages: getNextAllowedStages(toStage, workflowType)
    }
  }
  
  if (toIndex > expectedNextIndex) {
    // Skipping stages detected
    const skippedStages = stageOrder.slice(expectedNextIndex, toIndex)
    
    return {
      isValid: false,
      isSkipping: true,
      skippedStages: Array.from(skippedStages),
      message: `Cannot skip stages: ${skippedStages.join(', ')}`,
      allowedNextStages: getNextAllowedStages(fromStage, workflowType)
    }
  }
  
  // Should not reach here, but fallback
  return {
    isValid: false,
    isSkipping: false,
    skippedStages: [],
    message: 'Invalid stage transition',
    allowedNextStages: getNextAllowedStages(fromStage, workflowType)
  }
}

/**
 * Get user-friendly stage names for display
 */
export function getStageDisplayName(stage: string, workflowType: 'VAT' | 'LTD'): string {
  const stageDisplayNames = {
    VAT: {
      'PAPERWORK_PENDING_CHASE': 'Pending to chase',
      'PAPERWORK_CHASED': 'Paperwork chased',
      'PAPERWORK_RECEIVED': 'Paperwork received',
      'WORK_IN_PROGRESS': 'Work in progress',
      'QUERIES_PENDING': 'Queries pending',
      'REVIEW_PENDING_MANAGER': 'Review pending by manager',
      'REVIEWED_BY_MANAGER': 'Reviewed by manager',
      'REVIEW_PENDING_PARTNER': 'Review pending by partner',
      'REVIEWED_BY_PARTNER': 'Reviewed by partner',
      'EMAILED_TO_PARTNER': 'Emailed to partner',
      'EMAILED_TO_CLIENT': 'Emailed to client',
      'CLIENT_APPROVED': 'Client approved',
      'FILED_TO_HMRC': 'Filed to HMRC'
    },
    LTD: {
      'WAITING_FOR_YEAR_END': 'Waiting for Year End',
      'PAPERWORK_PENDING_CHASE': 'Pending to Chase Paperwork',
      'PAPERWORK_CHASED': 'Paperwork Chased',
      'PAPERWORK_RECEIVED': 'Paperwork Received',
      'WORK_IN_PROGRESS': 'Work in Progress',
      'DISCUSS_WITH_MANAGER': 'To Discuss with Manager',
      'REVIEWED_BY_MANAGER': 'Reviewed by Manager',
      'REVIEW_BY_PARTNER': 'To Review by Partner',
      'REVIEWED_BY_PARTNER': 'Reviewed by Partner',
      'REVIEW_DONE_HELLO_SIGN': 'Review Done - Hello Sign to Client',
      'SENT_TO_CLIENT_HELLO_SIGN': 'Sent to client on Hello Sign',
      'APPROVED_BY_CLIENT': 'Approved by Client',
      'SUBMISSION_APPROVED_PARTNER': 'Submission Approved by Partner',
      'FILED_TO_COMPANIES_HOUSE': 'Filed to Companies House',
      'FILED_TO_HMRC': 'Filed to HMRC'
    }
  }
  
  return stageDisplayNames[workflowType][stage as keyof typeof stageDisplayNames[typeof workflowType]] || stage
}

/**
 * Check if a stage is user-selectable (not auto-set by system)
 */
export function isStageUserSelectable(stage: string): boolean {
  return !AUTO_SET_STAGES.includes(stage as any)
}

/**
 * Get selectable stages for a workflow type (excluding auto-set stages)
 */
export function getSelectableStages(workflowType: 'VAT' | 'LTD'): string[] {
  const stageOrder = getStageOrder(workflowType)
  return stageOrder.filter(stage => isStageUserSelectable(stage))
} 