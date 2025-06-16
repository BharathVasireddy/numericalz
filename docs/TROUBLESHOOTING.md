# Troubleshooting Guide - Numericalz Internal Application

## 🔧 Common Issues & Solutions

This guide helps you resolve common issues encountered during development, testing, and deployment of the Numericalz Internal Management System.

## 🚀 Development Issues

### Node.js & npm Issues

#### Issue: `npm install` fails with permission errors
```bash
# Error
npm ERR! Error: EACCES: permission denied

# Solution 1: Use correct Node version
nvm use 18
npm install

# Solution 2: Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Solution 3: Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
```

#### Issue: "Module not found" errors
```typescript
// Error
Module '"@/components/ui/button"' not found

// Solution: Check tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

// Restart TypeScript server in VS Code
// Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
```

### Next.js Issues

#### Issue: `next dev` fails to start
```bash
# Error
Error: listen EADDRINUSE: address already in use :::3000

# Solution 1: Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Solution 2: Use different port
npm run dev -- -p 3001

# Solution 3: Find and kill Next.js processes
ps aux | grep next
kill -9 [process-id]
```

#### Issue: Hot reload not working
```bash
# Solution 1: Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Solution 2: Disable file watching optimizations
# next.config.js
module.exports = {
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  }
}
```

#### Issue: Build errors in production
```bash
# Error
Error: Minified React error #31

# Solution 1: Check for invalid HTML nesting
# React components must return valid HTML structure

# Solution 2: Check for client-side only code
# Use dynamic imports for client-only components
const ClientComponent = dynamic(() => import('./ClientComponent'), {
  ssr: false
})

# Solution 3: Environment variables missing
# Verify all required env vars are set in production
```

## 🗄️ Database Issues

### Prisma Issues

#### Issue: Database connection fails
```bash
# Error
Error: P1001: Can't reach database server

# Solution 1: Check DATABASE_URL format
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Solution 2: Verify PostgreSQL is running
# macOS with Homebrew
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Check connection manually
psql $DATABASE_URL
```

#### Issue: Migration fails
```bash
# Error
Error: P3009: migrate found failed migration

# Solution 1: Reset database (development only)
npm run db:reset

# Solution 2: Mark migration as applied
npx prisma migrate resolve --applied "migration_name"

# Solution 3: Fix migration file and rerun
npx prisma migrate dev
```

#### Issue: Prisma Client out of sync
```bash
# Error
Error: The current Prisma schema version is out of sync

# Solution: Regenerate Prisma Client
npx prisma generate

# If still failing, reinstall
rm -rf node_modules/.prisma
npm install
```

### Database Performance Issues

#### Issue: Slow queries
```typescript
// Problem: N+1 query issue
const clients = await prisma.client.findMany()
for (const client of clients) {
  const tasks = await prisma.task.findMany({ where: { clientId: client.id } })
}

// Solution: Use includes
const clientsWithTasks = await prisma.client.findMany({
  include: {
    tasks: true
  }
})
```

#### Issue: Connection pool exhausted
```bash
# Error
Error: P2037: Too many connections

# Solution: Optimize connection usage
# lib/db.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

// Use connection pooling in production
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=5"
```

## 🔐 Authentication Issues

### NextAuth.js Issues

#### Issue: Session not persisting
```bash
# Error
Session returns null after login

# Solution 1: Check NEXTAUTH_SECRET
NEXTAUTH_SECRET="your-secret-here"  # Required in production

# Solution 2: Check cookies settings
# lib/auth.ts
export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}
```

#### Issue: CSRF token mismatch
```bash
# Error
[next-auth][error][CSRF_TOKEN_MISMATCH]

# Solution 1: Check NEXTAUTH_URL
NEXTAUTH_URL="http://localhost:3000"  # Development
NEXTAUTH_URL="https://yourdomain.com"  # Production

# Solution 2: Clear browser cookies
# Developer tools > Application > Cookies > Clear all
```

## 🎨 UI/Styling Issues

### Tailwind CSS Issues

#### Issue: Styles not applying
```bash
# Error
Tailwind classes not working

# Solution 1: Check if Tailwind is imported
# app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# Solution 2: Verify tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
}

# Solution 3: Restart development server
npm run dev
```

#### Issue: Production build removes styles
```javascript
// tailwind.config.js - Enable JIT mode
module.exports = {
  mode: 'jit',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // Safelist dynamic classes
  safelist: [
    'bg-red-500',
    'bg-green-500',
    'text-blue-600'
  ]
}
```

### Responsive Design Issues

#### Issue: Mobile layout broken
```css
/* Problem: Fixed widths */
.container {
  width: 1200px;
}

/* Solution: Responsive design */
.container {
  @apply w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}
```

## 🧪 Testing Issues

### Jest/Testing Library Issues

#### Issue: Tests fail with module import errors
```bash
# Error
SyntaxError: Cannot use import statement outside a module

# Solution: Configure Jest for ES modules
# jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

#### Issue: Tests timeout
```bash
# Error
Timeout - Async callback was not invoked within the 5000ms timeout

# Solution 1: Increase timeout
describe('Slow tests', () => {
  jest.setTimeout(10000)
  
  it('should complete within timeout', async () => {
    // test implementation
  })
})

# Solution 2: Mock async operations
jest.mock('./api-calls', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mock' })
}))
```

### E2E Testing Issues

#### Issue: Playwright tests fail
```bash
# Error
Page crashed or browser not found

# Solution 1: Install browsers
npx playwright install

# Solution 2: Use different browser
# playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})

# Solution 3: Increase timeout
test.setTimeout(30000)
```

## 🚀 Deployment Issues

### Vercel Deployment Issues

#### Issue: Build fails on Vercel
```bash
# Error
Error: Command "npm run build" exited with 1

# Solution 1: Check build locally
npm run build

# Solution 2: Check environment variables
# Vercel dashboard > Project > Settings > Environment Variables

# Solution 3: Check Node version
# package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Issue: Database connection fails in production
```bash
# Error
Error: P1001: Can't reach database server

# Solution 1: Check database URL format
# Should include connection pooling for Vercel
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1"

# Solution 2: Verify database is accessible
# Test connection from Vercel's edge locations
```

### Environment Variable Issues

#### Issue: Environment variables not loading
```bash
# Error
process.env.VARIABLE_NAME is undefined

# Solution 1: Check variable naming (production)
# Production variables must be prefixed with NEXT_PUBLIC_ for client-side
NEXT_PUBLIC_API_URL="https://api.example.com"

# Solution 2: Restart development server
npm run dev

# Solution 3: Check .env file location
# Must be in project root directory
.env.local          # Local development
.env.production     # Production builds
```

## 📊 Performance Issues

### Slow Page Loading

#### Issue: Large JavaScript bundles
```bash
# Analyze bundle size
npm run analyze

# Solution 1: Code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
})

# Solution 2: Remove unused dependencies
npm uninstall unused-package
```

#### Issue: Slow API responses
```typescript
// Problem: Inefficient database queries
const clients = await prisma.client.findMany({
  include: {
    tasks: {
      include: {
        assignedUser: true
      }
    }
  }
})

// Solution: Select only needed fields
const clients = await prisma.client.findMany({
  select: {
    id: true,
    companyName: true,
    tasks: {
      select: {
        id: true,
        title: true,
        status: true
      }
    }
  }
})
```

## 🔍 Debugging Tools

### Browser DevTools
```javascript
// Debug React components
console.log('Component props:', props)

// Debug API calls
fetch('/api/endpoint')
  .then(res => {
    console.log('Response status:', res.status)
    return res.json()
  })
  .then(data => console.log('Response data:', data))
```

### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    }
  ]
}
```

### Network Issues
```bash
# Check if API endpoints are accessible
curl -X GET http://localhost:3000/api/health

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check DNS resolution
nslookup your-domain.com
```

## 📞 Getting Help

### Before Asking for Help
1. ✅ Check this troubleshooting guide
2. ✅ Search existing GitHub issues
3. ✅ Reproduce the issue consistently
4. ✅ Gather relevant error logs
5. ✅ Note your environment details

### Information to Include
```markdown
## Environment
- OS: [macOS 12.0 / Windows 11 / Ubuntu 20.04]
- Node.js: [version]
- npm: [version]
- Browser: [Chrome 95 / Safari 15 / Firefox 94]

## Steps to Reproduce
1. Step one
2. Step two
3. See error

## Expected vs Actual Behavior
- Expected: [what should happen]
- Actual: [what actually happens]

## Error Logs
```
[Paste relevant error messages]
```

## Additional Context
[Any other relevant information]
```

### Where to Get Help
- 🐛 **GitHub Issues**: Bug reports and feature requests
- 💬 **GitHub Discussions**: Questions and troubleshooting
- 📧 **Email**: dev@numericalz.com for urgent issues
- 📖 **Documentation**: Check project docs first

---

**Remember**: Most issues have been encountered before. Check existing documentation and issues before creating new ones. When reporting bugs, provide as much context as possible to help others help you quickly! 