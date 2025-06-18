#!/usr/bin/env node

/**
 * Force Logout All Users Script
 * 
 * This script clears all active sessions to force re-authentication
 * Use this when there are security concerns or when users need to be logged out immediately
 * 
 * Usage: npm run force-logout-all
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function forceLogoutAll() {
  try {
    console.log('🔒 Force logout all users started...')
    
    // Connect to database
    await prisma.$connect()
    
    // Clear all sessions from database
    const deletedSessions = await prisma.session.deleteMany({})
    console.log(`✅ Cleared ${deletedSessions.count} database sessions`)
    
    // Clear all accounts (OAuth sessions)
    const deletedAccounts = await prisma.account.deleteMany({})
    console.log(`✅ Cleared ${deletedAccounts.count} OAuth accounts`)
    
    // Log the forced logout activity
    await prisma.activityLog.create({
      data: {
        action: 'FORCE_LOGOUT_ALL',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          reason: 'Security measure - all users forced to re-authenticate',
          sessionsCleared: deletedSessions.count,
          accountsCleared: deletedAccounts.count,
        }),
      },
    })
    
    console.log('🔒 Force logout completed successfully!')
    console.log('⚠️  All users will need to log in again')
    console.log('💡 JWT tokens will expire naturally (max 8 hours)')
    
  } catch (error) {
    console.error('❌ Error during force logout:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
forceLogoutAll() 