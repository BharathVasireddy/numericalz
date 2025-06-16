'use client'

import { useState } from 'react'
import { showToast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Enhanced Toast Test Component
 * 
 * Demonstrates the new toast notification system with:
 * - Close button functionality
 * - 3-second auto-dismiss
 * - Professional animations
 * - Top-center positioning
 * - Progress bar indicator
 */
export function ToastTest() {
  const [toastCount, setToastCount] = useState(0)

  const testSuccess = () => {
    showToast.success('✅ Client successfully updated! All changes have been saved.')
    setToastCount(prev => prev + 1)
  }

  const testError = () => {
    showToast.error('❌ Failed to update client. Please check your connection and try again.')
    setToastCount(prev => prev + 1)
  }

  const testInfo = () => {
    showToast.info('ℹ️ Companies House data refreshed. Some information may take a few minutes to update.')
    setToastCount(prev => prev + 1)
  }

  const testLoading = () => {
    const loadingToast = showToast.loading('🔄 Fetching data from Companies House...')
    setToastCount(prev => prev + 1)
    
    // Simulate async operation
    setTimeout(() => {
      showToast.dismiss(loadingToast)
      showToast.success('✅ Companies House data successfully retrieved!')
    }, 3000)
  }

  const testPromise = () => {
    const mockPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve('Success!') : reject('Failed!')
      }, 2000)
    })

    showToast.promise(
      mockPromise,
      {
        loading: '🔄 Processing client assignment...',
        success: '✅ Client successfully assigned to team member!',
        error: '❌ Failed to assign client. Please try again.',
      }
    )
    setToastCount(prev => prev + 1)
  }

  const testMultiple = () => {
    showToast.success('First notification')
    setTimeout(() => showToast.error('Second notification'), 500)
    setTimeout(() => showToast.info('Third notification'), 1000)
    setToastCount(prev => prev + 3)
  }

  const testLongMessage = () => {
    showToast.error('This is a very long error message that should wrap properly within the toast container and still maintain good readability and proper alignment with the close button on the right side.')
    setToastCount(prev => prev + 1)
  }

  const dismissAll = () => {
    showToast.dismiss()
    setToastCount(0)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Enhanced Toast Notifications</CardTitle>
        <CardDescription>
          Test the new toast system with close buttons, 3-second duration, and professional animations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={testSuccess} className="w-full btn-primary">
          ✅ Success Toast
        </Button>
        <Button onClick={testError} variant="destructive" className="w-full">
          ❌ Error Toast
        </Button>
        <Button onClick={testInfo} variant="outline" className="w-full">
          ℹ️ Info Toast
        </Button>
        <Button onClick={testLoading} variant="secondary" className="w-full">
          ⏳ Loading Toast
        </Button>
        <Button onClick={testPromise} variant="outline" className="w-full">
          🎲 Promise Toast
        </Button>
        <Button onClick={testMultiple} variant="outline" className="w-full">
          📚 Multiple Toasts
        </Button>
        <Button onClick={testLongMessage} variant="outline" className="w-full">
          📝 Long Message
        </Button>
        <Button onClick={dismissAll} variant="ghost" className="w-full">
          🗑️ Dismiss All
        </Button>
        
        <div className="mt-4 p-3 bg-muted rounded-sm">
          <p className="text-xs text-muted-foreground">
            <strong>Features:</strong><br/>
            • 3-second auto-dismiss<br/>
            • Manual close button<br/>
            • Professional animations<br/>
            • Progress bar indicator<br/>
            • Top-center positioning<br/>
            • Stacked notifications
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 