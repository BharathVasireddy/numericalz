import { useState, useCallback, useEffect } from 'react'

export interface User {
  id: string
  name: string
  email: string
  role: 'STAFF' | 'MANAGER' | 'PARTNER'
}

export interface UseUsersOptions {
  includeSelf?: boolean
  role?: string
  autoFetch?: boolean
}

export interface UseUsersReturn {
  users: User[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Centralized hook for fetching users
 * Eliminates duplicate user fetching logic across components
 * 
 * @param options Configuration options for the user fetch
 * @returns Users data, loading state, error state, and refetch functions
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { includeSelf = false, role, autoFetch = true } = options
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (includeSelf) params.append('includeSelf', 'true')
      if (role) params.append('role', role)

      const response = await fetch(`/api/users?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [includeSelf, role])

  useEffect(() => {
    if (autoFetch) {
      fetchUsers()
    }
  }, [fetchUsers, autoFetch])

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    refresh: fetchUsers
  }
} 