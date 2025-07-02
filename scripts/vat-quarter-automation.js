/**
 * VAT Quarter Automation System
 * 
 * Handles automated VAT quarter transitions and partner notifications
 * Runs daily to check for quarters that need to transition from WAITING_FOR_QUARTER_END to PAPERWORK_PENDING_CHASE
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// London timezone utility function
function toLondonTime(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/London' }))
}

/**
 * Check and transition VAT quarters that have passed their quarter end date
 */
async function checkVATQuarterTransitions() {
  console.log('🔍 Checking VAT quarter transitions...')
  
  try {
    const londonNow = toLondonTime(new Date())
    console.log(`📅 Current London time: ${londonNow.toLocaleString('en-GB', { timeZone: 'Europe/London' })}`)
    
    // Find VAT quarters that need to transition
    const quartersToTransition = await prisma.vATQuarter.findMany({
      where: {
        currentStage: 'WAITING_FOR_QUARTER_END',
        isCompleted: false,
        quarterEndDate: {
          lt: londonNow // Quarter end date has passed
        }
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            vatQuarterGroup: true,
            email: true
          }
        }
      }
    })
    
    console.log(`📊 Found ${quartersToTransition.length} quarters ready for transition`)
    
    if (quartersToTransition.length === 0) {
      console.log('✅ No VAT quarters need transition')
      return { transitioned: 0, notified: 0 }
    }
    
    let transitioned = 0
    const notificationPromises = []
    
    for (const quarter of quartersToTransition) {
      try {
        // Update quarter to PAPERWORK_PENDING_CHASE
        await prisma.vATQuarter.update({
          where: { id: quarter.id },
          data: {
            currentStage: 'PAPERWORK_PENDING_CHASE',
            updatedAt: londonNow
          }
        })
        
        // Create workflow history entry
        await prisma.vATWorkflowHistory.create({
          data: {
            vatQuarterId: quarter.id,
            fromStage: 'WAITING_FOR_QUARTER_END',
            toStage: 'PAPERWORK_PENDING_CHASE',
            stageChangedAt: londonNow,
            userId: null,
            userName: 'System Auto-Update',
            userEmail: 'system@numericalz.com',
            userRole: 'SYSTEM',
            notes: `Automatically transitioned to pending chase - quarter end date (${quarter.quarterEndDate.toLocaleDateString('en-GB')}) passed`
          }
        })
        
        // Log activity
        await prisma.activityLog.create({
          data: {
            userId: null,
            action: 'VAT_QUARTER_AUTO_TRANSITIONED',
            details: JSON.stringify({
              vatQuarterId: quarter.id,
              clientId: quarter.client.id,
              clientCode: quarter.client.clientCode,
              companyName: quarter.client.companyName,
              quarterPeriod: quarter.quarterPeriod,
              quarterGroup: quarter.client.vatQuarterGroup,
              quarterEndDate: quarter.quarterEndDate.toISOString(),
              transitionedAt: londonNow.toISOString()
            })
          }
        })
        
        console.log(`   ✅ ${quarter.client.clientCode} (${quarter.client.companyName}): ${quarter.quarterPeriod} → PAPERWORK_PENDING_CHASE`)
        transitioned++
        
        // Queue partner notification (we'll send notifications after all transitions)
        notificationPromises.push(
          sendVATTransitionNotification(quarter, londonNow)
        )
        
      } catch (error) {
        console.error(`   ❌ Failed to transition quarter ${quarter.id} for ${quarter.client.clientCode}:`, error.message)
      }
    }
    
    // Send all notifications
    let notified = 0
    if (notificationPromises.length > 0) {
      console.log(`📧 Sending ${notificationPromises.length} partner notifications...`)
      const notificationResults = await Promise.allSettled(notificationPromises)
      
      notificationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          notified++
        } else {
          console.error(`   ❌ Failed to send notification for quarter ${quartersToTransition[index].id}:`, result.reason)
        }
      })
    }
    
    console.log(`\n🎯 Summary:`)
    console.log(`   📊 Transitions: ${transitioned}/${quartersToTransition.length}`)
    console.log(`   📧 Notifications: ${notified}/${notificationPromises.length}`)
    
    return { transitioned, notified }
    
  } catch (error) {
    console.error('❌ VAT quarter transition check failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Send email notification to partners about VAT quarter transition
 */
async function sendVATTransitionNotification(quarter, transitionTime) {
  try {
    // Get all active partners for notification
    const partners = await prisma.user.findMany({
      where: {
        role: 'PARTNER',
        isActive: true,
        userSettings: {
          emailNotifications: true // Only send to partners who want email notifications
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
    
    if (partners.length === 0) {
      console.log(`   ⚠️ No active partners found for notification`)
      return false
    }
    
    // Calculate quarter end and filing due dates for email
    const quarterEndDate = new Date(quarter.quarterEndDate)
    const quarterEndFormatted = quarterEndDate.toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric',
      timeZone: 'Europe/London'
    })
    
    // Calculate filing due date (last day of month following quarter end)
    const filingDueDate = new Date(quarterEndDate)
    filingDueDate.setMonth(filingDueDate.getMonth() + 1)
    filingDueDate.setDate(0) // Last day of the month
    const filingDueFormatted = filingDueDate.toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric',
      timeZone: 'Europe/London'
    })
    
    // Send notification to all partners
    const emailPromises = partners.map(partner => 
      sendPartnerNotificationEmail(partner, quarter, quarterEndFormatted, filingDueFormatted, transitionTime)
    )
    
    await Promise.allSettled(emailPromises)
    console.log(`   📧 Sent transition notifications to ${partners.length} partners for ${quarter.client.clientCode}`)
    
    return true
    
  } catch (error) {
    console.error(`   ❌ Failed to send transition notification for quarter ${quarter.id}:`, error.message)
    return false
  }
}

/**
 * Send individual email notification to partner
 */
async function sendPartnerNotificationEmail(partner, quarter, quarterEndFormatted, filingDueFormatted, transitionTime) {
  const emailSubject = `VAT Quarter Ready for Chase - ${quarter.client.companyName} (${quarter.client.clientCode})`
  
  const emailBody = `
Dear ${partner.name},

A VAT quarter has automatically transitioned and is now ready for partner review and assignment.

Client Details:
• Company: ${quarter.client.companyName}
• Client Code: ${quarter.client.clientCode}
• Quarter Period: ${quarter.quarterPeriod.replace(/_to_/g, ' to ').replace(/_/g, '/')}
• Quarter End Date: ${quarterEndFormatted}
• Filing Due Date: ${filingDueFormatted}

Status Change:
• From: Waiting for Quarter End
• To: Paperwork Pending Chase
• Transition Time: ${transitionTime.toLocaleString('en-GB', { timeZone: 'Europe/London' })}

Action Required:
This VAT quarter is now available for assignment and chase initiation. Please review and assign to an appropriate team member for processing.

Access the VAT deadlines dashboard at: https://app.numericalz.com/dashboard/clients/vat-dt

Best regards,
Numericalz Automation System
`
  
  // Log the email (using the existing email logging system)
  await prisma.emailLog.create({
    data: {
      recipientEmail: partner.email,
      recipientName: partner.name,
      fromEmail: 'system@numericalz.com',
      fromName: 'Numericalz Automation',
      subject: emailSubject,
      content: emailBody,
      emailType: 'VAT_QUARTER_TRANSITION',
      status: 'PENDING',
      clientId: quarter.client.id,
      triggeredBy: partner.id,
      workflowType: 'VAT',
      workflowId: quarter.id
    }
  })
  
  console.log(`     📧 Queued notification email for ${partner.name} (${partner.email})`)
  
  // Note: The actual email sending would be handled by your email service
  // This logs the email to the database for processing by the email queue system
  
  return true
}

/**
 * Auto-assign transitioned quarters to partners (enhanced version)
 */
async function autoAssignTransitionedQuarters() {
  console.log('🎯 Checking for unassigned VAT quarters ready for partner assignment...')
  
  try {
    const londonNow = toLondonTime(new Date())
    const currentMonth = londonNow.getMonth() + 1
    
    // Get VAT quarters that are in PAPERWORK_PENDING_CHASE but not assigned
    const unassignedQuarters = await prisma.vATQuarter.findMany({
      where: {
        currentStage: 'PAPERWORK_PENDING_CHASE',
        assignedUserId: null,
        isCompleted: false
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            vatQuarterGroup: true,
            email: true
          }
        }
      }
    })
    
    if (unassignedQuarters.length === 0) {
      console.log('✅ No unassigned VAT quarters found')
      return { assigned: 0 }
    }
    
    // Get active partners for assignment
    const partners = await prisma.user.findMany({
      where: {
        role: 'PARTNER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
    
    if (partners.length === 0) {
      console.log('⚠️ No active partners found for assignment')
      return { assigned: 0 }
    }
    
    console.log(`📊 Found ${unassignedQuarters.length} unassigned quarters and ${partners.length} active partners`)
    
    let assigned = 0
    let partnerIndex = 0
    
    for (const quarter of unassignedQuarters) {
      try {
        const assignedPartner = partners[partnerIndex]
        
        // Update quarter with partner assignment
        await prisma.vATQuarter.update({
          where: { id: quarter.id },
          data: {
            assignedUserId: assignedPartner.id,
            chaseStartedDate: londonNow,
            chaseStartedByUserId: assignedPartner.id,
            chaseStartedByUserName: assignedPartner.name,
            updatedAt: londonNow
          }
        })
        
        // Create workflow history entry
        await prisma.vATWorkflowHistory.create({
          data: {
            vatQuarterId: quarter.id,
            fromStage: null,
            toStage: 'PAPERWORK_PENDING_CHASE',
            stageChangedAt: londonNow,
            userId: assignedPartner.id,
            userName: assignedPartner.name,
            userEmail: assignedPartner.email,
            userRole: 'PARTNER',
            notes: `Auto-assigned to Partner after quarter end transition`
          }
        })
        
        // Log activity
        await prisma.activityLog.create({
          data: {
            userId: assignedPartner.id,
            action: 'VAT_QUARTER_AUTO_ASSIGNED_POST_TRANSITION',
            details: JSON.stringify({
              vatQuarterId: quarter.id,
              clientId: quarter.client.id,
              clientCode: quarter.client.clientCode,
              companyName: quarter.client.companyName,
              quarterPeriod: quarter.quarterPeriod,
              quarterGroup: quarter.client.vatQuarterGroup,
              assignedAt: londonNow.toISOString(),
              autoAssignedAfterTransition: true
            })
          }
        })
        
        console.log(`   ✅ Assigned ${quarter.client.clientCode} (${quarter.quarterPeriod}) to ${assignedPartner.name}`)
        assigned++
        
        // Send assignment notification to the specific partner
        await sendAssignmentNotificationEmail(assignedPartner, quarter, londonNow)
        
        // Round-robin to next partner
        partnerIndex = (partnerIndex + 1) % partners.length
        
      } catch (error) {
        console.error(`   ❌ Failed to assign quarter ${quarter.id}:`, error.message)
      }
    }
    
    console.log(`🎯 Auto-assigned ${assigned}/${unassignedQuarters.length} VAT quarters to partners`)
    return { assigned }
    
  } catch (error) {
    console.error('❌ Auto-assignment failed:', error)
    throw error
  }
}

/**
 * Send assignment notification to specific partner
 */
async function sendAssignmentNotificationEmail(partner, quarter, assignmentTime) {
  const emailSubject = `VAT Quarter Assigned - ${quarter.client.companyName} (${quarter.client.clientCode})`
  
  const quarterEndDate = new Date(quarter.quarterEndDate)
  const quarterEndFormatted = quarterEndDate.toLocaleDateString('en-GB', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric',
    timeZone: 'Europe/London'
  })
  
  const filingDueDate = new Date(quarterEndDate)
  filingDueDate.setMonth(filingDueDate.getMonth() + 1)
  filingDueDate.setDate(0)
  const filingDueFormatted = filingDueDate.toLocaleDateString('en-GB', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric',
    timeZone: 'Europe/London'
  })
  
  const emailBody = `
Dear ${partner.name},

A VAT quarter has been automatically assigned to you for processing.

Client Details:
• Company: ${quarter.client.companyName}
• Client Code: ${quarter.client.clientCode}
• Quarter Period: ${quarter.quarterPeriod.replace(/_to_/g, ' to ').replace(/_/g, '/')}
• Quarter End Date: ${quarterEndFormatted}
• Filing Due Date: ${filingDueFormatted}

Assignment Details:
• Assigned To: ${partner.name}
• Assignment Time: ${assignmentTime.toLocaleString('en-GB', { timeZone: 'Europe/London' })}
• Status: Paperwork Pending Chase

Next Steps:
1. Review the VAT quarter requirements
2. Initiate client chase for paperwork
3. Update the workflow status as you progress

Access the VAT workflow at: https://app.numericalz.com/dashboard/clients/vat-dt

Best regards,
Numericalz Automation System
`
  
  // Log the assignment email
  await prisma.emailLog.create({
    data: {
      recipientEmail: partner.email,
      recipientName: partner.name,
      fromEmail: 'system@numericalz.com',
      fromName: 'Numericalz Automation',
      subject: emailSubject,
      content: emailBody,
      emailType: 'VAT_QUARTER_ASSIGNMENT',
      status: 'PENDING',
      clientId: quarter.client.id,
      triggeredBy: partner.id,
      workflowType: 'VAT',
      workflowId: quarter.id
    }
  })
  
  console.log(`     📧 Queued assignment notification for ${partner.name}`)
}

// Export functions for use in cron jobs
module.exports = {
  checkVATQuarterTransitions,
  autoAssignTransitionedQuarters
}

// Allow direct execution
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Running VAT quarter automation...')
      
      const transitionResults = await checkVATQuarterTransitions()
      
      console.log('\n📊 Automation Summary:')
      console.log(`   🔄 Transitions: ${transitionResults.transitioned}`)
      console.log(`   📧 Notifications: ${transitionResults.notified}`)
      console.log('   📝 Note: Quarters remain unassigned for manual partner assignment')
      console.log('\n✅ VAT quarter automation completed successfully')
      
      // Optional: Run auto-assignment if requested via command line argument
      if (process.argv.includes('--auto-assign')) {
        console.log('\n🎯 Running auto-assignment (requested via --auto-assign flag)...')
        const assignmentResults = await autoAssignTransitionedQuarters()
        console.log(`   🎯 Assignments: ${assignmentResults.assigned}`)
      }
      
    } catch (error) {
      console.error('❌ VAT quarter automation failed:', error)
      process.exit(1)
    }
  })()
} 