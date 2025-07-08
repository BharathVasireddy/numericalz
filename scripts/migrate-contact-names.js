#!/usr/bin/env node

/**
 * Migration Script: Update Contact Names to Directors
 * 
 * This script safely updates existing clients' contact names from company names
 * to director names (persons with significant control) where appropriate.
 * 
 * Safety Features:
 * - Only updates clients where contactName === companyName (not manually edited)
 * - Preserves manually customized contact names
 * - Creates backup before changes
 * - Provides preview mode
 * - Includes rollback capability
 * 
 * Usage:
 * - Preview changes: node scripts/migrate-contact-names.js --preview
 * - Apply changes: node scripts/migrate-contact-names.js --apply
 * - Rollback: node scripts/migrate-contact-names.js --rollback
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Import the director extraction function
const { getDirectorWithSignificantControl } = require('../lib/companies-house')

// Configuration
const BACKUP_DIR = path.join(__dirname, 'backups')
const BACKUP_FILE = path.join(BACKUP_DIR, `contact-names-backup-${Date.now()}.json`)

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

/**
 * Fetch Companies House PSC data for a client
 */
async function fetchPSCData(companyNumber) {
  try {
    if (!companyNumber) return null
    
    // Use the same API endpoint as the application
    const response = await fetch(`http://localhost:3000/api/companies-house/company/${companyNumber}`)
    if (!response.ok) return null
    
    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.warn(`Failed to fetch PSC data for ${companyNumber}:`, error.message)
    return null
  }
}

/**
 * Find clients that need contact name updates
 */
async function findClientsToUpdate() {
  console.log('🔍 Finding clients with contact names that can be updated...')
  
  // Get all LIMITED_COMPANY clients where contactName matches companyName
  const clients = await prisma.client.findMany({
    where: {
      companyType: 'LIMITED_COMPANY',
      companyNumber: { not: null },
      isActive: true,
      // Only consider clients where contact name appears to be auto-generated (same as company name)
      AND: [
        { contactName: { not: null } },
        { companyName: { not: null } }
      ]
    },
    select: {
      id: true,
      clientCode: true,
      companyName: true,
      contactName: true,
      companyNumber: true,
      createdAt: true
    }
  })
  
  console.log(`📊 Found ${clients.length} LIMITED_COMPANY clients to analyze`)
  
  // Filter clients where contactName === companyName (indicating auto-generated, not manually edited)
  const candidateClients = clients.filter(client => 
    client.contactName === client.companyName
  )
  
  console.log(`🎯 Found ${candidateClients.length} clients with auto-generated contact names`)
  
  return candidateClients
}

/**
 * Preview changes that would be made
 */
async function previewChanges() {
  console.log('🔍 PREVIEW MODE: Analyzing potential changes...\n')
  
  const clients = await findClientsToUpdate()
  const changes = []
  
  for (const client of clients) {
    console.log(`📋 Analyzing: ${client.clientCode} - ${client.companyName}`)
    
    // Fetch PSC data
    const pscData = await fetchPSCData(client.companyNumber)
    if (!pscData || !pscData.psc) {
      console.log(`   ❌ No PSC data available`)
      continue
    }
    
    // Extract director name
    const directorName = getDirectorWithSignificantControl(pscData.psc)
    if (!directorName) {
      console.log(`   ❌ No director with significant control found`)
      continue
    }
    
    if (directorName === client.contactName) {
      console.log(`   ✅ Contact name already matches director name`)
      continue
    }
    
    console.log(`   ✅ Would update: "${client.contactName}" → "${directorName}"`)
    changes.push({
      clientId: client.id,
      clientCode: client.clientCode,
      companyName: client.companyName,
      currentContactName: client.contactName,
      newContactName: directorName,
      companyNumber: client.companyNumber
    })
  }
  
  console.log(`\n📊 PREVIEW SUMMARY:`)
  console.log(`   Total clients analyzed: ${clients.length}`)
  console.log(`   Clients that would be updated: ${changes.length}`)
  console.log(`   Clients with no changes needed: ${clients.length - changes.length}`)
  
  if (changes.length > 0) {
    console.log(`\n📝 CHANGES PREVIEW:`)
    changes.forEach(change => {
      console.log(`   ${change.clientCode}: "${change.currentContactName}" → "${change.newContactName}"`)
    })
    
    console.log(`\n✅ To apply these changes, run: node scripts/migrate-contact-names.js --apply`)
  } else {
    console.log(`\n✅ No changes needed. All clients already have appropriate contact names.`)
  }
  
  return changes
}

/**
 * Apply changes to clients
 */
async function applyChanges() {
  console.log('🚀 APPLY MODE: Updating client contact names...\n')
  
  const clients = await findClientsToUpdate()
  const changes = []
  const backup = []
  
  for (const client of clients) {
    console.log(`📋 Processing: ${client.clientCode} - ${client.companyName}`)
    
    // Fetch PSC data
    const pscData = await fetchPSCData(client.companyNumber)
    if (!pscData || !pscData.psc) {
      console.log(`   ❌ No PSC data available - skipping`)
      continue
    }
    
    // Extract director name
    const directorName = getDirectorWithSignificantControl(pscData.psc)
    if (!directorName) {
      console.log(`   ❌ No director with significant control found - skipping`)
      continue
    }
    
    if (directorName === client.contactName) {
      console.log(`   ✅ Contact name already matches director name - skipping`)
      continue
    }
    
    // Create backup entry
    backup.push({
      clientId: client.id,
      clientCode: client.clientCode,
      originalContactName: client.contactName,
      updatedContactName: directorName,
      updatedAt: new Date().toISOString()
    })
    
    try {
      // Update client
      await prisma.client.update({
        where: { id: client.id },
        data: { contactName: directorName }
      })
      
      console.log(`   ✅ Updated: "${client.contactName}" → "${directorName}"`)
      changes.push({
        clientId: client.id,
        clientCode: client.clientCode,
        success: true,
        oldName: client.contactName,
        newName: directorName
      })
    } catch (error) {
      console.log(`   ❌ Failed to update: ${error.message}`)
      changes.push({
        clientId: client.id,
        clientCode: client.clientCode,
        success: false,
        error: error.message
      })
    }
  }
  
  // Save backup
  if (backup.length > 0) {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2))
    console.log(`\n💾 Backup saved: ${BACKUP_FILE}`)
  }
  
  // Summary
  const successCount = changes.filter(c => c.success).length
  const failCount = changes.filter(c => !c.success).length
  
  console.log(`\n📊 MIGRATION SUMMARY:`)
  console.log(`   Total clients processed: ${clients.length}`)
  console.log(`   Successfully updated: ${successCount}`)
  console.log(`   Failed updates: ${failCount}`)
  console.log(`   No changes needed: ${clients.length - changes.length}`)
  
  if (successCount > 0) {
    console.log(`\n✅ Migration completed successfully!`)
    console.log(`   Backup file: ${BACKUP_FILE}`)
    console.log(`   To rollback: node scripts/migrate-contact-names.js --rollback`)
  }
  
  return changes
}

/**
 * Rollback changes using backup file
 */
async function rollbackChanges() {
  console.log('🔄 ROLLBACK MODE: Reverting contact name changes...\n')
  
  // Find the most recent backup file
  const backupFiles = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('contact-names-backup-'))
    .sort((a, b) => b.localeCompare(a))
  
  if (backupFiles.length === 0) {
    console.log('❌ No backup files found. Cannot rollback.')
    return
  }
  
  const latestBackup = path.join(BACKUP_DIR, backupFiles[0])
  console.log(`📂 Using backup file: ${latestBackup}`)
  
  try {
    const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'))
    console.log(`📊 Found ${backupData.length} entries to rollback`)
    
    let successCount = 0
    let failCount = 0
    
    for (const entry of backupData) {
      try {
        await prisma.client.update({
          where: { id: entry.clientId },
          data: { contactName: entry.originalContactName }
        })
        
        console.log(`✅ Rollback ${entry.clientCode}: "${entry.updatedContactName}" → "${entry.originalContactName}"`)
        successCount++
      } catch (error) {
        console.log(`❌ Failed to rollback ${entry.clientCode}: ${error.message}`)
        failCount++
      }
    }
    
    console.log(`\n📊 ROLLBACK SUMMARY:`)
    console.log(`   Successfully reverted: ${successCount}`)
    console.log(`   Failed rollbacks: ${failCount}`)
    
    if (successCount > 0) {
      console.log(`\n✅ Rollback completed successfully!`)
    }
    
  } catch (error) {
    console.log(`❌ Error reading backup file: ${error.message}`)
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const mode = args[0]
  
  try {
    switch (mode) {
      case '--preview':
        await previewChanges()
        break
      case '--apply':
        await applyChanges()
        break
      case '--rollback':
        await rollbackChanges()
        break
      default:
        console.log('📋 Contact Name Migration Script')
        console.log('')
        console.log('Usage:')
        console.log('  node scripts/migrate-contact-names.js --preview   # Preview changes')
        console.log('  node scripts/migrate-contact-names.js --apply     # Apply changes')
        console.log('  node scripts/migrate-contact-names.js --rollback  # Rollback changes')
        console.log('')
        console.log('Description:')
        console.log('  Updates existing clients\' contact names from company names to')
        console.log('  director names (persons with significant control) where appropriate.')
        console.log('')
        console.log('Safety Features:')
        console.log('  - Only updates auto-generated contact names (contactName === companyName)')
        console.log('  - Preserves manually edited contact names')
        console.log('  - Creates backup before changes')
        console.log('  - Provides preview mode')
        console.log('  - Includes rollback capability')
        break
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main() 