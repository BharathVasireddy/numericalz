const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:MGcgdwwwXqnVYDTCiWDpAOGcOaCJXauC@shortline.proxy.rlwy.net:19663/railway"
    }
  }
})

async function migrate() {
  console.log('📧 Starting Migration: Create Email Template')
  console.log('=' * 50)
  
  try {
    // Step 1: Check current template count
    console.log('\n📋 Step 1: Checking current email templates...')
    
    const currentTemplates = await prisma.emailTemplate.count()
    console.log(`  Current email templates: ${currentTemplates}`)
    
    if (currentTemplates > 0) {
      const templates = await prisma.emailTemplate.findMany({
        select: { id: true, name: true, subject: true }
      })
      console.log('  Existing templates:')
      templates.forEach(t => console.log(`    - ${t.name}: ${t.subject}`))
    }
    
    // Step 2: Get template data from backup
    console.log('\n🔍 Step 2: Reading template data from backup...')
    
    const backupPath = 'backups/backup-2025-07-07T16-24-51-778Z.json'
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    const emailTemplates = backupData.data.emailTemplates || []
    
    console.log(`  Found ${emailTemplates.length} templates in backup`)
    
    if (emailTemplates.length === 0) {
      console.log('  ⚠️  No templates in backup - creating default template')
    } else {
      emailTemplates.forEach(template => {
        console.log(`    - ${template.name}: ${template.subject}`)
        console.log(`      Content length: ${(template.content || '').length} chars`)
      })
    }
    
    // Step 3: Create templates with correct schema
    console.log('\n✨ Step 3: Creating email templates...')
    
    const templatesToCreate = emailTemplates.length > 0 ? emailTemplates : [
      {
        id: 'vat-paperwork-request-default',
        name: 'VAT Paperwork Request',
        subject: 'VAT Paperwork Request',
        content: 'Please provide the necessary VAT paperwork for processing.'
      }
    ]
    
    for (const template of templatesToCreate) {
      try {
        // Convert content to htmlContent format
        const htmlContent = template.content || `<p>${template.subject}</p>`
        const textContent = template.content || template.subject
        
        const templateData = {
          id: template.id || `template-${Date.now()}`,
          name: template.name,
          subject: template.subject,
          htmlContent: htmlContent,
          textContent: textContent,
          variables: JSON.stringify([]), // Empty variables array
          isActive: template.isActive !== false, // Default to true
          createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
          updatedAt: template.updatedAt ? new Date(template.updatedAt) : new Date()
        }
        
        console.log(`  Creating template: ${template.name}`)
        
        // Check if template already exists
        const existingTemplate = await prisma.emailTemplate.findUnique({
          where: { id: templateData.id }
        })
        
        if (existingTemplate) {
          console.log(`    ⚠️  Template ${template.name} already exists, skipping`)
          continue
        }
        
        await prisma.emailTemplate.create({
          data: templateData
        })
        
        console.log(`    ✅ Created template: ${template.name}`)
        
      } catch (templateError) {
        console.error(`    ❌ Failed to create template ${template.name}:`, templateError.message)
        
        // Try with minimal data
        try {
          const minimalTemplate = {
            name: template.name,
            subject: template.subject,
            htmlContent: `<p>${template.subject}</p>`,
            textContent: template.subject,
            variables: '[]',
            isActive: true
          }
          
          await prisma.emailTemplate.create({
            data: minimalTemplate
          })
          
          console.log(`    ✅ Created minimal template: ${template.name}`)
        } catch (minimalError) {
          console.error(`    ❌ Failed with minimal template:`, minimalError.message)
        }
      }
    }
    
    // Step 4: Verify templates created
    console.log('\n✅ Step 4: Verifying templates created...')
    
    const finalTemplateCount = await prisma.emailTemplate.count()
    console.log(`  Total email templates after migration: ${finalTemplateCount}`)
    
    if (finalTemplateCount > currentTemplates) {
      const newTemplates = await prisma.emailTemplate.findMany({
        select: { id: true, name: true, subject: true, isActive: true }
      })
      
      console.log('  All email templates:')
      newTemplates.forEach(t => {
        console.log(`    - ${t.name}: ${t.subject} (Active: ${t.isActive})`)
      })
    }
    
    // Step 5: Test template functionality
    console.log('\n🧪 Step 5: Testing template functionality...')
    
    const testTemplate = await prisma.emailTemplate.findFirst()
    if (testTemplate) {
      console.log(`  ✅ Can query templates: Found "${testTemplate.name}"`)
      console.log(`  ✅ Template has htmlContent: ${testTemplate.htmlContent.length} chars`)
    } else {
      console.log('  ⚠️  No templates found after creation')
    }
    
    console.log('\n🎉 Email template migration completed successfully!')
    console.log('=' * 50)
    
    return {
      success: true,
      templatesCreated: finalTemplateCount - currentTemplates,
      totalTemplates: finalTemplateCount,
      summary: 'Email templates created with correct schema'
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.log('\n🔄 Rollback instructions:')
    console.log('1. Delete any created templates:')
    console.log('   DELETE FROM email_templates WHERE created_at > NOW() - INTERVAL \'1 hour\';')
    console.log('2. Check application functionality')
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(result => {
      console.log('\n✅ Migration Result:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Migration Error:', error)
      process.exit(1)
    })
}

module.exports = { migrate } 