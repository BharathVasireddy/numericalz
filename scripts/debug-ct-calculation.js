#!/usr/bin/env node

/**
 * Debug CT Due Date Calculations
 * 
 * This script checks and fixes CT due date calculations for specific clients
 * to ensure they follow UK industry standards:
 * - CT due = 12 months after year end
 * - Year end = last accounts + 1 year (or accounting reference date)
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Calculate CT due date from year end (UK standard)
 * @param {Date} yearEndDate 
 * @returns {Date}
 */
function calculateCTDueFromYearEnd(yearEndDate) {
  const ctDue = new Date(yearEndDate)
  ctDue.setFullYear(ctDue.getFullYear() + 1)
  return ctDue
}

/**
 * Parse Companies House accounting reference date
 * @param {string} accountingReferenceDate 
 * @param {Date|null} lastAccountsMadeUpTo 
 * @returns {Date|null}
 */
function parseYearEnd(accountingReferenceDate, lastAccountsMadeUpTo = null, incorporationDate = null) {
  // If we have last accounts, calculate year end from that (established company)
  if (lastAccountsMadeUpTo) {
    const yearEnd = new Date(lastAccountsMadeUpTo)
    yearEnd.setFullYear(yearEnd.getFullYear() + 1)
    return yearEnd
  }
  
  // Otherwise use accounting reference date
  if (!accountingReferenceDate) return null
  
  try {
    const parsed = JSON.parse(accountingReferenceDate)
    if (parsed.day && parsed.month) {
      // For first-time filers, calculate the first year end after incorporation
      if (!lastAccountsMadeUpTo && incorporationDate) {
        const incorpDate = new Date(incorporationDate)
        if (!isNaN(incorpDate.getTime())) {
          const incorpYear = incorpDate.getFullYear()
          
          // Calculate first accounting reference date after incorporation
          let firstYearEnd = new Date(incorpYear, parseInt(parsed.month) - 1, parseInt(parsed.day))
          
          // UK Rule: First accounting period must be at least 6 months but can be up to 18 months
          // If the ARD in incorporation year is too close (less than 6 months), use next year
          const monthsDifference = (firstYearEnd.getTime() - incorpDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44) // Approximate months
          
          if (firstYearEnd <= incorpDate || monthsDifference < 6) {
            firstYearEnd.setFullYear(incorpYear + 1)
          }
          
          return firstYearEnd
        }
      }
      
      // Fallback for existing logic (established companies)
      const today = new Date()
      const currentYear = today.getFullYear()
      let yearEnd = new Date(currentYear, parseInt(parsed.month) - 1, parseInt(parsed.day))
      
      // If this year's year end has passed, use next year
      if (yearEnd <= today) {
        yearEnd.setFullYear(currentYear + 1)
      }
      
      return yearEnd
    }
  } catch (e) {
    console.warn('Error parsing accounting reference date:', e)
  }
  
  return null
}

async function debugClient(companyNumber) {
  console.log(`\n🔍 Debugging CT calculation for company ${companyNumber}...\n`)
  
  const client = await prisma.client.findFirst({
    where: { companyNumber },
    select: {
      id: true,
      clientCode: true,
      companyName: true,
      companyNumber: true,
      incorporationDate: true,
      lastAccountsMadeUpTo: true,
      accountingReferenceDate: true,
      nextCorporationTaxDue: true,
      corporationTaxPeriodEnd: true,
      corporationTaxStatus: true,
      ctDueSource: true,
      createdAt: true,
      updatedAt: true
    }
  })
  
  if (!client) {
    console.log(`❌ Client with company number ${companyNumber} not found`)
    return
  }
  
  console.log('📊 Current Client Data:')
  console.log(`   Company: ${client.companyName} (${client.clientCode})`)
  console.log(`   Incorporation Date: ${client.incorporationDate ? client.incorporationDate.toLocaleDateString('en-GB') : 'Not set'}`)
  console.log(`   Last Accounts: ${client.lastAccountsMadeUpTo ? client.lastAccountsMadeUpTo.toLocaleDateString('en-GB') : 'Not set'}`)
  console.log(`   Accounting Ref Date: ${client.accountingReferenceDate || 'Not set'}`)
  console.log(`   Current CT Due: ${client.nextCorporationTaxDue ? client.nextCorporationTaxDue.toLocaleDateString('en-GB') : 'Not set'}`)
  console.log(`   CT Period End: ${client.corporationTaxPeriodEnd ? client.corporationTaxPeriodEnd.toLocaleDateString('en-GB') : 'Not set'}`)
  console.log(`   CT Status: ${client.corporationTaxStatus || 'Not set'}`)
  console.log(`   CT Source: ${client.ctDueSource || 'Not set'}`)
  
  // Calculate what the year end should be (including first-time filer logic)
  const calculatedYearEnd = parseYearEnd(client.accountingReferenceDate, client.lastAccountsMadeUpTo, client.incorporationDate)
  
  if (!calculatedYearEnd) {
    console.log('\n❌ Cannot calculate year end - missing accounting reference date and last accounts')
    return
  }
  
  console.log(`\n🧮 Calculated Values:`)
  console.log(`   Year End: ${calculatedYearEnd.toLocaleDateString('en-GB')}`)
  
  // Calculate what CT due should be
  const calculatedCTDue = calculateCTDueFromYearEnd(calculatedYearEnd)
  console.log(`   CT Due (12 months after year end): ${calculatedCTDue.toLocaleDateString('en-GB')}`)
  
  // Compare with current stored value
  const currentCTDue = client.nextCorporationTaxDue
  const isCorrect = currentCTDue && Math.abs(currentCTDue.getTime() - calculatedCTDue.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
  
  console.log(`\n📝 Analysis:`)
  if (isCorrect) {
    console.log('   ✅ CT due date is CORRECT')
  } else {
    console.log('   ❌ CT due date is INCORRECT')
    console.log(`   Expected: ${calculatedCTDue.toLocaleDateString('en-GB')}`)
    console.log(`   Current:  ${currentCTDue ? currentCTDue.toLocaleDateString('en-GB') : 'Not set'}`)
    
    if (currentCTDue) {
      const daysDifference = Math.round((calculatedCTDue.getTime() - currentCTDue.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`   Difference: ${daysDifference} days`)
    }
  }
  
  return { client, calculatedYearEnd, calculatedCTDue, isCorrect }
}

async function fixClient(companyNumber) {
  const result = await debugClient(companyNumber)
  
  if (!result || result.isCorrect) {
    console.log('\n✅ No fix needed')
    return
  }
  
  const { client, calculatedYearEnd, calculatedCTDue } = result
  
  console.log('\n🔧 Fixing CT due date...')
  
  try {
    await prisma.client.update({
      where: { id: client.id },
      data: {
        nextCorporationTaxDue: calculatedCTDue,
        corporationTaxPeriodEnd: calculatedYearEnd,
        ctDueSource: 'AUTO',
        lastCTStatusUpdate: new Date(),
        ctStatusUpdatedBy: 'SYSTEM_FIX'
      }
    })
    
    console.log('✅ CT due date fixed successfully!')
    console.log(`   Updated CT Due: ${calculatedCTDue.toLocaleDateString('en-GB')}`)
    console.log(`   Updated Period End: ${calculatedYearEnd.toLocaleDateString('en-GB')}`)
    
  } catch (error) {
    console.error('❌ Error fixing CT due date:', error)
  }
}

async function scanAllClients() {
  console.log('🔍 Scanning all Ltd company clients for CT calculation issues...\n')
  
  const clients = await prisma.client.findMany({
    where: {
      companyType: 'LIMITED_COMPANY',
      isActive: true,
      nextCorporationTaxDue: { not: null }
    },
    select: {
      id: true,
      clientCode: true,
      companyName: true,
      companyNumber: true,
      incorporationDate: true,
      lastAccountsMadeUpTo: true,
      accountingReferenceDate: true,
      nextCorporationTaxDue: true,
    }
  })
  
  let issuesFound = 0
  const problematicClients = []
  
  for (const client of clients) {
    const calculatedYearEnd = parseYearEnd(client.accountingReferenceDate, client.lastAccountsMadeUpTo, client.incorporationDate)
    
    if (calculatedYearEnd) {
      const calculatedCTDue = calculateCTDueFromYearEnd(calculatedYearEnd)
      const currentCTDue = client.nextCorporationTaxDue
      const isCorrect = currentCTDue && Math.abs(currentCTDue.getTime() - calculatedCTDue.getTime()) < 24 * 60 * 60 * 1000
      
      if (!isCorrect) {
        issuesFound++
        const daysDifference = currentCTDue 
          ? Math.round((calculatedCTDue.getTime() - currentCTDue.getTime()) / (1000 * 60 * 60 * 24))
          : 'N/A'
        
        problematicClients.push({
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyNumber: client.companyNumber,
          expected: calculatedCTDue.toLocaleDateString('en-GB'),
          current: currentCTDue ? currentCTDue.toLocaleDateString('en-GB') : 'Not set',
          difference: daysDifference
        })
        
        console.log(`❌ ${client.clientCode} - ${client.companyName}`)
        console.log(`   Expected: ${calculatedCTDue.toLocaleDateString('en-GB')}`)
        console.log(`   Current:  ${currentCTDue ? currentCTDue.toLocaleDateString('en-GB') : 'Not set'}`)
        console.log(`   Difference: ${daysDifference} days\n`)
      }
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total Ltd companies checked: ${clients.length}`)
  console.log(`   Issues found: ${issuesFound}`)
  
  if (issuesFound > 0) {
    console.log(`\n⚠️  Clients with incorrect CT due dates:`)
    problematicClients.forEach(client => {
      console.log(`   ${client.clientCode} (${client.companyNumber}): Expected ${client.expected}, Current ${client.current}`)
    })
  }
  
  return problematicClients
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const companyNumber = args[1]
  
  try {
    switch (command) {
      case 'debug':
        if (!companyNumber) {
          console.log('Usage: npm run debug-ct debug <company_number>')
          process.exit(1)
        }
        await debugClient(companyNumber)
        break
        
      case 'fix':
        if (!companyNumber) {
          console.log('Usage: npm run debug-ct fix <company_number>')
          process.exit(1)
        }
        await fixClient(companyNumber)
        break
        
      case 'scan':
        await scanAllClients()
        break
        
      default:
        console.log('Available commands:')
        console.log('  npm run debug-ct debug <company_number>  - Debug specific client')
        console.log('  npm run debug-ct fix <company_number>    - Fix specific client')
        console.log('  npm run debug-ct scan                    - Scan all clients')
        console.log('')
        console.log('Example:')
        console.log('  npm run debug-ct debug 15170062')
        break
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 