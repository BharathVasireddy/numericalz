# Testing Strategy - Numericalz Internal Application

## 🧪 Overview

This document outlines the comprehensive testing strategy for the Numericalz Internal Management System, ensuring high code quality, reliability, and maintainability.

## 📊 Testing Pyramid

### Unit Tests (70%)
- **Purpose**: Test individual functions, utilities, and components in isolation
- **Coverage Target**: 90%+ for utility functions, 80%+ for components
- **Tools**: Jest, React Testing Library
- **Location**: Adjacent to source files (`*.test.ts`, `*.test.tsx`)

### Integration Tests (20%)
- **Purpose**: Test API routes, database operations, and component interactions
- **Coverage Target**: 85%+ for API endpoints
- **Tools**: Jest, Supertest, Testing Database
- **Location**: `__tests__/integration/`

### End-to-End Tests (10%)
- **Purpose**: Test complete user workflows and critical business processes
- **Coverage Target**: 100% of critical user journeys
- **Tools**: Playwright, Cypress (backup)
- **Location**: `e2e/`

## 🔧 Testing Tools Configuration

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### React Testing Library Setup
```javascript
// jest.setup.js
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

## 📝 Testing Patterns & Best Practices

### Component Testing Pattern
```typescript
// components/ClientCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClientCard } from './ClientCard'
import { mockClient } from '@/test-utils/mocks'

describe('ClientCard', () => {
  const defaultProps = {
    client: mockClient,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders client information correctly', () => {
    render(<ClientCard {...defaultProps} />)
    
    expect(screen.getByText(mockClient.companyName)).toBeInTheDocument()
    expect(screen.getByText(mockClient.companyNumber)).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    render(<ClientCard {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    
    await waitFor(() => {
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockClient.id)
    })
  })

  it('shows confirmation dialog when delete is clicked', async () => {
    render(<ClientCard {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })
})
```

### API Route Testing Pattern
```typescript
// __tests__/integration/api/clients.test.ts
import { createRequest, createResponse } from 'node-mocks-http'
import handler from '@/app/api/clients/route'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('next-auth')

describe('/api/clients', () => {
  const mockSession = {
    user: { id: '1', role: 'MANAGER' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('GET /api/clients', () => {
    it('returns clients for authenticated user', async () => {
      const mockClients = [
        { id: '1', companyName: 'Test Company', companyNumber: '12345678' }
      ]
      
      ;(prisma.client.findMany as jest.Mock).mockResolvedValue(mockClients)

      const req = createRequest({ method: 'GET' })
      const res = createResponse()

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        data: mockClients
      })
    })

    it('returns 401 for unauthenticated user', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = createRequest({ method: 'GET' })
      const res = createResponse()

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)
    })
  })
})
```

### E2E Testing Pattern
```typescript
// e2e/client-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/signin')
    await page.fill('[name="email"]', 'manager@numericalz.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should create a new client successfully', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.click('text=Add New Client')

    // Fill client onboarding form
    await page.fill('[name="companyName"]', 'Test Company Ltd')
    await page.fill('[name="companyNumber"]', '12345678')
    await page.selectOption('[name="companyType"]', 'LIMITED')
    
    await page.click('text=Next')
    
    // Fill contact information
    await page.fill('[name="contactName"]', 'John Doe')
    await page.fill('[name="contactEmail"]', 'john@testcompany.com')
    await page.fill('[name="contactPhone"]', '01234567890')
    
    await page.click('text=Save Client')

    // Verify client was created
    await expect(page.locator('text=Client created successfully')).toBeVisible()
    await expect(page.locator('text=Test Company Ltd')).toBeVisible()
  })

  test('should validate company number with Companies House', async ({ page }) => {
    await page.goto('/dashboard/clients/new')
    
    await page.fill('[name="companyNumber"]', '00000000')
    await page.blur('[name="companyNumber"]')
    
    await expect(page.locator('text=Company not found')).toBeVisible()
  })
})
```

## 🧩 Test Utilities & Mocks

### Mock Data Factory
```typescript
// test-utils/mocks.ts
import { Client, User, Task } from '@prisma/client'

export const mockUser: User = {
  id: '1',
  email: 'test@numericalz.com',
  name: 'Test User',
  role: 'MANAGER',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockClient: Client = {
  id: '1',
  companyName: 'Test Company Ltd',
  companyNumber: '12345678',
  companyType: 'LIMITED',
  contactName: 'John Doe',
  contactEmail: 'john@test.com',
  contactPhone: '01234567890',
  assignedUserId: '1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: '1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'PENDING',
  priority: 'MEDIUM',
  dueDate: new Date(),
  clientId: '1',
  assignedUserId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})
```

### Custom Render Function
```typescript
// test-utils/render.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <SessionProvider session={null}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

## 📋 Testing Protocols

### Pre-Commit Testing
```bash
# Run before every commit
npm run test:unit
npm run test:lint
npm run test:type-check
```

### Pre-Merge Testing
```bash
# Run before merging to main
npm run test:all
npm run test:e2e:ci
npm run test:coverage
```

### Testing Checklist

#### Unit Tests ✅
- [ ] All utility functions tested
- [ ] All custom hooks tested
- [ ] All components tested with different props
- [ ] Error states tested
- [ ] Loading states tested
- [ ] Edge cases covered

#### Integration Tests ✅
- [ ] All API endpoints tested
- [ ] Database operations tested
- [ ] Authentication middleware tested
- [ ] Authorization checks tested
- [ ] Error handling tested

#### E2E Tests ✅
- [ ] User authentication flow
- [ ] Client onboarding process
- [ ] Task management workflow
- [ ] Email communications
- [ ] Dashboard analytics
- [ ] Mobile responsiveness

### Performance Testing
```typescript
// performance/load-test.js
import { check } from 'k6'
import http from 'k6/http'

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
}

export default function () {
  let response = http.get('http://localhost:3000/api/clients')
  
  check(response, {
    'response code is 200': (res) => res.status === 200,
    'response time < 500ms': (res) => res.timings.duration < 500,
  })
}
```

## 🚨 Quality Gates

### Code Coverage Requirements
- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Minimum 85% for API routes
- **Critical Paths**: 100% coverage required

### Performance Benchmarks
- **API Response Time**: < 200ms average
- **Page Load Time**: < 3 seconds
- **Bundle Size**: < 500KB main bundle

### Security Testing
- [ ] SQL injection protection
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication bypass attempts
- [ ] Authorization escalation tests

## 🔄 Continuous Testing

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e:ci
      - run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 📊 Test Reporting

### Coverage Reports
- Generate HTML coverage reports
- Track coverage trends over time
- Block PRs with coverage regression

### Test Results Dashboard
- Visual test result tracking
- Performance regression alerts
- Flaky test identification

## 🎯 Testing Best Practices

### DO ✅
- Test behavior, not implementation
- Use descriptive test names
- Keep tests independent and isolated
- Mock external dependencies
- Test error scenarios
- Use data-testid for E2E stability
- Test accessibility compliance

### DON'T ❌
- Test implementation details
- Share state between tests
- Over-mock internal functions
- Write brittle E2E tests
- Ignore flaky tests
- Skip edge case testing
- Test styling directly

## 📚 Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices Guide](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Remember**: Testing is not just about catching bugs—it's about enabling confident refactoring, documenting expected behavior, and ensuring long-term maintainability of the codebase. 