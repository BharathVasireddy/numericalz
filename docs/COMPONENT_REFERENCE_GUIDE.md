# Component Reference Guide - Numericalz Internal Management System

## 🎯 Overview

This guide provides detailed reference information for all components in the Numericalz Internal Management System, including props, usage patterns, and implementation details.

## 📋 Table of Contents

1. [Form Components](#form-components)
2. [Data Display Components](#data-display-components)
3. [Navigation Components](#navigation-components)
4. [Feedback Components](#feedback-components)
5. [Specialized Business Components](#specialized-business-components)
6. [Hooks and Custom Logic](#hooks-and-custom-logic)
7. [Component Styling Guidelines](#component-styling-guidelines)

---

## 📝 Form Components

### `AddClientWizard`
**File:** `components/clients/add-client-wizard.tsx`

Multi-step wizard for creating new clients with Companies House integration.

**Props:**
```typescript
interface AddClientWizardProps {
  onClientCreated: (client: Client) => void
  onCancel: () => void
  initialData?: Partial<CreateClientRequest>
}
```

**Features:**
- Step 1: Company search and selection
- Step 2: Contact information
- Step 3: Additional details and confirmation
- Companies House API integration
- Form validation with Zod
- Progress indicator

**Usage:**
```tsx
<AddClientWizard
  onClientCreated={(client) => {
    console.log('New client created:', client)
    setShowWizard(false)
  }}
  onCancel={() => setShowWizard(false)}
/>
```

### `EditClientForm`
**File:** `components/clients/edit-client-form.tsx`

Comprehensive form for editing client information.

**Props:**
```typescript
interface EditClientFormProps {
  client: Client
  onSave: (updatedClient: Client) => void
  onCancel: () => void
  isLoading?: boolean
}
```

**Features:**
- All client fields editable
- Real-time validation
- Companies House data refresh
- Automatic save detection
- Dirty state tracking

### `AssignUserForm`
**File:** `components/clients/assign-user-form.tsx`

Form component for user assignment with role-based filtering.

**Props:**
```typescript
interface AssignUserFormProps {
  currentUserId?: string | null
  users: User[]
  onAssign: (userId: string | null) => Promise<void>
  workType?: 'GENERAL' | 'VAT' | 'ACCOUNTS'
  disabled?: boolean
}
```

**Features:**
- User selection dropdown
- Role-based filtering
- Current assignment display
- Unassign option
- Loading states

---

## 📊 Data Display Components

### `ClientsTable`
**File:** `components/clients/clients-table.tsx`

Main data table for displaying clients with advanced features.

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
  onSelectionChange?: (selectedIds: string[]) => void
}
```

**Key Features:**
- **Responsive Design**: Fixed table layout prevents horizontal scrolling
- **Sortable Columns**: Click headers to sort by any field
- **Bulk Selection**: Checkbox selection for bulk operations
- **Contact Icons**: Email and phone icons with click-to-action
- **Loading States**: Skeleton loading while fetching data
- **Empty States**: Helpful messages when no data
- **Pagination**: Built-in pagination support

**Column Configuration:**
```css
.col-client-code { @apply w-20; }     /* 80px */
.col-company-number { @apply w-24; }  /* 96px */
.col-company-name { @apply w-48; }    /* 192px - Main content */
.col-contact { @apply w-20; }         /* 80px - Contact icons */
.col-assigned { @apply w-32; }        /* 128px */
.col-actions { @apply w-16; }         /* 64px */
```

### `ClientDetailView`
**File:** `components/clients/client-detail-view.tsx`

Comprehensive client detail view with tabbed interface.

**Props:**
```typescript
interface ClientDetailViewProps {
  clientId: string
  onEdit?: () => void
  onAssign?: () => void
  onRefresh?: () => void
}
```

**Tabs:**
- **Overview**: Basic company information
- **Contacts**: Contact details and communication history
- **Statutory**: Deadlines and compliance information
- **Assignments**: User assignments and workload
- **Activity**: Activity log and history
- **Documents**: File attachments and documents

### `VATDeadlinesTable`
**File:** `components/clients/vat-deadlines-table.tsx`

Specialized table for VAT quarter management.

**Props:**
```typescript
interface VATDeadlinesTableProps {
  clients: Client[]
  onStageUpdate: (quarterId: string, stage: VATWorkflowStage) => void
  onAssignUser: (quarterId: string, userId: string) => void
  filters?: VATFilters
}
```

**Features:**
- VAT quarter workflow stages
- Stage progression buttons
- Assignment management
- Deadline highlighting
- Bulk stage updates

### `LtdCompaniesDeadlinesTable`
**File:** `components/clients/ltd-companies-deadlines-table.tsx`

Table for managing Ltd company deadlines and workflows.

**Props:**
```typescript
interface LtdDeadlinesTableProps {
  clients: Client[]
  onWorkflowUpdate: (clientId: string, stage: LtdAccountsWorkflowStage) => void
  showFilters?: boolean
}
```

---

## 🧭 Navigation Components

### `Navigation`
**File:** `components/dashboard/navigation.tsx`

Main navigation component with role-based menu items.

**Props:**
```typescript
interface NavigationProps {
  currentPath: string
  userRole: UserRole
  onNavigate?: (path: string) => void
}
```

**Features:**
- Role-based menu filtering
- Active state highlighting
- Responsive mobile menu
- Notification badges
- User profile dropdown

**Menu Structure:**
```typescript
const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['PARTNER', 'MANAGER', 'STAFF']
  },
  {
    label: 'Clients',
    href: '/dashboard/clients',
    icon: Building2,
    roles: ['PARTNER', 'MANAGER', 'STAFF']
  },
  {
    label: 'VAT Management',
    href: '/dashboard/vat',
    icon: Calculator,
    roles: ['PARTNER', 'MANAGER', 'STAFF']
  },
  {
    label: 'Team Management',
    href: '/dashboard/team',
    icon: Users,
    roles: ['PARTNER', 'MANAGER']
  }
]
```

### `ClientsHeader`
**File:** `components/clients/clients-header.tsx`

Header component for client management pages.

**Props:**
```typescript
interface ClientsHeaderProps {
  totalClients: number
  filteredClients: number
  onAddClient: () => void
  onExport: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: ClientFilters
  onFiltersChange: (filters: ClientFilters) => void
}
```

---

## 💬 Feedback Components

### `CustomToast`
**File:** `components/ui/custom-toast.tsx`

Enhanced toast notifications with multiple variants.

**Props:**
```typescript
interface CustomToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}
```

**Usage:**
```typescript
import { showToast } from '@/lib/toast'

// Success toast
showToast.success('Client created successfully')

// Error toast with action
showToast.error('Failed to save', {
  action: {
    label: 'Retry',
    onClick: () => handleRetry()
  }
})

// Loading toast
const loadingToast = showToast.loading('Processing...')
showToast.dismiss(loadingToast)
```

### `WorkflowSkipWarningDialog`
**File:** `components/ui/workflow-skip-warning-dialog.tsx`

Warning dialog for workflow stage skipping.

**Props:**
```typescript
interface WorkflowSkipWarningDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  fromStage: string
  toStage: string
  skippedStages: string[]
}
```

---

## 🏢 Specialized Business Components

### `BulkOperations`
**File:** `components/clients/bulk-operations.tsx`

Bulk operations toolbar for client management.

**Props:**
```typescript
interface BulkOperationsProps {
  selectedClients: string[]
  onClearSelection: () => void
  onRefreshClients: () => void
  users: User[]
  onBulkAssign?: (userIds: string[], clientIds: string[]) => void
  onBulkResign?: (clientIds: string[]) => void
  onBulkRefresh?: (clientIds: string[]) => void
}
```

**Available Operations:**
- Bulk assign to user
- Bulk unassign
- Bulk resign clients
- Bulk refresh Companies House data
- Export selected clients

### `AdvancedFilterModal`
**File:** `components/clients/advanced-filter-modal.tsx`

Advanced filtering interface for complex queries.

**Props:**
```typescript
interface AdvancedFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filter: AdvancedFilter) => void
  currentFilter?: AdvancedFilter
}
```

**Filter Capabilities:**
- Multiple field conditions
- AND/OR logic operators
- Date range filtering
- Text contains/equals/starts with
- Numeric comparisons
- Boolean field filtering

### `VATWorkflowModal`
**File:** `components/clients/vat-workflow-modal.tsx`

Modal for managing VAT quarter workflows.

**Props:**
```typescript
interface VATWorkflowModalProps {
  vatQuarter: VATQuarter | null
  isOpen: boolean
  onClose: () => void
  onStageUpdate: (stage: VATWorkflowStage, notes?: string) => void
  onAssignUser: (userId: string) => void
  users: User[]
}
```

### `CTStatusManager`
**File:** `components/clients/ct-status-manager.tsx`

Corporation Tax status management component.

**Props:**
```typescript
interface CTStatusManagerProps {
  client: Client
  onStatusUpdate: (status: CTStatus, dueDate?: Date) => void
  onDueDateUpdate: (dueDate: Date) => void
}
```

### `DeadlineCalendar`
**File:** `components/dashboard/deadline-calendar.tsx`

Calendar view for deadline management.

**Props:**
```typescript
interface DeadlineCalendarProps {
  clients: Client[]
  onDateSelect?: (date: Date) => void
  onClientSelect?: (client: Client) => void
  view?: 'month' | 'week' | 'day'
  highlightOverdue?: boolean
}
```

**Features:**
- Multiple view modes
- Deadline highlighting
- Overdue indicators
- Click-to-view client details
- Export calendar data

---

## 🔧 Hooks and Custom Logic

### `useUsers`
**File:** `lib/hooks/useUsers.ts`

Custom hook for user data management.

**Usage:**
```typescript
const { users, loading, error, refetch } = useUsers({
  includeSelf: true,
  role: 'STAFF',
  active: true
})
```

**Options:**
```typescript
interface UseUsersOptions {
  includeSelf?: boolean
  role?: UserRole
  active?: boolean
  refetchInterval?: number
}
```

### `useClients`
**File:** `lib/hooks/useClients.ts`

Custom hook for client data management.

**Usage:**
```typescript
const {
  clients,
  loading,
  error,
  totalCount,
  fetchClients,
  createClient,
  updateClient,
  deleteClient
} = useClients({
  search: searchQuery,
  filters: clientFilters,
  sortBy: 'companyName',
  sortOrder: 'asc'
})
```

### `useDebounce`
**File:** `lib/hooks/useDebounce.ts`

Debounce hook for search and input handling.

**Usage:**
```typescript
const debouncedSearchQuery = useDebounce(searchQuery, 300)

useEffect(() => {
  if (debouncedSearchQuery) {
    performSearch(debouncedSearchQuery)
  }
}, [debouncedSearchQuery])
```

### `useLocalStorage`
**File:** `lib/hooks/useLocalStorage.ts`

Local storage state management hook.

**Usage:**
```typescript
const [tablePreferences, setTablePreferences] = useLocalStorage('tablePrefs', {
  sortBy: 'companyName',
  sortOrder: 'asc',
  pageSize: 50
})
```

---

## 🎨 Component Styling Guidelines

### CSS Class Conventions

#### Layout Classes
```css
/* Page structure */
.page-container {
  @apply min-h-screen bg-background;
  padding: var(--layout-padding-y) var(--layout-padding-x);
}

.content-wrapper {
  @apply mx-auto w-full;
  max-width: var(--content-max-width);
}

.content-sections {
  @apply space-y-6;
}

/* Header styling */
.page-header {
  @apply border-b border-border pb-4 mb-6;
}
```

#### Table Classes
```css
/* Table layout */
.table-container {
  @apply w-full overflow-hidden;
}

.data-table {
  @apply table-fixed w-full;
}

/* Column widths */
.col-client-code { @apply w-20; }
.col-company-number { @apply w-24; }
.col-company-name { @apply w-48; }
.col-contact { @apply w-20; }
.col-assigned { @apply w-32; }
.col-actions { @apply w-16; }

/* Text handling */
.truncate-text {
  @apply truncate;
  title: attr(data-full-text);
}
```

#### Action Icon Classes
```css
/* Consistent action icon styling */
.action-trigger-icon {
  @apply h-4 w-4;
}

.action-button {
  @apply h-8 w-8 p-0;
}

.action-button:hover .action-trigger-icon {
  @apply text-foreground;
}
```

#### Contact Icon Classes
```css
/* Contact management icons */
.contact-icon {
  @apply h-3 w-3 text-muted-foreground hover:text-foreground transition-colors;
}

.contact-link {
  @apply inline-flex items-center justify-center p-1 rounded hover:bg-accent;
}
```

### Responsive Design Patterns

#### Mobile-First Approach
```css
/* Base styles for mobile */
.responsive-container {
  @apply px-4 py-2;
}

/* Tablet and up */
@screen md {
  .responsive-container {
    @apply px-6 py-4;
  }
}

/* Desktop and up */
@screen lg {
  .responsive-container {
    @apply px-8 py-6;
  }
}
```

#### Table Responsiveness
```css
/* Mobile table handling */
@screen max-md {
  .mobile-table-card {
    @apply block space-y-4;
  }
  
  .mobile-table-row {
    @apply bg-card border rounded-lg p-4;
  }
  
  .mobile-table-cell {
    @apply flex justify-between items-center py-1;
  }
}
```

### Component State Classes

#### Loading States
```css
.loading-skeleton {
  @apply animate-pulse bg-muted rounded;
}

.loading-spinner {
  @apply animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full;
}
```

#### Status Indicators
```css
.status-active {
  @apply bg-green-100 text-green-800 border-green-200;
}

.status-inactive {
  @apply bg-gray-100 text-gray-800 border-gray-200;
}

.status-overdue {
  @apply bg-red-100 text-red-800 border-red-200;
}

.status-due-soon {
  @apply bg-yellow-100 text-yellow-800 border-yellow-200;
}
```

---

## 🔧 Component Development Patterns

### Error Boundary Pattern
```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ComponentErrorBoundary extends Component<
  PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page or contact support</p>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Loading State Pattern
```typescript
interface AsyncComponentState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const useAsyncData = <T>(fetchFn: () => Promise<T>) => {
  const [state, setState] = useState<AsyncComponentState<T>>({
    data: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    fetchFn()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ 
        data: null, 
        loading: false, 
        error: error.message 
      }))
  }, [])

  return state
}
```

### Form Validation Pattern
```typescript
const useFormValidation = <T>(
  initialValues: T,
  validationSchema: z.ZodSchema<T>
) => {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = useCallback(() => {
    try {
      validationSchema.parse(values)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path.join('.')] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }, [values, validationSchema])

  return {
    values,
    errors,
    touched,
    setValues,
    setTouched,
    validate,
    isValid: Object.keys(errors).length === 0
  }
}
```

---

This component reference guide provides comprehensive information about all components in the Numericalz Internal Management System. Use this guide alongside the main API documentation for complete system understanding.