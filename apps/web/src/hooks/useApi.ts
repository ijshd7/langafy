'use client'

import { useCallback, useState } from 'react'
import { apiClient, ApiError } from '@/lib/api'

/**
 * State for an API request
 */
export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

/**
 * Hook for making API requests with loading and error states
 *
 * @example
 * const { data, loading, error } = useApi('/api/user', 'GET')
 *
 * @example
 * const { data, loading, error, execute } = useApi('/api/exercises', 'POST', { manual: true })
 * const handleSubmit = () => execute({ answer: 'test' })
 */
export function useApi<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options?: {
    /** If true, don't execute immediately; use the returned execute function */
    manual?: boolean
    /** Initial data */
    initialData?: T
  }
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: options?.initialData || null,
    loading: !options?.manual,
    error: null,
  })

  const execute = useCallback(
    async (requestData?: unknown) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        let result: T

        switch (method) {
          case 'GET':
            result = await apiClient.get<T>(endpoint)
            break
          case 'POST':
            result = await apiClient.post<T>(endpoint, requestData)
            break
          case 'PUT':
            result = await apiClient.put<T>(endpoint, requestData)
            break
          case 'DELETE':
            result = await apiClient.delete<T>(endpoint)
            break
        }

        setState({ data: result, loading: false, error: null })
        return result
      } catch (err) {
        const error = err instanceof ApiError ? err : new ApiError(500, 'UNKNOWN_ERROR', String(err))
        setState((prev) => ({ ...prev, loading: false, error }))
        throw error
      }
    },
    [endpoint, method]
  )

  // Auto-execute if not manual mode
  useState(() => {
    if (!options?.manual) {
      execute()
    }
  })

  return {
    ...state,
    execute,
  }
}

/**
 * Hook for making single API requests (like form submissions)
 *
 * @example
 * const { execute, loading, error } = useMutate('/api/auth/sync', 'POST')
 * const handleSignUp = async (credentials) => {
 *   const result = await execute(credentials)
 * }
 */
export function useMutate<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const execute = useCallback(
    async (data?: unknown) => {
      setLoading(true)
      setError(null)

      try {
        let result: T

        switch (method) {
          case 'POST':
            result = await apiClient.post<T>(endpoint, data)
            break
          case 'PUT':
            result = await apiClient.put<T>(endpoint, data)
            break
          case 'DELETE':
            result = await apiClient.delete<T>(endpoint)
            break
        }

        setLoading(false)
        return result
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError(500, 'UNKNOWN_ERROR', String(err))
        setError(apiError)
        throw apiError
      }
    },
    [endpoint, method]
  )

  return { execute, loading, error }
}
