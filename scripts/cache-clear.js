#!/usr/bin/env node

/**
 * Cache Clear Script
 * Clears all caches to free up space and ensure fresh builds
 */

const fs = require('fs')
const path = require('path')

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath)
    
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        removeDirectory(filePath)
      } else {
        fs.unlinkSync(filePath)
      }
    }
    
    fs.rmdirSync(dirPath)
    return true
  }
  return false
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getDirSize(dirPath) {
  let totalSize = 0
  
  if (!fs.existsSync(dirPath)) return 0
  
  function calculateSize(currentPath) {
    const items = fs.readdirSync(currentPath)
    for (const item of items) {
      const itemPath = path.join(currentPath, item)
      const itemStats = fs.statSync(itemPath)
      
      if (itemStats.isDirectory()) {
        calculateSize(itemPath)
      } else {
        totalSize += itemStats.size
      }
    }
  }
  
  try {
    calculateSize(dirPath)
  } catch (error) {
    // Ignore errors for inaccessible files
  }
  
  return totalSize
}

async function clearCaches() {
  console.log('🧹 Clearing all caches...')
  console.log('='.repeat(40))
  
  let totalFreed = 0
  let clearedCount = 0
  
  // Directories to clear
  const cacheDirs = [
    { path: path.join(process.cwd(), '.next'), name: 'Next.js Build & Cache' },
    { path: path.join(process.cwd(), 'node_modules', '.cache'), name: 'Node Modules Cache' },
    { path: path.join(process.cwd(), '.turbo'), name: 'Turbo Cache' },
    { path: path.join(process.cwd(), '.eslintcache'), name: 'ESLint Cache', isFile: true },
    { path: path.join(process.cwd(), 'coverage'), name: 'Test Coverage' },
  ]
  
  for (const { path: dirPath, name, isFile } of cacheDirs) {
    try {
      if (isFile) {
        if (fs.existsSync(dirPath)) {
          const size = fs.statSync(dirPath).size
          fs.unlinkSync(dirPath)
          totalFreed += size
          clearedCount++
          console.log(`✅ Cleared ${name}: ${formatBytes(size)}`)
        } else {
          console.log(`ℹ️  ${name}: Not found`)
        }
      } else {
        const size = getDirSize(dirPath)
        if (size > 0) {
          const removed = removeDirectory(dirPath)
          if (removed) {
            totalFreed += size
            clearedCount++
            console.log(`✅ Cleared ${name}: ${formatBytes(size)}`)
          } else {
            console.log(`⚠️  Failed to clear ${name}`)
          }
        } else {
          console.log(`ℹ️  ${name}: Not found or empty`)
        }
      }
    } catch (error) {
      console.log(`❌ Error clearing ${name}: ${error.message}`)
    }
  }
  
  // Clear npm/yarn cache (optional - requires user confirmation)
  console.log('\n🗑️  Package Manager Cache:')
  console.log('   To clear npm cache: npm cache clean --force')
  console.log('   To clear yarn cache: yarn cache clean')
  console.log('   To clear pnpm cache: pnpm store prune')
  
  // Summary
  console.log('\n📊 Summary:')
  console.log(`🧹 Cleared ${clearedCount} cache locations`)
  console.log(`💾 Freed up ${formatBytes(totalFreed)} of disk space`)
  
  if (totalFreed > 0) {
    console.log('\n✨ Cache clearing completed successfully!')
    console.log('💡 Next build will regenerate optimized caches')
  } else {
    console.log('\n✅ No caches found to clear')
  }
  
  // Recommendations
  console.log('\n🚀 Next steps:')
  console.log('   npm run build        - Create a fresh production build')
  console.log('   npm run cache:warm    - Pre-warm caches for faster development')
  console.log('   npm run cache:stats   - Check cache statistics')
}

// Run the script
clearCaches().catch(console.error) 