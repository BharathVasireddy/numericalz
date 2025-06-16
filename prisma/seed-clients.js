require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const sampleClients = [
  {
    companyName: 'Tech Solutions Ltd',
    companyNumber: '12345678',
    companyType: 'LIMITED',
    registeredOffice: '123 Tech Street, London, SW1A 1AA',
    tradingAddress: '123 Tech Street, London, SW1A 1AA',
    contactName: 'John Smith',
    contactEmail: 'john.smith@techsolutions.co.uk',
    contactPhone: '+44 20 7123 4567',
    website: 'https://techsolutions.co.uk',
    industry: 'technology',
    yearEstablished: 2018,
    numberOfEmployees: 25,
    annualTurnover: 1500000.00,
    isActive: true,
    notes: 'Growing tech startup specializing in web development'
  },
  {
    companyName: 'Green Retail Group PLC',
    companyNumber: '87654321',
    companyType: 'PLC',
    registeredOffice: '456 High Street, Manchester, M1 2AB',
    tradingAddress: '456 High Street, Manchester, M1 2AB',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@greenretail.co.uk',
    contactPhone: '+44 161 234 5678',
    website: 'https://greenretail.co.uk',
    industry: 'retail',
    yearEstablished: 2010,
    numberOfEmployees: 150,
    annualTurnover: 8500000.00,
    isActive: true,
    notes: 'Sustainable retail chain with 15 locations across the UK'
  },
  {
    companyName: 'Manchester Manufacturing LLP',
    companyNumber: '11223344',
    companyType: 'LLP',
    registeredOffice: '789 Industrial Estate, Birmingham, B1 3CD',
    tradingAddress: '789 Industrial Estate, Birmingham, B1 3CD',
    contactName: 'David Wilson',
    contactEmail: 'david.wilson@manchestermfg.co.uk',
    contactPhone: '+44 121 345 6789',
    website: 'https://manchestermfg.co.uk',
    industry: 'manufacturing',
    yearEstablished: 1995,
    numberOfEmployees: 85,
    annualTurnover: 4200000.00,
    isActive: true,
    notes: 'Family-owned manufacturing business specializing in automotive parts'
  },
  {
    companyName: 'Healthcare Consultancy Services',
    companyNumber: '55667788',
    companyType: 'LIMITED',
    registeredOffice: '321 Medical Centre, Edinburgh, EH1 4EF',
    tradingAddress: '321 Medical Centre, Edinburgh, EH1 4EF',
    contactName: 'Dr. Emma Thompson',
    contactEmail: 'emma.thompson@healthcareconsult.co.uk',
    contactPhone: '+44 131 456 7890',
    website: 'https://healthcareconsult.co.uk',
    industry: 'healthcare',
    yearEstablished: 2020,
    numberOfEmployees: 12,
    annualTurnover: 750000.00,
    isActive: true,
    notes: 'Specialized healthcare consulting for NHS trusts'
  },
  {
    companyName: 'Financial Advisory Partners',
    companyNumber: '99887766',
    companyType: 'PARTNERSHIP',
    registeredOffice: '654 Finance House, Leeds, LS1 5GH',
    tradingAddress: '654 Finance House, Leeds, LS1 5GH',
    contactName: 'Michael Brown',
    contactEmail: 'michael.brown@finadvpartners.co.uk',
    contactPhone: '+44 113 567 8901',
    website: 'https://finadvpartners.co.uk',
    industry: 'finance',
    yearEstablished: 2015,
    numberOfEmployees: 8,
    annualTurnover: 950000.00,
    isActive: false,
    notes: 'Currently restructuring - inactive client'
  }
]

async function seedClients() {
  console.log('🌱 Seeding clients...')

  try {
    // Clear existing clients first
    console.log('🧹 Clearing existing clients...')
    await prisma.client.deleteMany({})
    console.log('✅ Existing clients cleared')
    // Get the admin user to assign some clients to
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@numericalz.co.uk' }
    })

    const staffUser = await prisma.user.findFirst({
      where: { email: 'staff@numericalz.co.uk' }
    })

    for (let i = 0; i < sampleClients.length; i++) {
      const clientData = sampleClients[i]
      
      // Assign clients alternately to admin and staff
      if (i % 2 === 0 && adminUser) {
        clientData.assignedUserId = adminUser.id
      } else if (staffUser) {
        clientData.assignedUserId = staffUser.id
      }

      const client = await prisma.client.create({
        data: clientData
      })

      console.log(`✅ Created client: ${client.companyName}`)

      // Create an activity log entry
      if (adminUser) {
        await prisma.activityLog.create({
          data: {
            action: 'CREATE',
            resource: 'client',
            resourceId: client.id,
            newValues: JSON.stringify(client),
            userId: adminUser.id,
            clientId: client.id,
            metadata: JSON.stringify({
              timestamp: new Date().toISOString(),
              action: 'client_seeded',
            }),
          }
        })
      }
    }

    console.log('🎉 Client seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding clients:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedClients()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  }) 