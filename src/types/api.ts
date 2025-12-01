/**
 * API共通型定義
 * エラーハンドリングとレスポンス標準化のための型
 */

// APIレスポンス共通型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: string
}

// エラー詳細型
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  stack?: string // 開発環境のみ
}

// API実行オプション
export interface ApiOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  signal?: AbortSignal
}

// バリデーションエラー
export interface ValidationError {
  field: string
  message: string
  code: string
}

// ページネーション型
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// HTTPエラーコード
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// エラーコード定義
export enum ErrorCode {
  // 一般エラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // バリデーションエラー
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // 認証エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // リソースエラー
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // レート制限
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // ネットワークエラー
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // データベースエラー
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
}

// リトライ可能なエラーコード
export const RETRYABLE_ERROR_CODES = [
  ErrorCode.NETWORK_ERROR,
  ErrorCode.TIMEOUT_ERROR,
  ErrorCode.INTERNAL_ERROR,
]

// リトライ可能なHTTPステータス
export const RETRYABLE_HTTP_STATUSES = [
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.INTERNAL_SERVER_ERROR,
  HttpStatus.SERVICE_UNAVAILABLE,
]
