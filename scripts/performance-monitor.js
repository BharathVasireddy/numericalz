const https = require('https')
const http = require('http')

/**
 * Performance Monitoring Script for Numericalz APIs
 * 
 * This script monitors API endpoints and tracks response times
 * to help identify performance bottlenecks.
 */

class PerformanceMonitor {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
    this.results = []
    this.startTime = Date.now()
  }

  async makeRequest(endpoint, options = {}) {
    const startTime = Date.now()
    const url = `${this.baseUrl}${endpoint}`
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http
      
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': options.cookie || '',
          ...options.headers
        }
      }, (res) => {
        const responseTime = Date.now() - startTime
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          this.results.push({
            endpoint,
            method: options.method || 'GET',
            statusCode: res.statusCode,
            responseTime,
            contentLength: data.length,
            cacheControl: res.headers['cache-control'],
            etag: res.headers['etag'],
            timestamp: new Date().toISOString()
          })
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: data.length > 0 ? JSON.parse(data) : null,
            headers: res.headers
          })
        })
      })
      
      req.on('error', (error) => {
        const responseTime = Date.now() - startTime
        this.results.push({
          endpoint,
          method: options.method || 'GET',
          statusCode: 0,
          responseTime,
          error: error.message,
          timestamp: new Date().toISOString()
        })
        reject(error)
      })
      
      if (options.body) {
        req.write(JSON.stringify(options.body))
      }
      
      req.end()
    })
  }

  async testEndpoint(endpoint, options = {}) {
    const iterations = options.iterations || 1
    const delay = options.delay || 100
    
    console.log(`🧪 Testing ${endpoint} (${iterations} iterations)...`)
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await this.makeRequest(endpoint, options)
        
        if (i === 0) {
          console.log(`   First response: ${result.responseTime}ms (${result.statusCode})`)
        }
        
        if (delay > 0 && i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`   Request ${i + 1} failed:`, error.message)
      }
    }
  }

  async runPerformanceTests() {
    console.log('🚀 Starting API Performance Tests...')
    console.log(`📍 Base URL: ${this.baseUrl}`)
    console.log(`🕐 Started at: ${new Date().toISOString()}`)
    console.log('')

    // Test critical endpoints
    const tests = [
      // Users API (frequently called)
      {
        endpoint: '/api/users?includeSelf=true',
        iterations: 5,
        delay: 50
      },
      
      // Client counts (slowest endpoint)
      {
        endpoint: '/api/clients/user-counts',
        iterations: 3,
        delay: 100
      },
      
      // Main clients list
      {
        endpoint: '/api/clients?active=true&sortBy=companyName&sortOrder=asc',
        iterations: 3,
        delay: 100
      },
      
      // VAT clients
      {
        endpoint: '/api/clients/vat-clients',
        iterations: 2,
        delay: 200
      },
      
      // Dashboard data
      {
        endpoint: '/api/dashboard/partner/test-user-id',
        iterations: 2,
        delay: 200
      }
    ]

    for (const test of tests) {
      await this.testEndpoint(test.endpoint, test)
      console.log('')
    }

    this.generateReport()
  }

  generateReport() {
    console.log('📊 Performance Test Results')
    console.log('=' .repeat(60))
    
    // Group results by endpoint
    const groupedResults = this.results.reduce((acc, result) => {
      const key = `${result.method} ${result.endpoint}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(result)
      return acc
    }, {})

    // Calculate statistics for each endpoint
    Object.entries(groupedResults).forEach(([endpoint, results]) => {
      const responseTimes = results
        .filter(r => r.statusCode > 0)
        .map(r => r.responseTime)
      
      if (responseTimes.length === 0) {
        console.log(`❌ ${endpoint}: All requests failed`)
        return
      }

      const avg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      const min = Math.min(...responseTimes)
      const max = Math.max(...responseTimes)
      const successRate = Math.round((responseTimes.length / results.length) * 100)
      
      let status = '✅'
      if (avg > 2000) status = '🚨' // Critical
      else if (avg > 1000) status = '⚠️' // Warning
      else if (avg > 500) status = '🔶' // Slow
      
      console.log(`${status} ${endpoint}:`)
      console.log(`   Average: ${avg}ms | Min: ${min}ms | Max: ${max}ms | Success: ${successRate}%`)
      
      // Check for caching headers
      const lastResult = results[results.length - 1]
      if (lastResult.cacheControl) {
        console.log(`   Cache-Control: ${lastResult.cacheControl}`)
      }
      if (lastResult.etag) {
        console.log(`   ETag: ${lastResult.etag}`)
      }
      
      console.log('')
    })

    // Overall summary
    const allResponseTimes = this.results
      .filter(r => r.statusCode > 0)
      .map(r => r.responseTime)
    
    if (allResponseTimes.length > 0) {
      const overallAvg = Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
      const totalDuration = Date.now() - this.startTime
      
      console.log('📈 Overall Summary:')
      console.log(`   Total test duration: ${totalDuration}ms`)
      console.log(`   Average response time: ${overallAvg}ms`)
      console.log(`   Total requests: ${this.results.length}`)
      console.log(`   Successful requests: ${allResponseTimes.length}`)
      
      // Performance recommendations
      console.log('')
      console.log('💡 Recommendations:')
      
      const slowEndpoints = Object.entries(groupedResults)
        .filter(([_, results]) => {
          const avgTime = results.reduce((acc, r) => acc + (r.responseTime || 0), 0) / results.length
          return avgTime > 1000
        })
        .map(([endpoint]) => endpoint)
      
      if (slowEndpoints.length > 0) {
        console.log('   📌 Optimize these slow endpoints:')
        slowEndpoints.forEach(endpoint => {
          console.log(`      - ${endpoint}`)
        })
      }
      
      const uncachedEndpoints = Object.entries(groupedResults)
        .filter(([_, results]) => !results[0].cacheControl)
        .map(([endpoint]) => endpoint)
      
      if (uncachedEndpoints.length > 0) {
        console.log('   📌 Add caching to these endpoints:')
        uncachedEndpoints.forEach(endpoint => {
          console.log(`      - ${endpoint}`)
        })
      }
    }
  }

  // Save results to file for analysis
  saveResults() {
    const fs = require('fs')
    const filename = `performance-results-${Date.now()}.json`
    fs.writeFileSync(filename, JSON.stringify({
      testRun: {
        startTime: this.startTime,
        endTime: Date.now(),
        baseUrl: this.baseUrl
      },
      results: this.results
    }, null, 2))
    console.log(`📁 Results saved to: ${filename}`)
  }
}

// Run the performance tests
async function main() {
  const monitor = new PerformanceMonitor()
  
  try {
    await monitor.runPerformanceTests()
    monitor.saveResults()
  } catch (error) {
    console.error('❌ Performance test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { PerformanceMonitor } 