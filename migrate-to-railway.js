#!/usr/bin/env node

/**
 * Migration script to move data from Supabase to Railway PostgreSQL
 * 
 * Usage:
 * 1. Set SUPABASE_DATABASE_URL environment variable
 * 2. Set RAILWAY_DATABASE_URL environment variable  
 * 3. Run: node migrate-to-railway.js
 */

const { Client } = require('pg')

async function migrateDatabase() {
  console.log('🚀 Starting migration from Supabase to Railway...')
  
  // Source database (Supabase)
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL
  if (!supabaseUrl) {
    throw new Error('SUPABASE_DATABASE_URL environment variable is required')
  }
  
  // Target database (Railway)
  const railwayUrl = process.env.RAILWAY_DATABASE_URL
  if (!railwayUrl) {
    throw new Error('RAILWAY_DATABASE_URL environment variable is required')
  }
  
  const sourceClient = new Client({ connectionString: supabaseUrl })
  const targetClient = new Client({ connectionString: railwayUrl })
  
  try {
    // Connect to both databases
    console.log('📡 Connecting to databases...')
    await sourceClient.connect()
    await targetClient.connect()
    
    console.log('✅ Connected to both databases')
    
    // Get schema from source database
    console.log('📋 Reading schema from Supabase...')
    const schemaResult = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    const tables = schemaResult.rows.map(row => row.table_name)
    console.log(`📊 Found ${tables.length} tables:`, tables)
    
    // Export data from each table
    for (const tableName of tables) {
      console.log(`📤 Exporting data from ${tableName}...`)
      
      // Get table data
      const dataResult = await sourceClient.query(`SELECT * FROM "${tableName}"`)
      const rows = dataResult.rows
      
      console.log(`📊 Found ${rows.length} rows in ${tableName}`)
      
      if (rows.length > 0) {
        // Get column names
        const columns = Object.keys(rows[0])
        const columnList = columns.map(col => `"${col}"`).join(', ')
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
        
        // Insert data into target database
        console.log(`📥 Importing ${rows.length} rows into Railway ${tableName}...`)
        
        for (const row of rows) {
          const values = columns.map(col => row[col])
          
          try {
            await targetClient.query(
              `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
              values
            )
          } catch (error) {
            console.warn(`⚠️  Warning: Could not insert row into ${tableName}:`, error.message)
          }
        }
        
        console.log(`✅ Completed ${tableName}`)
      }
    }
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sourceClient.end()
    await targetClient.end()
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migration script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateDatabase } 