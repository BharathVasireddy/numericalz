/**
 * AI-Enhanced Chat System for Numericalz Application
 * 
 * Uses OpenAI to provide intelligent, natural language responses
 * while securely querying business data from the database
 */

import OpenAI from 'openai'
import { db } from '@/lib/db'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  queryType?: string
  data?: any
}

export interface ChatResponse {
  message: string
  data?: any
  queryType: string
  suggestions?: string[]
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Enhanced business data retrieval functions
async function getBusinessData(userId: string, userRole: string) {
  const whereClause: any = { isActive: true }
  if (userRole === 'STAFF') {
    whereClause.assignedUserId = userId
  }

  const [clients, users] = await Promise.all([
    // Enhanced client data with comprehensive workflow information
    db.client.findMany({
      where: whereClause,
      include: {
        assignedUser: {
          select: { id: true, name: true, role: true }
        },
        vatQuartersWorkflow: {
          orderBy: { quarterEndDate: 'desc' },
          take: 10,
          select: {
            id: true,
            quarterEndDate: true,
            currentStage: true,
            isCompleted: true,
            filedToHMRCDate: true,
            createdAt: true,
            updatedAt: true,
            // isClientSelfFiling: true
          }
        },
        // ltdDeadlinesWorkflow: {
        //   orderBy: { createdAt: 'desc' },
        //   take: 5,
        //   select: {
        //     id: true,
        //     accountsWorkflowStage: true,
        //     corporationTaxWorkflowStage: true,
        //     confirmationStatementWorkflowStage: true,
        //     accountsFiledDate: true,
        //     corporationTaxFiledDate: true,
        //     confirmationStatementFiledDate: true,
        //     isAccountsSelfFiling: true,
        //     isCorporationTaxSelfFiling: true,
        //     isConfirmationStatementSelfFiling: true,
        //     createdAt: true,
        //     updatedAt: true
        //   }
        // }
      },
      orderBy: { companyName: 'asc' }
    }),
    // Enhanced user data with workload information
    userRole !== 'STAFF' ? db.user.findMany({
      where: { isActive: true },
      include: {
        assignedClients: {
          where: { isActive: true },
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            isVatEnabled: true,
            nextVatReturnDue: true,
            nextAccountsDue: true,
            nextConfirmationDue: true,
            nextCorporationTaxDue: true
          }
        },
        _count: {
          select: {
            assignedClients: {
              where: { isActive: true }
            }
          }
        }
      }
    }) : [],
    // Recent activity logs for context
    // userRole !== 'STAFF' ? db.activityLog.findMany({
    //   take: 20,
    //   orderBy: { createdAt: 'desc' },
    //   include: {
    //     user: {
    //       select: { name: true, role: true }
    //     },
    //     client: {
    //       select: { clientCode: true, companyName: true }
    //     }
    //   }
    // }) : db.activityLog.findMany({
    //   where: { userId },
    //   take: 10,
    //   orderBy: { createdAt: 'desc' },
    //   include: {
    //     client: {
    //       select: { clientCode: true, companyName: true }
    //     }
    //   }
    // })
    []
  ])

  // Calculate current month deadlines and flexible date ranges
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  // Helper function to get deadlines for any month/year
  const getDeadlinesForPeriod = (startDate: Date, endDate: Date) => {
    const periodDeadlines = {
      accounts: [] as any[],
      vat: [] as any[],
      confirmation: [] as any[],
      corporationTax: [] as any[]
    }
    
    clients.forEach(client => {
      if (client.nextAccountsDue) {
        const date = new Date(client.nextAccountsDue)
        if (date >= startDate && date <= endDate) {
          periodDeadlines.accounts.push({
            client: { clientCode: client.clientCode, companyName: client.companyName },
            dueDate: client.nextAccountsDue,
            assignedUser: client.assignedUser?.name || 'Unassigned'
          })
        }
      }
      if (client.nextVatReturnDue) {
        const date = new Date(client.nextVatReturnDue)
        if (date >= startDate && date <= endDate) {
          periodDeadlines.vat.push({
            client: { clientCode: client.clientCode, companyName: client.companyName },
            dueDate: client.nextVatReturnDue,
            assignedUser: client.assignedUser?.name || 'Unassigned'
          })
        }
      }
      if (client.nextConfirmationDue) {
        const date = new Date(client.nextConfirmationDue)
        if (date >= startDate && date <= endDate) {
          periodDeadlines.confirmation.push({
            client: { clientCode: client.clientCode, companyName: client.companyName },
            dueDate: client.nextConfirmationDue,
            assignedUser: client.assignedUser?.name || 'Unassigned'
          })
        }
      }
      if (client.nextCorporationTaxDue) {
        const date = new Date(client.nextCorporationTaxDue)
        if (date >= startDate && date <= endDate) {
          periodDeadlines.corporationTax.push({
            client: { clientCode: client.clientCode, companyName: client.companyName },
            dueDate: client.nextCorporationTaxDue,
            assignedUser: client.assignedUser?.name || 'Unassigned'
          })
        }
      }
    })
    
    return periodDeadlines
  }

  const deadlinesThisMonth = {
    accounts: 0,
    vat: 0,
    confirmation: 0,
    corporationTax: 0
  }

  const vatClientsThisMonth = {
    due: [] as any[],
    completed: [] as any[]
  }

  clients.forEach(client => {
    // Count deadlines
    if (client.nextAccountsDue) {
      const date = new Date(client.nextAccountsDue)
      if (date >= startOfMonth && date <= endOfMonth) deadlinesThisMonth.accounts++
    }
    if (client.nextVatReturnDue) {
      const date = new Date(client.nextVatReturnDue)
      if (date >= startOfMonth && date <= endOfMonth) deadlinesThisMonth.vat++
    }
    if (client.nextConfirmationDue) {
      const date = new Date(client.nextConfirmationDue)
      if (date >= startOfMonth && date <= endOfMonth) deadlinesThisMonth.confirmation++
    }
    if (client.nextCorporationTaxDue) {
      const date = new Date(client.nextCorporationTaxDue)
      if (date >= startOfMonth && date <= endOfMonth) deadlinesThisMonth.corporationTax++
    }

    // VAT analysis
    if (client.isVatEnabled) {
      let hasVATDueThisMonth = false
      
      // Check direct VAT due date
      if (client.nextVatReturnDue) {
        const date = new Date(client.nextVatReturnDue)
        if (date >= startOfMonth && date <= endOfMonth) {
          hasVATDueThisMonth = true
        }
      }

      // Check workflow data
      const thisMonthWorkflows = client.vatQuartersWorkflow.filter(workflow => {
        if (!workflow.quarterEndDate) return false
        const quarterEnd = new Date(workflow.quarterEndDate)
        const quarterEndMonth = quarterEnd.getMonth() + 1
        const quarterEndYear = quarterEnd.getFullYear()
        const calculatedDueDate = new Date(Date.UTC(quarterEndYear, quarterEndMonth + 1, 0))
        return calculatedDueDate >= startOfMonth && calculatedDueDate <= endOfMonth
      })

      if (thisMonthWorkflows.length > 0 || hasVATDueThisMonth) {
        const isCompleted = thisMonthWorkflows.some(w => 
          w.isCompleted || w.currentStage === 'FILED_TO_HMRC' || w.filedToHMRCDate
        )
        
        const clientData = {
          ...client,
          thisMonthWorkflows,
          calculatedDueDate: client.nextVatReturnDue ? new Date(client.nextVatReturnDue) : null
        }

        if (isCompleted) {
          vatClientsThisMonth.completed.push(clientData)
        } else {
          vatClientsThisMonth.due.push(clientData)
        }
      }
    }
  })

  // Enhanced overdue analysis
  const overdueTasks = {
    accounts: [] as any[],
    vat: [] as any[],
    confirmation: [] as any[],
    corporationTax: [] as any[]
  }

  const upcomingTasks = {
    next7Days: [] as any[],
    next30Days: [] as any[]
  }

  const workflowStatus = {
    vatInProgress: 0,
    vatCompleted: 0,
    ltdAccountsInProgress: 0,
    ltdAccountsCompleted: 0,
    selfFilingClients: 0
  }

  clients.forEach(client => {
    const clientTasks = {
      clientCode: client.clientCode,
      companyName: client.companyName,
      assignedUser: client.assignedUser?.name || 'Unassigned',
      tasks: [] as any[]
    }

    // Check for overdue items
    if (client.nextAccountsDue && new Date(client.nextAccountsDue) < now) {
      overdueTasks.accounts.push({
        ...clientTasks,
        dueDate: client.nextAccountsDue,
        daysPastDue: Math.floor((now.getTime() - new Date(client.nextAccountsDue).getTime()) / (1000 * 60 * 60 * 24))
      })
    }

    if (client.nextVatReturnDue && new Date(client.nextVatReturnDue) < now) {
      overdueTasks.vat.push({
        ...clientTasks,
        dueDate: client.nextVatReturnDue,
        daysPastDue: Math.floor((now.getTime() - new Date(client.nextVatReturnDue).getTime()) / (1000 * 60 * 60 * 24))
      })
    }

    if (client.nextConfirmationDue && new Date(client.nextConfirmationDue) < now) {
      overdueTasks.confirmation.push({
        ...clientTasks,
        dueDate: client.nextConfirmationDue,
        daysPastDue: Math.floor((now.getTime() - new Date(client.nextConfirmationDue).getTime()) / (1000 * 60 * 60 * 24))
      })
    }

    if (client.nextCorporationTaxDue && new Date(client.nextCorporationTaxDue) < now) {
      overdueTasks.corporationTax.push({
        ...clientTasks,
        dueDate: client.nextCorporationTaxDue,
        daysPastDue: Math.floor((now.getTime() - new Date(client.nextCorporationTaxDue).getTime()) / (1000 * 60 * 60 * 24))
      })
    }

    // Check upcoming tasks (next 7 and 30 days)
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const upcomingDeadlines = [
      { type: 'Accounts', date: client.nextAccountsDue },
      { type: 'VAT Return', date: client.nextVatReturnDue },
      { type: 'Confirmation Statement', date: client.nextConfirmationDue },
      { type: 'Corporation Tax', date: client.nextCorporationTaxDue }
    ].filter(d => d.date && new Date(d.date) > now)

    upcomingDeadlines.forEach(deadline => {
      const dueDate = new Date(deadline.date!)
      const task = {
        ...clientTasks,
        type: deadline.type,
        dueDate: deadline.date,
        daysUntilDue: Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }

      if (dueDate <= next7Days) {
        upcomingTasks.next7Days.push(task)
      } else if (dueDate <= next30Days) {
        upcomingTasks.next30Days.push(task)
      }
    })

    // Analyze workflow status
    if (client.vatQuartersWorkflow && client.vatQuartersWorkflow.length > 0) {
      const recentVATWorkflow = client.vatQuartersWorkflow[0]
      if (recentVATWorkflow && (recentVATWorkflow.isCompleted || recentVATWorkflow.filedToHMRCDate)) {
        workflowStatus.vatCompleted++
      } else if (recentVATWorkflow && recentVATWorkflow.currentStage && recentVATWorkflow.currentStage !== 'PAPERWORK_PENDING_CHASE') {
        workflowStatus.vatInProgress++
      }
    }

    // if (client.ltdDeadlinesWorkflow && client.ltdDeadlinesWorkflow.length > 0) {
    //   const recentLtdWorkflow = client.ltdDeadlinesWorkflow[0]
    //   if (recentLtdWorkflow.accountsFiledDate || recentLtdWorkflow.accountsWorkflowStage === 'COMPLETED') {
    //     workflowStatus.ltdAccountsCompleted++
    //   } else if (recentLtdWorkflow.accountsWorkflowStage && recentLtdWorkflow.accountsWorkflowStage !== 'NOT_STARTED') {
    //     workflowStatus.ltdAccountsInProgress++
    //   }
    // }

      // if (recentLtdWorkflow.isAccountsSelfFiling || recentLtdWorkflow.isCorporationTaxSelfFiling) {
      //   workflowStatus.selfFilingClients++
      // }
  })

  // Team workload analysis
  const teamWorkload = users.map(user => ({
    id: user.id,
    name: user.name,
    role: user.role,
    clientCount: user._count?.assignedClients || 0,
    clients: user.assignedClients || [],
    vatClientsCount: user.assignedClients?.filter(c => c.isVatEnabled).length || 0,
    upcomingDeadlines: user.assignedClients?.filter(c => {
      const dates = [c.nextVatReturnDue, c.nextAccountsDue, c.nextConfirmationDue, c.nextCorporationTaxDue]
      return dates.some(date => date && new Date(date) <= next30Days && new Date(date) > now)
    }).length || 0
  }))

  return {
    clients,
    users,
    activityLogs: [],
    summary: {
      totalClients: clients.length,
      ltdCompanies: clients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
      vatClients: clients.filter(c => c.isVatEnabled).length,
      activeClients: clients.filter(c => c.isActive).length,
      unassignedClients: clients.filter(c => !c.assignedUserId).length
    },
    deadlinesThisMonth,
    vatClientsThisMonth,
    overdueTasks,
    upcomingTasks,
    workflowStatus,
    teamWorkload,
    userRole,
    currentMonth: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    recentActivity: [],
    getDeadlinesForPeriod, // Allow AI to query specific date ranges
    // Helper data for better date queries
    feb2026Deadlines: getDeadlinesForPeriod(new Date(2026, 1, 1), new Date(2026, 1, 28)),
    allCorporationTaxDue: clients.filter(c => c.nextCorporationTaxDue).map(c => ({
      clientCode: c.clientCode,
      companyName: c.companyName,
      dueDate: c.nextCorporationTaxDue,
      assignedUser: c.assignedUser?.name || 'Unassigned'
    }))
  }
}

// Main AI chat processor
export async function processAIQuery(
  query: string, 
  userId: string,
  userRole: string,
  conversationHistory: any[] = []
): Promise<ChatResponse> {
  try {
    // Get business data
    const businessData = await getBusinessData(userId, userRole)
    
    // Build conversation context from history
    const conversationContext = conversationHistory.length > 0 
      ? `\n## CONVERSATION HISTORY:\n${conversationHistory.slice(-5).map(msg => 
          `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')}\n`
      : ''

    // Create comprehensive context for AI
    const systemPrompt = `You are a comprehensive business intelligence assistant for Numericalz, a UK accounting firm. You have access to real-time business data including client information, workflows, deadlines, team workload, and activity logs. You can follow conversation context and provide detailed, accurate, and actionable responses.

${conversationContext}

## CURRENT BUSINESS OVERVIEW:
📊 **Client Portfolio:**
- Total Active Clients: ${businessData.summary.totalClients}
- Limited Companies: ${businessData.summary.ltdCompanies}
- VAT-enabled Clients: ${businessData.summary.vatClients}
- Unassigned Clients: ${businessData.summary.unassignedClients}

⚠️ **Critical Overdue Tasks:**
- Overdue Accounts: ${businessData.overdueTasks.accounts.length}
- Overdue VAT Returns: ${businessData.overdueTasks.vat.length}
- Overdue Confirmations: ${businessData.overdueTasks.confirmation.length}
- Overdue Corporation Tax: ${businessData.overdueTasks.corporationTax.length}

📅 **Upcoming Deadlines:**
- Next 7 Days: ${businessData.upcomingTasks.next7Days.length}
- Next 30 Days: ${businessData.upcomingTasks.next30Days.length}

🔄 **Workflow Status:**
- VAT Returns In Progress: ${businessData.workflowStatus.vatInProgress}
- VAT Returns Completed: ${businessData.workflowStatus.vatCompleted}
- Ltd Accounts In Progress: ${businessData.workflowStatus.ltdAccountsInProgress}
- Ltd Accounts Completed: ${businessData.workflowStatus.ltdAccountsCompleted}
- Self-Filing Clients: ${businessData.workflowStatus.selfFilingClients}

${businessData.userRole !== 'STAFF' ? `
👥 **Team Workload Summary:**
${businessData.teamWorkload.map(member => 
`- ${member.name} (${member.role}): ${member.clientCount} clients, ${member.vatClientsCount} VAT clients, ${member.upcomingDeadlines} upcoming deadlines`
).join('\n')}
` : ''}

## RESPONSE GUIDELINES:
1. **Be Specific & Actionable**: Always provide exact numbers, client codes (NZ-X), dates, and names
2. **Prioritize Urgency**: Highlight overdue items and critical deadlines first
3. **Show Workflow Context**: Include current workflow stages and completion status
4. **Team Awareness**: For managers/partners, include team member assignments and workload
5. **Use Structured Formatting**: Use bullet points, numbers, and clear sections
6. **Professional Tone**: Conversational but business-appropriate
7. **Data Privacy**: Staff can only see their assigned clients; managers/partners see all data
8. **Follow Conversation**: Reference previous messages and build on the conversation context
9. **Date-Specific Queries**: When asked about specific months/years (like "Feb 2026"), use the provided deadline data

## SPECIAL DATA NOTES:
- Corporation Tax due dates are in nextCorporationTaxDue field
- All CT deadlines are available in allCorporationTaxDue array
- February 2026 deadlines are pre-calculated in feb2026Deadlines
- For other specific dates, analyze the nextCorporationTaxDue field across all clients

Available Data:
${JSON.stringify(businessData, null, 2)}
`

    // Build message history for context
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ]

    // Add conversation history (last 5 messages for context)
    conversationHistory.slice(-5).forEach(msg => {
      messages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })
    })

    // Add current user message
    messages.push({ role: "user", content: query })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.3
    })

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."

    // Determine query type for suggestions
    let queryType = 'general'
    let suggestions: string[] = []

    if (/vat/i.test(query)) {
      queryType = 'vat'
      suggestions = [
        "Which VAT returns are overdue?",
        "Show me VAT workflow stages in progress",
        "What VAT clients need urgent attention?",
        "Compare VAT completion rates this month"
      ]
    } else if (/overdue/i.test(query)) {
      queryType = 'overdue'
      suggestions = [
        "Show all overdue tasks with days past due",
        "Which clients have multiple overdue items?",
        "What overdue tasks are assigned to each team member?",
        "Show the most critical overdue deadlines"
      ]
    } else if (/deadline|due/i.test(query)) {
      queryType = 'deadlines'
      suggestions = [
        "What's due in the next 7 days?",
        "Show all deadlines for next month",
        "Which clients have upcoming deadlines this week?",
        "Compare workload for upcoming deadlines by team member"
      ]
    } else if (/team|staff|workload/i.test(query)) {
      queryType = 'team'
      suggestions = [
        "Which team member has the highest workload?",
        "Show unassigned clients that need attention",
        "What's the distribution of VAT clients per team member?",
        "Who has the most upcoming deadlines?"
      ]
    } else if (/workflow|progress|status/i.test(query)) {
      queryType = 'workflow'
      suggestions = [
        "Show me all workflows currently in progress",
        "Which workflows are taking too long?",
        "What's the completion rate for this month?",
        "Show recent workflow completions"
      ]
    } else if (/client/i.test(query)) {
      queryType = 'clients'
      suggestions = [
        "Show me details for a specific client",
        "Which clients haven't been updated recently?",
        "Show all self-filing clients",
        "What clients need immediate attention?"
      ]
    } else {
      suggestions = [
        "Show me today's priority tasks",
        "What needs immediate attention?",
        "Give me a team workload summary",
        "Show recent system activity"
      ]
    }

    return {
      message: response,
      data: businessData,
      queryType,
      suggestions
    }

  } catch (error) {
    console.error('AI Chat error:', error)
    
    // Fallback to basic response
    return {
      message: "I'm experiencing some technical difficulties. Please try a simpler question or contact support if the issue persists.",
      queryType: 'error',
      suggestions: [
        "How many clients do we have?",
        "Show me VAT clients",
        "What's due this month?"
      ]
    }
  }
}