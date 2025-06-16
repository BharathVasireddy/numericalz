#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Run this after setting up Neon database and environment variables
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Starting production database migration...');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if users table exists and has data
    const userCount = await prisma.user.count();
    console.log(`📊 Current user count: ${userCount}`);

    if (userCount === 0) {
      console.log('👤 Creating initial admin user...');
      
      // Create initial admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@numericalz.com',
          name: 'Admin User',
          password: hashedPassword,
          role: 'MANAGER',
          isActive: true,
        },
      });

      console.log('✅ Admin user created:', adminUser.email);
      console.log('🔑 Default password: admin123 (please change after first login)');
    }

    // Create default email templates if they don't exist
    const templateCount = await prisma.emailTemplate.count();
    if (templateCount === 0) {
      console.log('📧 Creating default email templates...');
      
      await prisma.emailTemplate.createMany({
        data: [
          {
            name: 'Welcome Email',
            subject: 'Welcome to Numericalz',
            htmlContent: '<h1>Welcome {{clientName}}</h1><p>We are pleased to have you as our client.</p>',
            textContent: 'Welcome {{clientName}}. We are pleased to have you as our client.',
            variables: 'clientName',
            isActive: true,
          },
          {
            name: 'Deadline Reminder',
            subject: 'Important Deadline Reminder - {{companyName}}',
            htmlContent: '<h1>Deadline Reminder</h1><p>Dear {{contactName}},</p><p>This is a reminder that your {{deadlineType}} is due on {{dueDate}}.</p>',
            textContent: 'Dear {{contactName}}, This is a reminder that your {{deadlineType}} is due on {{dueDate}}.',
            variables: 'contactName,companyName,deadlineType,dueDate',
            isActive: true,
          },
        ],
      });

      console.log('✅ Default email templates created');
    }

    console.log('🎉 Production database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 