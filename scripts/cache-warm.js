#!/usr/bin/env node

/**
 * Cache Warm Script
 * Pre-warms caches by building common pages and components
 */

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${description}...`)
    
    const child = exec(command, { cwd: process.cwd() })
    
    child.stdout?.on('data', (data) => {
      // Only show important output, suppress verbose logs
      const output = data.toString().trim()
      if (output.includes('error') || output.includes('Error') || output.includes('warn')) {
        console.log(output)
      }
    })
    
    child.stderr?.on('data', (data) => {
      const output = data.toString().trim()
      if (output.includes('error') || output.includes('Error')) {
        console.error(output)
      }
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed`)
        resolve()
      } else {
        console.log(`⚠️  ${description} completed with warnings (code ${code})`)
        resolve() // Continue with warnings
      }
    })
    
    child.on('error', (error) => {
      console.error(`❌ ${description} failed:`, error.message)
      reject(error)
    })
  })
}

async function warmCaches() {
  console.log('🔥 Warming up caches for optimal performance...')
  console.log('='.repeat(50))
  
  const startTime = Date.now()
  
  try {
    // 1. Generate TypeScript types
    await runCommand('npx prisma generate', 'Generating Prisma client')
    
    // 2. Type check the entire project
    await runCommand('npx tsc --noEmit', 'Type checking project')
    
    // 3. Build the project to warm webpack cache
    await runCommand('npm run build', 'Building project (warming webpack cache)')
    
    // 4. Pre-compile commonly used dependencies
    console.log('🔄 Pre-compiling dependencies...')
    const commonDeps = [
      'react',
      'react-dom',
      'next',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      'lucide-react',
      'tailwindcss'
    ]
    
    for (const dep of commonDeps) {
      try {
        await runCommand(`node -e "require('${dep}')"`, `Pre-loading ${dep}`)
      } catch (error) {
        console.log(`ℹ️  ${dep} not available for pre-loading`)
      }
    }
    
    // 5. Warm up ESLint cache
    await runCommand('npm run lint', 'Warming ESLint cache')
    
    // 6. Generate bundle analysis for future reference
    console.log('🔄 Generating bundle analysis...')
    try {
      await runCommand('npm run build:analyze', 'Generating bundle analysis')
    } catch (error) {
      console.log('ℹ️  Bundle analysis skipped (optional)')
    }
    
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    console.log('\n🎉 Cache warming completed!')
    console.log(`⏱️  Total time: ${duration}s`)
    
    // Check cache sizes
    const cacheDir = path.join(process.cwd(), '.next', 'cache')
    if (fs.existsSync(cacheDir)) {
      let cacheSize = 0
      
      function calculateSize(dirPath) {
        const items = fs.readdirSync(dirPath)
        for (const item of items) {
          const itemPath = path.join(dirPath, item)
          const itemStats = fs.statSync(itemPath)
          
          if (itemStats.isDirectory()) {
            calculateSize(itemPath)
          } else {
            cacheSize += itemStats.size
          }
        }
      }
      
      try {
        calculateSize(cacheDir)
        const sizeMB = Math.round(cacheSize / (1024 * 1024))
        console.log(`💾 Cache size: ${sizeMB}MB`)
      } catch (error) {
        console.log('💾 Cache size: Unable to calculate')
      }
    }
    
    console.log('\n🚀 Performance benefits:')
    console.log('   ✅ Next development server will start faster')
    console.log('   ✅ TypeScript compilation will be quicker')
    console.log('   ✅ Webpack builds will use cached modules')
    console.log('   ✅ ESLint checks will run faster')
    
    console.log('\n💡 Next steps:')
    console.log('   npm run dev           - Start development with warm caches')
    console.log('   npm run cache:stats   - Check cache statistics')
    console.log('   npm run build         - Build with optimized caches')
    
  } catch (error) {
    console.error('\n❌ Cache warming failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Ensure all dependencies are installed: npm install')
    console.log('   2. Check for TypeScript errors: npm run type-check')
    console.log('   3. Verify database connection if using Prisma')
    console.log('   4. Run cache:clear and try again')
    
    process.exit(1)
  }
}

// Run the script
warmCaches().catch(console.error) 