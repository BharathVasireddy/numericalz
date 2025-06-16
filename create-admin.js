#!/usr/bin/env node

/**
 * Create Admin User Script
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgres://postgres.kgynhondttxvnowlqfeo:YeDmDG3RtC33YzG5@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";

async function createAdmin() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });

  try {
    console.log('👤 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@numericalz.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email: admin@numericalz.com');
      console.log('🔑 Password: admin123');
      return;
    }

    // Create admin user
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

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@numericalz.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login');

  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 