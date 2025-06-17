#!/usr/bin/env node

/**
 * Cache Statistics Script
 * Displays current cache statistics and performance metrics
 */

const fs = require('fs')
const path = require('path')

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

async function getCacheStats() {
  console.log('🔍 Cache Statistics Report')
  console.log('='.repeat(50))
  
  // Next.js cache directory
  const nextCacheDir = path.join(process.cwd(), '.next', 'cache')
  
  // Initialize totals at function scope
  let totalSize = 0
  let fileCount = 0
  
  try {
    if (fs.existsSync(nextCacheDir)) {
      const stats = fs.statSync(nextCacheDir)
      console.log(`📁 Next.js Cache Directory: ${nextCacheDir}`)
      console.log(`📅 Last Modified: ${stats.mtime.toISOString()}`)
      
      function calculateDirSize(dirPath) {
        const items = fs.readdirSync(dirPath)
        for (const item of items) {
          const itemPath = path.join(dirPath, item)
          const itemStats = fs.statSync(itemPath)
          
          if (itemStats.isDirectory()) {
            calculateDirSize(itemPath)
          } else {
            totalSize += itemStats.size
            fileCount++
          }
        }
      }
      
      calculateDirSize(nextCacheDir)
      
      console.log(`📊 Cache Size: ${formatBytes(totalSize)}`)
      console.log(`📄 Files Cached: ${fileCount}`)
      
      // Check specific cache types
      const webpackCacheDir = path.join(nextCacheDir, 'webpack')
      const swcCacheDir = path.join(nextCacheDir, 'swc')
      
      if (fs.existsSync(webpackCacheDir)) {
        const webpackStats = fs.statSync(webpackCacheDir)
        console.log(`⚡ Webpack Cache: Available (${webpackStats.mtime.toISOString()})`)
      }
      
      if (fs.existsSync(swcCacheDir)) {
        const swcStats = fs.statSync(swcCacheDir)
        console.log(`🦀 SWC Cache: Available (${swcStats.mtime.toISOString()})`)
      }
      
    } else {
      console.log('❌ No Next.js cache directory found')
    }
  } catch (error) {
    console.error('❌ Error reading cache directory:', error.message)
  }
  
  // Check build cache
  const buildDir = path.join(process.cwd(), '.next')
  if (fs.existsSync(buildDir)) {
    try {
      let buildSize = 0
      let buildFiles = 0
      
      function calculateBuildSize(dirPath) {
        const items = fs.readdirSync(dirPath)
        for (const item of items) {
          if (item === 'cache') continue // Skip cache dir, already counted
          
          const itemPath = path.join(dirPath, item)
          const itemStats = fs.statSync(itemPath)
          
          if (itemStats.isDirectory()) {
            calculateBuildSize(itemPath)
          } else {
            buildSize += itemStats.size
            buildFiles++
          }
        }
      }
      
      calculateBuildSize(buildDir)
      
      console.log(`🏗️  Build Output Size: ${formatBytes(buildSize)}`)
      console.log(`📦 Build Files: ${buildFiles}`)
      
      // Check for bundle analyzer reports
      const analyzeDir = path.join(buildDir, 'analyze')
      if (fs.existsSync(analyzeDir)) {
        console.log('📈 Bundle Analysis: Available')
        const reports = fs.readdirSync(analyzeDir).filter(f => f.endsWith('.html'))
        console.log(`   Reports: ${reports.join(', ')}`)
      }
      
    } catch (error) {
      console.error('❌ Error reading build directory:', error.message)
    }
  }
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:')
  
  if (totalSize > 500 * 1024 * 1024) { // 500MB
    console.log('⚠️  Cache size is large (>500MB). Consider running cache:clear')
  } else if (totalSize > 100 * 1024 * 1024) { // 100MB
    console.log('ℹ️  Cache size is moderate (>100MB). Monitor growth')
  } else {
    console.log('✅ Cache size is optimal')
  }
  
  console.log('🔧 Available commands:')
  console.log('   npm run cache:clear  - Clear all caches')
  console.log('   npm run cache:warm   - Warm up caches')
  console.log('   npm run build:analyze - Generate bundle analysis')
  
}

// Run the script
getCacheStats().catch(console.error) 