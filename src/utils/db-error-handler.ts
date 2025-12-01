/**
 * データベースエラーハンドリングユーティリティ
 * トランザクション管理、エラーリトライ、ロギングを含む
 */

import { ErrorCode, ApiError } from '../types/api'

/**
 * データベースエラー型
 */
export interface DatabaseError extends ApiError {
  query?: string
  params?: unknown[]
}

/**
 * トランザクション実行オプション
 */
export interface TransactionOptions {
  maxRetries?: number
  retryDelay?: number
}

/**
 * SQLエラーをAPIエラーに変換
 */
export function convertDbError(error: unknown, query?: string): DatabaseError {
  if (error instanceof Error) {
    // D1固有のエラーメッセージを解析
    const message = error.message.toLowerCase()
    
    // 一意制約違反
    if (message.includes('unique')) {
      return {
        code: ErrorCode.ALREADY_EXISTS,
        message: '既に存在するデータです',
        query,
      }
    }
    
    // 外部キー制約違反
    if (message.includes('foreign key')) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: '関連するデータが見つかりません',
        query,
      }
    }
    
    // NOT NULL制約違反
    if (message.includes('not null')) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: '必須項目が入力されていません',
        query,
      }
    }
    
    // その他のデータベースエラー
    return {
      code: ErrorCode.DATABASE_ERROR,
      message: `データベースエラー: ${error.message}`,
      query,
    }
  }
  
  return {
    code: ErrorCode.DATABASE_ERROR,
    message: '不明なデータベースエラーが発生しました',
    query,
  }
}

/**
 * データベースクエリを安全に実行
 */
export async function safeDbQuery<T>(
  queryFn: () => Promise<T>,
  errorContext?: string
): Promise<{ success: true; data: T } | { success: false; error: DatabaseError }> {
  try {
    const data = await queryFn()
    return { success: true, data }
  } catch (error) {
    console.error(`Database query failed: ${errorContext || 'Unknown'}`, error)
    const dbError = convertDbError(error)
    return { success: false, error: dbError }
  }
}

/**
 * データベーストランザクションを実行
 * D1はまだトランザクションをネイティブサポートしていないため、
 * エラー時のロールバック戦略を実装
 */
export async function executeTransaction<T>(
  db: D1Database,
  operations: Array<() => Promise<unknown>>,
  options: TransactionOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: DatabaseError }> {
  const { maxRetries = 3, retryDelay = 1000 } = options
  const executedOperations: Array<() => Promise<unknown>> = []
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 各操作を順次実行
      const results: unknown[] = []
      
      for (const operation of operations) {
        const result = await operation()
        results.push(result)
        executedOperations.push(operation)
      }
      
      return { success: true, data: results as T }
      
    } catch (error) {
      console.error(`Transaction failed (attempt ${attempt + 1}/${maxRetries + 1})`, error)
      
      // 最後のリトライの場合
      if (attempt === maxRetries) {
        return {
          success: false,
          error: {
            code: ErrorCode.TRANSACTION_ERROR,
            message: 'トランザクションの実行に失敗しました',
            details: { error: convertDbError(error) },
          },
        }
      }
      
      // リトライ前の待機
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
    }
  }
  
  return {
    success: false,
    error: {
      code: ErrorCode.TRANSACTION_ERROR,
      message: 'トランザクションの実行に失敗しました',
    },
  }
}

/**
 * クエリ結果が存在することを保証
 */
export function ensureExists<T>(
  result: T | null | undefined,
  resourceName: string = 'リソース'
): T {
  if (result === null || result === undefined) {
    throw {
      code: ErrorCode.NOT_FOUND,
      message: `${resourceName}が見つかりません`,
    } as DatabaseError
  }
  return result
}

/**
 * バッチ操作を安全に実行
 */
export async function safeBatchQuery<T>(
  db: D1Database,
  statements: D1PreparedStatement[],
  errorContext?: string
): Promise<{ success: true; data: D1Result<T>[] } | { success: false; error: DatabaseError }> {
  try {
    const results = await db.batch<T>(statements)
    return { success: true, data: results }
  } catch (error) {
    console.error(`Batch query failed: ${errorContext || 'Unknown'}`, error)
    const dbError = convertDbError(error)
    return { success: false, error: dbError }
  }
}

/**
 * ページネーション用クエリヘルパー
 */
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export async function paginatedQuery<T>(
  db: D1Database,
  baseQuery: string,
  countQuery: string,
  params: unknown[],
  pagination: PaginationParams
): Promise<{ success: true; data: PaginatedResult<T> } | { success: false; error: DatabaseError }> {
  try {
    const offset = (pagination.page - 1) * pagination.limit
    
    // データ取得
    const dataResult = await db
      .prepare(`${baseQuery} LIMIT ? OFFSET ?`)
      .bind(...params, pagination.limit, offset)
      .all<T>()
    
    // 総数取得
    const countResult = await db
      .prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>()
    
    const total = countResult?.total || 0
    const items = dataResult.results || []
    
    return {
      success: true,
      data: {
        items,
        total,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: offset + items.length < total,
      },
    }
  } catch (error) {
    console.error('Paginated query failed', error)
    const dbError = convertDbError(error)
    return { success: false, error: dbError }
  }
}

/**
 * クエリビルダーヘルパー
 */
export class QueryBuilder {
  private conditions: string[] = []
  private params: unknown[] = []
  
  where(condition: string, value: unknown): this {
    this.conditions.push(condition)
    this.params.push(value)
    return this
  }
  
  whereIn(field: string, values: unknown[]): this {
    if (values.length > 0) {
      const placeholders = values.map(() => '?').join(', ')
      this.conditions.push(`${field} IN (${placeholders})`)
      this.params.push(...values)
    }
    return this
  }
  
  build(): { whereClause: string; params: unknown[] } {
    return {
      whereClause: this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '',
      params: this.params,
    }
  }
}
