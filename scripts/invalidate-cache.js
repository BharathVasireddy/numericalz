#!/usr/bin/env node

/**
 * CACHE INVALIDATION SCRIPT
 * 
 * Use this script to invalidate caches after production deployments
 * or when you need real-time updates to show immediately.
 * 
 * Usage:
 * npm run cache-clear            # Clear all caches
 * npm run cache-clear dashboard  # Clear only dashboard caches
 * npm run cache-clear clients    # Clear only client caches
 */

const https = require('https')
const http = require('http')

// Configuration
const PRODUCTION_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const API_ENDPOINT = '/api/dashboard/invalidate-cache'

// Parse command line arguments
const scope = process.argv[2] || 'all'
const userId = process.argv[3] || null

console.log('🧹 Cache Invalidation Script')
console.log('============================')
console.log(`Target: ${PRODUCTION_URL}`)
console.log(`Scope: ${scope}`)
console.log(`User ID: ${userId || 'all'}`)
console.log('')

// Prepare request data
const postData = JSON.stringify({
  scope: scope,
  userId: userId
})

// Parse URL
const url = new URL(PRODUCTION_URL + API_ENDPOINT)
const isHttps = url.protocol === 'https:'

// Request options
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Numericalz-Cache-Invalidator/1.0'
  }
}

// Make request
const request = (isHttps ? https : http).request(options, (response) => {
  let data = ''

  response.on('data', (chunk) => {
    data += chunk
  })

  response.on('end', () => {
    try {
      const result = JSON.parse(data)
      
      if (result.success) {
        console.log('✅ Cache invalidation successful!')
        console.log(`📊 Invalidated ${result.invalidatedCount} cache entries`)
        console.log(`🎯 Scope: ${result.scope}`)
        console.log(`👤 User: ${result.userId}`)
        console.log(`⏰ Timestamp: ${result.timestamp}`)
        console.log('')
        console.log('🚀 Production dashboard should now show latest data!')
        process.exit(0)
      } else {
        console.error('❌ Cache invalidation failed:')
        console.error(result.error)
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ Failed to parse response:')
      console.error(data)
      process.exit(1)
    }
  })
})

request.on('error', (error) => {
  console.error('❌ Request failed:')
  console.error(error.message)
  
  if (error.code === 'ECONNREFUSED') {
    console.log('')
    console.log('💡 Troubleshooting:')
    console.log('1. Make sure the server is running')
    console.log('2. Check the NEXTAUTH_URL environment variable')
    console.log('3. Verify the API endpoint is accessible')
  }
  
  process.exit(1)
})

// Send request
request.write(postData)
request.end()

console.log('⏳ Sending cache invalidation request...') 