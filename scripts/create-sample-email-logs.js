const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleEmailLogs() {
  console.log('🔄 Creating sample email logs...')
  
  try {
    // Get first user and client for testing
    const user = await prisma.user.findFirst()
    const client = await prisma.client.findFirst()
    
    if (!user || !client) {
      console.log('❌ No users or clients found. Please create some first.')
      return
    }
    
    const sampleLogs = [
      {
        recipientEmail: 'staff@example.com',
        recipientName: 'Test Staff Member',
        subject: '✅ Review Approved - AUREY LTD (NZ-1)',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Review Approved ✅</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Client: AUREY LTD (NZ-1)</h2>
                <p style="color: #666;">The VAT Return has been approved by the Partner.</p>
              </div>
            </div>
          </div>
        `,
        emailType: 'WORKFLOW_REVIEW_COMPLETE',
        status: 'DELIVERED',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000), // 1h 55m ago
        clientId: client.id,
        workflowType: 'vat',
        triggeredBy: user.id
      },
      {
        recipientEmail: 'manager@example.com',
        recipientName: 'Test Manager',
        subject: '🔄 Rework Requested - PAWLALAND LTD (NZ-2)',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f57c00 0%, #ff9800 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Rework Requested 🔄</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Client: PAWLALAND LTD (NZ-2)</h2>
                <p style="color: #666;">The Annual Accounts require corrections before approval.</p>
                <div style="background: #fff3e0; padding: 15px; border-radius: 6px; margin: 15px 0;">
                  <p style="margin: 0; color: #f57c00; font-weight: bold;">Rework Instructions:</p>
                  <p style="margin: 5px 0 0 0; color: #666;">Please review the depreciation calculations and ensure all fixed assets are properly categorized.</p>
                </div>
              </div>
            </div>
          </div>
        `,
        emailType: 'WORKFLOW_REVIEW_COMPLETE',
        status: 'SENT',
        sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        clientId: client.id,
        workflowType: 'accounts',
        triggeredBy: user.id
      },
      {
        recipientEmail: 'client@example.com',
        recipientName: 'Client Contact',
        subject: '📅 Deadline Reminder - VAT Return Due Soon',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Deadline Reminder 📅</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">VAT Return Due Soon</h2>
                <p style="color: #666;">Your VAT return is due in 5 days. Please ensure all paperwork is submitted.</p>
              </div>
            </div>
          </div>
        `,
        emailType: 'DEADLINE_REMINDER',
        status: 'FAILED',
        sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        failedAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 30 * 1000), // 6h ago + 30s
        failureReason: 'Invalid email address',
        clientId: client.id,
        workflowType: 'vat',
        triggeredBy: user.id
      },
      {
        recipientEmail: 'partner@example.com',
        recipientName: 'Test Partner',
        subject: '📋 Weekly Summary - Workflow Updates',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Weekly Summary 📋</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Workflow Updates</h2>
                <p style="color: #666;">Summary of workflow activities for the past week.</p>
              </div>
            </div>
          </div>
        `,
        emailType: 'WEEKLY_SUMMARY',
        status: 'PENDING',
        clientId: null,
        workflowType: null,
        triggeredBy: user.id
      },
      {
        recipientEmail: 'staff2@example.com',
        recipientName: 'Another Staff Member',
        subject: '✅ Review Approved - FISERMED LTD (NZ-3)',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Review Approved ✅</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Client: FISERMED LTD (NZ-3)</h2>
                <p style="color: #666;">The Annual Accounts have been approved by the Manager.</p>
                <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0;">
                  <p style="margin: 0; color: #2e7d32; font-weight: bold;">Review Comments:</p>
                  <p style="margin: 5px 0 0 0; color: #666;">Excellent work on the financial statements. Ready for filing.</p>
                </div>
              </div>
            </div>
          </div>
        `,
        emailType: 'WORKFLOW_REVIEW_COMPLETE',
        status: 'DELIVERED',
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000 + 2 * 60 * 1000), // 58 minutes ago
        clientId: client.id,
        workflowType: 'accounts',
        triggeredBy: user.id
      }
    ]
    
    // Create the email logs
    for (const logData of sampleLogs) {
      await prisma.emailLog.create({
        data: {
          ...logData,
          createdAt: logData.sentAt ? new Date(logData.sentAt.getTime() - 5 * 60 * 1000) : new Date(), // Created 5 minutes before sent
          updatedAt: logData.deliveredAt || logData.failedAt || logData.sentAt || new Date()
        }
      })
    }
    
    console.log(`✅ Created ${sampleLogs.length} sample email logs`)
    
    // Show summary
    const counts = await prisma.emailLog.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })
    
    console.log('📊 Email log status summary:')
    counts.forEach(count => {
      console.log(`   ${count.status}: ${count._count.status}`)
    })
    
  } catch (error) {
    console.error('❌ Error creating sample email logs:', error)
    throw error
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