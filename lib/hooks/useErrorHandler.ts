import { useCallback } from 'react'
import { ApiError, getErrorMessage, logError } from '@/lib/utils/errorHandler'
import { toast } from 'react-hot-toast'

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: string) => void
  handleApiError: (error: unknown, context?: string) => void
  showError: (message: string) => void
}

/**
 * Centralized error handling hook
 * Provides consistent error handling across the application
 * 
 * @returns Error handling functions
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const handleError = useCallback((error: unknown, context?: string) => {
    logError(error, context)
    
    const message = getErrorMessage(error)
    toast.error(message)
  }, [])

  const handleApiError = useCallback((error: unknown, context?: string) => {
    logError(error, context)
    
    if (error instanceof ApiError) {
      // Handle specific API error statuses
      switch (error.status) {
        case 401:
          toast.error('Authentication required. Please log in again.')
          // Could redirect to login here
          break
        case 403:
          toast.error('You do not have permission to perform this action.')
          break
        case 404:
          toast.error('The requested resource was not found.')
          break
        case 422:
          toast.error(`Validation error: ${error.message}`)
          break
        case 500:
          toast.error('Server error. Please try again later.')
          break
        default:
          toast.error(`Error (${error.status}): ${error.message}`)
      }
    } else {
      const message = getErrorMessage(error)
      toast.error(message)
    }
  }, [])

  const showError = useCallback((message: string) => {
    toast.error(message)
  }, [])

  return {
    handleError,
    handleApiError,
    showError
  }
} 