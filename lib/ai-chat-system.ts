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

// Business data retrieval functions
async function getBusinessData(userId: string, userRole: string) {
  const whereClause: any = { isActive: true }
  if (userRole === 'STAFF') {
    whereClause.assignedUserId = userId
  }

  const [clients, users] = await Promise.all([
    db.client.findMany({
      where: whereClause,
      include: {
        assignedUser: {
          select: { id: true, name: true, role: true }
        },
        vatQuartersWorkflow: {
          orderBy: { quarterEndDate: 'desc' },
          take: 5
        }
      },
      orderBy: { companyName: 'asc' }
    }),
    userRole !== 'STAFF' ? db.user.findMany({
      where: { isActive: true },
      include: {
        assignedClients: {
          where: { isActive: true }
        }
      }
    }) : []
  ])

  // Calculate current month deadlines
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

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

  return {
    clients,
    users,
    summary: {
      totalClients: clients.length,
      ltdCompanies: clients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
      vatClients: clients.filter(c => c.isVatEnabled).length,
      activeClients: clients.filter(c => c.isActive).length
    },
    deadlinesThisMonth,
    vatClientsThisMonth,
    userRole,
    currentMonth: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
}

// Main AI chat processor
export async function processAIQuery(
  query: string, 
  userId: string,
  userRole: string
): Promise<ChatResponse> {
  try {
    // Get business data
    const businessData = await getBusinessData(userId, userRole)
    
    // Create context for AI
    const systemPrompt = `You are a helpful business assistant for Numericalz, a UK accounting firm. You have access to real-time business data and should provide detailed, accurate responses about clients, deadlines, and team workload.

Current Business Context:
- Total Clients: ${businessData.summary.totalClients}
- Limited Companies: ${businessData.summary.ltdCompanies}
- VAT-enabled Clients: ${businessData.summary.vatClients}
- User Role: ${businessData.userRole}
- Current Month: ${businessData.currentMonth}

Deadlines This Month:
- Accounts Due: ${businessData.deadlinesThisMonth.accounts}
- VAT Returns Due: ${businessData.deadlinesThisMonth.vat}
- Confirmations Due: ${businessData.deadlinesThisMonth.confirmation}
- Corporation Tax Due: ${businessData.deadlinesThisMonth.corporationTax}

VAT Clients This Month:
- Still Due: ${businessData.vatClientsThisMonth.due.length}
- Completed: ${businessData.vatClientsThisMonth.completed.length}

Guidelines:
1. Provide specific, detailed answers with actual numbers and client information
2. For VAT queries, distinguish between completed and still due
3. Include client codes (NZ-X format) when mentioning specific clients
4. Show urgency levels (overdue, due within 7 days) when relevant
5. Be conversational but professional
6. If asking about team workload, only show full details if user is MANAGER or PARTNER
7. Use emojis sparingly and appropriately (📊 📅 🧾 ✅ ⚠️)

Available Data:
${JSON.stringify(businessData, null, 2)}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
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
        "Show me VAT workflow statuses",
        "What VAT clients need urgent attention?"
      ]
    } else if (/deadline|due/i.test(query)) {
      queryType = 'deadlines'
      suggestions = [
        "Show me overdue deadlines",
        "What's due in the next 7 days?",
        "Show all deadlines for next month"
      ]
    } else if (/team|staff|workload/i.test(query)) {
      queryType = 'team'
      suggestions = [
        "Which team member has the most clients?",
        "Show unassigned clients",
        "What's the average workload per person?"
      ]
    } else {
      suggestions = [
        "How many VAT clients are due this month?",
        "Show me team workload distribution",
        "What deadlines are coming up?",
        "Which clients need attention?"
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