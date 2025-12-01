/**
 * グレースフルデグラデーション（優雅な機能低下）ユーティリティ
 * エラー発生時に部分的な機能提供やフォールバック処理を実現
 */

import { logger } from './logger'
import { ErrorCode } from '../types/api'

/**
 * フォールバック戦略型
 */
export type FallbackStrategy<T> = () => Promise<T> | T

/**
 * サーキットブレーカーの状態
 */
enum CircuitState {
  CLOSED = 'closed',     // 正常動作
  OPEN = 'open',         // エラー多発で遮断
  HALF_OPEN = 'half_open' // 回復テスト中
}

/**
 * サーキットブレーカー設定
 */
export interface CircuitBreakerConfig {
  failureThreshold: number    // 失敗回数の閾値
  successThreshold: number    // 成功回数の閾値（HALF_OPEN時）
  timeout: number             // タイムアウト時間（ms）
  resetTimeout: number        // リセットタイムアウト（ms）
}

/**
 * サーキットブレーカーパターン実装
 * 連続エラー時に一時的にリクエストを遮断し、システム負荷を軽減
 */
export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private nextAttempt = Date.now()
  private config: CircuitBreakerConfig
  
  constructor(
    private name: string,
    private operation: () => Promise<T>,
    private fallback: FallbackStrategy<T>,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 60000,
      ...config,
    }
  }
  
  /**
   * 実行可能かチェック
   */
  private canAttempt(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true
    }
    
    if (this.state === CircuitState.OPEN) {
      // リセットタイムアウト経過後はHALF_OPENに移行
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
        logger.info(`Circuit breaker "${this.name}" entering HALF_OPEN state`, 'CircuitBreaker')
        return true
      }
      return false
    }
    
    // HALF_OPEN状態では実行を許可
    return true
  }
  
  /**
   * 成功を記録
   */
  private recordSuccess(): void {
    this.failureCount = 0
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED
        logger.info(`Circuit breaker "${this.name}" recovered to CLOSED state`, 'CircuitBreaker')
      }
    }
  }
  
  /**
   * 失敗を記録
   */
  private recordFailure(): void {
    this.failureCount++
    
    if (this.state === CircuitState.HALF_OPEN) {
      // HALF_OPEN時の失敗は即座にOPENに戻す
      this.state = CircuitState.OPEN
      this.nextAttempt = Date.now() + this.config.resetTimeout
      logger.warn(`Circuit breaker "${this.name}" reopened`, 'CircuitBreaker')
      return
    }
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      this.nextAttempt = Date.now() + this.config.resetTimeout
      logger.error(
        `Circuit breaker "${this.name}" opened due to ${this.failureCount} failures`,
        undefined,
        'CircuitBreaker'
      )
    }
  }
  
  /**
   * 操作を実行
   */
  async execute(): Promise<T> {
    if (!this.canAttempt()) {
      logger.info(
        `Circuit breaker "${this.name}" is OPEN, using fallback`,
        'CircuitBreaker'
      )
      return await this.fallback()
    }
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
      })
      
      const result = await Promise.race([
        this.operation(),
        timeoutPromise,
      ])
      
      this.recordSuccess()
      return result
      
    } catch (error) {
      this.recordFailure()
      
      logger.error(
        `Circuit breaker "${this.name}" operation failed`,
        error,
        'CircuitBreaker',
        { state: this.state, failureCount: this.failureCount }
      )
      
      // フォールバックを実行
      return await this.fallback()
    }
  }
  
  /**
   * 状態を取得
   */
  getState(): { state: CircuitState; failureCount: number; successCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    }
  }
  
  /**
   * リセット
   */
  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.nextAttempt = Date.now()
  }
}

/**
 * リトライ付きフォールバック実行
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: FallbackStrategy<T>,
  options: {
    maxRetries?: number
    retryDelay?: number
    logContext?: string
  } = {}
): Promise<T> {
  const { maxRetries = 2, retryDelay = 1000, logContext = 'Operation' } = options
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      logger.warn(
        `${logContext} failed (attempt ${attempt + 1}/${maxRetries + 1})`,
        'Fallback',
        { error }
      )
      
      // 最後の試行の場合
      if (attempt === maxRetries) {
        logger.info(`${logContext} using fallback`, 'Fallback')
        return await fallback()
      }
      
      // リトライ前の待機
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
    }
  }
  
  // ここには到達しないが、型安全のため
  return await fallback()
}

/**
 * 部分的なデータ取得（一部失敗しても他のデータを返す）
 */
export async function fetchPartial<T>(
  operations: Array<{ key: string; fn: () => Promise<T> }>,
  options: {
    continueOnError?: boolean
    logContext?: string
  } = {}
): Promise<{ data: Record<string, T>; errors: Record<string, Error> }> {
  const { continueOnError = true, logContext = 'PartialFetch' } = options
  
  const data: Record<string, T> = {}
  const errors: Record<string, Error> = {}
  
  await Promise.all(
    operations.map(async ({ key, fn }) => {
      try {
        data[key] = await fn()
      } catch (error) {
        if (error instanceof Error) {
          errors[key] = error
        } else {
          errors[key] = new Error(String(error))
        }
        
        logger.warn(
          `${logContext} failed for key: ${key}`,
          'PartialFetch',
          { error }
        )
        
        if (!continueOnError) {
          throw error
        }
      }
    })
  )
  
  return { data, errors }
}

/**
 * キャッシュ付きフォールバック
 */
export class CachedFallback<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map()
  private ttl: number
  
  constructor(ttl: number = 300000) { // デフォルト5分
    this.ttl = ttl
  }
  
  /**
   * キャッシュから取得またはフォールバック実行
   */
  async get(
    key: string,
    operation: () => Promise<T>,
    fallback?: FallbackStrategy<T>
  ): Promise<T> {
    try {
      const result = await operation()
      
      // 成功時はキャッシュに保存
      this.cache.set(key, {
        data: result,
        timestamp: Date.now(),
      })
      
      return result
      
    } catch (error) {
      logger.warn(`CachedFallback operation failed for key: ${key}`, 'CachedFallback')
      
      // キャッシュから取得を試みる
      const cached = this.cache.get(key)
      if (cached && Date.now() - cached.timestamp < this.ttl) {
        logger.info(`Using cached data for key: ${key}`, 'CachedFallback')
        return cached.data
      }
      
      // キャッシュもない場合はフォールバック実行
      if (fallback) {
        logger.info(`Using fallback for key: ${key}`, 'CachedFallback')
        return await fallback()
      }
      
      throw error
    }
  }
  
  /**
   * キャッシュをクリア
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
  
  /**
   * 期限切れキャッシュを削除
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * デフォルト値を返すフォールバック
 */
export function defaultFallback<T>(defaultValue: T): FallbackStrategy<T> {
  return () => defaultValue
}

/**
 * 空の配列を返すフォールバック
 */
export function emptyArrayFallback<T>(): FallbackStrategy<T[]> {
  return () => []
}

/**
 * nullを返すフォールバック
 */
export function nullFallback(): FallbackStrategy<null> {
  return () => null
}
