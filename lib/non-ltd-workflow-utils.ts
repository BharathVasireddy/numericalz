/**
 * Non-Ltd Accounts Workflow Client-Safe Utilities
 * 
 * Non-Ltd companies have fixed dates:
 * - Year end: 5th April every year (UK tax year end)
 * - Filing due: 9 months from year end (5th January)
 */

import { NonLtdAccountsWorkflowStage } from '@prisma/client'
import { getNextAllowedStages, getStageDisplayName } from './workflow-validation'
import { addMonths, isValid } from 'date-fns'

/**
 * Calculate the year end date for non-Ltd companies (always 5th April)
 */
export function calculateNonLtdYearEnd(year: number): Date {
  const yearEnd = new Date(year, 3, 5) // April 5th (month is 0-indexed)
  
  // Validate the date to ensure it's correct
  if (!isValid(yearEnd)) {
    throw new Error(`Invalid year end date for year ${year}`)
  }
  
  return yearEnd
}

/**
 * Calculate the filing due date for non-Ltd companies (9 months from year end)
 * Uses date-fns for safer date arithmetic to avoid edge cases
 */
export function calculateNonLtdFilingDue(yearEndDate: Date): Date {
  // Validate input date
  if (!isValid(yearEndDate)) {
    throw new Error('Invalid year end date provided')
  }
  
  // Use date-fns addMonths for safer date calculation
  // This avoids edge cases with setMonth() such as Feb 30th becoming Mar 2nd
  const filingDue = addMonths(yearEndDate, 9)
  
  if (!isValid(filingDue)) {
    throw new Error('Failed to calculate valid filing due date')
  }
  
  return filingDue
}

/**
 * Get the current non-Ltd tax year
 * Tax year runs from 6th April to 5th April
 */
export function getCurrentNonLtdTaxYear(): number {
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // If we're before April 6th, we're still in the previous tax year
  const taxYearStart = new Date(currentYear, 3, 6) // April 6th
  
  if (now < taxYearStart) {
    return currentYear - 1
  }
  
  return currentYear
}

/**
 * Get the next non-Ltd tax year
 */
export function getNextNonLtdTaxYear(): number {
  return getCurrentNonLtdTaxYear() + 1
}

/**
 * Get workflow status display information
 */
export function getNonLtdWorkflowStatus(workflow: any) {
  if (!workflow) {
    return {
      status: 'No workflow',
      variant: 'secondary' as const,
      priority: 0
    }
  }

  if (workflow.isCompleted) {
    return {
      status: 'Completed',
      variant: 'default' as const,
      priority: 1
    }
  }

  // Return stage-specific status
  const stageDisplay = getNonLtdStageDisplayName(workflow.currentStage)
  return {
    status: stageDisplay,
    variant: 'outline' as const,
    priority: 2
  }
}

/**
 * Get display name for workflow stage
 */
export function getNonLtdStageDisplayName(stage: NonLtdAccountsWorkflowStage): string {
  return getStageDisplayName(stage, 'NON_LTD')
}

/**
 * Get next possible stages for workflow progression
 */
export function getNextNonLtdStages(currentStage: NonLtdAccountsWorkflowStage): NonLtdAccountsWorkflowStage[] {
  const nextStages = getNextAllowedStages(currentStage, 'NON_LTD')
  return nextStages as NonLtdAccountsWorkflowStage[]
} 