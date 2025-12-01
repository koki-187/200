/**
 * ローディングインジケーターコンポーネント
 * リトライ状態の表示も含む
 */

import React from 'react'
import { RetryState } from '../hooks/useApiClient'

export interface LoadingIndicatorProps {
  loading: boolean
  retryState?: RetryState | null
  size?: 'sm' | 'md' | 'lg'
  message?: string
  fullScreen?: boolean
}

/**
 * ローディングスピナー
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }
  
  return (
    <div
      className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="読み込み中"
    />
  )
}

/**
 * ローディングインジケーター
 */
export function LoadingIndicator({
  loading,
  retryState,
  size = 'md',
  message = '読み込み中...',
  fullScreen = false,
}: LoadingIndicatorProps) {
  if (!loading && !retryState?.isRetrying) {
    return null
  }
  
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <LoadingSpinner size={size} />
      
      <div className="text-center">
        {retryState?.isRetrying ? (
          <>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              リトライ中...
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {retryState.currentAttempt} / {retryState.maxAttempts}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {message}
          </p>
        )}
      </div>
    </div>
  )
  
  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
        role="alert"
        aria-live="polite"
      >
        {content}
      </div>
    )
  }
  
  return (
    <div
      className="flex items-center justify-center p-8"
      role="alert"
      aria-live="polite"
    >
      {content}
    </div>
  )
}

/**
 * インラインローディング
 */
export function InlineLoading({ message = '処理中...' }: { message?: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
      <LoadingSpinner size="sm" />
      <span>{message}</span>
    </div>
  )
}

/**
 * ボタン内ローディング
 */
export function ButtonLoading() {
  return (
    <span className="inline-flex items-center">
      <LoadingSpinner size="sm" />
      <span className="ml-2">処理中...</span>
    </span>
  )
}
