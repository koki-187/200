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
import ocr from './routes/ocr';
import email from './routes/email';
import pdf from './routes/pdf';

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
app.route('/api/settings', settings);
app.route('/api/notifications', notifications);
app.route('/api/ocr', ocr);
app.route('/api/email', email);
app.route('/api/pdf', pdf);

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
    
    .notification-filter {
      @apply px-4 py-2 rounded font-medium text-sm transition-colors border border-gray-300 hover:border-gold;
    }
    
    .notification-filter.active {
      @apply bg-gold text-white border-gold;
    }
    
    input[type="checkbox"]:checked + span {
      @apply text-gold font-bold;
    }
    
    label:has(input[type="checkbox"]:checked) {
      @apply border-gold bg-gold bg-opacity-5;
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

        <!-- 検索とソート -->
        <div class="card mb-4">
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <input type="text" id="search-deals" class="input-field" placeholder="案件名、所在地、駅名で検索...">
            </div>
            <div class="w-48">
              <select id="sort-deals" class="input-field">
                <option value="updated_at">更新日時順</option>
                <option value="created_at">作成日時順</option>
                <option value="deadline">期限順</option>
                <option value="title">案件名順</option>
              </select>
            </div>
          </div>
        </div>

        <!-- フィルター -->
        <div class="card mb-4">
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
        <div class="mb-6 flex items-center justify-between">
          <button id="btn-back-to-list" class="text-navy hover:text-gold transition-colors">
            <i class="fas fa-arrow-left mr-2"></i>案件一覧に戻る
          </button>
          <button id="btn-download-pdf" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded transition-colors">
            <i class="fas fa-file-pdf mr-2"></i>PDFレポート生成
          </button>
        </div>
        
        <div class="card">
          <h2 class="text-2xl font-bold text-navy mb-4" id="deal-title">案件詳細</h2>
          <div id="deal-detail-content">
            <!-- 案件詳細がここに表示されます -->
          </div>
        </div>
      </div>

      <!-- お知らせ画面 -->
      <div id="notifications-page" class="hidden">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold text-navy">
            <i class="fas fa-bell mr-2"></i>お知らせ
          </h2>
          <button id="btn-mark-all-read" class="btn-secondary">
            <i class="fas fa-check-double mr-2"></i>全て既読にする
          </button>
        </div>

        <!-- 通知フィルター -->
        <div class="card mb-4">
          <div class="flex space-x-4">
            <button class="notification-filter active" data-type="ALL">
              <i class="fas fa-list mr-2"></i>すべて
            </button>
            <button class="notification-filter" data-type="NEW_DEAL">
              <i class="fas fa-folder-plus mr-2"></i>新規案件
            </button>
            <button class="notification-filter" data-type="NEW_MESSAGE">
              <i class="fas fa-comment mr-2"></i>メッセージ
            </button>
            <button class="notification-filter" data-type="DEADLINE">
              <i class="fas fa-clock mr-2"></i>期限通知
            </button>
            <button class="notification-filter" data-type="MISSING_INFO">
              <i class="fas fa-exclamation-triangle mr-2"></i>未入力項目
            </button>
          </div>
        </div>

        <!-- 通知一覧 -->
        <div id="notifications-list" class="space-y-4">
          <div class="text-center py-12 text-gray-500">
            <i class="fas fa-bell text-6xl mb-4"></i>
            <p>通知を読み込み中...</p>
          </div>
        </div>
      </div>

      <!-- 設定画面 -->
      <div id="settings-page" class="hidden">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-navy">
            <i class="fas fa-cog mr-2"></i>設定
          </h2>
        </div>

        <!-- ビジネスデイ設定 -->
        <div class="card mb-6">
          <h3 class="text-lg font-bold text-navy mb-4">
            <i class="fas fa-calendar-check text-gold mr-2"></i>ビジネスデイ設定
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            営業日として扱う曜日を選択してください。48時間期限計算に使用されます。
          </p>
          <div class="grid grid-cols-7 gap-2" id="business-days-selector">
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="0" class="mb-2">
              <span class="text-sm font-medium">日</span>
            </label>
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="1" class="mb-2" checked>
              <span class="text-sm font-medium">月</span>
            </label>
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="2" class="mb-2" checked>
              <span class="text-sm font-medium">火</span>
            </label>
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="3" class="mb-2" checked>
              <span class="text-sm font-medium">水</span>
            </label>
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="4" class="mb-2" checked>
              <span class="text-sm font-medium">木</span>
            </label>
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="5" class="mb-2" checked>
              <span class="text-sm font-medium">金</span>
            </label>
            <label class="flex flex-col items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gold transition-colors">
              <input type="checkbox" name="business-day" value="6" class="mb-2">
              <span class="text-sm font-medium">土</span>
            </label>
          </div>
          <div class="mt-4">
            <button id="btn-save-business-days" class="btn-primary">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </div>

        <!-- 休日管理 -->
        <div class="card mb-6">
          <h3 class="text-lg font-bold text-navy mb-4">
            <i class="fas fa-calendar-times text-gold mr-2"></i>休日管理
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            祝日や会社独自の休日を登録してください。48時間期限計算時にスキップされます。
          </p>
          
          <!-- 休日追加フォーム -->
          <div class="mb-4 flex space-x-2">
            <input type="date" id="new-holiday-date" class="input-field flex-1">
            <input type="text" id="new-holiday-desc" class="input-field flex-1" placeholder="説明（例：元日、創立記念日）">
            <button id="btn-add-holiday" class="btn-primary">
              <i class="fas fa-plus mr-2"></i>追加
            </button>
          </div>

          <!-- 休日一覧 -->
          <div id="holidays-list" class="space-y-2 max-h-64 overflow-y-auto">
            <p class="text-center text-gray-500 py-4">休日を読み込み中...</p>
          </div>
        </div>

        <!-- ストレージ設定 -->
        <div class="card mb-6">
          <h3 class="text-lg font-bold text-navy mb-4">
            <i class="fas fa-database text-gold mr-2"></i>ストレージ設定
          </h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              案件ごとのストレージ上限（MB）
            </label>
            <input type="number" id="storage-limit" class="input-field" min="10" max="500" step="10" value="50">
            <p class="text-xs text-gray-500 mt-1">
              各案件でアップロードできるファイルの合計サイズ上限です。
            </p>
          </div>
          <button id="btn-save-storage" class="btn-primary">
            <i class="fas fa-save mr-2"></i>保存
          </button>
        </div>

        <!-- ユーザー管理（管理者専用） -->
        <div id="user-management-section" class="card mb-6 hidden">
          <h3 class="text-lg font-bold text-navy mb-4">
            <i class="fas fa-users text-gold mr-2"></i>ユーザー管理
          </h3>
          
          <!-- 新規ユーザー追加 -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-bold text-navy mb-3">新規ユーザー追加</h4>
            <div class="grid grid-cols-2 gap-4 mb-3">
              <input type="email" id="new-user-email" class="input-field" placeholder="メールアドレス">
              <input type="text" id="new-user-name" class="input-field" placeholder="氏名">
              <input type="password" id="new-user-password" class="input-field" placeholder="パスワード">
              <select id="new-user-role" class="input-field">
                <option value="AGENT">エージェント（売側）</option>
                <option value="ADMIN">管理者（買側）</option>
              </select>
            </div>
            <button id="btn-create-user" class="btn-primary">
              <i class="fas fa-user-plus mr-2"></i>ユーザー追加
            </button>
          </div>

          <!-- ユーザー一覧 -->
          <div id="users-list">
            <h4 class="font-bold text-navy mb-3">登録ユーザー一覧</h4>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <p class="text-center text-gray-500 py-4">ユーザーを読み込み中...</p>
            </div>
          </div>
        </div>

        <!-- APIキー情報 -->
        <div class="card">
          <h3 class="text-lg font-bold text-navy mb-4">
            <i class="fas fa-key text-gold mr-2"></i>API情報
          </h3>
          <p class="text-sm text-gray-600 mb-3">
            外部サービス連携用の情報です。変更が必要な場合は管理者に連絡してください。
          </p>
          <div class="bg-gray-50 p-4 rounded">
            <div class="mb-2">
              <label class="text-xs font-medium text-gray-500">OpenAI API（提案生成用）</label>
              <p class="text-sm font-mono text-gray-700">設定済み</p>
            </div>
            <div class="mb-2">
              <label class="text-xs font-medium text-gray-500">OCR API（書類読取用）</label>
              <p class="text-sm font-mono text-gray-700">設定済み</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500">メール通知API</label>
              <p class="text-sm font-mono text-gray-700">設定済み</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 新規案件作成モーダル -->
    <div id="new-deal-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-navy">
            <i class="fas fa-plus-circle text-gold mr-2"></i>新規案件作成
          </h3>
          <button onclick="closeNewDealModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">案件名 <span class="text-red-500">*</span></label>
            <input type="text" id="new-deal-title" class="input-field" placeholder="例: 川崎市幸区塚越四丁目 アパート用地" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">売主担当者 <span class="text-red-500">*</span></label>
            <select id="new-deal-seller" class="input-field" required>
              <option value="">選択してください</option>
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">所在地</label>
              <input type="text" id="new-deal-location" class="input-field" placeholder="例: 川崎市幸区塚越四丁目">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">最寄駅</label>
              <input type="text" id="new-deal-station" class="input-field" placeholder="例: 矢向">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">徒歩分数</label>
              <input type="number" id="new-deal-walk-minutes" class="input-field" placeholder="4">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">希望価格</label>
              <input type="text" id="new-deal-price" class="input-field" placeholder="例: 8,000万円">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea id="new-deal-remarks" class="input-field" rows="3" placeholder="その他の情報..."></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4 border-t">
            <button onclick="closeNewDealModal()" class="btn-secondary">
              <i class="fas fa-times mr-2"></i>キャンセル
            </button>
            <button onclick="createNewDeal()" class="btn-primary">
              <i class="fas fa-check mr-2"></i>作成
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- フッター -->
    <footer class="bg-navy text-white text-center py-6 mt-12">
      <p class="text-sm">© 2025 200棟アパート用地仕入れプロジェクト. All rights reserved.</p>
    </footer>

    <!-- 新規案件作成モーダル -->
    <div id="new-deal-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-navy">
              <i class="fas fa-plus-circle text-gold mr-2"></i>新規案件作成
            </h3>
            <button id="btn-close-modal" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>

          <form id="new-deal-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                案件名 <span class="text-red-500">*</span>
              </label>
              <input type="text" id="new-deal-title" class="input-field" placeholder="例: 川崎市幸区塚越四丁目 アパート用地" required>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  エージェント <span class="text-red-500">*</span>
                </label>
                <select id="new-deal-seller" class="input-field" required>
                  <option value="">選択してください</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select id="new-deal-status" class="input-field">
                  <option value="NEW">新規</option>
                  <option value="IN_REVIEW">調査中</option>
                  <option value="REPLIED">一次回答済</option>
                  <option value="CLOSED">クロージング</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">所在地</label>
                <input type="text" id="new-deal-location" class="input-field" placeholder="例: 川崎市幸区塚越四丁目">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">最寄駅</label>
                <input type="text" id="new-deal-station" class="input-field" placeholder="例: 矢向">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">徒歩（分）</label>
                <input type="number" id="new-deal-walk" class="input-field" placeholder="4">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">土地面積</label>
                <input type="text" id="new-deal-area" class="input-field" placeholder="218.14㎡">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">希望価格</label>
                <input type="text" id="new-deal-price" class="input-field" placeholder="8,000万円">
              </div>
            </div>

            <div class="border-t pt-4 mt-4">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center">
                    <i class="fas fa-magic text-blue-600 mr-2"></i>
                    <span class="font-medium text-blue-900">OCR自動入力</span>
                  </div>
                  <span class="text-xs text-blue-600">画像・PDFから自動読み取り</span>
                </div>
                <input type="file" id="ocr-file-input" accept="image/*,.pdf" class="hidden">
                <button type="button" id="btn-ocr-upload" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
                  <i class="fas fa-upload mr-2"></i>資料をアップロードして自動入力
                </button>
                <div id="ocr-status" class="mt-2 text-sm text-center hidden"></div>
              </div>
            </div>

            <div class="flex items-center space-x-3 pt-4">
              <button type="submit" class="btn-primary flex-1">
                <i class="fas fa-check mr-2"></i>案件を作成
              </button>
              <button type="button" id="btn-cancel-modal" class="btn-secondary flex-1">
                <i class="fas fa-times mr-2"></i>キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="/static/app.js?v=${Date.now()}"></script>
</body>
</html>
  `);
});

export default app;
