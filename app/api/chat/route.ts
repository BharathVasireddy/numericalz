import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processAIQuery, ChatMessage } from '@/lib/ai-chat-system-enhanced'
import { processAutonomousChatQuery } from '@/lib/ai-chat-autonomous'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long'),
  conversationId: z.string().optional(),
  mode: z.enum(['autonomous', 'comprehensive']).default('autonomous'),
  conversationHistory: z.array(z.object({
    id: z.string(),
    type: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date().or(z.string())
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details for role-based filtering
    const { db } = await import('@/lib/db')
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = ChatRequestSchema.parse(body)

    // Choose processing mode - autonomous (function calling) or comprehensive (pre-loaded data)
    let response
    if (validatedData.mode === 'autonomous') {
      // Use autonomous function calling for real-time data and actions
      response = await processAutonomousChatQuery(
        validatedData.message,
        user.id,
        user.role,
        validatedData.conversationHistory || []
      )
    } else {
      // Use comprehensive pre-loaded data approach
      response = await processAIQuery(
        validatedData.message,
        user.id,
        user.role,
        validatedData.conversationHistory || []
      )
    }

    // Create response message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      type: 'assistant',
      content: response.message,
      timestamp: new Date(),
      queryType: response.queryType,
      data: response.data
    }

    // Enhanced response with function calling metadata
    const responsePayload: any = {
      success: true,
      message: assistantMessage,
      suggestions: response.suggestions || [],
      metadata: {
        queryType: response.queryType,
        hasData: !!response.data,
        userRole: user.role,
        processingMode: validatedData.mode
      }
    }

    // Add function calling metadata if autonomous mode was used
    if (validatedData.mode === 'autonomous' && 'functionCalls' in response) {
      responsePayload.functionCalls = response.functionCalls
      responsePayload.totalFunctionCalls = response.totalFunctionCalls
      responsePayload.metadata.approach = response.approach
    }

    return NextResponse.json(responsePayload)

  } catch (error) {
    console.error('Chat API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request',
          details: error.errors 
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process chat message' 
      }, 
      { status: 500 }
    )
  }
}

// Get chat suggestions/capabilities
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suggestions = [
      {
        category: "Deadlines & Compliance",
        examples: [
          "How many VAT clients are due this month?",
          "Show me all deadlines due this month with overdue analysis",
          "Which deadlines are overdue and by how many days?",
          "What accounts are due in the next 7 days with client details?",
          "Show February 2026 Corporation Tax deadlines",
          "What deadlines are in workflow vs pending?"
        ]
      },
      {
        category: "Client Management",
        examples: [
          "How many clients do we have by type?",
          "Show me all VAT-enabled clients with quarter groups",
          "Which clients are assigned to [staff member]?",
          "Tell me about client NZ-2 with full profile",
          "Show clients with missing Companies House data",
          "Which clients are self-filing by service type?"
        ]
      },
      {
        category: "Team Analytics & Workload",
        examples: [
          "What's the current staff workload by assignment type?",
          "How many clients is each team member handling?",
          "Show me comprehensive team performance metrics",
          "Which staff need workload rebalancing?",
          "Show assignment distribution by VAT/Ltd/Non-Ltd work",
          "What's the optimal assignment strategy?"
        ]
      },
      {
        category: "Workflow Management",
        examples: [
          "Which VAT returns are in progress with stages?",
          "Show me completed filings this month with user attribution",
          "What's the status of client workflows by completion rate?",
          "Which workflows are taking longer than average?",
          "Show VAT vs Ltd workflow efficiency comparison",
          "What workflow bottlenecks need attention?"
        ]
      },
      {
        category: "System & Integrations",
        examples: [
          "What integrations are configured and their health?",
          "Show me system performance metrics",
          "What features are available in the application?",
          "Show Companies House integration status",
          "What HMRC connectivity is available?",
          "Show email system and template management"
        ]
      },
      {
        category: "Communication & Activity",
        examples: [
          "Show recent communications by client",
          "What email templates are available?",
          "Show notification history and delivery status",
          "Which clients need follow-up communications?",
          "Show system activity trends over time",
          "What communication patterns are emerging?"
        ]
      },
      {
        category: "Analytics & Performance",
        examples: [
          "Show comprehensive workflow performance metrics",
          "What are the current system bottlenecks?",
          "Show team productivity analysis with recommendations",
          "Which processes need optimization?",
          "Show completion rates by service type",
          "What performance trends are emerging?"
        ]
      },
      {
        category: "Database & Configuration",
        examples: [
          "Show database model structure and relationships",
          "What system settings are configured?",
          "Show user management and role distribution",
          "What audit trails are available?",
          "Show data integrity and system health",
          "What backup and maintenance tools exist?"
        ]
      }
    ]

    return NextResponse.json({
      success: true,
      suggestions,
      modes: {
        autonomous: {
          description: "AI makes autonomous function calls for real-time data and actions",
          features: [
            "Real-time client data retrieval",
            "Live deadline analysis with urgency levels",
            "Team workload optimization recommendations",
            "VAT workflow bottleneck identification",
            "Automated email notifications",
            "Companies House API integration",
            "System health monitoring",
            "Action capabilities (send emails, update workflows)"
          ]
        },
        comprehensive: {
          description: "Pre-loaded comprehensive data for analytics and overview",
          features: [
            "Complete business intelligence dashboard",
            "Historical trend analysis",
            "Cross-departmental analytics", 
            "Comprehensive reporting capabilities",
            "Large-scale data correlations",
            "Performance benchmarking"
          ]
        }
      },
      capabilities: [
        "🤖 Autonomous AI with function calling (NEW)",
        "📊 Real-time data retrieval and analysis",
        "⚡ Action capabilities (send emails, update workflows)",
        "🏢 Companies House API integration",
        "📈 Advanced analytics and performance monitoring",
        "🔐 Role-based security and permissions",
        "💬 Natural language processing for complex queries",
        "🎯 Intelligent query routing and optimization",
        "📧 Communication management and automation",
        "🚨 Proactive deadline and workflow monitoring",
        "👥 Team performance optimization",
        "🔍 Multi-source data integration",
        "📱 Mobile-responsive chat interface",
        "🛡️ Enterprise-grade security and audit trails",
        "🔄 Real-time system health monitoring"
      ],
      availableFunctions: session?.user ? [
        "getClientDetails - Get comprehensive client information",
        "getOverdueDeadlines - Analyze overdue items with urgency",
        "getVATWorkflowStatus - Check workflow stages and bottlenecks",
        "getSystemHealth - Monitor system performance",
        ...(session.user.role !== 'STAFF' ? [
          "getAllWorkload - Team workload analysis", 
          "sendEmailNotification - Send client notifications",
          "getCompaniesHouseData - Real-time company data"
        ] : [])
      ] : []
    })

  } catch (error) {
    console.error('Chat capabilities API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get chat capabilities' },
      { status: 500 }
    )
  }
}