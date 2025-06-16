import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * NextAuth API route handler
 * 
 * This handles all authentication-related API requests:
 * - Sign in/out
 * - Session management
 * - Callback handling
 * - Provider configuration
 */
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 