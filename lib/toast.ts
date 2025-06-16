import toast, { Toast } from 'react-hot-toast'

// Debug flag to help identify multiple toast calls
const DEBUG_TOASTS = process.env.NODE_ENV === 'development'

// Debounce mechanism to prevent rapid duplicate toasts
const recentToasts = new Map<string, number>()
const DEBOUNCE_TIME = 1000 // 1 second

function shouldShowToast(message: string): boolean {
  const now = Date.now()
  const lastShown = recentToasts.get(message)
  
  if (lastShown && (now - lastShown) < DEBOUNCE_TIME) {
    if (DEBUG_TOASTS) {
      console.log('🚫 Toast debounced:', message)
    }
    return false
  }
  
  recentToasts.set(message, now)
  return true
}

// Enhanced toast function with consistent styling
export const showToast = {
  success: (message: string, options?: any) => {
    if (!shouldShowToast(message)) return
    
    if (DEBUG_TOASTS) {
      console.log('🟢 Toast Success:', message)
    }
    return toast.success(message, {
      duration: 3000,
      ...options,
    })
  },

  error: (message: string, options?: any) => {
    if (!shouldShowToast(message)) return
    
    if (DEBUG_TOASTS) {
      console.log('🔴 Toast Error:', message)
    }
    return toast.error(message, {
      duration: 3000,
      ...options,
    })
  },

  info: (message: string, options?: any) => {
    if (!shouldShowToast(message)) return
    
    if (DEBUG_TOASTS) {
      console.log('🔵 Toast Info:', message)
    }
    return toast(message, {
      duration: 3000,
      ...options,
    })
  },

  loading: (message: string, options?: any) => {
    if (DEBUG_TOASTS) {
      console.log('⏳ Toast Loading:', message)
    }
    return toast.loading(message, {
      ...options,
    })
  },

  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: any
  ) => {
    if (DEBUG_TOASTS) {
      console.log('🔄 Toast Promise:', msgs.loading)
    }
    return toast.promise(promise, msgs, {
      success: {
        duration: 3000,
      },
      error: {
        duration: 3000,
      },
      ...options,
    })
  },

  dismiss: (toastId?: string) => {
    if (DEBUG_TOASTS) {
      console.log('❌ Toast Dismiss:', toastId || 'all')
    }
    return toast.dismiss(toastId)
  },

  remove: (toastId?: string) => {
    return toast.remove(toastId)
  },
}

// Export the original toast for backward compatibility
export { toast }
export default showToast 