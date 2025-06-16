# Development Workflow - Numericalz Internal Application

## 🔄 Overview

This document outlines the development workflow, collaboration protocols, and continuous integration/deployment processes for the Numericalz Internal Management System.

## 🌿 Git Branching Strategy

### Branch Types

#### Main Branches
- **`main`** - Production-ready code, always deployable
- **`develop`** - Integration branch for features, pre-production testing

#### Supporting Branches
- **`feature/*`** - New features and enhancements
- **`bugfix/*`** - Bug fixes for develop branch
- **`hotfix/*`** - Critical fixes for production
- **`release/*`** - Prepare releases, final testing

### Branch Naming Conventions
```bash
# Feature branches
feature/client-onboarding-wizard
feature/task-analytics-dashboard
feature/email-template-system

# Bug fixes
bugfix/client-validation-error
bugfix/dashboard-loading-issue

# Hotfixes
hotfix/security-vulnerability-fix
hotfix/critical-data-corruption

# Releases
release/v1.0.0
release/v1.1.0-beta
```

## 🚀 Feature Development Workflow

### 1. Planning Phase
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/client-onboarding-wizard

# Link to issue/ticket
# Branch should reference: NMS-123 (Jira/GitHub issue)
```

### 2. Development Phase
```bash
# Make focused commits with conventional format
git add .
git commit -m "feat(clients): add company validation step to onboarding wizard

- Integrate Companies House API for real-time validation
- Add loading states and error handling
- Include company details auto-population

Closes NMS-123"

# Push regularly to backup work
git push -u origin feature/client-onboarding-wizard
```

### 3. Code Review Phase
```bash
# Create pull request when feature is complete
# PR template automatically filled
gh pr create --title "feat: Client Onboarding Wizard" --body-file .github/pull_request_template.md

# Address review feedback
git add .
git commit -m "fix(clients): address PR feedback on validation logic"
git push origin feature/client-onboarding-wizard
```

### 4. Integration Phase
```bash
# Merge to develop after approval
git checkout develop
git pull origin develop
git merge --no-ff feature/client-onboarding-wizard
git push origin develop

# Delete feature branch
git branch -d feature/client-onboarding-wizard
git push origin --delete feature/client-onboarding-wizard
```

## 📝 Commit Message Standards

### Conventional Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation changes
- **style**: Code formatting, missing semicolons, etc.
- **refactor**: Refactoring production code
- **test**: Adding or refactoring tests
- **chore**: Updating build tasks, package manager configs, etc.

### Scope Examples
- **auth**: Authentication and authorization
- **clients**: Client management features
- **tasks**: Task and deadline management
- **dashboard**: Analytics and reporting
- **ui**: User interface components
- **api**: API endpoints and middleware
- **db**: Database operations and migrations

### Commit Examples
```bash
# Good commits
git commit -m "feat(auth): implement role-based access control"
git commit -m "fix(clients): resolve validation error in company number field"
git commit -m "docs(api): update endpoint documentation for task management"
git commit -m "test(dashboard): add unit tests for analytics calculations"

# Bad commits (avoid these)
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "WIP"
```

## 🔍 Code Review Process

### Pull Request Template
```markdown
## 📋 Description
Brief description of changes and the problem they solve.

## 🔗 Related Issues
- Closes #123
- Related to #456

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## 📸 Screenshots (if applicable)
Before/After screenshots for UI changes

## ✅ Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No console.log statements left
- [ ] Environment variables documented

## 🚨 Breaking Changes
List any breaking changes and migration steps required.

## 📝 Additional Notes
Any additional information for reviewers.
```

### Review Guidelines

#### For Authors ✅
- **Self-review** your code before requesting review
- **Keep PRs small** (< 400 lines changed)
- **Write descriptive** PR titles and descriptions
- **Include tests** for new features and bug fixes
- **Update documentation** when necessary
- **Respond promptly** to review feedback
- **Test locally** before pushing changes

#### For Reviewers ✅
- **Review within 24 hours** of request
- **Focus on logic** and maintainability, not style
- **Test critical changes** locally
- **Provide constructive** feedback
- **Approve when confident** in the changes
- **Check for security** vulnerabilities
- **Verify test coverage** is adequate

### Review Checklist

#### Functionality ✅
- [ ] Code solves the intended problem
- [ ] Edge cases are handled properly
- [ ] Error handling is comprehensive
- [ ] Performance implications considered

#### Code Quality ✅
- [ ] Code is readable and well-structured
- [ ] Functions are focused and single-purpose
- [ ] Variables and functions are well-named
- [ ] Comments explain "why" not "what"

#### Security ✅
- [ ] Input validation is present
- [ ] No sensitive data exposed
- [ ] Authentication/authorization correct
- [ ] SQL injection protection in place

#### Testing ✅
- [ ] Adequate test coverage
- [ ] Tests are meaningful and focused
- [ ] Happy path and error cases tested
- [ ] No flaky or brittle tests

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint code
        run: npm run lint
      
      - name: Format check
        run: npm run format:check
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e:ci
        env:
          BASE_URL: http://localhost:3000

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Deployment Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run full test suite
        run: npm run test:all
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      - name: Run post-deployment tests
        run: npm run test:e2e:production
        env:
          BASE_URL: https://numericalz.vercel.app
      
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## 🏗️ Development Environment Setup

### Prerequisites
```bash
# Required software versions
node --version  # v18.0.0+
npm --version   # v9.0.0+
git --version   # v2.30.0+
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/numericalz/internal-app.git
cd internal-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Setup database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Daily Development Routine
```bash
# Start of day
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Development loop
npm run dev          # Start dev server
npm run test:watch   # Run tests in watch mode
npm run lint:fix     # Fix linting issues

# End of day
git add .
git commit -m "feat: work in progress on feature"
git push origin feature/your-feature-name
```

## 🔧 Development Scripts

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:unit": "jest --testPathPattern=.*\\.test\\.(ts|tsx)$",
    "test:integration": "jest --testPathPattern=.*\\.integration\\.test\\.(ts|tsx)$",
    "test:e2e": "playwright test",
    "test:e2e:ci": "playwright test --reporter=github",
    "test:coverage": "jest --coverage",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "prepare": "husky install"
  }
}
```

## 🪝 Git Hooks

### Pre-commit Hook
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run linting and formatting
npm run lint:fix
npm run format

# Run type checking
npm run type-check

# Run unit tests
npm run test:unit

# Add formatted files back to commit
git add .
```

### Pre-push Hook
```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run full test suite before pushing
npm run test:all
```

### Commit Message Hook
```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
npx commitlint --edit $1
```

## 📊 Workflow Metrics

### Key Performance Indicators
- **Lead Time**: Time from feature start to production
- **Deployment Frequency**: How often we deploy to production
- **Mean Time to Recovery**: How quickly we fix production issues
- **Change Failure Rate**: Percentage of deployments causing issues

### Tracking Tools
- **GitHub Insights**: PR metrics, commit frequency
- **Vercel Analytics**: Deployment success rates, performance
- **Jest Coverage**: Test coverage trends
- **ESLint Reports**: Code quality metrics

## 🚨 Incident Response Workflow

### Production Issues
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue-fix

# 2. Implement minimal fix
# Focus on resolution, not perfection

# 3. Test thoroughly
npm run test:all
npm run test:e2e

# 4. Deploy immediately
git add .
git commit -m "hotfix: resolve critical production issue"
git push origin hotfix/critical-issue-fix

# 5. Create emergency PR
gh pr create --title "HOTFIX: Critical Issue Resolution" --assignee @team

# 6. Merge and deploy
git checkout main
git merge hotfix/critical-issue-fix
git push origin main

# 7. Backport to develop
git checkout develop
git merge main
git push origin develop

# 8. Post-incident review
# Document lessons learned
```

## 👥 Team Collaboration

### Daily Standups
- **What did you work on yesterday?**
- **What are you working on today?**
- **Any blockers or concerns?**
- **Code review requests?**

### Weekly Planning
- **Sprint planning**: Feature prioritization
- **Technical debt review**: Code quality improvements
- **Architecture discussions**: System design decisions
- **Learning & development**: Skill improvement goals

### Code Review Etiquette
- **Be respectful** and constructive
- **Focus on the code**, not the person
- **Explain reasoning** behind suggestions
- **Ask questions** to understand context
- **Acknowledge good work** when you see it

## 📚 Resources & Tools

### Development Tools
- **VS Code Extensions**: ESLint, Prettier, GitLens, Tailwind CSS IntelliSense
- **Browser Extensions**: React DevTools, Redux DevTools
- **CLI Tools**: GitHub CLI, Vercel CLI

### Documentation
- [Git Flow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

**Remember**: A good workflow enables creativity and productivity while maintaining code quality and team collaboration. Adapt these guidelines as the team and project evolve. 