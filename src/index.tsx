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

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// APIルートのマウント
app.route('/api/auth', auth);
app.route('/api/deals', deals);
app.route('/api/messages', messages);
app.route('/api/files', files);
app.route('/api/proposals', proposals);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静的ファイルの配信
app.use('/static/*', serveStatic({ root: './public' }));

// デフォルトルート（SPAのエントリーポイント）
app.get('*', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>200棟アパート用地仕入れプロジェクト</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            navy: {
              DEFAULT: '#0A1A2F',
              light: '#1a2942',
              dark: '#050d1a'
            },
            gold: {
              DEFAULT: '#C9A86A',
              light: '#d4b57f',
              dark: '#b89355'
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap');
    
    body {
      font-family: 'Noto Sans JP', 'Inter', sans-serif;
    }
    
    .card {
      @apply bg-white rounded-lg shadow-md p-6 mb-4;
    }
    
    .btn-primary {
      @apply bg-gold hover:bg-gold-dark text-white font-medium py-2 px-6 rounded transition-colors;
    }
    
    .btn-secondary {
      @apply bg-navy hover:bg-navy-light text-white font-medium py-2 px-6 rounded transition-colors;
    }
    
    .badge {
      @apply inline-block px-3 py-1 rounded-full text-sm font-medium;
    }
    
    .badge-success {
      @apply bg-green-100 text-green-800;
    }
    
    .badge-warning {
      @apply bg-yellow-100 text-yellow-800;
    }
    
    .badge-danger {
      @apply bg-red-100 text-red-800;
    }
    
    .input-field {
      @apply w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gold;
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <div id="app">
    <!-- ヘッダー -->
    <header class="bg-navy text-white shadow-lg">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <i class="fas fa-building text-gold text-2xl"></i>
            <h1 class="text-xl font-bold">200棟アパート用地仕入れプロジェクト</h1>
          </div>
          <nav class="flex items-center space-x-6">
            <a href="#" class="hover:text-gold transition-colors" id="nav-deals">案件</a>
            <a href="#" class="hover:text-gold transition-colors" id="nav-notifications">お知らせ</a>
            <a href="#" class="hover:text-gold transition-colors" id="nav-settings">設定</a>
            <button id="btn-logout" class="hover:text-gold transition-colors">
              <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- お知らせバナー -->
    <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
      <div class="container mx-auto px-6">
        <div class="flex items-center">
          <i class="fas fa-info-circle text-blue-500 mr-3"></i>
          <p class="text-sm text-blue-800">
            営業日48時間以内の一次回答体制を実現します。期限管理・不足情報の可視化をサポートします。
          </p>
        </div>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-6 py-8">
      <!-- ログイン画面 -->
      <div id="login-page" class="max-w-md mx-auto">
        <div class="card">
          <div class="text-center mb-6">
            <i class="fas fa-building text-gold text-5xl mb-4"></i>
            <h2 class="text-2xl font-bold text-navy">ログイン</h2>
          </div>
          <form id="login-form">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input type="email" id="login-email" class="input-field" placeholder="admin@example.com" required>
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input type="password" id="login-password" class="input-field" placeholder="Admin!2025" required>
            </div>
            <button type="submit" class="btn-primary w-full">
              <i class="fas fa-sign-in-alt mr-2"></i>ログイン
            </button>
          </form>
          <div class="mt-4 text-center text-sm text-gray-600">
            <p>初期ログイン情報:</p>
            <p>admin@example.com / Admin!2025</p>
          </div>
        </div>
      </div>

      <!-- ダッシュボード（ログイン後に表示） -->
      <div id="dashboard-page" class="hidden">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-navy">
            <i class="fas fa-th-large mr-2"></i>案件ダッシュボード
          </h2>
          <button id="btn-new-deal" class="btn-primary">
            <i class="fas fa-plus mr-2"></i>新規案件作成
          </button>
        </div>

        <!-- フィルター -->
        <div class="card">
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
              <select id="filter-status" class="input-field">
                <option value="">すべて</option>
                <option value="NEW">新規</option>
                <option value="IN_REVIEW">調査中</option>
                <option value="REPLIED">一次回答済</option>
                <option value="CLOSED">クロージング</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-2">期限ステータス</label>
              <select id="filter-deadline" class="input-field">
                <option value="">すべて</option>
                <option value="IN_TIME">期限内</option>
                <option value="WARNING">期限迫る</option>
                <option value="OVERDUE">期限超過</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 案件一覧 -->
        <div id="deals-list" class="space-y-4">
          <!-- 案件カードがここに動的に追加されます -->
          <div class="text-center py-12 text-gray-500">
            <i class="fas fa-folder-open text-6xl mb-4"></i>
            <p>案件を読み込み中...</p>
          </div>
        </div>
      </div>

      <!-- 案件詳細画面 -->
      <div id="deal-detail-page" class="hidden">
        <div class="mb-6">
          <button id="btn-back-to-list" class="text-navy hover:text-gold transition-colors">
            <i class="fas fa-arrow-left mr-2"></i>案件一覧に戻る
          </button>
        </div>
        
        <div class="card">
          <h2 class="text-2xl font-bold text-navy mb-4" id="deal-title">案件詳細</h2>
          <div id="deal-detail-content">
            <!-- 案件詳細がここに表示されます -->
          </div>
        </div>
      </div>
    </main>

    <!-- フッター -->
    <footer class="bg-navy text-white text-center py-6 mt-12">
      <p class="text-sm">© 2025 200棟アパート用地仕入れプロジェクト. All rights reserved.</p>
    </footer>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>
  `);
});

export default app;
