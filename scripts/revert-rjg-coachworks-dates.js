#!/usr/bin/env node

/**
 * Script to revert RJG COACHWORKS LTD dates to their original values
 * Company Number: 14199298
 * Company Name: RJG COACHWORKS LTD
 * 
 * Original dates:
 * - Year End: 30 Jun 2024
 * - Accounts Due: 31 Mar 2025
 * - Corporation Tax Due: 30 Jun 2025
 * 
 * Usage: node scripts/revert-rjg-coachworks-dates.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function revertRJGCoachworksDates() {
  try {
    console.log('🔄 Reverting RJG COACHWORKS LTD dates...')
    
    // Find the client
    const client = await prisma.client.findFirst({
      where: { companyNumber: '14199298' },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyNumber: true,
        nextYearEnd: true,
        nextAccountsDue: true,
        nextCorporationTaxDue: true
      }
    })

    if (!client) {
      console.log('❌ RJG COACHWORKS LTD not found with company number 14199298')
      return
    }

    console.log('📋 Current client data:')
    console.log(`   Client Code: ${client.clientCode}`)
    console.log(`   Company Name: ${client.companyName}`)
    console.log(`   Company Number: ${client.companyNumber}`)
    console.log(`   Current Year End: ${client.nextYearEnd}`)
    console.log(`   Current Accounts Due: ${client.nextAccountsDue}`)
    console.log(`   Current CT Due: ${client.nextCorporationTaxDue}`)

    // Revert to original dates
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        nextYearEnd: new Date('2024-06-30T00:00:00.000Z'),
        nextAccountsDue: new Date('2025-03-31T00:00:00.000Z'),
        nextCorporationTaxDue: new Date('2025-06-30T00:00:00.000Z')
      }
    })

    console.log('\n✅ Successfully reverted RJG COACHWORKS LTD dates!')
    console.log('📋 Updated client data:')
    console.log(`   Year End: ${updatedClient.nextYearEnd}`)
    console.log(`   Accounts Due: ${updatedClient.nextAccountsDue}`)
    console.log(`   Corporation Tax Due: ${updatedClient.nextCorporationTaxDue}`)

  } catch (error) {
    console.error('❌ Error reverting RJG COACHWORKS dates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
revertRJGCoachworksDates() 