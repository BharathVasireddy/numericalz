const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestEmailLog() {
  console.log('🔄 Creating test email log...')
  
  try {
    // Get first user and client for testing
    const user = await prisma.user.findFirst({
      where: {
        role: 'PARTNER'
      }
    })
    
    const client = await prisma.client.findFirst()
    
    if (!user || !client) {
      console.log('❌ No users or clients found. Please create some first.')
      return
    }
    
    const testEmailLog = {
      fromEmail: 'noreply@numericalz.com',
      fromName: 'Numericalz',
      recipientEmail: 'staff@example.com',
      recipientName: 'Test Staff Member',
      subject: '✅ Review Approved - ' + client.companyName + ' (' + client.clientCode + ')',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Review Approved ✅</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">Client: ${client.companyName} (${client.clientCode})</h2>
              <p style="color: #666; font-size: 16px; margin: 10px 0;">
                The <strong>VAT Return</strong> has been approved by the Partner.
              </p>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p style="margin: 0; color: #2e7d32;">
                  <strong>Status:</strong> Reviewed by Partner - Ready for next steps
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="http://localhost:3000/dashboard/clients/vat-dt" 
                 style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Workflow Details
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated notification from Numericalz Internal Management System</p>
              <p>Reviewed by: ${user.name} (Partner)</p>
            </div>
          </div>
        </div>
      `,
      emailType: 'WORKFLOW_REVIEW_COMPLETE',
      status: 'SENT',
      sentAt: new Date(),
      clientId: client.id,
      workflowType: 'vat',
      triggeredBy: user.id
    }
    
    const emailLog = await prisma.emailLog.create({
      data: testEmailLog
    })
    
    console.log(`✅ Created test email log: ${emailLog.id}`)
    console.log(`📧 Subject: ${emailLog.subject}`)
    console.log(`📤 From: ${emailLog.fromName} <${emailLog.fromEmail}>`)
    console.log(`📥 To: ${emailLog.recipientName} <${emailLog.recipientEmail}>`)
    console.log(`🏢 Client: ${client.companyName} (${client.clientCode})`)
    console.log(`👤 Triggered by: ${user.name} (${user.role})`)
    
  } catch (error) {
    console.error('❌ Error creating test email log:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createTestEmailLog()
  .then(() => {
    console.log('🎉 Test email log created successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to create test email log:', error)
    process.exit(1)
  }) 