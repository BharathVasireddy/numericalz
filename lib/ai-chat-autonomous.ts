/**
 * Autonomous AI Chat System with Function Calling
 * 
 * This system allows the AI to make autonomous function calls
 * to fetch real-time data and perform actions
 */

import OpenAI from 'openai'
import { chatFunctions, callFunction, hasPermission } from './ai-chat-functions'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// OpenAI function definitions for the AI to understand available functions
const openAIFunctionDefinitions = [
  {
    name: "getClientDetails",
    description: "Get comprehensive details about a specific client including deadlines, workflows, and recent activity",
    parameters: {
      type: "object",
      properties: {
        clientCode: {
          type: "string",
          description: "The client code (e.g., NZ-1, NZ-2, NZ-123)"
        }
      },
      required: ["clientCode"]
    }
  },
  {
    name: "getOverdueDeadlines", 
    description: "Get all overdue deadlines with detailed analysis, optionally filtered by days overdue",
    parameters: {
      type: "object",
      properties: {
        daysOverdue: {
          type: "number",
          description: "Minimum number of days overdue to include (optional). If not provided, shows all overdue items"
        }
      }
    }
  },
  {
    name: "getAllWorkload",
    description: "Get comprehensive workload analysis for all team members (Manager/Partner access only)",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getVATWorkflowStatus",
    description: "Get detailed VAT workflow status analysis with stage breakdown and bottleneck identification",
    parameters: {
      type: "object", 
      properties: {
        stage: {
          type: "string",
          description: "Specific workflow stage to filter by (optional). Valid stages: PAPERWORK_PENDING_CHASE, PAPERWORK_CHASED, PAPERWORK_RECEIVED, WORK_IN_PROGRESS, QUERIES_PENDING, REVIEW_PENDING_MANAGER, REVIEW_PENDING_PARTNER, EMAILED_TO_PARTNER, EMAILED_TO_CLIENT, CLIENT_APPROVED, FILED_TO_HMRC"
        }
      }
    }
  },
  {
    name: "sendEmailNotification",
    description: "Send an email notification to a client (Manager/Partner access only)",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string", 
          description: "The database ID of the client"
        },
        templateType: {
          type: "string",
          description: "Type of email template (e.g., vat_reminder, deadline_warning, general_followup)"
        },
        recipientEmail: {
          type: "string",
          description: "Email address to send the notification to"
        }
      },
      required: ["clientId", "templateType", "recipientEmail"]
    }
  },
  {
    name: "getSystemHealth",
    description: "Get current system health status, metrics, and integration status",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getCompaniesHouseData",
    description: "Fetch real-time company data from Companies House API (Manager/Partner access only)",
    parameters: {
      type: "object",
      properties: {
        companyNumber: {
          type: "string",
          description: "UK company registration number (e.g., 12345678, 01234567)"
        }
      },
      required: ["companyNumber"]
    }
  }
]

export interface AutonomousChatResponse {
  message: string
  functionCalls?: Array<{
    name: string
    args: any
    result: any
    success: boolean
  }>
  totalFunctionCalls: number
  approach: 'autonomous'
  suggestions?: string[]
  queryType?: string
  data?: any // Add data property for compatibility
}

// Main autonomous chat processor
export async function processAutonomousChatQuery(
  query: string,
  userId: string,
  userRole: string,
  conversationHistory: any[] = []
): Promise<AutonomousChatResponse> {
  try {
    // Build conversation context
    const conversationContext = conversationHistory.length > 0 
      ? `\n## CONVERSATION HISTORY:\n${conversationHistory.slice(-3).map(msg => 
          `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')}\n`
      : ''

    // Create comprehensive system prompt for autonomous operation
    const systemPrompt = `You are an autonomous AI assistant for Numericalz, a UK accounting firm management system. You can make function calls to get real-time data and perform actions.

${conversationContext}

## YOUR CAPABILITIES:
You have access to powerful functions that can:
- Get detailed client information with real-time status
- Analyze overdue deadlines with urgency levels
- View team workload and performance metrics
- Check VAT workflow status and bottlenecks
- Send email notifications to clients
- Fetch live data from Companies House API
- Monitor system health and performance

## USER CONTEXT:
- User ID: ${userId}
- Role: ${userRole}
- Permissions: ${userRole === 'STAFF' ? 'Limited to assigned clients only' : 'Full system access with action capabilities'}

## FUNCTION CALLING STRATEGY:
1. **Analyze the user's question** to determine what data you need
2. **Make targeted function calls** to get current, specific information
3. **Combine results** from multiple functions if needed
4. **Provide actionable insights** with exact numbers, dates, and recommendations
5. **Suggest follow-up actions** when appropriate

## IMPORTANT RULES:
- Always call functions to get current data rather than making assumptions
- For STAFF users, you can only access their assigned clients
- For specific client questions, always use getClientDetails first
- For overdue analysis, use getOverdueDeadlines with appropriate filters
- For team questions, use getAllWorkload (Manager/Partner only)
- For workflow analysis, use getVATWorkflowStatus
- For actions like sending emails, confirm the action was successful
- Provide specific, precise information with exact numbers and dates
- Include client codes (NZ-X) and assigned users in responses
- Suggest practical next steps based on the data retrieved

## RESPONSE FORMAT:
- Be conversational but professional
- Include exact numbers, dates, and client codes
- Highlight urgent items that need immediate attention
- Provide actionable recommendations
- Format information clearly with bullet points or sections when helpful

Remember: You are autonomous - make the function calls you need to fully answer the user's question with current, accurate data.`

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: query }
    ]

    const functionCalls: Array<{
      name: string
      args: any
      result: any
      success: boolean
    }> = []

    let attempts = 0
    const maxAttempts = 5 // Prevent infinite loops

    while (attempts < maxAttempts) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        functions: openAIFunctionDefinitions,
        function_call: "auto",
        temperature: 0.3,
        max_tokens: 1500
      })

      const responseMessage = response.choices[0]?.message

      if (responseMessage?.function_call) {
        const functionName = responseMessage.function_call.name!
        let functionArgs: any = {}
        
        try {
          functionArgs = JSON.parse(responseMessage.function_call.arguments || '{}')
        } catch (error) {
          functionArgs = {}
        }

        // Security check - verify user has permission
        if (!hasPermission(userRole, functionName)) {
          const errorResult = {
            error: `Access denied. ${userRole} role does not have permission to call ${functionName}`,
            requiredPermission: functionName,
            userRole
          }

          functionCalls.push({
            name: functionName,
            args: functionArgs,
            result: errorResult,
            success: false
          })

          // Add function call and error result to conversation
          messages.push(responseMessage)
          messages.push({
            role: "function",
            name: functionName,
            content: JSON.stringify(errorResult)
          })

          attempts++
          continue
        }

        // Execute the function
        let functionResult
        let success = true

        try {
          // Convert functionArgs object to array of arguments
          const argValues = Object.values(functionArgs)
          functionResult = await callFunction(functionName, argValues as any[], userId, userRole)
          
          if (functionResult.error) {
            success = false
          }
        } catch (error) {
          functionResult = { 
            error: `Function execution failed: ${error}`,
            functionName,
            args: functionArgs
          }
          success = false
        }

        // Record the function call
        functionCalls.push({
          name: functionName,
          args: functionArgs,
          result: functionResult,
          success
        })

        // Add function call and result to conversation
        messages.push(responseMessage)
        messages.push({
          role: "function",
          name: functionName,
          content: JSON.stringify(functionResult)
        })

        attempts++
      } else {
        // No more function calls needed - AI has final response
        const finalMessage = responseMessage?.content || "I couldn't process your request."

        // Generate suggestions based on the query and function calls made
        const suggestions = generateSuggestions(query, functionCalls, userRole)
        const queryType = determineQueryType(query, functionCalls)

        return {
          message: finalMessage,
          functionCalls,
          totalFunctionCalls: functionCalls.length,
          approach: 'autonomous',
          suggestions,
          queryType
        }
      }
    }

    // If we hit the max attempts limit
    const partialMessage = "I made several function calls to gather information but reached the processing limit. Here's what I found:"
    
    const suggestions = generateSuggestions(query, functionCalls, userRole)
    const queryType = determineQueryType(query, functionCalls)

    return {
      message: partialMessage,
      functionCalls,
      totalFunctionCalls: functionCalls.length,
      approach: 'autonomous',
      suggestions,
      queryType
    }

  } catch (error) {
    console.error('Autonomous chat error:', error)
    
    return {
      message: "I encountered an error while processing your request. Please try a simpler question or contact support.",
      functionCalls: [],
      totalFunctionCalls: 0,
      approach: 'autonomous',
      suggestions: [
        "Try asking about a specific client",
        "Check system health status", 
        "View overdue deadlines",
        "Get team workload summary"
      ]
    }
  }
}

// Generate contextual suggestions based on the query and function calls made  
function generateSuggestions(query: string, functionCalls: Array<{name: string, args: any, result: any, success: boolean}>, userRole: string): string[] {
  const baseSuggestions = []

  // Suggestions based on function calls made
  if (functionCalls.some(fc => fc.name === 'getClientDetails')) {
    baseSuggestions.push(
      "Send a reminder email to this client",
      "Check this client's workflow status",
      "View this client's recent activity"
    )
  }

  if (functionCalls.some(fc => fc.name === 'getOverdueDeadlines')) {
    baseSuggestions.push(
      "Send reminder emails to overdue clients",
      "Show me the most critical overdue items",
      "Get team workload to see who can help"
    )
  }

  if (functionCalls.some(fc => fc.name === 'getAllWorkload')) {
    baseSuggestions.push(
      "Show me users who need workload rebalancing",
      "Find unassigned clients that need attention",
      "View team performance metrics"
    )
  }

  if (functionCalls.some(fc => fc.name === 'getVATWorkflowStatus')) {
    baseSuggestions.push(
      "Show me VAT workflow bottlenecks",
      "Find VAT returns stuck in review",
      "Check which VAT clients need immediate attention"
    )
  }

  // Role-based suggestions
  if (userRole === 'PARTNER' || userRole === 'MANAGER') {
    baseSuggestions.push(
      "Get real-time Companies House data for a client",
      "Send bulk email notifications",
      "View system performance metrics"
    )
  }

  // Query-type based suggestions
  if (/client/i.test(query)) {
    baseSuggestions.push(
      "Get details for another client",
      "Check client's Companies House data",
      "View client's communication history"
    )
  }

  if (/deadline/i.test(query)) {
    baseSuggestions.push(
      "Show deadlines for next month", 
      "Find deadlines by service type",
      "Check which deadlines are in workflow"
    )
  }

  // Remove duplicates and limit to 6 suggestions
  return [...new Set(baseSuggestions)].slice(0, 6)
}

// Determine query type based on content and function calls
function determineQueryType(query: string, functionCalls: Array<{name: string, args: any, result: any, success: boolean}>): string {
  if (functionCalls.some(fc => fc.name === 'getClientDetails')) return 'client_inquiry'
  if (functionCalls.some(fc => fc.name === 'getOverdueDeadlines')) return 'deadline_analysis'
  if (functionCalls.some(fc => fc.name === 'getAllWorkload')) return 'team_analysis'
  if (functionCalls.some(fc => fc.name === 'getVATWorkflowStatus')) return 'workflow_analysis'
  if (functionCalls.some(fc => fc.name === 'sendEmailNotification')) return 'action_taken'
  if (functionCalls.some(fc => fc.name === 'getSystemHealth')) return 'system_inquiry'
  if (functionCalls.some(fc => fc.name === 'getCompaniesHouseData')) return 'external_data'

  // Fallback based on query content
  if (/client/i.test(query)) return 'client_inquiry'
  if (/overdue|deadline/i.test(query)) return 'deadline_analysis'
  if (/team|workload|staff/i.test(query)) return 'team_analysis'
  if (/workflow|vat|stage/i.test(query)) return 'workflow_analysis'
  if (/send|email|notify/i.test(query)) return 'action_request'
  if (/system|health|status/i.test(query)) return 'system_inquiry'

  return 'general_inquiry'
}

export { openAIFunctionDefinitions }