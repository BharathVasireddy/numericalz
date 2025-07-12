import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateVATQuarter } from '@/lib/vat-workflow'
import { toLondonTime } from '@/lib/london-time'
import { emailService } from '@/lib/email-service'

/**
 * VAT Quarter Auto-Creation TEST API
 * 
 * FOR LOCAL TESTING ONLY - Allows date simulation
 * Query parameters:
 * - simulatedDate: ISO date string to simulate (e.g., "2024-07-01")
 * - skipEmails: "true" to skip sending actual emails
 */

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const simulatedDateStr = searchParams.get('simulatedDate')
    const skipEmails = searchParams.get('skipEmails') === 'true'

    console.log('🧪 VAT AUTO-CREATE TEST MODE')
    console.log(`📅 Simulated Date: ${simulatedDateStr || 'Current date'}`)
    console.log(`📧 Skip Emails: ${skipEmails}`)

    const results = await autoCreateVATQuartersTest(simulatedDateStr, skipEmails)
    
    console.log('✅ VAT quarter auto-creation test completed:', results)
    
    return NextResponse.json({
      success: true,
      message: `TEST: Successfully processed ${results.processed} clients. Created ${results.created} quarters, sent ${results.emailsSent} emails.`,
      testMode: true,
      simulatedDate: simulatedDateStr || new Date().toISOString(),
      skipEmails,
      details: results
    })
    
  } catch (error) {
    console.error('❌ VAT auto-creation test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Auto-creation test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        testMode: true
      },
      { status: 500 }
    )
  }
}

async function autoCreateVATQuartersTest(simulatedDateStr: string | null, skipEmails: boolean = false) {
  // Use simulated date or current date
  const simulatedDate = simulatedDateStr ? new Date(simulatedDateStr) : new Date()
  const londonNow = toLondonTime(simulatedDate)
  
  const results = {
    processed: 0,
    created: 0,
    emailsSent: 0,
    skipped: 0,
    errors: [] as Array<{ clientId: string; companyName: string; error: string }>,
    quarterDetails: [] as Array<{ 
      clientId: string; 
      companyName: string; 
      action: string; 
      quarterPeriod?: string;
      assignedTo?: string;
      reason?: string;
    }>
  }
  
  console.log(`📅 Processing VAT quarters for simulated date: ${londonNow.toISOString()}`)
  
  // Get all VAT-enabled clients
  const vatClients = await db.client.findMany({
    where: { 
      isVatEnabled: true,
      vatQuarterGroup: { not: null }
    },
    include: { 
      vatQuartersWorkflow: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  
  console.log(`📊 Found ${vatClients.length} VAT-enabled clients`)
  
  for (const client of vatClients) {
    results.processed++
    
    try {
      // Check if we should create a quarter for this client today
      const shouldCreate = await shouldCreateQuarterToday(client, londonNow)
      
      if (shouldCreate.create && shouldCreate.quarterInfo) {
        // Get the last assigned user for this client
        const lastAssignedUser = await getLastAssignedUser(client.id)
        
        // Create the new quarter
        const newQuarter = await createVATQuarter(client, shouldCreate.quarterInfo, lastAssignedUser)
        
        results.created++
        results.quarterDetails.push({
          clientId: client.id,
          companyName: client.companyName,
          action: 'CREATED',
          quarterPeriod: shouldCreate.quarterInfo.quarterPeriod,
          assignedTo: lastAssignedUser?.name || 'Unassigned'
        })
        
        console.log(`✅ Created quarter for ${client.companyName} (${client.clientCode}) - ${shouldCreate.quarterInfo.quarterPeriod}`)
        
        // Send assignment email if there was a previous assignee (unless skipEmails is true)
        if (lastAssignedUser && !skipEmails) {
          try {
            await sendAssignmentNotification(lastAssignedUser, newQuarter, client)
            results.emailsSent++
            console.log(`📧 Sent assignment email to ${lastAssignedUser.name}`)
          } catch (emailError) {
            console.error(`❌ Failed to send email to ${lastAssignedUser.name}:`, emailError)
            const lastDetail = results.quarterDetails[results.quarterDetails.length - 1]
            if (lastDetail) {
              lastDetail.assignedTo += ' (Email Failed)'
            }
          }
        } else if (lastAssignedUser && skipEmails) {
          console.log(`📧 Email SKIPPED for ${lastAssignedUser.name} (test mode)`)
        }
        
      } else {
        results.skipped++
        results.quarterDetails.push({
          clientId: client.id,
          companyName: client.companyName,
          action: 'SKIPPED',
          reason: shouldCreate.reason
        })
        console.log(`⏭️  Skipped ${client.companyName}: ${shouldCreate.reason}`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${client.companyName}:`, error)
      results.errors.push({
        clientId: client.id,
        companyName: client.companyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return results
}

// Copy the helper functions from the main auto-create route
async function shouldCreateQuarterToday(client: any, londonNow: Date) {
  // Check if today is the 1st of the month
  if (londonNow.getDate() !== 1) {
    return { create: false, reason: 'Not the 1st of the month' }
  }
  
  // Calculate what quarter should have ended yesterday (last day of previous month)
  const yesterday = new Date(londonNow)
  yesterday.setDate(0) // Last day of previous month
  
  // Check if this client's quarter group had a quarter ending yesterday
  const quarterInfo = calculateQuarterThatEndedOn(client.vatQuarterGroup, yesterday)
  
  if (!quarterInfo) {
    return { create: false, reason: 'No quarter ended yesterday for this client' }
  }
  
  // Check if this quarter already exists
  const existingQuarter = client.vatQuartersWorkflow.find((q: any) => 
    q.quarterPeriod === quarterInfo.quarterPeriod
  )
  
  if (existingQuarter) {
    return { create: false, reason: 'Quarter already exists' }
  }
  
  return { create: true, quarterInfo, reason: 'Quarter needs creation' }
}

function calculateQuarterThatEndedOn(quarterGroup: string, date: Date) {
  // Map quarter groups to their quarter end months
  const quarterEndMonths = {
    '1_4_7_10': [1, 4, 7, 10],    // Jan, Apr, Jul, Oct
    '2_5_8_11': [2, 5, 8, 11],    // Feb, May, Aug, Nov  
    '3_6_9_12': [3, 6, 9, 12]     // Mar, Jun, Sep, Dec
  }
  
  const endMonths = quarterEndMonths[quarterGroup as keyof typeof quarterEndMonths]
  if (!endMonths) return null
  
  const month = date.getMonth() + 1 // Convert to 1-based month
  
  // Check if the given date's month is a quarter end month for this group
  if (!endMonths.includes(month)) {
    return null
  }
  
  // Calculate the quarter that ended on this date
  return calculateVATQuarter(quarterGroup, date)
}

async function getLastAssignedUser(clientId: string) {
  const lastAssignedQuarter = await db.vATQuarter.findFirst({
    where: {
      clientId,
      assignedUserId: { not: null }
    },
    include: {
      assignedUser: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return lastAssignedQuarter?.assignedUser || null
}

async function createVATQuarter(client: any, quarterInfo: any, assignedUser: any) {
  const newQuarter = await db.vATQuarter.create({
    data: {
      clientId: client.id,
      quarterPeriod: quarterInfo.quarterPeriod,
      quarterStartDate: quarterInfo.quarterStartDate,
      quarterEndDate: quarterInfo.quarterEndDate,
      filingDueDate: quarterInfo.filingDueDate,
      quarterGroup: quarterInfo.quarterGroup,
      assignedUserId: assignedUser?.id || null,
      currentStage: 'PAPERWORK_PENDING_CHASE',
      isCompleted: false
    }
  })
  
  // Create workflow history entry
  await db.vATWorkflowHistory.create({
    data: {
      vatQuarterId: newQuarter.id,
      toStage: 'PAPERWORK_PENDING_CHASE',
      stageChangedAt: new Date(),
      userId: null,
      userName: 'System Auto-Creation (TEST)',
      userEmail: 'system@numericalz.com',
      userRole: 'SYSTEM',
      notes: `VAT quarter auto-created on ${new Date().toISOString()} (TEST MODE). ${assignedUser ? `Assigned to ${assignedUser.name} based on previous quarter assignment.` : 'No previous assignment found.'}`
    }
  })
  
  return newQuarter
}

async function sendAssignmentNotification(user: any, quarter: any, client: any) {
  const subject = `[TEST] New VAT Quarter Assigned - ${client.companyName} (${client.clientCode})`
  
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #856404;">🧪 TEST MODE - VAT Quarter Assignment</h3>
        <p style="margin: 5px 0 0 0; color: #856404;">This is a test notification from the VAT automation system.</p>
      </div>
      
      <h2 style="color: #333;">New VAT Quarter Assignment</h2>
      
      <p>Dear ${user.name},</p>
      
      <p>A new VAT quarter has been automatically created and assigned to you based on your previous assignment for this client.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Client Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Company:</strong> ${client.companyName}</li>
          <li><strong>Client Code:</strong> ${client.clientCode}</li>
          <li><strong>Quarter Period:</strong> ${quarter.quarterPeriod}</li>
          <li><strong>Filing Due Date:</strong> ${new Date(quarter.filingDueDate).toLocaleDateString('en-GB')}</li>
        </ul>
      </div>
      
      <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Assignment Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Assigned To:</strong> ${user.name}</li>
          <li><strong>Created:</strong> ${new Date().toLocaleDateString('en-GB')}</li>
          <li><strong>Status:</strong> Paperwork Pending Chase</li>
        </ul>
      </div>
      
      <p>Next steps:</p>
      <ol>
        <li>Review the VAT quarter requirements</li>
        <li>Initiate client chase for paperwork</li>
        <li>Update the workflow status as you progress</li>
      </ol>
      
      <p style="margin: 30px 0;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard/clients/vat-dt" 
           style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Access VAT Workflow
        </a>
      </p>
      
      <p>Best regards,<br>
      Numericalz Automation System (Test Mode)</p>
    </div>
  `
  
  await emailService.sendEmail({
    to: [{ email: user.email, name: user.name }],
    subject,
    htmlContent: content,
    emailType: 'VAT_QUARTER_AUTO_ASSIGNMENT_TEST'
  })
} 