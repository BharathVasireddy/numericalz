/**
 * Hybrid AI Chat System
 * 
 * Intelligently chooses between pre-loaded data and autonomous function calls
 * based on the type of query
 */

import OpenAI from 'openai'
import { processAIQuery } from './ai-chat-system-enhanced'
import { processAutonomousChatQuery } from './ai-chat-autonomous'

// Query analysis to determine best approach
function analyzeQuery(query: string) {
  const patterns = {
    // These benefit from function calling
    needsFunctionCalls: [
      /get.*details.*for.*client/i,
      /send.*email|notify|remind/i,
      /update.*workflow|change.*stage/i,
      /real.?time|current|latest/i,
      /companies.?house.*data/i,
      /check.*status.*for/i
    ],
    
    // These work better with pre-loaded data
    needsPreloadedData: [
      /how many.*total/i,
      /show.*all.*clients/i,
      /team.*workload|staff.*distribution/i,
      /overview|summary|dashboard/i,
      /compare.*between/i,
      /analytics|trends|metrics/i
    ],
    
    // These require actions
    requiresActions: [
      /send|email|notify/i,
      /update|change|modify/i,
      /create|add|delete/i,
      /assign|reassign/i
    ]
  }

  const scores = {
    functionCalls: 0,
    preloaded: 0,
    actions: 0
  }

  // Score the query
  patterns.needsFunctionCalls.forEach(pattern => {
    if (pattern.test(query)) scores.functionCalls++
  })
  
  patterns.needsPreloadedData.forEach(pattern => {
    if (pattern.test(query)) scores.preloaded++
  })
  
  patterns.requiresActions.forEach(pattern => {
    if (pattern.test(query)) scores.actions++
  })

  // Determine approach
  if (scores.actions > 0) {
    return 'autonomous' // Actions require function calling
  } else if (scores.functionCalls > scores.preloaded) {
    return 'autonomous' // Specific queries benefit from targeted calls
  } else {
    return 'preloaded' // General queries work well with comprehensive data
  }
}

export async function processHybridQuery(
  query: string,
  userId: string,
  userRole: string,
  conversationHistory: any[] = []
) {
  const approach = analyzeQuery(query)
  
  console.log(`Using ${approach} approach for query: "${query.slice(0, 50)}..."`)
  
  if (approach === 'autonomous') {
    // Use function calling for specific/action queries
    const result = await processAutonomousChatQuery(query, userId, userRole, conversationHistory)
    
    return {
      ...result,
      approach: 'autonomous',
      explanation: 'Used autonomous function calling for real-time data and actions'
    }
  } else {
    // Use pre-loaded data for general queries
    const result = await processAIQuery(query, userId, userRole, conversationHistory)
    
    return {
      ...result,
      approach: 'preloaded',
      explanation: 'Used comprehensive pre-loaded data for analytics and overview'
    }
  }
}

// Advanced hybrid with fallback
export async function processIntelligentQuery(
  query: string,
  userId: string,
  userRole: string,
  conversationHistory: any[] = []
) {
  try {
    // First attempt with intelligent routing
    const primaryResult = await processHybridQuery(query, userId, userRole, conversationHistory)
    
    // Check if result is satisfactory
    if (primaryResult.message && primaryResult.message.length > 50) {
      return {
        ...primaryResult,
        strategy: 'primary_success'
      }
    }
    
    // Fallback to alternative approach
    console.log('Primary approach insufficient, trying fallback...')
    
    const fallbackApproach = primaryResult.approach === 'autonomous' ? 'preloaded' : 'autonomous'
    
    let fallbackResult
    if (fallbackApproach === 'autonomous') {
      fallbackResult = await processAutonomousChatQuery(query, userId, userRole, conversationHistory)
    } else {
      fallbackResult = await processAIQuery(query, userId, userRole, conversationHistory)
    }
    
    return {
      ...fallbackResult,
      approach: fallbackApproach,
      strategy: 'fallback_success',
      explanation: `Primary ${primaryResult.approach} approach insufficient, used ${fallbackApproach} fallback`
    }
    
  } catch (error) {
    console.error('Intelligent query processing failed:', error)
    
    // Final fallback to basic preloaded approach
    try {
      const basicResult = await processAIQuery(query, userId, userRole, conversationHistory)
      return {
        ...basicResult,
        approach: 'basic_fallback',
        strategy: 'error_recovery',
        explanation: 'Advanced processing failed, used basic approach'
      }
    } catch (basicError) {
      return {
        message: "I'm experiencing technical difficulties. Please try a simpler question.",
        error: true,
        approach: 'error',
        strategy: 'complete_failure'
      }
    }
  }
}