import { db } from '@/lib/db'

export interface DeadlineItem {
  id: string
  clientId: string
  clientName: string
  companyNumber?: string
  dueDate: Date
  type: 'accounts' | 'confirmation' | 'corporation-tax'
  assignedUser?: {
    id: string
    name: string
  }
  isOverdue: boolean
  daysUntilDue: number
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
        assignedUser: {
          select: {
            id: true,
            name: true
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
        
        const timeDiff = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${client.id}-accounts`,
          clientId: client.id,
          clientName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          dueDate: dueDate,
          type: 'accounts',
          assignedUser: client.assignedUser || undefined,
          isOverdue: daysUntilDue < 0,
          daysUntilDue: Math.abs(daysUntilDue)
        })
      }

      // Process confirmation statement due dates
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        dueDate.setHours(0, 0, 0, 0)
        
        const timeDiff = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${client.id}-confirmation`,
          clientId: client.id,
          clientName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          dueDate: dueDate,
          type: 'confirmation',
          assignedUser: client.assignedUser || undefined,
          isOverdue: daysUntilDue < 0,
          daysUntilDue: Math.abs(daysUntilDue)
        })
      }

      // Process corporation tax due dates
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        dueDate.setHours(0, 0, 0, 0)
        
        const timeDiff = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${client.id}-corporation-tax`,
          clientId: client.id,
          clientName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          dueDate: dueDate,
          type: 'corporation-tax',
          assignedUser: client.assignedUser || undefined,
          isOverdue: daysUntilDue < 0,
          daysUntilDue: Math.abs(daysUntilDue)
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
        assignedUser: {
          select: {
            id: true,
            name: true
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
        
        const timeDiff = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${client.id}-accounts`,
          clientId: client.id,
          clientName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          dueDate: dueDate,
          type: 'accounts',
          assignedUser: client.assignedUser || undefined,
          isOverdue: daysUntilDue < 0,
          daysUntilDue: Math.abs(daysUntilDue)
        })
      }

      // Process confirmation statement due dates
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        dueDate.setHours(0, 0, 0, 0)
        
        const timeDiff = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${client.id}-confirmation`,
          clientId: client.id,
          clientName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          dueDate: dueDate,
          type: 'confirmation',
          assignedUser: client.assignedUser || undefined,
          isOverdue: daysUntilDue < 0,
          daysUntilDue: Math.abs(daysUntilDue)
        })
      }

      // Process corporation tax due dates
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        dueDate.setHours(0, 0, 0, 0)
        
        const timeDiff = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
        
        deadlines.push({
          id: `${client.id}-corporation-tax`,
          clientId: client.id,
          clientName: client.companyName,
          companyNumber: client.companyNumber || undefined,
          dueDate: dueDate,
          type: 'corporation-tax',
          assignedUser: client.assignedUser || undefined,
          isOverdue: daysUntilDue < 0,
          daysUntilDue: Math.abs(daysUntilDue)
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
    const clients = await db.client.findMany({
      where: {
        isActive: true,
        OR: [
          {
            nextAccountsDue: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            nextConfirmationDue: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            nextCorporationTaxDue: {
              gte: startDate,
              lte: endDate
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
        assignedUser: {
          select: {
            id: true,
            name: true
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
          const timeDiff = dueDate.getTime() - today.getTime()
          const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
          
          deadlines.push({
            id: `${client.id}-accounts`,
            clientId: client.id,
            clientName: client.companyName,
            companyNumber: client.companyNumber || undefined,
            dueDate: dueDate,
            type: 'accounts',
            assignedUser: client.assignedUser || undefined,
            isOverdue: daysUntilDue < 0,
            daysUntilDue: Math.abs(daysUntilDue)
          })
        }
      }

      // Process confirmation statement due dates
      if (client.nextConfirmationDue) {
        const dueDate = new Date(client.nextConfirmationDue)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate >= startDate && dueDate <= endDate) {
          const timeDiff = dueDate.getTime() - today.getTime()
          const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
          
          deadlines.push({
            id: `${client.id}-confirmation`,
            clientId: client.id,
            clientName: client.companyName,
            companyNumber: client.companyNumber || undefined,
            dueDate: dueDate,
            type: 'confirmation',
            assignedUser: client.assignedUser || undefined,
            isOverdue: daysUntilDue < 0,
            daysUntilDue: Math.abs(daysUntilDue)
          })
        }
      }

      // Process corporation tax due dates
      if (client.nextCorporationTaxDue) {
        const dueDate = new Date(client.nextCorporationTaxDue)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate >= startDate && dueDate <= endDate) {
          const timeDiff = dueDate.getTime() - today.getTime()
          const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
          
          deadlines.push({
            id: `${client.id}-corporation-tax`,
            clientId: client.id,
            clientName: client.companyName,
            companyNumber: client.companyNumber || undefined,
            dueDate: dueDate,
            type: 'corporation-tax',
            assignedUser: client.assignedUser || undefined,
            isOverdue: daysUntilDue < 0,
            daysUntilDue: Math.abs(daysUntilDue)
          })
        }
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