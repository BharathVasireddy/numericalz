# Complete Workflow Documentation - Numericalz Internal Management System

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Client Creation Process](#client-creation-process)
3. [Ltd Company Workflow](#ltd-company-workflow)
4. [VAT Workflow](#vat-workflow)
5. [Dashboard Management](#dashboard-management)
6. [Automation & Notifications](#automation--notifications)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Special Conditions & Business Rules](#special-conditions--business-rules)
10. [User Roles & Permissions](#user-roles--permissions)

---

## 🎯 System Overview

The Numericalz Internal Management System is a comprehensive UK accounting firm management platform that handles:
- **Client Management**: Ltd companies and non-Ltd entities
- **VAT Return Processing**: Quarterly/monthly VAT workflows
- **Ltd Company Accounts**: Annual accounts and corporation tax
- **Deadline Tracking**: Automated deadline management with UK compliance
- **Workflow Management**: Multi-stage approval processes
- **Team Collaboration**: Role-based assignment and notifications

### Key Technologies
- **Frontend**: Next.js 14 (App Router), TypeScript, React, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with OTP verification
- **Email**: Custom email service with notification system
- **External APIs**: Companies House API integration

---

## 🏗️ Client Creation Process

### Entry Points
- **URL**: `/dashboard/clients/add`
- **Component**: `AddClientWizard` (`components/clients/add-client-wizard.tsx`)
- **API Endpoint**: `POST /api/clients`

### Step 1: Company Type Selection
```typescript
// Available company types
const COMPANY_TYPES = {
  'LIMITED_COMPANY': 'Limited Company',
  'SOLE_TRADER': 'Sole Trader',
  'PARTNERSHIP': 'Partnership',
  'LLP': 'Limited Liability Partnership'
}
```

### Step 2A: Limited Company Flow
**Function**: `handleLtdCompanySubmit()` in `add-client-wizard.tsx`

1. **Companies House Search** (Optional)
   - **API**: `GET /api/companies-house/search?q={query}`
   - **Function**: `searchCompanies()` - fetches company data from Companies House API
   - **Auto-population**: Company details, officers, registered address

2. **Company Selection**
   - **Function**: `selectCompany()` - fetches detailed company information
   - **API**: `GET /api/companies-house/company/{companyNumber}`
   - **Data Retrieved**:
     - Company name, number, status
     - Incorporation date
     - Accounting reference date (ARD)
     - Next accounts due date
     - Registered office address
     - SIC codes, officers, PSCs

3. **Manual Entry** (Alternative)
   - Users can manually enter company details if Companies House data unavailable
   - Required fields: Company name, contact details

### Step 2B: Non-Limited Company Flow
**Component**: `NonLtdCompanyForm`

Required fields:
- Client name, contact details
- Nature of trade
- Trading and residential addresses
- VAT number (if applicable)
- UTR number, National Insurance number
- Previous year information

### Step 3: Post-Creation Questionnaire
**Component**: `ClientPostCreationQuestionnaire`
**Function**: `handleQuestionnaireComplete()`

Determines:
- VAT registration status and frequency
- Corporation tax requirements
- Bookkeeping needs
- Annual accounts handling

### Step 4: Chase Team Assignment
**Component**: `ChaseTeamAssignment`
**Function**: `handleChaseTeamComplete()`

- Assigns chase team members (Partners/Managers only)
- Used for "Pending to Chase" workflow automation
- Stored in `Client.chaseTeamUserIds` array

### Step 5: Client Code Generation
**Function**: `generateClientCode()` in `/api/clients/route.ts`

```typescript
// Format: NZ-1, NZ-2, NZ-3, etc.
// Logic: Find last NZ- code, increment by 1
// NEVER change this format without explicit approval
```

### Step 6: Database Creation
**API**: `POST /api/clients/route.ts`
**Function**: `POST()` handler

1. **Validation**: Zod schema validation
2. **Client Record Creation**: Main client record in database
3. **Automatic Assignment**: 
   - New clients assigned to creator by default
   - Partners can override in settings to assign to specific user
4. **Activity Logging**: Client creation logged with full details

---

## 🏢 Ltd Company Workflow

### Overview
Handles annual accounts preparation and filing for UK limited companies.

### Automatic Workflow Creation
**Trigger**: When client has `companyType: 'LIMITED_COMPANY'`
**Function**: Automatic workflow creation based on accounting reference date

### Workflow Stages (LtdAccountsWorkflowStage enum)
```typescript
enum LtdAccountsWorkflowStage {
  PAPERWORK_PENDING_CHASE     // Waiting for client paperwork
  PAPERWORK_CHASED           // Chase initiated
  PAPERWORK_RECEIVED         // Documents received
  WORK_IN_PROGRESS          // Accounts preparation in progress
  DISCUSS_WITH_MANAGER      // Manager discussion required
  REVIEW_BY_PARTNER         // Partner review stage
  REVIEW_DONE_HELLO_SIGN    // Review completed, ready for signatures
  SENT_TO_CLIENT_HELLO_SIGN // Sent to client for approval
  APPROVED_BY_CLIENT        // Client approved accounts
  SUBMISSION_APPROVED_PARTNER // Partner approved for filing
  FILED_CH_HMRC            // Filed with Companies House & HMRC
  CLIENT_SELF_FILING       // Client handles own filing
}
```

### Key Components

#### 1. Ltd Companies Deadlines Table
**Component**: `LtdCompaniesDeadlinesTable` (`components/clients/ltd-companies-deadlines-table.tsx`)
**Page**: `/dashboard/clients/ltd-companies`
**API**: `GET /api/clients/ltd-deadlines`

**Features**:
- Shows all Ltd company clients with deadline information
- Displays current workflow stage and assigned user
- Year-end calculation based on accounting reference date
- Responsive design with fixed table layout (no horizontal scrolling)

#### 2. Year-End Calculation System
**Library**: `lib/year-end-utils.ts`
**Critical Functions**:

```typescript
// MANDATORY: Use Companies House official dates
calculateYearEnd(clientData)           // Calculates year end from ARD
calculateCorporationTaxDue(clientData) // CT due date (year end + 12 months)
formatYearEnd(clientData)             // Formatted display
getYearEndForTable(clientData)        // Table display format
getYearEndForForm(clientData)         // Form display format

// NEVER calculate accounts due dates - always use Companies House data
nextAccountsDue: companyData.accounts?.next_due
```

#### 3. Workflow Management
**API Endpoint**: `PUT /api/clients/ltd-deadlines/[id]/workflow`
**Component**: Ltd workflow modal (embedded in deadlines table)

**Milestone Tracking**:
- Each stage change automatically sets milestone dates
- User attribution for each milestone
- Days calculation between stages
- Complete audit trail

### Automatic Status Updates
**Location**: `/api/clients/ltd-deadlines/route.ts`

1. **Year-End Detection**: Automatically detects when year-end has passed
2. **Status Progression**: Updates from "waiting" to "pending chase"
3. **Assignment Logic**: Maintains assigned user through workflow

### Business Rules

#### Year-End Calculation Rules
1. **Established Companies**: Use `lastAccountsMadeUpTo + 1 year`
2. **First-Time Filers**: Calculate from incorporation date with 6-18 month rule
3. **Fallback**: Use `nextAccountsDue - 9 months` (accounts due 9 months after year-end)

#### Assignment Priority
1. **Workflow Assignee**: `ltdAccountsWorkflow.assignedUser`
2. **Ltd Company Assignee**: `client.ltdCompanyAssignedUser`
3. **General Assignee**: `client.assignedUser`
4. **Unassigned**: Show as "Unassigned"

---

## 💰 VAT Workflow

### Overview
Handles VAT return preparation and filing for UK VAT-registered businesses.

### VAT Quarter Groups
```typescript
const VAT_QUARTER_GROUPS = {
  '1_4_7_10': 'Jan/Apr/Jul/Oct',    // Files in Feb, May, Aug, Nov
  '2_5_8_11': 'Feb/May/Aug/Nov',    // Files in Mar, Jun, Sep, Dec
  '3_6_9_12': 'Mar/Jun/Sep/Dec'     // Files in Apr, Jul, Oct, Jan
}
```

### VAT Workflow Stages
```typescript
enum VATWorkflowStage {
  WAITING_FOR_QUARTER_END    // Future quarters waiting for quarter to end
  PAPERWORK_PENDING_CHASE    // Ready for chase after quarter end
  PAPERWORK_CHASED          // Chase initiated
  PAPERWORK_RECEIVED        // Documents received
  WORK_IN_PROGRESS         // VAT return preparation
  QUERIES_PENDING          // Queries with client
  REVIEW_PENDING_MANAGER   // Manager review
  REVIEW_PENDING_PARTNER   // Partner review
  EMAILED_TO_PARTNER       // Sent to partner
  EMAILED_TO_CLIENT        // Sent to client for approval
  CLIENT_APPROVED          // Client approved return
  FILED_TO_HMRC           // Filed with HMRC
  CLIENT_BOOKKEEPING      // Client handles own VAT (auto-completes)
}
```

### Key Components

#### 1. VAT Deadlines Table
**Component**: `VATDeadlinesTable` (`components/clients/vat-deadlines-table.tsx`)
**Page**: `/dashboard/clients/vat-dt`
**API**: `GET /api/clients/vat-clients`

**Features**:
- Monthly tabs showing different filing months
- Month-specific quarter calculations
- Real-time status updates
- Expandable workflow timelines
- Compact display with optimized column widths

#### 2. VAT Quarter Calculation
**Library**: `lib/vat-workflow.ts`
**Critical Functions**:

```typescript
calculateVATQuarter(quarterGroup, referenceDate)  // Calculate quarter info
getNextVATQuarter(quarterGroup, currentQuarter)   // Next quarter calculation
isVATQuarterOverdue(filingDueDate)               // Overdue check
getDaysUntilVATDeadline(filingDueDate)           // Days until deadline
```

**Quarter Calculation Logic**:
- Quarters are 3-month periods ending in specific months
- Filing deadline is last day of month following quarter end
- Example: June 30 quarter end → July 31 filing deadline

#### 3. VAT Workflow Modal
**Component**: `VATWorkflowModal` (`components/clients/vat-workflow-modal.tsx`)

**Features**:
- Complete workflow stage management
- User assignment with dropdown
- Milestone date tracking
- Workflow history timeline
- Comments and notes system
- Filing confirmation dialogs

### Automatic Quarter Management

#### Quarter Creation Logic
**Location**: `/api/clients/vat-clients/route.ts`

```typescript
// Logic for automatic quarter creation:
1. Check if current month is filing month for client's quarter group
2. If yes: Create quarter that FILED in this month (quarter ends previous month)
3. If no: Create current quarter
4. Future quarters default to "WAITING_FOR_QUARTER_END"
5. Past quarters (quarter ended) automatically update to "PAPERWORK_PENDING_CHASE"
```

#### Automatic Status Updates
**Trigger**: Daily check in VAT clients API
**Logic**:
```typescript
// Find quarters that should be updated to pending chase
const quartersToUpdate = client.vatQuartersWorkflow?.filter(q => {
  if (q.isCompleted || q.currentStage !== 'WAITING_FOR_QUARTER_END') return false
  
  const quarterEndDate = new Date(q.quarterEndDate)
  quarterEndDate.setHours(23, 59, 59, 999) // End of quarter end day
  
  // Check if we're past the quarter end date (next day or later)
  return londonNow > quarterEndDate
})
```

### Assignment Rules

#### VAT-Specific Assignment Priority
1. **Quarter Assignee**: `vatQuarter.assignedUser` (no fallback)
2. **Unassigned**: Show as "Unassigned" if no quarter assignee
3. **No Fallback**: Does NOT fall back to `client.vatAssignedUser` or `client.assignedUser`

This ensures clean assignment workflow where:
- Future quarters start unassigned
- Partners/managers see unassigned quarters in dashboard widget
- Assignment happens when quarter becomes active

### Special VAT Features

#### Client Bookkeeping Auto-Completion
**Trigger**: When stage set to `CLIENT_BOOKKEEPING`
**Behavior**:
- Automatically marks workflow as completed
- Sets `filedToHMRCDate` milestone
- Shows simplified timeline: "Client Filed to HMRC"
- Updates timeline header to "Client Self-Filing Status"

#### Month-Specific Workflows
**Feature**: Each month tab shows different quarters
**Implementation**: 
- `getQuarterForMonth()` function calculates appropriate quarter for each month
- Prevents showing same data across all months
- Historical workflow access per month

---

## 📊 Dashboard Management

### Partner Dashboard
**Component**: `PartnerDashboard` (`components/dashboard/partner-dashboard.tsx`)
**Page**: `/dashboard/partner`

**Widgets**:
1. **Client Overview**: Total clients breakdown by type
2. **Staff Workload**: Each staff member's client count with role badges
3. **Monthly Deadlines**: Current month's deadlines by type
4. **Pending to Chase**: Clients ready for paperwork chase
5. **VAT Unassigned**: Unassigned VAT quarters for current month

### Manager Dashboard
**Component**: `ManagerDashboard` (`components/dashboard/manager-dashboard.tsx`)
**Page**: `/dashboard/manager`

**Layout**: Similar to partner dashboard with manager-specific data
**Additional Features**: Team management focus

### Staff Dashboard
**Component**: `StaffDashboard` (`components/dashboard/staff-dashboard.tsx`)
**Page**: `/dashboard/staff`

**Features**: 
- Personal workload view
- Assigned client focus
- Deadline tracking for assigned work

### Dashboard Widgets

#### 1. Pending to Chase Widget
**Component**: `PendingToChaseWidget` (`components/dashboard/widgets/pending-to-chase-widget.tsx`)
**API**: `GET /api/dashboard/pending-to-chase`

**Logic**:
- Shows clients in "PAPERWORK_PENDING_CHASE" status
- For VAT: Shows quarters where quarter has ended
- For Ltd: Shows clients where year-end has passed
- Priority calculation based on days overdue
- Quick "Start Chase" action button

#### 2. VAT Unassigned Widget
**Component**: `VATUnassignedWidget` (`components/dashboard/widgets/vat-unassigned-widget.tsx`)
**API**: `GET /api/dashboard/vat-unassigned`

**Logic**:
- Shows VAT quarters with no assigned user
- Filters for current filing month
- Only shows quarters where quarter has ended
- Quick assignment functionality

---

## 🔔 Automation & Notifications

### Workflow Notification System
**Service**: `lib/workflow-notifications.ts`
**Function**: `sendStageChangeNotifications()`

#### Notification Recipients
```typescript
// Always notified:
- All managers and partners (workflow oversight)

// Conditionally notified:
- Assigned user (if different from person making change)
- Chase team members (for chase-related stages)
- Workflow-specific assignee (if different from client assignee)
```

#### Email Templates
**Service**: `lib/email-service.ts`
**Features**:
- Stage-specific email content
- Client and workflow context
- Action links to relevant pages
- Professional formatting with company branding

### Automatic Status Updates

#### VAT Quarter Status Updates
**Location**: `/api/clients/vat-clients/route.ts`
**Trigger**: Every API call to VAT clients endpoint
**Logic**:
```typescript
// Update quarters from "WAITING_FOR_QUARTER_END" to "PAPERWORK_PENDING_CHASE"
// when quarter end date has passed
```

#### Ltd Company Status Updates
**Location**: `/api/clients/ltd-deadlines/route.ts`
**Trigger**: Every API call to Ltd deadlines endpoint
**Logic**: Updates based on year-end dates and accounting reference dates

### Activity Logging
**Service**: `lib/activity-logger.ts`
**Features**:
- Complete audit trail for all client changes
- User attribution and timestamps
- Automated system activity logging
- Integration with workflow changes

---

## 🔌 API Endpoints

### Client Management
```typescript
GET    /api/clients                    // List all clients with filtering
POST   /api/clients                    // Create new client
GET    /api/clients/[id]              // Get client details
PUT    /api/clients/[id]              // Update client
DELETE /api/clients/[id]              // Delete client (soft delete)

// Client assignment
PUT    /api/clients/[id]/assign       // Assign user to client
PUT    /api/clients/[id]/assign-accounts // Assign accounts work
PUT    /api/clients/[id]/assign-vat   // Assign VAT work

// Bulk operations
POST   /api/clients/bulk-assign       // Bulk user assignment
POST   /api/clients/bulk-resign       // Bulk resignation
POST   /api/clients/export           // Export client data
```

### VAT Workflow
```typescript
GET    /api/clients/vat-clients       // Get VAT-enabled clients with quarters
POST   /api/clients/[id]/vat-quarters // Create VAT quarter
PUT    /api/vat-quarters/[id]/workflow // Update VAT workflow stage
POST   /api/vat-quarters/bulk        // Bulk VAT operations
```

### Ltd Company Workflow
```typescript
GET    /api/clients/ltd-deadlines     // Get Ltd company deadlines
PUT    /api/clients/ltd-deadlines/[id]/workflow // Update Ltd workflow
POST   /api/clients/ltd-deadlines/[id]/filed    // Mark as filed
```

### Dashboard APIs
```typescript
GET    /api/dashboard/partner/[userId]     // Partner dashboard data
GET    /api/dashboard/manager/[userId]     // Manager dashboard data
GET    /api/dashboard/staff/[userId]       // Staff dashboard data
GET    /api/dashboard/pending-to-chase    // Pending chase clients
GET    /api/dashboard/vat-unassigned      // Unassigned VAT quarters
```

### Companies House Integration
```typescript
GET    /api/companies-house/search         // Search companies
GET    /api/companies-house/company/[number] // Get company details
```

### User Management
```typescript
GET    /api/users                     // List users
POST   /api/users                     // Create user
GET    /api/users/[id]               // Get user details
PUT    /api/users/[id]               // Update user
PUT    /api/users/[id]/reset-password // Reset password
```

---

## 🗄️ Database Schema

### Core Models

#### Client Model
```prisma
model Client {
  id                              String                @id @default(cuid())
  clientCode                      String                @unique
  companyName                     String
  companyNumber                   String?               @unique
  companyType                     String?
  
  // Contact information
  contactName                     String
  contactEmail                    String
  contactPhone                    String?
  
  // Companies House data
  incorporationDate               DateTime?
  accountingReferenceDate         String?               // JSON format
  nextAccountsDue                 DateTime?
  lastAccountsMadeUpTo            DateTime?
  nextConfirmationDue             DateTime?
  
  // VAT information
  isVatEnabled                    Boolean               @default(false)
  vatQuarterGroup                 String?
  vatReturnsFrequency             String?
  nextVatReturnDue                DateTime?
  
  // Assignment relationships
  assignedUserId                  String?
  ltdCompanyAssignedUserId        String?
  vatAssignedUserId               String?
  chaseTeamUserIds                String[]              @default([])
  
  // Relationships
  assignedUser                    User?                 @relation("ClientAssignedUser")
  ltdCompanyAssignedUser          User?                 @relation("ClientLtdAssignedUser")
  vatAssignedUser                 User?                 @relation("ClientVATAssignedUser")
  vatQuartersWorkflow             VATQuarter[]
  ltdAccountsWorkflows            LtdAccountsWorkflow[]
}
```

#### VAT Quarter Model
```prisma
model VATQuarter {
  id                          String               @id @default(cuid())
  clientId                    String
  quarterPeriod               String               // "2024-04-01_to_2024-06-30"
  quarterStartDate            DateTime
  quarterEndDate              DateTime
  filingDueDate               DateTime
  quarterGroup                String               // "3_6_9_12"
  currentStage                VATWorkflowStage     @default(PAPERWORK_PENDING_CHASE)
  isCompleted                 Boolean              @default(false)
  assignedUserId              String?
  
  // Milestone dates with user attribution
  chaseStartedDate            DateTime?
  chaseStartedByUserName      String?
  paperworkReceivedDate       DateTime?
  paperworkReceivedByUserName String?
  workStartedDate             DateTime?
  workStartedByUserName       String?
  workFinishedDate            DateTime?
  workFinishedByUserName      String?
  sentToClientDate            DateTime?
  sentToClientByUserName      String?
  clientApprovedDate          DateTime?
  clientApprovedByUserName    String?
  filedToHMRCDate             DateTime?
  filedToHMRCByUserName       String?
  
  // Relationships
  client                      Client               @relation(fields: [clientId], references: [id])
  assignedUser                User?                @relation(fields: [assignedUserId], references: [id])
  workflowHistory             VATWorkflowHistory[]
}
```

#### Ltd Accounts Workflow Model
```prisma
model LtdAccountsWorkflow {
  id                          String                       @id @default(cuid())
  clientId                    String
  filingPeriodStart           DateTime
  filingPeriodEnd             DateTime
  accountsDueDate             DateTime
  ctDueDate                   DateTime                     // Corporation tax due
  csDueDate                   DateTime                     // Confirmation statement due
  currentStage                LtdAccountsWorkflowStage     @default(PAPERWORK_PENDING_CHASE)
  assignedUserId              String?
  isCompleted                 Boolean                      @default(false)
  
  // Milestone dates with user attribution (similar to VAT)
  chaseStartedDate            DateTime?
  chaseStartedByUserName      String?
  paperworkReceivedDate       DateTime?
  paperworkReceivedByUserName String?
  // ... (all milestone fields)
  
  // Relationships
  client                      Client                       @relation(fields: [clientId], references: [id])
  assignedUser                User?                        @relation(fields: [assignedUserId], references: [id])
  workflowHistory             LtdAccountsWorkflowHistory[]
}
```

### Workflow History Models
```prisma
model VATWorkflowHistory {
  id                  String            @id @default(cuid())
  vatQuarterId        String
  fromStage           VATWorkflowStage?
  toStage             VATWorkflowStage
  stageChangedAt      DateTime
  daysInPreviousStage Int?
  userId              String?
  userName            String
  userEmail           String
  userRole            String
  notes               String?
  
  vatQuarter          VATQuarter        @relation(fields: [vatQuarterId], references: [id])
  user                User?             @relation(fields: [userId], references: [id])
}
```

---

## ⚙️ Special Conditions & Business Rules

### VAT Quarter Management Rules

#### 1. Future Quarter Assignment
- **Rule**: Future quarters (WAITING_FOR_QUARTER_END) are ALWAYS unassigned
- **No Fallback**: Does not inherit from client.vatAssignedUser or client.assignedUser
- **Purpose**: Ensures clean assignment workflow via dashboard widgets

#### 2. Quarter End Detection
- **Trigger**: Day after quarter end date
- **Action**: Automatically update from "WAITING_FOR_QUARTER_END" to "PAPERWORK_PENDING_CHASE"
- **Timezone**: All calculations use London timezone (Europe/London)

#### 3. Filing Month Logic
- **Rule**: VAT quarters appear in filing month tabs, not quarter end month
- **Example**: June quarter end → appears in July tab (filing month)
- **Calculation**: Filing month = quarter end month + 1

### Ltd Company Rules

#### 1. Year-End Calculation Priority
```typescript
// Priority order for year-end calculation:
1. lastAccountsMadeUpTo + 1 year (established companies)
2. Incorporation date + accounting reference date (first-time filers)
3. nextAccountsDue - 9 months (fallback)
```

#### 2. Accounts Due Date Usage
- **CRITICAL**: ALWAYS use Companies House `accounts.next_due` directly
- **NEVER**: Calculate accounts due dates ourselves
- **Reason**: Companies House provides official HMRC compliance dates

#### 3. Corporation Tax Calculation
- **Rule**: CT due date = year end + 12 months
- **Source**: Not provided by Companies House, calculated internally
- **Function**: `calculateCorporationTaxDue()` in `lib/year-end-utils.ts`

### Client Code Generation Rules
- **Format**: NZ-1, NZ-2, NZ-3, etc. (sequential numbering)
- **Logic**: Find last NZ- code, increment by 1
- **NEVER**: Change this format without explicit approval
- **Function**: `generateClientCode()` in `/api/clients/route.ts`

### Contact Management Rules
- **Email Icons**: Must open `mailto:` links
- **Phone Icons**: Must open `tel:` links
- **Icon Sizing**: h-3 w-3 for contact icons, h-4 w-4 for action icons
- **Responsive**: Icons must work on all device sizes

### Layout System Rules
- **No Horizontal Scrolling**: Content must fit viewport on all devices
- **Fixed Table Layout**: Use `table-fixed` for consistent columns
- **Standardized Classes**: Use layout system classes consistently
- **Column Widths**: Specific widths for each column type

---

## 👥 User Roles & Permissions

### Role Hierarchy
```typescript
enum UserRole {
  STAFF    = "STAFF"     // Basic user, limited access
  MANAGER  = "MANAGER"   // Team oversight, full client access
  PARTNER  = "PARTNER"   // Full system access, user management
}
```

### Permission Matrix

#### STAFF Permissions
- **Clients**: Can view and edit assigned clients only
- **Workflows**: Can update stages for assigned work
- **Dashboard**: Personal workload view
- **Reports**: Limited to own assignments
- **Users**: Cannot manage other users

#### MANAGER Permissions
- **Clients**: Full access to all clients
- **Workflows**: Can manage all workflows
- **Dashboard**: Team overview with widgets
- **Assignment**: Can assign work to staff
- **Reports**: Full reporting access
- **Users**: Can manage staff users
- **Chase Team**: Can be assigned to chase teams

#### PARTNER Permissions
- **Full System Access**: All features available
- **User Management**: Can create/edit all user types
- **Settings**: System configuration access
- **Chase Team**: Can be assigned to chase teams
- **Override Settings**: Can set default assignment preferences

### Access Control Implementation
```typescript
// API route protection example
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Role-based filtering
  let whereClause: any = { isActive: true }
  
  if (session.user.role === 'STAFF') {
    whereClause.OR = [
      { assignedUserId: session.user.id },
      { vatAssignedUserId: session.user.id },
      { ltdCompanyAssignedUserId: session.user.id }
    ]
  }
  // Managers and Partners see all clients
}
```

### Dashboard Widget Visibility
- **Pending to Chase**: Managers and Partners only
- **VAT Unassigned**: Managers and Partners only
- **Staff Workload**: Partners only
- **Client Overview**: All roles (filtered by access)

---

## 🔧 Technical Implementation Notes

### Performance Optimizations
- **Database Indexing**: Strategic indexes on frequently queried fields
- **Query Optimization**: Selective field retrieval with Prisma
- **Caching**: Minimal caching due to real-time requirements
- **Pagination**: Implemented for large client lists

### Error Handling
- **API Responses**: Consistent error format across all endpoints
- **User Feedback**: Toast notifications for all user actions
- **Logging**: Comprehensive error logging with context
- **Graceful Degradation**: System continues functioning if external APIs fail

### Security Measures
- **Authentication**: NextAuth.js with OTP verification
- **Authorization**: Role-based access control
- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **Session Management**: Secure session handling with JWT

### Timezone Handling
- **VAT Calculations**: All dates calculated in London timezone
- **Display**: Consistent timezone display across application
- **Database Storage**: UTC storage with timezone conversion
- **Companies House**: Handles UK business timezone requirements

---

## 📝 Development Guidelines

### Code Standards
- **TypeScript**: Strict typing throughout application
- **Component Structure**: Consistent prop interfaces and error handling
- **API Design**: RESTful endpoints with consistent response format
- **Database**: Proper relationships and constraints

### Testing Requirements
- **Unit Tests**: Critical business logic functions
- **Integration Tests**: API endpoint testing
- **Component Tests**: UI component functionality
- **End-to-End**: Complete workflow testing

### Documentation Requirements
- **Code Comments**: Business logic explanation
- **API Documentation**: Endpoint specifications
- **Component Documentation**: Props and usage examples
- **Database Documentation**: Schema relationships

---

## 🚨 Critical System Rules

### Database Safety
- **NEVER**: Use destructive Prisma commands without backup
- **ALWAYS**: Use safe migration scripts for schema changes
- **BACKUP**: Required before any database operation
- **AUDIT**: Verify integrity after changes

### Business Logic Preservation
- **Client Codes**: Never change NZ-X format
- **Date Calculations**: Always use centralized utility functions
- **Companies House Data**: Use official dates, never calculate accounts due dates
- **Assignment Logic**: Preserve existing assignment relationships

### UI/UX Consistency
- **Layout System**: Use standardized layout components
- **Responsive Design**: No horizontal scrolling allowed
- **Contact Icons**: Maintain email/phone functionality
- **Icon Sizing**: Consistent sizing across components

This documentation provides a complete understanding of the Numericalz system from client creation through filing completion for both Ltd companies and VAT workflows. All functions, APIs, components, and business rules are documented for comprehensive system understanding. 