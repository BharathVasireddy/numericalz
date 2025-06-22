'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare
} from 'lucide-react'
import { ChatMessage } from '@/lib/chat-system'

interface BusinessChatProps {
  className?: string
  defaultMinimized?: boolean
}

interface ChatSuggestion {
  category: string
  examples: string[]
}

export function BusinessChat({ className, defaultMinimized = false }: BusinessChatProps) {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom whenever messages change or loading state changes
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Load chat capabilities on mount
  useEffect(() => {
    loadChatCapabilities()
  }, [])

  // Focus input when chat is opened
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isMinimized])

  const loadChatCapabilities = async () => {
    try {
      const response = await fetch('/api/chat', { method: 'GET' })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuggestions(data.suggestions || [])
        }
      }
    } catch (error) {
      console.error('Failed to load chat capabilities:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage = {
          ...data.message,
          timestamp: new Date(data.message.timestamp)
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now()}_error`,
          type: 'assistant',
          content: data.error || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const useSuggestion = (suggestion: string) => {
    setInputValue(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const formatMessageContent = (content: string) => {
    const parts = content.split(/(\\*\\*.*?\\*\\*|\\*.*?\\*)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }

  // Don't render chat if not authenticated
  if (status === 'loading') {
    return null // Still loading session
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null // Not logged in
  }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Card className="w-80 shadow-lg border bg-background">
          <CardHeader 
            className="p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
            onClick={() => setIsMinimized(false)}
          >
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Business Assistant</span>
              </div>
              <ChevronUp className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-96 h-[600px] shadow-xl border bg-background flex flex-col">
        {/* Header */}
        <CardHeader 
          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b flex-shrink-0"
          onClick={() => setIsMinimized(true)}
        >
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span>Business Assistant</span>
              {session?.user?.role && (
                <Badge variant="secondary" className="text-xs">
                  {session.user.role}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </CardTitle>
        </CardHeader>

        {/* Messages Container */}
        <div className="flex-1 flex flex-col min-h-0">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">Ask me anything about your business!</p>
                <p className="text-xs mt-1">
                  Try: "How many VAT clients are due this month?"
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-2 max-w-[85%] ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {formatMessageContent(message.content)}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="border-t p-4 max-h-48 overflow-y-auto flex-shrink-0">
              <div className="flex items-center gap-1 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Suggestions</span>
              </div>
              <div className="space-y-3">
                {suggestions.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {category.category}
                    </div>
                    <div className="space-y-1">
                      {category.examples.map((example, exampleIndex) => (
                        <button
                          key={exampleIndex}
                          onClick={() => useSuggestion(example)}
                          className="text-xs text-left p-2 rounded bg-muted/50 hover:bg-muted w-full transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about clients, deadlines, team..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={() => setShowSuggestions(!showSuggestions)}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}