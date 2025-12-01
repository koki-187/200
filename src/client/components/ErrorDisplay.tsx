/**
 * エラー表示コンポーネント
 * APIエラーをユーザーフレンドリーに表示
 */

import React from 'react'
import { ApiError, ErrorCode } from '../../types/api'

export interface ErrorDisplayProps {
  error: ApiError | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * エラーコードに応じたアイコンを取得
 */
function getErrorIcon(code?: string): string {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
      return '🔒'
    case ErrorCode.NOT_FOUND:
      return '🔍'
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.TIMEOUT_ERROR:
      return '📡'
    case ErrorCode.VALIDATION_ERROR:
      return '⚠️'
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return '⏰'
    default:
      return '❌'
  }
}

/**
 * エラーコードに応じた色を取得
 */
function getErrorColor(code?: string): string {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
      return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.TIMEOUT_ERROR:
      return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
      return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300'
    default:
      return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 */
function getUserFriendlyMessage(error: ApiError): string {
  // カスタムメッセージがあればそれを使用
  if (error.message && error.message !== 'エラーが発生しました') {
    return error.message
  }
  
  // エラーコードに応じたデフォルトメッセージ
  switch (error.code) {
    case ErrorCode.NETWORK_ERROR:
      return 'ネットワークに接続できません。インターネット接続を確認してください。'
    case ErrorCode.TIMEOUT_ERROR:
      return 'リクエストがタイムアウトしました。時間をおいて再度お試しください。'
    case ErrorCode.UNAUTHORIZED:
      return '認証が必要です。再度ログインしてください。'
    case ErrorCode.FORBIDDEN:
      return 'このアクションを実行する権限がありません。'
    case ErrorCode.NOT_FOUND:
      return '要求されたリソースが見つかりませんでした。'
    case ErrorCode.VALIDATION_ERROR:
      return '入力内容に誤りがあります。もう一度確認してください。'
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 'リクエストが多すぎます。しばらく待ってから再度お試しください。'
    case ErrorCode.DATABASE_ERROR:
      return 'データベースエラーが発生しました。管理者にお問い合わせください。'
    default:
      return 'エラーが発生しました。もう一度お試しください。'
  }
}

/**
 * エラー表示コンポーネント
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  if (!error) {
    return null
  }
  
  const icon = getErrorIcon(error.code)
  const colorClass = getErrorColor(error.code)
  const message = getUserFriendlyMessage(error)
  
  return (
    <div
      className={`rounded-lg border-2 p-4 ${colorClass} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 text-2xl mr-3">
          {icon}
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">
            エラーが発生しました
          </h3>
          
          <p className="text-sm mb-2">
            {message}
          </p>
          
          {error.details && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline">
                詳細情報（開発者向け）
              </summary>
              <pre className="mt-2 text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
          
          <div className="mt-3 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="再試行"
              >
                🔄 再試行
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                aria-label="閉じる"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * インラインエラー表示
 */
export function InlineError({ error }: { error: ApiError | null }) {
  if (!error) {
    return null
  }
  
  const message = getUserFriendlyMessage(error)
  const icon = getErrorIcon(error.code)
  
  return (
    <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  )
}

/**
 * フィールドエラー表示
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  
  return (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}
