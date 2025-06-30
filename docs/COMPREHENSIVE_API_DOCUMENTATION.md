# Numericalz Internal Management System - Comprehensive API Documentation

## 🎯 Overview

This document provides comprehensive documentation for all public APIs, functions, and components in the Numericalz Internal Management System. The system is built with Next.js 14, TypeScript, Prisma, and PostgreSQL, designed specifically for UK accounting firms.

## 📋 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Client Management APIs](#client-management-apis)
3. [User Management APIs](#user-management-apis)
4. [Companies House Integration](#companies-house-integration)
5. [VAT Management APIs](#vat-management-apis)
6. [Workflow Management APIs](#workflow-management-apis)
7. [Utility Functions](#utility-functions)
8. [UI Components](#ui-components)
9. [Layout Components](#layout-components)
10. [Business Logic Functions](#business-logic-functions)
11. [Error Handling](#error-handling)
12. [Response Formats](#response-formats)

---

## 🔐 Authentication & Authorization

### NextAuth Configuration

**File:** `lib/auth.ts`

#### `authOptions`
NextAuth configuration for the Numericalz system.

```typescript
export const authOptions: NextAuthOptions
```

**Features:**
- Credentials-based authentication
- JWT strategy with 8-hour expiration
- Role-based access control
- Session validation with automatic logout

**User Roles:**
- `PARTNER` - Full system access
- `MANAGER` - Client and team management
- `STAFF` - Assigned clients only

#### `validateUserSession(user: any): Promise<boolean>`
Enhanced session validation with security checks.

```typescript
const isValid = await validateUserSession({ id: userId })
```

**Parameters:**
- `user` - User object with ID

**Returns:**
- `boolean` - True if session is valid

---

## 👥 Client Management APIs

### Base Endpoint: `/api/clients`

#### GET `/api/clients`
Fetch all clients with filtering and pagination.

**Query Parameters:**
```typescript
interface ClientsQuery {
  search?: string          // Search term
  companyType?: string     // Filter by company type
  active?: boolean         // Filter by active status
  sortBy?: string         // Sort field (default: 'companyName')
  sortOrder?: 'asc' | 'desc' // Sort direction
  page?: number           // Page number (default: 1)
  limit?: number          // Items per page (default: 50)
}
```

**Response:**
```typescript
interface ClientsResponse {
  success: boolean
  clients: Client[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    responseTime: number
    queriedAt: string
  }
}
```

**Example:**
```javascript
// Fetch active clients with search
const response = await fetch('/api/clients?search=numericalz&active=true&sortBy=companyName&sortOrder=asc')
const data = await response.json()
```

#### POST `/api/clients`
Create a new client.

**Request Body:**
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
  // ... additional fields
}
```

**Response:**
```typescript
interface CreateClientResponse {
  success: boolean
  data: Client
  message: string
}
```

**Example:**
```javascript
const newClient = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyName: 'Example Ltd',
    companyType: 'LIMITED_COMPANY',
    contactName: 'John Doe',
    contactEmail: 'john@example.com'
  })
})
```

### Individual Client Endpoints: `/api/clients/[id]`

#### GET `/api/clients/[id]`
Get detailed client information.

**Response:**
```typescript
interface ClientDetailResponse {
  success: boolean
  data: Client & {
    assignedUser?: User
    ltdCompanyAssignedUser?: User
    vatAssignedUser?: User
    activityLogs?: ActivityLog[]
  }
}
```

#### PUT `/api/clients/[id]`
Update client information.

**Request Body:** Partial client data
**Response:** Updated client object

#### DELETE `/api/clients/[id]`
Soft delete (resign) a client.

**Response:**
```typescript
interface ResignClientResponse {
  success: boolean
  message: string
}
```

### Client Assignment APIs

#### POST `/api/clients/[id]/assign`
Assign a client to a user (general assignment).

**Request Body:**
```typescript
interface AssignClientRequest {
  userId: string | null  // null to unassign
}
```

**Response:**
```typescript
interface AssignClientResponse {
  success: boolean
  data: Client & { assignedUser?: User }
  message: string
}
```

**Example:**
```javascript
// Assign client to user
await fetch('/api/clients/123/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-id-123' })
})

// Unassign client
await fetch('/api/clients/123/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: null })
})
```

#### POST `/api/clients/[id]/assign-vat`
Assign VAT work to a user.

**Request Body:**
```typescript
interface AssignVATRequest {
  userId: string | null
}
```

#### POST `/api/clients/[id]/assign-accounts`
Assign accounts work to a user.

**Request Body:**
```typescript
interface AssignAccountsRequest {
  userId: string | null
}
```

### Bulk Operations

#### POST `/api/clients/bulk-assign`
Bulk assign multiple clients to a user.

**Request Body:**
```typescript
interface BulkAssignRequest {
  clientIds: string[]
  userId: string | null
}
```

**Response:**
```typescript
interface BulkAssignResponse {
  success: boolean
  results: {
    successful: number
    failed: number
    errors: string[]
  }
  message: string
}
```

#### POST `/api/clients/bulk-resign`
Bulk resign multiple clients.

**Request Body:**
```typescript
interface BulkResignRequest {
  clientIds: string[]
}
```

#### POST `/api/clients/bulk-refresh`
Bulk refresh Companies House data for multiple clients.

**Request Body:**
```typescript
interface BulkRefreshRequest {
  clientIds: string[]
}
```

### Companies House Integration

#### POST `/api/clients/[id]/refresh-companies-house`
Refresh Companies House data for a specific client.

**Response:**
```typescript
interface RefreshCHResponse {
  success: boolean
  data: Client
  message: string
}
```

### Export APIs

#### GET `/api/clients/export`
Export client data in various formats.

**Query Parameters:**
```typescript
interface ExportQuery {
  format: 'csv' | 'xlsx' | 'json'
  filters?: string  // JSON string of filters
}
```

**Response:** File download or JSON data

---

## 👤 User Management APIs

### Base Endpoint: `/api/users`

#### GET `/api/users`
Fetch all users with filtering.

**Query Parameters:**
```typescript
interface UsersQuery {
  role?: string
  active?: boolean
  includeSelf?: boolean
}
```

**Response:**
```typescript
interface UsersResponse {
  success: boolean
  users: User[]
}
```

#### POST `/api/users`
Create a new user (Partner/Manager only).

**Request Body:**
```typescript
interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: 'PARTNER' | 'MANAGER' | 'STAFF'
}
```

#### GET `/api/users/[id]`
Get user details.

#### PUT `/api/users/[id]`
Update user information.

#### DELETE `/api/users/[id]`
Deactivate user account.

---

## 🏢 Companies House Integration

### Base Endpoint: `/api/companies-house`

#### GET `/api/companies-house/search`
Search for companies by name or number.

**Query Parameters:**
```typescript
interface CHSearchQuery {
  q: string           // Search term
  items_per_page?: number
  start_index?: number
}
```

**Response:**
```typescript
interface CHSearchResponse {
  success: boolean
  data: {
    items: CompaniesHouseSearchResult[]
    total_results: number
    items_per_page: number
    start_index: number
  }
}
```

#### GET `/api/companies-house/company/[companyNumber]`
Get detailed company information.

**Response:**
```typescript
interface CHCompanyResponse {
  success: boolean
  data: {
    company: CompaniesHouseCompany
    officers?: any
    psc?: any
  }
}
```

---

## 📊 VAT Management APIs

### Base Endpoint: `/api/vat-quarters`

#### GET `/api/vat-quarters`
Fetch VAT quarters with filtering.

**Query Parameters:**
```typescript
interface VATQuartersQuery {
  clientId?: string
  stage?: VATWorkflowStage
  assignedUserId?: string
  overdue?: boolean
}
```

#### POST `/api/vat-quarters`
Create new VAT quarter.

#### PUT `/api/vat-quarters/[id]`
Update VAT quarter stage and details.

#### POST `/api/vat-quarters/[id]/progress`
Progress VAT quarter to next stage.

---

## 🔄 Workflow Management APIs

### VAT Workflow

#### POST `/api/vat-quarters/[id]/stage`
Update VAT quarter workflow stage.

**Request Body:**
```typescript
interface UpdateVATStageRequest {
  stage: VATWorkflowStage
  notes?: string
}
```

### Ltd Accounts Workflow

#### GET `/api/clients/[id]/accounts-workflow`
Get accounts workflow for client.

#### POST `/api/clients/[id]/accounts-workflow`
Create new accounts workflow.

#### PUT `/api/clients/[id]/accounts-workflow/[workflowId]`
Update accounts workflow stage.

---

## 🛠️ Utility Functions

### Date Calculation Utilities

**File:** `lib/year-end-utils.ts`

#### `calculateYearEnd(clientData: ClientYearEndData): Date | null`
Calculate the correct year end date based on UK accounting rules.

**Parameters:**
```typescript
interface ClientYearEndData {
  lastAccountsMadeUpTo?: string | Date | null
  incorporationDate?: string | Date | null
  nextAccountsDue?: string | Date | null
  nextYearEnd?: string | Date | null
}
```

**Priority Order:**
1. Companies House next_made_up_to (official year end)
2. Last accounts made up to date + 1 year
3. Incorporation date + 12 months

**Example:**
```typescript
import { calculateYearEnd } from '@/lib/year-end-utils'

const yearEnd = calculateYearEnd({
  lastAccountsMadeUpTo: '2023-12-31',
  incorporationDate: '2022-01-01'
})
```

#### `formatYearEnd(clientData: ClientYearEndData, format?: 'short' | 'numeric', fallback?: string): string`
Format year end date for display.

**Example:**
```typescript
const formatted = formatYearEnd(clientData, 'short', 'Not set')
// Returns: "31 Dec 2024" or "Not set"
```

#### `calculateCorporationTaxDue(clientData: ClientYearEndData): Date | null`
Calculate Corporation Tax due date (12 months after year end).

#### `calculateAccountsDue(clientData: ClientYearEndData): Date | null`
Calculate Accounts due date (9 months after year end).

#### `calculateAllStatutoryDates(clientData: ClientYearEndData)`
Calculate all statutory dates for a company.

**Returns:**
```typescript
interface StatutoryDates {
  yearEnd: Date | null
  accountsDue: Date | null
  corporationTaxDue: Date | null
  formatted: {
    yearEnd: string
    accountsDue: string
    corporationTaxDue: string
  }
}
```

### Companies House Utilities

**File:** `lib/companies-house.ts`

#### `searchCompanies(query: string, itemsPerPage?: number, startIndex?: number): Promise<CompaniesHouseSearchResponse>`
Search for companies by name or number.

#### `getCompanyDetails(companyNumber: string): Promise<CompaniesHouseCompany>`
Get detailed company information.

#### `getComprehensiveCompanyData(companyNumber: string)`
Get comprehensive company data including officers and PSC.

#### `transformCompaniesHouseData(chData: CompaniesHouseCompany, userInput: any, officers?: any, psc?: any)`
Transform Companies House data to database format.

#### `isValidCompanyNumber(companyNumber: string): boolean`
Validate UK company number format.

#### `formatCompanyNumber(companyNumber: string): string`
Format company number for display.

### General Utilities

**File:** `lib/utils.ts`

#### `cn(...inputs: ClassValue[]): string`
Combine and merge Tailwind CSS classes.

#### `debounce(func: Function, wait: number): Function`
Create debounced version of function.

---

## 🎨 UI Components

### Base Components

**File:** `components/ui/`

#### `Button`
Versatile button component with multiple variants.

**Props:**
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
  className?: string
  children: React.ReactNode
}
```

**Example:**
```tsx
import { Button } from '@/components/ui/button'

<Button variant="outline" size="sm">
  Click me
</Button>
```

#### `Card`, `CardContent`, `CardHeader`, `CardTitle`
Card components for content organization.

**Example:**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Client Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>
```

#### `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
Table components with consistent styling.

**Example:**
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

<Table className="table-fixed w-full">
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
Modal dialog components.

**Example:**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
    <p>Are you sure?</p>
  </DialogContent>
</Dialog>
```

#### `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`
Dropdown menu components.

**Example:**
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <Settings className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleEdit}>
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDelete}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### `Input`, `Label`, `Textarea`, `Select`
Form input components.

**Example:**
```tsx
import { Input, Label } from '@/components/ui/input'

<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
```

#### `Badge`
Badge component for status indicators.

**Props:**
```typescript
interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
  children: React.ReactNode
}
```

**Example:**
```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="secondary">Active</Badge>
<Badge variant="destructive">Overdue</Badge>
```

#### `Checkbox`
Checkbox component with proper styling.

**Example:**
```tsx
import { Checkbox } from '@/components/ui/checkbox'

<Checkbox
  checked={isChecked}
  onCheckedChange={setIsChecked}
  id="terms"
/>
<Label htmlFor="terms">Accept terms</Label>
```

#### `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`
Tooltip components for additional information.

**Example:**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <Info className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Additional information</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 🏗️ Layout Components

**File:** `components/layout/page-layout.tsx`

### `PageLayout`
Standardized page layout component for consistent spacing.

**Props:**
```typescript
interface PageLayoutProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}
```

**Max Width Options:**
- `sm` - 672px (forms, simple pages)
- `md` - 896px (content pages)
- `lg` - 1152px (dashboard pages)
- `xl` - 1280px (default, most pages)
- `2xl` - No max width
- `full` - Full width

**Example:**
```tsx
import { PageLayout } from '@/components/layout/page-layout'

<PageLayout maxWidth="xl">
  <div>Page content</div>
</PageLayout>
```

### `PageHeader`
Standardized page header with title and actions.

**Props:**
```typescript
interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}
```

**Example:**
```tsx
import { PageHeader } from '@/components/layout/page-layout'

<PageHeader 
  title="Client Management"
  description="Manage your clients and assignments"
>
  <Button>Add Client</Button>
</PageHeader>
```

### `PageContent`
Standardized content wrapper with consistent spacing.

**Props:**
```typescript
interface PageContentProps {
  children: ReactNode
  className?: string
}
```

**Example:**
```tsx
import { PageContent } from '@/components/layout/page-layout'

<PageContent>
  <div>Main content sections</div>
</PageContent>
```

---

## 🏢 Business Components

### Client Management Components

**File:** `components/clients/`

#### `ClientsTable`
Comprehensive clients table with sorting, filtering, and bulk operations.

**Props:**
```typescript
interface ClientsTableProps {
  searchQuery: string
  filters: {
    companyType: string
    status: string
  }
  advancedFilter?: AdvancedFilter | null
  onClientCountsUpdate?: (total: number, filtered: number) => void
}
```

**Features:**
- Sortable columns
- Bulk selection and operations
- Contact icons (email/phone)
- Responsive design
- Loading states

**Example:**
```tsx
import { ClientsTable } from '@/components/clients/clients-table'

<ClientsTable
  searchQuery={searchQuery}
  filters={{ companyType: '', status: 'active' }}
  onClientCountsUpdate={(total, filtered) => {
    console.log(`${filtered} of ${total} clients`)
  }}
/>
```

#### `AssignUserModal`
Modal for assigning users to clients.

**Props:**
```typescript
interface AssignUserModalProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onAssign: (userId: string | null) => Promise<void>
  users: User[]
}
```

#### `BulkOperations`
Bulk operations component for managers.

**Props:**
```typescript
interface BulkOperationsProps {
  selectedClients: string[]
  onClearSelection: () => void
  onRefreshClients: () => void
  users: User[]
}
```

#### `ClientDetailView`
Comprehensive client detail view with all information.

**Props:**
```typescript
interface ClientDetailViewProps {
  clientId: string
}
```

#### `AddClientWizard`
Multi-step wizard for adding new clients.

**Props:**
```typescript
interface AddClientWizardProps {
  onClientCreated: (client: Client) => void
  onCancel: () => void
}
```

### Dashboard Components

**File:** `components/dashboard/`

#### `ManagerDashboard`
Dashboard for managers with team overview.

#### `StaffDashboard`
Dashboard for staff with assigned clients.

#### `PartnerDashboard`
Dashboard for partners with high-level overview.

#### `DeadlineCalendar`
Calendar view of upcoming deadlines.

**Props:**
```typescript
interface DeadlineCalendarProps {
  clients: Client[]
  onDateSelect?: (date: Date) => void
}
```

---

## 🔧 Business Logic Functions

### Client Code Generation

**File:** `app/api/clients/route.ts`

#### `generateClientCode(): Promise<string>`
Generate unique client code in NZ-X format.

**Returns:** Sequential client code (NZ-1, NZ-2, NZ-3, etc.)

**Example:**
```typescript
const clientCode = await generateClientCode()
// Returns: "NZ-123"
```

### Assignment Logic

**File:** `components/clients/assign-user-modal.tsx`

#### `getAssignedUser(client: Client, workType: 'VAT' | 'ACCOUNTS'): User | null`
Get assigned user based on work type priority.

**Priority for VAT:**
1. Current VAT quarter assigned user
2. VAT assigned user
3. General assigned user

**Priority for Accounts:**
1. Accounts assigned user
2. General assigned user

### Contact Management

#### Email and Phone Functionality
Contact icons with click-to-action functionality.

**Email Icon Implementation:**
```tsx
<a 
  href={`mailto:${email}`}
  className="text-muted-foreground hover:text-foreground transition-colors"
  title={`Email: ${email}`}
>
  <Mail className="h-3 w-3" />
</a>
```

**Phone Icon Implementation:**
```tsx
<a 
  href={`tel:${phone}`}
  className="text-muted-foreground hover:text-foreground transition-colors"
  title={`Call: ${phone}`}
>
  <Phone className="h-3 w-3" />
</a>
```

---

## ⚠️ Error Handling

### API Error Responses

All API endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  success: false
  error: string
  details?: any
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

### Error Handling Patterns

#### API Routes
```typescript
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validation
    const body = await request.json()
    const validatedData = schema.parse(body)

    // Business logic
    const result = await performOperation(validatedData)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

#### Client Components
```typescript
const handleAction = async () => {
  try {
    const loadingToast = showToast.loading('Processing...')
    
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (response.ok) {
      const result = await response.json()
      showToast.dismiss(loadingToast)
      showToast.success('Operation successful')
      return result
    } else {
      const error = await response.json()
      showToast.dismiss(loadingToast)
      showToast.error(error.error || 'Operation failed')
    }
  } catch (error) {
    console.error('Error:', error)
    showToast.error('Network error occurred')
  }
}
```

---

## 📊 Response Formats

### Standard Success Response
```typescript
interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
  meta?: {
    responseTime?: number
    queriedAt?: string
  }
}
```

### Paginated Response
```typescript
interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

### Bulk Operation Response
```typescript
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

---

## 🔒 Security & Permissions

### Role-Based Access Control

**Roles:**
- `PARTNER` - Full system access
- `MANAGER` - Client and team management
- `STAFF` - Assigned clients only

**Permission Matrix:**

| Action | PARTNER | MANAGER | STAFF |
|--------|---------|---------|-------|
| View all clients | ✅ | ✅ | ❌ |
| View assigned clients | ✅ | ✅ | ✅ |
| Create clients | ✅ | ✅ | ❌ |
| Edit clients | ✅ | ✅ | ❌ |
| Assign users | ✅ | ✅ | ❌ |
| Bulk operations | ✅ | ✅ | ❌ |
| User management | ✅ | ✅ | ❌ |
| System settings | ✅ | ❌ | ❌ |

### API Authentication

All protected API routes require authentication:

```typescript
const session = await getServerSession(authOptions)
if (!session) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}

// Role-based authorization
if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
  return NextResponse.json(
    { success: false, error: 'Insufficient permissions' },
    { status: 403 }
  )
}
```

---

## 📝 Usage Examples

### Complete Client Management Flow

```typescript
// 1. Search Companies House
const searchResponse = await fetch('/api/companies-house/search?q=numericalz')
const companies = await searchResponse.json()

// 2. Create client with Companies House data
const createResponse = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyName: companies.data.items[0].title,
    companyNumber: companies.data.items[0].company_number,
    companyType: 'LIMITED_COMPANY',
    contactName: 'John Doe',
    contactEmail: 'john@numericalz.com'
  })
})

const newClient = await createResponse.json()

// 3. Assign client to user
await fetch(`/api/clients/${newClient.data.id}/assign`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-123' })
})

// 4. Refresh Companies House data
await fetch(`/api/clients/${newClient.data.id}/refresh-companies-house`, {
  method: 'POST'
})
```

### Bulk Operations Example

```typescript
// Select multiple clients
const selectedClientIds = ['client-1', 'client-2', 'client-3']

// Bulk assign to user
const bulkAssignResponse = await fetch('/api/clients/bulk-assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientIds: selectedClientIds,
    userId: 'user-123'
  })
})

const result = await bulkAssignResponse.json()
console.log(`${result.results.successful} clients assigned successfully`)
```

### Component Usage Example

```tsx
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { ClientsTable } from '@/components/clients/clients-table'
import { Button } from '@/components/ui/button'

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    companyType: '',
    status: 'active'
  })

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Client Management"
        description="Manage your clients and assignments"
      >
        <Button onClick={() => setShowAddModal(true)}>
          Add Client
        </Button>
      </PageHeader>
      
      <PageContent>
        <ClientsTable
          searchQuery={searchQuery}
          filters={filters}
          onClientCountsUpdate={(total, filtered) => {
            console.log(`Showing ${filtered} of ${total} clients`)
          }}
        />
      </PageContent>
    </PageLayout>
  )
}
```

---

## 🎯 Best Practices

### API Development
1. Always validate input with Zod schemas
2. Implement proper error handling
3. Use consistent response formats
4. Add authentication checks first
5. Include proper logging

### Component Development
1. Use TypeScript interfaces for props
2. Implement proper loading states
3. Handle error scenarios gracefully
4. Use consistent styling patterns
5. Add proper accessibility attributes

### Database Operations
1. Use Prisma for type-safe queries
2. Implement proper indexing
3. Use transactions for related operations
4. Add proper error handling
5. Follow the database safety protocol

### Security
1. Validate all user inputs
2. Use role-based access control
3. Implement proper session management
4. Log security-relevant events
5. Follow the principle of least privilege

---

## 🔄 Migration and Updates

### Database Schema Changes
Always use the safe migration process:

```bash
# 1. Create backup
npm run db:backup

# 2. Run safe migration
npm run db:migrate-safe

# 3. Verify integrity
npm run db:audit
```

### API Versioning
When making breaking changes to APIs:

1. Maintain backward compatibility
2. Add deprecation warnings
3. Provide migration guides
4. Version API endpoints if necessary

### Component Updates
When updating components:

1. Maintain existing prop interfaces
2. Add new props as optional
3. Provide default values
4. Update documentation

---

This comprehensive documentation covers all public APIs, functions, and components in the Numericalz Internal Management System. For additional information, refer to the specific documentation files in the `/docs` directory.