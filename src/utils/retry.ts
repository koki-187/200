/**
 * Retry Utility with Exponential Backoff
 * v3.153.97 - Task A4: リトライ機能実装
 * 
 * Master QA Layer 2: 予期しない人間行動をブロック
 * - API障害時の自動リトライ
 * - 指数バックオフでサーバー負荷を軽減
 * - ユーザーに「リトライ中...」表示
 */

export interface RetryOptions {
  maxRetries?: number;           // 最大リトライ回数（デフォルト: 3）
  initialDelayMs?: number;        // 初回遅延時間（デフォルト: 1000ms = 1秒）
  maxDelayMs?: number;            // 最大遅延時間（デフォルト: 16000ms = 16秒）
  backoffMultiplier?: number;     // バックオフ乗数（デフォルト: 2）
  retryableStatusCodes?: number[]; // リトライ可能なHTTPステータスコード
  onRetry?: (attempt: number, error: Error, delayMs: number) => void; // リトライ時のコールバック
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly lastError: Error,
    public readonly attempts: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * 指数バックオフでリトライを実行
 * 
 * @param fn リトライ対象の非同期関数
 * @param options リトライオプション
 * @returns 成功時の結果
 * @throws RetryError リトライ回数上限到達時
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 16000,
    backoffMultiplier = 2,
    retryableStatusCodes = [408, 429, 500, 502, 503, 504], // Request Timeout, Too Many Requests, Server Errors
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 初回実行またはリトライ
      const result = await fn();
      
      // 成功時はそのまま返す
      if (attempt > 0) {
        console.log(`[Retry] ✅ Success after ${attempt} retry(ies)`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error as Error;
      
      // 最後の試行の場合はエラーをスロー
      if (attempt === maxRetries) {
        console.error(`[Retry] ❌ Failed after ${attempt + 1} attempts:`, lastError);
        throw new RetryError(
          `Failed after ${attempt + 1} attempts`,
          lastError,
          attempt + 1
        );
      }
      
      // HTTPエラーの場合、ステータスコードをチェック
      const isRetryable = await checkIfRetryable(error, retryableStatusCodes);
      
      if (!isRetryable) {
        console.warn(`[Retry] ⚠️ Non-retryable error, aborting:`, lastError);
        throw lastError;
      }
      
      // 遅延時間を計算（指数バックオフ）
      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );
      
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed. ` +
        `Retrying in ${delayMs}ms...`,
        lastError
      );
      
      // コールバック呼び出し
      if (onRetry) {
        onRetry(attempt + 1, lastError, delayMs);
      }
      
      // 指定時間待機
      await sleep(delayMs);
    }
  }
  
  // ここには到達しないはずだが、TypeScript型安全のため
  throw new RetryError(
    `Failed after ${maxRetries + 1} attempts`,
    lastError!,
    maxRetries + 1
  );
}

/**
 * エラーがリトライ可能かチェック
 */
async function checkIfRetryable(
  error: any,
  retryableStatusCodes: number[]
): Promise<boolean> {
  // Axiosエラーの場合
  if (error.response) {
    const status = error.response.status;
    return retryableStatusCodes.includes(status);
  }
  
  // Fetch APIエラーの場合
  if (error instanceof Response) {
    return retryableStatusCodes.includes(error.status);
  }
  
  // ネットワークエラーの場合（Axios）
  if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.message.includes('Network Error')) {
    return true;
  }
  
  // その他のエラーはリトライしない
  return false;
}

/**
 * 指定時間待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * OpenAI API専用のリトライラッパー
 * Rate Limit (429) とServer Error (500, 502, 503, 504) に対応
 */
export async function retryOpenAI<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 2000, // OpenAI APIは少し長めに設定
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry
  });
}

/**
 * MLIT API専用のリトライラッパー
 * タイムアウトとServer Errorに対応
 */
export async function retryMLIT<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 1000,
    retryableStatusCodes: [408, 500, 502, 503, 504],
    onRetry
  });
}

/**
 * Nominatim API専用のリトライラッパー
 * Rate Limit (429) とタイムアウトに対応
 */
export async function retryNominatim<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelayMs: 1500, // Nominatimは利用規約でレート制限に注意
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    onRetry
  });
}
