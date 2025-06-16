# Contributing Guide - Numericalz Internal Application

## 🎯 Welcome Contributors!

Thank you for your interest in contributing to the Numericalz Internal Management System! This guide will help you get started and ensure smooth collaboration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git 2.30.0 or higher
- PostgreSQL 14+ (for local development)

### Initial Setup
```bash
# 1. Clone the repository
git clone https://github.com/numericalz/internal-app.git
cd internal-app

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Setup database
npm run db:migrate
npm run db:seed

# 5. Start development server
npm run dev
```

## 👥 Team Structure & Roles

### Core Team
- **Project Lead**: Overall project direction and architecture
- **Senior Developers**: Code review, mentoring, technical decisions
- **Developers**: Feature implementation, bug fixes
- **QA Engineer**: Testing, quality assurance

### Contribution Levels
- **New Contributors**: Documentation, small bug fixes, simple features
- **Regular Contributors**: Complex features, code reviews, mentoring
- **Core Contributors**: Architecture decisions, project planning

## 📋 How to Contribute

### Types of Contributions
1. **Bug Reports**: Help us identify and fix issues
2. **Feature Requests**: Suggest new functionality
3. **Code Contributions**: Implement features and fixes
4. **Documentation**: Improve guides and API docs
5. **Testing**: Add or improve test coverage
6. **Code Reviews**: Review pull requests from other contributors

### Contribution Workflow

#### 1. Find an Issue
```bash
# Browse issues labeled:
- "good first issue" (for new contributors)
- "help wanted" (need assistance)
- "bug" (bug fixes)
- "enhancement" (new features)
```

#### 2. Create a Branch
```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

#### 3. Make Changes
- Follow our [coding standards](#coding-standards)
- Write tests for new functionality
- Update documentation as needed
- Commit frequently with clear messages

#### 4. Test Your Changes
```bash
# Run all tests
npm run test:all

# Run linting
npm run lint

# Type check
npm run type-check

# Test in browser
npm run dev
```

#### 5. Submit Pull Request
```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR via GitHub CLI or web interface
gh pr create --title "feat: add client onboarding wizard" --body "Description of changes"
```

## 📝 Coding Standards

### TypeScript Guidelines
```typescript
// ✅ Good: Proper typing
interface ClientData {
  id: string
  companyName: string
  companyNumber: string
  contactEmail: string
}

async function fetchClient(id: string): Promise<ClientData> {
  const response = await fetch(`/api/clients/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch client: ${response.statusText}`)
  }
  return response.json()
}

// ❌ Bad: Using any type
function fetchClient(id: any): any {
  // Implementation
}
```

### React Component Guidelines
```typescript
// ✅ Good: Functional component with proper typing
interface ClientCardProps {
  client: Client
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  className?: string
}

export function ClientCard({ 
  client, 
  onEdit, 
  onDelete, 
  className 
}: ClientCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <h3>{client.companyName}</h3>
      <p>{client.companyNumber}</p>
      <div className="flex gap-2">
        <button onClick={() => onEdit(client.id)}>Edit</button>
        <button onClick={() => onDelete(client.id)}>Delete</button>
      </div>
    </div>
  )
}

// ❌ Bad: Inline styles, no proper typing
export function ClientCard(props: any) {
  return <div style={{background: 'white'}}>{props.client.name}</div>
}
```

### File Organization
```
components/
├── ui/              # Basic UI components (Button, Input, etc.)
├── forms/           # Form components
├── clients/         # Client-specific components
├── dashboard/       # Dashboard components
└── shared/          # Shared business components

lib/
├── auth.ts          # Authentication utilities
├── db.ts            # Database connection
├── utils.ts         # General utilities
├── validations.ts   # Zod schemas
└── hooks/           # Custom React hooks

app/
├── (auth)/          # Authentication routes
├── (dashboard)/     # Protected dashboard routes
├── api/             # API routes
└── globals.css      # Global styles
```

### Naming Conventions
```typescript
// Components: PascalCase
export function ClientManagement() {}

// Functions: camelCase
export function validateCompanyNumber() {}

// Constants: UPPER_SNAKE_CASE
export const API_ENDPOINTS = {
  CLIENTS: '/api/clients',
  TASKS: '/api/tasks'
}

// Types/Interfaces: PascalCase
interface UserProfile {
  id: string
  name: string
}

// Files: kebab-case
client-management.tsx
user-profile.types.ts
```

## 🧪 Testing Guidelines

### Writing Tests
```typescript
// components/ClientCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientCard } from './ClientCard'

describe('ClientCard', () => {
  const mockClient = {
    id: '1',
    companyName: 'Test Company',
    companyNumber: '12345678'
  }

  const mockProps = {
    client: mockClient,
    onEdit: jest.fn(),
    onDelete: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders client information', () => {
    render(<ClientCard {...mockProps} />)
    
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('12345678')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    render(<ClientCard {...mockProps} />)
    
    fireEvent.click(screen.getByText('Edit'))
    
    expect(mockProps.onEdit).toHaveBeenCalledWith('1')
  })
})
```

### Test Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Components**: Test all props and interactions
- **API Routes**: Test success and error cases
- **Utilities**: Test all functions and edge cases

## 📚 Documentation Standards

### Code Documentation
```typescript
/**
 * Validates a UK company number format and checks with Companies House API
 * @param companyNumber - 8-digit company number
 * @returns Promise resolving to company data or null if invalid
 * @throws Error if API request fails
 */
export async function validateCompanyNumber(
  companyNumber: string
): Promise<CompanyData | null> {
  // Implementation
}
```

### Component Documentation
```typescript
/**
 * ClientCard component displays client information with action buttons
 * 
 * @example
 * ```tsx
 * <ClientCard
 *   client={clientData}
 *   onEdit={(id) => handleEdit(id)}
 *   onDelete={(id) => handleDelete(id)}
 * />
 * ```
 */
export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  // Implementation
}
```

## 🔍 Code Review Process

### Submitting for Review
1. **Self-review** your code thoroughly
2. **Run all tests** and ensure they pass
3. **Update documentation** if needed
4. **Fill out PR template** completely
5. **Request review** from appropriate team members

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are present and meaningful
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Accessibility requirements met

### Addressing Feedback
```bash
# Make requested changes
git add .
git commit -m "fix: address PR feedback on validation logic"

# Push changes
git push origin feature/your-feature-name

# PR will automatically update
```

## 🚨 Issue Reporting

### Bug Reports
Use the bug report template:
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Chrome 95]
- Version: [e.g. v1.2.0]

## Screenshots
If applicable, add screenshots

## Additional Context
Any other relevant information
```

### Feature Requests
```markdown
## Feature Summary
Brief description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
Detailed description of the solution

## Alternatives Considered
Other solutions you've considered

## Additional Context
Mockups, examples, or other context
```

## 🎯 Development Workflow

### Daily Workflow
```bash
# Start of day
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/new-feature

# During development
npm run dev          # Start dev server
npm run test:watch   # Run tests in watch mode
npm run lint:fix     # Auto-fix linting issues

# Commit frequently
git add .
git commit -m "feat: add user validation"

# End of day
git push origin feature/new-feature
```

### Before Submitting PR
```bash
# Final checks
npm run test:all     # All tests pass
npm run lint         # No linting errors
npm run type-check   # No TypeScript errors
npm run build        # Build succeeds

# Update documentation
# Write meaningful commit messages
# Fill out PR template
```

## 🛠️ Useful Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues automatically
npm run type-check   # Run TypeScript compiler check
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:e2e     # Run end-to-end tests
```

### Database
```bash
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database
npm run db:seed      # Seed database with test data
npm run db:studio    # Open Prisma Studio
```

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Slack**: `#numericalz-dev` channel for real-time discussion
- **Email**: dev@numericalz.com for private matters

### Mentorship Program
New contributors are paired with experienced team members:
- **Onboarding buddy**: Helps with initial setup and questions
- **Code review mentor**: Provides detailed feedback on PRs
- **Technical mentor**: Guidance on architecture and best practices

## 📈 Contribution Recognition

### Recognition Levels
- **First-time Contributor**: Welcome badge and mention
- **Regular Contributor**: Contributor role and special mention
- **Top Contributor**: Recognition in release notes
- **Core Contributor**: Invitation to join core team

### Contribution Tracking
We track contributions through:
- Pull requests merged
- Issues resolved
- Code reviews performed
- Documentation improvements
- Community help provided

## 🎓 Learning Resources

### Project-Specific
- [Project Architecture](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Design System](./docs/DESIGN_SYSTEM.md)
- [Testing Strategy](./docs/TESTING_STRATEGY.md)

### Technology Stack
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🔒 Code of Conduct

### Our Standards
- **Be respectful**: Treat all contributors with respect
- **Be inclusive**: Welcome diverse perspectives and backgrounds
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Help others learn and grow
- **Be professional**: Maintain professional communication

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Publishing private information
- Disruptive behavior in discussions

### Reporting Issues
Contact the project maintainers at conduct@numericalz.com

---

**Remember**: Contributing to open source should be a positive experience. Don't hesitate to ask questions, and thank you for helping make Numericalz better! 