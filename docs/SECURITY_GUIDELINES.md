# Security Guidelines - Numericalz Internal Application

## 🔒 Overview

This document outlines comprehensive security guidelines for the Numericalz Internal Management System, ensuring data protection, regulatory compliance, and threat mitigation.

## 🛡️ Authentication & Authorization

### NextAuth.js Security
```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !user.password) return null
        
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.role = user.role
      }
      // Handle session updates
      if (trigger === 'update' && session?.name) {
        token.name = session.name
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
}
```

### Password Security
```typescript
// lib/password.ts
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character')

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### Role-Based Access Control
```typescript
// lib/rbac.ts
export enum UserRole {
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export const permissions = {
  [UserRole.MANAGER]: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:delete',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'analytics:read'
  ],
  [UserRole.STAFF]: [
    'clients:read',
    'clients:update',
    'tasks:read',
    'tasks:update'
  ]
}

export function hasPermission(userRole: UserRole, permission: string): boolean {
  return permissions[userRole]?.includes(permission) ?? false
}
```

## 🔐 API Security

### Input Validation
```typescript
// lib/validation.ts
import { z } from 'zod'

export const clientCreateSchema = z.object({
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(255, 'Company name too long')
    .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Invalid company name format'),
  companyNumber: z.string()
    .regex(/^[0-9]{8}$/, 'Company number must be 8 digits'),
  contactEmail: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  contactPhone: z.string()
    .regex(/^[\+]?[0-9\s\-\(\)]{10,15}$/, 'Invalid phone format')
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}
```

### SQL Injection Prevention
```typescript
// Always use Prisma for database operations
// Prisma provides built-in SQL injection protection

// ✅ GOOD - Using Prisma
const client = await prisma.client.findFirst({
  where: {
    companyNumber: userInput
  }
})

// ❌ BAD - Raw SQL with user input
const result = await prisma.$queryRaw`
  SELECT * FROM clients WHERE company_number = ${userInput}
`
```

### Rate Limiting
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
})

// Usage in API routes
export async function withRateLimit(request: Request, handler: Function) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  return handler()
}
```

## 🔒 Data Protection

### Environment Variables
```bash
# .env.example
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/numericalz"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# Companies House API
COMPANIES_HOUSE_API_KEY="your-api-key-here"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key" # Generate with: openssl rand -hex 32
```

### Data Encryption
```typescript
// lib/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = process.env.ENCRYPTION_KEY!

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, SECRET_KEY)
  cipher.setAAD(iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  
  const decipher = crypto.createDecipher(ALGORITHM, SECRET_KEY)
  decipher.setAAD(iv)
  decipher.setAuthTag(tag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

### GDPR Compliance
```typescript
// lib/gdpr.ts
export interface DataProcessingConsent {
  userId: string
  consentType: 'marketing' | 'analytics' | 'functional'
  granted: boolean
  grantedAt: Date
  ipAddress: string
}

export async function recordConsent(consent: DataProcessingConsent) {
  await prisma.dataConsent.create({
    data: consent
  })
}

export async function deleteUserData(userId: string) {
  // Anonymize or delete user data
  await prisma.$transaction([
    prisma.client.updateMany({
      where: { assignedUserId: userId },
      data: { assignedUserId: null }
    }),
    prisma.task.updateMany({
      where: { assignedUserId: userId },
      data: { assignedUserId: null }
    }),
    prisma.user.delete({
      where: { id: userId }
    })
  ])
}
```

## 🌐 Client-Side Security

### XSS Prevention
```typescript
// components/SafeHtml.tsx
import DOMPurify from 'isomorphic-dompurify'

interface SafeHtmlProps {
  html: string
  className?: string
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  })
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
```

### Content Security Policy
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              font-src 'self';
              connect-src 'self' https://api.companieshouse.gov.uk;
              frame-ancestors 'none';
            `.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

## 📊 Security Monitoring

### Audit Logging
```typescript
// lib/audit.ts
export interface AuditLog {
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
}

export async function logAuditEvent(event: AuditLog) {
  await prisma.auditLog.create({
    data: event
  })
}

// Middleware for API routes
export function withAuditLog(handler: Function) {
  return async (req: Request, res: Response) => {
    const session = await getServerSession(authOptions)
    
    if (session?.user) {
      await logAuditEvent({
        userId: session.user.id,
        action: req.method || 'UNKNOWN',
        resource: req.url || 'UNKNOWN',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      })
    }
    
    return handler(req, res)
  }
}
```

## 🚨 Incident Response

### Security Breach Protocol
1. **Immediate Response** (0-15 minutes)
   - Isolate affected systems
   - Preserve evidence
   - Notify incident response team
   - Begin containment procedures

2. **Assessment** (15-60 minutes)
   - Determine scope of breach
   - Identify affected data
   - Assess ongoing threats
   - Document findings

3. **Containment** (1-4 hours)
   - Stop ongoing unauthorized access
   - Patch vulnerabilities
   - Reset compromised credentials
   - Implement additional monitoring

4. **Recovery** (4-24 hours)
   - Restore systems from clean backups
   - Verify system integrity
   - Implement additional security measures
   - Resume normal operations

5. **Lessons Learned** (1-7 days)
   - Conduct post-incident review
   - Update security procedures
   - Improve monitoring and detection
   - Train staff on new procedures

## 🔧 Security Tools & Dependencies

### Recommended Security Tools
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "next-auth": "^4.24.5",
    "zod": "^3.22.4",
    "@upstash/ratelimit": "^0.4.4",
    "helmet": "^7.1.0",
    "isomorphic-dompurify": "^2.6.0"
  },
  "devDependencies": {
    "eslint-plugin-security": "^1.7.1",
    "@next/bundle-analyzer": "^14.0.4"
  }
}
```

### Security Checklist

#### Development ✅
- [ ] Input validation on all user inputs
- [ ] SQL injection protection via Prisma
- [ ] XSS prevention with proper sanitization
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Environment variables secured
- [ ] Dependencies regularly updated
- [ ] Security linting enabled

#### Deployment ✅
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Database access restricted
- [ ] API keys rotated regularly
- [ ] Monitoring and alerting active
- [ ] Backup and recovery tested
- [ ] Incident response plan ready

## 📚 Security Resources

### External References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Guidelines](https://nextjs.org/docs/advanced-features/security-headers)
- [GDPR Compliance Guide](https://gdpr.eu/compliance/)
- [UK Data Protection Act](https://www.gov.uk/data-protection)

### Regular Security Tasks
- **Daily**: Monitor audit logs and alerts
- **Weekly**: Review access permissions
- **Monthly**: Update dependencies and scan vulnerabilities
- **Quarterly**: Conduct security assessments and penetration testing
- **Annually**: Review and update security policies

---

**Remember**: Security is not a one-time implementation but an ongoing process. Regular reviews, updates, and training are essential for maintaining a secure application. 