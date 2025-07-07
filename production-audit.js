const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:MGcgdwwwXqnVYDTCiWDpAOGcOaCJXauC@shortline.proxy.rlwy.net:19663/railway"
    }
  }
})

async function auditProduction() {
  try {
    console.log('🔍 PRODUCTION AUDIT - Current State Analysis')
    console.log('=' * 60)
    
    // 1. Check Email Logs Status
    console.log('\n📧 EMAIL LOGS ANALYSIS:')
    const emailLogCount = await prisma.emailLog.count()
    console.log(`  Total Email Logs: ${emailLogCount}`)
    
    // Check if we can query email logs with basic fields
    try {
      const recentEmails = await prisma.emailLog.findMany({
        select: {
          id: true,
          subject: true,
          recipientEmail: true,
          status: true,
          createdAt: true
        },
        take: 3,
        orderBy: { createdAt: 'desc' }
      })
      console.log(`  ✅ Basic email log queries work: ${recentEmails.length} recent emails`)
    } catch (emailError) {
      console.log(`  ❌ Basic email log queries fail: ${emailError.message}`)
    }
    
    // 2. Check Email Templates Status  
    console.log('\n📄 EMAIL TEMPLATES ANALYSIS:')
    try {
      const templateCount = await prisma.emailTemplate.count()
      console.log(`  Total Email Templates: ${templateCount}`)
      
      if (templateCount > 0) {
        const templates = await prisma.emailTemplate.findMany({
          select: {
            id: true,
            name: true,
            subject: true
          }
        })
        console.log('  Templates:')
        templates.forEach(t => console.log(`    - ${t.name}: ${t.subject}`))
      }
    } catch (templateError) {
      console.log(`  ❌ Email template queries fail: ${templateError.message}`)
    }
    
    // 3. Check Database Schema - What fields exist?
    console.log('\n🗃️  DATABASE SCHEMA ANALYSIS:')
    
    // Check if vatAssignedUserId still exists in clients table
    try {
      const clientWithVat = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name LIKE '%vat%'
      `
      console.log('  VAT-related fields in clients table:')
      clientWithVat.forEach(col => console.log(`    - ${col.column_name}`))
    } catch (error) {
      console.log(`  ❌ Cannot check client schema: ${error.message}`)
    }
    
    // Check email_logs table structure
    try {
      const emailLogColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'email_logs'
        ORDER BY ordinal_position
      `
      console.log('\n  Email Logs table structure:')
      emailLogColumns.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    } catch (error) {
      console.log(`  ❌ Cannot check email_logs schema: ${error.message}`)
    }
    
    // Check email_templates table structure  
    try {
      const templateColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'email_templates'
        ORDER BY ordinal_position
      `
      console.log('\n  Email Templates table structure:')
      templateColumns.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    } catch (error) {
      console.log(`  ❌ Cannot check email_templates schema: ${error.message}`)
    }
    
    // 4. Check Client Assignments Status
    console.log('\n👥 CLIENT ASSIGNMENTS ANALYSIS:')
    try {
      const clientsWithAssignments = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_clients,
          COUNT(assigned_user_id) as clients_with_assigned_user,
          COUNT(ltd_company_assigned_user_id) as clients_with_ltd_assigned,
          COUNT(non_ltd_company_assigned_user_id) as clients_with_non_ltd_assigned
        FROM clients
      `
      
      console.log('  Client Assignment Status:')
      clientsWithAssignments.forEach(stats => {
        console.log(`    Total Clients: ${stats.total_clients}`)
        console.log(`    With Assigned User: ${stats.clients_with_assigned_user}`)
        console.log(`    With LTD Assigned: ${stats.clients_with_ltd_assigned}`)
        console.log(`    With Non-LTD Assigned: ${stats.clients_with_non_ltd_assigned}`)
      })
    } catch (error) {
      console.log(`  ❌ Cannot check client assignments: ${error.message}`)
    }
    
    // 5. Check VAT Quarters Status
    console.log('\n📊 VAT QUARTERS ANALYSIS:')
    try {
      const vatStats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_vat_quarters,
          COUNT(assigned_user_id) as quarters_with_assigned_user,
          COUNT(DISTINCT client_id) as clients_with_vat_quarters
        FROM vat_quarters
      `
      
      console.log('  VAT Quarters Status:')
      vatStats.forEach(stats => {
        console.log(`    Total VAT Quarters: ${stats.total_vat_quarters}`)
        console.log(`    With Assigned User: ${stats.quarters_with_assigned_user}`)
        console.log(`    Clients with VAT Quarters: ${stats.clients_with_vat_quarters}`)
      })
    } catch (error) {
      console.log(`  ❌ Cannot check VAT quarters: ${error.message}`)
    }
    
    console.log('\n🏁 AUDIT COMPLETE')
    console.log('=' * 60)
    
  } catch (error) {
    console.error('❌ AUDIT FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

auditProduction() 