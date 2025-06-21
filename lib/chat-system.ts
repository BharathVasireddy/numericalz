/**
 * Intelligent Chat System for Numericalz Application
 * 
 * Processes natural language queries about clients, deadlines, and business data
 * Returns structured responses with relevant information
 */

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

// Query type detection patterns
const QUERY_PATTERNS = {
  vatClients: /vat.*client|client.*vat|how many.*vat|vat.*due|vat.*return/i,
  dueThisMonth: /due.*month|month.*due|this month|due.*this.*month/i,
  accountsDeadlines: /account.*deadline|account.*due/i,
  confirmationDeadlines: /confirmation.*deadline|confirmation.*due|cs.*due/i,
  corporationTax: /corporation.*tax|ct.*due|corp.*tax/i,
  clientCounts: /how many.*client|client.*count|total.*client/i,
  staffWorkload: /staff.*workload|team.*workload|assigned.*client/i,
  overdue: /overdue|late|past.*due/i,
  completed: /completed|filed|finished/i,
  workflow: /workflow|stage|progress/i,
  specificClient: /client.*NZ-\d+|NZ-\d+.*client/i,
  revenue: /revenue|income|turnover/i,
  deadlineCalendar: /calendar|deadline.*view/i,
  vatQuarter: /vat.*quarter|quarter.*vat/i,
  performance: /performance|metric|analytic/i
}

// Main query processor
export async function processUserQuery(
  query: string, 
  userId: string,
  userRole: string
): Promise<ChatResponse> {
  try {
    const normalizedQuery = query.toLowerCase().trim()
    
    // Detect query type
    const queryType = detectQueryType(normalizedQuery)
    
    // Route to appropriate handler
    switch (queryType) {
      case 'vatClients':
        return await handleVATClientsQuery(normalizedQuery, userId, userRole)
      
      case 'dueThisMonth':
        return await handleDueThisMonthQuery(normalizedQuery, userId, userRole)
      
      case 'accountsDeadlines':
        return await handleAccountsDeadlinesQuery(normalizedQuery, userId, userRole)
      
      case 'confirmationDeadlines':
        return await handleConfirmationDeadlinesQuery(normalizedQuery, userId, userRole)
      
      case 'corporationTax':
        return await handleCorporationTaxQuery(normalizedQuery, userId, userRole)
      
      case 'clientCounts':
        return await handleClientCountsQuery(normalizedQuery, userId, userRole)
      
      case 'staffWorkload':
        return await handleStaffWorkloadQuery(normalizedQuery, userId, userRole)
      
      case 'overdue':
        return await handleOverdueQuery(normalizedQuery, userId, userRole)
      
      case 'completed':
        return await handleCompletedQuery(normalizedQuery, userId, userRole)
      
      case 'workflow':
        return await handleWorkflowQuery(normalizedQuery, userId, userRole)
      
      case 'specificClient':
        return await handleSpecificClientQuery(normalizedQuery, userId, userRole)
      
      default:
        return await handleGeneralQuery(normalizedQuery, userId, userRole)
    }
    
  } catch (error) {
    console.error('Chat query processing error:', error)
    return {
      message: "I'm sorry, I encountered an error processing your request. Please try again or contact support.",
      queryType: 'error',
      suggestions: [
        "Try asking about VAT clients due this month",
        "Ask for client counts or staff workload",
        "Check overdue deadlines"
      ]
    }
  }
}

// Query type detection
function detectQueryType(query: string): string {
  console.log('Detecting query type for:', query)
  for (const [type, pattern] of Object.entries(QUERY_PATTERNS)) {
    if (pattern.test(query)) {
      console.log('Matched pattern:', type, pattern)
      return type
    }
  }
  console.log('No pattern matched, returning general')
  return 'general'
}

// VAT Clients Query Handler
async function handleVATClientsQuery(
  query: string, 
  userId: string, 
  userRole: string
): Promise<ChatResponse> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  // Check if asking about due this month
  const isDueThisMonth = /due.*month|month.*due|this month/i.test(query)
  
  const whereClause: any = {
    isActive: true,
    isVatEnabled: true
  }
  
  // Role-based filtering
  if (userRole === 'STAFF') {
    whereClause.assignedUserId = userId
  }
  
  const vatClients = await db.client.findMany({
    where: whereClause,
    include: {
      assignedUser: {
        select: { id: true, name: true }
      },
      vatQuartersWorkflow: {
        orderBy: { quarterEndDate: 'desc' }
      }
    },
    orderBy: { companyName: 'asc' }
  })
  
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  
  if (isDueThisMonth) {
    // Enhanced logic for due this month - check both direct fields and workflow
    const dueThisMonth = []
    const completedThisMonth = []
    
    for (const client of vatClients) {
      let isDue = false
      let isCompleted = false
      let dueDate = null
      let completedDate = null
      let status = 'Unknown'
      
      // Check nextVatReturnDue field
      if (client.nextVatReturnDue) {
        const nextDue = new Date(client.nextVatReturnDue)
        if (nextDue >= startOfMonth && nextDue <= endOfMonth) {
          isDue = true
          dueDate = nextDue
        }
      }
      
      // Check workflow data for this month
      const thisMonthWorkflows = client.vatQuartersWorkflow.filter(workflow => {
        if (!workflow.quarterEndDate) return false
        
        // Calculate VAT due date using our corrected logic
        const quarterEnd = new Date(workflow.quarterEndDate)
        const quarterEndMonth = quarterEnd.getMonth() + 1
        const quarterEndYear = quarterEnd.getFullYear()
        const calculatedDueDate = new Date(Date.UTC(quarterEndYear, quarterEndMonth + 1, 0))
        
        return calculatedDueDate >= startOfMonth && calculatedDueDate <= endOfMonth
      })
      
      // Check if any workflow for this month is completed
      for (const workflow of thisMonthWorkflows) {
        if (workflow.isCompleted || workflow.currentStage === 'FILED_TO_HMRC' || workflow.filedToHMRCDate) {
          isCompleted = true
          completedDate = workflow.filedToHMRCDate ? new Date(workflow.filedToHMRCDate) : null
          status = 'Completed'
        } else {
          isDue = true
          status = workflow.currentStage?.replace(/_/g, ' ') || 'In Progress'
          
          // Calculate due date from quarter end
          const quarterEnd = new Date(workflow.quarterEndDate)
          const quarterEndMonth = quarterEnd.getMonth() + 1
          const quarterEndYear = quarterEnd.getFullYear()
          dueDate = new Date(Date.UTC(quarterEndYear, quarterEndMonth + 1, 0))
        }
      }
      
      const clientInfo = {
        ...client,
        calculatedDueDate: dueDate,
        completedDate,
        status,
        thisMonthWorkflows
      }
      
      if (isCompleted) {
        completedThisMonth.push(clientInfo)
      } else if (isDue) {
        dueThisMonth.push(clientInfo)
      }
    }
    
    let message = `🧾 **VAT Returns for ${monthName}**\n\n`
    
    const totalCount = dueThisMonth.length + completedThisMonth.length
    
    if (totalCount === 0) {
      message += "✅ No VAT returns are due this month!"
    } else {
      message += `**Summary:** ${totalCount} VAT return${totalCount !== 1 ? 's' : ''} this month\n`
      message += `• ${dueThisMonth.length} still due\n`
      message += `• ${completedThisMonth.length} completed\n\n`
      
      // Show due returns
      if (dueThisMonth.length > 0) {
        message += `🔴 **Still Due (${dueThisMonth.length})**\n`
        dueThisMonth.forEach((client, index) => {
          const dueDate = client.calculatedDueDate 
            ? client.calculatedDueDate.toLocaleDateString('en-GB')
            : (client.nextVatReturnDue ? new Date(client.nextVatReturnDue).toLocaleDateString('en-GB') : 'Not set')
          
          message += `${index + 1}. **${client.companyName}** (${client.clientCode})\n`
          message += `   📅 Due: ${dueDate}\n`
          message += `   👤 Assigned: ${client.assignedUser?.name || 'Unassigned'}\n`
          message += `   📊 Status: ${client.status}\n`
          
          // Show urgency
          if (client.calculatedDueDate) {
            const daysLeft = Math.ceil((client.calculatedDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            if (daysLeft < 0) {
              message += `   ⚠️ **OVERDUE by ${Math.abs(daysLeft)} days**\n`
            } else if (daysLeft <= 7) {
              message += `   🚨 **URGENT: ${daysLeft} days left**\n`
            }
          }
          message += '\n'
        })
      }
      
      // Show completed returns
      if (completedThisMonth.length > 0) {
        message += `✅ **Completed (${completedThisMonth.length})**\n`
        completedThisMonth.forEach((client, index) => {
          const completedDate = client.completedDate 
            ? client.completedDate.toLocaleDateString('en-GB')
            : 'Recently'
          
          message += `${index + 1}. **${client.companyName}** (${client.clientCode})\n`
          message += `   ✅ Completed: ${completedDate}\n`
          message += `   👤 Assigned: ${client.assignedUser?.name || 'Unassigned'}\n\n`
        })
      }
    }
    
    return {
      message,
      data: {
        dueClients: dueThisMonth,
        completedClients: completedThisMonth,
        totalCount,
        month: monthName
      },
      queryType: 'vatClients',
      suggestions: [
        "Show me overdue VAT returns",
        "Which VAT returns are urgent (due within 7 days)?",
        "Show detailed workflow status for these clients"
      ]
    }
  } else {
    // Show all VAT clients
    let message = `🧾 **All VAT-Enabled Clients**\n\n`
    
    if (vatClients.length === 0) {
      message += "No VAT-enabled clients found."
    } else {
      message += `**Total VAT Clients:** ${vatClients.length}\n\n`
      
      vatClients.forEach((client, index) => {
        const dueDate = client.nextVatReturnDue 
          ? new Date(client.nextVatReturnDue).toLocaleDateString('en-GB')
          : 'Not set'
        
        message += `${index + 1}. **${client.companyName}** (${client.clientCode})\n`
        message += `   📅 Next Due: ${dueDate}\n`
        message += `   👤 Assigned: ${client.assignedUser?.name || 'Unassigned'}\n`
        
        // Show latest workflow status
        if (client.vatQuartersWorkflow.length > 0) {
          const latestWorkflow = client.vatQuartersWorkflow[0]
          if (latestWorkflow?.currentStage) {
            const status = latestWorkflow.currentStage.replace(/_/g, ' ')
            message += `   📊 Latest Status: ${status}\n`
          }
        }
        message += '\n'
      })
    }
    
    return {
      message,
      data: {
        clients: vatClients,
        count: vatClients.length
      },
      queryType: 'vatClients',
      suggestions: [
        "Show me VAT returns due this month",
        "Which VAT clients need attention?",
        "Show VAT workflow statuses"
      ]
    }
  }
}

// Due This Month Query Handler  
async function handleDueThisMonthQuery(
  query: string,
  userId: string,
  userRole: string
): Promise<ChatResponse> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  const whereClause: any = { isActive: true }
  if (userRole === 'STAFF') {
    whereClause.assignedUserId = userId
  }
  
  const clients = await db.client.findMany({
    where: whereClause,
    include: {
      assignedUser: {
        select: { id: true, name: true }
      }
    }
  })
  
  const deadlines = {
    accounts: [] as any[],
    vat: [] as any[],
    confirmation: [] as any[],
    corporationTax: [] as any[]
  }
  
  clients.forEach(client => {
    // Accounts due
    if (client.nextAccountsDue) {
      const dueDate = new Date(client.nextAccountsDue)
      if (dueDate >= startOfMonth && dueDate <= endOfMonth) {
        deadlines.accounts.push({
          client: client.companyName,
          clientCode: client.clientCode,
          dueDate: dueDate.toLocaleDateString('en-GB'),
          assignedUser: client.assignedUser?.name
        })
      }
    }
    
    // VAT due
    if (client.nextVatReturnDue) {
      const dueDate = new Date(client.nextVatReturnDue)
      if (dueDate >= startOfMonth && dueDate <= endOfMonth) {
        deadlines.vat.push({
          client: client.companyName,
          clientCode: client.clientCode,
          dueDate: dueDate.toLocaleDateString('en-GB'),
          assignedUser: client.assignedUser?.name
        })
      }
    }
    
    // Confirmation due
    if (client.nextConfirmationDue) {
      const dueDate = new Date(client.nextConfirmationDue)
      if (dueDate >= startOfMonth && dueDate <= endOfMonth) {
        deadlines.confirmation.push({
          client: client.companyName,
          clientCode: client.clientCode,
          dueDate: dueDate.toLocaleDateString('en-GB'),
          assignedUser: client.assignedUser?.name
        })
      }
    }
    
    // Corporation Tax due
    if (client.nextCorporationTaxDue) {
      const dueDate = new Date(client.nextCorporationTaxDue)
      if (dueDate >= startOfMonth && dueDate <= endOfMonth) {
        deadlines.corporationTax.push({
          client: client.companyName,
          clientCode: client.clientCode,
          dueDate: dueDate.toLocaleDateString('en-GB'),
          assignedUser: client.assignedUser?.name
        })
      }
    }
  })
  
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const totalDeadlines = deadlines.accounts.length + deadlines.vat.length + 
                        deadlines.confirmation.length + deadlines.corporationTax.length
  
  let message = `📅 **Deadlines for ${monthName}**\n\n`
  
  if (totalDeadlines === 0) {
    message += "✅ No deadlines due this month!"
  } else {
    message += `**Summary:** ${totalDeadlines} deadline${totalDeadlines !== 1 ? 's' : ''} due this month\n\n`
    
    // Accounts
    if (deadlines.accounts.length > 0) {
      message += `📋 **Annual Accounts (${deadlines.accounts.length})**\n`
      deadlines.accounts.forEach(item => {
        message += `• ${item.client} (${item.clientCode}) - Due: ${item.dueDate}\n`
      })
      message += '\n'
    }
    
    // VAT
    if (deadlines.vat.length > 0) {
      message += `🧾 **VAT Returns (${deadlines.vat.length})**\n`
      deadlines.vat.forEach(item => {
        message += `• ${item.client} (${item.clientCode}) - Due: ${item.dueDate}\n`
      })
      message += '\n'
    }
    
    // Confirmations
    if (deadlines.confirmation.length > 0) {
      message += `✅ **Confirmation Statements (${deadlines.confirmation.length})**\n`
      deadlines.confirmation.forEach(item => {
        message += `• ${item.client} (${item.clientCode}) - Due: ${item.dueDate}\n`
      })
      message += '\n'
    }
    
    // Corporation Tax
    if (deadlines.corporationTax.length > 0) {
      message += `💼 **Corporation Tax (${deadlines.corporationTax.length})**\n`
      deadlines.corporationTax.forEach(item => {
        message += `• ${item.client} (${item.clientCode}) - Due: ${item.dueDate}\n`
      })
    }
  }
  
  return {
    message,
    data: {
      deadlines,
      totalCount: totalDeadlines,
      month: monthName
    },
    queryType: 'dueThisMonth',
    suggestions: [
      "Show me overdue deadlines",
      "Which deadlines are urgent (due within 7 days)?",
      "Show team workload for these deadlines"
    ]
  }
}

// Placeholder handlers for other query types
async function handleAccountsDeadlinesQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  // Implementation for accounts deadlines specific queries
  return { message: "Accounts deadlines handler - to be implemented", queryType: 'accountsDeadlines' }
}

async function handleConfirmationDeadlinesQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return { message: "Confirmation deadlines handler - to be implemented", queryType: 'confirmationDeadlines' }
}

async function handleCorporationTaxQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return { message: "Corporation tax handler - to be implemented", queryType: 'corporationTax' }
}

async function handleClientCountsQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  const whereClause: any = { isActive: true }
  if (userRole === 'STAFF') {
    whereClause.assignedUserId = userId
  }
  
  const clients = await db.client.findMany({
    where: whereClause,
    include: {
      assignedUser: {
        select: { id: true, name: true }
      }
    }
  })
  
  const counts = {
    total: clients.length,
    limited: clients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
    nonLimited: clients.filter(c => c.companyType !== 'LIMITED_COMPANY').length,
    vatEnabled: clients.filter(c => c.isVatEnabled).length,
    active: clients.filter(c => c.isActive).length
  }
  
  const roleScope = userRole === 'STAFF' ? 'your assigned' : 'all'
  
  let message = `📊 **Client Statistics**\n\n`
  message += `**Overview of ${roleScope} clients:**\n\n`
  message += `🏢 **Total Clients:** ${counts.total}\n`
  message += `🏛️ **Limited Companies:** ${counts.limited}\n`
  message += `🏪 **Non-Limited:** ${counts.nonLimited}\n`
  message += `🧾 **VAT Enabled:** ${counts.vatEnabled}\n`
  message += `✅ **Active:** ${counts.active}\n\n`
  
  if (counts.total > 0) {
    const vatPercentage = ((counts.vatEnabled / counts.total) * 100).toFixed(1)
    const limitedPercentage = ((counts.limited / counts.total) * 100).toFixed(1)
    
    message += `**Breakdown:**\n`
    message += `• ${vatPercentage}% are VAT registered\n`
    message += `• ${limitedPercentage}% are limited companies\n`
  }
  
  return {
    message,
    data: {
      counts,
      clients: clients.map(c => ({
        id: c.id,
        name: c.companyName,
        code: c.clientCode,
        type: c.companyType,
        vatEnabled: c.isVatEnabled,
        assignedUser: c.assignedUser?.name
      }))
    },
    queryType: 'clientCounts',
    suggestions: [
      "Show me VAT clients",
      "Which clients are assigned to each team member?",
      "Show me all limited companies"
    ]
  }
}

async function handleStaffWorkloadQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  // Only managers and partners can view full team workload
  if (userRole === 'STAFF') {
    return {
      message: "You can only view your own client assignments. Try asking 'How many clients am I assigned to?'",
      queryType: 'staffWorkload',
      suggestions: [
        "How many clients am I assigned to?",
        "Show me my client list",
        "What are my upcoming deadlines?"
      ]
    }
  }
  
  const users = await db.user.findMany({
    where: { isActive: true },
    include: {
      assignedClients: {
        where: { isActive: true },
        include: {
          vatQuartersWorkflow: {
            where: {
              currentStage: { not: 'FILED_TO_HMRC' }
            }
          }
        }
      }
    },
    orderBy: [
      { role: 'asc' },
      { name: 'asc' }
    ]
  })
  
  let message = `👥 **Team Workload Distribution**\n\n`
  
  const workloadData = users.map(user => {
    const clientCount = user.assignedClients.length
    const activeVATWork = user.assignedClients.reduce((sum, client) => 
      sum + client.vatQuartersWorkflow.length, 0
    )
    
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      clientCount,
      activeVATWork
    }
  })
  
  workloadData.forEach(user => {
    const roleEmoji = user.role === 'PARTNER' ? '👑' : user.role === 'MANAGER' ? '🛡️' : '👤'
    message += `${roleEmoji} **${user.name}** (${user.role})\n`
    message += `   📋 Clients: ${user.clientCount}\n`
    message += `   🧾 Active VAT Work: ${user.activeVATWork}\n\n`
  })
  
  const totalClients = workloadData.reduce((sum, user) => sum + user.clientCount, 0)
  const totalVATWork = workloadData.reduce((sum, user) => sum + user.activeVATWork, 0)
  
  message += `**Team Summary:**\n`
  message += `• Total Clients: ${totalClients}\n`
  message += `• Active VAT Work: ${totalVATWork}\n`
  message += `• Team Members: ${workloadData.length}\n`
  
  if (workloadData.length > 0) {
    const avgClientsPerPerson = (totalClients / workloadData.length).toFixed(1)
    message += `• Average Clients per Person: ${avgClientsPerPerson}\n`
  }
  
  return {
    message,
    data: {
      workload: workloadData,
      summary: {
        totalClients,
        totalVATWork,
        teamSize: workloadData.length
      }
    },
    queryType: 'staffWorkload',
    suggestions: [
      "Which team member has the most clients?",
      "Show me unassigned clients",
      "How is VAT work distributed across the team?"
    ]
  }
}

async function handleOverdueQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return { message: "Overdue handler - to be implemented", queryType: 'overdue' }
}

async function handleCompletedQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return { message: "Completed handler - to be implemented", queryType: 'completed' }
}

async function handleWorkflowQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return { message: "Workflow handler - to be implemented", queryType: 'workflow' }
}

async function handleSpecificClientQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return { message: "Specific client handler - to be implemented", queryType: 'specificClient' }
}

async function handleGeneralQuery(query: string, userId: string, userRole: string): Promise<ChatResponse> {
  return {
    message: "I understand you're asking about the business, but I need more specific information. Here are some things I can help you with:",
    queryType: 'general',
    suggestions: [
      "How many VAT clients are due this month?",
      "Show me all deadlines due this month",
      "What's the current staff workload?",
      "Which clients are overdue?",
      "Show me client counts and statistics"
    ]
  }
}