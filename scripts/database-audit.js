const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function auditDatabase() {
  const timestamp = new Date().toISOString()
  const auditFile = path.join(__dirname, '../audits', `audit-${timestamp.replace(/[:.]/g, '-')}.json`)
  
  // Ensure audit directory exists
  const auditDir = path.dirname(auditFile)
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true })
  }
  
  try {
    console.log('🔍 Starting database audit...')
    
    // Get detailed database state
    const audit = {
      timestamp,
      database: {
        users: {
          count: await prisma.user.count(),
          records: await prisma.user.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true
            }
          })
        },
        clients: {
          count: await prisma.client.count(),
          records: await prisma.client.findMany({
            select: {
              id: true,
              clientCode: true,
              companyName: true,
              companyNumber: true,
              assignedUserId: true,
              isActive: true,
              createdAt: true,
              updatedAt: true
            }
          })
        },
        userSettings: {
          count: await prisma.userSettings.count(),
          records: await prisma.userSettings.findMany()
        },
        communications: {
          count: await prisma.communication.count()
        },
        notifications: {
          count: await prisma.notification.count()
        },
        activityLogs: {
          count: await prisma.activityLog.count()
        }
      },
      foreignKeyConstraints: await checkForeignKeyConstraints(),
      orphanedRecords: await findOrphanedRecords()
    }
    
    // Write audit to file
    fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2))
    
    console.log(`✅ Database audit completed: ${auditFile}`)
    console.log(`📊 Summary:`)
    console.log(`   - Users: ${audit.database.users.count}`)
    console.log(`   - Clients: ${audit.database.clients.count}`)
    console.log(`   - User Settings: ${audit.database.userSettings.count}`)
    console.log(`   - Communications: ${audit.database.communications.count}`)
    
    // Check for potential issues
    const issues = []
    
    if (audit.database.users.count === 0) {
      issues.push('❌ NO USERS FOUND - CRITICAL ISSUE')
    }
    
    if (audit.orphanedRecords.length > 0) {
      issues.push(`⚠️ Found ${audit.orphanedRecords.length} orphaned records`)
    }
    
    if (issues.length > 0) {
      console.log('🚨 ISSUES DETECTED:')
      issues.forEach(issue => console.log(`   ${issue}`))
    } else {
      console.log('✅ No issues detected')
    }
    
    return auditFile
    
  } catch (error) {
    console.error('❌ Database audit failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function checkForeignKeyConstraints() {
  try {
    // Check for foreign key constraint violations
    const result = await prisma.$queryRaw`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `
    
    return result
  } catch (error) {
    console.warn('⚠️ Could not check foreign key constraints:', error.message)
    return []
  }
}

async function findOrphanedRecords() {
  const orphaned = []
  
  try {
    // Check for orphaned user settings
    const orphanedSettings = await prisma.$queryRaw`
      SELECT us.id, us."userId" 
      FROM user_settings us 
      LEFT JOIN users u ON us."userId" = u.id 
      WHERE u.id IS NULL
    `
    
    if (orphanedSettings.length > 0) {
      orphaned.push({
        table: 'user_settings',
        count: orphanedSettings.length,
        records: orphanedSettings
      })
    }
    
    // Check for orphaned clients
    const orphanedClients = await prisma.$queryRaw`
      SELECT c.id, c."assignedUserId" 
      FROM clients c 
      LEFT JOIN users u ON c."assignedUserId" = u.id 
      WHERE c."assignedUserId" IS NOT NULL AND u.id IS NULL
    `
    
    if (orphanedClients.length > 0) {
      orphaned.push({
        table: 'clients',
        count: orphanedClients.length,
        records: orphanedClients
      })
    }
    
  } catch (error) {
    console.warn('⚠️ Could not check for orphaned records:', error.message)
  }
  
  return orphaned
}

// Run audit if called directly
if (require.main === module) {
  auditDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { auditDatabase } 