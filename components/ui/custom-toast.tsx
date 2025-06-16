'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomToastProps {
  id: string
  type: 'success' | 'error' | 'info' | 'loading'
  message: string
  duration?: number
  onClose: (id: string) => void
}

export function CustomToast({ id, type, message, duration = 3000, onClose }: CustomToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    
    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      clearTimeout(timer)
      clearTimeout(dismissTimer)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Match exit animation duration
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-200'
      case 'error':
        return 'border-red-200'
      case 'loading':
        return 'border-blue-200'
      default:
        return 'border-blue-200'
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50'
      case 'error':
        return 'bg-red-50'
      case 'loading':
        return 'bg-blue-50'
      default:
        return 'bg-blue-50'
    }
  }

  return (
    <div
      className={`
        fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]
        min-w-[320px] max-w-[500px] mx-4
        bg-white border-2 rounded-lg shadow-lg
        transition-all duration-300 ease-out
        ${getBorderColor()}
        ${getBackgroundColor()}
        ${isVisible && !isExiting 
          ? 'translate-y-0 opacity-100 scale-100' 
          : isExiting 
            ? '-translate-y-2 opacity-0 scale-95'
            : 'translate-y-4 opacity-0 scale-95'
        }
      `}
      style={{
        backdropFilter: 'blur(8px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-200 rounded-full"
        >
          <X className="h-4 w-4 text-gray-500" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
        <div
          className={`h-full transition-all ease-linear ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'loading' ? 'bg-blue-500' :
            'bg-blue-500'
          }`}
          style={{
            width: isVisible ? '0%' : '100%',
            transitionDuration: `${duration}ms`,
          }}
        />
      </div>
    </div>
  )
}

// Toast Manager Component
interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'loading'
  message: string
  duration?: number
}

interface ToastManagerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastManager({ toasts, onRemove }: ToastManagerProps) {
  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(${index * 80}px)`,
            zIndex: 9999 - index,
          }}
        >
          <CustomToast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={onRemove}
          />
        </div>
      ))}
    </>
  )
} 