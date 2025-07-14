/**
 * Email Template Variables System
 * Defines all available variables for email templates with descriptions and examples
 */

import { formatQuarterPeriodForDisplay } from '@/lib/vat-workflow'

export interface EmailVariable {
  key: string
  label: string
  description: string
  example: string
  category: 'client' | 'user' | 'workflow' | 'dates' | 'system'
  required?: boolean
  type: 'string' | 'date' | 'number' | 'boolean'
}

export const EMAIL_VARIABLES: EmailVariable[] = [
  // Client Variables
  {
    key: 'client.companyName',
    label: 'Company Name',
    description: 'The full legal name of the client company',
    example: 'ABC Trading Limited',
    category: 'client',
    type: 'string',
    required: true
  },
  {
    key: 'client.clientCode',
    label: 'Client Code',
    description: 'The unique client code assigned by Numericalz',
    example: 'NZ-123',
    category: 'client',
    type: 'string',
    required: true
  },
  {
    key: 'client.companyNumber',
    label: 'Company Number',
    description: 'The Companies House registration number',
    example: '12345678',
    category: 'client',
    type: 'string'
  },
  {
    key: 'client.vatNumber',
    label: 'VAT Number',
    description: 'The UK VAT registration number',
    example: 'GB123456789',
    category: 'client',
    type: 'string'
  },
  {
    key: 'client.contactName',
    label: 'Contact Name',
    description: 'The primary contact person at the client company',
    example: 'John Smith',
    category: 'client',
    type: 'string'
  },
  {
    key: 'client.contactEmail',
    label: 'Contact Email',
    description: 'The primary contact email address',
    example: 'john.smith@abctrading.com',
    category: 'client',
    type: 'string'
  },
  {
    key: 'client.contactPhone',
    label: 'Contact Phone',
    description: 'The primary contact phone number',
    example: '020 7123 4567',
    category: 'client',
    type: 'string'
  },
  {
    key: 'client.companyType',
    label: 'Company Type',
    description: 'The type of company (Limited, Partnership, etc.)',
    example: 'LIMITED_COMPANY',
    category: 'client',
    type: 'string'
  },

  // User Variables
  {
    key: 'user.name',
    label: 'Assigned User Name',
    description: 'The name of the user assigned to the client/work',
    example: 'Sarah Johnson',
    category: 'user',
    type: 'string'
  },
  {
    key: 'user.email',
    label: 'Assigned User Email',
    description: 'The email address of the assigned user',
    example: 'sarah.johnson@numericalz.com',
    category: 'user',
    type: 'string'
  },
  {
    key: 'user.role',
    label: 'Assigned User Role',
    description: 'The role of the assigned user (Staff, Manager, Partner)',
    example: 'Manager',
    category: 'user',
    type: 'string'
  },
  {
    key: 'assignedBy.name',
    label: 'Assigned By Name',
    description: 'The name of the user who made the assignment',
    example: 'Michael Brown',
    category: 'user',
    type: 'string'
  },
  {
    key: 'assignedBy.email',
    label: 'Assigned By Email',
    description: 'The email of the user who made the assignment',
    example: 'michael.brown@numericalz.com',
    category: 'user',
    type: 'string'
  },
  {
    key: 'previousAssignee',
    label: 'Previous Assignee',
    description: 'The name of the previously assigned user',
    example: 'David Wilson',
    category: 'user',
    type: 'string'
  },

  // Workflow Variables
  {
    key: 'workflow.currentStage',
    label: 'Current Workflow Stage',
    description: 'The current stage of the workflow',
    example: 'PAPERWORK_RECEIVED',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'workflow.previousStage',
    label: 'Previous Workflow Stage',
    description: 'The previous stage before the current update',
    example: 'AWAITING_RECORDS',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'workflow.workflowType',
    label: 'Workflow Type',
    description: 'The type of workflow (VAT, ACCOUNTS, etc.)',
    example: 'VAT',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'workflow.comments',
    label: 'Workflow Comments',
    description: 'Any comments added with the workflow update',
    example: 'Additional documents required for completion',
    category: 'workflow',
    type: 'string'
  },

  // VAT Quarter Group Variables
  {
    key: 'vat.quarterGroup',
    label: 'VAT Quarter Group',
    description: 'The VAT quarter group (e.g., Jan/Apr/Jul/Oct)',
    example: 'Jan/Apr/Jul/Oct',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'vat.quarterGroupCode',
    label: 'VAT Quarter Group Code',
    description: 'The VAT quarter group code (e.g., 1_4_7_10)',
    example: '1_4_7_10',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'vat.filingMonths',
    label: 'VAT Filing Months',
    description: 'The months when VAT returns are filed for this quarter group',
    example: 'February, May, August, November',
    category: 'workflow',
    type: 'string'
  },

  // VAT Specific Variables
  {
    key: 'vat.quarterPeriod',
    label: 'VAT Quarter Period',
    description: 'The period covered by the VAT return',
    example: 'Apr-Jun 2024',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'vat.quarterStartDate',
    label: 'VAT Quarter Start Date',
    description: 'The start date of the VAT quarter',
    example: '1 April 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'vat.quarterEndDate',
    label: 'VAT Quarter End Date',
    description: 'The end date of the VAT quarter',
    example: '30 June 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'vat.filingDueDate',
    label: 'VAT Filing Due Date',
    description: 'The deadline for filing the VAT return',
    example: '31 July 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'vat.daysUntilDue',
    label: 'Days Until VAT Due',
    description: 'Number of days until the VAT filing is due',
    example: '15',
    category: 'workflow',
    type: 'number'
  },
  {
    key: 'vat.isOverdue',
    label: 'VAT Is Overdue',
    description: 'Whether the VAT return is overdue',
    example: 'false',
    category: 'workflow',
    type: 'boolean'
  },

  // Accounts Specific Variables
  {
    key: 'accounts.filingPeriod',
    label: 'Accounts Filing Period',
    description: 'The period covered by the annual accounts',
    example: '2024 accounts',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'accounts.yearEndDate',
    label: 'Year End Date',
    description: 'The company\'s accounting year end date',
    example: '31 March 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'accounts.accountsDueDate',
    label: 'Accounts Due Date',
    description: 'The deadline for filing annual accounts',
    example: '31 December 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'accounts.corporationTaxDueDate',
    label: 'Corporation Tax Due Date',
    description: 'The deadline for filing corporation tax',
    example: '31 December 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'accounts.confirmationStatementDueDate',
    label: 'Confirmation Statement Due Date',
    description: 'The deadline for filing confirmation statement (CS01)',
    example: '31 December 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'accounts.daysUntilAccountsDue',
    label: 'Days Until Accounts Due',
    description: 'Number of days until accounts filing is due',
    example: '30',
    category: 'workflow',
    type: 'number'
  },
  {
    key: 'accounts.daysUntilCTDue',
    label: 'Days Until Corporation Tax Due',
    description: 'Number of days until corporation tax filing is due',
    example: '45',
    category: 'workflow',
    type: 'number'
  },
  {
    key: 'accounts.daysUntilCSDue',
    label: 'Days Until Confirmation Statement Due',
    description: 'Number of days until confirmation statement filing is due',
    example: '15',
    category: 'workflow',
    type: 'number'
  },
  {
    key: 'accounts.isAccountsOverdue',
    label: 'Accounts Overdue',
    description: 'Whether the accounts filing is overdue',
    example: 'false',
    category: 'workflow',
    type: 'boolean'
  },
  {
    key: 'accounts.isCTOverdue',
    label: 'Corporation Tax Overdue',
    description: 'Whether the corporation tax filing is overdue',
    example: 'false',
    category: 'workflow',
    type: 'boolean'
  },
  {
    key: 'accounts.isCSOverdue',
    label: 'Confirmation Statement Overdue',
    description: 'Whether the confirmation statement filing is overdue',
    example: 'false',
    category: 'workflow',
    type: 'boolean'
  },

  // Current Status Variables
  {
    key: 'workflow.currentStage',
    label: 'Current Status',
    description: 'Current stage of the workflow',
    example: 'Work in Progress',
    category: 'workflow',
    type: 'string'
  },
  {
    key: 'workflow.comments',
    label: 'Status Comments',
    description: 'Comments about the current status',
    example: 'Awaiting bank statements',
    category: 'workflow',
    type: 'string'
  },

  // Date Variables
  {
    key: 'dates.currentDate',
    label: 'Current Date',
    description: 'Today\'s date in UK format',
    example: '15 January 2024',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'dates.currentDateTime',
    label: 'Current Date & Time',
    description: 'Current date and time in UK format',
    example: '15 January 2024 14:30',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'dates.currentYear',
    label: 'Current Year',
    description: 'The current calendar year',
    example: '2024',
    category: 'dates',
    type: 'number'
  },
  {
    key: 'dates.currentMonth',
    label: 'Current Month',
    description: 'The current month name',
    example: 'January',
    category: 'dates',
    type: 'string'
  },

  // System Variables
  {
    key: 'system.companyName',
    label: 'Numericalz Company Name',
    description: 'The name of the accounting firm',
    example: 'Numericalz',
    category: 'system',
    type: 'string'
  },
  {
    key: 'system.companyEmail',
    label: 'Numericalz Email',
    description: 'The main contact email for Numericalz',
    example: 'hello@numericalz.com',
    category: 'system',
    type: 'string'
  },
  {
    key: 'system.companyPhone',
    label: 'Numericalz Phone',
    description: 'The main contact phone for Numericalz',
    example: '020 7123 4567',
    category: 'system',
    type: 'string'
  },
  {
    key: 'system.websiteUrl',
    label: 'Numericalz Website',
    description: 'The Numericalz website URL',
    example: 'https://numericalz.com',
    category: 'system',
    type: 'string'
  },
  {
    key: 'system.dashboardUrl',
    label: 'Dashboard URL',
    description: 'Link to the Numericalz dashboard',
    example: 'https://app.numericalz.com/dashboard',
    category: 'system',
    type: 'string'
  },
  {
    key: 'system.supportEmail',
    label: 'Support Email',
    description: 'Email for technical support',
    example: 'support@numericalz.com',
    category: 'system',
    type: 'string'
  },
  {
    key: 'system.currentDate',
    label: 'Current Date',
    description: 'Today\'s date',
    example: '15 July 2024',
    category: 'system',
    type: 'date'
  }
]

// Group variables by category
export const VARIABLES_BY_CATEGORY = {
  client: EMAIL_VARIABLES.filter(v => v.category === 'client'),
  user: EMAIL_VARIABLES.filter(v => v.category === 'user'),
  workflow: EMAIL_VARIABLES.filter(v => v.category === 'workflow'),
  dates: EMAIL_VARIABLES.filter(v => v.category === 'dates'),
  system: EMAIL_VARIABLES.filter(v => v.category === 'system')
}

// Category labels for UI
export const CATEGORY_LABELS = {
  client: 'Client Information',
  user: 'User & Assignment',
  workflow: 'Workflow & Status',
  dates: 'Dates & Deadlines',
  system: 'System & Company'
}

// Get variables for specific template categories
export function getVariablesForTemplateCategory(templateCategory: string): EmailVariable[] {
  const baseVariables = [
    ...VARIABLES_BY_CATEGORY.client,
    ...VARIABLES_BY_CATEGORY.user,
    ...VARIABLES_BY_CATEGORY.dates,
    ...VARIABLES_BY_CATEGORY.system
  ]

  switch (templateCategory) {
    case 'VAT_WORKFLOW':
    case 'VAT_CHASE':
      return [
        ...baseVariables,
        ...EMAIL_VARIABLES.filter(v => v.key.startsWith('vat.')),
        ...EMAIL_VARIABLES.filter(v => v.key.includes('workflow'))
      ]
    
    case 'ACCOUNTS_WORKFLOW':
    case 'ACCOUNTS_CHASE':
      return [
        ...baseVariables,
        ...EMAIL_VARIABLES.filter(v => v.key.startsWith('accounts.')),
        ...EMAIL_VARIABLES.filter(v => v.key.includes('workflow'))
      ]
    
    case 'ASSIGNMENT_NOTIFICATION':
      return [
        ...baseVariables,
        ...EMAIL_VARIABLES.filter(v => v.key.includes('assignedBy') || v.key.includes('previousAssignee'))
      ]
    
    case 'CHASE_REMINDER':
      return [
        ...baseVariables,
        ...EMAIL_VARIABLES.filter(v => v.key.includes('workflow') || v.key.includes('Due'))
      ]
    
    default:
      return baseVariables
  }
}

// Format variable for display in templates
export function formatVariable(key: string): string {
  return `{{${key}}}`
}

// Get all variable keys as formatted strings
export function getAllVariableKeys(): string[] {
  return EMAIL_VARIABLES.map(v => formatVariable(v.key))
}

// Search variables by keyword
export function searchVariables(query: string): EmailVariable[] {
  const lowercaseQuery = query.toLowerCase()
  return EMAIL_VARIABLES.filter(v => 
    v.key.toLowerCase().includes(lowercaseQuery) ||
    v.label.toLowerCase().includes(lowercaseQuery) ||
    v.description.toLowerCase().includes(lowercaseQuery)
  )
}

// Validate if a variable exists
export function isValidVariable(key: string): boolean {
  return EMAIL_VARIABLES.some(v => v.key === key)
}

// Get variable by key
export function getVariableByKey(key: string): EmailVariable | undefined {
  return EMAIL_VARIABLES.find(v => v.key === key)
}

// Process variables in content with real data
export function processEmailVariables(
  content: string, 
  data: {
    client?: any
    user?: any
    workflow?: any
    vat?: any
    accounts?: any
    dates?: any
    system?: any
  }
): string {
  // Handle undefined or null content
  if (!content || typeof content !== 'string') {
    return ''
  }
  
  let processed = content

  // Client variables
  if (data.client) {
    processed = processed.replace(/\{\{client\.companyName\}\}/g, data.client.companyName || '')
    processed = processed.replace(/\{\{client\.clientCode\}\}/g, data.client.clientCode || '')
    processed = processed.replace(/\{\{client\.companyNumber\}\}/g, data.client.companyNumber || '')
    processed = processed.replace(/\{\{client\.vatNumber\}\}/g, data.client.vatNumber || '')
    processed = processed.replace(/\{\{client\.contactName\}\}/g, data.client.contactName || '')
    processed = processed.replace(/\{\{client\.contactEmail\}\}/g, data.client.email || data.client.contactEmail || '')
    processed = processed.replace(/\{\{client\.contactPhone\}\}/g, data.client.phone || data.client.contactPhone || '')
    processed = processed.replace(/\{\{client\.companyType\}\}/g, formatCompanyType(data.client.companyType || data.client.type || ''))
    
    // Legacy client variable aliases
    processed = processed.replace(/\{\{client\.email\}\}/g, data.client.email || data.client.contactEmail || '')
    processed = processed.replace(/\{\{client\.phone\}\}/g, data.client.phone || data.client.contactPhone || '')
  }

  // User variables - ALWAYS process, use "NA" if data not applicable
  const user = data.user || data.client?.assignedUser
  processed = processed.replace(/\{\{user\.name\}\}/g, user?.name || (data.user !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{user\.email\}\}/g, user?.email || (data.user !== undefined ? 'NA' : ''))

  // Workflow variables - ALWAYS process (client-relevant only)
  processed = processed.replace(/\{\{workflow\.currentStage\}\}/g, data.workflow?.currentStage ? formatWorkflowStage(data.workflow.currentStage) : (data.workflow !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{workflow\.comments\}\}/g, data.workflow?.comments || (data.workflow !== undefined ? 'NA' : ''))

  // VAT specific variables - ALWAYS process
  const vatQuarterPeriod = data.vat?.quarterPeriod ? formatQuarterPeriod(data.vat.quarterPeriod) : (data.vat !== undefined ? 'NA' : '')
  processed = processed.replace(/\{\{vat\.quarterPeriod\}\}/g, vatQuarterPeriod)
  processed = processed.replace(/\{\{vat\.quarterStartDate\}\}/g, data.vat?.quarterStartDate ? formatDate(data.vat.quarterStartDate) : (data.vat !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{vat\.quarterEndDate\}\}/g, data.vat?.quarterEndDate ? formatDate(data.vat.quarterEndDate) : (data.vat !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{vat\.filingDueDate\}\}/g, data.vat?.filingDueDate ? formatDate(data.vat.filingDueDate) : (data.vat !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{vat\.daysUntilDue\}\}/g, data.vat?.daysUntilDue !== undefined ? String(data.vat.daysUntilDue) : (data.vat !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{vat\.isOverdue\}\}/g, data.vat?.isOverdue !== undefined ? String(data.vat.isOverdue) : (data.vat !== undefined ? 'NA' : ''))
  
  // VAT quarter group variables - ALWAYS process
  processed = processed.replace(/\{\{vat\.quarterGroup\}\}/g, data.vat?.quarterGroup ? formatVATQuarterGroup(data.vat.quarterGroup) : (data.vat !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{vat\.quarterGroupCode\}\}/g, data.vat?.quarterGroupCode || (data.vat !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{vat\.filingMonths\}\}/g, data.vat?.quarterGroupCode ? formatVATFilingMonths(data.vat.quarterGroupCode) : (data.vat !== undefined ? 'NA' : ''))
  
  // Legacy VAT variable aliases
  processed = processed.replace(/\{\{vat\.quarter\}\}/g, vatQuarterPeriod)
  processed = processed.replace(/\{\{quarterPeriod\}\}/g, vatQuarterPeriod)
  processed = processed.replace(/\{\{filingDueDate\}\}/g, data.vat?.filingDueDate ? formatDate(data.vat.filingDueDate) : (data.vat !== undefined ? 'NA' : ''))

  // Accounts specific variables - ALWAYS process
  processed = processed.replace(/\{\{accounts\.filingPeriod\}\}/g, data.accounts?.filingPeriod ? formatFilingPeriod(data.accounts.filingPeriod) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.yearEndDate\}\}/g, data.accounts?.yearEndDate ? formatDate(data.accounts.yearEndDate) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.accountsDueDate\}\}/g, data.accounts?.accountsDueDate ? formatDate(data.accounts.accountsDueDate) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.corporationTaxDueDate\}\}/g, data.accounts?.corporationTaxDueDate ? formatDate(data.accounts.corporationTaxDueDate) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.confirmationStatementDueDate\}\}/g, data.accounts?.confirmationStatementDueDate ? formatDate(data.accounts.confirmationStatementDueDate) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.daysUntilAccountsDue\}\}/g, data.accounts?.daysUntilAccountsDue !== undefined ? String(data.accounts.daysUntilAccountsDue) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.daysUntilCTDue\}\}/g, data.accounts?.daysUntilCTDue !== undefined ? String(data.accounts.daysUntilCTDue) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.daysUntilCSDue\}\}/g, data.accounts?.daysUntilCSDue !== undefined ? String(data.accounts.daysUntilCSDue) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.isAccountsOverdue\}\}/g, data.accounts?.isAccountsOverdue !== undefined ? String(data.accounts.isAccountsOverdue) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.isCTOverdue\}\}/g, data.accounts?.isCTOverdue !== undefined ? String(data.accounts.isCTOverdue) : (data.accounts !== undefined ? 'NA' : ''))
  processed = processed.replace(/\{\{accounts\.isCSOverdue\}\}/g, data.accounts?.isCSOverdue !== undefined ? String(data.accounts.isCSOverdue) : (data.accounts !== undefined ? 'NA' : ''))

  // Date variables
  const now = new Date()
  const ukDateOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }
  const ukDateTimeOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  processed = processed.replace(/\{\{dates\.currentDate\}\}/g, now.toLocaleDateString('en-GB', ukDateOptions))
  processed = processed.replace(/\{\{dates\.currentDateTime\}\}/g, now.toLocaleDateString('en-GB', ukDateTimeOptions))
  processed = processed.replace(/\{\{dates\.currentYear\}\}/g, String(now.getFullYear()))
  processed = processed.replace(/\{\{dates\.currentMonth\}\}/g, now.toLocaleDateString('en-GB', { month: 'long' }))
  
  // Legacy date variable aliases
  processed = processed.replace(/\{\{currentDate\}\}/g, now.toLocaleDateString('en-GB', ukDateOptions))
  processed = processed.replace(/\{\{date\.today\}\}/g, now.toLocaleDateString('en-GB'))
  processed = processed.replace(/\{\{date\.todayLong\}\}/g, now.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }))

  // System variables
  processed = processed.replace(/\{\{system\.companyName\}\}/g, 'Numericalz')
  processed = processed.replace(/\{\{system\.companyEmail\}\}/g, 'hello@numericalz.com')
  processed = processed.replace(/\{\{system\.companyPhone\}\}/g, '+44 20 1234 5678')
  processed = processed.replace(/\{\{system\.websiteUrl\}\}/g, 'https://numericalz.com')
  processed = processed.replace(/\{\{system\.dashboardUrl\}\}/g, 'https://app.numericalz.com/dashboard')
  processed = processed.replace(/\{\{system\.supportEmail\}\}/g, 'support@numericalz.com')
  processed = processed.replace(/\{\{system\.currentDate\}\}/g, now.toLocaleDateString('en-GB', ukDateOptions))
  
  // Legacy system variable aliases
  processed = processed.replace(/\{\{system\.firmName\}\}/g, 'Numericalz')
  processed = processed.replace(/\{\{system\.firmEmail\}\}/g, 'hello@numericalz.com')
  processed = processed.replace(/\{\{system\.firmPhone\}\}/g, '+44 20 1234 5678')

  return processed
}

// Helper function to format dates for display
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return dateObj.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch (error) {
    return ''
  }
}

// Helper function to format VAT quarter period for display
function formatQuarterPeriod(quarterPeriod: string | null | undefined): string {
  if (!quarterPeriod) return ''
  
  try {
    // Use the existing formatQuarterPeriodForDisplay function from vat-workflow.ts
    return formatQuarterPeriodForDisplay(quarterPeriod)
  } catch (error) {
    // Fallback: try to format manually if the function fails
    try {
      // Parse format like "2025-07-01_to_2025-09-30" 
      const parts = quarterPeriod.split('_to_')
      if (parts.length === 2 && parts[0] && parts[1]) {
        const startDate = new Date(parts[0])
        const endDate = new Date(parts[1])
        
        const startMonth = startDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
        const endMonth = endDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
        const year = endDate.getFullYear()
        
        return `${startMonth} - ${endMonth} ${year}`
      }
    } catch (fallbackError) {
      console.error('Error formatting quarter period:', fallbackError)
    }
    
    // Last resort: return original value
    return quarterPeriod
  }
}

// Helper function to format company type for display
function formatCompanyType(companyType: string): string {
  if (!companyType) return ''
  
  const typeMap: { [key: string]: string } = {
    'LIMITED_COMPANY': 'Limited Company',
    'LTD_COMPANY': 'Limited Company',
    'PARTNERSHIP': 'Partnership',
    'SOLE_TRADER': 'Sole Trader',
    'LLP': 'Limited Liability Partnership',
    'CIC': 'Community Interest Company',
    'OTHER': 'Other'
  }
  
  return typeMap[companyType.toUpperCase()] || companyType
}

// Helper function to format user role for display
function formatUserRole(role: string): string {
  if (!role) return ''
  
  const roleMap: { [key: string]: string } = {
    'PARTNER': 'Partner',
    'MANAGER': 'Manager',
    'STAFF': 'Staff Member'
  }
  
  return roleMap[role.toUpperCase()] || role
}

// Helper function to format workflow stage for display
function formatWorkflowStage(stage: string): string {
  if (!stage) return ''
  
  // Convert from UPPERCASE_UNDERSCORE to Title Case
  return stage
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to format VAT quarter group for display
function formatVATQuarterGroup(quarterGroup: string): string {
  if (!quarterGroup) return ''
  
  const quarterGroupMap: { [key: string]: string } = {
    '1_4_7_10': 'Jan/Apr/Jul/Oct',
    '2_5_8_11': 'Feb/May/Aug/Nov',
    '3_6_9_12': 'Mar/Jun/Sep/Dec'
  }
  
  return quarterGroupMap[quarterGroup] || quarterGroup
}

// Helper function to format VAT filing months for display
function formatVATFilingMonths(quarterGroupCode: string): string {
  if (!quarterGroupCode) return ''
  
  const filingMonthsMap: { [key: string]: string } = {
    '1_4_7_10': 'February, May, August, November',
    '2_5_8_11': 'March, June, September, December', 
    '3_6_9_12': 'April, July, October, January'
  }
  
  return filingMonthsMap[quarterGroupCode] || ''
}

// Helper function to format filing period for display
function formatFilingPeriod(filingPeriod: string): string {
  if (!filingPeriod) return ''
  
  // Check if it's a year-based period like "2024 accounts"
  if (filingPeriod.includes('accounts')) {
    return filingPeriod
  }
  
  // Check if it's a date range format
  if (filingPeriod.includes('_to_')) {
    try {
      const parts = filingPeriod.split('_to_')
      if (parts.length === 2 && parts[0] && parts[1]) {
        const startDate = new Date(parts[0])
        const endDate = new Date(parts[1])
        
        const startFormatted = startDate.toLocaleDateString('en-GB', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/London'
        })
        const endFormatted = endDate.toLocaleDateString('en-GB', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/London'
        })
        
        return `${startFormatted} to ${endFormatted}`
      }
    } catch (error) {
      console.error('Error formatting filing period:', error)
    }
  }
  
  // Return original if no formatting needed
  return filingPeriod
}

// Extract variables used in content
export function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g
  const matches: string[] = []
  let match

  while ((match = variableRegex.exec(content)) !== null) {
    const variableKey = match[1]?.trim()
    if (variableKey && !matches.includes(variableKey)) {
      matches.push(variableKey)
    }
  }

  return matches
}

// Get variable data for display in Variable Info tab
export function getVariableDisplayData(
  variableKey: string,
  data: any
): { key: string; value: string; description?: string } {
  const variable = getVariableByKey(variableKey)
  const mockProcessed = processEmailVariables(`{{${variableKey}}}`, data)
  const value = mockProcessed.replace(`{{${variableKey}}}`, '') || 'Not available'
  
  return {
    key: variableKey,
    value: value,
    description: variable?.description
  }
} 

