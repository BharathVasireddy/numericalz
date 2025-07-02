/**
 * 🇬🇧 LONDON TIMEZONE UTILITIES
 * 
 * Centralized timezone management for Numericalz platform.
 * ALL date operations in the system should use these utilities to ensure
 * consistent London timezone (Europe/London) handling.
 * 
 * Critical for UK accounting firm compliance:
 * - HMRC VAT deadlines
 * - Companies House filing deadlines  
 * - Audit trails and activity logs
 * - Team coordination across locations
 */

const LONDON_TIMEZONE = 'Europe/London'

/**
 * Get current date and time in London timezone
 * Use this instead of `new Date()` for consistency
 */
export function getLondonTime(): Date {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }))
}

/**
 * Convert any date to London timezone
 * @param date - Date to convert (defaults to current time)
 */
export function toLondonTime(date: Date = new Date()): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }))
}

/**
 * Get London date at start of day (00:00:00)
 * Useful for date comparisons and deadline calculations
 */
export function getLondonDateStart(date?: Date): Date {
  const londonDate = toLondonTime(date)
  londonDate.setHours(0, 0, 0, 0)
  return londonDate
}

/**
 * Get London date at end of day (23:59:59.999)
 * Useful for deadline calculations
 */
export function getLondonDateEnd(date?: Date): Date {
  const londonDate = toLondonTime(date)
  londonDate.setHours(23, 59, 59, 999)
  return londonDate
}

/**
 * Format date for database storage (ISO string but London-aware)
 * Use this for all database timestamp fields
 */
export function getLondonISOString(date?: Date): string {
  const londonDate = toLondonTime(date)
  return londonDate.toISOString()
}

/**
 * Format date for display in UK format (DD/MM/YYYY)
 * @param date - Date to format
 * @param options - Additional formatting options
 */
export function formatLondonDate(
  date: Date | string | null,
  options: {
    includeTime?: boolean
    timeFormat?: '12h' | '24h'
    dateStyle?: 'short' | 'medium' | 'long'
    fallback?: string
  } = {}
): string {
  if (!date) return options.fallback || '—'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const londonDate = toLondonTime(dateObj)
  
  const {
    includeTime = false,
    timeFormat = '24h',
    dateStyle = 'short',
    fallback = '—'
  } = options
  
  if (isNaN(londonDate.getTime())) return fallback
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: LONDON_TIMEZONE,
    day: '2-digit',
    month: dateStyle === 'long' ? 'long' : dateStyle === 'medium' ? 'short' : '2-digit',
    year: 'numeric'
  }
  
  if (includeTime) {
    formatOptions.hour = '2-digit'
    formatOptions.minute = '2-digit'
    formatOptions.second = '2-digit'
    formatOptions.hour12 = timeFormat === '12h'
  }
  
  return londonDate.toLocaleString('en-GB', formatOptions)
}

/**
 * Calculate days between two dates using London timezone
 * Accounts for BST/GMT transitions
 */
export function calculateLondonDaysBetween(startDate: Date, endDate: Date): number {
  const londonStart = getLondonDateStart(startDate)
  const londonEnd = getLondonDateStart(endDate)
  
  const diffTime = londonEnd.getTime() - londonStart.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date is in the past (London time)
 */
export function isLondonDatePast(date: Date | string): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date
  const londonCheck = getLondonDateStart(checkDate)
  const londonNow = getLondonDateStart()
  
  return londonCheck < londonNow
}

/**
 * Check if a date is today (London time)
 */
export function isLondonDateToday(date: Date | string): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date
  const londonCheck = getLondonDateStart(checkDate)
  const londonToday = getLondonDateStart()
  
  return londonCheck.getTime() === londonToday.getTime()
}

/**
 * Get London time zone info (BST/GMT)
 */
export function getLondonTimezoneInfo(): { 
  name: string
  offset: string
  isDST: boolean
} {
  const now = new Date()
  const londonTime = now.toLocaleString('en-GB', { 
    timeZone: LONDON_TIMEZONE,
    timeZoneName: 'short'
  })
  
  const timezoneName = londonTime.split(' ').pop() || 'GMT'
  const isDST = timezoneName === 'BST'
  
  // Calculate offset
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const londonDate = new Date(utc + (isDST ? 3600000 : 0)) // BST is UTC+1, GMT is UTC+0
  const offset = isDST ? '+01:00' : '+00:00'
  
  return {
    name: timezoneName,
    offset,
    isDST
  }
}

/**
 * Create a London timezone-aware date from components
 * Useful for constructing specific dates (e.g., deadlines)
 */
export function createLondonDate(
  year: number,
  month: number, // 1-12 (not 0-11)
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  // Create date in London timezone
  const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
  
  // Parse as if it's London time
  const tempDate = new Date(dateString)
  return new Date(tempDate.toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }))
}

/**
 * Activity log timestamp - standardized for audit trails
 */
export function getActivityTimestamp(): string {
  return getLondonISOString()
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * Always calculated from London time perspective
 */
export function getLondonRelativeTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const londonTarget = toLondonTime(targetDate)
  const londonNow = getLondonTime()
  
  const diffMs = londonTarget.getTime() - londonNow.getTime()
  const absDiffMs = Math.abs(diffMs)
  
  const seconds = Math.floor(absDiffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  const isPast = diffMs < 0
  const prefix = isPast ? '' : 'in '
  const suffix = isPast ? ' ago' : ''
  
  if (years > 0) return `${prefix}${years} year${years > 1 ? 's' : ''}${suffix}`
  if (months > 0) return `${prefix}${months} month${months > 1 ? 's' : ''}${suffix}`
  if (weeks > 0) return `${prefix}${weeks} week${weeks > 1 ? 's' : ''}${suffix}`
  if (days > 0) return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`
  if (hours > 0) return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`
  if (minutes > 0) return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${suffix}`
  
  return 'just now'
}

// Export timezone constant for consistency
export { LONDON_TIMEZONE }

// Legacy compatibility - gradually replace these with proper function calls
export const getLondonNow = getLondonTime
export const formatDateForLondon = formatLondonDate 