import type { Context, Next } from 'hono';
import type { Bindings } from '../types';

/**
 * エラートラッキングミドルウェア
 * Sentry統合（環境変数でDSN設定時のみ有効）
 */

interface ErrorEvent {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  timestamp: string;
  userId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  extra?: Record<string, any>;
}

class ErrorTracker {
  private sentryDsn: string | undefined;
  private environment: string;

  constructor(sentryDsn?: string, environment: string = 'production') {
    this.sentryDsn = sentryDsn;
    this.environment = environment;
  }

  async captureException(error: Error, context?: Partial<ErrorEvent>) {
    const errorEvent: ErrorEvent = {
      message: error.message,
      stack: error.stack,
      level: 'error',
      timestamp: new Date().toISOString(),
      ...context,
    };

    // コンソールにログ出力
    console.error('[Error Tracker]', errorEvent);

    // Sentryに送信（DSN設定時のみ）
    if (this.sentryDsn) {
      try {
        await this.sendToSentry(error, errorEvent);
      } catch (sentryError) {
        console.error('Failed to send error to Sentry:', sentryError);
      }
    }

    // ローカルストレージに保存（開発環境）
    if (this.environment === 'development') {
      this.saveToLocalStorage(errorEvent);
    }

    return errorEvent;
  }

  async captureMessage(message: string, level: 'error' | 'warning' | 'info' = 'info', extra?: Record<string, any>) {
    const event: ErrorEvent = {
      message,
      level,
      timestamp: new Date().toISOString(),
      extra,
    };

    console.log(`[Error Tracker] ${level.toUpperCase()}:`, event);

    if (this.sentryDsn) {
      try {
        await this.sendMessageToSentry(event);
      } catch (sentryError) {
        console.error('Failed to send message to Sentry:', sentryError);
      }
    }

    return event;
  }

  private async sendToSentry(error: Error, event: ErrorEvent) {
    // Sentry DSNからプロジェクトID等を解析
    const dsnMatch = this.sentryDsn!.match(/https:\/\/([^@]+)@([^/]+)\/(\d+)/);
    if (!dsnMatch) {
      throw new Error('Invalid Sentry DSN format');
    }

    const [, publicKey, host, projectId] = dsnMatch;
    const endpoint = `https://${host}/api/${projectId}/store/`;

    // Sentryイベントペイロード
    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: event.timestamp,
      platform: 'javascript',
      sdk: {
        name: 'custom-error-tracker',
        version: '1.0.0',
      },
      level: event.level,
      message: {
        message: event.message,
      },
      exception: {
        values: [{
          type: error.name,
          value: error.message,
          stacktrace: this.parseStackTrace(error.stack),
        }],
      },
      user: event.userId ? { id: event.userId } : undefined,
      request: event.url ? {
        url: event.url,
        method: event.method,
        headers: {
          'User-Agent': event.userAgent,
        },
      } : undefined,
      environment: this.environment,
      extra: event.extra,
    };

    // Sentry APIに送信
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=custom-error-tracker/1.0.0`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status}`);
    }
  }

  private async sendMessageToSentry(event: ErrorEvent) {
    const dsnMatch = this.sentryDsn!.match(/https:\/\/([^@]+)@([^/]+)\/(\d+)/);
    if (!dsnMatch) {
      throw new Error('Invalid Sentry DSN format');
    }

    const [, publicKey, host, projectId] = dsnMatch;
    const endpoint = `https://${host}/api/${projectId}/store/`;

    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: event.timestamp,
      platform: 'javascript',
      sdk: {
        name: 'custom-error-tracker',
        version: '1.0.0',
      },
      level: event.level,
      message: {
        message: event.message,
      },
      environment: this.environment,
      extra: event.extra,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=custom-error-tracker/1.0.0`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status}`);
    }
  }

  private parseStackTrace(stack?: string) {
    if (!stack) return undefined;

    const lines = stack.split('\n').slice(1); // 最初の行（エラーメッセージ）をスキップ
    return {
      frames: lines.map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3]),
            colno: parseInt(match[4]),
          };
        }
        return { function: line.trim() };
      }),
    };
  }

  private saveToLocalStorage(event: ErrorEvent) {
    try {
      const key = 'error_logs';
      const existing = localStorage.getItem(key);
      const logs = existing ? JSON.parse(existing) : [];
      logs.push(event);
      
      // 最新100件のみ保持
      if (logs.length > 100) {
        logs.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save error to localStorage:', e);
    }
  }
}

// グローバルエラートラッカーインスタンス
let globalTracker: ErrorTracker | null = null;

export function initializeErrorTracker(sentryDsn?: string, environment?: string) {
  globalTracker = new ErrorTracker(sentryDsn, environment);
  return globalTracker;
}

export function getErrorTracker(): ErrorTracker {
  if (!globalTracker) {
    globalTracker = new ErrorTracker();
  }
  return globalTracker;
}

/**
 * エラートラッキングミドルウェア
 */
export function errorTrackingMiddleware() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    try {
      await next();
    } catch (error: any) {
      // エラー情報を収集
      const tracker = getErrorTracker();
      const payload = c.get('jwtPayload');
      
      await tracker.captureException(error, {
        userId: payload?.sub,
        url: c.req.url,
        method: c.req.method,
        userAgent: c.req.header('User-Agent'),
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      });

      // エラーレスポンスを返す
      return c.json({
        error: 'Internal Server Error',
        message: error.message,
        trackingId: crypto.randomUUID(),
      }, 500);
    }
  };
}
