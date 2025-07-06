// 🔒 AUTHENTICATION SYSTEM - LOCKED & PROTECTED
// ⚠️ CRITICAL WARNING: DO NOT MODIFY THIS FILE WITHOUT EXTREME CAUTION
// This file is part of the working authentication system - see AUTHENTICATION_LOCK.md

/**
 * Email OTP Service
 * 
 * Handles sending OTP codes via email using Brevo (Sendinblue) API
 * This is a clean implementation that can be easily extended to other providers
 */

interface EmailOTPConfig {
  apiKey: string
  senderEmail: string
  senderName: string
}

interface SendOTPParams {
  email: string
  name: string
  otpCode: string
}

class EmailOTPService {
  private config: EmailOTPConfig

  constructor(config: EmailOTPConfig) {
    this.config = config
  }

  /**
   * Send OTP code via email
   */
  async sendOTP({ email, name, otpCode }: SendOTPParams): Promise<boolean> {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          sender: {
            email: this.config.senderEmail,
            name: this.config.senderName,
          },
          to: [
            {
              email: email,
              name: name,
            },
          ],
          subject: 'Your Numericalz Login Code',
          htmlContent: this.generateOTPEmailHTML(name, otpCode),
          textContent: this.generateOTPEmailText(name, otpCode),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Email sending failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        return false
      }

      console.log('OTP email sent successfully to:', email)
      return true
    } catch (error) {
      console.error('Error sending OTP email:', error)
      return false
    }
  }

  /**
   * Generate HTML email content
   */
  private generateOTPEmailHTML(name: string, otpCode: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Numericalz Login Code</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
        .otp-box { 
            background: #f7fafc; 
            border: 2px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
            margin: 20px 0; 
        }
        .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #1a365d; 
            letter-spacing: 8px; 
            margin: 10px 0; 
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            text-align: center; 
            color: #718096; 
            font-size: 14px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Numericalz</div>
            <p>UK Accounting Firm Management System</p>
        </div>
        
        <h2>Hello ${name},</h2>
        
        <p>You have requested to sign in to your Numericalz account. Please use the verification code below to complete your login:</p>
        
        <div class="otp-box">
            <p><strong>Your verification code is:</strong></p>
            <div class="otp-code">${otpCode}</div>
            <p><small>This code will expire in 10 minutes</small></p>
        </div>
        
        <p>If you didn't request this code, please ignore this email or contact your system administrator.</p>
        
        <p>For security reasons:</p>
        <ul>
            <li>Never share this code with anyone</li>
            <li>Our team will never ask for this code</li>
            <li>This code is only valid for 10 minutes</li>
        </ul>
        
        <div class="footer">
            <p>This is an automated message from Numericalz Internal Management System</p>
            <p>If you need assistance, please contact your system administrator</p>
        </div>
    </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate plain text email content
   */
  private generateOTPEmailText(name: string, otpCode: string): string {
    return `
Hello ${name},

You have requested to sign in to your Numericalz account.

Your verification code is: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email or contact your system administrator.

For security reasons:
- Never share this code with anyone
- Our team will never ask for this code
- This code is only valid for 10 minutes

---
This is an automated message from Numericalz Internal Management System
If you need assistance, please contact your system administrator
    `.trim()
  }
}

// Create and export the email service instance
export const emailOTPService = new EmailOTPService({
  apiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'notifications@cloud9digital.in',
  senderName: 'Numericalz',
})

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