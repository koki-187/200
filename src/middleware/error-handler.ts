/**
 * 統合エラーハンドリングミドルウェア
 * すべてのエラーを統一的に処理し、適切なレスポンスを返す
 */

import { Context, Next } from 'hono'
import { ApiResponse, ErrorCode, HttpStatus } from '../types/api'
import { logger, PerformanceTimer } from '../utils/logger'
import { DatabaseError } from '../utils/db-error-handler'

/**
 * エラーレスポンスを生成
 */
function createErrorResponse(
  error: unknown,
  c: Context
): Response {
  // データベースエラー
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as DatabaseError
    
    const statusCode = getStatusCodeFromErrorCode(dbError.code as ErrorCode)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: dbError.code,
        message: dbError.message,
        details: process.env.NODE_ENV === 'development' ? dbError.details : undefined,
      },
      timestamp: new Date().toISOString(),
    }
    
    return c.json(response, statusCode)
  }
  
  // 標準エラー
  if (error instanceof Error) {
    logger.error('Unhandled error', error, 'ErrorHandler')
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'サーバーエラーが発生しました',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    }
    
    return c.json(response, HttpStatus.INTERNAL_SERVER_ERROR)
  }
  
  // 不明なエラー
  logger.error('Unknown error type', undefined, 'ErrorHandler', { error })
  
  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'エラーが発生しました',
    },
    timestamp: new Date().toISOString(),
  }
  
  return c.json(response, HttpStatus.INTERNAL_SERVER_ERROR)
}

/**
 * エラーコードからHTTPステータスコードを取得
 */
function getStatusCodeFromErrorCode(code: ErrorCode): HttpStatus {
  const mapping: Record<string, HttpStatus> = {
    [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
    [ErrorCode.INVALID_INPUT]: HttpStatus.BAD_REQUEST,
    [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
    [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
    [ErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
    [ErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
    [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
    [ErrorCode.ALREADY_EXISTS]: HttpStatus.CONFLICT,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
    [ErrorCode.NETWORK_ERROR]: HttpStatus.SERVICE_UNAVAILABLE,
    [ErrorCode.TIMEOUT_ERROR]: HttpStatus.SERVICE_UNAVAILABLE,
    [ErrorCode.DATABASE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
    [ErrorCode.TRANSACTION_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  }
  
  return mapping[code] || HttpStatus.INTERNAL_SERVER_ERROR
}

/**
 * グローバルエラーハンドリングミドルウェア
 */
export async function errorHandler(c: Context, next: Next) {
  const timer = new PerformanceTimer(`${c.req.method} ${c.req.path}`)
  
  try {
    await next()
    
    // レスポンスステータスコードをログ
    const duration = timer.elapsed()
    logger.logRequest(
      c.req.method,
      c.req.path,
      c.res.status,
      duration
    )
    
  } catch (error) {
    const duration = timer.elapsed()
    
    // エラーログ
    logger.error(
      `Request failed: ${c.req.method} ${c.req.path}`,
      error,
      'ErrorHandler',
      {
        method: c.req.method,
        path: c.req.path,
        duration,
      }
    )
    
    // エラーレスポンスを返す
    return createErrorResponse(error, c)
  }
}

/**
 * 非同期エラーハンドリングヘルパー
 */
export function asyncHandler<T>(
  handler: (c: Context) => Promise<T>
) {
  return async (c: Context) => {
    try {
      return await handler(c)
    } catch (error) {
      return createErrorResponse(error, c)
    }
  }
}

/**
 * バリデーションエラーをスロー
 */
export function throwValidationError(message: string, field?: string): never {
  throw {
    code: ErrorCode.VALIDATION_ERROR,
    message,
    details: field ? { field } : undefined,
  }
}

/**
 * 認証エラーをスロー
 */
export function throwUnauthorizedError(message: string = '認証が必要です'): never {
  throw {
    code: ErrorCode.UNAUTHORIZED,
    message,
  }
}

/**
 * 権限エラーをスロー
 */
export function throwForbiddenError(message: string = 'アクセス権限がありません'): never {
  throw {
    code: ErrorCode.FORBIDDEN,
    message,
  }
}

/**
 * Not Foundエラーをスロー
 */
export function throwNotFoundError(resource: string = 'リソース'): never {
  throw {
    code: ErrorCode.NOT_FOUND,
    message: `${resource}が見つかりません`,
  }
}

/**
 * レート制限エラーをスロー
 */
export function throwRateLimitError(message: string = 'リクエストが多すぎます'): never {
  throw {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message,
  }
}
