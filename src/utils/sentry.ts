/**
 * Sentry統合
 * エラートラッキングと監視
 */

import { ApiError, ErrorCode } from '../types/api'

/**
 * Sentry設定
 */
export interface SentryConfig {
  dsn?: string
  environment: 'development' | 'production'
  sampleRate: number
  enabled: boolean
}

/**
 * エラーの深刻度
 */
export enum SeverityLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * エラーコンテキスト
 */
export interface ErrorContext {
  user?: {
    id?: string
    email?: string
    name?: string
  }
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

/**
 * Sentryクライアント（簡易版）
 * 実際のSentry SDKの代わりに、Cloudflare Workersで動作する軽量版
 */
class SentryClient {
  private config: SentryConfig
  private context: ErrorContext = {}
  
  constructor(config: SentryConfig) {
    this.config = config
  }
  
  /**
   * 初期化
   */
  init(config: Partial<SentryConfig>) {
    this.config = { ...this.config, ...config }
    
    if (this.config.enabled && this.config.dsn) {
      console.info('[Sentry] Initialized', {
        environment: this.config.environment,
        sampleRate: this.config.sampleRate,
      })
    }
  }
  
  /**
   * ユーザーコンテキストを設定
   */
  setUser(user: ErrorContext['user']) {
    this.context.user = user
  }
  
  /**
   * タグを設定
   */
  setTag(key: string, value: string) {
    if (!this.context.tags) {
      this.context.tags = {}
    }
    this.context.tags[key] = value
  }
  
  /**
   * 追加情報を設定
   */
  setExtra(key: string, value: unknown) {
    if (!this.context.extra) {
      this.context.extra = {}
    }
    this.context.extra[key] = value
  }
  
  /**
   * エラーをキャプチャ
   */
  captureException(error: Error | ApiError | unknown, context?: ErrorContext) {
    if (!this.config.enabled) {
      return
    }
    
    // サンプリング
    if (Math.random() > this.config.sampleRate) {
      return
    }
    
    const mergedContext = {
      ...this.context,
      ...context,
      tags: { ...this.context.tags, ...context?.tags },
      extra: { ...this.context.extra, ...context?.extra },
    }
    
    // エラー情報を整形
    const errorInfo = this.formatError(error)
    
    // ログ出力（本番環境ではSentry APIに送信）
    this.logError(errorInfo, mergedContext)
    
    // 本番環境ではSentry APIへ送信（実装例）
    if (this.config.environment === 'production' && this.config.dsn) {
      this.sendToSentry(errorInfo, mergedContext)
    }
  }
  
  /**
   * メッセージをキャプチャ
   */
  captureMessage(message: string, level: SeverityLevel = SeverityLevel.INFO) {
    if (!this.config.enabled) {
      return
    }
    
    console.log(`[Sentry] ${level.toUpperCase()}: ${message}`, this.context)
  }
  
  /**
   * エラーを整形
   */
  private formatError(error: unknown): {
    message: string
    code?: string
    stack?: string
    type: string
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        type: error.name,
      }
    }
    
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const apiError = error as ApiError
      return {
        message: apiError.message,
        code: apiError.code,
        type: 'ApiError',
      }
    }
    
    return {
      message: String(error),
      type: 'Unknown',
    }
  }
  
  /**
   * エラーをログ出力
   */
  private logError(
    errorInfo: ReturnType<SentryClient['formatError']>,
    context: ErrorContext
  ) {
    console.error('[Sentry] Error captured:', {
      ...errorInfo,
      context,
      timestamp: new Date().toISOString(),
    })
  }
  
  /**
   * Sentry APIへ送信（実装例）
   */
  private async sendToSentry(
    errorInfo: ReturnType<SentryClient['formatError']>,
    context: ErrorContext
  ) {
    if (!this.config.dsn) {
      return
    }
    
    try {
      // Sentry APIエンドポイント（実際の実装では正しいフォーマットを使用）
      const endpoint = `${this.config.dsn}/api/store/`
      
      const payload = {
        message: errorInfo.message,
        level: SeverityLevel.ERROR,
        platform: 'javascript',
        timestamp: Date.now() / 1000,
        environment: this.config.environment,
        exception: {
          values: [
            {
              type: errorInfo.type,
              value: errorInfo.message,
              stacktrace: errorInfo.stack
                ? {
                    frames: this.parseStackTrace(errorInfo.stack),
                  }
                : undefined,
            },
          ],
        },
        user: context.user,
        tags: context.tags,
        extra: context.extra,
      }
      
      // 非同期送信（エラーは無視）
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // 送信エラーは無視
      })
    } catch {
      // Sentry送信エラーは無視
    }
  }
  
  /**
   * スタックトレースをパース
   */
  private parseStackTrace(stack: string): Array<{ filename: string; lineno: number }> {
    return stack
      .split('\n')
      .slice(1)
      .map(line => {
        const match = line.match(/at .+ \((.+):(\d+):\d+\)/)
        if (match) {
          return {
            filename: match[1],
            lineno: parseInt(match[2], 10),
          }
        }
        return { filename: 'unknown', lineno: 0 }
      })
  }
}

/**
 * デフォルトSentryクライアント
 * DSNは環境変数 SENTRY_DSN から取得
 */
export const sentry = new SentryClient({
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  sampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,
  enabled: process.env.NODE_ENV === 'production',
  dsn: process.env.SENTRY_DSN,
})

/**
 * Sentryクライアントを環境変数で初期化
 * Honoコンテキストから環境変数を取得して設定
 */
export function initializeSentry(env: Record<string, any>) {
  if (env.SENTRY_DSN) {
    sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.ENVIRONMENT || 'production',
      enabled: true,
      sampleRate: 1.0,
    })
  }
}

/**
 * エラーコードから深刻度を取得
 */
export function getSeverityFromErrorCode(code: string): SeverityLevel {
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
    
    default:
      return SeverityLevel.WARNING
  }
}
