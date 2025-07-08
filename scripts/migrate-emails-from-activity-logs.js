const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateEmailsFromActivityLogs() {
  console.log('🔄 Starting email migration from activity logs...')
  
  try {
    // Step 1: Find all email-related activity logs
    const emailActivities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { action: 'EMAIL_SENT' },
          { action: 'EMAIL_FAILED' },
          { action: 'EMAIL_DELIVERED' },
          { action: 'EMAIL_BOUNCED' },
          { action: 'WORKFLOW_EMAIL_SENT' },
          { action: 'COMMUNICATION_SENT' }
        ]
      },
      include: {
        user: true,
        client: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    })
    
    console.log(`📧 Found ${emailActivities.length} email activity logs`)
    
    if (emailActivities.length === 0) {
      console.log('⚠️  No email activities found to migrate')
      return
    }
    
    // Step 2: Process each email activity
    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const activity of emailActivities) {
      try {
        // Parse the JSON details
        const details = JSON.parse(activity.details)
        
        // Check if this email already exists in EmailLog
        const existingEmail = await prisma.emailLog.findFirst({
          where: {
            recipientEmail: details.recipientEmail,
            subject: details.subject || 'No subject',
            createdAt: activity.timestamp
          }
        })
        
        if (existingEmail) {
          console.log(`⏭️  Skipping duplicate email: ${details.recipientEmail}`)
          skippedCount++
          continue
        }
        
        // Extract email data from activity details
        const emailData = {
          recipientEmail: details.recipientEmail || 'unknown@example.com',
          recipientName: details.recipientName || 'Unknown',
          subject: details.subject || 'No subject',
          content: details.content || details.htmlContent || 'Email content not available',
          status: getEmailStatus(activity.action),
          emailType: details.emailType || 'WORKFLOW',
          createdAt: activity.timestamp,
          sentAt: activity.action === 'EMAIL_SENT' ? activity.timestamp : null,
          failedAt: activity.action === 'EMAIL_FAILED' ? activity.timestamp : null,
          failureReason: activity.action === 'EMAIL_FAILED' ? details.error : null,
          triggeredBy: activity.userId,
          clientId: activity.clientId
        }
        
        // Create the EmailLog entry
        await prisma.emailLog.create({
          data: emailData
        })
        
        console.log(`✅ Migrated email: ${details.recipientEmail} - ${emailData.subject}`)
        migratedCount++
        
      } catch (error) {
        console.error(`❌ Error processing activity ${activity.id}:`, error.message)
        errorCount++
      }
    }
    
    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successfully migrated: ${migratedCount} emails`)
    console.log(`⏭️  Skipped duplicates: ${skippedCount} emails`)
    console.log(`❌ Errors: ${errorCount} emails`)
    console.log(`📧 Total processed: ${emailActivities.length} activities`)
    
    // Step 3: Verify the migration
    const totalEmails = await prisma.emailLog.count()
    console.log(`\n🔍 Final EmailLog count: ${totalEmails}`)
    
    console.log('\n🎉 Email migration completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    throw error
  }
}

function getEmailStatus(action) {
  switch (action) {
    case 'EMAIL_SENT':
    case 'WORKFLOW_EMAIL_SENT':
    case 'COMMUNICATION_SENT':
      return 'SENT'
    case 'EMAIL_FAILED':
      return 'FAILED'
    case 'EMAIL_DELIVERED':
      return 'DELIVERED'
    case 'EMAIL_BOUNCED':
      return 'BOUNCED'
    default:
      return 'SENT'
  }
}

// Run the migration
migrateEmailsFromActivityLogs()
  .catch(error => {
    console.error('Migration error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  }) 