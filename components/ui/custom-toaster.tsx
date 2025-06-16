'use client'

import toast, { Toaster } from 'react-hot-toast'
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react'

export function CustomToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{
        top: '80px',
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 3000,
        className: '',
        style: {
          background: 'white',
          color: 'black',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontFamily: 'var(--font-plus-jakarta-sans)',
          fontSize: '14px',
          fontWeight: '500',
          padding: '16px',
          minWidth: '320px',
          maxWidth: '500px',
        },
        success: {
          style: {
            borderColor: '#10b981',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: 'white',
          },
        },
        error: {
          style: {
            borderColor: '#ef4444',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: 'white',
          },
        },
      }}
    />
  )
} 