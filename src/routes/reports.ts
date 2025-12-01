/**
 * レポートAPIルート
 * api_metrics_summary、error_stats_summaryビューを活用した統計レポート
 */

import { Hono } from 'hono'
import { Bindings } from '../types'
import { authMiddleware } from '../utils/auth'
import { asyncHandler } from '../middleware/error-handler'

const reports = new Hono<{ Bindings: Bindings }>()

/**
 * APIメトリクスサマリー取得
 * api_metrics_summaryビューを活用
 */
reports.get('/api-metrics', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const days = parseInt(c.req.query('days') || '7')
  
  // 日付範囲を計算
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // api_metrics_summaryビューからデータ取得
  const metricsResult = await db
    .prepare(`
      SELECT 
        endpoint,
        method,
        SUM(total_calls) as total_calls,
        SUM(success_count) as success_count,
        SUM(error_count) as error_count,
        ROUND(AVG(avg_response_time), 2) as avg_response_time,
        MIN(min_response_time) as min_response_time,
        MAX(max_response_time) as max_response_time,
        date
      FROM api_metrics_summary
      WHERE date >= ?
      GROUP BY endpoint, method, date
      ORDER BY date DESC, total_calls DESC
    `)
    .bind(startDateStr)
    .all()
  
  // エンドポイント別集計
  const endpointStats = await db
    .prepare(`
      SELECT 
        endpoint,
        method,
        SUM(total_calls) as total_calls,
        SUM(success_count) as success_count,
        SUM(error_count) as error_count,
        ROUND(AVG(avg_response_time), 2) as avg_response_time,
        ROUND(CAST(SUM(error_count) AS FLOAT) / CAST(SUM(total_calls) AS FLOAT) * 100, 2) as error_rate
      FROM api_metrics_summary
      WHERE date >= ?
      GROUP BY endpoint, method
      ORDER BY total_calls DESC
      LIMIT 20
    `)
    .bind(startDateStr)
    .all()
  
  // 日別トレンド
  const dailyTrend = await db
    .prepare(`
      SELECT 
        date,
        SUM(total_calls) as total_calls,
        SUM(success_count) as success_count,
        SUM(error_count) as error_count,
        ROUND(AVG(avg_response_time), 2) as avg_response_time
      FROM api_metrics_summary
      WHERE date >= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    .bind(startDateStr)
    .all()
  
  return c.json({
    period: {
      start: startDateStr,
      end: new Date().toISOString().split('T')[0],
      days,
    },
    metrics: metricsResult.results || [],
    endpointStats: endpointStats.results || [],
    dailyTrend: dailyTrend.results || [],
  })
}))

/**
 * エラー統計サマリー取得
 * error_stats_summaryビューを活用
 */
reports.get('/error-stats', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const days = parseInt(c.req.query('days') || '7')
  
  // 日付範囲を計算
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // error_stats_summaryビューからデータ取得
  const errorStatsResult = await db
    .prepare(`
      SELECT 
        error_type,
        error_code,
        severity,
        SUM(error_count) as error_count,
        SUM(resolved_count) as resolved_count,
        SUM(unresolved_count) as unresolved_count,
        date
      FROM error_stats_summary
      WHERE date >= ?
      GROUP BY error_type, error_code, severity, date
      ORDER BY date DESC, error_count DESC
    `)
    .bind(startDateStr)
    .all()
  
  // エラータイプ別集計
  const errorTypeStats = await db
    .prepare(`
      SELECT 
        error_type,
        SUM(error_count) as total_errors,
        SUM(resolved_count) as resolved_errors,
        SUM(unresolved_count) as unresolved_errors,
        ROUND(CAST(SUM(resolved_count) AS FLOAT) / CAST(SUM(error_count) AS FLOAT) * 100, 2) as resolution_rate
      FROM error_stats_summary
      WHERE date >= ?
      GROUP BY error_type
      ORDER BY total_errors DESC
    `)
    .bind(startDateStr)
    .all()
  
  // 深刻度別集計
  const severityStats = await db
    .prepare(`
      SELECT 
        severity,
        SUM(error_count) as total_errors,
        SUM(unresolved_count) as unresolved_errors
      FROM error_stats_summary
      WHERE date >= ?
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
    .bind(startDateStr)
    .all()
  
  // 日別トレンド
  const dailyTrend = await db
    .prepare(`
      SELECT 
        date,
        SUM(error_count) as total_errors,
        SUM(resolved_count) as resolved_errors,
        SUM(unresolved_count) as unresolved_errors
      FROM error_stats_summary
      WHERE date >= ?
      GROUP BY date
      ORDER BY date ASC
    `)
    .bind(startDateStr)
    .all()
  
  return c.json({
    period: {
      start: startDateStr,
      end: new Date().toISOString().split('T')[0],
      days,
    },
    errorStats: errorStatsResult.results || [],
    errorTypeStats: errorTypeStats.results || [],
    severityStats: severityStats.results || [],
    dailyTrend: dailyTrend.results || [],
  })
}))

/**
 * 統合レポート取得
 * APIメトリクスとエラー統計を組み合わせた包括的なレポート
 */
reports.get('/comprehensive', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const days = parseInt(c.req.query('days') || '7')
  
  // 日付範囲を計算
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // 概要統計
  const summaryStats = await db
    .prepare(`
      SELECT 
        (SELECT SUM(total_calls) FROM api_metrics_summary WHERE date >= ?) as total_api_calls,
        (SELECT SUM(error_count) FROM api_metrics_summary WHERE date >= ?) as total_api_errors,
        (SELECT SUM(error_count) FROM error_stats_summary WHERE date >= ?) as total_logged_errors,
        (SELECT SUM(unresolved_count) FROM error_stats_summary WHERE date >= ?) as unresolved_errors,
        (SELECT AVG(avg_response_time) FROM api_metrics_summary WHERE date >= ?) as avg_response_time
    `)
    .bind(startDateStr, startDateStr, startDateStr, startDateStr, startDateStr)
    .first()
  
  // トップエラーエンドポイント
  const topErrorEndpoints = await db
    .prepare(`
      SELECT 
        endpoint,
        method,
        SUM(error_count) as error_count,
        SUM(total_calls) as total_calls,
        ROUND(CAST(SUM(error_count) AS FLOAT) / CAST(SUM(total_calls) AS FLOAT) * 100, 2) as error_rate
      FROM api_metrics_summary
      WHERE date >= ? AND error_count > 0
      GROUP BY endpoint, method
      ORDER BY error_rate DESC
      LIMIT 10
    `)
    .bind(startDateStr)
    .all()
  
  // 最遅エンドポイント
  const slowestEndpoints = await db
    .prepare(`
      SELECT 
        endpoint,
        method,
        ROUND(AVG(avg_response_time), 2) as avg_response_time,
        MAX(max_response_time) as max_response_time,
        SUM(total_calls) as total_calls
      FROM api_metrics_summary
      WHERE date >= ?
      GROUP BY endpoint, method
      ORDER BY avg_response_time DESC
      LIMIT 10
    `)
    .bind(startDateStr)
    .all()
  
  // 健全性スコア計算（0-100）
  const errorRate = summaryStats?.total_api_errors && summaryStats?.total_api_calls
    ? (summaryStats.total_api_errors / summaryStats.total_api_calls) * 100
    : 0
  
  const healthScore = Math.max(0, Math.min(100, 100 - (errorRate * 10)))
  
  return c.json({
    period: {
      start: startDateStr,
      end: new Date().toISOString().split('T')[0],
      days,
    },
    summary: {
      ...summaryStats,
      error_rate: errorRate.toFixed(2),
      health_score: healthScore.toFixed(1),
    },
    topErrorEndpoints: topErrorEndpoints.results || [],
    slowestEndpoints: slowestEndpoints.results || [],
  })
}))

/**
 * CSVエクスポート（APIメトリクス）
 */
reports.get('/api-metrics/export', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const days = parseInt(c.req.query('days') || '7')
  
  // 日付範囲を計算
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // データ取得
  const metricsResult = await db
    .prepare(`
      SELECT 
        date,
        endpoint,
        method,
        total_calls,
        success_count,
        error_count,
        avg_response_time,
        min_response_time,
        max_response_time
      FROM api_metrics_summary
      WHERE date >= ?
      ORDER BY date DESC, total_calls DESC
    `)
    .bind(startDateStr)
    .all()
  
  // CSV生成
  const headers = [
    'Date',
    'Endpoint',
    'Method',
    'Total Calls',
    'Success Count',
    'Error Count',
    'Avg Response Time (ms)',
    'Min Response Time (ms)',
    'Max Response Time (ms)',
  ]
  
  const rows = metricsResult.results.map((row: any) => [
    row.date,
    row.endpoint,
    row.method,
    row.total_calls,
    row.success_count,
    row.error_count,
    row.avg_response_time,
    row.min_response_time,
    row.max_response_time,
  ])
  
  const csv = [
    headers.join(','),
    ...rows.map((row: any[]) => row.join(',')),
  ].join('\n')
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="api_metrics_${startDateStr}_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}))

/**
 * CSVエクスポート（エラー統計）
 */
reports.get('/error-stats/export', authMiddleware, asyncHandler(async (c) => {
  const user = c.get('user')
  
  // 管理者のみアクセス可能
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'アクセス権限がありません' }, 403)
  }
  
  const db = c.env.DB
  const days = parseInt(c.req.query('days') || '7')
  
  // 日付範囲を計算
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // データ取得
  const errorStatsResult = await db
    .prepare(`
      SELECT 
        date,
        error_type,
        error_code,
        severity,
        error_count,
        resolved_count,
        unresolved_count
      FROM error_stats_summary
      WHERE date >= ?
      ORDER BY date DESC, error_count DESC
    `)
    .bind(startDateStr)
    .all()
  
  // CSV生成
  const headers = [
    'Date',
    'Error Type',
    'Error Code',
    'Severity',
    'Error Count',
    'Resolved Count',
    'Unresolved Count',
  ]
  
  const rows = errorStatsResult.results.map((row: any) => [
    row.date,
    row.error_type,
    row.error_code,
    row.severity,
    row.error_count,
    row.resolved_count,
    row.unresolved_count,
  ])
  
  const csv = [
    headers.join(','),
    ...rows.map((row: any[]) => row.join(',')),
  ].join('\n')
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="error_stats_${startDateStr}_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}))

export default reports
