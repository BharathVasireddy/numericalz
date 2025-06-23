import { db } from '@/lib/db'

// Helper function to check if a deadline is completed
function checkCompletionStatus(
  client: any,
  type: 'accounts' | 'confirmation' | 'corporation-tax' | 'vat',
  dueDate: Date
): { isCompleted: boolean; completedDate?: Date } {
  const today = new Date()
  
  switch (type) {
    case 'accounts':
      // Check if there's a matching accounts workflow that's completed
      // Match based on calculated due date (dueDate = periodEnd + 9 months)
      const accountsWorkflow = client.ltdAccountsWorkflows?.find((w: any) => {
        if (!w.filingPeriodEnd) return false
        const periodEnd = new Date(w.filingPeriodEnd)
        const calculatedDueDate = new Date(periodEnd)
        calculatedDueDate.setMonth(calculatedDueDate.getMonth() + 9)
        calculatedDueDate.setHours(0, 0, 0, 0)
        return calculatedDueDate.getTime() === dueDate.getTime()
      })
      return {
        isCompleted: accountsWorkflow?.isCompleted || !!accountsWorkflow?.filedDate || false,
        completedDate: accountsWorkflow?.filedDate ? new Date(accountsWorkflow.filedDate) : undefined
      }
      
    case 'vat':
      // Check if there's a matching VAT workflow that's completed
      // Match based on calculated due date (last day of month following quarter end)
      const vatWorkflow = client.vatQuartersWorkflow?.find((w: any) => {
        if (!w.quarterEndDate) return false
        const quarterEnd = new Date(w.quarterEndDate)
        
        // Use same calculation logic as in deadline generation
        const calculatedDueDate = new Date(quarterEnd)
        const quarterEndMonth = calculatedDueDate.getMonth() + 1 // Convert to 1-12
        const quarterEndYear = calculatedDueDate.getFullYear()
        
        // Month after quarter end, day 0 = last day of that month
        calculatedDueDate.setFullYear(quarterEndYear, quarterEndMonth + 1, 0)
        calculatedDueDate.setHours(0, 0, 0, 0)
        return calculatedDueDate.getTime() === dueDate.getTime()
      })
      return {
        isCompleted: vatWorkflow?.isCompleted || vatWorkflow?.filedToHMRCDate || vatWorkflow?.currentStage === 'FILED_TO_HMRC' || false,
        completedDate: vatWorkflow?.filedToHMRCDate ? new Date(vatWorkflow.filedToHMRCDate) : undefined
      }
      
    case 'confirmation':
    case 'corporation-tax':
      // For now, assume not completed unless specifically marked
      // TODO: Add completion tracking for CS and CT when workflow is implemented
      return { isCompleted: false }
      
    default:
      return { isCompleted: false }
  }
}

/**
 * UK ACCOUNTING DEADLINE CALCULATIONS
 * 
 * These functions implement the official UK deadlines for accounting compliance:
 * - Accounts filing: 9 months after year end
 * - Corporation Tax (CT600): 12 months after year end
 * - Corporation Tax payment: 9 months and 1 day after year end
 * - Confirmation Statement: Annual on anniversary of incorporation
 */

/**
 * Calculate accounts filing deadline (9 months after year end)
 * @param yearEndDate The accounting period end date
 * @returns Accounts filing deadline
 */
export function calculateAccountsFilingDeadline(yearEndDate: Date): Date {
  const deadline = new Date(yearEndDate)
  deadline.setMonth(deadline.getMonth() + 9)
  return deadline
}

/**
 * Calculate Corporation Tax (CT600) filing deadline (12 months after year end)
 * @param yearEndDate The accounting period end date
 * @returns CT600 filing deadline
 */
export function calculateCorporationTaxFilingDeadline(yearEndDate: Date): Date {
  const deadline = new Date(yearEndDate)
  deadline.setFullYear(deadline.getFullYear() + 1)
  return deadline
}

/**
 * Calculate Corporation Tax payment deadline (9 months and 1 day after year end)
 * @param yearEndDate The accounting period end date
 * @returns CT payment deadline
 */
export function calculateCorporationTaxPaymentDeadline(yearEndDate: Date): Date {
  const deadline = new Date(yearEndDate)
  deadline.setMonth(deadline.getMonth() + 9)
  deadline.setDate(deadline.getDate() + 1)
  return deadline
}

/**
 * Parse Companies House accounting reference date format
 * @param accountingReferenceDate JSON string like '{"day":"30","month":"09"}'
 * @param lastAccountsMadeUpTo Optional last accounts date to determine correct year
 * @returns Parsed year end date or null if invalid
 */
export function parseCompaniesHouseYearEnd(
  accountingReferenceDate: string | null,
  lastAccountsMadeUpTo: Date | null = null
): Date | null {
  if (!accountingReferenceDate) return null
  
  try {
    const parsed = JSON.parse(accountingReferenceDate)
    if (typeof parsed === 'object' && parsed && 'day' in parsed && 'month' in parsed) {
      // Calculate the correct year based on last accounts made up to date + 1 year
      let yearToUse = new Date().getFullYear() // Default fallback
      
      if (lastAccountsMadeUpTo) {
        // Use last accounts made up to date + 1 year for next year end
        const lastAccountsDate = new Date(lastAccountsMadeUpTo)
        yearToUse = lastAccountsDate.getFullYear() + 1
      } else {
        // Use current year or next year based on whether this year's year end has passed
        const today = new Date()
        const thisYearEnd = new Date(yearToUse, parseInt(parsed.month) - 1, parseInt(parsed.day))
        if (thisYearEnd <= today) {
          yearToUse = yearToUse + 1
        }
      }
      
      const month = parseInt(parsed.month) - 1 // JS months are 0-indexed
      const day = parseInt(parsed.day)
      const yearEndDate = new Date(yearToUse, month, day)
      
      return isNaN(yearEndDate.getTime()) ? null : yearEndDate
    }
  } catch (error) {
    console.warn('Error parsing accounting reference date:', error)
  }
  
  return null
}

/**
 * Calculate days until due date
 * @param dueDateString ISO date string
 * @returns Number of days (negative if overdue)
 */
export function calculateDaysUntilDue(dueDateString: string | null): number {
  if (!dueDateString) return 0
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dueDate = new Date(dueDateString)
  dueDate.setHours(0, 0, 0, 0)
  
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format days until due for display
 * @param days Number of days until due
 * @returns Formatted string like "Due in 15 days" or "Overdue by 3 days"
 */
export function formatDaysUntilDue(days: number): string {
  if (days === 0) return 'Due today'
  if (days > 0) return `Due in ${days} day${days === 1 ? '' : 's'}`
  return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
}

export interface DeadlineItem {
  id: string
  clientId: string
  clientName: string
  companyNumber?: string
  dueDate: Date
  type: 'accounts' | 'confirmation' | 'corporation-tax' | 'vat'
  assignedUser?: {
    id: string
    name: string
  }
  isOverdue: boolean
  daysUntilDue: number
  isCompleted: boolean
  completedDate?: Date
}

// Helper function to create deadline item
function createDeadlineItem(
  client: any,
  dueDate: Date,
  type: 'accounts' | 'confirmation' | 'corporation-tax' | 'vat',
  today: Date
): DeadlineItem {
  const timeDiff = dueDate.getTime() - today.getTime()
  const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
  const completionStatus = checkCompletionStatus(client, type, dueDate)
  
  return {
    id: `${client.id}-${type}`,
    clientId: client.id,
    clientName: client.companyName,
    companyNumber: client.companyNumber || undefined,
    dueDate: dueDate,
    type: type,
    assignedUser: client.assignedUser || undefined,
    isOverdue: daysUntilDue < 0 && !completionStatus.isCompleted,
    daysUntilDue: Math.abs(daysUntilDue),
    isCompleted: completionStatus.isCompleted,
    completedDate: completionStatus.completedDate
  }
}

export async function getAllDeadlines(): Promise<DeadlineItem[]> {
  try {
    // Fetch all clients with their assigned users and due dates
    const clients = await db.client.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        companyName: true,
        companyNumber: true,
        nextAccountsDue: true,
        nextConfirmationDue: true,
        nextCorporationTaxDue: true,
        nextVatReturnDue: true,
        assignedUser: {
          select: {
            id: true,
            name: true
          }
        },
        ltdAccountsWorkflows: {
          select: {
            filingPeriodEnd: true,
            isCompleted: true,
            filedDate: true,
            currentStage: true
          }
        },
        vatQuartersWorkflow: {
          select: {
            quarterEndDate: true,
            isCompleted: true,
            filedToHMRCDate: true,
            currentStage: true
          }
        }
      }
    })

    const deadlines: DeadlineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const client of clients) {
      // Process accounts due dates
      if (client.nextAccountsDue) {
        const dueDate = new Date(client.nextAccountsDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'accounts', today))
      }

      // Process confirmation statement due dates
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'confirmation', today))
      }

      // Process corporation tax due dates
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'corporation-tax', today))
      }

      // Process VAT return due dates
      if (client.nextVatReturnDue) {
        const dueDate = new Date(client.nextVatReturnDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'vat', today))
      }

      // Process ADDITIONAL deadlines from workflows (including completed ones)
      // This ensures completed deadlines show up in calendar
      
      // Process accounts from workflows (even if completed)
      if (client.ltdAccountsWorkflows && client.ltdAccountsWorkflows.length > 0) {
        client.ltdAccountsWorkflows.forEach(workflow => {
          if (workflow.filingPeriodEnd) {
            const workflowDueDate = new Date(workflow.filingPeriodEnd)
            workflowDueDate.setHours(0, 0, 0, 0)
            
            // Calculate accounts due date (9 months after year end)
            const accountsDueDate = new Date(workflowDueDate)
            accountsDueDate.setMonth(accountsDueDate.getMonth() + 9)
            
            // Check if this deadline is already added from nextAccountsDue
            const existingAccountsDeadline = deadlines.find(d => 
              d.clientId === client.id && 
              d.type === 'accounts' && 
              d.dueDate.getTime() === accountsDueDate.getTime()
            )
            
            // Only add if not already present
            if (!existingAccountsDeadline) {
              deadlines.push(createDeadlineItem(client, accountsDueDate, 'accounts', today))
            }
          }
        })
      }

      // Process VAT from workflows (even if completed)
      if (client.vatQuartersWorkflow && client.vatQuartersWorkflow.length > 0) {
        client.vatQuartersWorkflow.forEach(workflow => {
          if (workflow.quarterEndDate) {
            const quarterEndDate = new Date(workflow.quarterEndDate)
            quarterEndDate.setHours(0, 0, 0, 0)
            
            // Calculate VAT due date (last day of month following quarter end)
            // UK VAT Rule: Filing due by last day of month following quarter end
            // Example: June 30th quarter end → July 31st filing deadline
            const vatDueDate = new Date(quarterEndDate)
            const quarterEndMonth = vatDueDate.getMonth() + 1 // Convert to 1-12
            const quarterEndYear = vatDueDate.getFullYear()
            
            // Month after quarter end, day 0 = last day of that month
            vatDueDate.setFullYear(quarterEndYear, quarterEndMonth + 1, 0)
            
            // Check if this deadline is already added from nextVatReturnDue
            const existingVatDeadline = deadlines.find(d => 
              d.clientId === client.id && 
              d.type === 'vat' && 
              d.dueDate.getTime() === vatDueDate.getTime()
            )
            
            // Only add if not already present
            if (!existingVatDeadline) {
              deadlines.push(createDeadlineItem(client, vatDueDate, 'vat', today))
            }
          }
        })
      }
    }

    // Sort by due date (earliest first)
    return deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  } catch (error) {
    console.error('Error fetching deadlines:', error)
    return []
  }
}

export async function getDeadlinesForUser(userId: string): Promise<DeadlineItem[]> {
  try {
    const clients = await db.client.findMany({
      where: {
        isActive: true,
        assignedUserId: userId
      },
      select: {
        id: true,
        companyName: true,
        companyNumber: true,
        nextAccountsDue: true,
        nextConfirmationDue: true,
        nextCorporationTaxDue: true,
        nextVatReturnDue: true,
        assignedUser: {
          select: {
            id: true,
            name: true
          }
        },
        ltdAccountsWorkflows: {
          select: {
            filingPeriodEnd: true,
            isCompleted: true,
            filedDate: true,
            currentStage: true
          }
        },
        vatQuartersWorkflow: {
          select: {
            quarterEndDate: true,
            isCompleted: true,
            filedToHMRCDate: true,
            currentStage: true
          }
        }
      }
    })

    const deadlines: DeadlineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const client of clients) {
      // Process accounts due dates
      if (client.nextAccountsDue) {
        const dueDate = new Date(client.nextAccountsDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'accounts', today))
      }

      // Process confirmation statement due dates
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'confirmation', today))
      }

      // Process corporation tax due dates
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'corporation-tax', today))
      }

      // Process VAT return due dates
      if (client.nextVatReturnDue) {
        const dueDate = new Date(client.nextVatReturnDue)
        dueDate.setHours(0, 0, 0, 0)
        
        deadlines.push(createDeadlineItem(client, dueDate, 'vat', today))
      }

      // Process ADDITIONAL deadlines from workflows (including completed ones)
      // This ensures completed deadlines show up in calendar
      
      // Process accounts from workflows (even if completed)
      if (client.ltdAccountsWorkflows && client.ltdAccountsWorkflows.length > 0) {
        client.ltdAccountsWorkflows.forEach(workflow => {
          if (workflow.filingPeriodEnd) {
            const workflowDueDate = new Date(workflow.filingPeriodEnd)
            workflowDueDate.setHours(0, 0, 0, 0)
            
            // Calculate accounts due date (9 months after year end)
            const accountsDueDate = new Date(workflowDueDate)
            accountsDueDate.setMonth(accountsDueDate.getMonth() + 9)
            
            // Check if this deadline is already added from nextAccountsDue
            const existingAccountsDeadline = deadlines.find(d => 
              d.clientId === client.id && 
              d.type === 'accounts' && 
              d.dueDate.getTime() === accountsDueDate.getTime()
            )
            
            // Only add if not already present
            if (!existingAccountsDeadline) {
              deadlines.push(createDeadlineItem(client, accountsDueDate, 'accounts', today))
            }
          }
        })
      }

      // Process VAT from workflows (even if completed)
      if (client.vatQuartersWorkflow && client.vatQuartersWorkflow.length > 0) {
        client.vatQuartersWorkflow.forEach(workflow => {
          if (workflow.quarterEndDate) {
            const quarterEndDate = new Date(workflow.quarterEndDate)
            quarterEndDate.setHours(0, 0, 0, 0)
            
            // Calculate VAT due date (last day of month following quarter end)
            // UK VAT Rule: Filing due by last day of month following quarter end
            // Example: June 30th quarter end → July 31st filing deadline
            const vatDueDate = new Date(quarterEndDate)
            const quarterEndMonth = vatDueDate.getMonth() + 1 // Convert to 1-12
            const quarterEndYear = vatDueDate.getFullYear()
            
            // Month after quarter end, day 0 = last day of that month
            vatDueDate.setFullYear(quarterEndYear, quarterEndMonth + 1, 0)
            
            // Check if this deadline is already added from nextVatReturnDue
            const existingVatDeadline = deadlines.find(d => 
              d.clientId === client.id && 
              d.type === 'vat' && 
              d.dueDate.getTime() === vatDueDate.getTime()
            )
            
            // Only add if not already present
            if (!existingVatDeadline) {
              deadlines.push(createDeadlineItem(client, vatDueDate, 'vat', today))
            }
          }
        })
      }
    }

    return deadlines
  } catch (error) {
    console.error('Error fetching user deadlines:', error)
    return []
  }
}

export async function getDeadlinesInDateRange(startDate: Date, endDate: Date): Promise<DeadlineItem[]> {
  try {
    // For date range queries, we need to fetch all clients and then filter
    // because workflow-based deadlines need to be calculated
    const clients = await db.client.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        companyName: true,
        companyNumber: true,
        nextAccountsDue: true,
        nextConfirmationDue: true,
        nextCorporationTaxDue: true,
        nextVatReturnDue: true,
        assignedUser: {
          select: {
            id: true,
            name: true
          }
        },
        ltdAccountsWorkflows: {
          select: {
            filingPeriodEnd: true,
            isCompleted: true,
            filedDate: true,
            currentStage: true
          }
        },
        vatQuartersWorkflow: {
          select: {
            quarterEndDate: true,
            isCompleted: true,
            filedToHMRCDate: true,
            currentStage: true
          }
        }
      }
    })

    const deadlines: DeadlineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const client of clients) {
      // Process accounts due dates
      if (client.nextAccountsDue) {
        const dueDate = new Date(client.nextAccountsDue)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'accounts', today))
        }
      }

      // Process confirmation statement due dates
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'confirmation', today))
        }
      }

      // Process corporation tax due dates
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'corporation-tax', today))
        }
      }

      // Process VAT return due dates
      if (client.nextVatReturnDue) {
        const dueDate = new Date(client.nextVatReturnDue)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'vat', today))
        }
      }

      // Process ADDITIONAL deadlines from workflows (including completed ones)
      // This ensures completed deadlines show up in calendar
      
      // Process accounts from workflows (even if completed)
      if (client.ltdAccountsWorkflows && client.ltdAccountsWorkflows.length > 0) {
        client.ltdAccountsWorkflows.forEach(workflow => {
          if (workflow.filingPeriodEnd) {
            const workflowDueDate = new Date(workflow.filingPeriodEnd)
            workflowDueDate.setHours(0, 0, 0, 0)
            
            // Calculate accounts due date (9 months after year end)
            const accountsDueDate = new Date(workflowDueDate)
            accountsDueDate.setMonth(accountsDueDate.getMonth() + 9)
            
            // Check if this deadline falls within the date range
            if (accountsDueDate >= startDate && accountsDueDate <= endDate) {
              // Check if this deadline is already added from nextAccountsDue
              const existingAccountsDeadline = deadlines.find(d => 
                d.clientId === client.id && 
                d.type === 'accounts' && 
                d.dueDate.getTime() === accountsDueDate.getTime()
              )
              
              // Only add if not already present
              if (!existingAccountsDeadline) {
                deadlines.push(createDeadlineItem(client, accountsDueDate, 'accounts', today))
              }
            }
          }
        })
      }

      // Process VAT from workflows (even if completed)
      if (client.vatQuartersWorkflow && client.vatQuartersWorkflow.length > 0) {
        client.vatQuartersWorkflow.forEach(workflow => {
          if (workflow.quarterEndDate) {
            const quarterEndDate = new Date(workflow.quarterEndDate)
            quarterEndDate.setHours(0, 0, 0, 0)
            
            // Calculate VAT due date (last day of month following quarter end)
            // UK VAT Rule: Filing due by last day of month following quarter end
            // Example: June 30th quarter end → July 31st filing deadline
            const vatDueDate = new Date(quarterEndDate)
            const quarterEndMonth = vatDueDate.getMonth() + 1 // Convert to 1-12
            const quarterEndYear = vatDueDate.getFullYear()
            
            // Month after quarter end, day 0 = last day of that month
            vatDueDate.setFullYear(quarterEndYear, quarterEndMonth + 1, 0)
            
            // Check if this deadline falls within the date range
            if (vatDueDate >= startDate && vatDueDate <= endDate) {
              // Check if this deadline is already added from nextVatReturnDue
              const existingVatDeadline = deadlines.find(d => 
                d.clientId === client.id && 
                d.type === 'vat' && 
                d.dueDate.getTime() === vatDueDate.getTime()
              )
              
              // Only add if not already present
              if (!existingVatDeadline) {
                deadlines.push(createDeadlineItem(client, vatDueDate, 'vat', today))
              }
            }
          }
        })
      }
    }

    return deadlines
  } catch (error) {
    console.error('Error fetching deadlines in date range:', error)
    return []
  }
}

export function getUpcomingDeadlines(deadlines: DeadlineItem[], days: number = 30): DeadlineItem[] {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + days)
  
  return deadlines.filter(deadline => 
    deadline.dueDate >= today && deadline.dueDate <= futureDate
  ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}

export function getOverdueDeadlines(deadlines: DeadlineItem[]): DeadlineItem[] {
  return deadlines.filter(deadline => deadline.isOverdue)
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()) // Most overdue first
}

export function groupDeadlinesByMonth(deadlines: DeadlineItem[]): Record<string, DeadlineItem[]> {
  const grouped: Record<string, DeadlineItem[]> = {}
  
  deadlines.forEach(deadline => {
    const monthKey = deadline.dueDate.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'long' 
    })
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = []
    }
    grouped[monthKey].push(deadline)
  })
  
  return grouped
}

export function getDeadlineStats(deadlines: DeadlineItem[]) {
  const today = new Date()
  const overdue = deadlines.filter(d => d.isOverdue).length
  const dueThisWeek = deadlines.filter(d => {
    const daysUntil = Math.ceil((d.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 7
  }).length
  const dueThisMonth = deadlines.filter(d => {
    const daysUntil = Math.ceil((d.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 30
  }).length
  
  return {
    total: deadlines.length,
    overdue,
    dueThisWeek,
    dueThisMonth,
    accounts: deadlines.filter(d => d.type === 'accounts').length,
    confirmations: deadlines.filter(d => d.type === 'confirmation').length
  }
} 