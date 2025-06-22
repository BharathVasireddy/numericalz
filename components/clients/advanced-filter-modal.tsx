'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  X,
  Filter,
  Save,
  Trash2,
  Copy,
  Settings,
  AlertCircle,
  CheckCircle,
  Users,
  Building2,
  Calendar,
  Mail,
  Phone
} from 'lucide-react'
import { showToast } from '@/lib/toast'

// Filter field definitions
const FILTER_FIELDS = [
  { value: 'companyName', label: 'Company Name', type: 'text' },
  { value: 'companyNumber', label: 'Company Number', type: 'text' },
  { value: 'companyType', label: 'Company Type', type: 'select', options: [
    { value: 'LIMITED_COMPANY', label: 'Limited Company' },
    { value: 'NON_LIMITED_COMPANY', label: 'Non-Limited Company' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'SUB_CONTRACTOR', label: 'Sub Contractor' }
  ]},
  { value: 'contactName', label: 'Contact Name', type: 'text' },
  { value: 'contactEmail', label: 'Contact Email', type: 'text' },
  { value: 'contactPhone', label: 'Contact Phone', type: 'text' },
  { value: 'assignedUser', label: 'General Assignment', type: 'user' },
  { value: 'accountsAssignedUser', label: 'Accounts Assignment', type: 'user' },
  { value: 'vatAssignedUser', label: 'VAT Assignment', type: 'user' },
  { value: 'isVatEnabled', label: 'VAT Enabled', type: 'boolean' },
  { value: 'isActive', label: 'Active Status', type: 'boolean' },
  { value: 'nextAccountsDue', label: 'Next Accounts Due', type: 'date' },
  { value: 'nextConfirmationDue', label: 'Next Confirmation Due', type: 'date' },
  { value: 'nextCorporationTaxDue', label: 'Next Corporation Tax Due', type: 'date' },
  { value: 'createdAt', label: 'Created Date', type: 'date' },
  { value: 'yearEstablished', label: 'Year Established', type: 'number' },
  { value: 'numberOfEmployees', label: 'Number of Employees', type: 'number' },
  { value: 'annualTurnover', label: 'Annual Turnover', type: 'number' },
]

// Operator definitions
const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'notContains', label: 'Does Not Contain' },
    { value: 'notEquals', label: 'Does Not Equal' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' }
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Does Not Equal' },
    { value: 'in', label: 'Is One Of' },
    { value: 'notIn', label: 'Is Not One Of' }
  ],
  user: [
    { value: 'equals', label: 'Assigned To' },
    { value: 'notEquals', label: 'Not Assigned To' },
    { value: 'isNull', label: 'Unassigned' },
    { value: 'isNotNull', label: 'Assigned' }
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
    { value: 'notEquals', label: 'Is Not' }
  ],
  date: [
    { value: 'equals', label: 'On Date' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'isNull', label: 'No Date Set' },
    { value: 'isNotNull', label: 'Has Date Set' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Does Not Equal' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'between', label: 'Between' },
    { value: 'isNull', label: 'Not Set' },
    { value: 'isNotNull', label: 'Is Set' }
  ]
}

// Filter condition interface
interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string | string[] | boolean | null
  value2?: string // For between operations
}

// Filter group interface
interface FilterGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

// Advanced filter interface
interface AdvancedFilter {
  id: string
  name: string
  groups: FilterGroup[]
  groupOperator: 'AND' | 'OR' // How groups are combined
}

// Saved filter interface
interface SavedFilter {
  id: string
  name: string
  filter: AdvancedFilter
  isDefault: boolean
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AdvancedFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilter: (filter: AdvancedFilter) => void
  currentFilter?: AdvancedFilter | null
  users: User[]
}

export function AdvancedFilterModal({
  isOpen,
  onClose,
  onApplyFilter,
  currentFilter,
  users
}: AdvancedFilterModalProps) {
  const { data: session } = useSession()
  const [filter, setFilter] = useState<AdvancedFilter>({
    id: crypto.randomUUID(),
    name: 'New Filter',
    groups: [{
      id: crypto.randomUUID(),
      operator: 'AND',
      conditions: [{
        id: crypto.randomUUID(),
        field: 'companyName',
        operator: 'contains',
        value: ''
      }]
    }],
    groupOperator: 'AND'
  })

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Initialize filter from current filter or create new
  useEffect(() => {
    if (currentFilter) {
      setFilter(currentFilter)
    }
  }, [currentFilter])

  // Load saved filters
  useEffect(() => {
    loadSavedFilters()
  }, [])

  const loadSavedFilters = async () => {
    try {
      const saved = localStorage.getItem('numericalz-saved-filters')
      if (saved) {
        setSavedFilters(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
  }

  const saveFilter = () => {
    if (!filterName.trim()) {
      showToast.error('Please enter a filter name')
      return
    }

    const newSavedFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: filterName,
      filter: { ...filter, name: filterName },
      isDefault: false,
      createdAt: new Date().toISOString()
    }

    const updated = [...savedFilters, newSavedFilter]
    setSavedFilters(updated)
    localStorage.setItem('numericalz-saved-filters', JSON.stringify(updated))
    
    setShowSaveDialog(false)
    setFilterName('')
    showToast.success('Filter saved successfully')
  }

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilter(savedFilter.filter)
    showToast.success(`Loaded filter: ${savedFilter.name}`)
  }

  const deleteSavedFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId)
    setSavedFilters(updated)
    localStorage.setItem('numericalz-saved-filters', JSON.stringify(updated))
    showToast.success('Filter deleted')
  }

  const addGroup = () => {
    const newGroup: FilterGroup = {
      id: crypto.randomUUID(),
      operator: 'AND',
      conditions: [{
        id: crypto.randomUUID(),
        field: 'companyName',
        operator: 'contains',
        value: ''
      }]
    }
    setFilter({
      ...filter,
      groups: [...filter.groups, newGroup]
    })
  }

  const removeGroup = (groupId: string) => {
    if (filter.groups.length === 1) {
      showToast.error('Cannot remove the last group')
      return
    }
    setFilter({
      ...filter,
      groups: filter.groups.filter(g => g.id !== groupId)
    })
  }

  const updateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    setFilter({
      ...filter,
      groups: filter.groups.map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      )
    })
  }

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: crypto.randomUUID(),
      field: 'companyName',
      operator: 'contains',
      value: ''
    }
    
    setFilter({
      ...filter,
      groups: filter.groups.map(g => 
        g.id === groupId 
          ? { ...g, conditions: [...g.conditions, newCondition] }
          : g
      )
    })
  }

  const removeCondition = (groupId: string, conditionId: string) => {
    setFilter({
      ...filter,
      groups: filter.groups.map(g => 
        g.id === groupId 
          ? { ...g, conditions: g.conditions.filter(c => c.id !== conditionId) }
          : g
      )
    })
  }

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    setFilter({
      ...filter,
      groups: filter.groups.map(g => 
        g.id === groupId 
          ? {
              ...g,
              conditions: g.conditions.map(c => 
                c.id === conditionId ? { ...c, ...updates } : c
              )
            }
          : g
      )
    })
  }

  const getFieldType = (fieldValue: string) => {
    const field = FILTER_FIELDS.find(f => f.value === fieldValue)
    return field?.type || 'text'
  }

  const getOperators = (fieldValue: string) => {
    const fieldType = getFieldType(fieldValue)
    return OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text
  }

  const renderConditionValue = (groupId: string, condition: FilterCondition) => {
    const fieldType = getFieldType(condition.field)
    const needsValue = !['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(condition.operator)
    
    if (!needsValue) {
      return null
    }

    switch (fieldType) {
      case 'text':
        return (
          <Input
            placeholder="Enter value..."
            value={condition.value as string || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            className="flex-1"
          />
        )

      case 'select':
        const field = FILTER_FIELDS.find(f => f.value === condition.field)
        const isMultiple = ['in', 'notIn'].includes(condition.operator)
        
        if (isMultiple) {
          return (
            <div className="flex-1">
              <Select
                value=""
                onValueChange={(value) => {
                  const currentValues = Array.isArray(condition.value) ? condition.value : []
                  if (!currentValues.includes(value)) {
                    updateCondition(groupId, condition.id, { 
                      value: [...currentValues, value] 
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select values..." />
                </SelectTrigger>
                <SelectContent>
                  {field?.options?.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {Array.isArray(condition.value) && condition.value.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {condition.value.map((val, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {field?.options?.find(o => o.value === val)?.label || val}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => {
                          const newValues = (condition.value as string[]).filter((_, i) => i !== index)
                          updateCondition(groupId, condition.id, { value: newValues })
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )
        } else {
          return (
            <Select
              value={condition.value as string || ''}
              onValueChange={(value) => updateCondition(groupId, condition.id, { value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select value..." />
              </SelectTrigger>
              <SelectContent>
                {field?.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

      case 'user':
        return (
          <Select
            value={condition.value as string || ''}
            onValueChange={(value) => updateCondition(groupId, condition.id, { value })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">My Clients</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'boolean':
        return (
          <Select
            value={condition.value?.toString() || ''}
            onValueChange={(value) => updateCondition(groupId, condition.id, { value: value === 'true' })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'date':
        if (condition.operator === 'between') {
          return (
            <div className="flex gap-2 flex-1">
              <Input
                type="date"
                value={condition.value as string || ''}
                onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
                className="flex-1"
              />
              <span className="self-center text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={condition.value2 || ''}
                onChange={(e) => updateCondition(groupId, condition.id, { value2: e.target.value })}
                className="flex-1"
              />
            </div>
          )
        } else {
          return (
            <Input
              type="date"
              value={condition.value as string || ''}
              onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
              className="flex-1"
            />
          )
        }

      case 'number':
        if (condition.operator === 'between') {
          return (
            <div className="flex gap-2 flex-1">
              <Input
                type="number"
                placeholder="From..."
                value={condition.value as string || ''}
                onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
                className="flex-1"
              />
              <span className="self-center text-sm text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="To..."
                value={condition.value2 || ''}
                onChange={(e) => updateCondition(groupId, condition.id, { value2: e.target.value })}
                className="flex-1"
              />
            </div>
          )
        } else {
          return (
            <Input
              type="number"
              placeholder="Enter number..."
              value={condition.value as string || ''}
              onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
              className="flex-1"
            />
          )
        }

      default:
        return (
          <Input
            placeholder="Enter value..."
            value={condition.value as string || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            className="flex-1"
          />
        )
    }
  }

  const applyFilter = () => {
    setIsLoading(true)
    try {
      onApplyFilter(filter)
      onClose()
      showToast.success('Advanced filter applied')
    } catch (error) {
      showToast.error('Failed to apply filter')
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilter = () => {
    setFilter({
      id: crypto.randomUUID(),
      name: 'New Filter',
      groups: [{
        id: crypto.randomUUID(),
        operator: 'AND',
        conditions: [{
          id: crypto.randomUUID(),
          field: 'companyName',
          operator: 'contains',
          value: ''
        }]
      }],
      groupOperator: 'AND'
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Client Filters
            </DialogTitle>
            <DialogDescription>
              Build complex filter conditions with AND/OR logic to find exactly the clients you need.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Saved Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map(savedFilter => (
                      <div key={savedFilter.id} className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSavedFilter(savedFilter)}
                          className="flex items-center gap-1"
                        >
                          <Filter className="h-3 w-3" />
                          {savedFilter.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSavedFilter(savedFilter.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filter Groups */}
            <div className="space-y-4">
              {filter.groups.map((group, groupIndex) => (
                <Card key={group.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          Group {groupIndex + 1}
                        </Badge>
                        
                        {groupIndex > 0 && (
                          <Select
                            value={filter.groupOperator}
                            onValueChange={(value: 'AND' | 'OR') => setFilter({ ...filter, groupOperator: value })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        <Select
                          value={group.operator}
                          onValueChange={(value: 'AND' | 'OR') => updateGroup(group.id, { operator: value })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addCondition(group.id)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add Condition
                        </Button>
                        {filter.groups.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGroup(group.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {group.conditions.map((condition, conditionIndex) => (
                      <div key={condition.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        {conditionIndex > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {group.operator}
                          </Badge>
                        )}

                        {/* Field Selection */}
                        <Select
                          value={condition.field}
                          onValueChange={(value) => {
                            const fieldType = getFieldType(value)
                            const operators = getOperators(value)
                            updateCondition(group.id, condition.id, { 
                              field: value,
                              operator: operators[0]?.value || 'contains',
                              value: fieldType === 'boolean' ? false : ''
                            })
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operator Selection */}
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(group.id, condition.id, { 
                            operator: value,
                            value: ['in', 'notIn'].includes(value) ? [] : condition.value
                          })}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getOperators(condition.field).map(operator => (
                              <SelectItem key={operator.value} value={operator.value}>
                                {operator.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Value Input */}
                        {renderConditionValue(group.id, condition)}

                        {/* Remove Condition */}
                        {group.conditions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCondition(group.id, condition.id)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {/* Add Group Button */}
              <Button
                variant="outline"
                onClick={addGroup}
                className="w-full flex items-center gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                Add Filter Group
              </Button>
            </div>

            {/* Filter Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filter Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono bg-muted p-3 rounded-lg">
                  {filter.groups.map((group, groupIndex) => (
                    <div key={group.id}>
                      {groupIndex > 0 && (
                        <span className="text-blue-600 font-bold"> {filter.groupOperator} </span>
                      )}
                      <span className="text-gray-600">(</span>
                      {group.conditions.map((condition, conditionIndex) => (
                        <span key={condition.id}>
                          {conditionIndex > 0 && (
                            <span className="text-green-600 font-bold"> {group.operator} </span>
                          )}
                          <span className="text-purple-600">{condition.field}</span>
                          <span className="text-orange-600"> {condition.operator} </span>
                          {!['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(condition.operator) && (
                            <span className="text-red-600">
                              {Array.isArray(condition.value) 
                                ? `[${condition.value.join(', ')}]`
                                : `"${condition.value}"`}
                              {condition.value2 && ` to "${condition.value2}"`}
                            </span>
                          )}
                        </span>
                      ))}
                      <span className="text-gray-600">)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Filter
              </Button>
              <Button
                variant="ghost"
                onClick={clearFilter}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={applyFilter} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Filter className="h-4 w-4" />
                    Apply Filter
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Filter Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Give your filter a name to save it for future use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filterName">Filter Name</Label>
              <Input
                id="filterName"
                placeholder="Enter filter name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveFilter()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveFilter} disabled={!filterName.trim()}>
              Save Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 