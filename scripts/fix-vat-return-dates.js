const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Calculate correct VAT filing due date
function calculateVATFilingDueDate(quarterGroup, referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1 // JavaScript months are 0-indexed

  let quarterEndMonth
  let quarterEndYear = year

  // Determine current quarter end month based on quarter group
  switch (quarterGroup) {
    case "1_4_7_10":
      if (month <= 1) {
        quarterEndMonth = 1 // January
      } else if (month <= 4) {
        quarterEndMonth = 4 // April
      } else if (month <= 7) {
        quarterEndMonth = 7 // July
      } else if (month <= 10) {
        quarterEndMonth = 10 // October
      } else {
        quarterEndMonth = 1 // January of next year
        quarterEndYear = year + 1
      }
      break

    case "2_5_8_11":
      if (month <= 2) {
        quarterEndMonth = 2 // February
      } else if (month <= 5) {
        quarterEndMonth = 5 // May
      } else if (month <= 8) {
        quarterEndMonth = 8 // August
      } else if (month <= 11) {
        quarterEndMonth = 11 // November
      } else {
        quarterEndMonth = 2 // February of next year
        quarterEndYear = year + 1
      }
      break

    case "3_6_9_12":
      if (month <= 3) {
        quarterEndMonth = 3 // March
      } else if (month <= 6) {
        quarterEndMonth = 6 // June
      } else if (month <= 9) {
        quarterEndMonth = 9 // September
      } else if (month <= 12) {
        quarterEndMonth = 12 // December
      } else {
        quarterEndMonth = 3 // March of next year
        quarterEndYear = year + 1
      }
      break

    default:
      return null
  }

  // Calculate quarter end date (last day of the quarter month)
  const quarterEndDate = new Date(quarterEndYear, quarterEndMonth, 0)

  // Calculate filing due date (last day of month following quarter end)
  // UK VAT Rule: Filing due by last day of month following quarter end
  const filingDueDate = new Date(quarterEndDate)
  filingDueDate.setMonth(filingDueDate.getMonth() + 2) // Add 2 months
  filingDueDate.setDate(0) // Set to day 0 which gives last day of previous month (the filing month)

  return filingDueDate
}

async function fixVATReturnDates() {
  console.log('🔧 Starting VAT return date fix...')

  try {
    // Find all VAT-enabled clients with quarterly returns
    const clients = await prisma.client.findMany({
      where: {
        isVatEnabled: true,
        vatReturnsFrequency: 'QUARTERLY',
        vatQuarterGroup: {
          not: null
        }
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        vatQuarterGroup: true,
        nextVatReturnDue: true
      }
    })

    console.log(`📊 Found ${clients.length} VAT-enabled clients with quarterly returns`)

    let fixedCount = 0
    let errorCount = 0

    for (const client of clients) {
      try {
        const correctDueDate = calculateVATFilingDueDate(client.vatQuarterGroup)
        
        if (!correctDueDate) {
          console.log(`⚠️  Skipping ${client.clientCode} - ${client.companyName}: Invalid quarter group`)
          errorCount++
          continue
        }

        const currentDueDate = client.nextVatReturnDue ? new Date(client.nextVatReturnDue) : null
        const needsUpdate = !currentDueDate || 
          currentDueDate.toDateString() !== correctDueDate.toDateString()

        if (needsUpdate) {
          await prisma.client.update({
            where: { id: client.id },
            data: { nextVatReturnDue: correctDueDate }
          })

          console.log(`✅ Fixed ${client.clientCode} - ${client.companyName}:`)
          console.log(`   Quarter Group: ${client.vatQuarterGroup}`)
          console.log(`   Old date: ${currentDueDate ? currentDueDate.toDateString() : 'None'}`)
          console.log(`   New date: ${correctDueDate.toDateString()}`)
          fixedCount++
        } else {
          console.log(`✓  ${client.clientCode} - ${client.companyName}: Already correct`)
        }
      } catch (error) {
        console.error(`❌ Error fixing ${client.clientCode} - ${client.companyName}:`, error.message)
        errorCount++
      }
    }

    console.log('\n📈 Summary:')
    console.log(`   Total clients checked: ${clients.length}`)
    console.log(`   Dates fixed: ${fixedCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log('✨ VAT return date fix completed!')

  } catch (error) {
    console.error('❌ Error during VAT return date fix:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixVATReturnDates()
  .catch(error => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }) 