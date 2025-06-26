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
  Phone,
  Clock,
  FileText,
  Send,
  UserCheck,
  Briefcase,
  Eye,
  MessageSquare,
  Receipt
} from 'lucide-react'
import { showToast } from '@/lib/toast'

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

interface User {
  id: string
  name: string
  email: string
  role: string
}

// Field definitions for different table types
const LTD_FILTER_FIELDS = [
  { value: 'companyName', label: 'Company Name', type: 'text' },
  { value: 'companyNumber', label: 'Company Number', type: 'text' },
  { value: 'clientCode', label: 'Client Code', type: 'text' },
  { value: 'incorporationDate', label: 'Incorporation Date', type: 'date' },
  { value: 'accountingReferenceDate', label: 'Year End Date', type: 'date' },
  { value: 'nextAccountsDue', label: 'Next Accounts Due', type: 'date' },
  { value: 'nextCorporationTaxDue', label: 'Next Corporation Tax Due', type: 'date' },
  { value: 'nextConfirmationDue', label: 'Next Confirmation Due', type: 'date' },
  { value: 'ltdCompanyAssignedUser', label: 'Assigned User', type: 'user' },
  { value: 'workflowStage', label: 'Workflow Stage', type: 'select', options: [
    { value: 'WAITING_FOR_YEAR_END', label: 'Waiting for year end' },
    { value: 'PAPERWORK_PENDING_CHASE', label: 'Pending to chase' },
    { value: 'PAPERWORK_CHASED', label: 'Paperwork chased' },
    { value: 'PAPERWORK_RECEIVED', label: 'Paperwork received' },
    { value: 'WORK_STARTED', label: 'Work started' },
    { value: 'MANAGER_DISCUSSION', label: 'Manager discussion' },
    { value: 'PARTNER_REVIEW', label: 'Partner review' },
    { value: 'REVIEW_COMPLETED', label: 'Review completed' },
    { value: 'SENT_TO_CLIENT', label: 'Sent to client' },
    { value: 'CLIENT_APPROVED', label: 'Client approved' },
    { value: 'PARTNER_APPROVED', label: 'Partner approved' },
            { value: 'FILED_TO_COMPANIES_HOUSE', label: 'Filed to Companies House' },
        { value: 'FILED_TO_HMRC', label: 'Filed to HMRC' }
  ]},
  { value: 'isCompleted', label: 'Workflow Completed', type: 'boolean' },
  { value: 'createdAt', label: 'Client Created Date', type: 'date' }
]

const VAT_FILTER_FIELDS = [
  { value: 'companyName', label: 'Company Name', type: 'text' },
  { value: 'clientCode', label: 'Client Code', type: 'text' },
  { value: 'vatReturnsFrequency', label: 'VAT Frequency', type: 'select', options: [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'ANNUALLY', label: 'Annually' }
  ]},
  { value: 'vatQuarterGroup', label: 'VAT Quarter Group', type: 'select', options: [
    { value: '1_4_7_10', label: 'Jan, Apr, Jul, Oct' },
    { value: '2_5_8_11', label: 'Feb, May, Aug, Nov' },
    { value: '3_6_9_12', label: 'Mar, Jun, Sep, Dec' }
  ]},
  { value: 'vatAssignedUser', label: 'VAT Assigned User', type: 'user' },
  { value: 'workflowStage', label: 'Workflow Stage', type: 'select', options: [
    { value: 'PAPERWORK_PENDING_CHASE', label: 'Pending to chase' },
    { value: 'PAPERWORK_CHASED', label: 'Paperwork chased' },
    { value: 'PAPERWORK_RECEIVED', label: 'Paperwork received' },
    { value: 'WORK_STARTED', label: 'Work started' },
    { value: 'WORK_FINISHED', label: 'Work finished' },
    { value: 'SENT_TO_CLIENT', label: 'Sent to client' },
    { value: 'CLIENT_APPROVED', label: 'Client approved' },
    { value: 'FILED_TO_HMRC', label: 'Filed to HMRC' },
    { value: 'CLIENT_BOOKKEEPING', label: 'Client do bookkeeping' }
  ]},
  { value: 'quarterStartDate', label: 'Quarter Start Date', type: 'date' },
  { value: 'quarterEndDate', label: 'Quarter End Date', type: 'date' },
  { value: 'filingDueDate', label: 'Filing Due Date', type: 'date' },
  { value: 'isCompleted', label: 'Workflow Completed', type: 'boolean' },
  { value: 'createdAt', label: 'Client Created Date', type: 'date' }
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

interface AdvancedFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filter: AdvancedFilter | null) => void
  currentFilter: AdvancedFilter | null
  users: User[]
  tableType: 'vat' | 'ltd'
}

export function AdvancedFilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilter,
  users,
  tableType
}: AdvancedFilterModalProps) {
  const { data: session } = useSession()
  const [filter, setFilter] = useState<AdvancedFilter>({
    id: '',
    name: '',
    groups: [],
    groupOperator: 'AND'
  })

  const filterFields = tableType === 'ltd' ? LTD_FILTER_FIELDS : VAT_FILTER_FIELDS

  // Initialize filter when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentFilter) {
        setFilter(currentFilter)
      } else {
        setFilter({
          id: `filter-${Date.now()}`,
          name: '',
          groups: [createNewGroup()],
          groupOperator: 'AND'
        })
      }
    }
  }, [isOpen, currentFilter])

  const createNewGroup = (): FilterGroup => ({
    id: `group-${Date.now()}-${Math.random()}`,
    operator: 'AND',
    conditions: [createNewCondition()]
  })

  const createNewCondition = (): FilterCondition => ({
    id: `condition-${Date.now()}-${Math.random()}`,
    field: filterFields[0]?.value || 'companyName',
    operator: 'contains',
    value: ''
  })

  const addGroup = () => {
    setFilter(prev => ({
      ...prev,
      groups: [...prev.groups, createNewGroup()]
    }))
  }

  const removeGroup = (groupId: string) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId)
    }))
  }

  const updateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups.map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      )
    }))
  }

  const addCondition = (groupId: string) => {
    updateGroup(groupId, {
      conditions: [...filter.groups.find(g => g.id === groupId)!.conditions, createNewCondition()]
    })
  }

  const removeCondition = (groupId: string, conditionId: string) => {
    const group = filter.groups.find(g => g.id === groupId)!
    updateGroup(groupId, {
      conditions: group.conditions.filter(c => c.id !== conditionId)
    })
  }

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    const group = filter.groups.find(g => g.id === groupId)!
    updateGroup(groupId, {
      conditions: group.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    })
  }

  const getFieldType = (fieldValue: string) => {
    const field = filterFields.find(f => f.value === fieldValue)
    return field?.type || 'text'
  }

  const getFieldOptions = (fieldValue: string) => {
    const field = filterFields.find(f => f.value === fieldValue)
    return field?.options || []
  }

  const getOperatorsForField = (fieldValue: string) => {
    const fieldType = getFieldType(fieldValue)
    return OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text
  }

  const needsValue2 = (operator: string) => {
    return operator === 'between'
  }

  const needsValue = (operator: string) => {
    return !['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(operator)
  }

  const handleApply = () => {
    // Validate filter has at least one condition
    const hasValidConditions = filter.groups.some(group => 
      group.conditions.some(condition => 
        condition.field && condition.operator && (
          !needsValue(condition.operator) || 
          condition.value !== '' && condition.value !== null
        )
      )
    )

    if (!hasValidConditions) {
      showToast.error('Please add at least one complete filter condition')
      return
    }

    // Set filter name if not provided
    if (!filter.name) {
      const filterName = `${tableType.toUpperCase()} Filter ${new Date().toLocaleDateString()}`
      setFilter(prev => ({ ...prev, name: filterName }))
      onApplyFilters({ ...filter, name: filterName })
    } else {
      onApplyFilters(filter)
    }
    
    onClose()
  }

  const handleReset = () => {
    setFilter({
      id: `filter-${Date.now()}`,
      name: '',
      groups: [createNewGroup()],
      groupOperator: 'AND'
    })
  }

  const handleClear = () => {
    onApplyFilters(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters - {tableType === 'ltd' ? 'Ltd Companies' : 'VAT Deadlines'}
          </DialogTitle>
          <DialogDescription>
            Create complex filters using AND/OR logic to find exactly what you need
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Name */}
          <div>
            <Label htmlFor="filter-name">Filter Name (Optional)</Label>
            <Input
              id="filter-name"
              placeholder="Enter a name for this filter"
              value={filter.name}
              onChange={(e) => setFilter(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Group Operator */}
          <div className="flex items-center gap-4">
            <Label>Combine Groups With:</Label>
            <Select 
              value={filter.groupOperator} 
              onValueChange={(value: 'AND' | 'OR') => setFilter(prev => ({ ...prev, groupOperator: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Groups */}
          <div className="space-y-4">
            {filter.groups.map((group, groupIndex) => (
              <Card key={group.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-sm">
                        Group {groupIndex + 1}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Combine conditions with:</Label>
                        <Select 
                          value={group.operator} 
                          onValueChange={(value: 'AND' | 'OR') => updateGroup(group.id, { operator: value })}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {filter.groups.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Conditions */}
                  {group.conditions.map((condition, conditionIndex) => (
                    <div key={condition.id} className="flex items-end gap-3 p-3 bg-muted/30 rounded-lg">
                      {/* Field */}
                      <div className="flex-1">
                        <Label className="text-xs">Field</Label>
                        <Select 
                          value={condition.field} 
                          onValueChange={(value) => updateCondition(group.id, condition.id, { 
                            field: value, 
                            operator: getOperatorsForField(value)[0]?.value || 'contains',
                            value: ''
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {filterFields.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Operator */}
                      <div className="flex-1">
                        <Label className="text-xs">Operator</Label>
                        <Select 
                          value={condition.operator} 
                          onValueChange={(value) => updateCondition(group.id, condition.id, { 
                            operator: value,
                            value: needsValue(value) ? condition.value : null
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getOperatorsForField(condition.field).map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Value */}
                      {needsValue(condition.operator) && (
                        <div className="flex-1">
                          <Label className="text-xs">Value</Label>
                          {getFieldType(condition.field) === 'select' ? (
                            <Select 
                              value={condition.value as string} 
                              onValueChange={(value) => updateCondition(group.id, condition.id, { value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {getFieldOptions(condition.field).map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : getFieldType(condition.field) === 'user' ? (
                            <Select 
                              value={condition.value as string} 
                              onValueChange={(value) => updateCondition(group.id, condition.id, { value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="me">Me</SelectItem>
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : getFieldType(condition.field) === 'boolean' ? (
                            <Select 
                              value={condition.value?.toString()} 
                              onValueChange={(value) => updateCondition(group.id, condition.id, { value: value === 'true' })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={getFieldType(condition.field) === 'date' ? 'date' : 'text'}
                              value={condition.value as string || ''}
                              onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
                              placeholder="Enter value"
                            />
                          )}
                        </div>
                      )}

                      {/* Value 2 (for between operator) */}
                      {needsValue2(condition.operator) && (
                        <div className="flex-1">
                          <Label className="text-xs">To</Label>
                          <Input
                            type={getFieldType(condition.field) === 'date' ? 'date' : 'text'}
                            value={condition.value2 || ''}
                            onChange={(e) => updateCondition(group.id, condition.id, { value2: e.target.value })}
                            placeholder="End value"
                          />
                        </div>
                      )}

                      {/* Remove Condition */}
                      {group.conditions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(group.id, condition.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Add Condition */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCondition(group.id)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Group */}
          <Button
            variant="outline"
            onClick={addGroup}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleReset}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="ghost" onClick={handleClear}>
              Clear Filters
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 