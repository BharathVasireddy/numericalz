// 🔒 AUTHENTICATION SYSTEM - LOCKED & PROTECTED
// ⚠️ CRITICAL WARNING: DO NOT MODIFY THIS FILE WITHOUT EXTREME CAUTION
// This file is part of the working authentication system - see AUTHENTICATION_LOCK.md

/**
 * Email OTP Service
 * 
 * Enhanced service with dual-provider support (Resend + Brevo fallback)
 * Handles sending OTP codes via email with 2025 compliance
 * Simple, clean implementation with automatic fallback
 */

import { Resend } from 'resend'

interface EmailOTPConfig {
  // Brevo configuration
  brevoApiKey: string
  brevoSenderEmail: string
  brevoSenderName: string
  
  // Resend configuration
  resendApiKey: string
  resendSenderEmail: string
  resendSenderName: string
}

interface SendOTPParams {
  email: string
  otpCode: string
}

interface SendOTPResult {
  success: boolean
  messageId?: string
  service: 'resend' | 'brevo'
  error?: string
}

class EmailOTPService {
  private resend: Resend | null = null
  private config: EmailOTPConfig

  constructor() {
    this.config = {
      // Brevo configuration
      brevoApiKey: process.env.BREVO_API_KEY || '',
      brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || 'auto-reminder@numericalz.com',
      brevoSenderName: process.env.BREVO_SENDER_NAME || 'Numericalz',
      
      // Resend configuration
      resendApiKey: process.env.RESEND_API_KEY || '',
      resendSenderEmail: process.env.RESEND_SENDER_EMAIL || 'noreply@cloud9digital.in',
      resendSenderName: process.env.RESEND_SENDER_NAME || 'Numericalz'
    }

    // Initialize Resend if API key is available
    if (this.config.resendApiKey) {
      this.resend = new Resend(this.config.resendApiKey)
    }
  }

  /**
   * Generate OTP email template matching the exact design requirement
   * OPTIMIZED: Clean, professional template with personalized greeting
   */
  private async generateOTPEmailTemplate(otpCode: string, userEmail: string): Promise<string> {
    // Get user details for personalization
    let userName = 'User'
    let userRole = 'User'
    
    try {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      const user = await prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() },
        select: { name: true, role: true }
      })
      
      if (user) {
        userName = user.name || 'User'
        userRole = user.role === 'PARTNER' ? 'Partner' : 
                   user.role === 'MANAGER' ? 'Manager' : 
                   user.role === 'STAFF' ? 'Staff' : 'User'
      }
      
      await prisma.$disconnect()
    } catch (error) {
      console.error('Failed to get user details for OTP email:', error)
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Code</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f8f9fa; 
            color: #333;
            line-height: 1.6;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1a1a1a;
            font-size: 28px;
            margin: 0;
            font-weight: bold;
          }
          .header p {
            color: #666;
            font-size: 16px;
            margin: 8px 0 0 0;
          }
          .greeting {
            font-size: 18px;
            color: #333;
            margin: 30px 0 20px 0;
          }
          .instruction {
            color: #555;
            margin-bottom: 30px;
          }
          .code-box {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
          }
          .code-label {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 8px;
            margin: 10px 0;
          }
          .expires {
            color: #666;
            font-size: 14px;
            margin-top: 15px;
          }
          .security-notice {
            background: #f8f9fa;
            border-left: 4px solid #fbbf24;
            padding: 20px;
            margin: 30px 0;
          }
          .security-notice h3 {
            color: #333;
            margin: 0 0 15px 0;
            font-size: 16px;
          }
          .security-notice ul {
            margin: 0;
            padding-left: 20px;
          }
          .security-notice li {
            color: #666;
            margin-bottom: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Numericalz</h1>
            <p>UK Accounting Firm Management System</p>
          </div>
          
          <div class="greeting">
            Hello ${userRole} ${userName},
          </div>
          
          <div class="instruction">
            Please use this verification code to complete your login:
          </div>
          
          <div class="code-box">
            <div class="code-label">Your verification code:</div>
            <div class="code">${otpCode}</div>
            <div class="expires">Expires in 10 minutes</div>
          </div>
          
          <div class="security-notice">
            <h3>Security Notice:</h3>
            <ul>
              <li>Never share this code with anyone</li>
              <li>Our team will never ask for this code</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Numericalz Internal Management System</p>
            <p>This is an automated message - please do not reply</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Send OTP via Resend (primary method)
   */
  private async sendOTPViaResend(params: SendOTPParams): Promise<SendOTPResult> {
    if (!this.resend) {
      throw new Error('Resend not initialized')
    }

    try {
      console.log('📧 Attempting to send OTP via Resend (primary)...')
      
      const result = await this.resend.emails.send({
        from: `${this.config.resendSenderName} <${this.config.resendSenderEmail}>`,
        to: [params.email],
        subject: `Login Code: ${params.otpCode}`, // Simple subject with OTP
        html: await this.generateOTPEmailTemplate(params.otpCode, params.email)
      })

      console.log('✅ OTP sent successfully via Resend')
      
      return {
        success: true,
        messageId: result.data?.id,
        service: 'resend'
      }
    } catch (error) {
      console.error('❌ Resend OTP failed:', error)
      throw error
    }
  }

  /**
   * Send OTP via Brevo (fallback method)
   */
  private async sendOTPViaBrevo(params: SendOTPParams): Promise<SendOTPResult> {
    try {
      console.log('📧 Attempting to send OTP via Brevo (fallback)...')
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.config.brevoApiKey
        },
        body: JSON.stringify({
          sender: {
            name: this.config.brevoSenderName,
            email: this.config.brevoSenderEmail
          },
          to: [{ email: params.email }],
          subject: `Login Code: ${params.otpCode}`, // Simple subject with OTP
          htmlContent: await this.generateOTPEmailTemplate(params.otpCode, params.email)
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Brevo API error: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ OTP sent successfully via Brevo')
      
      return {
        success: true,
        messageId: result.messageId,
        service: 'brevo'
      }
    } catch (error) {
      console.error('❌ Brevo OTP failed:', error)
      throw error
    }
  }

  /**
   * Send OTP with automatic fallback and email logging
   */
  async sendOTP(params: SendOTPParams): Promise<SendOTPResult> {
    let emailResult: SendOTPResult

    // Try Resend first (primary)
    if (this.resend && this.config.resendApiKey) {
      try {
        emailResult = await this.sendOTPViaResend(params)
      } catch (error) {
        console.log('⚠️ Resend failed, trying Brevo fallback...')
        // Fallback to Brevo
        if (this.config.brevoApiKey) {
          try {
            emailResult = await this.sendOTPViaBrevo(params)
          } catch (brevoError) {
            console.error('❌ Both email services failed:', brevoError)
            emailResult = {
              success: false,
              service: 'brevo',
              error: brevoError instanceof Error ? brevoError.message : 'Unknown error'
            }
          }
        } else {
          emailResult = {
            success: false,
            service: 'brevo',
            error: 'No email service configured'
          }
        }
      }
    } else {
      // Fallback to Brevo
      if (this.config.brevoApiKey) {
        try {
          emailResult = await this.sendOTPViaBrevo(params)
        } catch (error) {
          console.error('❌ Brevo email failed:', error)
          emailResult = {
            success: false,
            service: 'brevo',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      } else {
        emailResult = {
          success: false,
          service: 'brevo',
          error: 'No email service configured'
        }
      }
    }

    // 📧 Log OTP email to database for email history
    try {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      await prisma.emailLog.create({
        data: {
          recipientEmail: params.email,
          recipientName: null, // OTP emails don't have personalized names
          subject: `Login Code: ${params.otpCode}`,
          content: await this.generateOTPEmailTemplate(params.otpCode, params.email),
          emailType: 'OTP_LOGIN',
          status: emailResult.success ? 'SENT' : 'FAILED',
          sentAt: emailResult.success ? new Date() : null,
          failedAt: emailResult.success ? null : new Date(),
          failureReason: emailResult.success ? null : emailResult.error,
          fromEmail: emailResult.service === 'resend' ? this.config.resendSenderEmail : this.config.brevoSenderEmail,
          fromName: emailResult.service === 'resend' ? this.config.resendSenderName : this.config.brevoSenderName,
          triggeredBy: null, // System-generated, not user-triggered
          templateData: JSON.stringify({
            otpCode: params.otpCode,
            service: emailResult.service,
            messageId: emailResult.messageId
          })
        }
      })

      await prisma.$disconnect()
      console.log('✅ OTP email logged to email history')
    } catch (logError) {
      console.error('❌ Failed to log OTP email to database:', logError)
      // Don't fail the OTP process if logging fails
    }

    return emailResult
  }

  /**
   * Handle webhook events from Resend
   */
  async handleWebhookEvent(event: any): Promise<void> {
    console.log('📨 Processing webhook event:', {
      type: event.type,
      messageId: event.data?.email_id,
      timestamp: new Date().toISOString()
    })
    
    // You can add database logging here if needed
    // For now, we just log the event
  }
}

// Create singleton instance
export const emailOTPService = new EmailOTPService()

// Utility functions
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getOTPExpiration(): Date {
  const expiration = new Date()
  expiration.setMinutes(expiration.getMinutes() + 10) // 10 minutes expiration
  return expiration
}

export function isOTPExpired(otpExpiresAt: Date): boolean {
  return new Date() > otpExpiresAt
} 