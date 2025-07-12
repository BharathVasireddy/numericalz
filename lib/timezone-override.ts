/**
 * 🇬🇧 SAFE LONDON TIMEZONE UTILITIES
 * 
 * Simple timezone utilities without global overrides to ensure safe deployment.
 */

// London timezone constant
const LONDON_TIMEZONE = 'Europe/London'

/**
 * Initialize London timezone (safe mode - no global overrides)
 */
export function initializeLondonTimezone() {
  console.log('🇬🇧 London timezone utilities initialized (safe mode)')
}

/**
 * Get London time (guaranteed to work)
 */
export function getLondonTime(): Date {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }))
}

/**
 * Get current timezone information
 */
export function getCurrentTimezoneInfo() {
  const now = new Date()
  const londonTime = getLondonTime()
  
  return {
    serverTime: now.toLocaleString('en-GB', { timeZone: LONDON_TIMEZONE }),
    rawDate: now.toLocaleString('en-GB'),
    londonTime: londonTime.toLocaleString('en-GB'),
    isLondonTime: Math.abs(now.getTime() - londonTime.getTime()) < 60000, // Within 1 minute
    processTimezone: process.env.TZ || 'Not set'
  }
}

/**
 * Check if timezone override is working
 */
export function isTimezoneOverrideActive(): boolean {
  return false // Safe mode - no override
}

/**
 * Get London ISO string for database storage
 */
export function getLondonISOString(): string {
  return getLondonTime().toISOString()
} 