const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleEmailLogs() {
  console.log('🔄 Creating sample email logs for testing...')
  
  try {
    // Get existing users and clients from local database
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } })
    const clients = await prisma.client.findMany({ select: { id: true, clientCode: true, companyName: true } })
    
    console.log(`📋 Found ${users.length} users and ${clients.length} clients in local database`)
    
    if (users.length === 0 || clients.length === 0) {
      console.log('❌ No users or clients found. Cannot create sample email logs.')
      return
    }
    
    // Clear existing email logs
    console.log('🗑️ Clearing existing email logs...')
    await prisma.emailLog.deleteMany({})
    
    // Create sample email logs
    const sampleEmails = []
    const emailTypes = ['WORKFLOW', 'NOTIFICATION', 'DEADLINE_REMINDER', 'CLIENT_NOTIFICATION', 'MANUAL']
    const statuses = ['SENT', 'DELIVERED', 'PENDING', 'FAILED']
    const subjects = [
      'VAT Return Deadline Reminder',
      'Accounts Filing Due Soon',
      'Workflow Review Complete',
      'Paperwork Required',
      'Filing Completed Successfully',
      'Action Required - VAT Quarter',
      'Year End Accounts Ready',
      'Client Assignment Update',
      'Deadline Approaching',
      'Weekly Summary Report'
    ]
    
    // Create 50 sample email logs
    for (let i = 0; i < 50; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]
      const randomClient = clients[Math.floor(Math.random() * clients.length)]
      const randomType = emailTypes[Math.floor(Math.random() * emailTypes.length)]
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)]
      
      const createdDate = new Date()
      createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30)) // Last 30 days
      
      const sentDate = randomStatus !== 'PENDING' ? new Date(createdDate.getTime() + Math.random() * 3600000) : null
      const deliveredDate = randomStatus === 'DELIVERED' ? new Date(sentDate.getTime() + Math.random() * 1800000) : null
      const failedDate = randomStatus === 'FAILED' ? new Date(sentDate?.getTime() + Math.random() * 1800000) : null
      
      sampleEmails.push({
        recipientEmail: `test${i}@example.com`,
        recipientName: `Test Client ${i}`,
        subject: randomSubject,
        content: `<p>This is a sample email content for testing purposes.</p><p>Subject: ${randomSubject}</p><p>Client: ${randomClient.companyName}</p>`,
        emailType: randomType,
        status: randomStatus,
        sentAt: sentDate,
        deliveredAt: deliveredDate,
        failedAt: failedDate,
        failureReason: randomStatus === 'FAILED' ? 'Sample failure reason for testing' : null,
        clientId: randomClient.id,
        workflowType: randomType === 'WORKFLOW' ? 'VAT_WORKFLOW' : null,
        triggeredBy: randomUser.id,
        fromEmail: 'noreply@numericalz.com',
        fromName: 'Numericalz',
        createdAt: createdDate,
        updatedAt: createdDate
      })
    }
    
    // Insert sample emails
    console.log('📧 Creating sample email logs...')
    let createdCount = 0
    
    for (const email of sampleEmails) {
      try {
        await prisma.emailLog.create({ data: email })
        createdCount++
      } catch (error) {
        console.error(`❌ Error creating sample email:`, error.message)
      }
    }
    
    console.log(`✅ Successfully created ${createdCount} sample email logs`)
    
    // Verify creation
    const totalCount = await prisma.emailLog.count()
    console.log(`🔍 Verification: Local database now has ${totalCount} email logs`)
    
    // Show sample data
    const sampleLog = await prisma.emailLog.findFirst({
      include: {
        client: { select: { companyName: true, clientCode: true } },
        triggeredByUser: { select: { name: true } }
      }
    })
    
    if (sampleLog) {
      console.log('📋 Sample email log created:')
      console.log(`  Subject: ${sampleLog.subject}`)
      console.log(`  Recipient: ${sampleLog.recipientEmail}`)
      console.log(`  Status: ${sampleLog.status}`)
      console.log(`  Client: ${sampleLog.client?.companyName}`)
      console.log(`  Triggered by: ${sampleLog.triggeredByUser?.name}`)
    }
    
  } catch (error) {
    console.error('❌ Error creating sample email logs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleEmailLogs()
  .then(() => {
    console.log('🎉 Sample email logs created successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to create sample email logs:', error)
    process.exit(1)
  }) 