/**
 * Email Optimization Utilities for Gmail Clipping Prevention
 * 
 * Gmail clips emails that exceed 102KB (approximately 104,857 characters).
 * These utilities help keep emails under 80KB for safety margin.
 */

export const EMAIL_LIMITS = {
  GMAIL_HARD_LIMIT: 102 * 1024, // 102KB - Gmail's actual limit
  SAFE_LIMIT: 80 * 1024,        // 80KB - Our safety margin
  CONTENT_RESERVE: 2000,        // Bytes reserved for HTML wrapper
} as const

/**
 * Remove HTML tags and clean up text content
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')           // Replace &nbsp; with space
    .replace(/&amp;/g, '&')            // Replace &amp; with &
    .replace(/&lt;/g, '<')             // Replace &lt; with <
    .replace(/&gt;/g, '>')             // Replace &gt; with >
    .replace(/&quot;/g, '"')           // Replace &quot; with "
    .replace(/&#39;/g, "'")            // Replace &#39; with '
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim()
}

/**
 * Calculate email size in bytes
 */
export function getEmailSize(content: string): number {
  return new Blob([content]).size
}

/**
 * Check if email content exceeds size limits
 */
export function isEmailTooLarge(content: string, limit = EMAIL_LIMITS.SAFE_LIMIT): boolean {
  return getEmailSize(content) > limit
}

/**
 * Create optimized HTML structure for Gmail
 */
export async function createOptimizedEmailTemplate(content: string, options: {
  subject?: string
  companyName?: string
  signature?: string
  maxSize?: number
} = {}): Promise<string> {
  const {
    subject = '',
    companyName = 'Numericalz',
    signature = '',
    maxSize = EMAIL_LIMITS.SAFE_LIMIT
  } = options

  // If no signature provided, try to fetch from settings
  let emailSignature = signature
  if (!emailSignature) {
    try {
      // Use direct PostgreSQL client to get signature from branding_settings table
      const { Client } = require('pg')
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      })
      
      await client.connect()
      const result = await client.query('SELECT "emailSignature" FROM branding_settings ORDER BY id DESC LIMIT 1')
      
      if (result.rows.length > 0) {
        emailSignature = result.rows[0].emailSignature || ''
      }
      
      await client.end()
    } catch (error) {
      console.warn('Failed to fetch email signature:', error)
      emailSignature = ''
    }
  }

  // Minimal CSS for better email client compatibility with signature support
  const minimalHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background:#f9f9f9}
.container{max-width:600px;margin:0 auto;background:#fff;padding:30px;border-radius:8px}
.content{line-height:1.6}
.signature{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb}
.footer{margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#666;font-size:12px}
a{color:#0066cc}
h1,h2,h3{color:#333;margin:20px 0 10px}
p{margin:16px 0}
</style>
</head>
<body>
<div class="container">
<div class="content">
${content}
${emailSignature ? `<div class="signature">${emailSignature}</div>` : ''}
</div>
<div class="footer">
<p>${companyName} - UK Accounting Services</p>
</div>
</div>
</body>
</html>`

  // Check size and truncate if necessary
  const emailSize = getEmailSize(minimalHtml)
  
  if (emailSize > maxSize) {
    console.warn(`📧 Email Optimization: Email size (${Math.round(emailSize/1024)}KB) exceeds limit. Truncating content.`)
    
    // Calculate maximum content size (reserve space for signature)
    const signatureSize = emailSignature ? getEmailSize(emailSignature) : 0
    const maxContentSize = maxSize - EMAIL_LIMITS.CONTENT_RESERVE - signatureSize
    const truncatedContent = content.substring(0, maxContentSize) + 
      '\n\n<p><em>[Content truncated to prevent Gmail clipping. View full details in your dashboard.]</em></p>'
    
    const truncatedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background:#f9f9f9}
.container{max-width:600px;margin:0 auto;background:#fff;padding:30px;border-radius:8px}
.content{line-height:1.6}
.signature{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb}
.footer{margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#666;font-size:12px}
a{color:#0066cc}
h1,h2,h3{color:#333;margin:20px 0 10px}
p{margin:16px 0}
</style>
</head>
<body>
<div class="container">
<div class="content">
${truncatedContent}
${emailSignature ? `<div class="signature">${emailSignature}</div>` : ''}
</div>
<div class="footer">
<p>${companyName} - UK Accounting Services</p>
</div>
</div>
</body>
</html>`

    console.log(`📧 Email Optimization: Content truncated. Final size: ${Math.round(getEmailSize(truncatedHtml)/1024)}KB`)
    return truncatedHtml
  }
  
  console.log(`📧 Email Optimization: Email optimized for Gmail: ${Math.round(emailSize/1024)}KB (Subject: ${subject.substring(0, 50)}...)`)
  return minimalHtml
}

/**
 * Optimize email templates by removing excessive whitespace and comments
 */
export function optimizeEmailTemplate(htmlContent: string): string {
  return htmlContent
    .replace(/<!--[\s\S]*?-->/g, '')     // Remove HTML comments
    .replace(/\/\*[\s\S]*?\*\//g, '')    // Remove CSS comments
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .replace(/>\s+</g, '><')             // Remove space between tags
    .trim()
}

/**
 * Check email content and provide optimization suggestions
 */
export function analyzeEmailContent(content: string): {
  size: number
  sizeKB: number
  isOptimal: boolean
  needsTruncation: boolean
  suggestions: string[]
} {
  const size = getEmailSize(content)
  const sizeKB = Math.round(size / 1024)
  const isOptimal = size <= EMAIL_LIMITS.SAFE_LIMIT
  const needsTruncation = size > EMAIL_LIMITS.GMAIL_HARD_LIMIT
  
  const suggestions: string[] = []
  
  if (size > EMAIL_LIMITS.SAFE_LIMIT) {
    suggestions.push(`Email size (${sizeKB}KB) exceeds recommended limit (${EMAIL_LIMITS.SAFE_LIMIT/1024}KB)`)
  }
  
  if (needsTruncation) {
    suggestions.push(`Email will be clipped by Gmail (exceeds ${EMAIL_LIMITS.GMAIL_HARD_LIMIT/1024}KB limit)`)
  }
  
  if (content.includes('<style>')) {
    suggestions.push('Consider using inline styles or minimal CSS to reduce size')
  }
  
  if (content.includes('font-family:')) {
    suggestions.push('Use system fonts to reduce size')
  }
  
  return {
    size,
    sizeKB,
    isOptimal,
    needsTruncation,
    suggestions
  }
}

/**
 * Create a simplified version of complex email content
 */
export function simplifyEmailContent(htmlContent: string): string {
  return htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/style="[^"]*"/gi, '')                  // Remove inline styles
    .replace(/<div[^>]*>/gi, '<div>')                // Simplify div tags
    .replace(/<span[^>]*>/gi, '<span>')              // Simplify span tags
    .replace(/<img[^>]*>/gi, '[Image]')              // Replace images with text
    .replace(/\s+/g, ' ')                            // Collapse whitespace
    .trim()
}

/**
 * Email optimization best practices
 */
export const EMAIL_BEST_PRACTICES = {
  TIPS: [
    'Keep emails under 80KB to prevent Gmail clipping',
    'Use minimal inline CSS instead of external stylesheets',
    'Avoid large images or use image compression',
    'Use system fonts (Arial, sans-serif) to reduce size',
    'Remove unnecessary HTML comments and whitespace',
    'Test emails with different content lengths',
    'Provide links to full content in your dashboard for complex emails'
  ],
  
  GMAIL_SPECIFIC: [
    'Gmail clips emails over 102KB',
    'Clipped content shows "[Message clipped] View entire message"',
    'Mobile Gmail has stricter clipping thresholds',
    'Promotions tab emails are clipped more aggressively'
  ]
} as const 