/**
 * Logger Utility - v3.149.0
 * 
 * 環境に応じたログ出力を制御
 * 本番環境では重要なエラーのみ出力し、パフォーマンスを最適化
 */

// デバッグモードの判定
const DEBUG_MODE = (globalThis as any).DEBUG_MODE || false;

/**
 * デバッグログ - DEBUG_MODE=true の場合のみ出力
 */
export function debugLog(category: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`[${category}]`, ...args);
  }
}

/**
 * 情報ログ - 常に出力
 */
export function infoLog(category: string, ...args: any[]) {
  console.log(`[${category}]`, ...args);
}

/**
 * 警告ログ - 常に出力
 */
export function warnLog(category: string, ...args: any[]) {
  console.warn(`[${category}]`, ...args);
}

/**
 * エラーログ - 常に出力
 */
export function errorLog(category: string, ...args: any[]) {
  console.error(`[${category}]`, ...args);
}

/**
 * API リクエストログ - DEBUG_MODE=true の場合のみ出力
 */
export function apiLog(method: string, path: string, details?: any) {
  if (DEBUG_MODE) {
    console.log(`[API] ${method} ${path}`, details || '');
  }
}

/**
 * 認証ログ - DEBUG_MODE=true の場合のみ出力
 */
export function authLog(...args: any[]) {
  if (DEBUG_MODE) {
    console.log('[Auth]', ...args);
  }
}

/**
 * Logger object (for backward compatibility)
 */
export const logger = {
  info: (message: string, data?: any, context?: string) => {
    console.log(`[${context || 'INFO'}]`, message, data || '');
  },
  warn: (message: string, data?: any, context?: string) => {
    console.warn(`[${context || 'WARN'}]`, message, data || '');
  },
  error: (message: string, data?: any, context?: string) => {
    console.error(`[${context || 'ERROR'}]`, message, data || '');
  },
  debug: (message: string, data?: any, context?: string) => {
    if (DEBUG_MODE) {
      console.log(`[${context || 'DEBUG'}]`, message, data || '');
    }
  },
  logRequest: (method: string, path: string, status: number, duration: number) => {
    if (DEBUG_MODE) {
      console.log(`[Request] ${method} ${path} - ${status} (${duration}ms)`);
    }
  }
};

/**
 * Performance Timer (for backward compatibility)
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  elapsed() {
    return Date.now() - this.startTime;
  }

  end() {
    const duration = this.elapsed();
    if (DEBUG_MODE) {
      console.log(`[Performance] ${this.label}: ${duration}ms`);
    }
    return duration;
  }
}
