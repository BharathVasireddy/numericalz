import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Generate a unique client code with retry logic
 */
async function generateClientCode(): Promise<string> {
  const lastClient = await prisma.client.findFirst({
    where: {
      clientCode: {
        startsWith: 'NZ-'
      }
    },
    orderBy: {
      clientCode: 'desc'
    }
  })

  let nextNumber = 1
  if (lastClient?.clientCode) {
    const match = lastClient.clientCode.match(/NZ-(\d+)/)
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  return `NZ-${nextNumber}`
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a test partner user
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const partnerUser = await prisma.user.upsert({
    where: { email: 'partner@numericalz.co.uk' },
    update: {},
    create: {
      email: 'partner@numericalz.co.uk',
      name: 'Test Partner',
      password: hashedPassword,
      role: 'PARTNER',
      isActive: true,
    },
  })

  console.log('✅ Created partner user:', partnerUser.email)

  // Create a test manager user
  
  const testUser = await prisma.user.upsert({
    where: { email: 'admin@numericalz.co.uk' },
    update: {},
    create: {
      email: 'admin@numericalz.co.uk',
      name: 'Test Manager',
      password: hashedPassword,
      role: 'MANAGER',
      isActive: true,
    },
  })

  console.log('✅ Created test user:', testUser.email)

  // Create a test staff user
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@numericalz.co.uk' },
    update: {},
    create: {
      email: 'staff@numericalz.co.uk',
      name: 'Test Staff',
      password: hashedPassword,
      role: 'STAFF',
      isActive: true,
    },
  })

  console.log('✅ Created staff user:', staffUser.email)

  // Generate a unique client code for the test client
  const clientCode = await generateClientCode()

  // Create a test client
  const testClient = await prisma.client.upsert({
    where: { companyNumber: '12345678' },
    update: {},
    create: {
      clientCode: clientCode, // Use generated client code
      companyName: 'Test Company Ltd',
      companyNumber: '12345678',
      companyType: 'LIMITED_COMPANY',
      registeredOfficeAddress: JSON.stringify({
        address_line_1: '123 Test Street',
        locality: 'London',
        postal_code: 'SW1A 1AA',
        country: 'United Kingdom'
      }),
      contactName: 'John Smith',
      contactEmail: 'john@testcompany.co.uk',
      contactPhone: '+44 20 1234 5678',
      yearEstablished: 2020,
      numberOfEmployees: 10,
      assignedUserId: testUser.id,
      notes: 'Test client for development',
    },
  })

  console.log('✅ Created test client:', testClient.companyName, `(${testClient.clientCode})`)

  // Create a test communication
  const testCommunication = await prisma.communication.create({
    data: {
      type: 'EMAIL',
      subject: 'Welcome to Numericalz',
      content: 'Thank you for choosing Numericalz for your accounting needs.',
      sentAt: new Date(),
      clientId: testClient.id,
      sentByUserId: testUser.id,
    },
  })

  console.log('✅ Created test communication:', testCommunication.subject)

  // Create an email template
  const emailTemplate = await prisma.emailTemplate.upsert({
    where: { name: 'welcome' },
    update: {},
    create: {
      name: 'welcome',
      subject: 'Welcome to Numericalz',
      htmlContent: '<h1>Welcome {{name}}</h1><p>Thank you for choosing Numericalz for your accounting needs.</p>',
      textContent: 'Welcome {{name}}\n\nThank you for choosing Numericalz for your accounting needs.',
      variables: 'name,email',
      isActive: true,
    },
  })

  console.log('✅ Created email template:', emailTemplate.name)

  console.log('🎉 Database seeded successfully!')
  console.log('')
  console.log('Test credentials:')
  console.log('Partner: partner@numericalz.co.uk / password123')
  console.log('Manager: admin@numericalz.co.uk / password123')
  console.log('Staff: staff@numericalz.co.uk / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 