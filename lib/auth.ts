import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// Define user roles as constants since SQLite doesn't support enums
export const USER_ROLES = {
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/**
 * NextAuth configuration for the Numericalz Internal Management System
 * 
 * OPTIMIZED FOR PERFORMANCE:
 * - Minimal database calls
 * - Fast session validation
 * - Streamlined authentication flow
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'Enter your email address'
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: 'Enter your password'
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // Single database query - no retry logic for speed
          const user = await db.user.findUnique({
            where: {
              email: credentials.email.toLowerCase().trim(),
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              isActive: true,
            },
          })

          if (!user) {
            throw new Error('Invalid email or password')
          }

          if (!user.isActive) {
            throw new Error('Account is deactivated. Please contact your administrator.')
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          
          if (!isPasswordValid) {
            throw new Error('Invalid email or password')
          }

          // Update last login (async, don't wait)
          db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }).catch(error => {
            console.error('Failed to update last login:', error)
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          throw error
        }
      }
    })
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // 1 hour
  },

  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user }) {
      // Persist user data in JWT
      if (user) {
        token.role = user.role
        token.id = user.id
        token.email = user.email
        token.name = user.name
        // Cache user validation timestamp to reduce database calls
        token.lastValidated = Date.now()
      }
      return token
    },

    async session({ session, token }) {
      // PERFORMANCE OPTIMIZED: Only validate user existence periodically
      if (session.user && token.id) {
        // Only validate user existence every 5 minutes instead of every request
        const lastValidated = token.lastValidated as number || 0
        const validationInterval = 5 * 60 * 1000 // 5 minutes
        const needsValidation = Date.now() - lastValidated > validationInterval

        if (needsValidation) {
          try {
            // Quick user existence check without full connection cycle
            const user = await db.user.findUnique({
              where: { id: token.id as string },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
              },
            })

            if (!user || !user.isActive) {
              throw new Error('User account no longer exists or is deactivated')
            }

            // Update token with fresh data
            token.email = user.email
            token.name = user.name
            token.role = user.role
            token.lastValidated = Date.now()
          } catch (error) {
            console.error('Session validation error:', error)
            throw new Error('Session validation failed')
          }
        }

        // Set session data from token (fast)
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Fast redirect logic
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`
      }
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },

  events: {
    async signOut({ token }) {
      // Log logout activity (async, don't block)
      if (token?.id) {
        db.activityLog.create({
          data: {
            userId: token.id as string,
            action: 'LOGOUT',
            details: JSON.stringify({
              timestamp: new Date().toISOString(),
            }),
          },
        }).catch(error => {
          console.error('Failed to log logout activity:', error)
        })
      }
    },
  },

  debug: false, // Disable debug for performance
} 