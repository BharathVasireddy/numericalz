# Data Models and Database Schemas - Numericalz Internal Management System

## 🎯 Overview

This document provides comprehensive documentation for all data models, database schemas, and TypeScript interfaces used in the Numericalz Internal Management System.

## 📋 Table of Contents

1. [Core Data Models](#core-data-models)
2. [Database Schema Details](#database-schema-details)
3. [TypeScript Interfaces](#typescript-interfaces)
4. [Validation Schemas](#validation-schemas)
5. [Enum Definitions](#enum-definitions)
6. [Relationship Mappings](#relationship-mappings)
7. [Database Indexes](#database-indexes)
8. [Migration Patterns](#migration-patterns)

---

## 🗄️ Core Data Models

### User Model
**Table:** `users`

Represents system users with role-based access control.

```typescript
interface User {
  id: string                    // Primary key (cuid)
  email: string                 // Unique email address
  name: string                  // Full name
  password: string              // Hashed password (bcrypt)
  role: UserRole               // PARTNER | MANAGER | STAFF
  isActive: boolean            // Account status
  lastLoginAt?: Date           // Last login timestamp
  createdAt: Date              // Account creation
  updatedAt: Date              // Last update
  
  // OTP fields for 2FA
  otpCode?: string
  otpExpiresAt?: Date
  otpAttempts: number
  lastOtpSentAt?: Date
  isOtpVerified: boolean
  
  // Relationships
  assignedClients: Client[]
  ltdCompanyAssignedClients: Client[]
  nonLtdCompanyAssignedClients: Client[]
  vatAssignedClients: Client[]
  activityLogs: ActivityLog[]
  notifications: Notification[]
}
```

**Key Features:**
- Role-based access control (RBAC)
- Secure password hashing
- Optional 2FA with OTP
- Multiple client assignment types
- Activity tracking

### Client Model
**Table:** `clients`

Central model for company/client management.

```typescript
interface Client {
  id: string                    // Primary key (cuid)
  clientCode: string            // Unique client code (NZ-1, NZ-2, etc.)
  
  // Basic Company Information
  companyName: string
  companyNumber?: string        // Companies House number
  companyType: string          // LIMITED_COMPANY | NON_LIMITED_COMPANY
  companyStatus?: string       // Active, Dissolved, etc.
  companyStatusDetail?: string
  incorporationDate?: Date
  cessationDate?: Date
  
  // Companies House Data
  registeredOfficeAddress?: string  // JSON string
  sicCodes?: string                // JSON array as string
  jurisdiction?: string
  hasBeenLiquidated: boolean
  hasCharges: boolean
  hasInsolvencyHistory: boolean
  officers?: string                // JSON string
  personsWithSignificantControl?: string // JSON string
  
  // Statutory Dates
  nextAccountsDue?: Date           // From Companies House
  lastAccountsMadeUpTo?: Date
  nextConfirmationDue?: Date       // From Companies House
  lastConfirmationMadeUpTo?: Date
  nextYearEnd?: Date              // Companies House official year end
  nextCorporationTaxDue?: Date    // Calculated
  
  // Contact Information
  contactName: string
  contactEmail: string
  contactPhone?: string
  contactFax?: string
  website?: string
  
  // Business Details
  vatNumber?: string
  yearEstablished?: number
  numberOfEmployees?: number
  annualTurnover?: number
  paperworkFrequency?: string
  
  // Assignment Fields
  assignedUserId?: string         // General assignment
  ltdCompanyAssignedUserId?: string
  nonLtdCompanyAssignedUserId?: string
  vatAssignedUserId?: string
  chaseTeamUserIds: string[]      // Array of chase team members
  
  // Status and Metadata
  isActive: boolean
  isVatEnabled: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
  
  // Corporation Tax Tracking
  corporationTaxStatus: string    // PENDING | FILED | OVERDUE
  corporationTaxPeriodStart?: Date
  corporationTaxPeriodEnd?: Date
  manualCTDueOverride?: Date
  ctDueSource: string            // AUTO | MANUAL
  lastCTStatusUpdate?: Date
  ctStatusUpdatedBy?: string
  
  // VAT Configuration
  vatRegistrationDate?: Date
  vatDeregistrationDate?: Date
  vatFrequency?: string          // Monthly | Quarterly
  vatQuarterGroup?: string       // A | B | C
  vatScheme?: string
  
  // Additional Fields for Non-Ltd Companies
  natureOfTrade?: string
  nationalInsuranceNumber?: string
  utrNumber?: string
  tradingAddressLine1?: string
  tradingAddressLine2?: string
  tradingAddressCountry?: string
  tradingAddressPostCode?: string
  residentialAddressLine1?: string
  residentialAddressLine2?: string
  residentialAddressCountry?: string
  residentialAddressPostCode?: string
  
  // Workflow Status
  paperWorkReceived: boolean
  paperWorkReceivedDate?: Date
  jobCompleted: boolean
  jobCompletedDate?: Date
  sa100Filed: boolean
  sa100FiledDate?: Date
  workStatus?: string
  
  // Relationships
  assignedUser?: User
  ltdCompanyAssignedUser?: User
  nonLtdCompanyAssignedUser?: User
  vatAssignedUser?: User
  activityLogs: ActivityLog[]
  vatQuartersWorkflow: VATQuarter[]
  ltdAccountsWorkflows: LtdAccountsWorkflow[]
}
```

### VAT Quarter Model
**Table:** `vat_quarters`

Manages VAT return quarters and workflow stages.

```typescript
interface VATQuarter {
  id: string
  clientId: string
  
  // Quarter Information
  quarterPeriod: string         // "2024-Q1", "2024-Q2", etc.
  quarterStartDate: Date
  quarterEndDate: Date
  filingDueDate: Date
  quarterGroup: string          // A, B, C (determines due dates)
  
  // Workflow State
  currentStage: VATWorkflowStage
  isCompleted: boolean
  assignedUserId?: string
  
  // Stage Timestamps and Users
  chaseStartedDate?: Date
  chaseStartedByUserId?: string
  chaseStartedByUserName?: string
  
  paperworkReceivedDate?: Date
  paperworkReceivedByUserId?: string
  paperworkReceivedByUserName?: string
  
  workStartedDate?: Date
  workStartedByUserId?: string
  workStartedByUserName?: string
  
  workFinishedDate?: Date
  workFinishedByUserId?: string
  workFinishedByUserName?: string
  
  sentToClientDate?: Date
  sentToClientByUserId?: string
  sentToClientByUserName?: string
  
  clientApprovedDate?: Date
  clientApprovedByUserId?: string
  clientApprovedByUserName?: string
  
  filedToHMRCDate?: Date
  filedToHMRCByUserId?: string
  filedToHMRCByUserName?: string
  
  createdAt: Date
  updatedAt: Date
  
  // Relationships
  client: Client
  assignedUser?: User
  workflowHistory: VATWorkflowHistory[]
}
```

### Ltd Accounts Workflow Model
**Table:** `ltd_accounts_workflows`

Manages annual accounts workflows for limited companies.

```typescript
interface LtdAccountsWorkflow {
  id: string
  clientId: string
  
  // Filing Period
  filingPeriodStart: Date
  filingPeriodEnd: Date
  accountsDueDate: Date
  ctDueDate: Date
  csDueDate: Date
  
  // Workflow State
  currentStage: LtdAccountsWorkflowStage
  assignedUserId?: string
  isCompleted: boolean
  
  // Stage Timestamps (similar to VAT quarters)
  chaseStartedDate?: Date
  chaseStartedByUserId?: string
  chaseStartedByUserName?: string
  
  paperworkReceivedDate?: Date
  paperworkReceivedByUserId?: string
  paperworkReceivedByUserName?: string
  
  workStartedDate?: Date
  workStartedByUserId?: string
  workStartedByUserName?: string
  
  managerDiscussionDate?: Date
  managerDiscussionByUserId?: string
  managerDiscussionByUserName?: string
  
  partnerReviewDate?: Date
  partnerReviewByUserId?: string
  partnerReviewByUserName?: string
  
  reviewCompletedDate?: Date
  reviewCompletedByUserId?: string
  reviewCompletedByUserName?: string
  
  sentToClientDate?: Date
  sentToClientByUserId?: string
  sentToClientByUserName?: string
  
  clientApprovedDate?: Date
  clientApprovedByUserId?: string
  clientApprovedByUserName?: string
  
  partnerApprovedDate?: Date
  partnerApprovedByUserId?: string
  partnerApprovedByUserName?: string
  
  filedDate?: Date
  filedByUserId?: string
  filedByUserName?: string
  
  filedToCompaniesHouseDate?: Date
  filedToCompaniesHouseByUserId?: string
  filedToCompaniesHouseByUserName?: string
  
  filedToHMRCDate?: Date
  filedToHMRCByUserId?: string
  filedToHMRCByUserName?: string
  
  clientSelfFilingDate?: Date
  clientSelfFilingByUserId?: string
  clientSelfFilingByUserName?: string
  
  createdAt: Date
  updatedAt: Date
  
  // Relationships
  client: Client
  assignedUser?: User
  workflowHistory: LtdAccountsWorkflowHistory[]
}
```

### Activity Log Model
**Table:** `activity_logs`

Comprehensive audit trail for all system actions.

```typescript
interface ActivityLog {
  id: string
  action: string              // Action type (CLIENT_CREATED, USER_ASSIGNED, etc.)
  timestamp: Date
  userId?: string            // User who performed the action
  clientId?: string          // Related client (if applicable)
  details?: string           // JSON string with additional details
  
  // Relationships
  user?: User
  client?: Client
}
```

### Communication Model
**Table:** `communications`

Email and communication tracking.

```typescript
interface Communication {
  id: string
  type: string               // EMAIL | SMS | PHONE
  subject: string
  content: string
  sentAt?: Date
  scheduledAt?: Date
  clientId: string
  sentByUserId?: string
  createdAt: Date
  updatedAt: Date
  
  // Relationships
  client: Client
  sentBy?: User
}
```

### Email Log Model
**Table:** `email_logs`

Detailed email sending and delivery tracking.

```typescript
interface EmailLog {
  id: string
  recipientEmail: string
  recipientName?: string
  subject: string
  content: string
  emailType: string          // ASSIGNMENT | NOTIFICATION | WORKFLOW
  status: EmailStatus        // PENDING | SENT | DELIVERED | FAILED
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  failureReason?: string
  clientId?: string
  workflowType?: string
  workflowId?: string
  triggeredBy: string        // User ID who triggered the email
  fromEmail?: string
  fromName?: string
  createdAt: Date
  updatedAt: Date
  
  // Relationships
  client?: Client
  triggeredByUser: User
}
```

---

## 🔧 TypeScript Interfaces

### API Request/Response Interfaces

#### Client Creation
```typescript
interface CreateClientRequest {
  companyName: string
  companyType: string
  companyNumber?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  notes?: string
  
  // Companies House data (auto-populated)
  registeredOfficeAddress?: string
  sicCodes?: string[]
  nextAccountsDue?: string
  nextConfirmationDue?: string
  incorporationDate?: string
  companyStatus?: string
  officers?: any[]
  personsWithSignificantControl?: any[]
}

interface CreateClientResponse {
  success: boolean
  data: Client
  message: string
}
```

#### Client Assignment
```typescript
interface AssignClientRequest {
  userId: string | null  // null to unassign
}

interface AssignClientResponse {
  success: boolean
  data: Client & { assignedUser?: User }
  message: string
}
```

#### Bulk Operations
```typescript
interface BulkAssignRequest {
  clientIds: string[]
  userId: string | null
}

interface BulkOperationResponse {
  success: boolean
  results: {
    successful: number
    failed: number
    errors: string[]
  }
  message: string
}
```

### Filter and Search Interfaces

#### Advanced Filtering
```typescript
interface FilterCondition {
  id: string
  field: string
  operator: string           // equals | contains | startsWith | greaterThan | lessThan
  value: string | string[] | boolean | null
  value2?: string           // For range operations
}

interface FilterGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

interface AdvancedFilter {
  id: string
  name: string
  groups: FilterGroup[]
  groupOperator: 'AND' | 'OR'
}
```

#### Search and Pagination
```typescript
interface SearchParams {
  search?: string
  companyType?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
```

### Companies House Interfaces

```typescript
interface CompaniesHouseCompany {
  company_number: string
  company_name: string
  company_status: string
  company_status_detail?: string
  type: string
  date_of_creation?: string
  date_of_cessation?: string
  registered_office_address?: CompaniesHouseAddress
  sic_codes?: string[]
  accounts?: CompaniesHouseAccounts
  confirmation_statement?: CompaniesHouseConfirmationStatement
  jurisdiction?: string
  has_been_liquidated?: boolean
  has_charges?: boolean
  has_insolvency_history?: boolean
}

interface CompaniesHouseAccounts {
  next_due?: string
  next_made_up_to?: string
  last_accounts?: {
    made_up_to?: string
    type?: string
  }
  accounting_reference_date?: {
    day?: string
    month?: string
  }
}

interface CompaniesHouseAddress {
  address_line_1?: string
  address_line_2?: string
  locality?: string
  region?: string
  postal_code?: string
  country?: string
}
```

---

## ✅ Validation Schemas

### Zod Validation Schemas

#### Client Validation
```typescript
import { z } from 'zod'

const CreateClientSchema = z.object({
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(255, 'Company name too long'),
  
  companyType: z.enum(['LIMITED_COMPANY', 'NON_LIMITED_COMPANY']),
  
  companyNumber: z.string()
    .regex(/^([A-Z]{0,2})?(\d{6,8})$/, 'Invalid UK company number format')
    .optional(),
  
  contactName: z.string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name too long'),
  
  contactEmail: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  
  contactPhone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .optional(),
  
  website: z.string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),
  
  vatNumber: z.string()
    .regex(/^GB\d{9}$/, 'Invalid UK VAT number format')
    .optional(),
  
  yearEstablished: z.number()
    .int()
    .min(1800, 'Year must be after 1800')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .optional(),
  
  numberOfEmployees: z.number()
    .int()
    .min(0, 'Number of employees cannot be negative')
    .optional(),
  
  annualTurnover: z.number()
    .min(0, 'Annual turnover cannot be negative')
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
})
```

#### User Validation
```typescript
const CreateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name too long'),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
           'Password must contain uppercase, lowercase, and number'),
  
  role: z.enum(['PARTNER', 'MANAGER', 'STAFF'])
})
```

#### VAT Quarter Validation
```typescript
const VATQuarterUpdateSchema = z.object({
  stage: z.enum([
    'PAPERWORK_PENDING_CHASE',
    'PAPERWORK_CHASED',
    'PAPERWORK_RECEIVED',
    'WORK_IN_PROGRESS',
    'QUERIES_PENDING',
    'REVIEW_PENDING_MANAGER',
    'REVIEW_PENDING_PARTNER',
    'EMAILED_TO_PARTNER',
    'EMAILED_TO_CLIENT',
    'CLIENT_APPROVED',
    'FILED_TO_HMRC'
  ]),
  
  notes: z.string()
    .max(500, 'Notes too long')
    .optional(),
  
  assignedUserId: z.string()
    .cuid('Invalid user ID')
    .optional()
})
```

---

## 📊 Enum Definitions

### User Roles
```typescript
enum UserRole {
  PARTNER = 'PARTNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}
```

### VAT Workflow Stages
```typescript
enum VATWorkflowStage {
  PAPERWORK_PENDING_CHASE = 'PAPERWORK_PENDING_CHASE',
  PAPERWORK_CHASED = 'PAPERWORK_CHASED',
  PAPERWORK_RECEIVED = 'PAPERWORK_RECEIVED',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  QUERIES_PENDING = 'QUERIES_PENDING',
  REVIEW_PENDING_MANAGER = 'REVIEW_PENDING_MANAGER',
  REVIEW_PENDING_PARTNER = 'REVIEW_PENDING_PARTNER',
  EMAILED_TO_PARTNER = 'EMAILED_TO_PARTNER',
  EMAILED_TO_CLIENT = 'EMAILED_TO_CLIENT',
  CLIENT_APPROVED = 'CLIENT_APPROVED',
  FILED_TO_HMRC = 'FILED_TO_HMRC'
}
```

### Ltd Accounts Workflow Stages
```typescript
enum LtdAccountsWorkflowStage {
  PAPERWORK_PENDING_CHASE = 'PAPERWORK_PENDING_CHASE',
  PAPERWORK_CHASED = 'PAPERWORK_CHASED',
  PAPERWORK_RECEIVED = 'PAPERWORK_RECEIVED',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  MANAGER_DISCUSSION = 'MANAGER_DISCUSSION',
  PARTNER_REVIEW = 'PARTNER_REVIEW',
  REVIEW_COMPLETED = 'REVIEW_COMPLETED',
  SENT_TO_CLIENT = 'SENT_TO_CLIENT',
  CLIENT_APPROVED = 'CLIENT_APPROVED',
  PARTNER_APPROVED = 'PARTNER_APPROVED',
  FILED = 'FILED'
}
```

### Email Status
```typescript
enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED'
}
```

### Corporation Tax Status
```typescript
enum CorporationTaxStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  FILED = 'FILED',
  OVERDUE = 'OVERDUE',
  NOT_REQUIRED = 'NOT_REQUIRED'
}
```

---

## 🔗 Relationship Mappings

### Client Relationships
```typescript
// One client can have multiple assignments
Client.assignedUser        -> User (General assignment)
Client.ltdAssignedUser     -> User (Ltd company work)
Client.nonLtdAssignedUser  -> User (Non-ltd company work)
Client.vatAssignedUser     -> User (VAT work)

// One client can have multiple workflow records
Client.vatQuarters         -> VATQuarter[]
Client.ltdWorkflows        -> LtdAccountsWorkflow[]
Client.activityLogs        -> ActivityLog[]
Client.communications      -> Communication[]
Client.emailLogs           -> EmailLog[]
```

### User Relationships
```typescript
// One user can be assigned to multiple clients
User.assignedClients          -> Client[] (General assignments)
User.ltdAssignedClients       -> Client[] (Ltd company assignments)
User.nonLtdAssignedClients    -> Client[] (Non-ltd assignments)
User.vatAssignedClients       -> Client[] (VAT assignments)

// One user can have multiple workflow assignments
User.assignedVATQuarters      -> VATQuarter[]
User.assignedLtdWorkflows     -> LtdAccountsWorkflow[]

// One user can perform multiple actions
User.activityLogs             -> ActivityLog[]
User.sentCommunications       -> Communication[]
User.triggeredEmailLogs       -> EmailLog[]
```

### Workflow Relationships
```typescript
// VAT Quarter relationships
VATQuarter.client            -> Client
VATQuarter.assignedUser      -> User
VATQuarter.workflowHistory   -> VATWorkflowHistory[]

// Ltd Accounts Workflow relationships
LtdAccountsWorkflow.client           -> Client
LtdAccountsWorkflow.assignedUser     -> User
LtdAccountsWorkflow.workflowHistory  -> LtdAccountsWorkflowHistory[]
```

---

## 📈 Database Indexes

### Performance Indexes

#### Client Table Indexes
```sql
-- Primary and unique indexes
CREATE UNIQUE INDEX idx_clients_client_code ON clients(client_code);
CREATE UNIQUE INDEX idx_clients_company_number ON clients(company_number);

-- Search and filtering indexes
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_company_type ON clients(company_type);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_clients_company_status ON clients(company_status);

-- Assignment indexes
CREATE INDEX idx_clients_assigned_user_id ON clients(assigned_user_id);
CREATE INDEX idx_clients_ltd_assigned_user_id ON clients(ltd_company_assigned_user_id);
CREATE INDEX idx_clients_vat_assigned_user_id ON clients(vat_assigned_user_id);

-- Date indexes for deadline queries
CREATE INDEX idx_clients_next_accounts_due ON clients(next_accounts_due);
CREATE INDEX idx_clients_next_confirmation_due ON clients(next_confirmation_due);
CREATE INDEX idx_clients_next_corporation_tax_due ON clients(next_corporation_tax_due);

-- Corporation Tax tracking
CREATE INDEX idx_clients_ct_status ON clients(corporation_tax_status);
CREATE INDEX idx_clients_ct_period_end ON clients(corporation_tax_period_end);

-- Chase team (GIN index for array operations)
CREATE INDEX idx_clients_chase_team_user_ids ON clients USING GIN(chase_team_user_ids);
```

#### User Table Indexes
```sql
-- Authentication and lookup
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- OTP indexes
CREATE INDEX idx_users_otp_code ON users(otp_code);
CREATE INDEX idx_users_otp_expires_at ON users(otp_expires_at);
```

#### VAT Quarter Indexes
```sql
-- Workflow queries
CREATE INDEX idx_vat_quarters_client_id ON vat_quarters(client_id);
CREATE INDEX idx_vat_quarters_assigned_user_id ON vat_quarters(assigned_user_id);
CREATE INDEX idx_vat_quarters_current_stage ON vat_quarters(current_stage);
CREATE INDEX idx_vat_quarters_filing_due_date ON vat_quarters(filing_due_date);
CREATE INDEX idx_vat_quarters_quarter_period ON vat_quarters(quarter_period);

-- Unique constraint for client-quarter combination
CREATE UNIQUE INDEX idx_vat_quarters_client_quarter ON vat_quarters(client_id, quarter_period);
```

#### Activity Log Indexes
```sql
-- Audit trail queries
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);

-- Composite index for user activity
CREATE INDEX idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp DESC);
```

---

## 🔄 Migration Patterns

### Safe Migration Process

#### 1. Schema Changes
```sql
-- Always use transactions for schema changes
BEGIN;

-- Add new column with default value
ALTER TABLE clients 
ADD COLUMN new_field VARCHAR(255) DEFAULT 'default_value';

-- Create index
CREATE INDEX idx_clients_new_field ON clients(new_field);

-- Update existing records if needed
UPDATE clients 
SET new_field = 'updated_value' 
WHERE condition = true;

COMMIT;
```

#### 2. Data Migrations
```typescript
// Use Prisma migrations for complex data transformations
export async function up(prisma: PrismaClient) {
  // Batch process large datasets
  const batchSize = 1000
  let skip = 0
  
  while (true) {
    const clients = await prisma.client.findMany({
      skip,
      take: batchSize,
      where: { needsUpdate: true }
    })
    
    if (clients.length === 0) break
    
    await Promise.all(
      clients.map(client =>
        prisma.client.update({
          where: { id: client.id },
          data: {
            // Transformation logic
            newField: transformData(client.oldField)
          }
        })
      )
    )
    
    skip += batchSize
  }
}
```

#### 3. Rollback Strategy
```sql
-- Always have rollback scripts ready
-- rollback.sql
BEGIN;

-- Remove new column
ALTER TABLE clients DROP COLUMN new_field;

-- Drop new index
DROP INDEX IF EXISTS idx_clients_new_field;

COMMIT;
```

### Database Backup Strategy

#### Before Migrations
```bash
# Create timestamped backup
npm run db:backup

# Verify backup integrity
npm run db:audit

# Run migration
npm run db:migrate-safe

# Verify migration success
npm run db:audit
```

#### Backup Retention
- **Daily backups**: Kept for 30 days
- **Weekly backups**: Kept for 12 weeks
- **Monthly backups**: Kept for 12 months
- **Pre-migration backups**: Kept indefinitely

---

## 🔍 Query Patterns

### Common Query Examples

#### Client Queries
```typescript
// Get clients with assignments
const clientsWithAssignments = await prisma.client.findMany({
  where: { isActive: true },
  include: {
    assignedUser: {
      select: { id: true, name: true, email: true }
    },
    vatAssignedUser: {
      select: { id: true, name: true, email: true }
    }
  },
  orderBy: { companyName: 'asc' }
})

// Get overdue accounts
const overdueAccounts = await prisma.client.findMany({
  where: {
    nextAccountsDue: {
      lt: new Date()
    },
    isActive: true
  },
  include: {
    assignedUser: true
  }
})

// Search clients with filters
const searchResults = await prisma.client.findMany({
  where: {
    AND: [
      { isActive: true },
      {
        OR: [
          { companyName: { contains: searchTerm, mode: 'insensitive' } },
          { companyNumber: { contains: searchTerm, mode: 'insensitive' } },
          { contactEmail: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }
    ]
  }
})
```

#### VAT Quarter Queries
```typescript
// Get VAT quarters by stage
const pendingVATQuarters = await prisma.vATQuarter.findMany({
  where: {
    currentStage: 'PAPERWORK_PENDING_CHASE',
    filingDueDate: {
      gte: new Date(),
      lte: addDays(new Date(), 30)
    }
  },
  include: {
    client: {
      select: { companyName: true, contactEmail: true }
    },
    assignedUser: {
      select: { name: true, email: true }
    }
  }
})

// Get user workload
const userWorkload = await prisma.vATQuarter.groupBy({
  by: ['assignedUserId'],
  where: {
    currentStage: {
      in: ['WORK_IN_PROGRESS', 'QUERIES_PENDING']
    }
  },
  _count: {
    id: true
  }
})
```

#### Activity Log Queries
```typescript
// Get client activity history
const clientActivity = await prisma.activityLog.findMany({
  where: { clientId: clientId },
  include: {
    user: {
      select: { name: true, email: true }
    }
  },
  orderBy: { timestamp: 'desc' },
  take: 50
})

// Get user activity summary
const userActivity = await prisma.activityLog.findMany({
  where: {
    userId: userId,
    timestamp: {
      gte: startOfDay(new Date()),
      lte: endOfDay(new Date())
    }
  },
  orderBy: { timestamp: 'desc' }
})
```

---

This comprehensive data models and schemas documentation provides complete information about the database structure and data handling patterns in the Numericalz Internal Management System. Use this guide alongside the API documentation for full system understanding.