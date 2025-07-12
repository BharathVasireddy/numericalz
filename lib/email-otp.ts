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
   * Generate simple OTP email template without personalization or signature
   */
  private generateOTPEmailTemplate(otpCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #f9f9f9; padding: 30px; border-radius: 10px; text-align: center; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 3px; }
          .copy-button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 10px 0; }
          .copy-button:hover { background: #1d4ed8; }
          .notice { color: #666; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Login Verification Code</h2>
          <p>Your verification code is:</p>
          
          <div class="otp-code" id="otpCode">${otpCode}</div>
          
          <button class="copy-button" onclick="copyToClipboard()">📋 Copy Code</button>
          
          <p class="notice">This code will expire in 10 minutes.</p>
        </div>
        
        <script>
          function copyToClipboard() {
            const otpCode = document.getElementById('otpCode').textContent;
            navigator.clipboard.writeText(otpCode).then(function() {
              alert('Code copied to clipboard!');
            }).catch(function() {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = otpCode;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('Code copied to clipboard!');
            });
          }
        </script>
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
        html: this.generateOTPEmailTemplate(params.otpCode)
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
          htmlContent: this.generateOTPEmailTemplate(params.otpCode)
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
   * Send OTP with automatic fallback
   */
  async sendOTP(params: SendOTPParams): Promise<SendOTPResult> {
    // Try Resend first (primary)
    if (this.resend && this.config.resendApiKey) {
      try {
        return await this.sendOTPViaResend(params)
      } catch (error) {
        console.log('⚠️ Resend failed, trying Brevo fallback...')
      }
    }

    // Fallback to Brevo
    if (this.config.brevoApiKey) {
      try {
        return await this.sendOTPViaBrevo(params)
      } catch (error) {
        console.error('❌ Both email services failed:', error)
        return {
          success: false,
          service: 'brevo',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    return {
      success: false,
      service: 'brevo',
      error: 'No email service configured'
    }
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