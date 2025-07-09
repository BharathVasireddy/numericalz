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

const BrandingSettingsSchema = z.object({
  firmName: z.string().min(1, 'Firm name is required'),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  primaryColor: z.string().min(1, 'Primary color is required'),
  secondaryColor: z.string().min(1, 'Secondary color is required'),
  emailSignature: z.string().optional(),
  websiteUrl: z.string().url('Invalid website URL').optional(),
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
        // Return default branding settings
        const defaultSettings = {
          firmName: 'Numericalz',
          logoUrl: '',
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          emailSignature: '',
          websiteUrl: 'https://numericalz.com',
          phoneNumber: '',
          address: ''
        }
        return NextResponse.json({ success: true, data: defaultSettings })
      }

      // Convert database row to clean object
      const settings = {
        firmName: result.rows[0].firmName,
        logoUrl: result.rows[0].logoUrl || '',
        primaryColor: result.rows[0].primaryColor,
        secondaryColor: result.rows[0].secondaryColor,
        emailSignature: result.rows[0].emailSignature || '',
        websiteUrl: result.rows[0].websiteUrl || '',
        phoneNumber: result.rows[0].phoneNumber || '',
        address: result.rows[0].address || ''
      }

      return NextResponse.json({ success: true, data: settings })
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = BrandingSettingsSchema.parse(body)

    const client = await createDirectPGClient()
    
    try {
      // Check if settings exist
      const existingResult = await client.query('SELECT id FROM branding_settings LIMIT 1')
      
      const now = new Date().toISOString()
      
      if (existingResult.rows.length === 0) {
        // Insert new settings
        const insertResult = await client.query(`
          INSERT INTO branding_settings (
            "firmName", 
            "logoUrl", 
            "primaryColor", 
            "secondaryColor", 
            "emailSignature", 
            "websiteUrl", 
            "phoneNumber", 
            "address", 
            "createdAt", 
            "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          validatedData.firmName,
          validatedData.logoUrl || '',
          validatedData.primaryColor,
          validatedData.secondaryColor,
          validatedData.emailSignature || '',
          validatedData.websiteUrl || '',
          validatedData.phoneNumber || '',
          validatedData.address || '',
          now,
          now
        ])
        
        const newSettings = {
          firmName: insertResult.rows[0].firmName,
          logoUrl: insertResult.rows[0].logoUrl || '',
          primaryColor: insertResult.rows[0].primaryColor,
          secondaryColor: insertResult.rows[0].secondaryColor,
          emailSignature: insertResult.rows[0].emailSignature || '',
          websiteUrl: insertResult.rows[0].websiteUrl || '',
          phoneNumber: insertResult.rows[0].phoneNumber || '',
          address: insertResult.rows[0].address || ''
        }
        
        return NextResponse.json({ success: true, data: newSettings })
      } else {
        // Update existing settings
        const updateResult = await client.query(`
          UPDATE branding_settings 
          SET 
            "firmName" = $1,
            "logoUrl" = $2,
            "primaryColor" = $3,
            "secondaryColor" = $4,
            "emailSignature" = $5,
            "websiteUrl" = $6,
            "phoneNumber" = $7,
            "address" = $8,
            "updatedAt" = $9
          WHERE id = $10
          RETURNING *
        `, [
          validatedData.firmName,
          validatedData.logoUrl || '',
          validatedData.primaryColor,
          validatedData.secondaryColor,
          validatedData.emailSignature || '',
          validatedData.websiteUrl || '',
          validatedData.phoneNumber || '',
          validatedData.address || '',
          now,
          existingResult.rows[0].id
        ])
        
        const updatedSettings = {
          firmName: updateResult.rows[0].firmName,
          logoUrl: updateResult.rows[0].logoUrl || '',
          primaryColor: updateResult.rows[0].primaryColor,
          secondaryColor: updateResult.rows[0].secondaryColor,
          emailSignature: updateResult.rows[0].emailSignature || '',
          websiteUrl: updateResult.rows[0].websiteUrl || '',
          phoneNumber: updateResult.rows[0].phoneNumber || '',
          address: updateResult.rows[0].address || ''
        }
        
        return NextResponse.json({ success: true, data: updatedSettings })
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