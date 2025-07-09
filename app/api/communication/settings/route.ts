import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Client } from 'pg'

// Create a direct PostgreSQL client for this operation
async function createDirectPGClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })
  await client.connect()
  return client
}

const CommunicationSettingsSchema = z.object({
  // Email settings (now stored in DB)
  senderEmail: z.string().email('Invalid sender email format').optional(),
  senderName: z.string().min(1, 'Sender name is required').optional(),
  replyToEmail: z.string().email('Invalid reply-to email format').optional(),
  emailSignature: z.string().optional(),
  enableTestMode: z.boolean().optional(),
  
  // Branding settings (stored in DB)
  firmName: z.string().min(1, 'Firm name is required'),
  logoUrl: z.union([z.string().url(), z.literal('')]).optional(),
  primaryColor: z.string().min(1, 'Primary color is required'),
  secondaryColor: z.string().min(1, 'Secondary color is required'),
  websiteUrl: z.union([z.string().url(), z.literal('')]).optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await createDirectPGClient()
    
    try {
      const result = await client.query('SELECT * FROM branding_settings ORDER BY id DESC LIMIT 1')
      
      if (result.rows.length === 0) {
        // Return default settings (both email and branding)
        const defaultSettings = {
          // Email settings
          senderEmail: 'noreply@numericalz.com',
          senderName: 'Numericalz',
          replyToEmail: 'support@numericalz.com',
          emailSignature: '',
          enableTestMode: false,
          
          // Branding settings
          firmName: 'Numericalz',
          logoUrl: '',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          websiteUrl: 'https://numericalz.com',
          phoneNumber: '',
          address: ''
        }
        return NextResponse.json({ success: true, settings: defaultSettings })
      }

      // Convert database row to clean object (all settings from database)
      const settings = {
        // Email settings from database
        senderEmail: result.rows[0].senderEmail || 'noreply@numericalz.com',
        senderName: result.rows[0].senderName || 'Numericalz',
        replyToEmail: result.rows[0].replyToEmail || 'support@numericalz.com',
        emailSignature: result.rows[0].emailSignature || '',
        enableTestMode: result.rows[0].enableTestMode || false,
        
        // Branding settings from database
        firmName: result.rows[0].firmName,
        logoUrl: result.rows[0].logoUrl || '',
        primaryColor: result.rows[0].primaryColor,
        secondaryColor: result.rows[0].secondaryColor,
        websiteUrl: result.rows[0].websiteUrl || '',
        phoneNumber: result.rows[0].phoneNumber || '',
        address: result.rows[0].address || ''
      }

      return NextResponse.json({ success: true, settings: settings })
    } finally {
      await client.end()
    }
  } catch (error) {
    console.error('❌ Communication Settings API: Error fetching settings:', error)
    return NextResponse.json({
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CommunicationSettingsSchema.parse(body)

    const client = await createDirectPGClient()
    
    try {
      // Check if settings exist
      const existingResult = await client.query('SELECT id FROM branding_settings LIMIT 1')
      
      const now = new Date().toISOString()
      
      if (existingResult.rows.length === 0) {
        // Insert new settings
        const insertResult = await client.query(`
          INSERT INTO branding_settings (
            "senderEmail",
            "senderName",
            "replyToEmail",
            "emailSignature",
            "enableTestMode",
            "firmName", 
            "logoUrl", 
            "primaryColor", 
            "secondaryColor", 
            "websiteUrl", 
            "phoneNumber", 
            "address", 
            "createdAt", 
            "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `, [
          validatedData.senderEmail || 'noreply@numericalz.com',
          validatedData.senderName || 'Numericalz',
          validatedData.replyToEmail || 'support@numericalz.com',
          validatedData.emailSignature || '',
          validatedData.enableTestMode || false,
          validatedData.firmName,
          validatedData.logoUrl || '',
          validatedData.primaryColor,
          validatedData.secondaryColor,
          validatedData.websiteUrl || '',
          validatedData.phoneNumber || '',
          validatedData.address || '',
          now,
          now
        ])
        
        const newSettings = {
          // Email settings from database
          senderEmail: insertResult.rows[0].senderEmail || 'noreply@numericalz.com',
          senderName: insertResult.rows[0].senderName || 'Numericalz',
          replyToEmail: insertResult.rows[0].replyToEmail || 'support@numericalz.com',
          emailSignature: insertResult.rows[0].emailSignature || '',
          enableTestMode: insertResult.rows[0].enableTestMode || false,
          
          // Branding settings from database
          firmName: insertResult.rows[0].firmName,
          logoUrl: insertResult.rows[0].logoUrl || '',
          primaryColor: insertResult.rows[0].primaryColor,
          secondaryColor: insertResult.rows[0].secondaryColor,
          websiteUrl: insertResult.rows[0].websiteUrl || '',
          phoneNumber: insertResult.rows[0].phoneNumber || '',
          address: insertResult.rows[0].address || ''
        }
        
        return NextResponse.json({ success: true, settings: newSettings, message: 'Settings saved successfully' })
      } else {
        // Update existing settings
        const updateResult = await client.query(`
          UPDATE branding_settings 
          SET 
            "senderEmail" = $1,
            "senderName" = $2,
            "replyToEmail" = $3,
            "emailSignature" = $4,
            "enableTestMode" = $5,
            "firmName" = $6,
            "logoUrl" = $7,
            "primaryColor" = $8,
            "secondaryColor" = $9,
            "websiteUrl" = $10,
            "phoneNumber" = $11,
            "address" = $12,
            "updatedAt" = $13
          WHERE id = $14
          RETURNING *
        `, [
          validatedData.senderEmail || 'noreply@numericalz.com',
          validatedData.senderName || 'Numericalz',
          validatedData.replyToEmail || 'support@numericalz.com',
          validatedData.emailSignature || '',
          validatedData.enableTestMode || false,
          validatedData.firmName,
          validatedData.logoUrl || '',
          validatedData.primaryColor,
          validatedData.secondaryColor,
          validatedData.websiteUrl || '',
          validatedData.phoneNumber || '',
          validatedData.address || '',
          now,
          existingResult.rows[0].id
        ])
        
        const updatedSettings = {
          // Email settings from database
          senderEmail: updateResult.rows[0].senderEmail || 'noreply@numericalz.com',
          senderName: updateResult.rows[0].senderName || 'Numericalz',
          replyToEmail: updateResult.rows[0].replyToEmail || 'support@numericalz.com',
          emailSignature: updateResult.rows[0].emailSignature || '',
          enableTestMode: updateResult.rows[0].enableTestMode || false,
          
          // Branding settings from database
          firmName: updateResult.rows[0].firmName,
          logoUrl: updateResult.rows[0].logoUrl || '',
          primaryColor: updateResult.rows[0].primaryColor,
          secondaryColor: updateResult.rows[0].secondaryColor,
          websiteUrl: updateResult.rows[0].websiteUrl || '',
          phoneNumber: updateResult.rows[0].phoneNumber || '',
          address: updateResult.rows[0].address || ''
        }
        
        return NextResponse.json({ success: true, settings: updatedSettings, message: 'Settings updated successfully' })
      }
    } finally {
      await client.end()
    }
  } catch (error) {
    console.error('❌ Communication Settings API: Error updating settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 