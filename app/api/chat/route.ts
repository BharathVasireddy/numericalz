import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processAIQuery, ChatMessage } from '@/lib/ai-chat-system'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long'),
  conversationId: z.string().optional(),
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

    // Process the user query with AI
    const response = await processAIQuery(
      validatedData.message,
      user.id,
      user.role,
      validatedData.conversationHistory || []
    )

    // Create response message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      type: 'assistant',
      content: response.message,
      timestamp: new Date(),
      queryType: response.queryType,
      data: response.data
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      suggestions: response.suggestions || [],
      metadata: {
        queryType: response.queryType,
        hasData: !!response.data,
        userRole: user.role
      }
    })

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
        category: "Deadlines",
        examples: [
          "How many VAT clients are due this month?",
          "Show me all deadlines due this month",
          "Which deadlines are overdue?",
          "What accounts are due in the next 7 days?"
        ]
      },
      {
        category: "Clients",
        examples: [
          "How many clients do we have?",
          "Show me all VAT-enabled clients",
          "Which clients are assigned to [staff member]?",
          "Tell me about client NZ-2"
        ]
      },
      {
        category: "Team & Workload",
        examples: [
          "What's the current staff workload?",
          "How many clients is each team member handling?",
          "Show me team performance metrics"
        ]
      },
      {
        category: "Workflows",
        examples: [
          "Which VAT returns are in progress?",
          "Show me completed filings this month",
          "What's the status of client workflows?"
        ]
      }
    ]

    return NextResponse.json({
      success: true,
      suggestions,
      capabilities: [
        "Query client deadlines and due dates",
        "Get team workload and assignment information", 
        "Check workflow status and progress",
        "Analyze business metrics and counts",
        "Role-based data access (Staff see only their clients)"
      ]
    })

  } catch (error) {
    console.error('Chat capabilities API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get chat capabilities' },
      { status: 500 }
    )
  }
}