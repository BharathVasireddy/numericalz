/**
 * Email Template Variables System
 * Defines all available variables for email templates with descriptions and examples
 */

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
    example: '31 March 2025',
    category: 'dates',
    type: 'date'
  },
  {
    key: 'accounts.daysUntilAccountsDue',
    label: 'Days Until Accounts Due',
    description: 'Number of days until accounts filing is due',
    example: '45',
    category: 'workflow',
    type: 'number'
  },
  {
    key: 'accounts.daysUntilCTDue',
    label: 'Days Until CT Due',
    description: 'Number of days until corporation tax is due',
    example: '120',
    category: 'workflow',
    type: 'number'
  },
  {
    key: 'accounts.isAccountsOverdue',
    label: 'Accounts Are Overdue',
    description: 'Whether the annual accounts are overdue',
    example: 'false',
    category: 'workflow',
    type: 'boolean'
  },
  {
    key: 'accounts.isCTOverdue',
    label: 'Corporation Tax Is Overdue',
    description: 'Whether the corporation tax is overdue',
    example: 'false',
    category: 'workflow',
    type: 'boolean'
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