/**
 * 強化版APIクライアントフック
 * リトライロジック、エラーハンドリング、ローディング状態管理を統合
 */

import { useState, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { ApiResponse, ApiError, ErrorCode } from '../../types/api'

/**
 * APIリクエストオプション
 */
export interface UseApiOptions {
  requiresAuth?: boolean
  retries?: number
  retryDelay?: number
  timeout?: number
  showToast?: boolean
}

/**
 * リトライ状態
 */
export interface RetryState {
  isRetrying: boolean
  currentAttempt: number
  maxAttempts: number
}

/**
 * API状態
 */
export interface ApiState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  retryState: RetryState | null
}

/**
 * デフォルトオプション
 */
const DEFAULT_OPTIONS: Required<Omit<UseApiOptions, 'showToast'>> = {
  requiresAuth: true,
  retries: 3,
  retryDelay: 1000,
  timeout: 30000,
}

/**
 * スリープ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * エラーがリトライ可能かチェック
 */
function isRetryableError(error: ApiError, status?: number): boolean {
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.INTERNAL_ERROR,
  ]
  
  const retryableStatuses = [429, 500, 502, 503, 504]
  
  return (
    retryableCodes.includes(error.code as ErrorCode) ||
    (status !== undefined && retryableStatuses.includes(status))
  )
}

/**
 * 強化版APIクライアントフック
 */
export function useApiClient<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: false,
    retryState: null,
  })
  
  const token = useAuthStore((state) => state.token)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  /**
   * リクエストをキャンセル
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])
  
  /**
   * リクエスト実行
   */
  const request = useCallback(
    async (
      url: string,
      options: RequestInit & UseApiOptions = {}
    ): Promise<ApiState<T>> => {
      const {
        requiresAuth,
        retries,
        retryDelay,
        timeout,
        showToast,
        ...fetchOptions
      } = { ...DEFAULT_OPTIONS, ...options }
      
      // 既存のリクエストをキャンセル
      cancel()
      
      // ローディング開始
      setState({
        data: null,
        error: null,
        loading: true,
        retryState: null,
      })
      
      let lastError: ApiError | null = null
      let lastStatus: number | undefined
      
      // リトライループ
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // リトライの場合は待機
          if (attempt > 0) {
            const delay = retryDelay * Math.pow(2, attempt - 1)
            
            setState(prev => ({
              ...prev,
              retryState: {
                isRetrying: true,
                currentAttempt: attempt,
                maxAttempts: retries,
              },
            }))
            
            await sleep(delay)
          }
          
          // AbortController作成
          abortControllerRef.current = new AbortController()
          const timeoutId = setTimeout(() => {
            abortControllerRef.current?.abort()
          }, timeout)
          
          // ヘッダー準備
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          }
          
          if (requiresAuth && token) {
            headers['Authorization'] = `Bearer ${token}`
          }
          
          // fetchリクエスト
          const response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: abortControllerRef.current.signal,
          })
          
          clearTimeout(timeoutId)
          lastStatus = response.status
          
          // 401エラーは認証切れ
          if (response.status === 401) {
            clearAuth()
            window.location.href = '/login'
            
            const error: ApiError = {
              code: ErrorCode.UNAUTHORIZED,
              message: '認証が必要です。再ログインしてください。',
            }
            
            setState({
              data: null,
              error,
              loading: false,
              retryState: null,
            })
            
            return { data: null, error, loading: false, retryState: null }
          }
          
          // レスポンスパース
          const contentType = response.headers.get('content-type')
          let result: ApiResponse<T>
          
          if (contentType?.includes('application/json')) {
            const json = await response.json()
            
            if (response.ok) {
              // 新形式: { success: true, data: ... }
              if (json.success === true) {
                result = json
              } else {
                // 旧形式: 直接データ
                result = {
                  success: true,
                  data: json as T,
                  timestamp: new Date().toISOString(),
                }
              }
            } else {
              // エラーレスポンス
              result = {
                success: false,
                error: json.error || {
                  code: ErrorCode.UNKNOWN_ERROR,
                  message: json.message || 'エラーが発生しました',
                },
                timestamp: new Date().toISOString(),
              }
            }
          } else {
            // テキストレスポンス
            const text = await response.text()
            
            if (response.ok) {
              result = {
                success: true,
                data: text as T,
                timestamp: new Date().toISOString(),
              }
            } else {
              result = {
                success: false,
                error: {
                  code: ErrorCode.UNKNOWN_ERROR,
                  message: text || 'エラーが発生しました',
                },
                timestamp: new Date().toISOString(),
              }
            }
          }
          
          // 成功の場合
          if (result.success && result.data !== undefined) {
            setState({
              data: result.data,
              error: null,
              loading: false,
              retryState: null,
            })
            
            return {
              data: result.data,
              error: null,
              loading: false,
              retryState: null,
            }
          }
          
          // エラーの場合
          lastError = result.error!
          
          // リトライ可能かチェック
          if (!isRetryableError(lastError, lastStatus)) {
            setState({
              data: null,
              error: lastError,
              loading: false,
              retryState: null,
            })
            
            return {
              data: null,
              error: lastError,
              loading: false,
              retryState: null,
            }
          }
          
          // 最後のリトライの場合
          if (attempt === retries) {
            setState({
              data: null,
              error: lastError,
              loading: false,
              retryState: null,
            })
            
            return {
              data: null,
              error: lastError,
              loading: false,
              retryState: null,
            }
          }
          
        } catch (err) {
          // ネットワークエラー等
          if (err instanceof Error && err.name === 'AbortError') {
            lastError = {
              code: ErrorCode.TIMEOUT_ERROR,
              message: `リクエストがタイムアウトしました（${timeout}ms）`,
            }
          } else if (err instanceof Error) {
            lastError = {
              code: ErrorCode.NETWORK_ERROR,
              message: err.message || 'ネットワークエラーが発生しました',
            }
          } else {
            lastError = {
              code: ErrorCode.UNKNOWN_ERROR,
              message: '不明なエラーが発生しました',
            }
          }
          
          // 最後のリトライの場合
          if (attempt === retries) {
            setState({
              data: null,
              error: lastError,
              loading: false,
              retryState: null,
            })
            
            return {
              data: null,
              error: lastError,
              loading: false,
              retryState: null,
            }
          }
        }
      }
      
      // ここには到達しないはずだが、型安全のため
      const finalError = lastError || {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'エラーが発生しました',
      }
      
      setState({
        data: null,
        error: finalError,
        loading: false,
        retryState: null,
      })
      
      return {
        data: null,
        error: finalError,
        loading: false,
        retryState: null,
      }
    },
    [token, clearAuth, cancel]
  )
  
  return {
    ...state,
    request,
    cancel,
  }
}

/**
 * GET用フック
 */
export function useGet<T = unknown>() {
  const api = useApiClient<T>()
  
  const get = useCallback(
    (url: string, options?: UseApiOptions) =>
      api.request(url, { ...options, method: 'GET' }),
    [api]
  )
  
  return {
    data: api.data,
    error: api.error,
    loading: api.loading,
    retryState: api.retryState,
    get,
    cancel: api.cancel,
  }
}

/**
 * POST用フック
 */
export function usePost<T = unknown, B = unknown>() {
  const api = useApiClient<T>()
  
  const post = useCallback(
    (url: string, body?: B, options?: UseApiOptions) =>
      api.request(url, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [api]
  )
  
  return {
    data: api.data,
    error: api.error,
    loading: api.loading,
    retryState: api.retryState,
    post,
    cancel: api.cancel,
  }
}

/**
 * PUT用フック
 */
export function usePut<T = unknown, B = unknown>() {
  const api = useApiClient<T>()
  
  const put = useCallback(
    (url: string, body?: B, options?: UseApiOptions) =>
      api.request(url, {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    [api]
  )
  
  return {
    data: api.data,
    error: api.error,
    loading: api.loading,
    retryState: api.retryState,
    put,
    cancel: api.cancel,
  }
}

/**
 * DELETE用フック
 */
export function useDelete<T = unknown>() {
  const api = useApiClient<T>()
  
  const del = useCallback(
    (url: string, options?: UseApiOptions) =>
      api.request(url, { ...options, method: 'DELETE' }),
    [api]
  )
  
  return {
    data: api.data,
    error: api.error,
    loading: api.loading,
    retryState: api.retryState,
    delete: del,
    cancel: api.cancel,
  }
}
