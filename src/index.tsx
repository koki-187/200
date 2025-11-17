import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { Bindings } from './types';

// ルートのインポート
import auth from './routes/auth';
import deals from './routes/deals';
import messages from './routes/messages';
import files from './routes/files';
import proposals from './routes/proposals';
import settings from './routes/settings';
import notifications from './routes/notifications';
import notificationSettings from './routes/notification-settings';
import pushSubscriptions from './routes/push-subscriptions';
import ocr from './routes/ocr';
import email from './routes/email';
import pdf from './routes/pdf';
import r2 from './routes/r2';
import backup from './routes/backup';
import feedback from './routes/feedback';
import analytics from './routes/analytics';

// Middleware
import { rateLimitPresets } from './middleware/rate-limit';
import { apiVersionMiddleware, getApiVersionInfo } from './middleware/api-version';
import { errorTrackingMiddleware, initializeErrorTracker } from './middleware/error-tracking';

const app = new Hono<{ Bindings: Bindings }>();

// セキュリティヘッダー設定（全リクエストに適用）
app.use('*', async (c, next) => {
  await next();
  
  // Content Security Policy
  c.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com; " +
    "font-src 'self' cdn.jsdelivr.net fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self';"
  );
  
  // クリックジャッキング対策
  c.header('X-Frame-Options', 'DENY');
  
  // MIMEタイプスニッフィング対策
  c.header('X-Content-Type-Options', 'nosniff');
  
  // HTTPS強制（本番環境）
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // リファラーポリシー
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // XSS対策
  c.header('X-XSS-Protection', '1; mode=block');
  
  // 権限ポリシー
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // パフォーマンス最適化 - キャッシュ戦略
  const path = c.req.path;
  
  // 静的リソースには長期キャッシュを設定
  if (path.startsWith('/static/') || path.startsWith('/assets/')) {
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // APIレスポンスはキャッシュしない
  else if (path.startsWith('/api/')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  }
  // HTMLページは短期キャッシュ
  else {
    c.header('Cache-Control', 'public, max-age=300, must-revalidate');
  }
});

// CORS設定
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// エラートラッキング（全APIルートに適用）
app.use('/api/*', errorTrackingMiddleware());

// APIバージョン管理
app.use('/api/*', apiVersionMiddleware());

// レート制限適用
app.use('/api/auth/login', rateLimitPresets.auth);
app.use('/api/auth/register', rateLimitPresets.auth);
app.use('/api/r2/upload', rateLimitPresets.upload);
app.use('/api/*', rateLimitPresets.api);

// APIルートのマウント
app.route('/api/auth', auth);
app.route('/api/deals', deals);
app.route('/api/messages', messages);
app.route('/api/files', files);
app.route('/api/proposals', proposals);
app.route('/api/settings', settings);
app.route('/api/notifications', notifications);
app.route('/api/notification-settings', notificationSettings);
app.route('/api/push-subscriptions', pushSubscriptions);
app.route('/api/ocr', ocr);
app.route('/api/email', email);
app.route('/api/pdf', pdf);
app.route('/api/r2', r2);
app.route('/api/backup', backup);
app.route('/api/feedback', feedback);
app.route('/api/analytics', analytics);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// APIバージョン情報
app.get('/api/version', (c) => {
  return c.json(getApiVersionInfo());
});

// OpenAPI仕様書
app.get('/api/openapi.json', async (c) => {
  const { generateOpenApiSpec } = await import('./openapi/spec');
  return c.json(generateOpenApiSpec());
});

// API Documentation UI
app.get('/api/docs', (c) => {
  return c.html(`
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation - 200戸土地仕入れ管理システム</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="/api/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
  `);
});

// ルートページ - ログイン画面
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>200戸土地仕入れ管理システム - ログイン</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="max-w-md w-full mx-4">
    <!-- ログインカード -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <!-- ヘッダー -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mb-4">
          <i class="fas fa-building text-white text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-gray-800 mb-2">200戸土地仕入れ管理</h1>
        <p class="text-gray-500">不動産仲介案件管理システム v2.0</p>
      </div>

      <!-- エラーメッセージ -->
      <div id="error-message" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-600 text-sm flex items-center">
          <i class="fas fa-exclamation-circle mr-2"></i>
          <span id="error-text"></span>
        </p>
      </div>

      <!-- ログインフォーム -->
      <form id="login-form" class="space-y-6">
        <!-- メールアドレス -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-envelope mr-1"></i> メールアドレス
          </label>
          <input 
            type="email" 
            id="email" 
            name="email"
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            placeholder="admin@200units.com"
          >
        </div>

        <!-- パスワード -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-lock mr-1"></i> パスワード
          </label>
          <input 
            type="password" 
            id="password" 
            name="password"
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            placeholder="••••••••••"
          >
        </div>

        <!-- ログインボタン -->
        <button 
          type="submit"
          id="login-button"
          class="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition duration-200 transform hover:scale-105 shadow-lg"
        >
          <i class="fas fa-sign-in-alt mr-2"></i>
          ログイン
        </button>
      </form>

      <!-- システム情報 -->
      <div class="mt-8 pt-6 border-t border-gray-200">
        <div class="text-center space-y-2">
          <a href="/api/docs" class="text-purple-600 hover:text-purple-700 text-sm flex items-center justify-center">
            <i class="fas fa-book mr-2"></i>
            APIドキュメント
          </a>
          <p class="text-xs text-gray-400">
            <i class="fas fa-shield-alt mr-1"></i>
            セキュア接続 | v2.0.0
          </p>
        </div>
      </div>
    </div>

    <!-- フッター -->
    <div class="text-center mt-6 text-white text-sm">
      <p class="opacity-80">© 2025 200戸土地仕入れ管理システム</p>
      <p class="opacity-60 mt-1">Powered by Cloudflare Workers + Hono</p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // エラーメッセージを非表示
      errorMessage.classList.add('hidden');
      
      // ボタンを無効化
      loginButton.disabled = true;
      loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>ログイン中...';

      try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const response = await axios.post('/api/auth/login', {
          email,
          password
        });

        if (response.data.token) {
          // トークンを保存
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // ダッシュボードにリダイレクト（将来実装）
          alert('ログイン成功！\\n\\nユーザー: ' + response.data.user.name + '\\nロール: ' + response.data.user.role);
          
          // API動作確認用に /api/docs にリダイレクト
          window.location.href = '/api/docs';
        }
      } catch (error) {
        console.error('Login error:', error);
        
        // エラーメッセージを表示
        errorMessage.classList.remove('hidden');
        if (error.response && error.response.data && error.response.data.error) {
          errorText.textContent = error.response.data.error;
        } else {
          errorText.textContent = 'ログインに失敗しました。もう一度お試しください。';
        }
        
        // ボタンを再有効化
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>ログイン';
      }
    });

    // デモ用：Enter キーでフォーム送信
    document.getElementById('password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
      }
    });
  </script>
</body>
</html>
  `);
});

// 静的ファイルの配信
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/assets/*', serveStatic({ root: './dist' }));

// Service Worker（ルート直下）- 手動で配信
app.get('/service-worker.js', async (c) => {
  // Service Workerファイルを直接返す
  const serviceWorkerCode = `/**
 * Service Worker for Push Notifications
 */

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// プッシュ通知受信時
self.addEventListener('push', (event) => {
  console.log('Push notification received');

  let data = {
    title: '200戸土地仕入れ管理システム',
    body: '新しい通知があります',
    icon: '/static/icon-192.png',
    badge: '/static/badge-72.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationPromise = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  });

  event.waitUntil(notificationPromise);
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// プッシュサブスクリプション変更時
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch('/api/push-subscriptions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
  );
});`;
  
  return new Response(serviceWorkerCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache',
    },
  });
});

// Cloudflare Workers export with Cron support
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // Cronトリガーで定期実行される処理
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());

    try {
      // メール通知が有効な場合のみ実行
      if (!env.RESEND_API_KEY) {
        console.log('RESEND_API_KEY not configured, skipping email notifications');
        return;
      }

      const { Database } = await import('./db/queries');
      const { createEmailService } = await import('./utils/email');

      const db = new Database(env.DB);
      const emailService = createEmailService(env.RESEND_API_KEY);

      // 24時間以内に期限が来る案件を取得
      const deals = await db.getDealsNearDeadline(24);
      console.log(`Found ${deals.length} deals near deadline`);

      let sentCount = 0;
      for (const deal of deals) {
        try {
          const seller = await db.getUserById(deal.seller_id);
          if (seller?.email) {
            const deadline = new Date(deal.response_deadline);
            const now = new Date();
            const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

            if (hoursRemaining > 0 && hoursRemaining <= 24) {
              const result = await emailService.sendDeadlineNotification(
                seller.email,
                deal.title,
                deal.response_deadline,
                hoursRemaining
              );

              if (result.success) {
                console.log(`Deadline notification sent to ${seller.email} for deal: ${deal.title}`);
                sentCount++;
              } else {
                console.error(`Failed to send notification to ${seller.email}:`, result.error);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing deal ${deal.id}:`, error);
        }
      }

      console.log(`Cron job completed. Sent ${sentCount} notifications.`);
    } catch (error) {
      console.error('Cron job error:', error);
    }
  }
};
