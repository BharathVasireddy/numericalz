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
 * Features:
 * - Email/password authentication with bcrypt
 * - Prisma adapter for session management
 * - Role-based access control (Manager/Staff)
 * - Secure session configuration
 * - Custom login pages
 * - Improved error handling for serverless environments
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
          // Ensure database connection
          await db.$connect()
          
          // Find user by email with retry logic
          let user = null
          let retryCount = 0
          const maxRetries = 3
          
          while (!user && retryCount < maxRetries) {
            try {
              user = await db.user.findUnique({
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
              break
            } catch (dbError) {
              retryCount++
              console.error(`Database query attempt ${retryCount} failed:`, dbError)
              
              if (retryCount >= maxRetries) {
                throw new Error('Database connection failed after multiple attempts')
              }
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
              
              // Reconnect to database
              await db.$disconnect()
              await db.$connect()
            }
          }

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

          // Log successful login attempt and update last login with retry logic
          try {
            await Promise.all([
              db.activityLog.create({
                data: {
                  userId: user.id,
                  action: 'LOGIN',
                  
                  details: JSON.stringify({
                    email: user.email,
                    timestamp: new Date().toISOString(),
                  }),
                },
              }),
              db.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
              })
            ])
          } catch (logError) {
            console.error('Failed to log login activity:', logError)
            // Don't fail authentication if logging fails
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          
          // Log failed login attempt (if we can identify the user)
          if (credentials.email) {
            try {
              await db.activityLog.create({
                data: {
                  action: 'LOGIN',
                  
                  details: JSON.stringify({
                    email: credentials.email,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                    success: false,
                  }),
                },
              })
            } catch (logError) {
              console.error('Failed to log login attempt:', logError)
            }
          }

          throw error
        } finally {
          // Clean up connection
          try {
            await db.$disconnect()
          } catch (disconnectError) {
            console.error('Failed to disconnect from database:', disconnectError)
          }
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
      }
      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },

  events: {
    async signOut({ token }) {
      // Log logout activity
      if (token?.id) {
        try {
          await db.$connect()
          await db.activityLog.create({
            data: {
              userId: token.id as string,
              action: 'LOGOUT',
              
              details: JSON.stringify({
                timestamp: new Date().toISOString(),
              }),
            },
          })
        } catch (error) {
          console.error('Failed to log logout activity:', error)
        } finally {
          try {
            await db.$disconnect()
          } catch (disconnectError) {
            console.error('Failed to disconnect from database:', disconnectError)
          }
        }
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
} 