/**
 * エラーハンドリングユーティリティ
 * 統一されたエラーレスポンスとログ記録を提供
 */

import type { Context } from 'hono';

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff?: boolean;
}

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(
  error: string,
  message?: string,
  details?: any
): ErrorResponse {
  return {
    error,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * エラーログを記録
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: any
): void {
  console.error(`[ERROR] ${context}:`, {
    message: error.message || error,
    stack: error.stack,
    additionalInfo,
    timestamp: new Date().toISOString()
  });
}

/**
 * HTTPエラーレスポンスを返す
 */
export function handleHttpError(
  c: Context,
  error: any,
  context: string,
  statusCode: number = 500
) {
  logError(context, error);
  
  const response = createErrorResponse(
    getErrorMessage(error),
    getErrorDetails(error)
  );
  
  return c.json(response, statusCode);
}

/**
 * エラーメッセージを取得
 */
function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'Internal server error';
}

/**
 * エラー詳細を取得
 */
function getErrorDetails(error: any): string | undefined {
  if (error.code) return `Error code: ${error.code}`;
  if (error.statusCode) return `HTTP ${error.statusCode}`;
  return undefined;
}

/**
 * データベースエラーハンドリング
 */
export function handleDatabaseError(
  c: Context,
  error: any,
  operation: string
) {
  logError(`Database ${operation}`, error);
  
  // D1固有のエラーを判定
  const errorMessage = error.message || '';
  
  if (errorMessage.includes('UNIQUE constraint')) {
    return c.json(
      createErrorResponse(
        'データの重複エラー',
        'すでに同じデータが存在します'
      ),
      409
    );
  }
  
  if (errorMessage.includes('NOT NULL constraint')) {
    return c.json(
      createErrorResponse(
        'データ不足エラー',
        '必須項目が入力されていません'
      ),
      400
    );
  }
  
  if (errorMessage.includes('FOREIGN KEY constraint')) {
    return c.json(
      createErrorResponse(
        '関連データエラー',
        '参照先のデータが存在しません'
      ),
      400
    );
  }
  
  return c.json(
    createErrorResponse(
      'データベースエラー',
      'データベース操作に失敗しました'
    ),
    500
  );
}

/**
 * 外部API呼び出しエラーハンドリング
 */
export function handleAPIError(
  c: Context,
  error: any,
  apiName: string,
  statusCode?: number
) {
  logError(`External API ${apiName}`, error);
  
  if (statusCode === 401) {
    return c.json(
      createErrorResponse(
        'API認証エラー',
        `${apiName}の認証に失敗しました。APIキーを確認してください。`
      ),
      401
    );
  }
  
  if (statusCode === 429) {
    return c.json(
      createErrorResponse(
        'API制限エラー',
        `${apiName}のレート制限に達しました。しばらく待ってから再試行してください。`
      ),
      429
    );
  }
  
  if (statusCode === 404) {
    return c.json(
      createErrorResponse(
        'データが見つかりません',
        `${apiName}から該当するデータが見つかりませんでした。`
      ),
      404
    );
  }
  
  return c.json(
    createErrorResponse(
      'API呼び出しエラー',
      `${apiName}へのリクエストに失敗しました。`,
      statusCode ? { statusCode } : undefined
    ),
    statusCode || 500
  );
}

/**
 * バリデーションエラーハンドリング
 */
export function handleValidationError(
  c: Context,
  errors: any[]
) {
  return c.json(
    createErrorResponse(
      'バリデーションエラー',
      '入力内容に誤りがあります',
      { errors }
    ),
    400
  );
}

/**
 * ファイルアップロードエラーハンドリング
 */
export function handleFileUploadError(
  c: Context,
  error: any,
  reason: 'size' | 'type' | 'quota' | 'general'
) {
  logError('File Upload', error);
  
  const messages = {
    size: 'ファイルサイズが上限（10MB）を超えています',
    type: 'サポートされていないファイル形式です',
    quota: 'ストレージ容量が不足しています',
    general: 'ファイルのアップロードに失敗しました'
  };
  
  const statusCodes = {
    size: 413,
    type: 400,
    quota: 413,
    general: 500
  };
  
  return c.json(
    createErrorResponse(
      'ファイルアップロードエラー',
      messages[reason]
    ),
    statusCodes[reason]
  );
}

/**
 * リトライ可能な処理を実行
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < options.maxRetries) {
        const delay = options.exponentialBackoff
          ? options.retryDelay * Math.pow(2, attempt)
          : options.retryDelay;
        
        console.log(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * sleep関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * タイムアウト付きの処理実行
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}
