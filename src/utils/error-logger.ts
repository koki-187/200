/**
 * エラーロガー
 * エラーをデータベースに記録
 */

import { ApiError, ErrorCode } from '../types/api'
import { SeverityLevel } from './sentry'

/**
 * エラーログエントリ
 */
export interface ErrorLogEntry {
  user_id?: string
  error_type: 'api_error' | 'database_error' | 'validation_error' | 'system_error'
  error_code: string
  error_message: string
  stack_trace?: string
  severity: SeverityLevel
  endpoint?: string
  method?: string
  request_data?: Record<string, unknown>
  context_data?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  environment: 'development' | 'production'
}

/**
 * エラーをデータベースに記録
 */
export async function logError(
  db: D1Database,
  entry: ErrorLogEntry
): Promise<void> {
  try {
    await db
      .prepare(`
        INSERT INTO error_logs (
          user_id, error_type, error_code, error_message,
          stack_trace, severity, endpoint, method,
          request_data, context_data, ip_address, user_agent, environment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.user_id || null,
        entry.error_type,
        entry.error_code,
        entry.error_message,
        entry.stack_trace || null,
        entry.severity,
        entry.endpoint || null,
        entry.method || null,
        entry.request_data ? JSON.stringify(entry.request_data) : null,
        entry.context_data ? JSON.stringify(entry.context_data) : null,
        entry.ip_address || null,
        entry.user_agent || null,
        entry.environment
      )
      .run()
  } catch (error) {
    console.error('[Error Logger] Database insert failed:', error)
    // エラーは無視（ログ保存失敗はシステムに影響を与えない）
  }
}

/**
 * エラーからログエントリを作成
 */
export function createErrorLogEntry(
  error: Error | ApiError | unknown,
  options: {
    endpoint?: string
    method?: string
    userId?: string
    requestData?: Record<string, unknown>
    contextData?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    environment?: 'development' | 'production'
  } = {}
): ErrorLogEntry {
  let errorType: ErrorLogEntry['error_type'] = 'system_error'
  let errorCode = 'UNKNOWN_ERROR'
  let errorMessage = 'An unknown error occurred'
  let stackTrace: string | undefined
  let severity: SeverityLevel = SeverityLevel.ERROR
  
  // エラータイプを判定
  if (error instanceof Error) {
    errorMessage = error.message
    stackTrace = error.stack
    errorCode = error.name
    
    // エラー名からタイプを推測
    if (error.name.includes('Database') || error.name.includes('SQL')) {
      errorType = 'database_error'
    } else if (error.name.includes('Validation')) {
      errorType = 'validation_error'
      severity = SeverityLevel.WARNING
    }
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    const apiError = error as ApiError
    errorType = 'api_error'
    errorCode = apiError.code
    errorMessage = apiError.message
    
    // エラーコードから深刻度を判定
    severity = getSeverityFromErrorCode(apiError.code)
  } else {
    errorMessage = String(error)
  }
  
  return {
    user_id: options.userId,
    error_type: errorType,
    error_code: errorCode,
    error_message: errorMessage,
    stack_trace: stackTrace,
    severity,
    endpoint: options.endpoint,
    method: options.method,
    request_data: options.requestData,
    context_data: options.contextData,
    ip_address: options.ipAddress,
    user_agent: options.userAgent,
    environment: options.environment || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  }
}

/**
 * エラーコードから深刻度を取得
 */
function getSeverityFromErrorCode(code: string): SeverityLevel {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_INPUT:
      return SeverityLevel.WARNING
    
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
    case ErrorCode.NOT_FOUND:
      return SeverityLevel.INFO
    
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.TRANSACTION_ERROR:
    case ErrorCode.INTERNAL_ERROR:
      return SeverityLevel.ERROR
    
    case ErrorCode.TIMEOUT:
      return SeverityLevel.WARNING
    
    default:
      return SeverityLevel.WARNING
  }
}

/**
 * エラー統計を取得
 */
export async function getErrorStats(
  db: D1Database,
  timeRange: 'hour' | 'day' | 'week' = 'day'
): Promise<{
  totalErrors: number
  unresolvedErrors: number
  errorsByType: Array<{ type: string; count: number }>
  errorsBySeverity: Array<{ severity: string; count: number }>
  topErrors: Array<{ code: string; message: string; count: number }>
}> {
  const timeFilter = getTimeFilter(timeRange)
  
  // 総エラー数
  const totalResult = await db
    .prepare(`SELECT COUNT(*) as count FROM error_logs WHERE ${timeFilter}`)
    .first()
  
  // 未解決エラー数
  const unresolvedResult = await db
    .prepare(`SELECT COUNT(*) as count FROM error_logs WHERE resolved = 0 AND ${timeFilter}`)
    .first()
  
  // エラータイプ別
  const byType = await db
    .prepare(`
      SELECT error_type as type, COUNT(*) as count
      FROM error_logs
      WHERE ${timeFilter}
      GROUP BY error_type
      ORDER BY count DESC
    `)
    .all()
  
  // 深刻度別
  const bySeverity = await db
    .prepare(`
      SELECT severity, COUNT(*) as count
      FROM error_logs
      WHERE ${timeFilter}
      GROUP BY severity
      ORDER BY 
        CASE severity
          WHEN 'fatal' THEN 1
          WHEN 'error' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'info' THEN 4
          WHEN 'debug' THEN 5
        END
    `)
    .all()
  
  // トップエラー
  const topErrors = await db
    .prepare(`
      SELECT 
        error_code as code,
        error_message as message,
        COUNT(*) as count
      FROM error_logs
      WHERE ${timeFilter}
      GROUP BY error_code, error_message
      ORDER BY count DESC
      LIMIT 10
    `)
    .all()
  
  return {
    totalErrors: totalResult?.count || 0,
    unresolvedErrors: unresolvedResult?.count || 0,
    errorsByType: byType.results.map(r => ({
      type: r.type as string,
      count: r.count as number,
    })),
    errorsBySeverity: bySeverity.results.map(r => ({
      severity: r.severity as string,
      count: r.count as number,
    })),
    topErrors: topErrors.results.map(r => ({
      code: r.code as string,
      message: r.message as string,
      count: r.count as number,
    })),
  }
}

/**
 * 時間フィルターを取得
 */
function getTimeFilter(timeRange: 'hour' | 'day' | 'week'): string {
  switch (timeRange) {
    case 'hour':
      return "created_at >= datetime('now', '-1 hour')"
    case 'day':
      return "created_at >= datetime('now', '-1 day')"
    case 'week':
      return "created_at >= datetime('now', '-7 days')"
    default:
      return "created_at >= datetime('now', '-1 day')"
  }
}
