#!/usr/bin/env node

/**
 * Invalidate All JWT Tokens Script
 * 
 * This script rotates the JWT secret to immediately invalidate all JWT tokens
 * This forces ALL users to re-authenticate immediately (doesn't wait for token expiry)
 * 
 * Usage: npm run invalidate-jwt-tokens
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function generateSecureSecret() {
  return crypto.randomBytes(64).toString('hex')
}

async function invalidateJWTTokens() {
  try {
    console.log('🔑 JWT Token invalidation started...')
    
    const envLocalPath = path.join(process.cwd(), '.env.local')
    const envPath = path.join(process.cwd(), '.env')
    
    // Generate new JWT secret
    const newSecret = generateSecureSecret()
    console.log('✅ Generated new JWT secret')
    
    // Read current env file
    let envContent = ''
    let envFilePath = envLocalPath
    
    if (fs.existsSync(envLocalPath)) {
      envContent = fs.readFileSync(envLocalPath, 'utf8')
    } else if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
      envFilePath = envPath
    } else {
      console.error('❌ No .env or .env.local file found')
      process.exit(1)
    }
    
    // Update NEXTAUTH_SECRET
    const lines = envContent.split('\n')
    let secretUpdated = false
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('NEXTAUTH_SECRET=')) {
        lines[i] = `NEXTAUTH_SECRET=${newSecret}`
        secretUpdated = true
        break
      }
    }
    
    // If NEXTAUTH_SECRET doesn't exist, add it
    if (!secretUpdated) {
      lines.push(`NEXTAUTH_SECRET=${newSecret}`)
    }
    
    // Write back to file
    fs.writeFileSync(envFilePath, lines.join('\n'))
    
    console.log('✅ Updated NEXTAUTH_SECRET in', envFilePath)
    console.log('🔑 All JWT tokens are now invalid')
    console.log('⚠️  ALL users must log in again immediately')
    console.log('🔄 Please restart the Next.js server for changes to take effect')
    console.log('')
    console.log('Next steps:')
    console.log('1. Restart the server: npm run dev')
    console.log('2. All users will be automatically logged out')
    console.log('3. Users must log in again with valid credentials')
    
  } catch (error) {
    console.error('❌ Error during JWT invalidation:', error)
    process.exit(1)
  }
}

// Run the script
invalidateJWTTokens() 