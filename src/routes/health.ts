import { Hono } from 'hono';
import { Bindings } from '../types';
import { APP_VERSION } from '../version';

const health = new Hono<{ Bindings: Bindings }>();

/**
 * ヘルスチェックエンドポイント
 * GET /api/health
 * 
 * すべての外部サービスの接続状態を確認
 */
health.get('/', async (c) => {
  const checks: any = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: APP_VERSION,
    services: {}
  };

  // 1. 環境変数チェック
  checks.services.environment_variables = {
    status: 'checking',
    details: {}
  };

  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'MLIT_API_KEY'
  ];

  const missingVars: string[] = [];
  requiredEnvVars.forEach(varName => {
    const exists = !!c.env[varName as keyof Bindings];
    checks.services.environment_variables.details[varName] = exists ? 'set' : 'missing';
    if (!exists) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    checks.services.environment_variables.status = 'error';
    checks.services.environment_variables.missing = missingVars;
    checks.status = 'unhealthy';
  } else {
    checks.services.environment_variables.status = 'healthy';
  }

  // 2. OpenAI API接続チェック
  checks.services.openai_api = {
    status: 'checking'
  };

  try {
    if (!c.env.OPENAI_API_KEY) {
      checks.services.openai_api.status = 'error';
      checks.services.openai_api.error = 'OPENAI_API_KEY not set';
      checks.status = 'unhealthy';
    } else {
      // 簡単なテストリクエスト
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
        }
      });

      if (testResponse.ok) {
        checks.services.openai_api.status = 'healthy';
        checks.services.openai_api.response_time_ms = testResponse.headers.get('x-request-id') ? 'fast' : 'normal';
      } else {
        checks.services.openai_api.status = 'error';
        checks.services.openai_api.http_status = testResponse.status;
        
        if (testResponse.status === 401) {
          checks.services.openai_api.error = 'Invalid API key';
        } else if (testResponse.status === 429) {
          checks.services.openai_api.error = 'Rate limit exceeded';
        } else {
          checks.services.openai_api.error = `HTTP ${testResponse.status}`;
        }
        
        checks.status = 'unhealthy';
      }
    }
  } catch (error) {
    checks.services.openai_api.status = 'error';
    checks.services.openai_api.error = error instanceof Error ? error.message : 'Unknown error';
    checks.status = 'unhealthy';
  }

  // 3. D1 Database接続チェック
  checks.services.d1_database = {
    status: 'checking'
  };

  try {
    if (!c.env.DB) {
      checks.services.d1_database.status = 'warning';
      checks.services.d1_database.message = 'DB binding not configured';
    } else {
      // 簡単なクエリでDB接続を確認
      await c.env.DB.prepare('SELECT 1').first();
      checks.services.d1_database.status = 'healthy';
    }
  } catch (error) {
    checks.services.d1_database.status = 'error';
    checks.services.d1_database.error = error instanceof Error ? error.message : 'Unknown error';
    checks.status = 'degraded';
  }

  // 4. ストレージ容量チェック
  checks.services.storage = {
    status: 'checking'
  };

  try {
    if (c.env.DB) {
      const result = await c.env.DB.prepare(`
        SELECT page_count * page_size as total_bytes 
        FROM pragma_page_count(), pragma_page_size()
      `).first<{ total_bytes: number }>();

      if (result) {
        const totalMB = result.total_bytes / (1024 * 1024);
        const limitMB = 500; // D1の制限（無料プラン）
        const usagePercent = (totalMB / limitMB) * 100;

        checks.services.storage.status = usagePercent > 90 ? 'warning' : 'healthy';
        checks.services.storage.used_mb = totalMB.toFixed(2);
        checks.services.storage.limit_mb = limitMB;
        checks.services.storage.usage_percent = usagePercent.toFixed(1);

        if (usagePercent > 90) {
          checks.services.storage.warning = 'Storage usage above 90%';
        }
      }
    }
  } catch (error) {
    checks.services.storage.status = 'warning';
    checks.services.storage.message = 'Could not check storage';
  }

  // ステータスコードを決定
  let statusCode = 200;
  if (checks.status === 'unhealthy') {
    statusCode = 503; // Service Unavailable
  } else if (checks.status === 'degraded') {
    statusCode = 207; // Multi-Status (一部のサービスに問題)
  }

  return c.json(checks, statusCode);
});

/**
 * 簡易ヘルスチェック（ping）
 * GET /api/health/ping
 */
health.get('/ping', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default health;
