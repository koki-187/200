/**
 * パフォーマンス監視ダッシュボードページ
 * システムメトリクスとエラー統計を表示
 */

import React, { useEffect, useState } from 'react'
import { useGet } from '../hooks/useApiClient'
import { LoadingIndicator } from '../components/LoadingIndicator'
import { ErrorDisplay } from '../components/ErrorDisplay'

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
}

interface SystemHealth {
  status: string
  timestamp: string
  components: {
    database: {
      status: string
      latency: number
    }
    api: {
      status: string
    }
  }
}

/**
 * ステータスバッジ
 */
function StatusBadge({ status }: { status: string }) {
  const colors = {
    healthy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.degraded}`}>
      {status.toUpperCase()}
    </span>
  )
}

/**
 * メトリクスカード
 */
function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

/**
 * パフォーマンス監視ダッシュボードページ
 */
export default function MonitoringDashboardPage() {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30秒
  
  const {
    data: healthData,
    error: healthError,
    loading: healthLoading,
    get: getHealth,
  } = useGet<SystemHealth>()
  
  const {
    data: metricsData,
    error: metricsError,
    loading: metricsLoading,
    get: getMetrics,
  } = useGet<PerformanceMetrics>()
  
  // 初回ロード
  useEffect(() => {
    loadData()
  }, [])
  
  // 自動更新
  useEffect(() => {
    if (!autoRefresh) {
      return
    }
    
    const timer = setInterval(() => {
      loadData()
    }, refreshInterval)
    
    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval])
  
  const loadData = async () => {
    await Promise.all([
      getHealth('/api/monitoring/health'),
      getMetrics('/api/monitoring/metrics'),
    ])
  }
  
  const handleRefresh = () => {
    loadData()
  }
  
  const loading = healthLoading || metricsLoading
  const error = healthError || metricsError
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📊 パフォーマンス監視ダッシュボード
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                システムメトリクスとエラー統計
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 自動更新トグル */}
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>自動更新</span>
              </label>
              
              {/* 更新間隔選択 */}
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
                >
                  <option value={10000}>10秒</option>
                  <option value={30000}>30秒</option>
                  <option value={60000}>1分</option>
                  <option value={300000}>5分</option>
                </select>
              )}
              
              {/* 手動更新ボタン */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                🔄 更新
              </button>
            </div>
          </div>
        </div>
        
        {/* エラー表示 */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={handleRefresh}
            className="mb-8"
          />
        )}
        
        {/* ローディング */}
        {loading && !healthData && !metricsData && (
          <LoadingIndicator loading={loading} size="lg" />
        )}
        
        {/* システムヘルス */}
        {healthData?.data && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              システムヘルス
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  全体ステータス
                </p>
                <StatusBadge status={healthData.data.status} />
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  データベース
                </p>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={healthData.data.components.database.status} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {healthData.data.components.database.latency}ms
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  API
                </p>
                <StatusBadge status={healthData.data.components.api.status} />
              </div>
            </div>
          </div>
        )}
        
        {/* メトリクス */}
        {metricsData?.data && (
          <>
            {/* APIコール統計 */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                APIコール統計（過去1時間）
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="総リクエスト数"
                  value={metricsData.data.apiCalls.total.toLocaleString()}
                  icon="📊"
                />
                
                <MetricCard
                  title="成功"
                  value={metricsData.data.apiCalls.successful.toLocaleString()}
                  subtitle={`${Math.round((metricsData.data.apiCalls.successful / metricsData.data.apiCalls.total) * 100)}%`}
                  icon="✅"
                />
                
                <MetricCard
                  title="失敗"
                  value={metricsData.data.apiCalls.failed.toLocaleString()}
                  subtitle={`${Math.round((metricsData.data.apiCalls.failed / metricsData.data.apiCalls.total) * 100)}%`}
                  icon="❌"
                />
                
                <MetricCard
                  title="平均レスポンスタイム"
                  value={`${metricsData.data.apiCalls.averageResponseTime}ms`}
                  icon="⚡"
                />
              </div>
            </div>
            
            {/* エラー統計 */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                エラー統計（過去1時間）
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* エラーコード別 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                    エラーコード別
                  </h3>
                  
                  {Object.keys(metricsData.data.errors.byCode).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(metricsData.data.errors.byCode).map(([code, count]) => (
                        <div key={code} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {code}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      エラーなし ✅
                    </p>
                  )}
                </div>
                
                {/* エンドポイント別 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                    エンドポイント別
                  </h3>
                  
                  {Object.keys(metricsData.data.errors.byEndpoint).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(metricsData.data.errors.byEndpoint).map(([endpoint, count]) => (
                        <div key={endpoint} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {endpoint}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      エラーなし ✅
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* 最終更新時刻 */}
        {metricsData?.data && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            最終更新: {new Date(metricsData.data.timestamp).toLocaleString('ja-JP')}
          </div>
        )}
      </div>
    </div>
  )
}
