# 📊 VAT System Documentation - Numericalz Internal Management System

## 🎯 System Overview

The VAT (Value Added Tax) system is a comprehensive workflow management solution designed for UK accounting compliance. It handles quarterly VAT return processing from client bookkeeping through HMRC filing, with complete milestone tracking, automated deadline management, and real-time analytics.

### Core Features
- **Automated Quarter Calculation** - Smart quarter generation based on UK filing schedules
- **Milestone Tracking** - Complete workflow progression with user attribution  
- **Real-time Analytics** - Performance insights and deadline monitoring
- **Role-based Access** - Staff/Manager/Partner permissions
- **London Timezone Compliance** - All dates calculated in Europe/London timezone
- **Automated Workflow** - Smart stage progression and completion detection

---

## 🏗️ System Architecture

### Database Models

#### VATQuarter Model
```typescript
interface VATQuarter {
  id: string
  clientId: string
  
  // Quarter Identification
  quarterPeriod: string        // "2024-01-01_to_2024-03-31"
  quarterStartDate: DateTime   // Quarter start
  quarterEndDate: DateTime     // Quarter end (last day)  
  filingDueDate: DateTime      // HMRC filing deadline
  quarterGroup: string         // "1_4_7_10" | "2_5_8_11" | "3_6_9_12"
  
  // Workflow Status
  currentStage: VATWorkflowStage
  isCompleted: boolean
  assignedUserId?: string
  
  // Milestone Dates (with user attribution)
  chaseStartedDate?: DateTime
  chaseStartedByUserName?: string
  paperworkReceivedDate?: DateTime
  paperworkReceivedByUserName?: string
  workStartedDate?: DateTime
  workStartedByUserName?: string
  workFinishedDate?: DateTime
  workFinishedByUserName?: string
  sentToClientDate?: DateTime
  sentToClientByUserName?: string
  clientApprovedDate?: DateTime
  clientApprovedByUserName?: string
  filedToHMRCDate?: DateTime
  filedToHMRCByUserName?: string
}
```

#### VATWorkflowHistory Model
```typescript
interface VATWorkflowHistory {
  id: string
  vatQuarterId: string
  
  // Stage Transition
  fromStage?: VATWorkflowStage
  toStage: VATWorkflowStage
  stageChangedAt: DateTime
  daysInPreviousStage?: number
  
  // User Information (preserved even if user deleted)
  userId?: string
  userName: string
  userEmail: string
  userRole: string
  notes?: string
}
```

#### VAT Workflow Stages
```typescript
enum VATWorkflowStage {
  CLIENT_BOOKKEEPING = "Client to do bookkeeping"
  WORK_IN_PROGRESS = "Work in progress"
  QUERIES_PENDING = "Queries pending"
  REVIEW_PENDING_MANAGER = "Review pending by manager"
  REVIEW_PENDING_PARTNER = "Review pending by partner"
  EMAILED_TO_PARTNER = "Emailed to partner"
  EMAILED_TO_CLIENT = "Emailed to client"
  CLIENT_APPROVED = "Client approved"
  FILED_TO_HMRC = "Filed to HMRC"
}
```

---

## 🔧 Core Functions & Logic

### Quarter Calculation System

#### VAT Quarter Groups
```typescript
const VAT_QUARTER_GROUPS = {
  '1_4_7_10': 'Jan/Apr/Jul/Oct',  // Files in Feb/May/Aug/Nov
  '2_5_8_11': 'Feb/May/Aug/Nov',  // Files in Mar/Jun/Sep/Dec
  '3_6_9_12': 'Mar/Jun/Sep/Dec'   // Files in Apr/Jul/Oct/Jan
}
```

#### Filing Deadline Logic
**CRITICAL UK COMPLIANCE RULE**: VAT filing deadline is ALWAYS the last day of the month following quarter end.

```typescript
// Example: Quarter ends June 30 → Filing due July 31
const filingDue = new Date(quarterEndYear, quarterEndMonth + 1, 0) // Day 0 = last day of month
```

#### Quarter Calculation Function
```typescript
function calculateVATQuarter(quarterGroup: string, referenceDate: Date): VATQuarterInfo {
  // Uses Europe/London timezone for UK compliance
  // Calculates quarter based on filing months, not current date
  // Returns: quarterPeriod, quarterStartDate, quarterEndDate, filingDueDate
}
```

### Milestone Tracking System

#### Stage-to-Milestone Mapping
```typescript
const STAGE_TO_MILESTONE_MAP = {
  'CLIENT_BOOKKEEPING': 'filedToHMRCDate',     // Auto-complete for client self-filing
  'WORK_IN_PROGRESS': 'workStartedDate',       // Work begins
  'QUERIES_PENDING': 'workStartedDate',        // Still in progress
  'REVIEW_PENDING_MANAGER': 'workStartedDate', // Still in progress
  'REVIEW_PENDING_PARTNER': 'workFinishedDate', // Work completed
  'EMAILED_TO_PARTNER': 'workFinishedDate',    // Work completed
  'EMAILED_TO_CLIENT': 'sentToClientDate',     // Sent to client
  'CLIENT_APPROVED': 'clientApprovedDate',     // Client approved
  'FILED_TO_HMRC': 'filedToHMRCDate'          // Filed to HMRC
}
```

---

## 🛠️ API Endpoints

### Core VAT Management APIs

#### 1. Get VAT Clients
```http
GET /api/clients/vat-clients
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "clients": [
    {
      "id": "client-uuid",
      "clientCode": "NZ-123",
      "companyName": "Example Ltd",
      "vatQuarterGroup": "2_5_8_11",
      "assignedUser": { "id": "user-uuid", "name": "John Doe" },
      "vatAssignedUser": { "id": "vat-user-uuid", "name": "Jane Smith" },
      "currentVATQuarter": {
        "id": "quarter-uuid",
        "quarterPeriod": "2024-02-01_to_2024-04-30",
        "quarterEndDate": "2024-04-30T23:59:59.000Z",
        "filingDueDate": "2024-05-31T23:59:59.000Z",
        "currentStage": "WORK_IN_PROGRESS",
        "isCompleted": false,
        "assignedUser": { "id": "user-uuid", "name": "John Doe" },
        "workStartedDate": "2024-05-01T09:00:00.000Z",
        "workStartedByUserName": "John Doe"
      },
      "vatQuartersWorkflow": [/* All quarters for month-specific workflows */]
    }
  ]
}
```

#### 2. Update VAT Workflow
```http
PUT /api/vat-quarters/{quarterId}/workflow
Content-Type: application/json

{
  "stage": "WORK_IN_PROGRESS",
  "assignedUserId": "user-uuid",
  "comments": "Started processing VAT return"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vatQuarter": {/* Updated quarter data */},
    "workflowHistory": {/* New history entry */},
    "milestonesUpdated": ["workStartedDate"]
  },
  "message": "Workflow stage updated to: Work in progress"
}
```

#### 3. Get Client VAT Quarters
```http
GET /api/clients/{clientId}/vat-quarters
```

**Response:**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "client-uuid",
      "companyName": "Example Ltd",
      "isVatEnabled": true,
      "vatQuarterGroup": "2_5_8_11"
    },
    "vatQuarters": [
      {
        "id": "quarter-uuid",
        "quarterPeriod": "2024-02-01_to_2024-04-30",
        "currentStage": "FILED_TO_HMRC",
        "isCompleted": true,
        "workflowHistory": [/* Complete history */]
      }
    ]
  }
}
```

#### 4. Create VAT Quarter
```http
POST /api/clients/{clientId}/vat-quarters
Content-Type: application/json

{
  "referenceDate": "2024-03-15"  // Optional - defaults to current date
}
```

#### 5. VAT Analytics
```http
GET /api/vat-quarters/analytics?period=current_quarter
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "overview": {
      "totalClients": 150,
      "activeWorkflows": 45,
      "completedThisMonth": 23,
      "overdueReturns": 3,
      "averageCompletionTime": 12,
      "workflowEfficiency": 87
    },
    "stageBreakdown": [
      {
        "stage": "WORK_IN_PROGRESS",
        "count": 15,
        "percentage": 33,
        "averageDaysInStage": 4
      }
    ],
    "userPerformance": [
      {
        "userId": "user-uuid",
        "userName": "John Doe",
        "assignedCount": 20,
        "completedCount": 18,
        "averageCompletionTime": 10,
        "efficiency": 90
      }
    ]
  }
}
```

---

## 🖥️ Frontend Components

### 1. VAT Deadlines Table (`vat-deadlines-table.tsx`)

**Purpose**: Main dashboard for VAT deadline tracking and workflow management

**Key Features**:
- Month-based tabs (showing quarters that file in each month)
- Sortable columns (Client Code, Company Name, Quarter End, Filing Month, Due, Status, Assigned To)
- Real-time status updates with color-coded badges
- Expandable rows showing workflow timeline
- Quick assignment and bulk operations
- Contact management (email/phone icons)

**Core Functions**:
```typescript
// Fetch VAT clients with current quarters
const fetchVATClients = async (forceRefresh = false)

// Handle workflow updates
const handleSubmitUpdate = async (clientId, stage, assignee, comments)

// Quick user assignment
const handleQuickAssign = async (clientId, userId)
```

### 2. VAT Workflow Modal (`vat-workflow-modal.tsx`)

**Purpose**: Detailed workflow management interface

**Key Features**:
- Complete workflow stage selection
- User assignment management
- Milestone date tracking with user attribution
- Duration analysis and progress tracking
- Workflow history timeline
- Comments and notes system

**Core Functions**:
```typescript
// Update workflow stage
const handleUpdateWorkflow = async ()

// Calculate progress metrics
const getVATWorkflowProgressSummary(vatQuarter)
```

### 3. VAT Analytics Dashboard (`vat-analytics-dashboard.tsx`)

**Purpose**: Comprehensive performance analytics and insights

**Key Features**:
- Overview metrics (total clients, active workflows, completion rates)
- Stage breakdown analysis
- Team performance metrics
- Time trend analysis
- Client distribution insights
- Real-time refresh capabilities

### 4. VAT Filing History (`vat-filing-history.tsx`)

**Purpose**: Historical VAT quarter tracking per client

**Key Features**:
- Year-based organization
- Quarter completion status
- Milestone tracking
- Workflow history per quarter
- Performance analytics per quarter

---

## 📊 Business Logic

### Assignment Priority System

The VAT system uses a smart assignment priority:

1. **Active Workflow Assignee** (highest priority)
   - `client.currentVATQuarter?.assignedUser`
   - Person currently working on the VAT return

2. **VAT-Specific Assignee** (fallback)
   - `client.vatAssignedUser` 
   - Dedicated VAT specialist for the client

3. **General Client Assignee** (final fallback)
   - `client.assignedUser`
   - General account manager

### Automatic Quarter Creation

The system automatically creates VAT quarters based on filing schedules:

```typescript
// Logic: Show quarters that file in current month, not current quarter
const currentMonth = new Date().getMonth() + 1

// Check if current month is a filing month for client's quarter group
if (filingMonths.includes(currentMonth)) {
  // Create quarter that ENDS in previous month (files this month)
  const quarterEndMonth = currentMonth === 1 ? 12 : currentMonth - 1
  targetQuarter = calculateVATQuarter(quarterGroup, quarterEndDate)
} else {
  // Create current quarter
  targetQuarter = calculateVATQuarter(quarterGroup, new Date())
}
```

### Special Workflow Handling

#### CLIENT_BOOKKEEPING Stage
When set to "Client to do bookkeeping":
- Automatically marks workflow as **completed** (`isCompleted = true`)
- Sets `filedToHMRCDate` milestone (client handles own filing)
- Shows simplified timeline: "Client Filed to HMRC"
- Updates timeline header to "Client Self-Filing Status"

#### Milestone Date Setting
Automatic milestone tracking on stage changes:
```typescript
// When stage changes, automatically set corresponding milestone
const milestoneField = STAGE_TO_MILESTONE_MAP[newStage]
updateData[milestoneField] = new Date()
updateData[`${milestoneField.replace('Date', 'ByUserName')}`] = userName
```

---

## 🔍 Analytics & Reporting

### Performance Metrics

#### Completion Time Analysis
```typescript
function calculateTotalFilingDays(vatQuarter) {
  const startDate = vatQuarter.createdAt
  const endDate = vatQuarter.filedToHMRCDate || new Date()
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
}
```

#### Efficiency Calculation
```typescript
const efficiency = (onTimeCompletions / totalCompletions) * 100
// On-time = completed before or on filing due date
```

#### Stage Duration Tracking
```typescript
function calculateStageDurations(vatQuarter, workflowHistory) {
  // Calculate days spent in each workflow stage
  // Based on milestone dates and workflow history
}
```

### Analytics Categories

1. **Overview Metrics**
   - Total VAT clients
   - Active workflows
   - Monthly completions
   - Overdue returns

2. **Stage Analysis**
   - Workflow distribution
   - Average days per stage
   - Bottleneck identification

3. **Team Performance**
   - Individual completion rates
   - Average processing time
   - Efficiency ratings

4. **Time Trends**
   - Quarterly performance
   - Monthly workload
   - Seasonal patterns

5. **Client Insights**
   - Frequency distribution
   - Quarter group analysis

---

## 🛡️ Security & Permissions

### Role-Based Access Control

#### STAFF Role
- Can only see assigned VAT clients
- Can update workflows for assigned clients
- Cannot access analytics

#### MANAGER Role  
- Can see all VAT clients
- Can reassign workflows
- Can access analytics
- Can manage team performance

#### PARTNER Role
- Full system access
- Can access all analytics
- Can override all assignments
- Executive dashboard access

### Data Protection

#### User Data Preservation
Even when users are deleted, VAT workflow history preserves:
- `userName` - Display name
- `userEmail` - Contact information  
- `userRole` - Role at time of action

#### Audit Trail
Complete workflow history maintained:
- All stage changes logged
- User attribution preserved
- Timestamps in London timezone
- Comments and notes preserved

---

## 🚀 Performance Optimizations

### Database Optimizations

#### Indexes
```sql
-- VAT Quarter indexes
CREATE INDEX idx_vat_quarters_client_period ON vat_quarters(clientId, quarterPeriod);
CREATE INDEX idx_vat_quarters_filing_due ON vat_quarters(filingDueDate);
CREATE INDEX idx_vat_quarters_stage ON vat_quarters(currentStage);

-- Workflow History indexes  
CREATE INDEX idx_vat_history_quarter ON vat_workflow_history(vatQuarterId);
CREATE INDEX idx_vat_history_stage_date ON vat_workflow_history(stageChangedAt);
```

#### Query Optimizations
- Selective field loading with Prisma `select`
- Pagination for large datasets
- Efficient joins with `include`
- Caching for analytics data

### Frontend Optimizations

#### Data Management
- React Query for server state
- Optimistic updates for UX
- Debounced search/filters
- Virtual scrolling for large tables

#### Performance Monitoring
- Load time tracking
- API response monitoring
- Error boundary implementation
- Memory leak detection

---

## 🔧 Configuration & Setup

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Timezone (Critical for VAT compliance)
TZ="Europe/London"
```

### Required Dependencies
```json
{
  "@prisma/client": "^5.x.x",
  "next-auth": "^4.x.x", 
  "date-fns": "^2.x.x",
  "date-fns-tz": "^2.x.x"
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Quarter Not Appearing
**Cause**: Quarter group mismatch or missing `isVatEnabled`
**Solution**: Verify client has `vatQuarterGroup` and `isVatEnabled: true`

#### 2. Wrong Filing Dates
**Cause**: Timezone issues or incorrect quarter calculation
**Solution**: Ensure all dates use `Europe/London` timezone

#### 3. Missing Milestone Dates
**Cause**: Stage-to-milestone mapping not triggered
**Solution**: Check `STAGE_TO_MILESTONE_MAP` configuration

#### 4. Performance Issues
**Cause**: Missing database indexes or inefficient queries
**Solution**: Run `npm run db:analyze` and optimize slow queries

### Debug Tools

#### Database Inspection
```bash
npm run db:studio  # Open Prisma Studio
npm run db:audit   # Run database audit
```

#### API Testing  
```bash
# Test VAT clients endpoint
curl -X GET "http://localhost:3000/api/clients/vat-clients" \
  -H "Authorization: Bearer <token>"

# Test workflow update
curl -X PUT "http://localhost:3000/api/vat-quarters/{id}/workflow" \
  -H "Content-Type: application/json" \
  -d '{"stage": "WORK_IN_PROGRESS"}'
```

---

## 📈 Future Enhancements

### Planned Features

1. **Automated Reminders**
   - Email notifications for approaching deadlines
   - SMS alerts for overdue returns
   - Slack integration for team updates

2. **Advanced Analytics**
   - Predictive deadline modeling
   - Client risk assessment
   - Capacity planning tools

3. **Integration Enhancements**
   - HMRC API direct integration
   - Accounting software connectors
   - Document management system

4. **Mobile Optimization**
   - Progressive Web App (PWA)
   - Mobile-first workflow interface
   - Offline capability

### Technical Improvements

1. **Performance**
   - Redis caching layer
   - Database query optimization
   - CDN integration

2. **Monitoring** 
   - Application performance monitoring
   - Error tracking and alerting
   - Usage analytics

3. **Testing**
   - Automated end-to-end testing
   - Load testing for peak periods
   - Regression test suite

---

## 📚 Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [API Documentation](./API_DOCUMENTATION.md)  
- [Design System](./DESIGN_SYSTEM.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)

---

**Last Updated**: January 2025  
**Version**: 2.1.0  
**Maintainer**: Numericalz Development Team 