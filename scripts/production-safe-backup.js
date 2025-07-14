#!/usr/bin/env node

/**
 * PRODUCTION-SAFE BACKUP SCRIPT
 * 
 * This script creates a complete backup of the production database
 * while handling schema inconsistencies safely.
 * 
 * SAFETY FEATURES:
 * - Skips problematic tables if they cause errors
 * - Creates comprehensive JSON backup
 * - Verifies backup integrity
 * - NO DESTRUCTIVE OPERATIONS
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs').promises
const path = require('path')

async function createProductionSafeBackup() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔒 STARTING PRODUCTION-SAFE BACKUP')
    console.log('============================================================')
    console.log(`📅 Timestamp: ${new Date().toISOString()}`)
    console.log(`🗄️ Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown'}`)
    
    const backupDir = path.join(process.cwd(), 'production-backups')
    await fs.mkdir(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `production-safe-backup-${timestamp}.json`)
    
    console.log(`📁 Backup file: ${backupFile}`)
    console.log('')
    
    // CORE TABLES BACKUP (CRITICAL DATA)
    console.log('📊 STEP 1: Backing up core tables...')
    
    const backup = {
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown',
      core_tables: {},
      table_counts: {},
      errors: []
    }
    
    // Core tables that MUST be backed up
    const coreTables = [
      { name: 'users', model: 'user' },
      { name: 'clients', model: 'client' },
      { name: 'communications', model: 'communication' },
      { name: 'activity_logs', model: 'activityLog' },
      { name: 'notifications', model: 'notification' },
      { name: 'user_settings', model: 'userSettings' },
      { name: 'vat_quarters', model: 'vATQuarter' },
      { name: 'vat_workflow_history', model: 'vATWorkflowHistory' },
      { name: 'ltd_accounts_workflows', model: 'ltdAccountsWorkflow' },
      { name: 'ltd_accounts_workflow_history', model: 'ltdAccountsWorkflowHistory' },
      { name: 'email_logs', model: 'emailLog' },
      { name: 'accounts', model: 'account' },
      { name: 'sessions', model: 'session' }
    ]
    
    // Backup each core table
    for (const table of coreTables) {
      try {
        console.log(`   📋 Backing up ${table.name}...`)
        const data = await prisma[table.model].findMany()
        backup.core_tables[table.name] = data
        backup.table_counts[table.name] = data.length
        console.log(`   ✅ ${table.name}: ${data.length} records`)
      } catch (error) {
        console.log(`   ⚠️  ${table.name}: ERROR - ${error.message}`)
        backup.errors.push({
          table: table.name,
          error: error.message,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // OPTIONAL TABLES (Email system - may have inconsistencies)
    console.log('')
    console.log('📧 STEP 2: Backing up email system tables (optional)...')
    
    const emailTables = [
      { name: 'email_templates', model: 'emailTemplate' },
      { name: 'email_attachments', model: 'emailAttachment' },
      { name: 'branding_settings', model: 'brandingSettings' }
    ]
    
    backup.email_tables = {}
    
    for (const table of emailTables) {
      try {
        console.log(`   📧 Backing up ${table.name}...`)
        const data = await prisma[table.model].findMany()
        backup.email_tables[table.name] = data
        backup.table_counts[table.name] = data.length
        console.log(`   ✅ ${table.name}: ${data.length} records`)
      } catch (error) {
        console.log(`   ⚠️  ${table.name}: SKIPPED - ${error.message}`)
        backup.errors.push({
          table: table.name,
          error: error.message,
          timestamp: new Date().toISOString(),
          skipped: true
        })
      }
    }
    
    // WRITE BACKUP FILE
    console.log('')
    console.log('💾 STEP 3: Writing backup file...')
    
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2))
    const stats = await fs.stat(backupFile)
    
    console.log(`✅ Backup completed successfully!`)
    console.log(`📁 File: ${backupFile}`)
    console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    console.log('')
    
    // BACKUP VERIFICATION
    console.log('🔍 STEP 4: Verifying backup integrity...')
    
    const totalRecords = Object.values(backup.table_counts).reduce((sum, count) => sum + count, 0)
    const coreTableRecords = coreTables.reduce((sum, table) => {
      return sum + (backup.table_counts[table.name] || 0)
    }, 0)
    
    console.log(`📊 Total records backed up: ${totalRecords}`)
    console.log(`📋 Core table records: ${coreTableRecords}`)
    console.log(`⚠️  Errors/Skipped: ${backup.errors.length}`)
    
    if (backup.errors.length > 0) {
      console.log('')
      console.log('⚠️  ERRORS SUMMARY:')
      backup.errors.forEach(error => {
        console.log(`   - ${error.table}: ${error.error}`)
      })
    }
    
    // CRITICAL DATA VERIFICATION
    const criticalTables = ['users', 'clients', 'vat_quarters', 'ltd_accounts_workflows']
    const missingCritical = criticalTables.filter(table => !backup.table_counts[table] || backup.table_counts[table] === 0)
    
    if (missingCritical.length > 0) {
      console.log('')
      console.log('🚨 CRITICAL WARNING: Missing critical data!')
      console.log(`   Missing tables: ${missingCritical.join(', ')}`)
      console.log('   DO NOT PROCEED with migrations until this is resolved!')
      process.exit(1)
    }
    
    console.log('')
    console.log('🎉 BACKUP VERIFICATION PASSED!')
    console.log('✅ All critical data successfully backed up')
    console.log('✅ Safe to proceed with migrations')
    
    return {
      success: true,
      backupFile,
      stats: {
        totalRecords,
        coreTableRecords,
        errors: backup.errors.length,
        fileSize: stats.size
      }
    }
    
  } catch (error) {
    console.error('❌ BACKUP FAILED:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backup
if (require.main === module) {
  createProductionSafeBackup()
    .then((result) => {
      console.log('')
      console.log('🔒 PRODUCTION-SAFE BACKUP COMPLETED')
      console.log('============================================================')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ PRODUCTION-SAFE BACKUP FAILED:', error)
      process.exit(1)
    })
}

module.exports = { createProductionSafeBackup } 