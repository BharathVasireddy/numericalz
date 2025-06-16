'use client'

import { Toaster } from 'react-hot-toast'

export function SimpleToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{
        top: '80px',
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 3000,
        style: {
          background: 'white',
          color: 'black',
          border: '2px solid black',
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
            borderColor: 'black',
          },
        },
        error: {
          style: {
            borderColor: 'black',
          },
        },
      }}
    />
  )
} 