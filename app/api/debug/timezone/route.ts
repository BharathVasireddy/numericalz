import { NextResponse } from 'next/server'
import { getCurrentTimezoneInfo, getLondonTime, isTimezoneOverrideActive } from '@/lib/timezone-override'

export async function GET() {
  try {
    // Test all timezone scenarios
    const now = new Date()
    
    // Server-side timezone (should be London after override)
    const serverTime = now.toLocaleString('en-GB', { 
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
    
    // Raw new Date() - should now be London time with override
    const rawDate = new Date()
    const londonTime = getLondonTime()
    const timezoneInfo = getCurrentTimezoneInfo()
    
    // Test different timezones for comparison
    const utcTime = now.toLocaleString('en-GB', { 
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
    
    const nyTime = now.toLocaleString('en-GB', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
    
    // Check if server timezone is correct
    const serverOffset = now.getTimezoneOffset()
    const rawDateStr = rawDate.toLocaleString('en-GB')
    const londonTimeStr = londonTime.toLocaleString('en-GB')
    
    return NextResponse.json({
      success: true,
      timezone: {
        serverTime,
        utcTime,
        newYorkTime: nyTime,
        processTimezone: process.env.TZ || 'Not set',
        defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Not set',
        serverOffset,
        rawDateOutput: rawDateStr,
        londonTimeOutput: londonTimeStr,
        isLondonTime: rawDateStr === londonTimeStr,
        override: {
          isActive: isTimezoneOverrideActive()
        },
        summary: {
          message: timezoneInfo.isLondonTime ? 
            "✅ London timezone is working correctly!" : 
            "⚠️ Timezone inconsistency detected",
          expected: "London time should match raw new Date() output",
          timezone: serverTime.includes('GMT') ? 'GMT' : (serverTime.includes('BST') ? 'BST' : 'Unknown'),
          solution: process.env.VERCEL ? 'Using programmatic override for Vercel' : 'Using TZ environment variable'
        }
      }
    })
  } catch (error) {
    console.error('Timezone debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check timezone configuration' 
    }, { status: 500 })
  }
} 