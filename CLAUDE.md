# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

Numericalz is a sophisticated internal management system for UK accounting firms, built with Next.js 14, TypeScript, Prisma, and PostgreSQL. It's a production-ready application that manages clients, statutory deadlines, team assignments, and workflow processes with Companies House integration.

## 🛠️ Development Commands

### Essential Commands
```bash
# Development
npm run dev                    # Start development server
npm run dev:turbo             # Development with Turbo mode
npm run build                 # Production build
npm run type-check            # TypeScript validation
npm run lint                  # ESLint checking

# Database Operations (ALWAYS USE SAFE COMMANDS)
npm run db:backup             # Backup database (ALWAYS run before changes)
npm run db:migrate-safe       # Safe schema migrations (ONLY safe command)
npm run db:restore [filename] # Restore from backup
npm run db:audit              # Database integrity check
npm run db:studio             # Prisma Studio GUI

# Testing
npm run test:unit             # Unit tests
npm run test:integration      # Integration tests
npm run test:e2e              # End-to-end tests
npm run test:coverage         # Test coverage report

# Performance & Analysis
npm run analyze               # Bundle analysis
npm run performance:audit     # Lighthouse audit
npm run security:audit        # Security vulnerability scan
```

### 🚨 CRITICAL DATABASE SAFETY RULES

**NEVER USE THESE COMMANDS** (cause data loss):
- `npx prisma migrate reset --force`
- `npx prisma migrate reset`
- `npx prisma db push`
- `npx prisma migrate dev` (without backup)

**ALWAYS USE THESE SAFE COMMANDS**:
- `npm run db:backup` (before any database work)
- `npm run db:migrate-safe` (for schema changes)
- `npm run db:restore [filename]` (if problems occur)
- `npm run db:audit` (verify integrity)

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN/UI
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL (Supabase)
- **Auth**: NextAuth.js with role-based access control
- **External**: Companies House API integration

### Key Directories
```
app/
├── (auth)/           # Authentication routes
├── (dashboard)/      # Protected dashboard routes
├── api/             # API endpoints
│   ├── clients/     # Client management APIs
│   ├── users/       # User management APIs
│   └── companies-house/ # Companies House integration
└── globals.css      # Global styles with layout system

components/
├── ui/              # Reusable UI components (ShadCN)
├── clients/         # Client management components
├── dashboard/       # Dashboard components
└── layout/          # Layout components with standardized system

lib/
├── auth.ts          # Authentication utilities
├── db.ts            # Database connection with retry logic
├── companies-house.ts # Companies House API client
└── validations.ts   # Zod validation schemas
```

### Database Models
- **Users**: Staff/Manager/Partner roles with permissions
- **Clients**: Comprehensive client profiles with Companies House integration
- **ActivityLog**: Complete audit trail for compliance
- **UserClientAssignments**: Team member assignments to clients

## 🔒 Critical Protection Rules

### Functionality Protection
- **NEVER** delete existing functionality without explicit approval
- **NEVER** change client code generation (NZ-1, NZ-2 format)
- **NEVER** remove contact icon functionality (email/phone click actions)
- **NEVER** alter user assignment system or API endpoints
- **NEVER** modify responsive design or create horizontal scrolling
- **NEVER** change authentication/authorization logic

### Layout System Requirements
- **ALWAYS** use standardized layout system for new pages
- **ALWAYS** use `.page-container`, `.content-wrapper`, `.content-sections` classes
- **NEVER** create horizontal scrolling - content must fit viewport
- **ALWAYS** use table-fixed layout for tables
- **ALWAYS** maintain consistent action icon sizing (h-4 w-4)

### Contact Management Standards
- **Email Icons**: Must use Mail icon from Lucide, open mailto: links
- **Phone Icons**: Must use Phone icon from Lucide, open tel: links
- **Icon Sizing**: Consistent h-3 w-3 for contact icons
- **Hover Effects**: text-muted-foreground hover:text-foreground

## 📐 Code Standards

### Component Structure
```typescript
// Required component template
'use client' // Only if client component needed

import React from 'react'
import { ComponentProps } from '@/types'

interface ComponentNameProps {
  data: ComponentProps[]
  onAction: (id: string) => void
  isLoading?: boolean
  className?: string
}

export function ComponentName({ 
  data, 
  onAction, 
  isLoading = false,
  className 
}: ComponentNameProps) {
  // Implementation with proper error handling
}
```

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const RequestSchema = z.object({
  // Validation schema
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. Request validation
    const body = await request.json()
    const validatedData = RequestSchema.parse(body)
    
    // 3. Business logic
    const result = await db.model.create({ data: validatedData })
    
    // 4. Success response
    return NextResponse.json({ success: true, data: result })
    
  } catch (error) {
    // Proper error handling with status codes
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## 🎨 UI/UX Guidelines

### Layout System
- Use `PageLayout`, `PageHeader`, `PageContent` components for consistency
- Implement proper responsive design with mobile-first approach
- Use semantic CSS classes: `.page-container`, `.content-wrapper`
- Maintain consistent spacing using Tailwind spacing scale

### Component Standards
- Use ShadCN/UI components as base
- Implement proper loading and error states
- Use Framer Motion for animations
- Maintain consistent button heights (h-8) and spacing

### Table Design
- Use `table-fixed` to prevent horizontal scrolling
- Specific column widths: Client Code (w-20), Company Name (w-48), Actions (w-16)
- Text truncation with tooltips for long content
- Consistent action icon styling with `.action-trigger-icon`

## 🔐 Security & Validation

### Input Validation
```typescript
// Always use Zod for validation
const ClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email format'),
  vatNumber: z.string().regex(/^GB\d{9}$/, 'Invalid UK VAT number').optional()
})
```

### Authentication Pattern
- All API routes require authentication check
- Use role-based permissions (MANAGER, STAFF, PARTNER)
- Implement proper session management
- Hash passwords with bcrypt

## 📊 Business Logic

### Client Management
- Auto-generate client codes in NZ-1, NZ-2 format
- Integrate with Companies House API for company data
- Implement user assignment system with workload tracking
- Maintain audit trail for all client changes

### Contact Management
- Email icons must open `mailto:` links
- Phone icons must open `tel:` links
- Implement proper hover states and tooltips
- Ensure responsive design across all devices

## 🚀 Performance Guidelines

### Component Optimization
- Use React.memo for expensive components
- Implement proper code splitting with dynamic imports
- Use useMemo and useCallback for expensive operations
- Implement proper loading states

### Database Optimization
- Use Prisma select for specific fields only
- Implement proper indexing for frequently queried fields
- Use database-level filtering instead of JavaScript
- Limit query results with `take` parameter

## 🧪 Testing Approach

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API routes
- Component tests with React Testing Library
- End-to-end tests with Playwright

### Test Organization
- Place tests adjacent to source files
- Use descriptive test names and describe blocks
- Mock external dependencies properly
- Maintain test coverage above 80%

## 🔄 Development Workflow

### Feature Development
1. Create feature branch: `feature/description`
2. Follow TypeScript strict mode
3. Implement proper error handling
4. Use standardized layout system
5. Add comprehensive tests
6. Update documentation

### Code Review Checklist
- Functionality and error handling
- TypeScript usage and type safety
- Layout consistency and responsive design
- Contact icon functionality
- Security and validation
- Performance implications

## 🌟 Key Features to Preserve

### Current Functionality
- Client management with Companies House integration
- User assignment system with role-based access
- Contact management with click-to-action icons
- Responsive table design without horizontal scrolling
- Standardized layout system across all pages
- Comprehensive audit logging

### Future Development
The system is evolving into a multi-service workflow platform with:
- 10-stage workflow system for different services
- Automated triggers based on dates/frequencies
- HelloSign integration for document signing
- Parallel service management per client

## 📚 Documentation

Comprehensive documentation is available in `/docs/`:
- API_DOCUMENTATION.md - Complete API reference
- DATABASE_SCHEMA.md - Database structure and relationships
- DESIGN_SYSTEM.md - UI components and styling guide
- LAYOUT_SYSTEM.md - Standardized layout system
- SECURITY_GUIDELINES.md - Security best practices

## ⚠️ Important Notes

- This is a production system with real client data
- Always backup database before schema changes
- Use safe migration commands only
- Test thoroughly before deploying changes
- Maintain backward compatibility
- Follow security best practices
- Preserve existing functionality

Remember: This system serves UK accounting firms with critical deadlines and compliance requirements. Stability and data integrity are paramount.