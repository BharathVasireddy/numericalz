'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Code, 
  Copy, 
  Check, 
  User, 
  Building2, 
  Calendar, 
  Settings, 
  Workflow,
  Info,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  EMAIL_VARIABLES, 
  VARIABLES_BY_CATEGORY, 
  CATEGORY_LABELS, 
  getVariablesForTemplateCategory,
  formatVariable,
  searchVariables,
  type EmailVariable
} from '@/lib/email-variables'

interface VariablePickerProps {
  templateCategory?: string
  onVariableSelect?: (variable: string) => void
  className?: string
}

const categoryIcons = {
  client: Building2,
  user: User,
  workflow: Workflow,
  dates: Calendar,
  system: Settings
}

export function VariablePicker({ 
  templateCategory, 
  onVariableSelect, 
  className 
}: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Get relevant variables based on template category
  const relevantVariables = templateCategory 
    ? getVariablesForTemplateCategory(templateCategory)
    : EMAIL_VARIABLES

  // Filter variables based on search and category
  const filteredVariables = searchQuery 
    ? searchVariables(searchQuery).filter(v => relevantVariables.includes(v))
    : selectedCategory === 'all' 
      ? relevantVariables
      : relevantVariables.filter(v => v.category === selectedCategory)

  // Group filtered variables by category
  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = []
    }
    acc[variable.category]!.push(variable)
    return acc
  }, {} as Record<string, EmailVariable[]>)

  const handleCopyVariable = async (variable: EmailVariable) => {
    const formattedVariable = formatVariable(variable.key)
    try {
      await navigator.clipboard.writeText(formattedVariable)
      setCopiedVariable(variable.key)
      toast.success(`Copied: ${formattedVariable}`)
      setTimeout(() => setCopiedVariable(null), 2000)
    } catch (error) {
      toast.error('Failed to copy variable')
    }
  }

  const handleInsertVariable = (variable: EmailVariable) => {
    const formattedVariable = formatVariable(variable.key)
    onVariableSelect?.(formattedVariable)
    toast.success(`Inserted: ${formattedVariable}`)
  }

  const VariableCard = ({ variable }: { variable: EmailVariable }) => {
    const Icon = categoryIcons[variable.category]
    const formattedVariable = formatVariable(variable.key)
    
    return (
      <Card className="group hover:shadow-sm transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-sm font-medium">{variable.label}</CardTitle>
                <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                  {formattedVariable}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {variable.required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {variable.type}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs mb-3">
            {variable.description}
          </CardDescription>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Example:</span> {variable.example}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopyVariable(variable)}
              >
                {copiedVariable === variable.key ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              {onVariableSelect && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleInsertVariable(variable)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons]
            return (
              <Button
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(key)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredVariables.length} variable{filteredVariables.length !== 1 ? 's' : ''} available
          {templateCategory && (
            <span className="ml-1">
              for <Badge variant="secondary" className="text-xs ml-1">{templateCategory}</Badge>
            </span>
          )}
        </p>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="h-3 w-3 mr-1" />
                Help
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Email Template Variables</DialogTitle>
                <DialogDescription>
                  Learn how to use variables in your email templates
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h4>How to use variables:</h4>
                  <ul>
                    <li>Variables are enclosed in double curly braces: <code>{'{{variable.name}}'}</code></li>
                    <li>They are automatically replaced with actual values when emails are sent</li>
                    <li>Use the search box to find specific variables</li>
                    <li>Click the <Copy className="h-3 w-3 inline" /> button to copy a variable</li>
                    <li>Click the <Plus className="h-3 w-3 inline" /> button to insert directly into your template</li>
                  </ul>
                  
                  <h4>Variable Categories:</h4>
                  <ul>
                    <li><strong>Client:</strong> Company information and contact details</li>
                    <li><strong>User:</strong> Assigned users and assignment details</li>
                    <li><strong>Workflow:</strong> Current stages, comments, and progress</li>
                    <li><strong>Dates:</strong> Due dates, deadlines, and time periods</li>
                    <li><strong>System:</strong> Numericalz company information and links</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Variables Grid */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const Icon = categoryIcons[category as keyof typeof categoryIcons]
                  return <Icon className="h-4 w-4 text-muted-foreground" />
                })()}
                <h3 className="text-sm font-medium">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {variables.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {variables.map((variable) => (
                  <VariableCard key={variable.key} variable={variable} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* No Results */}
      {filteredVariables.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No variables found matching your search.</p>
          <p className="text-sm">Try adjusting your search or category filter.</p>
        </div>
      )}
    </div>
  )
} 