import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Force production rebuild - Fix cached Prisma client issue
// Last updated: 2025-01-08 to resolve column 'new' error

const UpdateSettingsSchema = z.object({
  // Email settings
  senderEmail: z.string().email('Invalid sender email format'),
  senderName: z.string().min(1, 'Sender name is required').max(100, 'Sender name too long'),
  replyToEmail: z.string().email('Invalid reply-to email format').optional(),
  emailSignature: z.string().max(10000, 'Email signature too long (max 10,000 characters)').optional(),
  enableTestMode: z.boolean().default(false),
  
  // Branding settings
  firmName: z.string().min(1, 'Firm name is required').max(100, 'Firm name too long'),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').default('#2563eb'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').default('#64748b'),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  phoneNumber: z.string().max(20, 'Phone number too long').optional(),
  address: z.string().max(500, 'Address too long').optional()
})

// GET /api/communication/settings - Get communication settings
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Communication Settings API: Getting settings')

    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Communication Settings API: Authentication failed')
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to access settings'
      }, { status: 401 })
    }

    // Only Partners and Managers can access settings
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      console.error(`❌ Communication Settings API: Access denied for role: ${session.user.role}`)
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Only Partners and Managers can access communication settings'
      }, { status: 403 })
    }

    // Get email settings from key-value store
    const settingsKeys = ['senderEmail', 'senderName', 'replyToEmail', 'emailSignature', 'enableTestMode']
    const settingsRecords = await db.settings.findMany({
      where: {
        key: {
          in: settingsKeys
        }
      }
    })

    // Get branding settings from dedicated table
    const brandingSettings = await db.brandingSettings.findFirst()

    // Convert email settings to object with defaults
    const emailSettings = {
      senderEmail: 'notifications@cloud9digital.in',
      senderName: 'Numericalz',
      replyToEmail: 'support@numericalz.com',
      emailSignature: '',
      enableTestMode: false
    }

    settingsRecords.forEach(record => {
      switch (record.key) {
        case 'senderEmail':
          emailSettings.senderEmail = record.value
          break
        case 'senderName':
          emailSettings.senderName = record.value
          break
        case 'replyToEmail':
          emailSettings.replyToEmail = record.value
          break
        case 'emailSignature':
          emailSettings.emailSignature = record.value
          break
        case 'enableTestMode':
          emailSettings.enableTestMode = record.value === 'true'
          break
      }
    })

    // Combine email and branding settings
    const settings = {
      ...emailSettings,
      firmName: brandingSettings?.firmName || 'Numericalz',
      logoUrl: brandingSettings?.logoUrl || '',
      primaryColor: brandingSettings?.primaryColor || '#2563eb',
      secondaryColor: brandingSettings?.secondaryColor || '#64748b',
      websiteUrl: brandingSettings?.websiteUrl || '',
      phoneNumber: brandingSettings?.phoneNumber || '',
      address: brandingSettings?.address || ''
    }

    console.log('✅ Communication Settings API: Settings retrieved successfully')
    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('❌ Communication Settings API: Error getting settings:', error)
    return NextResponse.json({
      error: 'Failed to get communication settings',
      message: 'An error occurred while retrieving settings'
    }, { status: 500 })
  }
}

// PUT /api/communication/settings - Update communication settings
export async function PUT(request: NextRequest) {
  try {
    console.log('🔧 Communication Settings API: Updating settings')

    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Communication Settings API: Authentication failed')
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to update settings'
      }, { status: 401 })
    }

    // Only Partners can update settings
    if (session.user.role !== 'PARTNER') {
      console.error(`❌ Communication Settings API: Access denied for role: ${session.user.role}`)
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Only Partners can update communication settings'
      }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = UpdateSettingsSchema.parse(body)

    console.log(`✅ Communication Settings API: Updating settings`)

    // Update email settings using key-value pairs
    const emailSettingsToUpdate = [
      { key: 'senderEmail', value: validatedData.senderEmail },
      { key: 'senderName', value: validatedData.senderName },
      { key: 'replyToEmail', value: validatedData.replyToEmail || '' },
      { key: 'emailSignature', value: validatedData.emailSignature || '' },
      { key: 'enableTestMode', value: validatedData.enableTestMode.toString() }
    ]

    // Update branding settings - Explicit field mapping to prevent column issues
    const brandingData = {
      firmName: validatedData.firmName,
      logoUrl: validatedData.logoUrl || null,
      primaryColor: validatedData.primaryColor,
      secondaryColor: validatedData.secondaryColor,
      websiteUrl: validatedData.websiteUrl || null,
      phoneNumber: validatedData.phoneNumber || null,
      address: validatedData.address || null
    }

    // Validate that no reserved keywords are used as property names
    const reservedKeywords = ['new', 'constructor', 'prototype', 'class', 'function']
    const dataKeys = Object.keys(brandingData)
    const invalidKey = dataKeys.find(key => reservedKeywords.includes(key))
    if (invalidKey) {
      throw new Error(`Invalid property name: ${invalidKey}`)
    }

    // Use transaction to update all settings atomically
    await db.$transaction(async (tx) => {
      // Update email settings
      await Promise.all(
        emailSettingsToUpdate.map(setting =>
          tx.settings.upsert({
            where: { key: setting.key },
            update: { value: setting.value, updatedAt: new Date() },
            create: { key: setting.key, value: setting.value }
          })
        )
      )

      // Update branding settings with explicit logging
      console.log('🔍 Branding data before update:', JSON.stringify(brandingData, null, 2))
      const existingBranding = await tx.brandingSettings.findFirst()
      if (existingBranding) {
        console.log('🔍 Existing branding found, updating...')
        await tx.brandingSettings.update({
          where: { id: existingBranding.id },
          data: brandingData
        })
      } else {
        console.log('🔍 No existing branding, creating new...')
        await tx.brandingSettings.create({
          data: brandingData
        })
      }
    })

    console.log('✅ Communication Settings API: Settings updated successfully')
    return NextResponse.json({
      success: true,
      message: 'Communication settings updated successfully',
      settings: {
        senderEmail: validatedData.senderEmail,
        senderName: validatedData.senderName,
        replyToEmail: validatedData.replyToEmail,
        emailSignature: validatedData.emailSignature,
        enableTestMode: validatedData.enableTestMode,
        firmName: validatedData.firmName,
        logoUrl: validatedData.logoUrl,
        primaryColor: validatedData.primaryColor,
        secondaryColor: validatedData.secondaryColor,
        websiteUrl: validatedData.websiteUrl,
        phoneNumber: validatedData.phoneNumber,
        address: validatedData.address
      }
    })

  } catch (error) {
    console.error('❌ Communication Settings API: Error updating settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        message: 'Please check your input and try again',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }
    
    // Handle Prisma column errors specifically
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.error('❌ Prisma column error detected:', errorMessage)
        return NextResponse.json({
          error: 'Database schema error',
          message: 'Please contact support - database schema needs to be updated',
          details: errorMessage
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      error: 'Failed to update communication settings',
      message: 'An error occurred while updating settings'
    }, { status: 500 })
  }
} 