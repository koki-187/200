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
  <title>API Documentation - 200棟土地仕入れ管理システム</title>
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

// ダッシュボードページ
app.get('/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ダッシュボード - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .header-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }
  </style>
</head>
<body>
  <!-- ヘッダー -->
  <header class="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center space-x-3">
          <div class="header-logo">
            <img src="/logo-3d.png" alt="Logo" class="w-6 h-6" />
          </div>
          <h1 class="text-xl font-bold text-white tracking-tight">200棟土地仕入れ管理</h1>
        </div>
        <div class="flex items-center space-x-6">
          <a href="/gallery" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-images mr-2"></i>ギャラリー
          </a>
          <a href="/deals" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-folder mr-2"></i>案件一覧
          </a>
          <span id="user-name" class="text-gray-200"></span>
          <span id="user-role" class="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-medium"></span>
          <button onclick="logout()" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-sign-out-alt mr-1"></i>ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- メインコンテンツ -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- KPIカード -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <!-- 総案件数 -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition p-6 border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">総案件数</p>
            <p id="total-deals" class="text-3xl font-bold text-gray-900">-</p>
          </div>
          <div class="bg-blue-100 rounded-full p-3">
            <i class="fas fa-folder text-blue-600 text-2xl"></i>
          </div>
        </div>
      </div>

      <!-- 進行中 -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition p-6 border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">進行中</p>
            <p id="in-progress-deals" class="text-3xl font-bold text-yellow-600">-</p>
          </div>
          <div class="bg-yellow-100 rounded-full p-3">
            <i class="fas fa-clock text-yellow-600 text-2xl"></i>
          </div>
        </div>
      </div>

      <!-- 回答済み -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition p-6 border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">回答済み</p>
            <p id="replied-deals" class="text-3xl font-bold text-green-600">-</p>
          </div>
          <div class="bg-green-100 rounded-full p-3">
            <i class="fas fa-check-circle text-green-600 text-2xl"></i>
          </div>
        </div>
      </div>

      <!-- 完了 -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition p-6 border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">完了</p>
            <p id="closed-deals" class="text-3xl font-bold text-gray-600">-</p>
          </div>
          <div class="bg-gray-100 rounded-full p-3">
            <i class="fas fa-archive text-gray-600 text-2xl"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- ナビゲーションタブ -->
    <div class="bg-white rounded-xl shadow-lg mb-6 border border-slate-200">
      <div class="border-b border-slate-200">
        <nav class="flex space-x-8 px-6" aria-label="Tabs">
          <a href="/deals" class="border-b-2 border-blue-600 py-4 px-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
            <i class="fas fa-list mr-2"></i>案件一覧
          </a>
        </nav>
      </div>
    </div>

    <!-- 最近の案件 -->
    <div class="bg-white rounded-xl shadow-lg border border-slate-200">
      <div class="px-6 py-4 border-b">
        <h2 class="text-lg font-semibold text-gray-900">最近の案件</h2>
      </div>
      <div class="p-6">
        <div id="recent-deals" class="space-y-4">
          <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
            <p>読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    // 認証チェック
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
      window.location.href = '/';
    }

    // 売側ユーザー（AGENTでseller_id）は案件一覧ページへリダイレクト
    // 買側・管理者はダッシュボードを表示
    // 注: 買側と管理者は同じユーザーなので、ダッシュボードを共有
    if (user.role === 'AGENT') {
      // AGENTロールでも、buyer_id を持っていればダッシュボード表示
      // それ以外（seller_id のみ）は案件一覧へ
      // 実際には買側・管理者が同じユーザーなので、AGENTでも統合ビュー表示
      // ここでは全ユーザーがダッシュボードを見れるようにする
    }

    // ユーザー情報表示
    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
      document.getElementById('user-role').textContent = user.role === 'ADMIN' ? '管理者' : 'ユーザー';
    }

    // ログアウト
    function logout() {
      // 認証トークンとユーザー情報のみ削除（Remember Me情報は保持）
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // KPIデータ取得
    async function loadKPIs() {
      try {
        const response = await axios.get('/api/deals', {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const deals = response.data.deals || [];
        const statusCounts = {
          total: deals.length,
          NEW: 0,
          IN_REVIEW: 0,
          REPLIED: 0,
          CLOSED: 0
        };

        deals.forEach(deal => {
          if (statusCounts[deal.status] !== undefined) {
            statusCounts[deal.status]++;
          }
        });

        document.getElementById('total-deals').textContent = statusCounts.total;
        document.getElementById('in-progress-deals').textContent = statusCounts.NEW + statusCounts.IN_REVIEW;
        document.getElementById('replied-deals').textContent = statusCounts.REPLIED;
        document.getElementById('closed-deals').textContent = statusCounts.CLOSED;

        // 最近の案件を表示
        displayRecentDeals(deals.slice(0, 5));
      } catch (error) {
        console.error('Failed to load KPIs:', error);
        if (error.response && error.response.status === 401) {
          logout();
        }
      }
    }

    // 最近の案件を表示
    function displayRecentDeals(deals) {
      const container = document.getElementById('recent-deals');
      
      if (deals.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500"><p>案件がありません</p></div>';
        return;
      }

      const statusColors = {
        'NEW': 'bg-blue-100 text-blue-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'REPLIED': 'bg-green-100 text-green-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      };

      const statusLabels = {
        'NEW': '新規',
        'IN_REVIEW': 'レビュー中',
        'REPLIED': '回答済み',
        'CLOSED': '終了'
      };

      container.innerHTML = deals.map(deal => \`
        <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onclick="viewDeal('\${deal.id}')">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-semibold text-gray-900">\${deal.title}</h3>
            <span class="px-2 py-1 rounded text-xs font-medium \${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}">
              \${statusLabels[deal.status] || deal.status}
            </span>
          </div>
          <div class="text-sm text-gray-600 space-y-1">
            <p><i class="fas fa-map-marker-alt mr-2"></i>\${deal.location || '-'}</p>
            <p><i class="fas fa-calendar mr-2"></i>作成: \${new Date(deal.created_at).toLocaleDateString('ja-JP')}</p>
          </div>
        </div>
      \`).join('');
    }

    // 案件詳細へ遷移
    function viewDeal(dealId) {
      window.location.href = '/deals/' + dealId;
    }

    // ページ読み込み時
    loadKPIs();
  </script>
</body>
</html>
  `);
});

// ギャラリーページ
app.get('/gallery', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>事業ギャラリー - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .header-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }
    .gallery-card {
      transition: all 0.3s ease;
      overflow: hidden;
    }
    .gallery-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }
    .gallery-image {
      transition: transform 0.5s ease;
    }
    .gallery-card:hover .gallery-image {
      transform: scale(1.1);
    }
    .map-container {
      position: relative;
      overflow: hidden;
      border-radius: 1rem;
    }
  </style>
</head>
<body>
  <!-- ヘッダー -->
  <header class="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center space-x-3">
          <a href="/dashboard" class="flex items-center space-x-3 hover:opacity-80 transition">
            <div class="header-logo">
              <img src="/logo-3d.png" alt="Logo" class="w-6 h-6" />
            </div>
            <h1 class="text-xl font-bold text-white tracking-tight">200棟土地仕入れ管理</h1>
          </a>
        </div>
        <div class="flex items-center space-x-6">
          <a href="/dashboard" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-home mr-2"></i>ダッシュボード
          </a>
          <a href="/deals" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-folder mr-2"></i>案件一覧
          </a>
          <span id="user-name" class="text-gray-200"></span>
          <button onclick="logout()" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-sign-out-alt mr-1"></i>ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- メインコンテンツ -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- ページタイトル -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-gray-900 mb-2">事業ギャラリー</h2>
      <p class="text-gray-600">当社の販売エリアと実績物件をご紹介します</p>
    </div>

    <!-- 事業概要 -->
    <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
      <div class="flex items-start space-x-4 mb-6">
        <div class="bg-blue-600 text-white p-3 rounded-lg">
          <i class="fas fa-building text-2xl"></i>
        </div>
        <div class="flex-1">
          <h3 class="text-2xl font-bold text-gray-900 mb-3">関東エリア進出プロジェクト</h3>
          <p class="text-gray-700 leading-relaxed mb-4">
            当社は愛知県全域、長野県松本市、埼玉県東部・中央部・西部の一部を中心に、
            <span class="font-semibold text-blue-600">200戸規模のマンション用地仕入れ事業</span>を展開しております。
          </p>
          <p class="text-gray-700 leading-relaxed mb-4">
            このたび、<span class="font-semibold text-blue-600">関東エリアへの本格進出</span>を決定し、
            埼玉県を中心とした首都圏での用地仕入れを強化してまいります。
          </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div class="text-blue-600 font-semibold mb-1">対象エリア</div>
              <div class="text-gray-900">愛知県全域・長野県・埼玉県</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div class="text-blue-600 font-semibold mb-1">事業規模</div>
              <div class="text-gray-900">200戸規模マンション用地</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div class="text-blue-600 font-semibold mb-1">土地条件</div>
              <div class="text-gray-900">40坪〜70坪程度</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 販売エリアマップ -->
    <div class="mb-8">
      <h3 class="text-2xl font-bold text-gray-900 mb-4">
        <i class="fas fa-map-marked-alt text-blue-600 mr-2"></i>販売エリア
      </h3>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 愛知県マップ -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
          <div class="map-container">
            <img src="/gallery/aichi-map.jpg" alt="愛知県販売エリア" class="w-full h-auto gallery-image">
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold text-gray-900 mb-2">愛知県全域</h4>
            <p class="text-gray-600">県内全域をカバー。名古屋市を中心に豊富な実績があります。</p>
          </div>
        </div>

        <!-- 長野・埼玉マップ -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
          <div class="map-container">
            <img src="/gallery/nagano-saitama-map.jpg" alt="長野県・埼玉県販売エリア" class="w-full h-auto gallery-image">
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold text-gray-900 mb-2">長野県・埼玉県</h4>
            <p class="text-gray-600">長野県松本市、埼玉県東部・中央部・西部の一部に展開中。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 実績物件 -->
    <div class="mb-8">
      <h3 class="text-2xl font-bold text-gray-900 mb-4">
        <i class="fas fa-image text-blue-600 mr-2"></i>実績物件
      </h3>
      
      <!-- 外観 -->
      <div class="mb-8">
        <h4 class="text-xl font-semibold text-gray-800 mb-4">外観デザイン</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
            <div class="map-container">
              <img src="/gallery/building-1.jpg" alt="物件外観1" class="w-full h-auto gallery-image">
            </div>
            <div class="p-6">
              <h5 class="text-lg font-bold text-gray-900 mb-2">モダン外観タイプA</h5>
              <p class="text-gray-600">シンプルで洗練されたグレータイル仕上げ。高級感のあるデザイン。</p>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
            <div class="map-container">
              <img src="/gallery/buildings-collection.jpg" alt="物件外観コレクション" class="w-full h-auto gallery-image">
            </div>
            <div class="p-6">
              <h5 class="text-lg font-bold text-gray-900 mb-2">外観バリエーション</h5>
              <p class="text-gray-600">グレー系、ホワイト系、ブラック系の3タイプをご用意しております。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 内装 -->
      <div class="mb-8">
        <h4 class="text-xl font-semibold text-gray-800 mb-4">内装デザイン</h4>
        <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
          <div class="map-container">
            <img src="/gallery/interior-collection.jpg" alt="内装コレクション" class="w-full h-auto gallery-image">
          </div>
          <div class="p-6">
            <h5 class="text-lg font-bold text-gray-900 mb-4">標準仕様</h5>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div class="text-sm">
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span class="text-gray-700">システムキッチン</span>
              </div>
              <div class="text-sm">
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span class="text-gray-700">独立洗面台</span>
              </div>
              <div class="text-sm">
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span class="text-gray-700">浴室乾燥機付</span>
              </div>
              <div class="text-sm">
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span class="text-gray-700">TVモニターインターホン</span>
              </div>
              <div class="text-sm">
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span class="text-gray-700">宅配ボックス</span>
              </div>
              <div class="text-sm">
                <i class="fas fa-check text-green-600 mr-2"></i>
                <span class="text-gray-700">オートロック</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 9戸プラン -->
      <div class="mb-8">
        <h4 class="text-xl font-semibold text-gray-800 mb-4">9戸プラン 過去事例</h4>
        
        <!-- 外観 -->
        <div class="mb-6">
          <h5 class="text-lg font-medium text-gray-700 mb-3">外観</h5>
          <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
            <div class="map-container">
              <img src="/gallery/9units-exterior.jpg" alt="9戸プラン外観" class="w-full h-auto gallery-image">
            </div>
            <div class="p-6">
              <p class="text-gray-600">昼夜の表情が異なる洗練されたデザイン。白系とダーク系のツートンカラーで高級感を演出。</p>
            </div>
          </div>
        </div>

        <!-- 内観 -->
        <div class="mb-6">
          <h5 class="text-lg font-medium text-gray-700 mb-3">内観</h5>
          <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
            <div class="map-container">
              <img src="/gallery/9units-interior-living.jpg" alt="9戸プラン内観リビング" class="w-full h-auto gallery-image">
            </div>
            <div class="p-6">
              <p class="text-gray-600">明るく開放的なリビング空間。北欧スタイルの家具との相性も抜群です。</p>
            </div>
          </div>
        </div>

        <!-- 内観・設備 -->
        <div class="mb-6">
          <h5 class="text-lg font-medium text-gray-700 mb-3">内観・設備</h5>
          <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
            <div class="map-container">
              <img src="/gallery/9units-interior-facilities.jpg" alt="9戸プラン内観設備" class="w-full h-auto gallery-image">
            </div>
            <div class="p-6">
              <p class="text-gray-600">浴室乾燥機、独立洗面台、ウォシュレット、TVモニターインターホン、エアコン完備。</p>
            </div>
          </div>
        </div>

        <!-- 間取り図 -->
        <div class="mb-6">
          <h5 class="text-lg font-medium text-gray-700 mb-3">間取り図</h5>
          <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
            <div class="map-container">
              <img src="/gallery/9units-floorplan.jpg" alt="9戸プラン間取り図" class="w-full h-auto gallery-image">
            </div>
            <div class="p-6">
              <h6 class="font-semibold text-gray-900 mb-3">建物概要</h6>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span class="text-gray-600">構造:</span>
                  <span class="text-gray-900 ml-2">木造3階建</span>
                </div>
                <div>
                  <span class="text-gray-600">総戸数:</span>
                  <span class="text-gray-900 ml-2">9戸</span>
                </div>
                <div>
                  <span class="text-gray-600">専有面積:</span>
                  <span class="text-gray-900 ml-2">約30〜35㎡</span>
                </div>
                <div>
                  <span class="text-gray-600">間取り:</span>
                  <span class="text-gray-900 ml-2">1LDK</span>
                </div>
                <div>
                  <span class="text-gray-600">駐輪場:</span>
                  <span class="text-gray-900 ml-2">9台</span>
                </div>
                <div>
                  <span class="text-gray-600">宅配BOX:</span>
                  <span class="text-gray-900 ml-2">完備</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品化条件 -->
    <div class="bg-white rounded-xl shadow-lg p-8">
      <h3 class="text-2xl font-bold text-gray-900 mb-6">
        <i class="fas fa-clipboard-check text-blue-600 mr-2"></i>商品化条件
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- OK条件 -->
        <div>
          <h4 class="text-lg font-semibold text-green-700 mb-4 flex items-center">
            <i class="fas fa-check-circle mr-2"></i>商品化OK条件
          </h4>
          <div class="space-y-3">
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-green-600 mt-1 mr-3"></i>
              <div>
                <span class="font-medium text-gray-900">大きさ:</span>
                <span class="text-gray-700 ml-2">40坪から70坪程度</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-green-600 mt-1 mr-3"></i>
              <div>
                <span class="font-medium text-gray-900">間口:</span>
                <span class="text-gray-700 ml-2">7.5m以上</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-green-600 mt-1 mr-3"></i>
              <div>
                <span class="font-medium text-gray-900">公道:</span>
                <span class="text-gray-700 ml-2">2m以上</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-green-600 mt-1 mr-3"></i>
              <div>
                <span class="font-medium text-gray-900">駅から:</span>
                <span class="text-gray-700 ml-2">徒歩15分以内</span>
              </div>
            </div>
          </div>
        </div>

        <!-- NG条件 -->
        <div>
          <h4 class="text-lg font-semibold text-red-700 mb-4 flex items-center">
            <i class="fas fa-times-circle mr-2"></i>商品化NG条件
          </h4>
          <div class="space-y-3">
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-red-600 mt-1 mr-3"></i>
              <div>
                <span class="text-gray-700">崖火地域</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-red-600 mt-1 mr-3"></i>
              <div>
                <span class="text-gray-700">10m以上の浸水</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-red-600 mt-1 mr-3"></i>
              <div>
                <span class="text-gray-700">ハザードマップ</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-red-600 mt-1 mr-3"></i>
              <div>
                <span class="text-gray-700">河川隣接</span>
              </div>
            </div>
            <div class="flex items-start">
              <i class="fas fa-chevron-right text-red-600 mt-1 mr-3"></i>
              <div>
                <span class="text-gray-700">家屋倒壊エリア</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
      window.location.href = '/';
    }

    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
    }

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  </script>
</body>
</html>
  `);
});

// 案件一覧ページ
app.get('/deals', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>案件一覧 - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .header-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }
  </style>
</head>
<body>
  <!-- ヘッダー -->
  <header class="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <a href="/dashboard" class="flex items-center space-x-3 hover:opacity-80 transition">
          <div class="header-logo">
            <img src="/logo-3d.png" alt="Logo" class="w-6 h-6" />
          </div>
          <h1 class="text-xl font-bold text-white tracking-tight">200棟土地仕入れ管理</h1>
        </a>
        <div class="flex items-center space-x-4">
          <span id="user-name" class="text-gray-200"></span>
          <button onclick="logout()" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-sign-out-alt mr-1"></i>ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- メインコンテンツ -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- ページヘッダー -->
    <div class="mb-6 flex justify-between items-end">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">案件一覧</h2>
        <p class="text-gray-600 mt-1">全ての土地仕入れ案件を管理します</p>
      </div>
      <a href="/deals/new" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition shadow-lg">
        <i class="fas fa-plus mr-2"></i>新規案件作成
      </a>
    </div>

    <!-- フィルター・検索 -->
    <div class="bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-200">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select id="filter-status" onchange="filterDeals()" class="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
            <option value="">全て</option>
            <option value="NEW">新規</option>
            <option value="IN_REVIEW">レビュー中</option>
            <option value="REPLIED">回答済み</option>
            <option value="CLOSED">終了</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">検索</label>
          <input type="text" id="search-query" onkeyup="filterDeals()" placeholder="案件名、所在地..." class="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">並び順</label>
          <select id="sort-by" onchange="sortDeals()" class="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
            <option value="created_at_desc">作成日（新しい順）</option>
            <option value="created_at_asc">作成日（古い順）</option>
            <option value="updated_at_desc">更新日（新しい順）</option>
          </select>
        </div>
        <div class="flex items-end">
          <button onclick="resetFilters()" class="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg transition">
            <i class="fas fa-redo mr-2"></i>リセット
          </button>
        </div>
      </div>
    </div>

    <!-- 案件リスト -->
    <div class="bg-white rounded-xl shadow-lg border border-slate-200">
      <div id="deals-container" class="divide-y">
        <div class="p-8 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
          <p>読み込み中...</p>
        </div>
      </div>
    </div>

    <!-- ページネーション -->
    <div id="pagination" class="mt-6 flex justify-center"></div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
      window.location.href = '/';
    }

    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
    }

    let allDeals = [];
    let filteredDeals = [];

    function logout() {
      // 認証トークンとユーザー情報のみ削除（Remember Me情報は保持）
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    async function loadDeals() {
      try {
        const response = await axios.get('/api/deals', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        allDeals = response.data.deals || [];
        filteredDeals = [...allDeals];
        displayDeals();
      } catch (error) {
        console.error('Failed to load deals:', error);
        if (error.response && error.response.status === 401) {
          logout();
        }
        document.getElementById('deals-container').innerHTML = 
          '<div class="p-8 text-center text-red-600"><p>案件の読み込みに失敗しました</p></div>';
      }
    }

    function filterDeals() {
      const status = document.getElementById('filter-status').value;
      const query = document.getElementById('search-query').value.toLowerCase();

      filteredDeals = allDeals.filter(deal => {
        const matchStatus = !status || deal.status === status;
        const matchQuery = !query || 
          deal.title.toLowerCase().includes(query) || 
          (deal.location && deal.location.toLowerCase().includes(query));
        return matchStatus && matchQuery;
      });

      sortDeals();
    }

    function sortDeals() {
      const sortBy = document.getElementById('sort-by').value;

      filteredDeals.sort((a, b) => {
        if (sortBy === 'created_at_desc') {
          return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'created_at_asc') {
          return new Date(a.created_at) - new Date(b.created_at);
        } else if (sortBy === 'updated_at_desc') {
          return new Date(b.updated_at) - new Date(a.updated_at);
        }
        return 0;
      });

      displayDeals();
    }

    function resetFilters() {
      document.getElementById('filter-status').value = '';
      document.getElementById('search-query').value = '';
      document.getElementById('sort-by').value = 'created_at_desc';
      filteredDeals = [...allDeals];
      sortDeals();
    }

    function displayDeals() {
      const container = document.getElementById('deals-container');

      if (filteredDeals.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500"><p>案件がありません</p></div>';
        return;
      }

      const statusColors = {
        'NEW': 'bg-blue-100 text-blue-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'REPLIED': 'bg-green-100 text-green-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      };

      const statusLabels = {
        'NEW': '新規',
        'IN_REVIEW': 'レビュー中',
        'REPLIED': '回答済み',
        'CLOSED': '終了'
      };

      container.innerHTML = filteredDeals.map(deal => \`
        <div class="p-6 hover:bg-gray-50 cursor-pointer" onclick="viewDeal('\${deal.id}')">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <h3 class="text-lg font-semibold text-gray-900 mr-3">\${deal.title}</h3>
                <span class="px-2 py-1 rounded text-xs font-medium \${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}">
                  \${statusLabels[deal.status] || deal.status}
                </span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                  <span>\${deal.location || '-'}</span>
                </div>
                <div>
                  <i class="fas fa-ruler-combined mr-2 text-gray-400"></i>
                  <span>土地面積: \${deal.land_area || '-'}</span>
                </div>
                <div>
                  <i class="fas fa-yen-sign mr-2 text-gray-400"></i>
                  <span>希望価格: \${deal.desired_price || '-'}</span>
                </div>
              </div>
              <div class="mt-2 text-xs text-gray-500">
                <span>作成: \${new Date(deal.created_at).toLocaleDateString('ja-JP')}</span>
                <span class="mx-2">•</span>
                <span>更新: \${new Date(deal.updated_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            <div class="ml-4">
              <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function viewDeal(dealId) {
      window.location.href = '/deals/' + dealId;
    }

    loadDeals();
  </script>
</body>
</html>
  `);
});

// 案件作成ページ
app.get('/deals/new', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>案件作成 - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .header-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }
    .ocr-drop-zone {
      border: 2px dashed #cbd5e1;
      transition: all 0.3s ease;
    }
    .ocr-drop-zone.dragover {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }
    .ocr-preview {
      max-width: 400px;
      max-height: 400px;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <!-- ヘッダー -->
  <header class="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center">
          <a href="/deals" class="text-gray-300 hover:text-white mr-4 transition">
            <i class="fas fa-arrow-left text-lg"></i>
          </a>
          <a href="/dashboard" class="flex items-center space-x-3 hover:opacity-80 transition">
            <div class="header-logo">
              <img src="/logo-3d.png" alt="Logo" class="w-6 h-6" />
            </div>
            <h1 class="text-xl font-bold text-white tracking-tight">200棟土地仕入れ管理</h1>
          </a>
        </div>
        <div class="flex items-center space-x-4">
          <span id="user-name" class="text-gray-200"></span>
          <button onclick="logout()" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-sign-out-alt mr-1"></i>ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- メインコンテンツ -->
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">新規案件作成</h2>
      <p class="text-gray-600 mt-2">登記簿謄本などの画像からOCRで自動入力できます</p>
    </div>

    <!-- OCRセクション -->
    <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <i class="fas fa-camera text-blue-600 mr-2"></i>
        OCR自動入力（オプション）
      </h3>
      
      <!-- ドロップゾーン -->
      <div id="ocr-drop-zone" class="ocr-drop-zone rounded-lg p-8 text-center mb-4">
        <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-3"></i>
        <p class="text-gray-600 mb-2">登記簿謄本や物件資料の画像をドラッグ＆ドロップ</p>
        <p class="text-sm text-gray-500 mb-4">または</p>
        <label for="ocr-file-input" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block transition">
          <i class="fas fa-folder-open mr-2"></i>ファイルを選択
        </label>
        <input type="file" id="ocr-file-input" accept="image/*" class="hidden">
      </div>

      <!-- プレビューとステータス -->
      <div id="ocr-preview-container" class="hidden">
        <div class="flex items-start space-x-4">
          <img id="ocr-preview-image" class="ocr-preview rounded-lg shadow" />
          <div class="flex-1">
            <div id="ocr-status" class="mb-4">
              <div class="flex items-center text-blue-600">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                <span>OCR処理中...</span>
              </div>
            </div>
            <div id="ocr-result" class="hidden">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center text-green-700 mb-2">
                  <i class="fas fa-check-circle mr-2"></i>
                  <span class="font-semibold">OCR完了</span>
                </div>
                <p class="text-sm text-gray-600">フォームに情報を自動入力しました。内容を確認してください。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 案件フォーム -->
    <form id="deal-form" class="bg-white rounded-xl shadow-lg p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 物件タイトル -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            物件タイトル <span class="text-red-500">*</span>
          </label>
          <input type="text" id="title" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>

        <!-- 所在地 -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            所在地 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="location" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 川崎市幸区塚越四丁目">
        </div>

        <!-- 最寄り駅 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">最寄り駅</label>
          <input type="text" id="station"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 矢向">
        </div>

        <!-- 徒歩分数 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">徒歩分数</label>
          <input type="number" id="walk_minutes" min="0"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 4">
        </div>

        <!-- 土地面積 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">土地面積</label>
          <input type="text" id="land_area"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 218.14㎡（実測）">
        </div>

        <!-- 用途地域 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">用途地域</label>
          <input type="text" id="zoning"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 第一種住居地域">
        </div>

        <!-- 建ぺい率 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">建ぺい率</label>
          <input type="text" id="building_coverage"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 60%">
        </div>

        <!-- 容積率 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">容積率</label>
          <input type="text" id="floor_area_ratio"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 200%">
        </div>

        <!-- 高度地区 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">高度地区</label>
          <input type="text" id="height_district"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>

        <!-- 防火地域 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">防火地域</label>
          <input type="text" id="fire_zone"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>

        <!-- 道路情報 -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">道路情報</label>
          <input type="text" id="road_info"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 北側私道 幅員2.0m 接道2.0m">
        </div>

        <!-- 現況 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">現況</label>
          <input type="text" id="current_status"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 古家あり">
        </div>

        <!-- 希望価格 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">希望価格</label>
          <input type="text" id="desired_price"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 8,000万円">
        </div>

        <!-- 売主選択 -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            売主 <span class="text-red-500">*</span>
          </label>
          <select id="seller_id" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">選択してください</option>
          </select>
        </div>

        <!-- 備考 -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">備考</label>
          <textarea id="remarks" rows="4"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
        </div>
      </div>

      <!-- ボタン -->
      <div class="flex justify-end space-x-4 mt-6">
        <a href="/deals" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          キャンセル
        </a>
        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
          <i class="fas fa-save mr-2"></i>案件を作成
        </button>
      </div>
    </form>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
      window.location.href = '/';
    }

    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
    }

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // 売主リスト取得
    async function loadSellers() {
      try {
        const response = await axios.get('/api/auth/users', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const sellers = response.data.users.filter(u => u.role === 'AGENT');
        const select = document.getElementById('seller_id');
        sellers.forEach(seller => {
          const option = document.createElement('option');
          option.value = seller.id;
          option.textContent = seller.name + (seller.company_name ? ' (' + seller.company_name + ')' : '');
          select.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load sellers:', error);
      }
    }

    // OCR機能
    const dropZone = document.getElementById('ocr-drop-zone');
    const fileInput = document.getElementById('ocr-file-input');
    const previewContainer = document.getElementById('ocr-preview-container');
    const previewImage = document.getElementById('ocr-preview-image');
    const ocrStatus = document.getElementById('ocr-status');
    const ocrResult = document.getElementById('ocr-result');

    // ドラッグ&ドロップ
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        processOCR(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        processOCR(file);
      }
    });

    async function processOCR(file) {
      // プレビュー表示
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
      };
      reader.readAsDataURL(file);

      previewContainer.classList.remove('hidden');
      ocrStatus.innerHTML = '<div class="flex items-center text-blue-600"><i class="fas fa-spinner fa-spin mr-2"></i><span>OCR処理中...</span></div>';
      ocrResult.classList.add('hidden');

      // OCR実行
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/api/ocr/extract', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });

        const data = response.data;

        // フォームに自動入力
        if (data.property_name) document.getElementById('title').value = data.property_name;
        if (data.location) document.getElementById('location').value = data.location;
        if (data.land_area) document.getElementById('land_area').value = data.land_area;
        if (data.zoning) document.getElementById('zoning').value = data.zoning;
        if (data.building_coverage) document.getElementById('building_coverage').value = data.building_coverage;
        if (data.floor_area_ratio) document.getElementById('floor_area_ratio').value = data.floor_area_ratio;
        if (data.road_info) document.getElementById('road_info').value = data.road_info;
        if (data.price) document.getElementById('desired_price').value = data.price;

        // 成功表示
        ocrStatus.classList.add('hidden');
        ocrResult.classList.remove('hidden');
      } catch (error) {
        console.error('OCR error:', error);
        ocrStatus.innerHTML = '<div class="flex items-center text-red-600"><i class="fas fa-exclamation-circle mr-2"></i><span>OCR処理に失敗しました</span></div>';
      }
    }

    // フォーム送信
    document.getElementById('deal-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const dealData = {
        title: document.getElementById('title').value,
        location: document.getElementById('location').value,
        station: document.getElementById('station').value || null,
        walk_minutes: parseInt(document.getElementById('walk_minutes').value) || null,
        land_area: document.getElementById('land_area').value || null,
        zoning: document.getElementById('zoning').value || null,
        building_coverage: document.getElementById('building_coverage').value || null,
        floor_area_ratio: document.getElementById('floor_area_ratio').value || null,
        height_district: document.getElementById('height_district').value || null,
        fire_zone: document.getElementById('fire_zone').value || null,
        road_info: document.getElementById('road_info').value || null,
        current_status: document.getElementById('current_status').value || null,
        desired_price: document.getElementById('desired_price').value || null,
        seller_id: document.getElementById('seller_id').value,
        remarks: document.getElementById('remarks').value || null
      };

      try {
        const response = await axios.post('/api/deals', dealData, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        alert('案件を作成しました');
        window.location.href = '/deals/' + response.data.deal.id;
      } catch (error) {
        console.error('Create deal error:', error);
        alert('案件作成に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    });

    // 初期化
    loadSellers();
  </script>
</body>
</html>
  `);
});

// 案件詳細ページ
app.get('/deals/:id', (c) => {
  const dealId = c.req.param('id');
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>案件詳細 - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .header-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }
  </style>
</head>
<body>
  <!-- ヘッダー -->
  <header class="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border-b border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center">
          <a href="/deals" class="text-gray-300 hover:text-white mr-4 transition">
            <i class="fas fa-arrow-left text-lg"></i>
          </a>
          <a href="/dashboard" class="flex items-center space-x-3 hover:opacity-80 transition">
            <div class="header-logo">
              <img src="/logo-3d.png" alt="Logo" class="w-6 h-6" />
            </div>
            <h1 class="text-xl font-bold text-white tracking-tight">200棟土地仕入れ管理</h1>
          </a>
        </div>
        <div class="flex items-center space-x-4">
          <span id="user-name" class="text-gray-200"></span>
          <button onclick="logout()" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-sign-out-alt mr-1"></i>ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- メインコンテンツ -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div id="deal-content">
      <div class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-gray-400 mb-4"></i>
        <p class="text-gray-600">読み込み中...</p>
      </div>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const dealId = '${dealId}';

    if (!token) {
      window.location.href = '/';
    }

    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
    }

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    async function loadDeal() {
      try {
        const response = await axios.get('/api/deals/' + dealId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const deal = response.data.deal;
        displayDeal(deal);
      } catch (error) {
        console.error('Failed to load deal:', error);
        if (error.response && error.response.status === 401) {
          logout();
        } else if (error.response && error.response.status === 404) {
          document.getElementById('deal-content').innerHTML = \`
            <div class="text-center py-12">
              <i class="fas fa-exclamation-circle text-5xl text-red-500 mb-4"></i>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">案件が見つかりません</h2>
              <p class="text-gray-600 mb-6">指定された案件は存在しないか、削除されました。</p>
              <a href="/deals" class="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">
                案件一覧に戻る
              </a>
            </div>
          \`;
        } else {
          document.getElementById('deal-content').innerHTML = \`
            <div class="text-center py-12 text-red-600">
              <i class="fas fa-exclamation-triangle text-5xl mb-4"></i>
              <p>案件の読み込みに失敗しました</p>
            </div>
          \`;
        }
      }
    }

    function displayDeal(deal) {
      const statusColors = {
        'NEW': 'bg-blue-100 text-blue-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'REPLIED': 'bg-green-100 text-green-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      };

      const statusLabels = {
        'NEW': '新規',
        'IN_REVIEW': 'レビュー中',
        'REPLIED': '回答済み',
        'CLOSED': '終了'
      };

      document.getElementById('deal-content').innerHTML = \`
        <!-- ヘッダー -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">\${deal.title}</h2>
              <span class="px-3 py-1 rounded text-sm font-medium \${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}">
                \${statusLabels[deal.status] || deal.status}
              </span>
            </div>
          </div>
        </div>

        <!-- タブナビゲーション -->
        <div class="bg-white rounded-lg shadow mb-6">
          <div class="border-b">
            <nav class="flex space-x-8 px-6" aria-label="Tabs">
              <button onclick="showTab('info')" id="tab-info" class="tab-button border-b-2 border-purple-600 py-4 px-1 text-sm font-medium text-purple-600">
                <i class="fas fa-info-circle mr-2"></i>基本情報
              </button>
              <button onclick="showTab('files')" id="tab-files" class="tab-button border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                <i class="fas fa-file mr-2"></i>ファイル
              </button>
              <button onclick="showTab('messages')" id="tab-messages" class="tab-button border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                <i class="fas fa-comments mr-2"></i>メッセージ
              </button>
            </nav>
          </div>
        </div>

        <!-- タブコンテンツ -->
        <div id="tab-content">
          <!-- 基本情報タブ -->
          <div id="content-info" class="tab-content">
            <div class="bg-white rounded-lg shadow p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">案件詳細情報</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">所在地</label>
                  <p class="text-gray-900">\${deal.location || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">最寄り駅</label>
                  <p class="text-gray-900">\${deal.station || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">徒歩分数</label>
                  <p class="text-gray-900">\${deal.walk_minutes ? deal.walk_minutes + '分' : '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">土地面積</label>
                  <p class="text-gray-900">\${deal.land_area || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">用途地域</label>
                  <p class="text-gray-900">\${deal.zoning || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">建蔽率</label>
                  <p class="text-gray-900">\${deal.building_coverage || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">容積率</label>
                  <p class="text-gray-900">\${deal.floor_area_ratio || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">高度地区</label>
                  <p class="text-gray-900">\${deal.height_district || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">防火地域</label>
                  <p class="text-gray-900">\${deal.fire_zone || '-'}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">希望価格</label>
                  <p class="text-gray-900">\${deal.desired_price || '-'}</p>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">道路情報</label>
                  <p class="text-gray-900">\${deal.road_info || '-'}</p>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">現況</label>
                  <p class="text-gray-900">\${deal.current_status || '-'}</p>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">備考</label>
                  <p class="text-gray-900">\${deal.remarks || '-'}</p>
                </div>
              </div>
              <div class="mt-6 pt-6 border-t text-sm text-gray-600">
                <p><strong>作成日時:</strong> \${new Date(deal.created_at).toLocaleString('ja-JP')}</p>
                <p><strong>更新日時:</strong> \${new Date(deal.updated_at).toLocaleString('ja-JP')}</p>
              </div>
            </div>
          </div>

          <!-- ファイルタブ -->
          <div id="content-files" class="tab-content hidden">
            <!-- ファイルアップロード -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">ファイルアップロード</h3>
              <form id="file-upload-form" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">ファイル選択</label>
                  <input type="file" id="file-input" required
                    class="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 cursor-pointer">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">フォルダー分類</label>
                  <select id="file-folder" required
                    class="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="deals">案件資料</option>
                    <option value="registry">登記簿謄本</option>
                    <option value="proposals">提案書</option>
                    <option value="reports">報告書</option>
                    <option value="chat">その他</option>
                  </select>
                </div>
                <button type="submit" 
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition">
                  <i class="fas fa-upload mr-2"></i>アップロード
                </button>
              </form>
            </div>

            <!-- ストレージ使用状況 -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">ストレージ使用状況</h3>
              <div id="storage-info">
                <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div id="storage-bar" class="bg-blue-600 h-4 rounded-full" style="width: 0%"></div>
                </div>
                <p id="storage-text" class="text-sm text-gray-600">読み込み中...</p>
              </div>
            </div>

            <!-- ファイル一覧 -->
            <div class="bg-white rounded-lg shadow p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">アップロード済みファイル</h3>
              <div id="files-list">
                <div class="text-center py-8 text-gray-500">
                  <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                  <p>読み込み中...</p>
                </div>
              </div>
            </div>
          </div>

          <!-- メッセージタブ -->
          <div id="content-messages" class="tab-content hidden">
            <!-- メッセージ送信フォーム -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">メッセージ送信</h3>
              <form id="message-form" class="space-y-4">
                <div>
                  <textarea id="message-content" rows="4" required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="メッセージを入力してください"></textarea>
                </div>
                <div class="flex items-center space-x-4">
                  <button type="submit" 
                    class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition">
                    <i class="fas fa-paper-plane mr-2"></i>送信
                  </button>
                  <label for="message-attachment" class="cursor-pointer text-gray-600 hover:text-gray-900">
                    <i class="fas fa-paperclip mr-1"></i>ファイル添付
                    <input type="file" id="message-attachment" class="hidden">
                  </label>
                  <span id="attachment-name" class="text-sm text-gray-500"></span>
                </div>
              </form>
            </div>

            <!-- メッセージ一覧 -->
            <div class="bg-white rounded-lg shadow p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">メッセージ履歴</h3>
              <div id="messages-list">
                <div class="text-center py-8 text-gray-500">
                  <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                  <p>読み込み中...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      \`;
    }

    function showTab(tab) {
      // タブボタンのスタイル更新
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-purple-600', 'text-purple-600');
        btn.classList.add('border-transparent', 'text-gray-500');
      });
      document.getElementById('tab-' + tab).classList.remove('border-transparent', 'text-gray-500');
      document.getElementById('tab-' + tab).classList.add('border-purple-600', 'text-purple-600');

      // タブコンテンツの表示切替
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      document.getElementById('content-' + tab).classList.remove('hidden');

      // タブ切り替え時にデータをロード
      if (tab === 'files') {
        loadFiles();
      } else if (tab === 'messages') {
        loadMessages();
      }
    }

    // ファイル管理機能
    async function loadFiles() {
      try {
        const response = await axios.get('/api/files/deals/' + dealId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const files = response.data.files || [];
        const storage = response.data.storage;

        // ストレージ使用状況を更新
        const percentage = storage.percentage || 0;
        document.getElementById('storage-bar').style.width = percentage + '%';
        document.getElementById('storage-text').textContent = 
          \`\${(storage.used / 1024 / 1024).toFixed(2)} MB / \${(storage.max / 1024 / 1024).toFixed(2)} MB 使用中 (\${percentage}%)\`;

        // ファイルリスト表示
        const filesList = document.getElementById('files-list');
        if (files.length === 0) {
          filesList.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-folder-open text-4xl mb-2"></i><p>アップロード済みファイルはありません</p></div>';
          return;
        }

        filesList.innerHTML = '<div class="divide-y">' + files.map(file => \`
          <div class="p-4 hover:bg-gray-50 transition">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <i class="fas fa-file text-gray-400 text-2xl"></i>
                <div>
                  <div class="font-medium text-gray-900">\${file.filename}</div>
                  <div class="text-sm text-gray-500">
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs">\${file.folder}</span>
                    <span class="ml-2">\${(file.size_bytes / 1024).toFixed(2)} KB</span>
                    <span class="ml-2">\${new Date(file.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              </div>
              <button onclick="downloadFile('\${file.id}', '\${file.filename}')" 
                class="text-blue-600 hover:text-blue-800 transition">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
        \`).join('') + '</div>';
      } catch (error) {
        console.error('Failed to load files:', error);
        document.getElementById('files-list').innerHTML = 
          '<div class="text-center py-8 text-red-600"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>ファイル読み込みに失敗しました</p></div>';
      }
    }

    // ファイルアップロード
    document.getElementById('file-upload-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fileInput = document.getElementById('file-input');
      const folder = document.getElementById('file-folder').value;
      const file = fileInput.files[0];

      if (!file) {
        alert('ファイルを選択してください');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        formData.append('deal_id', dealId);

        const response = await axios.post('/api/r2/upload', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });

        alert('ファイルをアップロードしました');
        fileInput.value = '';
        loadFiles();
      } catch (error) {
        console.error('Upload error:', error);
        alert('アップロードに失敗しました: ' + (error.response?.data?.error || error.message));
      }
    });

    async function downloadFile(fileId, filename) {
      try {
        const response = await axios.get('/api/r2/download/' + fileId, {
          headers: { 'Authorization': 'Bearer ' + token },
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Download error:', error);
        alert('ダウンロードに失敗しました');
      }
    }

    // メッセージ機能
    let messageAttachment = null;
    
    document.getElementById('message-attachment').addEventListener('change', (e) => {
      messageAttachment = e.target.files[0];
      document.getElementById('attachment-name').textContent = messageAttachment ? messageAttachment.name : '';
    });

    async function loadMessages() {
      try {
        const response = await axios.get('/api/messages/deals/' + dealId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const messages = response.data.messages || [];
        const messagesList = document.getElementById('messages-list');

        if (messages.length === 0) {
          messagesList.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-comments text-4xl mb-2"></i><p>メッセージはまだありません</p></div>';
          return;
        }

        messagesList.innerHTML = '<div class="space-y-4">' + messages.map(msg => \`
          <div class="border-l-4 \${msg.sender_id === user.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} p-4 rounded-r-lg">
            <div class="flex items-center justify-between mb-2">
              <div class="font-medium text-gray-900">\${msg.sender_name || 'Unknown'}</div>
              <div class="text-xs text-gray-500">\${new Date(msg.created_at).toLocaleString('ja-JP')}</div>
            </div>
            <div class="text-gray-700 whitespace-pre-wrap">\${msg.content}</div>
            \${msg.has_attachments ? '<div class="mt-2 text-sm text-blue-600"><i class="fas fa-paperclip mr-1"></i>添付ファイルあり</div>' : ''}
          </div>
        \`).join('') + '</div>';

        // スクロールを最下部へ
        messagesList.scrollTop = messagesList.scrollHeight;
      } catch (error) {
        console.error('Failed to load messages:', error);
        document.getElementById('messages-list').innerHTML = 
          '<div class="text-center py-8 text-red-600"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>メッセージ読み込みに失敗しました</p></div>';
      }
    }

    // メッセージ送信
    document.getElementById('message-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const content = document.getElementById('message-content').value.trim();
      if (!content) {
        alert('メッセージを入力してください');
        return;
      }

      try {
        let response;

        if (messageAttachment) {
          // ファイル添付あり
          const formData = new FormData();
          formData.append('content', content);
          formData.append('file', messageAttachment);

          response = await axios.post('/api/messages/deals/' + dealId + '/with-attachments', formData, {
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'multipart/form-data'
            }
          });
        } else {
          // テキストのみ
          response = await axios.post('/api/messages/deals/' + dealId, {
            content: content
          }, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
        }

        // フォームをリセット
        document.getElementById('message-content').value = '';
        document.getElementById('message-attachment').value = '';
        messageAttachment = null;
        document.getElementById('attachment-name').textContent = '';

        // メッセージを再読み込み
        loadMessages();
      } catch (error) {
        console.error('Send message error:', error);
        alert('メッセージ送信に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    });

    loadDeal();
  </script>
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
  <title>200棟土地仕入れ管理システム - ログイン</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 20% 50%, rgba(30, 58, 138, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(30, 64, 175, 0.2) 0%, transparent 50%);
      pointer-events: none;
    }
    .login-card {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95);
    }
    .logo-3d {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 40px rgba(30, 64, 175, 0.4),
                  0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      transform-style: preserve-3d;
      transition: transform 0.3s ease;
    }
    .logo-3d:hover {
      transform: translateY(-5px) rotateX(5deg);
    }
    .logo-icon {
      font-size: 2.5rem;
      color: white;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
  </style>
</head>
<body>
  <div class="max-w-md w-full mx-4">
    <!-- ログインカード -->
    <div class="login-card rounded-2xl shadow-2xl p-8 border border-gray-200">
      <!-- ヘッダー -->
      <div class="text-center mb-8">
        <div class="logo-3d mx-auto mb-6">
          <img src="/logo-3d.png" alt="Logo" class="w-full h-full" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2 tracking-tight">200棟土地仕入れ管理</h1>
        <p class="text-gray-600 font-medium">不動産仲介案件管理システム</p>
        <p class="text-xs text-gray-400 mt-1">Professional Real Estate Management Platform</p>
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
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-gray-50 focus:bg-white"
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
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-gray-50 focus:bg-white"
            placeholder="••••••••••"
          >
        </div>

        <!-- Remember Me チェックボックス -->
        <div class="flex items-center">
          <input 
            type="checkbox" 
            id="remember-me" 
            name="remember-me"
            checked
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          >
          <label for="remember-me" class="ml-2 block text-sm text-gray-700">
            ログイン情報を保存（30日間）
          </label>
        </div>

        <!-- ログインボタン -->
        <button 
          type="submit"
          id="login-button"
          class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition duration-200 shadow-lg hover:shadow-xl"
        >
          <i class="fas fa-sign-in-alt mr-2"></i>
          ログイン
        </button>
      </form>

      <!-- システム情報 -->
      <div class="mt-8 pt-6 border-t border-gray-200">
        <div class="text-center">
          <p class="text-xs text-gray-500 font-medium">
            <i class="fas fa-shield-alt mr-1 text-blue-600"></i>
            セキュア接続 | v2.1.0
          </p>
        </div>
      </div>
    </div>

    <!-- フッター -->
    <div class="text-center mt-6 text-gray-300 text-sm">
      <p class="font-medium">© 2025 200棟土地仕入れ管理システム</p>
      <p class="text-gray-400 mt-1 text-xs">Powered by Cloudflare Workers + Hono</p>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');

    // ページ読み込み時に自動ログインを試行
    window.addEventListener('DOMContentLoaded', () => {
      // 保存された認証情報を確認
      const savedToken = localStorage.getItem('auth_token');
      const savedEmail = localStorage.getItem('saved_email');
      const savedPassword = localStorage.getItem('saved_password');
      const expiryDate = localStorage.getItem('auth_expiry');

      // 認証情報が有効期限内であれば自動ログイン
      if (savedToken && expiryDate) {
        const now = new Date().getTime();
        if (now < parseInt(expiryDate)) {
          // トークンが有効なので自動リダイレクト
          window.location.href = '/dashboard';
          return;
        }
      }

      // 保存されたメール・パスワードを入力欄に復元
      if (savedEmail) {
        emailInput.value = savedEmail;
      }
      if (savedPassword) {
        passwordInput.value = savedPassword;
      }
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // エラーメッセージを非表示
      errorMessage.classList.add('hidden');
      
      // ボタンを無効化
      loginButton.disabled = true;
      loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>ログイン中...';

      try {
        const email = emailInput.value;
        const password = passwordInput.value;
        const rememberMe = rememberMeCheckbox.checked;

        const response = await axios.post('/api/auth/login', {
          email,
          password
        });

        if (response.data.token) {
          // トークンを保存
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Remember Me が有効な場合、認証情報を30日間保存
          if (rememberMe) {
            const expiryDate = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30日後
            localStorage.setItem('saved_email', email);
            localStorage.setItem('saved_password', password);
            localStorage.setItem('auth_expiry', expiryDate.toString());
          } else {
            // Remember Me が無効な場合、保存された情報を削除
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_password');
            localStorage.removeItem('auth_expiry');
          }
          
          // ダッシュボードにリダイレクト
          window.location.href = '/dashboard';
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
    passwordInput.addEventListener('keypress', (e) => {
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

// ロゴファイルを直接配信（ルート直下）
app.get('/logo-3d.png', async (c) => {
  const logoSvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0e7ff;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="4" y="4" width="72" height="72" rx="16" fill="url(#bgGradient)" filter="url(#shadow)"/>
  <g transform="translate(25, 20)">
    <rect x="4" y="8" width="22" height="32" fill="url(#buildingGradient)" rx="2"/>
    <rect x="4" y="8" width="22" height="32" fill="rgba(255,255,255,0.1)" rx="2"/>
    <rect x="7" y="12" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="13" y="12" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="19" y="12" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="7" y="18" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="13" y="18" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="19" y="18" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="7" y="24" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="13" y="24" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="19" y="24" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="7" y="30" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="13" y="30" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="19" y="30" width="4" height="4" fill="#1e40af" opacity="0.6" rx="1"/>
    <rect x="11" y="34" width="8" height="6" fill="#1e40af" opacity="0.8" rx="1"/>
    <path d="M 26 8 L 30 10 L 30 42 L 26 40 Z" fill="rgba(0,0,0,0.2)"/>
    <path d="M 4 8 L 8 6 L 30 6 L 26 8 Z" fill="rgba(255,255,255,0.3)"/>
    <rect x="5" y="9" width="2" height="28" fill="rgba(255,255,255,0.4)" rx="1"/>
  </g>
</svg>`;
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=31536000');
  return c.body(logoSvg);
});

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
    title: '200棟土地仕入れ管理システム',
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
