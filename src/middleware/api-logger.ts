/**
 * APIロギングミドルウェア
 * 全APIリクエストを記録してデータベースに保存
 */

import { Context, MiddlewareHandler, Next } from 'hono'
import { Database } from '../db/database'
import type { Bindings } from '../types/hono'

/**
 * APIログエントリ
 */
interface ApiLogEntry {
  user_id?: string
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  request_size_bytes: number
  response_size_bytes: number
  ip_address?: string
  user_agent?: string
  error_code?: string
  error_message?: string
  request_body?: string
  response_body?: string
}

/**
 * APIロガーミドルウェア
 */
export function apiLogger(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const { DB } = c.env as Bindings
    
    // リクエスト情報を取得
    const method = c.req.method
    const endpoint = c.req.path
    const userId = c.get('userId') || c.get('user')?.id
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    const userAgent = c.req.header('user-agent') || 'unknown'
    
    // リクエストボディサイズ
    const requestBody = c.req.header('content-length')
    const requestSizeBytes = requestBody ? parseInt(requestBody, 10) : 0
    
    // 次のミドルウェアを実行
    await next()
    
    // レスポンス情報を取得
    const endTime = Date.now()
    const responseTimeMs = endTime - startTime
    const statusCode = c.res.status
    
    // レスポンスサイズを推定（正確ではないが概算）
    let responseSizeBytes = 0
    try {
      const responseText = await c.res.clone().text()
      responseSizeBytes = new TextEncoder().encode(responseText).length
    } catch {
      // レスポンスボディが取得できない場合は0
    }
    
    // エラー情報を取得（レスポンスから）
    let errorCode: string | undefined
    let errorMessage: string | undefined
    if (statusCode >= 400) {
      try {
        const responseJson = await c.res.clone().json()
        if (responseJson.error) {
          errorCode = responseJson.error.code
          errorMessage = responseJson.error.message
        }
      } catch {
        // JSON以外のレスポンスの場合
      }
    }
    
    // ログエントリを作成
    const logEntry: ApiLogEntry = {
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      request_size_bytes: requestSizeBytes,
      response_size_bytes: responseSizeBytes,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_code: errorCode,
      error_message: errorMessage,
      // request_body と response_body は省略（大きすぎるため）
    }
    
    // バックグラウンドでデータベースに保存
    // 非同期実行なので、レスポンスには影響しない
    saveApiLog(DB, logEntry).catch(err => {
      console.error('[API Logger] Failed to save log:', err)
    })
  }
}

/**
 * APIログをデータベースに保存
 */
async function saveApiLog(db: D1Database, entry: ApiLogEntry): Promise<void> {
  try {
    await db
      .prepare(`
        INSERT INTO api_logs (
          user_id, endpoint, method, status_code, 
          response_time_ms, request_size_bytes, response_size_bytes,
          ip_address, user_agent, error_code, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.user_id || null,
        entry.endpoint,
        entry.method,
        entry.status_code,
        entry.response_time_ms,
        entry.request_size_bytes,
        entry.response_size_bytes,
        entry.ip_address || null,
        entry.user_agent || null,
        entry.error_code || null,
        entry.error_message || null
      )
      .run()
  } catch (error) {
    console.error('[API Logger] Database insert failed:', error)
    // エラーは無視（ログ保存失敗はシステムに影響を与えない）
  }
}

/**
 * APIメトリクスを取得
 */
export async function getApiMetrics(db: D1Database, timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
  totalCalls: number
  successCalls: number
  errorCalls: number
  avgResponseTime: number
  topEndpoints: Array<{ endpoint: string; calls: number }>
  errorRates: Array<{ endpoint: string; errorRate: number }>
}> {
  const timeFilter = getTimeFilter(timeRange)
  
  // 総コール数
  const totalResult = await db
    .prepare(`SELECT COUNT(*) as count FROM api_logs WHERE ${timeFilter}`)
    .first()
  
  // 成功コール数
  const successResult = await db
    .prepare(`SELECT COUNT(*) as count FROM api_logs WHERE status_code < 400 AND ${timeFilter}`)
    .first()
  
  // 平均レスポンスタイム
  const avgTimeResult = await db
    .prepare(`SELECT AVG(response_time_ms) as avg FROM api_logs WHERE ${timeFilter}`)
    .first()
  
  // トップエンドポイント
  const topEndpoints = await db
    .prepare(`
      SELECT endpoint, COUNT(*) as calls
      FROM api_logs
      WHERE ${timeFilter}
      GROUP BY endpoint
      ORDER BY calls DESC
      LIMIT 10
    `)
    .all()
  
  // エラー率
  const errorRates = await db
    .prepare(`
      SELECT 
        endpoint,
        ROUND(
          CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS FLOAT) / 
          CAST(COUNT(*) AS FLOAT) * 100,
          2
        ) as errorRate
      FROM api_logs
      WHERE ${timeFilter}
      GROUP BY endpoint
      HAVING errorRate > 0
      ORDER BY errorRate DESC
      LIMIT 10
    `)
    .all()
  
  return {
    totalCalls: totalResult?.count || 0,
    successCalls: successResult?.count || 0,
    errorCalls: (totalResult?.count || 0) - (successResult?.count || 0),
    avgResponseTime: avgTimeResult?.avg || 0,
    topEndpoints: topEndpoints.results.map(r => ({
      endpoint: r.endpoint as string,
      calls: r.calls as number,
    })),
    errorRates: errorRates.results.map(r => ({
      endpoint: r.endpoint as string,
      errorRate: r.errorRate as number,
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
