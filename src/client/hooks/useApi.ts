import { useAuthStore } from '../store/authStore'
import { useState, useCallback } from 'react'

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export function useApi<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const request = useCallback(
    async (
      url: string,
      options: ApiOptions = {}
    ): Promise<ApiResponse<T>> => {
      setLoading(true)
      setError(null)

      try {
        const { requiresAuth = true, ...fetchOptions } = options

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...options.headers,
        }

        if (requiresAuth && token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        })

        if (response.status === 401) {
          clearAuth()
          window.location.href = '/login'
          throw new Error('認証が必要です')
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'リクエストが失敗しました')
        }

        const data = await response.json()
        setLoading(false)
        return { data, error: null, loading: false }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '不明なエラーが発生しました'
        setError(errorMessage)
        setLoading(false)
        return { data: null, error: errorMessage, loading: false }
      }
    },
    [token, clearAuth]
  )

  return { request, loading, error }
}

// Convenience hooks for common HTTP methods
export function useGet<T = any>() {
  const { request, loading, error } = useApi<T>()
  
  const get = useCallback(
    (url: string, options?: ApiOptions) =>
      request(url, { ...options, method: 'GET' }),
    [request]
  )
  
  return { get, loading, error }
}

export function usePost<T = any>() {
  const { request, loading, error } = useApi<T>()
  
  const post = useCallback(
    (url: string, body?: any, options?: ApiOptions) =>
      request(url, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  )
  
  return { post, loading, error }
}

export function usePut<T = any>() {
  const { request, loading, error } = useApi<T>()
  
  const put = useCallback(
    (url: string, body?: any, options?: ApiOptions) =>
      request(url, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [request]
  )
  
  return { put, loading, error }
}

export function useDelete<T = any>() {
  const { request, loading, error } = useApi<T>()
  
  const del = useCallback(
    (url: string, options?: ApiOptions) =>
      request(url, { ...options, method: 'DELETE' }),
    [request]
  )
  
  return { delete: del, loading, error }
}
