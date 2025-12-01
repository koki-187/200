/**
 * 構造化ロギングユーティリティ
 * 本番環境でのデバッグとエラー追跡を容易にする
 */

import { ErrorCode } from '../types/api'

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * ログエントリ型
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  data?: Record<string, unknown>
  error?: {
    code?: string
    message?: string
    stack?: string
  }
  requestId?: string
  userId?: string
}

/**
 * ロガー設定
 */
export interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableStructured: boolean
  environment: 'development' | 'production'
}

/**
 * ロガークラス
 */
export class Logger {
  private config: LoggerConfig
  private static instance: Logger
  
  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      enableConsole: true,
      enableStructured: true,
      environment: 'production',
      ...config,
    }
  }
  
  /**
   * シングルトンインスタンス取得
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config)
    }
    return Logger.instance
  }
  
  /**
   * ログレベルの優先度を取得
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    }
    return priorities[level]
  }
  
  /**
   * ログを出力するかチェック
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.config.minLevel)
  }
  
  /**
   * ログエントリを作成
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown>,
    error?: Error | unknown
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    }
    
    if (context) {
      entry.context = context
    }
    
    if (data) {
      entry.data = data
    }
    
    if (error) {
      if (error instanceof Error) {
        entry.error = {
          message: error.message,
          stack: this.config.environment === 'development' ? error.stack : undefined,
        }
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { code?: string; message?: string }
        entry.error = {
          code: err.code,
          message: err.message,
        }
      }
    }
    
    return entry
  }
  
  /**
   * ログを出力
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return
    }
    
    // 構造化ログ出力
    if (this.config.enableStructured) {
      const structuredLog = JSON.stringify(entry)
      
      // コンソール出力
      if (this.config.enableConsole) {
        const consoleFn = entry.level === LogLevel.ERROR ? console.error :
                         entry.level === LogLevel.WARN ? console.warn :
                         console.log
        consoleFn(structuredLog)
      }
    } else {
      // 通常のコンソール出力
      if (this.config.enableConsole) {
        const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`
        const contextStr = entry.context ? ` [${entry.context}]` : ''
        const message = `${prefix}${contextStr} ${entry.message}`
        
        const consoleFn = entry.level === LogLevel.ERROR ? console.error :
                         entry.level === LogLevel.WARN ? console.warn :
                         console.log
        
        consoleFn(message, entry.data || '', entry.error || '')
      }
    }
  }
  
  /**
   * DEBUGレベルログ
   */
  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, data)
    this.log(entry)
  }
  
  /**
   * INFOレベルログ
   */
  info(message: string, context?: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, data)
    this.log(entry)
  }
  
  /**
   * WARNレベルログ
   */
  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, data)
    this.log(entry)
  }
  
  /**
   * ERRORレベルログ
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: string,
    data?: Record<string, unknown>
  ): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, data, error)
    this.log(entry)
  }
  
  /**
   * APIリクエストログ
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN :
                  LogLevel.INFO
    
    this.log(this.createLogEntry(
      level,
      `${method} ${path} ${statusCode}`,
      'API',
      {
        method,
        path,
        statusCode,
        duration,
        userId,
      }
    ))
  }
  
  /**
   * データベースクエリログ
   */
  logQuery(query: string, duration: number, error?: Error): void {
    const level = error ? LogLevel.ERROR : LogLevel.DEBUG
    
    this.log(this.createLogEntry(
      level,
      `Database query executed in ${duration}ms`,
      'Database',
      { query, duration },
      error
    ))
  }
  
  /**
   * セキュリティイベントログ
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: Record<string, unknown>
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN
    
    this.log(this.createLogEntry(
      level,
      `Security event: ${event}`,
      'Security',
      {
        event,
        severity,
        ...data,
      }
    ))
  }
  
  /**
   * パフォーマンスログ
   */
  logPerformance(
    operation: string,
    duration: number,
    threshold: number,
    data?: Record<string, unknown>
  ): void {
    const level = duration > threshold ? LogLevel.WARN : LogLevel.DEBUG
    
    this.log(this.createLogEntry(
      level,
      `${operation} took ${duration}ms (threshold: ${threshold}ms)`,
      'Performance',
      {
        operation,
        duration,
        threshold,
        exceededThreshold: duration > threshold,
        ...data,
      }
    ))
  }
}

/**
 * デフォルトロガーインスタンス
 */
export const logger = Logger.getInstance({
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableStructured: true,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
})

/**
 * パフォーマンス測定ヘルパー
 */
export class PerformanceTimer {
  private startTime: number
  private operation: string
  
  constructor(operation: string) {
    this.operation = operation
    this.startTime = Date.now()
  }
  
  /**
   * 経過時間を取得
   */
  elapsed(): number {
    return Date.now() - this.startTime
  }
  
  /**
   * ログを出力して終了
   */
  end(threshold: number = 1000, data?: Record<string, unknown>): void {
    const duration = this.elapsed()
    logger.logPerformance(this.operation, duration, threshold, data)
  }
}
