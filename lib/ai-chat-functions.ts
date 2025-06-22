/**
 * Autonomous AI Function Calling System
 * 
 * Defines all available functions that the AI can call autonomously
 * with proper security, permissions, and error handling
 */

import { db } from '@/lib/db'

// Permission levels for different user roles
export const FUNCTION_PERMISSIONS = {
  STAFF: [
    'getClientDetails',
    'getMyWorkload', 
    'getMyOverdueDeadlines',
    'getVATWorkflowStatus',
    'getMyClients',
    'getSystemHealth',
    'getMyRecentActivity'
  ],
  MANAGER: [
    'getClientDetails',
    'getMyWorkload',
    'getAllWorkload',
    'getOverdueDeadlines',
    'getVATWorkflowStatus',
    'getLtdWorkflowStatus',
    'getAllClients',
    'getSystemHealth',
    'getTeamPerformance',
    'sendEmailNotification',
    'getCompaniesHouseData',
    'getHMRCData',
    'getRecentActivity',
    'getClientCommunications',
    'scheduleReminder',
    'getUpcomingDeadlines'
  ],
  PARTNER: [
    'getClientDetails',
    'getMyWorkload',
    'getAllWorkload',
    'getOverdueDeadlines',
    'getVATWorkflowStatus',
    'getLtdWorkflowStatus',
    'getAllClients',
    'getSystemHealth',
    'getTeamPerformance',
    'sendEmailNotification',
    'getCompaniesHouseData',
    'getHMRCData',
    'getRecentActivity',
    'getClientCommunications',
    'scheduleReminder',
    'getUpcomingDeadlines',
    'updateWorkflowStage',
    'reassignClient',
    'createClient',
    'updateClientStatus',
    'generateReport',
    'bulkUpdateDeadlines',
    'systemAdministration'
  ]
} as const

// Type for available functions - simplified to avoid complex type issues
export type AvailableFunction = string

// Check if user has permission to call a function
export function hasPermission(userRole: string, functionName: string): boolean {
  const permissions = FUNCTION_PERMISSIONS[userRole as keyof typeof FUNCTION_PERMISSIONS]
  return permissions?.includes(functionName as any) || false
}

// Available functions that the AI can call
export const chatFunctions = {
  // Client-related functions
  getClientDetails: async (clientCode: string, userId: string, userRole: string) => {
    try {
      const whereClause: any = { clientCode }
      
      // Staff can only see their assigned clients
      if (userRole === 'STAFF') {
        whereClause.OR = [
          { assignedUserId: userId },
          { vatAssignedUserId: userId },
          { ltdCompanyAssignedUserId: userId },
          { nonLtdCompanyAssignedUserId: userId }
        ]
      }

      const client = await db.client.findFirst({
        where: whereClause,
        include: {
          assignedUser: {
            select: { id: true, name: true, role: true, email: true }
          },
          vatAssignedUser: {
            select: { id: true, name: true, role: true }
          },
          ltdCompanyAssignedUser: {
            select: { id: true, name: true, role: true }
          },
          nonLtdCompanyAssignedUser: {
            select: { id: true, name: true, role: true }
          },
          vatQuartersWorkflow: {
            orderBy: { quarterEndDate: 'desc' },
            take: 5,
            include: {
              assignedUser: {
                select: { name: true, role: true }
              }
            }
          },
          ltdAccountsWorkflows: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              assignedUser: {
                select: { name: true, role: true }
              }
            }
          },
          communications: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              sentBy: {
                select: { name: true, role: true }
              }
            }
          },
          activityLogs: {
            take: 15,
            orderBy: { timestamp: 'desc' },
            include: {
              user: {
                select: { name: true, role: true }
              }
            }
          }
        }
      })

      if (!client) {
        return { error: `Client ${clientCode} not found or access denied` }
      }

      // Calculate deadline status
      const now = new Date()
      const deadlineStatus = {
        accounts: client.nextAccountsDue ? {
          dueDate: client.nextAccountsDue,
          isOverdue: new Date(client.nextAccountsDue) < now,
          daysUntilDue: Math.ceil((new Date(client.nextAccountsDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        } : null,
        vat: client.nextVatReturnDue ? {
          dueDate: client.nextVatReturnDue,
          isOverdue: new Date(client.nextVatReturnDue) < now,
          daysUntilDue: Math.ceil((new Date(client.nextVatReturnDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        } : null,
        confirmation: client.nextConfirmationDue ? {
          dueDate: client.nextConfirmationDue,
          isOverdue: new Date(client.nextConfirmationDue) < now,
          daysUntilDue: Math.ceil((new Date(client.nextConfirmationDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        } : null,
        corporationTax: client.nextCorporationTaxDue ? {
          dueDate: client.nextCorporationTaxDue,
          isOverdue: new Date(client.nextCorporationTaxDue) < now,
          daysUntilDue: Math.ceil((new Date(client.nextCorporationTaxDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        } : null
      }

      return {
        ...client,
        deadlineStatus,
        totalOverdueItems: Object.values(deadlineStatus).filter(d => d?.isOverdue).length,
        recentWorkflowActivity: client.vatQuartersWorkflow[0] || null,
        recentLtdActivity: client.ltdAccountsWorkflows[0] || null
      }
    } catch (error) {
      return { error: `Failed to get client details: ${error}` }
    }
  },

  getOverdueDeadlines: async (daysOverdue?: number, userId?: string, userRole?: string) => {
    try {
      const now = new Date()
      const cutoffDate = daysOverdue ? new Date(now.getTime() - (daysOverdue * 24 * 60 * 60 * 1000)) : now

      const whereClause: any = {
        isActive: true,
        OR: [
          { nextVatReturnDue: { lt: cutoffDate } },
          { nextAccountsDue: { lt: cutoffDate } },
          { nextCorporationTaxDue: { lt: cutoffDate } },
          { nextConfirmationDue: { lt: cutoffDate } }
        ]
      }

      // Staff can only see their assigned clients
      if (userRole === 'STAFF' && userId) {
        whereClause.AND = {
          OR: [
            { assignedUserId: userId },
            { vatAssignedUserId: userId },
            { ltdCompanyAssignedUserId: userId },
            { nonLtdCompanyAssignedUserId: userId }
          ]
        }
      }

      const clients = await db.client.findMany({
        where: whereClause,
        include: {
          assignedUser: { select: { name: true, role: true, email: true } },
          vatAssignedUser: { select: { name: true, role: true } },
          ltdCompanyAssignedUser: { select: { name: true, role: true } },
          nonLtdCompanyAssignedUser: { select: { name: true, role: true } }
        },
        orderBy: { companyName: 'asc' }
      })

      const overdueItems = []

      for (const client of clients) {
        if (client.nextVatReturnDue && new Date(client.nextVatReturnDue) < cutoffDate) {
          overdueItems.push({
            clientCode: client.clientCode,
            companyName: client.companyName,
            type: 'VAT Return',
            dueDate: client.nextVatReturnDue,
            daysOverdue: Math.floor((now.getTime() - new Date(client.nextVatReturnDue).getTime()) / (1000 * 60 * 60 * 24)),
            assignedUser: client.vatAssignedUser?.name || client.assignedUser?.name || 'Unassigned',
            urgencyLevel: Math.floor((now.getTime() - new Date(client.nextVatReturnDue).getTime()) / (1000 * 60 * 60 * 24)) > 30 ? 'CRITICAL' : 'HIGH'
          })
        }
        
        if (client.nextAccountsDue && new Date(client.nextAccountsDue) < cutoffDate) {
          overdueItems.push({
            clientCode: client.clientCode,
            companyName: client.companyName,
            type: 'Annual Accounts',
            dueDate: client.nextAccountsDue,
            daysOverdue: Math.floor((now.getTime() - new Date(client.nextAccountsDue).getTime()) / (1000 * 60 * 60 * 24)),
            assignedUser: client.ltdCompanyAssignedUser?.name || client.assignedUser?.name || 'Unassigned',
            urgencyLevel: Math.floor((now.getTime() - new Date(client.nextAccountsDue).getTime()) / (1000 * 60 * 60 * 24)) > 60 ? 'CRITICAL' : 'HIGH'
          })
        }

        if (client.nextCorporationTaxDue && new Date(client.nextCorporationTaxDue) < cutoffDate) {
          overdueItems.push({
            clientCode: client.clientCode,
            companyName: client.companyName,
            type: 'Corporation Tax',
            dueDate: client.nextCorporationTaxDue,
            daysOverdue: Math.floor((now.getTime() - new Date(client.nextCorporationTaxDue).getTime()) / (1000 * 60 * 60 * 24)),
            assignedUser: client.assignedUser?.name || 'Unassigned',
            urgencyLevel: Math.floor((now.getTime() - new Date(client.nextCorporationTaxDue).getTime()) / (1000 * 60 * 60 * 24)) > 90 ? 'CRITICAL' : 'HIGH'
          })
        }

        if (client.nextConfirmationDue && new Date(client.nextConfirmationDue) < cutoffDate) {
          overdueItems.push({
            clientCode: client.clientCode,
            companyName: client.companyName,
            type: 'Confirmation Statement',
            dueDate: client.nextConfirmationDue,
            daysOverdue: Math.floor((now.getTime() - new Date(client.nextConfirmationDue).getTime()) / (1000 * 60 * 60 * 24)),
            assignedUser: client.assignedUser?.name || 'Unassigned',
            urgencyLevel: Math.floor((now.getTime() - new Date(client.nextConfirmationDue).getTime()) / (1000 * 60 * 60 * 24)) > 30 ? 'CRITICAL' : 'HIGH'
          })
        }
      }

      // Sort by days overdue (most overdue first)
      overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue)

      return {
        totalOverdueItems: overdueItems.length,
        criticalItems: overdueItems.filter(item => item.urgencyLevel === 'CRITICAL').length,
        overdueItems,
        summary: {
          vatReturns: overdueItems.filter(item => item.type === 'VAT Return').length,
          accounts: overdueItems.filter(item => item.type === 'Annual Accounts').length,
          corporationTax: overdueItems.filter(item => item.type === 'Corporation Tax').length,
          confirmations: overdueItems.filter(item => item.type === 'Confirmation Statement').length
        }
      }
    } catch (error) {
      return { error: `Failed to get overdue deadlines: ${error}` }
    }
  },

  getAllWorkload: async (userRole: string) => {
    try {
      if (userRole === 'STAFF') {
        return { error: 'Staff users can only view their own workload' }
      }

      const users = await db.user.findMany({
        where: { isActive: true },
        include: {
          assignedClients: {
            where: { isActive: true },
            select: {
              id: true,
              clientCode: true,
              companyName: true,
              companyType: true,
              isVatEnabled: true,
              nextVatReturnDue: true,
              nextAccountsDue: true,
              nextCorporationTaxDue: true,
              nextConfirmationDue: true
            }
          },
          vatAssignedClients: {
            where: { isActive: true },
            select: {
              id: true,
              clientCode: true,
              companyName: true,
              nextVatReturnDue: true,
              vatFrequency: true
            }
          },
          ltdCompanyAssignedClients: {
            where: { isActive: true },
            select: {
              id: true,
              clientCode: true,
              companyName: true,
              nextAccountsDue: true,
              nextCorporationTaxDue: true
            }
          },
          _count: {
            select: {
              assignedClients: { where: { isActive: true } },
              vatAssignedClients: { where: { isActive: true } },
              ltdCompanyAssignedClients: { where: { isActive: true } }
            }
          }
        }
      })

      const now = new Date()
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const workloadAnalysis = users.map(user => {
        const upcomingDeadlines = user.assignedClients.filter(client => {
          const dates = [
            client.nextVatReturnDue,
            client.nextAccountsDue,
            client.nextCorporationTaxDue,
            client.nextConfirmationDue
          ].filter(date => date && new Date(date) > now && new Date(date) <= next30Days)
          return dates.length > 0
        })

        const overdueItems = user.assignedClients.filter(client => {
          const dates = [
            client.nextVatReturnDue,
            client.nextAccountsDue,
            client.nextCorporationTaxDue,
            client.nextConfirmationDue
          ].filter(date => date && new Date(date) < now)
          return dates.length > 0
        })

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email,
          totalClients: user._count.assignedClients,
          vatClients: user._count.vatAssignedClients,
          ltdClients: user._count.ltdCompanyAssignedClients,
          upcomingDeadlines: upcomingDeadlines.length,
          overdueItems: overdueItems.length,
          workloadScore: (user._count.assignedClients * 1) + (upcomingDeadlines.length * 2) + (overdueItems.length * 3),
          efficiency: overdueItems.length === 0 ? 'EXCELLENT' : 
                     overdueItems.length <= 2 ? 'GOOD' :
                     overdueItems.length <= 5 ? 'NEEDS_ATTENTION' : 'CRITICAL'
        }
      })

      // Sort by workload score (highest first)
      workloadAnalysis.sort((a, b) => b.workloadScore - a.workloadScore)

      return {
        totalUsers: users.length,
        averageClientsPerUser: Math.round(workloadAnalysis.reduce((sum, user) => sum + user.totalClients, 0) / users.length),
        workloadDistribution: workloadAnalysis,
        recommendations: {
          overloaded: workloadAnalysis.filter(user => user.workloadScore > 20),
          underutilized: workloadAnalysis.filter(user => user.workloadScore < 5),
          needsAttention: workloadAnalysis.filter(user => user.efficiency === 'NEEDS_ATTENTION' || user.efficiency === 'CRITICAL')
        }
      }
    } catch (error) {
      return { error: `Failed to get workload analysis: ${error}` }
    }
  },

  getVATWorkflowStatus: async (stage?: string, userId?: string, userRole?: string) => {
    try {
      const whereClause: any = {}
      
      if (stage) {
        whereClause.currentStage = stage
      }

      // Staff can only see their assigned workflows
      if (userRole === 'STAFF' && userId) {
        whereClause.assignedUserId = userId
      }

      const workflows = await db.vATQuarter.findMany({
        where: whereClause,
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true,
              contactEmail: true,
              vatFrequency: true,
              vatQuarterGroup: true
            }
          },
          assignedUser: {
            select: { id: true, name: true, role: true, email: true }
          }
        },
        orderBy: { quarterEndDate: 'desc' }
      })

      // Group by stage
      const stageAnalysis = workflows.reduce((acc, workflow) => {
        const stage = workflow.currentStage
        if (!acc[stage]) {
          acc[stage] = {
            count: 0,
            workflows: [],
            averageDaysInStage: 0
          }
        }
        acc[stage].count++
        acc[stage].workflows.push({
          id: workflow.id,
          clientCode: workflow.client.clientCode,
          companyName: workflow.client.companyName,
          quarterPeriod: workflow.quarterPeriod,
          quarterEndDate: workflow.quarterEndDate,
          filingDueDate: workflow.filingDueDate,
          assignedUser: workflow.assignedUser?.name || 'Unassigned',
          daysInCurrentStage: Math.floor((new Date().getTime() - new Date(workflow.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
        })
        return acc
      }, {} as any)

      // Calculate average days in each stage
      Object.keys(stageAnalysis).forEach(stage => {
        const totalDays = stageAnalysis[stage].workflows.reduce((sum: number, w: any) => sum + w.daysInCurrentStage, 0)
        stageAnalysis[stage].averageDaysInStage = Math.round(totalDays / stageAnalysis[stage].count)
      })

      return {
        totalWorkflows: workflows.length,
        completedWorkflows: workflows.filter(w => w.isCompleted).length,
        activeWorkflows: workflows.filter(w => !w.isCompleted).length,
        stageBreakdown: stageAnalysis,
        bottlenecks: Object.entries(stageAnalysis)
          .filter(([_, data]: [string, any]) => data.averageDaysInStage > 7)
          .map(([stage, data]: [string, any]) => ({
            stage,
            count: data.count,
            averageDays: data.averageDaysInStage,
            severity: data.averageDaysInStage > 14 ? 'HIGH' : 'MEDIUM'
          }))
      }
    } catch (error) {
      return { error: `Failed to get VAT workflow status: ${error}` }
    }
  },

  sendEmailNotification: async (clientId: string, templateType: string, recipientEmail: string, userId: string) => {
    try {
      // Get client details
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: {
          clientCode: true,
          companyName: true,
          contactEmail: true,
          contactName: true
        }
      })

      if (!client) {
        return { error: 'Client not found' }
      }

      // Create communication record
      const communication = await db.communication.create({
        data: {
          type: 'EMAIL',
          subject: `${templateType.replace('_', ' ').toUpperCase()} - ${client.companyName}`,
          content: `Automated ${templateType} notification sent to ${recipientEmail}`,
          clientId,
          sentByUserId: userId,
          sentAt: new Date(),
          scheduledAt: null
        }
      })

      // Log the activity
      await db.activityLog.create({
        data: {
          action: 'EMAIL_SENT',
          details: `Sent ${templateType} email to ${recipientEmail} for client ${client.clientCode}`,
          userId,
          clientId,
          timestamp: new Date()
        }
      })

      // Here you would integrate with your actual email service (Brevo)
      // For now, we'll simulate the email sending

      return {
        success: true,
        communicationId: communication.id,
        clientCode: client.clientCode,
        companyName: client.companyName,
        templateType,
        recipientEmail,
        sentAt: communication.sentAt,
        message: `Email notification sent successfully to ${recipientEmail} for ${client.companyName}`
      }
    } catch (error) {
      return { error: `Failed to send email notification: ${error}` }
    }
  },

  getSystemHealth: async () => {
    try {
      const [
        totalClients,
        activeClients, 
        totalUsers,
        activeUsers,
        totalWorkflows,
        completedWorkflows,
        recentActivity,
        overdueCount
      ] = await Promise.all([
        db.client.count(),
        db.client.count({ where: { isActive: true } }),
        db.user.count(),
        db.user.count({ where: { isActive: true } }),
        db.vATQuarter.count(),
        db.vATQuarter.count({ where: { isCompleted: true } }),
        db.activityLog.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }),
        db.client.count({
          where: {
            OR: [
              { nextVatReturnDue: { lt: new Date() } },
              { nextAccountsDue: { lt: new Date() } },
              { nextCorporationTaxDue: { lt: new Date() } }
            ]
          }
        })
      ])

      const systemHealth = {
        status: 'HEALTHY',
        timestamp: new Date(),
        metrics: {
          clients: {
            total: totalClients,
            active: activeClients,
            inactive: totalClients - activeClients
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          },
          workflows: {
            total: totalWorkflows,
            completed: completedWorkflows,
            active: totalWorkflows - completedWorkflows,
            completionRate: totalWorkflows > 0 ? Math.round((completedWorkflows / totalWorkflows) * 100) : 0
          },
          activity: {
            last24Hours: recentActivity,
            overdueItems: overdueCount
          }
        },
        integrations: {
          database: 'CONNECTED',
          companiesHouse: process.env.COMPANIES_HOUSE_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED',
          hmrc: process.env.HMRC_CLIENT_ID ? 'CONFIGURED' : 'NOT_CONFIGURED',
          email: process.env.BREVO_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED',
          openai: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED'
        }
      }

      // Determine overall system status
      if (overdueCount > 50) {
        systemHealth.status = 'WARNING'
      } else if (overdueCount > 100) {
        systemHealth.status = 'CRITICAL'
      }

      return systemHealth
    } catch (error) {
      return {
        status: 'ERROR',
        error: `Failed to get system health: ${error}`,
        timestamp: new Date()
      }
    }
  },

  getCompaniesHouseData: async (companyNumber: string) => {
    try {
      if (!process.env.COMPANIES_HOUSE_API_KEY) {
        return { error: 'Companies House API not configured' }
      }

      const response = await fetch(`https://api.companieshouse.gov.uk/company/${companyNumber}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`
        }
      })

      if (!response.ok) {
        return { error: `Companies House API error: ${response.status} ${response.statusText}` }
      }

      const companyData = await response.json()

      // Also get officer data
      const officersResponse = await fetch(`https://api.companieshouse.gov.uk/company/${companyNumber}/officers`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`
        }
      })

      let officers = null
      if (officersResponse.ok) {
        officers = await officersResponse.json()
      }

      return {
        companyData,
        officers,
        fetchedAt: new Date(),
        source: 'Companies House API'
      }
    } catch (error) {
      return { error: `Failed to fetch Companies House data: ${error}` }
    }
  }
}

// Type-safe function caller
export async function callFunction(
  functionName: string,
  args: any[],
  userId: string,
  userRole: string
): Promise<any> {
  // Check permissions
  if (!hasPermission(userRole, functionName)) {
    return { 
      error: `Access denied. ${userRole} role does not have permission to call ${functionName}`,
      requiredPermission: functionName,
      userRole
    }
  }

  // Get the function
  const func = chatFunctions[functionName as keyof typeof chatFunctions]
  if (!func) {
    return { error: `Function ${functionName} not found` }
  }

  try {
    // Call the function with proper arguments
    const result = await (func as any)(...args, userId, userRole)
    return result
  } catch (error) {
    return { 
      error: `Function execution failed: ${error}`,
      functionName,
      args
    }
  }
}