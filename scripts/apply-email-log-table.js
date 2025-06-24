const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function applyEmailLogTable() {
  console.log('🔄 Applying email log table...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-email-log-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log(`✅ Statement ${i + 1} executed successfully`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
        } else {
          throw error
        }
      }
    }
    
    console.log('✅ Email log table applied successfully!')
    
  } catch (error) {
    console.error('❌ Error applying email log table:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

applyEmailLogTable()
  .then(() => {
    console.log('🎉 Email log table setup completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to apply email log table:', error)
    process.exit(1)
  }) 