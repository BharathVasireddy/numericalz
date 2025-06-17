# Numericalz Development Guide

## 🎯 Project Overview
Comprehensive internal management platform for UK accounting firms built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 🚨 CRITICAL PROTECTION RULES

### 🛡️ ABSOLUTE NEVER DELETE RULES
- **NEVER** delete any existing functionality without explicit user approval
- **NEVER** remove working APIs, components, or database operations
- **NEVER** change existing API response formats or data structures
- **NEVER** alter working contact management (email/phone icons)
- **NEVER** change responsive design or create horizontal scrolling
- **NEVER** remove client assignment functionality

## 📋 CURRENT FUNCTIONALITY DOCUMENTATION

### 🏢 Client Management System

#### Client Table Features
- **Contact Icons**: Email and phone icons with click functionality
  - Email icon opens `mailto:` links
  - Phone icon opens `tel:` links
  - Icons: `h-3 w-3` sizing with hover effects
  - Responsive across desktop/tablet/mobile

#### Client Code Generation
- **Format**: NZ-1, NZ-2, NZ-3 (sequential numbering)
- **Function**: `generateClientCode()` in `app/api/clients/route.ts`
- **Logic**: Finds last NZ- prefixed code and increments by 1
- **Database Query**: Uses `startsWith: 'NZ-'` with `orderBy: 'desc'`

#### User Assignment System
- **API Endpoint**: `POST /api/clients/[id]/assign`
- **Request Body**: `{ userId: string | null }`
- **Component**: `AssignUserModal` in `components/clients/assign-user-modal.tsx`
- **Authentication**: Requires MANAGER role

### 🎨 Design System

#### Layout System
- **CSS Classes**:
  - `.page-container` - Main page wrapper
  - `.content-wrapper` - Content container with max-width
  - `.content-sections` - Sections with consistent spacing
  - `.action-trigger-icon` - Consistent action icon styling

#### Icon Standards
- **Action Icons**: `h-4 w-4` in `h-8 w-8 p-0` buttons
- **Contact Icons**: `h-3 w-3` with hover transitions
- **CSS Class**: `.action-trigger-icon` for consistency

#### Table Layout
- **Strategy**: `table-fixed` to prevent horizontal scrolling
- **Column Widths**:
  - Client Code: `w-20` (80px)
  - Company Number: `w-24` (96px)
  - Company Name: `w-48` (192px)
  - Dates: `w-20` or `w-24` (80-96px)
  - Contact: `w-20` (80px)
  - Assigned To: `w-32` (128px)
  - Actions: `w-16` (64px)

### 🔌 API Documentation

#### Client Management APIs

##### GET /api/clients
- **Purpose**: Retrieve clients list with filtering and sorting
- **Authentication**: Required
- **Response**: Array of client objects with user assignments

##### POST /api/clients
- **Purpose**: Create new client
- **Body**: Client data with Companies House integration
- **Client Code**: Auto-generated using NZ-X format
- **Response**: Created client object

##### POST /api/clients/[id]/assign
- **Purpose**: Assign user to client
- **Body**: `{ userId: string | null }`
- **Authentication**: MANAGER role required
- **Response**: Updated client with assignedUser data

##### POST /api/clients/[id]/reassign
- **Purpose**: Reassign client to different user
- **Body**: `{ userId: string }`
- **Authentication**: MANAGER role required

##### POST /api/clients/[id]/resign
- **Purpose**: Mark client as resigned
- **Authentication**: MANAGER role required

##### POST /api/clients/[id]/refresh-companies-house
- **Purpose**: Refresh client data from Companies House API
- **Authentication**: Required

##### POST /api/clients/bulk-assign
- **Purpose**: Bulk assign multiple clients to user
- **Body**: `{ clientIds: string[], userId: string }`
- **Authentication**: MANAGER role required

##### POST /api/clients/bulk-resign
- **Purpose**: Bulk resign multiple clients
- **Body**: `{ clientIds: string[] }`
- **Authentication**: MANAGER role required

##### POST /api/clients/bulk-refresh
- **Purpose**: Bulk refresh Companies House data
- **Body**: `{ clientIds: string[] }`
- **Authentication**: Required

##### GET /api/clients/export
- **Purpose**: Export clients data to CSV/Excel
- **Authentication**: Required
- **Query Params**: Filter and format options

#### Companies House Integration APIs

##### GET /api/companies-house/search
- **Purpose**: Search companies in Companies House database
- **Query Params**: `q` (search term)
- **Response**: Array of company matches

##### GET /api/companies-house/company/[companyNumber]
- **Purpose**: Get detailed company information
- **Response**: Complete company data from Companies House

### 🧩 Component Architecture

#### Core Components

##### ClientsTable (`components/clients/clients-table.tsx`)
- **Features**: 
  - Responsive design (desktop/tablet/mobile)
  - Contact icons with click functionality
  - Sorting and filtering
  - Bulk operations
  - User assignment
- **Props**: 
  - `clients`: Client array
  - `session`: User session
  - `onRefresh`: Refresh callback

##### AssignUserModal (`components/clients/assign-user-modal.tsx`)
- **Purpose**: Modal for assigning users to clients
- **Features**:
  - User dropdown selection
  - Unassign option
  - Loading states
  - Error handling
- **API Integration**: Uses `/api/clients/[id]/assign`

##### PageLayout Components (`components/layout/page-layout.tsx`)
- **PageLayout**: Main layout wrapper with max-width options
- **PageHeader**: Standardized page header with title/description
- **PageContent**: Content area with consistent spacing

#### UI Components (ShadCN/UI)
- **Button**: Consistent button styling with variants
- **DropdownMenu**: Action menus with proper positioning
- **Table**: Responsive table components
- **Modal/Dialog**: Modal dialogs with proper focus management
- **Form**: Form components with validation

### 🗄️ Database Schema

#### Client Model
```prisma
model Client {
  id                      String    @id @default(cuid())
  clientCode              String    @unique
  companyName             String
  companyNumber           String    @unique
  companyType             CompanyType
  contactEmail            String?
  contactPhone            String?
  accountingReferenceDate DateTime
  nextAccountsDue         DateTime
  nextConfirmationDue     DateTime
  assignedUserId          String?
  assignedUser            User?     @relation(fields: [assignedUserId], references: [id])
  isActive                Boolean   @default(true)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

#### User Model
```prisma
model User {
  id          String    @id @default(cuid())
  name        String
  email       String    @unique
  role        UserRole  @default(STAFF)
  clients     Client[]
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

#### Enums
```prisma
enum UserRole {
  STAFF
  MANAGER
  ADMIN
}

enum CompanyType {
  LIMITED_COMPANY
  NON_LIMITED_COMPANY
  DIRECTOR
  SUB_CONTRACTOR
}
```

### 🔧 Utility Functions

#### Database Connection (`lib/db.ts`)
- **Connection**: Prisma client with connection pooling
- **Retry Logic**: `executeWithRetry()` for database operations
- **Error Handling**: Proper error logging and recovery

#### Companies House Integration (`lib/companies-house.ts`)
- **Search**: Company search functionality
- **Data Retrieval**: Detailed company information
- **Rate Limiting**: Proper API rate limit handling

#### Authentication (`lib/auth.ts`)
- **NextAuth Configuration**: Google OAuth and credentials
- **Session Management**: JWT tokens and session handling
- **Role-Based Access**: RBAC implementation

### 🎨 Styling System

#### Global CSS (`app/globals.css`)
```css
/* Layout System */
.page-container {
  padding: var(--layout-padding-y) var(--layout-padding-x);
}

.content-wrapper {
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.content-sections > * + * {
  margin-top: var(--content-spacing);
}

/* Action Icons */
.action-trigger-icon {
  height: 1rem;
  width: 1rem;
  color: rgb(107 114 128);
  transition: color 0.2s;
}

.action-trigger-icon:hover {
  color: hsl(var(--foreground));
}
```

#### CSS Variables
```css
:root {
  --layout-padding-x: 1rem;
  --layout-padding-x-md: 1.5rem;
  --layout-padding-x-lg: 2rem;
  --layout-padding-y: 1.5rem;
  --layout-padding-y-md: 2rem;
  --layout-padding-y-lg: 2.5rem;
  --content-spacing: 1.5rem;
  --content-spacing-md: 2rem;
  --content-spacing-lg: 2.5rem;
}
```

## 🚀 Development Workflow

### 1. Setup and Installation
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Database Operations
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name migration_name

# View database
npx prisma studio
```

### 3. Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run build
npm run build
```

### 4. Git Workflow
```bash
# Create feature branch
git checkout -b feature/feature-name

# Commit changes
git add .
git commit -m "feat: description of changes"

# Push changes
git push origin feature/feature-name
```

## 🔒 Security Guidelines

### Authentication
- NextAuth.js with Google OAuth
- JWT tokens for session management
- Role-based access control (RBAC)
- Proper session timeout handling

### API Security
- Request validation with Zod schemas
- Authentication middleware on protected routes
- Input sanitization before database operations
- Proper error handling without information leakage

### Data Protection
- Environment variables for sensitive data
- Proper CORS configuration
- Rate limiting on API endpoints
- SQL injection prevention with Prisma

## 📊 Performance Optimization

### Frontend
- React.memo() for expensive components
- Code splitting with dynamic imports
- Next.js Image optimization
- Proper bundle analysis

### Backend
- Database indexing on frequently queried fields
- Connection pooling with Prisma
- Caching strategies for static data
- Query optimization

### Database
```sql
-- Recommended indexes
CREATE INDEX idx_clients_company_number ON Client(companyNumber);
CREATE INDEX idx_clients_assigned_user ON Client(assignedUserId);
CREATE INDEX idx_clients_active ON Client(isActive);
CREATE INDEX idx_clients_client_code ON Client(clientCode);
```

## 🐛 Troubleshooting

### Common Issues

#### Horizontal Scrolling
- **Cause**: Table without `table-fixed` class
- **Solution**: Add `table-fixed` class and specific column widths

#### Contact Icons Not Working
- **Cause**: Missing click handlers or incorrect mailto/tel format
- **Solution**: Verify `onClick` handlers and URL format

#### User Assignment Failing
- **Cause**: API parameter mismatch (assignedUserId vs userId)
- **Solution**: Ensure request body uses `userId` parameter

#### Build Errors
- **Cause**: Missing dependencies or TypeScript errors
- **Solution**: Run `npm install` and fix TypeScript issues

### Debugging Tools
- Browser DevTools for frontend issues
- Next.js built-in error reporting
- Prisma Studio for database inspection
- Console logs with proper error context

## 📚 Additional Resources

### Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [ShadCN/UI Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

### APIs
- [Companies House API](https://developer.company-information.service.gov.uk)
- [NextAuth.js](https://next-auth.js.org)

---

## ⚠️ FINAL REMINDERS

### NEVER DO WITHOUT APPROVAL:
1. Delete existing functionality
2. Change API response formats
3. Modify client code generation
4. Remove contact icon functionality
5. Create horizontal scrolling
6. Change authentication logic

### ALWAYS DO:
1. Test functionality thoroughly
2. Maintain responsive design
3. Use standardized layout system
4. Follow contact icon standards
5. Preserve backward compatibility
6. Document all changes

This guide serves as the definitive reference for maintaining and extending the Numericalz platform while preserving all existing functionality and design consistency. 