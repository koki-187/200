/**
 * パフォーマンス監視APIルート
 * システムメトリクスとエラー統計を提供
 */

import { Hono } from 'hono'
import { Bindings } from '../types'
import { authMiddleware } from '../utils/auth'
import { asyncHandler } from '../middleware/error-handler'
import { getApiMetrics } from '../middleware/api-logger'
import { getErrorStats } from '../utils/error-logger'

const monitoring = new Hono<{ Bindings: Bindings }>()

/**
 * メトリクス型定義
 */
interface PerformanceMetrics {
  timestamp: string
  apiCalls: {
    total: number
    successful: number
    failed: number
    averageResponseTime: number
  }
  errors: {
    total: number
    byCode: Record<string, number>
    byEndpoint: Record<string, number>
  }
  database: {
    queries: number
    averageQueryTime: number
    errors: number
  }
}

/**
 * システムヘルスチェック
 */
monitoring.get('/health', asyncHandler(async (c) => {
  const db = c.env.DB
  
  // データベース接続チェック
  let dbHealth = 'unknown'
  let dbLatency = 0
  
  try {
    const start = Date.now()
    await db.prepare('SELECT 1').first()
    dbLatency = Date.now() - start
    dbHealth = dbLatency < 100 ? 'healthy' : 'degraded'
  } catch {
    dbHealth = 'unhealthy'
  }
  
  return c.json({
    status: dbHealth === 'unhealthy' ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      database: {
        status: dbHealth,
        latency: dbLatency,
      },
      api: {
        status: 'healthy',
      },
    },
  })
}))

/**
 * メトリクス取得（管理者のみ）
 * 時間範囲指定可能: hour, day, week
 */
monitoring.get('/metrics', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const timeRange = (c.req.query('timeRange') || 'day') as 'hour' | 'day' | 'week'
  
  // 新しいAPIメトリクス取得関数を使用
  const apiMetrics = await getApiMetrics(db, timeRange)
  
  // 新しいエラー統計取得関数を使用
  const errorStats = await getErrorStats(db, timeRange)
  
  const metrics: PerformanceMetrics = {
    timestamp: new Date().toISOString(),
    apiCalls: {
      total: apiMetrics.totalCalls,
      successful: apiMetrics.successCalls,
      failed: apiMetrics.errorCalls,
      averageResponseTime: Math.round(apiMetrics.avgResponseTime),
    },
    errors: {
      total: errorStats.totalErrors,
      byCode: errorStats.errorsByType.reduce((acc, item) => {
        acc[item.type] = item.count
        return acc
      }, {} as Record<string, number>),
      byEndpoint: apiMetrics.errorRates.reduce((acc, item) => {
        acc[item.endpoint] = item.errorRate
        return acc
      }, {} as Record<string, number>),
    },
    database: {
      queries: 0, // 将来的に実装
      averageQueryTime: 0, // 将来的に実装
      errors: 0, // 将来的に実装
    },
  }
  
  return c.json({
    ...metrics,
    details: {
      topEndpoints: apiMetrics.topEndpoints,
      errorRates: apiMetrics.errorRates,
      unresolvedErrors: errorStats.unresolvedErrors,
      errorsBySeverity: errorStats.errorsBySeverity,
      topErrors: errorStats.topErrors,
    },
  })
}))

/**
 * リアルタイムメトリクス（簡易版）
 */
monitoring.get('/metrics/realtime', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  
  // 直近5分のAPI統計
  const recentStats = await db
    .prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(response_time) as avg_time,
        MAX(response_time) as max_time,
        MIN(response_time) as min_time
      FROM api_logs
      WHERE created_at >= ?
    `)
    .bind(fiveMinutesAgo.toISOString())
    .first<{
      total: number
      avg_time: number
      max_time: number
      min_time: number
    }>()
  
  return c.json({
    timestamp: now.toISOString(),
    window: '5 minutes',
    requests: {
      total: recentStats?.total || 0,
      averageTime: Math.round(recentStats?.avg_time || 0),
      maxTime: Math.round(recentStats?.max_time || 0),
      minTime: Math.round(recentStats?.min_time || 0),
    },
  })
}))

/**
 * エラーログ取得
 */
monitoring.get('/errors', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  
  // エラーログを取得
  const errors = await db
    .prepare(`
      SELECT *
      FROM error_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(limit, offset)
    .all()
  
  return c.json({
    errors: errors.results || [],
    limit,
    offset,
  })
}))

/**
 * APIログ記録用ヘルパー
 */
export async function logApiCall(
  db: D1Database,
  data: {
    endpoint: string
    method: string
    status_code: number
    response_time: number
    user_id?: string
    error_code?: string
  }
) {
  try {
    await db
      .prepare(`
        INSERT INTO api_logs (endpoint, method, status_code, response_time, user_id, error_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.endpoint,
        data.method,
        data.status_code,
        data.response_time,
        data.user_id || null,
        data.error_code || null,
        new Date().toISOString()
      )
      .run()
  } catch (error) {
    // ログ記録エラーは無視（メイン処理に影響を与えない）
    console.error('Failed to log API call:', error)
  }
}

/**
 * エラーログ記録用ヘルパー
 */
export async function logError(
  db: D1Database,
  data: {
    endpoint: string
    error_code: string
    error_message: string
    user_id?: string
    stack_trace?: string
  }
) {
  try {
    await db
      .prepare(`
        INSERT INTO error_logs (endpoint, error_code, error_message, user_id, stack_trace, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.endpoint,
        data.error_code,
        data.error_message,
        data.user_id || null,
        data.stack_trace || null,
        new Date().toISOString()
      )
      .run()
  } catch (error) {
    // ログ記録エラーは無視
    console.error('Failed to log error:', error)
  }
}

export default monitoring
