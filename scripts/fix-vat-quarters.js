const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Quarter group filing months mapping
const QUARTER_GROUPS = {
  '1_4_7_10': [2, 5, 8, 11], // Files in Feb, May, Aug, Nov
  '2_5_8_11': [3, 6, 9, 12], // Files in Mar, Jun, Sep, Dec  
  '3_6_9_12': [4, 7, 10, 1]  // Files in Apr, Jul, Oct, Jan
}

function calculateVATQuarter(quarterGroup, referenceDate = new Date()) {
  const londonDate = new Date(referenceDate.toLocaleString('en-US', { timeZone: 'Europe/London' }))
  const year = londonDate.getFullYear()
  const month = londonDate.getMonth() + 1 // JavaScript months are 0-indexed

  let quarterEndMonth
  let quarterEndYear = year

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
      throw new Error(`Invalid quarter group: ${quarterGroup}`)
  }

  // Calculate quarter end date (last day of the quarter month)
  const quarterEndDate = new Date(quarterEndYear, quarterEndMonth, 0) // Last day of quarterEndMonth

  // Calculate quarter start date
  const quarterStartMonth = quarterEndMonth - 2 // 2 months before end
  const quarterStartYear = quarterStartMonth > 0 ? quarterEndYear : quarterEndYear - 1
  const adjustedStartMonth = quarterStartMonth > 0 ? quarterStartMonth : quarterStartMonth + 12
  const quarterStartDate = new Date(quarterStartYear, adjustedStartMonth - 1, 1)

  // Calculate filing due date (last day of month following quarter end)
  const filingDueDate = new Date(quarterEndYear, quarterEndMonth + 1, 0)

  // Generate quarter period string
  const quarterPeriod = `${formatDate(quarterStartDate)}_to_${formatDate(quarterEndDate)}`

  return {
    quarterPeriod,
    quarterStartDate,
    quarterEndDate,
    filingDueDate,
    quarterGroup
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function fixVATQuarters() {
  console.log('🔧 Starting VAT quarters fix...')
  
  try {
    // Get all VAT-enabled clients with quarters
    const clients = await prisma.client.findMany({
      where: {
        isVatEnabled: true,
        vatQuarterGroup: { not: null }
      },
      include: {
        vatQuartersWorkflow: {
          orderBy: { quarterEndDate: 'desc' }
        }
      }
    })

    console.log(`Found ${clients.length} VAT-enabled clients to process`)

    for (const client of clients) {
      console.log(`\n📋 Processing client: ${client.clientCode} (${client.companyName})`)
      console.log(`   Quarter group: ${client.vatQuarterGroup}`)
      
      // Get current date for reference
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      
      // Find which quarter should be active based on filing month
      const filingMonths = QUARTER_GROUPS[client.vatQuarterGroup] || []
      
      let targetQuarterInfo
      if (filingMonths.includes(currentMonth)) {
        // Current month is a filing month - get the quarter that files this month
        const quarterEndMonth = currentMonth === 1 ? 12 : currentMonth - 1
        const quarterEndYear = currentMonth === 1 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()
        const quarterEndDate = new Date(quarterEndYear, quarterEndMonth - 1, 15)
        targetQuarterInfo = calculateVATQuarter(client.vatQuarterGroup, quarterEndDate)
      } else {
        // Not a filing month - get the current quarter
        targetQuarterInfo = calculateVATQuarter(client.vatQuarterGroup, currentDate)
      }

      console.log(`   Target quarter: ${targetQuarterInfo.quarterPeriod}`)
      console.log(`   Filing due: ${formatDate(targetQuarterInfo.filingDueDate)}`)

      // Check if correct quarter already exists
      const existingCorrectQuarter = client.vatQuartersWorkflow.find(
        q => q.quarterPeriod === targetQuarterInfo.quarterPeriod
      )

      if (existingCorrectQuarter) {
        console.log(`   ✅ Correct quarter already exists`)
        continue
      }

      // Find any incorrect quarters (e.g., Jun-Aug instead of Mar-May for June)
      const incorrectQuarters = client.vatQuartersWorkflow.filter(q => {
        // Check if this is a quarter that shouldn't exist yet
        const quarterEndDate = new Date(q.quarterEndDate)
        const quarterStartDate = new Date(q.quarterStartDate)
        
        // If the quarter hasn't ended yet but it's not the target quarter, it might be incorrect
        if (quarterEndDate > currentDate && q.quarterPeriod !== targetQuarterInfo.quarterPeriod) {
          return true
        }
        
        return false
      })

      if (incorrectQuarters.length > 0) {
        console.log(`   ⚠️  Found ${incorrectQuarters.length} incorrect quarters to remove:`)
        for (const incorrect of incorrectQuarters) {
          console.log(`      - ${incorrect.quarterPeriod}`)
          
          // Delete workflow history first
          await prisma.vATWorkflowHistory.deleteMany({
            where: { vatQuarterId: incorrect.id }
          })
          
          // Delete the quarter
          await prisma.vATQuarter.delete({
            where: { id: incorrect.id }
          })
        }
      }

      // Create the correct quarter
      console.log(`   ✨ Creating correct quarter: ${targetQuarterInfo.quarterPeriod}`)
      
      const newQuarter = await prisma.vATQuarter.create({
        data: {
          clientId: client.id,
          quarterPeriod: targetQuarterInfo.quarterPeriod,
          quarterStartDate: targetQuarterInfo.quarterStartDate,
          quarterEndDate: targetQuarterInfo.quarterEndDate,
          filingDueDate: targetQuarterInfo.filingDueDate,
          quarterGroup: targetQuarterInfo.quarterGroup,
          assignedUserId: null, // Each VAT quarter starts unassigned and independent
          currentStage: 'CLIENT_BOOKKEEPING',
          isCompleted: false
        }
      })

      // Create initial workflow history
      await prisma.vATWorkflowHistory.create({
        data: {
          vatQuarterId: newQuarter.id,
          toStage: 'CLIENT_BOOKKEEPING',
          stageChangedAt: new Date(),
          userId: null,
          userName: 'System',
          userEmail: 'system@numericalz.com',
          userRole: 'STAFF',
          notes: 'VAT quarter created by fix script - corrected to filing-based logic'
        }
      })

      console.log(`   ✅ Successfully created quarter ${targetQuarterInfo.quarterPeriod}`)
    }

    console.log('\n✨ VAT quarters fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing VAT quarters:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixVATQuarters()
  .then(() => {
    console.log('\n🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  }) 