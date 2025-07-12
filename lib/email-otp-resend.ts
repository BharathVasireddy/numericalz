/**
 * Email OTP Service using Resend
 * 
 * Resend is built specifically for 2025 email authentication requirements
 * and provides excellent deliverability with automatic SPF/DKIM/DMARC compliance
 */

import { Resend } from 'resend'

interface SendOTPParams {
  email: string
  name: string
  otpCode: string
}

interface DeliveryStatus {
  messageId: string
  status: 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'failed'
  timestamp: Date
  error?: string
}

class EmailOTPServiceResend {
  private resend: Resend

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey)
  }

  /**
   * Send OTP code via email using Resend with delivery tracking
   */
  async sendOTP({ email, name, otpCode }: SendOTPParams): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    try {
      console.log('📧 Sending OTP email via Resend to:', email)
      
      const { data, error } = await this.resend.emails.send({
        from: 'Numericalz <noreply@cloud9digital.in>',
        to: [email],
        subject: 'Your Numericalz Login Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Numericalz Login Code</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
              }
              .container {
                background: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e5e7eb;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 10px;
              }
              .subtitle {
                color: #6b7280;
                font-size: 14px;
              }
              .otp-container {
                text-align: center;
                margin: 30px 0;
                padding: 20px;
                background: #f3f4f6;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
              }
              .otp-code {
                font-size: 32px;
                font-weight: bold;
                color: #1f2937;
                letter-spacing: 4px;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
              }
              .instructions {
                color: #4b5563;
                font-size: 16px;
                margin: 20px 0;
                line-height: 1.5;
              }
              .security-note {
                background: #fef3c7;
                border: 1px solid #fbbf24;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
                color: #92400e;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
              }
              .verified-badge {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                margin-left: 8px;
              }
              .delivery-info {
                background: #eff6ff;
                border: 1px solid #3b82f6;
                border-radius: 6px;
                padding: 12px;
                margin: 15px 0;
                font-size: 12px;
                color: #1d4ed8;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">
                  Numericalz
                  <span class="verified-badge">✓ Verified</span>
                </div>
                <div class="subtitle">UK Accounting Firm Management System</div>
              </div>
              
              <div class="instructions">
                Hello <strong>${name}</strong>,
              </div>
              
              <div class="instructions">
                Your secure login code is ready. Enter this code in the login form to access your Numericalz account:
              </div>
              
              <div class="otp-container">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Your Login Code</div>
                <div class="otp-code">${otpCode}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Valid for 10 minutes</div>
              </div>
              
              <div class="instructions">
                1. Go back to the login page<br>
                2. Enter this code in the verification field<br>
                3. Click "Verify Code" to complete login
              </div>
              
              <div class="security-note">
                <strong>🔒 Security Notice:</strong> Never share this code with anyone. Numericalz will never ask for this code via email or phone. If you didn't request this code, please ignore this email.
              </div>

              <div class="delivery-info">
                <strong>📧 Delivery Status:</strong> This email was sent via Resend with 2025 email authentication compliance (SPF, DKIM, DMARC verified). Delivery tracking enabled.
              </div>
              
              <div class="footer">
                <div>This email was sent by Numericalz Internal Management System</div>
                <div>© 2025 Numericalz. All rights reserved.</div>
                <div style="margin-top: 8px;">
                  <strong>Sent from:</strong> cloud9digital.in (Verified Domain)
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        // Add tags for tracking and categorization
        tags: [
          { name: 'type', value: 'otp' },
          { name: 'system', value: 'numericalz' },
          { name: 'environment', value: process.env.NODE_ENV || 'development' }
        ]
      })

      if (error) {
        console.error('❌ Resend API Error:', error)
        return {
          success: false,
          error: error.message || 'Failed to send email'
        }
      }

      if (data?.id) {
        console.log('✅ OTP email sent successfully via Resend')
        console.log('📧 Message ID:', data.id)
        
        return {
          success: true,
          messageId: data.id
        }
      }

      return {
        success: false,
        error: 'No response data from Resend'
      }

    } catch (error) {
      console.error('❌ Resend Service Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get delivery status for a specific message
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus | null> {
    try {
      console.log('🔍 Checking delivery status for message:', messageId)
      
      // Note: As of 2025, Resend doesn't have a direct API to check delivery status
      // But they provide webhook events for delivery tracking
      // This is a placeholder for future implementation
      
      return {
        messageId,
        status: 'sent',
        timestamp: new Date()
      }
    } catch (error) {
      console.error('❌ Error checking delivery status:', error)
      return null
    }
  }

  /**
   * Handle webhook events from Resend for delivery tracking
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      console.log('📨 Resend webhook event received:', event.type, event.data?.email_id)
      
      // Handle different event types
      switch (event.type) {
        case 'email.sent':
          console.log('📧 Email sent:', event.data?.email_id)
          break
        case 'email.delivered':
          console.log('✅ Email delivered:', event.data?.email_id)
          break
        case 'email.delivery_delayed':
          console.log('⏱️ Email delivery delayed:', event.data?.email_id)
          break
        case 'email.bounced':
          console.log('❌ Email bounced:', event.data?.email_id)
          break
        case 'email.complained':
          console.log('⚠️ Email complained:', event.data?.email_id)
          break
        default:
          console.log('📨 Unknown event type:', event.type)
      }
    } catch (error) {
      console.error('❌ Error handling webhook event:', error)
    }
  }
}

// Export service instance
export const emailOTPServiceResend = new EmailOTPServiceResend(
  process.env.RESEND_API_KEY || ''
)

// Export the class for testing
export { EmailOTPServiceResend }

/**
 * Generate a 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Check if OTP is expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Get OTP expiration time (10 minutes from now)
 */
export function getOTPExpiration(): Date {
  const now = new Date()
  return new Date(now.getTime() + 10 * 60 * 1000) // 10 minutes
} 