# Numericalz Page Documentation

## Overview
This document provides comprehensive documentation for each page in the Numericalz Internal Management System, including purpose, functionality, dependencies, and implementation details.

---

## 🏠 Dashboard Pages

### `/dashboard` - Main Dashboard
**File**: `app/dashboard/page.tsx`  
**Type**: Server Component  
**Auth**: Server-side with redirect  

#### Purpose
Central routing hub that redirects users to their role-specific dashboard based on authentication and user role.

#### Functionality
- **Role-based routing**: Automatically redirects to appropriate dashboard
  - `PARTNER` → `/dashboard/partner`
  - `MANAGER` → `/dashboard/manager` 
  - `STAFF` → `/dashboard/staff`
- **Authentication check**: Redirects unauthenticated users to login
- **Fallback**: Defaults to staff dashboard if role is undefined

#### Implementation Details
```typescript
// Clean server-side implementation
const session = await getServerSession(authOptions)
if (!session) redirect('/auth/login')

// Role-based routing
if (session.user.role === 'PARTNER') redirect('/dashboard/partner')
// ... etc
```

#### Dependencies
- `next-auth/next` for server-side session
- `@/lib/auth` for auth configuration

#### Status: ✅ **Well-implemented**
- Clean, simple logic
- Proper server-side auth
- No redundancies identified

---

### `/dashboard/partner` - Partner Dashboard
**File**: `app/dashboard/partner/page.tsx`  
**Type**: Server Component  
**Auth**: Server-side with role checking  

#### Purpose
Executive-level dashboard providing complete system oversight for partner-level users.

#### Functionality
- **Complete system analytics**: Client portfolio, revenue metrics
- **User management overview**: Team performance and assignments
- **Strategic insights**: Business intelligence and reporting
- **Administrative controls**: System-wide management capabilities
- **Data export**: Partner-exclusive export capabilities

#### Key Features
- Client overview with detailed metrics
- Staff workload distribution
- Monthly deadline summaries
- Performance analytics
- System administration tools

#### Implementation Details
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) redirect('/auth/login')

// Role checking (currently has testing mode)
const isPartner = session.user.role === 'PARTNER'
```

#### Components Used
- `PartnerDashboard` - Main dashboard component
- `PageLayout` - Standardized layout wrapper

#### Issues Identified
⚠️ **Testing mode warning** should be removed in production
⚠️ **Role checking** should be in middleware, not component

#### Recommendations
1. Remove testing mode logic for production
2. Implement proper role-based access control in middleware
3. Add proper error boundaries

---

### `/dashboard/manager` - Manager Dashboard
**File**: `app/dashboard/manager/page.tsx`  
**Type**: Server Component  
**Auth**: Server-side with role checking  

#### Purpose
Management-level dashboard with comprehensive analytics and team management features.

#### Functionality
- **Team performance metrics**: Staff productivity and workload
- **Client analytics**: Portfolio overview and status tracking
- **Task management**: Assignment oversight and deadline tracking
- **Workflow monitoring**: Process efficiency and bottlenecks
- **Reporting tools**: Management-level insights

#### Key Features
- Team workload distribution
- Client assignment overview
- Deadline management
- Performance metrics
- Quick action tools

#### Implementation Details
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) redirect('/auth/login')

const hasAccess = ['MANAGER', 'PARTNER'].includes(session.user.role)
```

#### Components Used
- `ManagerDashboard` - Main dashboard component
- `PageLayout` - Standardized layout wrapper

#### Issues Identified
⚠️ **Same issues as partner dashboard**
⚠️ **Role checking logic** inconsistent with other pages

#### Recommendations
1. Same as partner dashboard
2. Standardize role checking across all dashboard pages

---

### `/dashboard/staff` - Staff Dashboard
**File**: `app/dashboard/staff/page.tsx`  
**Type**: Server Component  
**Auth**: Server-side authentication  

#### Purpose
Staff-level dashboard focused on individual productivity and assigned tasks.

#### Functionality
- **Personal workload**: Assigned clients and tasks
- **Deadline tracking**: Personal deadlines and priorities
- **Task management**: Individual task completion and updates
- **Performance overview**: Personal productivity metrics
- **Quick actions**: Common daily tasks

#### Implementation Details
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) redirect('/auth/login')

// Server-side user fetching
const users = await db.user.findMany({
  include: { _count: { select: { assignedClients: true } } },
  orderBy: [{ role: 'asc' }, { name: 'asc' }]
})
```

#### Components Used
- `TeamManagement` - Main component for staff management

#### Status: ✅ **Well-implemented**
- Proper server-side auth
- Clean data fetching
- Good component structure

---

## 📊 Client Management Pages

### `/dashboard/clients` - Main Clients Listing
**File**: `app/dashboard/clients/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Central hub for client management with comprehensive search, filtering, and bulk operations.

#### Functionality
- **Client listing**: Paginated table of all clients
- **Search & filtering**: Multi-criteria client filtering
- **Bulk operations**: Mass assignment, updates, exports
- **Quick actions**: Edit, view, assign clients
- **Companies House integration**: Automatic data sync

#### Key Features
- Advanced search with multiple filters
- Company type filtering (Ltd, Non-Ltd, VAT-enabled)
- User assignment filtering
- Status-based filtering
- Export capabilities
- Bulk assignment tools

#### Implementation Details
```typescript
// State management for filters
const [searchQuery, setSearchQuery] = useState('')
const [filters, setFilters] = useState({
  companyType: '', accountsAssignedUser: '', 
  vatAssignedUser: '', status: ''
})

// User fetching (DUPLICATE LOGIC)
useEffect(() => {
  const fetchUsers = async () => {
    const response = await fetch('/api/users')
    // ... duplicate logic
  }
  fetchUsers()
}, [])
```

#### Components Used
- `ClientsHeader` - Search and filter controls
- `ClientsTable` - Main data table

#### Issues Identified
❌ **Duplicate user fetching** (same logic in 7+ components)
⚠️ **Complex filter state** could be simplified
⚠️ **Advanced filter interfaces** defined but not fully utilized

#### Recommendations
1. **PRIORITY**: Replace user fetching with `useUsers()` hook
2. Create `useClientFilters()` hook for filter state management
3. Simplify or complete advanced filter implementation

---

### `/dashboard/clients/ltd-companies` - Ltd Companies Deadlines
**File**: `app/dashboard/clients/ltd-companies/page.tsx`  
**Type**: Server Component (FIXED)  
**Auth**: Server-side authentication  

#### Purpose
Specialized view for tracking Limited Company filing deadlines and workflow management.

#### Functionality
- **Deadline tracking**: Accounts, CT, and CS due dates
- **Workflow management**: Multi-stage filing process
- **Assignment management**: User assignment and reassignment
- **Status updates**: Real-time workflow status tracking
- **Milestone tracking**: Automatic milestone date recording

#### Key Features
- Accounts filing workflow (11 stages)
- Corporation Tax deadline tracking
- Confirmation Statement monitoring
- Assignment filters (assigned to me / all clients)
- Bulk operations for deadline management
- Companies House data refresh

#### Implementation Details
```typescript
// FIXED: Now uses server-side auth
const session = await getServerSession(authOptions)
if (!session?.user) redirect('/auth/login')
```

#### Components Used
- `LtdCompaniesDeadlinesTable` - Main deadline table component

#### Recent Fixes
✅ **Authentication pattern fixed** - Changed from client-side to server-side
✅ **Removed redundant loading states**
✅ **Added proper metadata**

#### Status: ✅ **Recently improved**

---

### `/dashboard/clients/vat-dt` - VAT Deadlines Tracker
**File**: `app/dashboard/clients/vat-dt/page.tsx`  
**Type**: Server Component  
**Auth**: Server-side authentication  

#### Purpose
Comprehensive VAT deadline tracking and workflow management for VAT-registered clients.

#### Functionality
- **VAT deadline tracking**: Quarter-based deadline monitoring
- **Workflow management**: 11-stage VAT return process
- **Multi-month view**: Track deadlines across different months
- **Assignment management**: VAT-specific user assignments
- **HMRC integration**: Direct filing capabilities

#### Key Features
- Monthly tabs for different filing periods
- Quarter-specific workflows
- VAT return status tracking
- Automatic quarter calculation
- Workflow stage progression
- Milestone date tracking

#### Implementation Details
```typescript
const session = await getServerSession(authOptions)
if (!session) redirect('/login')

// Uses Suspense for loading
<Suspense fallback={<div>Loading...</div>}>
  <VATDeadlinesTable />
</Suspense>
```

#### Components Used
- `VATDeadlinesTable` - Main VAT deadline component

#### Status: ✅ **Well-structured**
- Proper server-side auth
- Good use of Suspense
- Clean component structure

---

### `/dashboard/clients/add` - Add New Client
**File**: `app/dashboard/clients/add/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Comprehensive client onboarding wizard with Companies House integration.

#### Functionality
- **Multi-step wizard**: Guided client creation process
- **Companies House lookup**: Automatic company data population
- **Data validation**: Comprehensive form validation
- **Post-creation questionnaire**: Additional client setup
- **Automatic assignment**: Smart user assignment logic

#### Key Features
- Company number validation
- Automatic data population from Companies House
- VAT registration setup
- Accounting period configuration
- User assignment options
- Questionnaire for additional details

#### Status: ✅ **Well-implemented**
- Good user experience
- Proper validation
- Companies House integration

---

### `/dashboard/clients/inactive` - Inactive Clients
**File**: `app/dashboard/clients/inactive/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Management interface for inactive/resigned clients.

#### Functionality
- **Inactive client listing**: View resigned clients
- **Reactivation tools**: Restore client status
- **Bulk operations**: Mass reactivation or deletion
- **Audit trail**: Track client status changes

#### Status: ⚠️ **Needs review**
- May have duplicate table logic
- Should be reviewed for consistency

---

### `/dashboard/clients/non-ltd-companies` - Non-Limited Companies
**File**: `app/dashboard/clients/non-ltd-companies/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Specialized view for non-limited company clients (sole traders, partnerships).

#### Functionality
- **Non-Ltd client listing**: Filtered view of non-limited clients
- **Simplified workflow**: Different process for non-Ltd entities
- **Tax year management**: Different accounting periods

#### Components Used
- `LegacyClientsTable` - **REDUNDANT COMPONENT**

#### Issues Identified
❌ **Uses LegacyClientsTable** - 80% duplicate code with ClientsTable
❌ **Redundant component logic**

#### Recommendations
1. **CRITICAL**: Merge `LegacyClientsTable` with `ClientsTable`
2. Use props for customization instead of separate component

---

### `/dashboard/clients/vat-analytics` - VAT Analytics
**File**: `app/dashboard/clients/vat-analytics/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Analytics and reporting dashboard for VAT-related metrics.

#### Functionality
- **VAT performance metrics**: Filing statistics and trends
- **Client analytics**: VAT client portfolio analysis
- **Deadline analytics**: Performance against deadlines
- **Revenue tracking**: VAT-related revenue metrics

#### Status: ⚠️ **Needs review**
- Should be evaluated for redundancy with other analytics

---

## 🛠️ Utility Pages

### `/dashboard/settings` - User Settings
**File**: `app/dashboard/settings/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
User preference management and system configuration.

#### Functionality
- **User preferences**: Personal settings and defaults
- **Assignment defaults**: Default assignment preferences
- **Notification settings**: Alert and notification configuration
- **System preferences**: Application behavior settings

#### Issues Identified
❌ **Duplicate user fetching logic**

#### Recommendations
1. Replace with `useUsers()` hook

---

### `/dashboard/calendar` - Calendar View
**File**: `app/dashboard/calendar/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Calendar-based view of deadlines and appointments.

#### Functionality
- **Deadline calendar**: Visual deadline tracking
- **Event management**: Schedule and manage events
- **Export capabilities**: Calendar export functionality

#### Status: ✅ **Well-implemented**

---

### `/dashboard/tools` - System Tools
**File**: `app/dashboard/tools/page.tsx`  
**Type**: Client Component  
**Auth**: Middleware-handled  

#### Purpose
Administrative tools and utilities for system management.

#### Functionality
- **System utilities**: Various administrative tools
- **HMRC integration**: Government API tools
- **Data management**: Import/export utilities

#### Status: ✅ **Well-implemented**

---

## 🔧 Component Analysis Summary

### Redundant Components Identified
1. **`ClientsTable` vs `LegacyClientsTable`** - 80% duplicate code
2. **Multiple user fetching functions** - 8+ duplicate implementations
3. **Similar dashboard patterns** - Could be consolidated

### Authentication Patterns
1. **Server-side (Correct)**: `staff/page.tsx`, `partner/page.tsx`
2. **Client-side (Fixed)**: `ltd-companies/page.tsx` - Now server-side
3. **Mixed patterns**: Some inconsistencies remain

### Error Handling Patterns
1. **Inconsistent error handling** across components
2. **No standardized error utility** - Now created
3. **Different toast implementations** - Should be standardized

---

## 🚀 Implementation Status

### ✅ Recently Fixed
- Authentication pattern in Ltd Companies page
- Created centralized `useUsers()` hook
- Created standardized error handling utilities
- Comprehensive documentation created

### 🔴 Critical Issues Remaining
1. Replace duplicate user fetching with `useUsers()` hook
2. Merge `ClientsTable` and `LegacyClientsTable` components
3. Remove testing mode logic from dashboard pages

### 🟡 Important Improvements
1. Create centralized client fetching hook
2. Standardize error handling across all components
3. Implement consistent loading states

### 🟢 Future Enhancements
1. Add React Query for data caching
2. Implement optimistic updates
3. Add comprehensive testing

---

**Next Steps**: Begin implementing the `useUsers()` hook across components to eliminate duplicate user fetching logic, starting with the most frequently used components. 