const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugActivityLog() {
  try {
    // Find client NZ-1
    const client = await prisma.client.findFirst({
      where: { clientCode: 'NZ-1' },
      select: { id: true, companyName: true, clientCode: true, companyNumber: true }
    });
    
    if (!client) {
      console.log('❌ Client NZ-1 not found');
      return;
    }
    
    console.log('📋 Client NZ-1 Details:');
    console.log('- ID:', client.id);
    console.log('- Company Name:', client.companyName);
    console.log('- Company Number:', client.companyNumber);
    
    // Get activity logs for this client
    const activities = await prisma.activityLog.findMany({
      where: { clientId: client.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        client: {
          select: { id: true, companyName: true, clientCode: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    console.log(`\n📊 Found ${activities.length} Activity Logs:`);
    
    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. ======================================`);
      console.log(`Action: ${activity.action}`);
      console.log(`User ID: ${activity.userId}`);
      console.log(`User Object:`, activity.user);
      console.log(`Client ID: ${activity.clientId}`);
      console.log(`Client Object:`, activity.client);
      console.log(`Timestamp: ${activity.timestamp}`);
      console.log(`Raw Details: ${activity.details}`);
      
      // Try to parse details
      try {
        if (activity.details) {
          const parsedDetails = JSON.parse(activity.details);
          console.log(`Parsed Details:`, parsedDetails);
          
          // Check specific fields that might be causing issues
          if (parsedDetails.oldStage !== undefined) {
            console.log(`  - oldStage: "${parsedDetails.oldStage}" (type: ${typeof parsedDetails.oldStage})`);
          }
          if (parsedDetails.newStage !== undefined) {
            console.log(`  - newStage: "${parsedDetails.newStage}" (type: ${typeof parsedDetails.newStage})`);
          }
          if (parsedDetails.assigneeName !== undefined) {
            console.log(`  - assigneeName: "${parsedDetails.assigneeName}" (type: ${typeof parsedDetails.assigneeName})`);
          }
          if (parsedDetails.companyName !== undefined) {
            console.log(`  - companyName: "${parsedDetails.companyName}" (type: ${typeof parsedDetails.companyName})`);
          }
        }
      } catch (error) {
        console.log(`❌ Error parsing details: ${error.message}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugActivityLog(); 