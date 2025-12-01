/**
 * API通信ユーティリティ
 * リトライロジック、エラーハンドリング、タイムアウト処理を含む
 */

import {
  ApiResponse,
  ApiError,
  ApiOptions,
  ErrorCode,
  HttpStatus,
  RETRYABLE_ERROR_CODES,
  RETRYABLE_HTTP_STATUSES,
} from '../types/api'

// デフォルト設定
const DEFAULT_OPTIONS: Required<Omit<ApiOptions, 'signal'>> = {
  timeout: 30000, // 30秒
  retries: 3,
  retryDelay: 1000, // 1秒
}

/**
 * スリープ関数（リトライ待機用）
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * エラーがリトライ可能かチェック
 */
function isRetryableError(error: ApiError, status?: number): boolean {
  // エラーコードでチェック
  if (RETRYABLE_ERROR_CODES.includes(error.code as ErrorCode)) {
    return true
  }
  
  // HTTPステータスでチェック
  if (status && RETRYABLE_HTTP_STATUSES.includes(status)) {
    return true
  }
  
  return false
}

/**
 * fetchリクエストをタイムアウト付きで実行
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        code: ErrorCode.TIMEOUT_ERROR,
        message: `リクエストがタイムアウトしました（${timeout}ms）`,
      } as ApiError
    }
    throw error
  }
}

/**
 * レスポンスをパースしてエラーをチェック
 */
async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type')
  
  // JSONレスポンスの場合
  if (contentType?.includes('application/json')) {
    try {
      const data = await response.json()
      
      // 成功レスポンス
      if (response.ok) {
        return {
          success: true,
          data: data as T,
          timestamp: new Date().toISOString(),
        }
      }
      
      // エラーレスポンス（標準化されたエラー形式）
      const error: ApiError = {
        code: data.error?.code || ErrorCode.UNKNOWN_ERROR,
        message: data.error?.message || response.statusText || 'エラーが発生しました',
        details: data.error?.details,
      }
      
      return {
        success: false,
        error,
        timestamp: new Date().toISOString(),
      }
    } catch (parseError) {
      // JSONパースエラー
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'レスポンスの解析に失敗しました',
        },
        timestamp: new Date().toISOString(),
      }
    }
  }
  
  // テキストレスポンスの場合
  const text = await response.text()
  
  if (response.ok) {
    return {
      success: true,
      data: text as T,
      timestamp: new Date().toISOString(),
    }
  }
  
  return {
    success: false,
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: text || response.statusText || 'エラーが発生しました',
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * リトライロジック付きAPIリクエスト
 */
async function requestWithRetry<T>(
  url: string,
  options: RequestInit,
  apiOptions: ApiOptions
): Promise<ApiResponse<T>> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...apiOptions }
  let lastError: ApiError | null = null
  let lastStatus: number | undefined
  
  for (let attempt = 0; attempt <= mergedOptions.retries; attempt++) {
    try {
      // リトライの場合は待機
      if (attempt > 0) {
        const delay = mergedOptions.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
        await sleep(delay)
        console.log(`リトライ中... (${attempt}/${mergedOptions.retries})`)
      }
      
      // fetchリクエスト実行
      const response = await fetchWithTimeout(url, options, mergedOptions.timeout)
      lastStatus = response.status
      
      // レスポンスをパース
      const result = await parseResponse<T>(response)
      
      // 成功の場合は即座に返す
      if (result.success) {
        return result
      }
      
      // エラーの場合
      lastError = result.error!
      
      // リトライ可能かチェック
      if (!isRetryableError(lastError, lastStatus)) {
        return result
      }
      
      // 最後のリトライの場合
      if (attempt === mergedOptions.retries) {
        return result
      }
      
    } catch (error) {
      // ネットワークエラー等
      if (error && typeof error === 'object' && 'code' in error) {
        lastError = error as ApiError
      } else if (error instanceof Error) {
        lastError = {
          code: ErrorCode.NETWORK_ERROR,
          message: error.message || 'ネットワークエラーが発生しました',
        }
      } else {
        lastError = {
          code: ErrorCode.UNKNOWN_ERROR,
          message: '不明なエラーが発生しました',
        }
      }
      
      // 最後のリトライの場合
      if (attempt === mergedOptions.retries) {
        return {
          success: false,
          error: lastError,
          timestamp: new Date().toISOString(),
        }
      }
    }
  }
  
  // ここには到達しないはずだが、型安全のため
  return {
    success: false,
    error: lastError || {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'エラーが発生しました',
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * APIクライアント
 */
export class ApiClient {
  private baseUrl: string
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }
  
  /**
   * GETリクエスト
   */
  async get<T>(url: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return requestWithRetry<T>(
      this.baseUrl + url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      options || {}
    )
  }
  
  /**
   * POSTリクエスト
   */
  async post<T>(
    url: string,
    body?: unknown,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    return requestWithRetry<T>(
      this.baseUrl + url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      options || {}
    )
  }
  
  /**
   * PUTリクエスト
   */
  async put<T>(
    url: string,
    body?: unknown,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    return requestWithRetry<T>(
      this.baseUrl + url,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      options || {}
    )
  }
  
  /**
   * DELETEリクエスト
   */
  async delete<T>(url: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return requestWithRetry<T>(
      this.baseUrl + url,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      options || {}
    )
  }
}

// デフォルトインスタンス
export const apiClient = new ApiClient()
