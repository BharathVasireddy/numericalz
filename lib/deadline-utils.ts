import { db } from '@/lib/db'
import { getLondonDateStart } from '@/lib/london-time'

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
        isCompleted: accountsWorkflow?.isCompleted || !!accountsWorkflow?.filedDate || accountsWorkflow?.currentStage === 'CLIENT_SELF_FILING' || false,
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
  
  const today = getLondonDateStart()
  const dueDate = getLondonDateStart(new Date(dueDateString))
  
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
  today: Date,
  assignedUser?: {
    id: string
    name: string
  } | null,
  vatQuarter?: any // Add VAT quarter parameter for VAT-specific assignments
): DeadlineItem {
  const timeDiff = dueDate.getTime() - today.getTime()
  const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
  const completionStatus = checkCompletionStatus(client, type, dueDate)
  
  // Determine the correct assigned user based on deadline type
  let finalAssignedUser: { id: string; name: string } | undefined
  
  if (type === 'vat') {
    // For VAT deadlines, use VAT quarter assignment first, then VAT client assignment, then general assignment
    if (vatQuarter?.assignedUser) {
      finalAssignedUser = vatQuarter.assignedUser
    } else if (client.vatAssignedUser) {
      finalAssignedUser = client.vatAssignedUser
    } else if (client.assignedUser) {
      finalAssignedUser = client.assignedUser
    }
  } else if (type === 'accounts' || type === 'corporation-tax') {
    // For accounts/corporation tax deadlines, use accounts assignment first, then general assignment
    if (client.ltdCompanyAssignedUser) {
      finalAssignedUser = client.ltdCompanyAssignedUser
    } else if (client.assignedUser) {
      finalAssignedUser = client.assignedUser
    }
  } else {
    // For confirmation statements, use general assignment
    if (client.assignedUser) {
      finalAssignedUser = client.assignedUser
    }
  }
  
  return {
    id: `${client.id}-${type}`,
    clientId: client.id,
    clientName: client.companyName,
    companyNumber: client.companyNumber || undefined,
    dueDate: dueDate,
    type: type,
    assignedUser: finalAssignedUser,
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
        // Add VAT-specific assignment
        vatAssignedUser: {
          select: {
            id: true,
            name: true
          }
        },
        // Add accounts-specific assignment
        ltdCompanyAssignedUser: {
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
            currentStage: true,
            assignedUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        vatQuartersWorkflow: {
          select: {
            quarterEndDate: true,
            filingDueDate: true,
            isCompleted: true,
            currentStage: true,
            assignedUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const deadlines: DeadlineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    clients.forEach(client => {
      // Create deadlines from direct client fields
      if (client.nextAccountsDue) {
        deadlines.push(createDeadlineItem(client, new Date(client.nextAccountsDue), 'accounts', today))
      }
      
      if (client.nextConfirmationDue) {
        deadlines.push(createDeadlineItem(client, new Date(client.nextConfirmationDue), 'confirmation', today))
      }
      
      if (client.nextCorporationTaxDue) {
        deadlines.push(createDeadlineItem(client, new Date(client.nextCorporationTaxDue), 'corporation-tax', today))
      }
      
      if (client.nextVatReturnDue) {
        // Find the current VAT quarter for this due date
        const vatQuarter = client.vatQuartersWorkflow?.find((q: any) => {
          const quarterFilingDue = new Date(q.filingDueDate)
          const clientVatDue = new Date(client.nextVatReturnDue!)
          return Math.abs(quarterFilingDue.getTime() - clientVatDue.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
        })
        
        deadlines.push(createDeadlineItem(client, new Date(client.nextVatReturnDue), 'vat', today, null, vatQuarter))
      }
      
      // Create workflow-based deadlines only if official deadlines don't exist
      if (!client.nextAccountsDue && client.ltdAccountsWorkflows) {
        client.ltdAccountsWorkflows.forEach((workflow: any) => {
          if (!workflow.isCompleted && !workflow.filedDate) {
            const workflowDueDate = new Date(workflow.filingPeriodEnd)
            
            // Calculate accounts due date (9 months after year end)
            const accountsDueDate = new Date(workflowDueDate)
            accountsDueDate.setMonth(accountsDueDate.getMonth() + 9)
            
            deadlines.push(createDeadlineItem(client, accountsDueDate, 'accounts', today))
          }
        })
      }
      
      if (!client.nextVatReturnDue && client.vatQuartersWorkflow) {
        client.vatQuartersWorkflow.forEach((quarter: any) => {
          if (!quarter.isCompleted && quarter.filingDueDate) {
            deadlines.push(createDeadlineItem(client, new Date(quarter.filingDueDate), 'vat', today, null, quarter))
          }
        })
      }
    })

    return deadlines
  } catch (error) {
    console.error('Error fetching deadlines:', error)
    throw error
  }
}

export async function getDeadlinesForUser(userId: string): Promise<DeadlineItem[]> {
  try {
    const clients = await db.client.findMany({
      where: {
        isActive: true,
        OR: [
          { assignedUserId: userId },
          { vatAssignedUserId: userId },
          { ltdCompanyAssignedUserId: userId },
          { 
            ltdAccountsWorkflows: {
              some: {
                assignedUserId: userId
              }
            }
          },
          {
            vatQuartersWorkflow: {
              some: {
                assignedUserId: userId
              }
            }
          }
        ]
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
        // Add VAT-specific assignment
        vatAssignedUser: {
          select: {
            id: true,
            name: true
          }
        },
        // Add accounts-specific assignment
        ltdCompanyAssignedUser: {
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
            currentStage: true,
            assignedUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        vatQuartersWorkflow: {
          select: {
            quarterEndDate: true,
            filingDueDate: true,
            isCompleted: true,
            currentStage: true,
            assignedUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const deadlines: DeadlineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    clients.forEach(client => {
      // Create deadlines from direct client fields
      if (client.nextAccountsDue) {
        const deadline = createDeadlineItem(client, new Date(client.nextAccountsDue), 'accounts', today)
        // Only include if this user is assigned to this deadline
        if (deadline.assignedUser?.id === userId) {
          deadlines.push(deadline)
        }
      }
      
      if (client.nextConfirmationDue) {
        const deadline = createDeadlineItem(client, new Date(client.nextConfirmationDue), 'confirmation', today)
        // Only include if this user is assigned to this deadline
        if (deadline.assignedUser?.id === userId) {
          deadlines.push(deadline)
        }
      }
      
      if (client.nextCorporationTaxDue) {
        const deadline = createDeadlineItem(client, new Date(client.nextCorporationTaxDue), 'corporation-tax', today)
        // Only include if this user is assigned to this deadline
        if (deadline.assignedUser?.id === userId) {
          deadlines.push(deadline)
        }
      }
      
      if (client.nextVatReturnDue) {
        // Find the current VAT quarter for this due date
        const vatQuarter = client.vatQuartersWorkflow?.find((q: any) => {
          const quarterFilingDue = new Date(q.filingDueDate)
          const clientVatDue = new Date(client.nextVatReturnDue!)
          return Math.abs(quarterFilingDue.getTime() - clientVatDue.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
        })
        
        const deadline = createDeadlineItem(client, new Date(client.nextVatReturnDue), 'vat', today, null, vatQuarter)
        // Only include if this user is assigned to this deadline
        if (deadline.assignedUser?.id === userId) {
          deadlines.push(deadline)
        }
      }
      
      // Create workflow-based deadlines only if official deadlines don't exist
      if (!client.nextAccountsDue && client.ltdAccountsWorkflows) {
        client.ltdAccountsWorkflows.forEach((workflow: any) => {
          if (!workflow.isCompleted && !workflow.filedDate) {
            const workflowDueDate = new Date(workflow.filingPeriodEnd)
            
            // Calculate accounts due date (9 months after year end)
            const accountsDueDate = new Date(workflowDueDate)
            accountsDueDate.setMonth(accountsDueDate.getMonth() + 9)
            
            const deadline = createDeadlineItem(client, accountsDueDate, 'accounts', today)
            // Only include if this user is assigned to this deadline
            if (deadline.assignedUser?.id === userId) {
              deadlines.push(deadline)
            }
          }
        })
      }
      
      if (!client.nextVatReturnDue && client.vatQuartersWorkflow) {
        client.vatQuartersWorkflow.forEach((quarter: any) => {
          if (!quarter.isCompleted && quarter.filingDueDate) {
            const deadline = createDeadlineItem(client, new Date(quarter.filingDueDate), 'vat', today, null, quarter)
            // Only include if this user is assigned to this deadline
            if (deadline.assignedUser?.id === userId) {
              deadlines.push(deadline)
            }
          }
        })
      }
    })

    return deadlines
  } catch (error) {
    console.error('Error fetching user deadlines:', error)
    throw error
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
        // Add VAT-specific assignment
        vatAssignedUser: {
          select: {
            id: true,
            name: true
          }
        },
        // Add accounts-specific assignment
        ltdCompanyAssignedUser: {
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
            currentStage: true,
            assignedUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        vatQuartersWorkflow: {
          select: {
            quarterEndDate: true,
            filingDueDate: true,
            isCompleted: true,
            currentStage: true,
            assignedUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const deadlines: DeadlineItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    clients.forEach(client => {
      // Create deadlines from direct client fields
      if (client.nextAccountsDue) {
        const dueDate = new Date(client.nextAccountsDue)
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'accounts', today))
        }
      }
      
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'confirmation', today))
        }
      }
      
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        if (dueDate >= startDate && dueDate <= endDate) {
          deadlines.push(createDeadlineItem(client, dueDate, 'corporation-tax', today))
        }
      }
      
      if (client.nextVatReturnDue) {
        const dueDate = new Date(client.nextVatReturnDue)
        if (dueDate >= startDate && dueDate <= endDate) {
          // Find the current VAT quarter for this due date
          const vatQuarter = client.vatQuartersWorkflow?.find((q: any) => {
            const quarterFilingDue = new Date(q.filingDueDate)
            const clientVatDue = new Date(client.nextVatReturnDue!)
            return Math.abs(quarterFilingDue.getTime() - clientVatDue.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
          })
          
          deadlines.push(createDeadlineItem(client, dueDate, 'vat', today, null, vatQuarter))
        }
      }
      
      // Create workflow-based deadlines only if official deadlines don't exist
      if (!client.nextAccountsDue && client.ltdAccountsWorkflows) {
        client.ltdAccountsWorkflows.forEach((workflow: any) => {
          if (!workflow.isCompleted && !workflow.filedDate) {
            const workflowDueDate = new Date(workflow.filingPeriodEnd)
            
            // Calculate accounts due date (9 months after year end)
            const accountsDueDate = new Date(workflowDueDate)
            accountsDueDate.setMonth(accountsDueDate.getMonth() + 9)
            
            if (accountsDueDate >= startDate && accountsDueDate <= endDate) {
              deadlines.push(createDeadlineItem(client, accountsDueDate, 'accounts', today))
            }
          }
        })
      }
      
      if (!client.nextVatReturnDue && client.vatQuartersWorkflow) {
        client.vatQuartersWorkflow.forEach((quarter: any) => {
          if (!quarter.isCompleted && quarter.filingDueDate) {
            const dueDate = new Date(quarter.filingDueDate)
            if (dueDate >= startDate && dueDate <= endDate) {
              deadlines.push(createDeadlineItem(client, dueDate, 'vat', today, null, quarter))
            }
          }
        })
      }
    })

    return deadlines
  } catch (error) {
    console.error('Error fetching deadlines in date range:', error)
    throw error
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