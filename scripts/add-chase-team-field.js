#!/usr/bin/env node

/**
 * Add Chase Team Field to Clients Table
 * 
 * Safely adds the chaseTeamUserIds field to the clients table
 * with default values and proper indexing.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addChaseTeamField() {
  console.log('🔄 Adding chase team field to clients table...')
  
  try {
    // Add the field if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS "chaseTeamUserIds" TEXT[] DEFAULT '{}';
    `
    
    console.log('✅ Chase team field added successfully')

    // Add index for performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "clients_chaseTeamUserIds_idx" 
      ON clients USING GIN ("chaseTeamUserIds");
    `
    
    console.log('✅ Index added for chase team field')

    // Get default chase team users (Mukul and George)
    const defaultChaseUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['mukul@numericalz.com', 'george@numericalz.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    if (defaultChaseUsers.length > 0) {
      const defaultChaseUserIds = defaultChaseUsers.map(user => user.id)
      
      // Update existing clients to have default chase team
      const updateResult = await prisma.$executeRaw`
        UPDATE clients 
        SET "chaseTeamUserIds" = ${defaultChaseUserIds}::TEXT[]
        WHERE "chaseTeamUserIds" = '{}' OR "chaseTeamUserIds" IS NULL;
      `
      
      console.log(`✅ Updated existing clients with default chase team`)
      console.log(`📋 Default chase team:`)
      defaultChaseUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`)
      })
    } else {
      console.log('⚠️ No default chase team users found (mukul@numericalz.com, george@numericalz.com)')
    }

    console.log('🎉 Chase team field setup completed successfully!')

  } catch (error) {
    console.error('❌ Error adding chase team field:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addChaseTeamField()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  }) 