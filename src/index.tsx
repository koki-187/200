import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { Bindings } from './types';

// ルートのインポート
import auth from './routes/auth';
import deals from './routes/deals';
import messages from './routes/messages';
import users from './routes/users';
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
import aiProposals from './routes/ai-proposals';
import businessCardOCR from './routes/business-card-ocr';
import propertyOCR from './routes/property-ocr';
import purchaseCriteria from './routes/purchase-criteria';
import geocoding from './routes/geocoding';
import ocrHistory from './routes/ocr-history';
import ocrSettings from './routes/ocr-settings';
import ocrJobs from './routes/ocr-jobs';
import dealFiles from './routes/deal-files';
import dealValidation from './routes/deal-validation';
import propertyTemplates from './routes/property-templates';
import storageQuota from './routes/storage-quota';
import reinfolibApi from './routes/reinfolib-api';
import buildingRegulations from './routes/building-regulations';
import monitoring from './routes/monitoring';
// import reports from './routes/reports'; // DELETED: レポート機能削除
import investmentSimulator from './routes/investment-simulator';

// Middleware
import { rateLimitPresets } from './middleware/rate-limit';
import { apiVersionMiddleware, getApiVersionInfo } from './middleware/api-version';
import { errorTrackingMiddleware, initializeErrorTracker } from './middleware/error-tracking';
import { errorHandler } from './middleware/error-handler';
import { apiLogger } from './middleware/api-logger';

const app = new Hono<{ Bindings: Bindings }>();

// グローバルエラーハンドリング（最優先）
app.use('*', errorHandler);

// セキュリティヘッダー設定（全リクエストに適用）
app.use('*', async (c, next) => {
  await next();
  
  // Content Security Policy
  c.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net unpkg.com cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com unpkg.com; " +
    "font-src 'self' cdn.jsdelivr.net fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' cdn.jsdelivr.net cdnjs.cloudflare.com; " +
    "worker-src 'self' blob: cdnjs.cloudflare.com;"
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
  
  // 静的リソースには短期キャッシュを設定（デプロイ時の更新を即座に反映）
  if (path.startsWith('/static/') || path.startsWith('/assets/')) {
    // 開発中は短期キャッシュ（5分）、本番環境では1日
    c.header('Cache-Control', 'public, max-age=300, must-revalidate');
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

// APIロギング（全APIルートに適用、最優先）
app.use('/api/*', apiLogger());

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
app.route('/api/users', users);
app.route('/api/deals', deals);
app.route('/api/deals', dealFiles);
app.route('/api/deals', dealValidation);
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
app.route('/api/ai-proposals', aiProposals);
app.route('/api/business-card-ocr', businessCardOCR);
app.route('/api/property-ocr', propertyOCR);
app.route('/api/purchase-criteria', purchaseCriteria);
app.route('/api/geocoding', geocoding);
app.route('/api/ocr-history', ocrHistory);
app.route('/api/ocr-settings', ocrSettings);
app.route('/api/ocr-jobs', ocrJobs);
app.route('/api/property-templates', propertyTemplates);
app.route('/api/storage-quota', storageQuota);
app.route('/api/reinfolib', reinfolibApi);
app.route('/api/building-regulations', buildingRegulations);
app.route('/api/monitoring', monitoring);
// app.route('/api/reports', reports); // DELETED: レポート機能削除
// app.route('/api/investment-simulator', investmentSimulator); // DELETED: 投資シミュレーター機能削除

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// デバッグ用エンドポイント - 環境変数とバインディング確認
app.get('/api/debug/env', (c) => {
  return c.json({
    has_DB: !!c.env.DB,
    has_JWT_SECRET: !!c.env.JWT_SECRET,
    has_OPENAI_API_KEY: !!c.env.OPENAI_API_KEY,
    env_keys: Object.keys(c.env || {}),
    timestamp: new Date().toISOString()
  });
});

// Test page for debugging
app.get('/test-deals-page', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Deals Page Loading</title>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script defer src="/static/error-handler.js"></script>
</head>
<body>
  <h1>Testing Deals Page Load</h1>
  <div id="status">Loading...</div>
  <div id="result"></div>

  <script>
    async function test() {
      try {
        // Step 1: Login
        const loginResponse = await axios.post('/api/auth/login', {
          email: 'navigator-187@docomo.ne.jp',
          password: 'kouki187'
        });
        
        const token = loginResponse.data.token;
        document.getElementById('status').innerHTML = 'Login successful, token: ' + token.substring(0, 20) + '...';
        
        // Step 2: Store in localStorage (simulating real app behavior)
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
        
        // Step 3: Load deals
        document.getElementById('status').innerHTML += '<br>Loading deals...';
        const dealsResponse = await axios.get('/api/deals', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const deals = dealsResponse.data.deals || [];
        document.getElementById('status').innerHTML += '<br>Deals loaded: ' + deals.length + ' items';
        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(deals, null, 2) + '</pre>';
        
        // Step 4: Redirect to deals page
        document.getElementById('status').innerHTML += '<br><a href="/deals">Go to Deals Page</a>';
      } catch (error) {
        document.getElementById('status').innerHTML = 'Error: ' + error.message;
        document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(error.response?.data || error, null, 2) + '</pre>';
        console.error('Test error:', error);
      }
    }
    
    test();
  </script>
</body>
</html>
  `);
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

// ユーザー登録ページ
app.get('/register', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ユーザー登録 - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <!-- PDF.js for PDF to Image conversion -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs" type="module"></script>
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .drag-drop-area {
      border: 3px dashed #cbd5e0;
      transition: all 0.3s ease;
    }
    .drag-drop-area.drag-over {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .preview-image {
      max-width: 300px;
      max-height: 300px;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .ocr-loading {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body class="flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8">
    <!-- ヘッダー -->
    <div class="text-center mb-8">
      <div class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl mb-4">
        <i class="fas fa-user-plus text-3xl"></i>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">ユーザー登録</h1>
      <p class="text-gray-600">200棟土地仕入れ管理システム</p>
    </div>

    <!-- 名刺アップロードエリア -->
    <div class="mb-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
      <div class="flex items-start space-x-3 mb-4">
        <i class="fas fa-lightbulb text-blue-600 text-2xl mt-1"></i>
        <div>
          <h3 class="text-lg font-bold text-gray-900 mb-1">名刺をアップロードすると自動で情報が入力されます</h3>
          <p class="text-gray-600 text-sm">手間を省くため、名刺の写真をご用意ください。縦型・横型・英語の名刺にも対応しています。</p>
        </div>
      </div>

      <div id="dropZone" class="drag-drop-area bg-white rounded-xl p-8 text-center cursor-pointer">
        <input type="file" id="businessCardFile" accept="image/*" class="hidden">
        <div id="uploadPrompt">
          <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-4"></i>
          <p class="text-gray-700 font-medium mb-2">名刺画像をドラッグ＆ドロップ</p>
          <p class="text-gray-500 text-sm mb-4">または</p>
          <button type="button" onclick="document.getElementById('businessCardFile').click()" 
                  class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
            ファイルを選択
          </button>
          <p class="text-gray-400 text-xs mt-4">PNG, JPG, JPEG形式をサポート</p>
        </div>
        
        <div id="previewArea" class="hidden">
          <img id="previewImage" class="preview-image mx-auto mb-4" />
          <p id="fileName" class="text-gray-700 font-medium mb-4"></p>
          <button type="button" onclick="extractBusinessCard()" id="extractBtn"
                  class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition font-medium">
            <i class="fas fa-magic mr-2"></i>名刺情報を読み取る
          </button>
          <button type="button" onclick="resetUpload()" class="ml-3 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition">
            キャンセル
          </button>
          <div id="ocrLoading" class="hidden mt-4">
            <i class="fas fa-spinner ocr-loading text-3xl text-blue-600"></i>
            <p class="text-gray-700 mt-2">名刺を読み取り中...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 登録フォーム -->
    <form id="registerForm" class="space-y-6">
      <!-- 基本情報 -->
      <div class="border-b pb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4">
          <i class="fas fa-user text-blue-600 mr-2"></i>基本情報
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              氏名 <span class="text-red-500">*</span>
            </label>
            <input type="text" id="name" required
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="山田 太郎">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス <span class="text-red-500">*</span>
            </label>
            <input type="email" id="email" required
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="yamada@example.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              パスワード <span class="text-red-500">*</span>
            </label>
            <input type="password" id="password" required
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="8文字以上、大小英数字を含む">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              役割 <span class="text-red-500">*</span>
            </label>
            <select id="role" required
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">選択してください</option>
              <option value="ADMIN">管理者</option>
              <option value="AGENT">売側ユーザー</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 会社情報 -->
      <div class="border-b pb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4">
          <i class="fas fa-building text-blue-600 mr-2"></i>会社情報
        </h3>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会社名</label>
            <input type="text" id="company_name"
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="株式会社サンプル">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会社住所</label>
            <textarea id="company_address" rows="2"
                      class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="東京都千代田区丸の内1-1-1"></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">役職</label>
              <input type="text" id="position"
                     class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="営業部長">
            </div>
          </div>
        </div>
      </div>

      <!-- 連絡先情報 -->
      <div class="pb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4">
          <i class="fas fa-phone text-blue-600 mr-2"></i>連絡先情報
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">携帯電話番号</label>
            <input type="tel" id="mobile_phone"
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="090-1234-5678">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会社電話番号</label>
            <input type="tel" id="company_phone"
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="03-1234-5678">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">会社FAX番号</label>
            <input type="tel" id="company_fax"
                   class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="03-1234-5679">
          </div>
        </div>
      </div>

      <!-- ボタン -->
      <div class="flex space-x-4">
        <button type="submit" id="submitBtn"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition">
          <i class="fas fa-user-check mr-2"></i>登録する
        </button>
        <a href="/dashboard" 
           class="flex-1 text-center bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition">
          キャンセル
        </a>
      </div>
    </form>

    <!-- メッセージ表示エリア -->
    <div id="messageArea" class="mt-6 hidden"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    let uploadedFile = null;

    // ドラッグ&ドロップ設定
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('businessCardFile');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });

    function handleFiles(files) {
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          uploadedFile = file;
          displayPreview(file);
        } else {
          showMessage('画像ファイルを選択してください', 'error');
        }
      }
    }

    function displayPreview(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('uploadPrompt').classList.add('hidden');
        document.getElementById('previewArea').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }

    function resetUpload() {
      uploadedFile = null;
      fileInput.value = '';
      document.getElementById('uploadPrompt').classList.remove('hidden');
      document.getElementById('previewArea').classList.add('hidden');
      document.getElementById('ocrLoading').classList.add('hidden');
    }

    async function extractBusinessCard() {
      if (!uploadedFile) {
        showMessage('名刺画像を選択してください', 'error');
        return;
      }

      const extractBtn = document.getElementById('extractBtn');
      const ocrLoading = document.getElementById('ocrLoading');
      
      extractBtn.disabled = true;
      ocrLoading.classList.remove('hidden');

      try {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        const response = await axios.post('/api/business-card-ocr/extract', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.success) {
          const data = response.data.data;
          
          // フォームに自動入力
          if (data.name) document.getElementById('name').value = data.name;
          if (data.email) document.getElementById('email').value = data.email;
          if (data.company_name) document.getElementById('company_name').value = data.company_name;
          if (data.company_address) document.getElementById('company_address').value = data.company_address;
          if (data.position) document.getElementById('position').value = data.position;
          if (data.mobile_phone) document.getElementById('mobile_phone').value = data.mobile_phone;
          if (data.company_phone) document.getElementById('company_phone').value = data.company_phone;
          if (data.company_fax) document.getElementById('company_fax').value = data.company_fax;

          showMessage('名刺情報を自動入力しました！内容を確認して登録してください。', 'success');
          
          // スクロールしてフォームを表示
          document.getElementById('registerForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          showMessage('名刺の読み取りに失敗しました', 'error');
        }
      } catch (error) {
        console.error('OCR error:', error);
        showMessage('名刺の読み取り中にエラーが発生しました: ' + (error.response?.data?.error || error.message), 'error');
      } finally {
        extractBtn.disabled = false;
        ocrLoading.classList.add('hidden');
      }
    }

    // ユーザー登録処理
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登録中...';

      try {
        const data = {
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
          name: document.getElementById('name').value,
          role: document.getElementById('role').value,
          company_name: document.getElementById('company_name').value || undefined,
          company_address: document.getElementById('company_address').value || undefined,
          position: document.getElementById('position').value || undefined,
          mobile_phone: document.getElementById('mobile_phone').value || undefined,
          company_phone: document.getElementById('company_phone').value || undefined,
          company_fax: document.getElementById('company_fax').value || undefined
        };

        const response = await axios.post('/api/auth/register', data);

        if (response.data.message) {
          showMessage('ユーザー登録が完了しました！ダッシュボードに移動します...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        }
      } catch (error) {
        console.error('Registration error:', error);
        const errorMsg = error.response?.data?.error || 'ユーザー登録に失敗しました';
        showMessage(errorMsg, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-check mr-2"></i>登録する';
      }
    });

    // ⚠️ イベント委譲パターンから呼び出せるようにwindowスコープに昇格
    window.showMessage = function showMessage(message, type) {
      const messageArea = document.getElementById('messageArea');
      const bgColor = type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800';
      const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
      
      messageArea.className = \`mt-6 p-4 rounded-lg border-l-4 \${bgColor}\`;
      messageArea.innerHTML = \`
        <div class="flex items-center">
          <i class="fas \${icon} mr-3 text-xl"></i>
          <span>\${message}</span>
        </div>
      \`;
      messageArea.classList.remove('hidden');

      if (type === 'success') {
        setTimeout(() => {
          messageArea.classList.add('hidden');
        }, 5000);
      }
    }

    // 認証チェック（管理者のみアクセス可能）
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'ADMIN') {
      window.location.href = '/dashboard';
    }
  </script>
</body>
</html>
  `);
});

// 買取条件サマリーページ
app.get('/purchase-criteria', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>買取条件一覧 - 200棟土地仕入れ管理システム</title>
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
    .criteria-card {
      transition: all 0.3s ease;
    }
    .criteria-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
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
          <a href="/purchase-criteria" class="text-white border-b-2 border-blue-400 pb-1 transition">
            買取条件
          </a>
          <a href="/deals" class="text-gray-300 hover:text-white transition">
            案件一覧
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
    <!-- ページヘッダー -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-gray-900 mb-2">
        <i class="fas fa-clipboard-check text-blue-600 mr-3"></i>
        買取条件一覧
      </h2>
      <p class="text-gray-600">200棟マンション用地の買取条件を確認できます。案件登録時にこれらの条件で自動チェックされます。</p>
    </div>

    <!-- 対象エリア -->
    <div class="mb-6">
      <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
        <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <i class="fas fa-map-marked-alt text-blue-600 mr-2"></i>
          対象エリア
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div class="criteria-card bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-gray-900">埼玉県</span>
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
            <p class="text-sm text-gray-600">全域対象</p>
          </div>
          <div class="criteria-card bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-gray-900">東京都</span>
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
            <p class="text-sm text-gray-600">23区および多摩地区</p>
          </div>
          <div class="criteria-card bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-gray-900">千葉県西部</span>
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
            <p class="text-sm text-gray-600">市川市、船橋市など</p>
          </div>
          <div class="criteria-card bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-gray-900">神奈川県</span>
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
            <p class="text-sm text-gray-600">全域対象</p>
          </div>
          <div class="criteria-card bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-gray-900">愛知県</span>
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
            <p class="text-sm text-gray-600">名古屋市および近郊</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 買取条件詳細 -->
    <div class="mb-6">
      <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
        <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <i class="fas fa-tasks text-green-600 mr-2"></i>
          買取条件
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- 駅徒歩時間 -->
          <div class="criteria-card bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div class="flex items-center mb-3">
              <div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                <i class="fas fa-walking"></i>
              </div>
              <div>
                <h4 class="font-bold text-gray-900">駅徒歩時間</h4>
                <p class="text-xs text-gray-600">最寄駅からの距離</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-green-700">
              ≤ 15分
            </div>
            <p class="text-sm text-gray-600 mt-2">最寄駅から徒歩15分以内</p>
          </div>

          <!-- 土地面積 -->
          <div class="criteria-card bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div class="flex items-center mb-3">
              <div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                <i class="fas fa-ruler-combined"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">土地面積</h4>
                <p class="text-xs text-gray-600">敷地全体の広さ</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-green-700">
              ≥ 45坪
            </div>
            <p class="text-sm text-gray-600 mt-2">約148.76㎡以上</p>
          </div>

          <!-- 間口 -->
          <div class="criteria-card bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div class="flex items-center mb-3">
              <div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                <i class="fas fa-arrows-alt-h"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">間口</h4>
                <p class="text-xs text-gray-600">道路に接する幅</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-green-700">
              ≥ 7.5m
            </div>
            <p class="text-sm text-gray-600 mt-2">道路に接する幅が7.5m以上</p>
          </div>

          <!-- 建ぺい率 -->
          <div class="criteria-card bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div class="flex items-center mb-3">
              <div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                <i class="fas fa-expand-arrows-alt"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">建ぺい率</h4>
                <p class="text-xs text-gray-600">建物の建築可能面積</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-green-700">
              ≥ 60%
            </div>
            <p class="text-sm text-gray-600 mt-2">敷地に対する建物面積の割合</p>
          </div>

          <!-- 容積率 -->
          <div class="criteria-card bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div class="flex items-center mb-3">
              <div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
                <i class="fas fa-building"></i>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">容積率</h4>
                <p class="text-xs text-gray-600">延床面積の上限</p>
              </div>
            </div>
            <div class="text-2xl font-bold text-green-700">
              ≥ 150%
            </div>
            <p class="text-sm text-gray-600 mt-2">敷地に対する延床面積の割合</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 検討外エリア -->
    <div class="mb-6">
      <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-600">
        <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <i class="fas fa-ban text-red-600 mr-2"></i>
          検討外エリア・条件
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="criteria-card bg-red-50 rounded-lg p-4 border border-red-200">
            <div class="flex items-center mb-2">
              <i class="fas fa-times-circle text-red-600 mr-2"></i>
              <span class="font-semibold text-gray-900">市街化調整区域</span>
            </div>
            <p class="text-sm text-gray-600">市街化を抑制すべき区域のため、原則として建築が制限されます</p>
          </div>
          <div class="criteria-card bg-red-50 rounded-lg p-4 border border-red-200">
            <div class="flex items-center mb-2">
              <i class="fas fa-times-circle text-red-600 mr-2"></i>
              <span class="font-semibold text-gray-900">防火地域</span>
            </div>
            <p class="text-sm text-gray-600">建築コストが高くなるため、対象外としています</p>
          </div>
        </div>
      </div>
    </div>

    <!-- スコアリング説明 -->
    <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
      <h3 class="text-xl font-bold mb-4 flex items-center">
        <i class="fas fa-chart-line mr-2"></i>
        自動判定システム
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white bg-opacity-20 rounded-lg p-4">
          <div class="text-3xl font-bold mb-2">100点</div>
          <div class="text-sm">
            <i class="fas fa-check-double mr-1"></i>
            <strong>PASS（合格）</strong>
          </div>
          <p class="text-xs mt-2 opacity-90">全ての条件を満たしています</p>
        </div>
        <div class="bg-white bg-opacity-20 rounded-lg p-4">
          <div class="text-3xl font-bold mb-2">50-99点</div>
          <div class="text-sm">
            <i class="fas fa-clipboard-check mr-1"></i>
            <strong>SPECIAL_REVIEW（要検討）</strong>
          </div>
          <p class="text-xs mt-2 opacity-90">一部条件を満たさないが検討価値あり</p>
        </div>
        <div class="bg-white bg-opacity-20 rounded-lg p-4">
          <div class="text-3xl font-bold mb-2">0点</div>
          <div class="text-sm">
            <i class="fas fa-times-circle mr-1"></i>
            <strong>FAIL（不合格）</strong>
          </div>
          <p class="text-xs mt-2 opacity-90">対象外エリアまたは条件不適合</p>
        </div>
      </div>
    </div>

    <!-- APIテストセクション（管理者のみ） -->
    <div id="api-test-section" class="mt-8 bg-gray-100 rounded-xl p-6 hidden">
      <h3 class="text-lg font-bold text-gray-900 mb-4">
        <i class="fas fa-vial text-purple-600 mr-2"></i>
        買取条件チェックテスト（管理者機能）
      </h3>
      <div class="bg-white rounded-lg p-4 mb-4">
        <form id="test-form" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <input type="text" id="test-location" placeholder="所在地（例：埼玉県さいたま市）" class="border rounded px-3 py-2 text-sm">
            <input type="number" id="test-walk" placeholder="駅徒歩（分）" class="border rounded px-3 py-2 text-sm">
            <input type="number" id="test-area" placeholder="土地面積（坪）" class="border rounded px-3 py-2 text-sm">
            <input type="number" id="test-frontage" placeholder="間口（m）" class="border rounded px-3 py-2 text-sm">
            <input type="text" id="test-coverage" placeholder="建ぺい率（例：60%）" class="border rounded px-3 py-2 text-sm">
            <input type="text" id="test-far" placeholder="容積率（例：200%）" class="border rounded px-3 py-2 text-sm">
          </div>
          <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full">
            <i class="fas fa-check-circle mr-2"></i>買取条件チェック実行
          </button>
        </form>
      </div>
      <div id="test-result" class="hidden bg-white rounded-lg p-4">
        <h4 class="font-bold text-gray-900 mb-2">チェック結果</h4>
        <div id="test-result-content" class="text-sm"></div>
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

    // 管理者の場合、APIテストセクションを表示
    if (user.role === 'ADMIN') {
      document.getElementById('api-test-section').classList.remove('hidden');
    }

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // 買取条件チェックテスト
    document.getElementById('test-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const testData = {
        id: 'test-deal-' + Date.now(),  // テスト用の一時的なID
        location: document.getElementById('test-location').value,
        walk_minutes: parseInt(document.getElementById('test-walk').value) || 0,
        land_area: document.getElementById('test-area').value + '坪',
        frontage: parseFloat(document.getElementById('test-frontage').value) || 0,
        building_coverage: document.getElementById('test-coverage').value,
        floor_area_ratio: document.getElementById('test-far').value,
      };

      try {
        const response = await axios.post('/api/purchase-criteria/check', testData, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        // APIレスポンス形式: {success: true, data: checkResult}
        const result = response.data.data;
        const resultDiv = document.getElementById('test-result');
        const contentDiv = document.getElementById('test-result-content');

        // APIは overall_result と check_score を返す
        const status = result.overall_result || result.status;
        const score = result.check_score !== undefined ? result.check_score : result.score;

        let statusColor = 'gray';
        let statusIcon = 'question-circle';
        if (status === 'PASS') {
          statusColor = 'green';
          statusIcon = 'check-circle';
        } else if (status === 'SPECIAL_REVIEW') {
          statusColor = 'yellow';
          statusIcon = 'clipboard-check';
        } else if (status === 'FAIL') {
          statusColor = 'red';
          statusIcon = 'times-circle';
        }

        // recommendations配列を使用（reasonsはv3.5.0以降非推奨）
        const reasons = result.recommendations || [];
        
        contentDiv.innerHTML = \`
          <div class="mb-3 p-3 bg-\${statusColor}-50 border border-\${statusColor}-200 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <i class="fas fa-\${statusIcon} text-\${statusColor}-600 mr-2"></i>
                <strong class="text-\${statusColor}-900">\${status}</strong>
              </div>
              <div class="text-2xl font-bold text-\${statusColor}-700">\${score}点</div>
            </div>
          </div>
          <div class="space-y-2">
            \${reasons.map(reason => \`
              <div class="flex items-start space-x-2 text-gray-700">
                <i class="fas fa-arrow-right text-gray-400 mt-1"></i>
                <span>\${reason}</span>
              </div>
            \`).join('')}
          </div>
        \`;

        resultDiv.classList.remove('hidden');
      } catch (error) {
        console.error('Check error:', error);
        alert('チェック実行に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    });
  </script>
</body>
</html>
  `);
});

// 建築基準法ページ
app.get('/building-regulations', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>建築基準法チェック - 200棟土地仕入れ管理システム</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    body {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
  </style>
</head>
<body class="min-h-screen">
  <!-- Header -->
  <header class="bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800 text-white shadow-2xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
            <i class="fas fa-building text-4xl"></i>
            建築基準法チェック
          </h1>
          <p class="mt-2 text-orange-100">3階建て木造建築の規制自動判定</p>
        </div>
        <a href="/dashboard" class="bg-white text-orange-700 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition shadow-lg">
          <i class="fas fa-arrow-left mr-2"></i>戻る
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Input Form -->
    <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">
        <i class="fas fa-edit text-orange-600 mr-2"></i>物件情報入力
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">所在地</label>
          <input type="text" id="location" placeholder="東京都渋谷区" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">用途地域</label>
          <select id="zoning" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            <option value="">選択してください</option>
            <option value="第一種低層住居専用地域">第一種低層住居専用地域</option>
            <option value="第二種低層住居専用地域">第二種低層住居専用地域</option>
            <option value="第一種中高層住居専用地域">第一種中高層住居専用地域</option>
            <option value="第二種中高層住居専用地域">第二種中高層住居専用地域</option>
            <option value="第一種住居地域">第一種住居地域</option>
            <option value="第二種住居地域">第二種住居地域</option>
            <option value="準住居地域">準住居地域</option>
            <option value="近隣商業地域">近隣商業地域</option>
            <option value="商業地域">商業地域</option>
            <option value="準工業地域">準工業地域</option>
            <option value="工業地域">工業地域</option>
            <option value="工業専用地域">工業専用地域</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">防火地域</label>
          <select id="fire_zone" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            <option value="">なし</option>
            <option value="防火地域">防火地域</option>
            <option value="準防火地域">準防火地域</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">高度地区</label>
          <input type="text" id="height_district" placeholder="第1種高度地区" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">現況</label>
          <input type="text" id="current_status" placeholder="木造2階建て" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">構造</label>
          <select id="structure" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            <option value="">選択してください</option>
            <option value="木造">木造</option>
            <option value="鉄骨造">鉄骨造</option>
            <option value="RC造">RC造</option>
            <option value="SRC造">SRC造</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">階数</label>
          <input type="number" id="floors" placeholder="3" min="1" max="10" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
        </div>
      </div>
      
      <div class="mt-8">
        <button onclick="checkBuildingRegulations()" class="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold py-4 rounded-lg hover:from-orange-700 hover:to-orange-800 transition shadow-lg">
          <i class="fas fa-search mr-2"></i>建築基準法をチェック
        </button>
      </div>
    </div>

    <!-- Results -->
    <div id="results" class="hidden">
      <!-- Summary -->
      <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          <i class="fas fa-clipboard-check text-green-600 mr-2"></i>チェック結果
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="bg-blue-50 rounded-lg p-6">
            <div class="text-sm text-blue-600 font-medium">適用規定数</div>
            <div id="regulation-count" class="text-3xl font-bold text-blue-900 mt-2">-</div>
          </div>
          
          <div id="three-story-warning" class="hidden bg-orange-50 rounded-lg p-6">
            <div class="text-sm text-orange-600 font-medium">3階建て木造</div>
            <div class="text-lg font-bold text-orange-900 mt-2">特別規定適用</div>
          </div>
          
          <div id="fire-zone-info" class="hidden bg-red-50 rounded-lg p-6">
            <div class="text-sm text-red-600 font-medium">防火規制</div>
            <div class="text-lg font-bold text-red-900 mt-2">準耐火以上必須</div>
          </div>
        </div>
      </div>

      <!-- Applicable Regulations -->
      <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          <i class="fas fa-list-ul text-orange-600 mr-2"></i>適用される建築基準法・条例
        </h3>
        <div id="regulations-list" class="space-y-4"></div>
      </div>

      <!-- Warnings -->
      <div id="warnings-section" class="hidden bg-white rounded-xl shadow-lg p-8 mb-8">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>注意事項
        </h3>
        <div id="warnings-list" class="space-y-4"></div>
      </div>

      <!-- Special Requirements -->
      <div id="special-requirements-section" class="hidden bg-white rounded-xl shadow-lg p-8">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          <i class="fas fa-star text-yellow-600 mr-2"></i>特別な要件
        </h3>
        <div id="special-requirements-list" class="space-y-4"></div>
      </div>
    </div>
  </main>

  <script>
    async function checkBuildingRegulations() {
      try {
        const location = document.getElementById('location').value;
        const zoning = document.getElementById('zoning').value;
        const fire_zone = document.getElementById('fire_zone').value;
        const height_district = document.getElementById('height_district').value;
        const current_status = document.getElementById('current_status').value;
        const structure = document.getElementById('structure').value;
        const floors = document.getElementById('floors').value;
        
        if (!location || !zoning) {
          alert('所在地と用途地域を入力してください');
          return;
        }
        
        // URLパラメータを明示的にエンコード（Cloudflare Worker対応）
        const params = {
          location,
          zoning,
          fire_zone: fire_zone || '',
          height_district: height_district || '',
          current_status: current_status || '',
          structure: structure || '',
          floors: floors || ''
        };
        
        const response = await axios.get('/api/building-regulations/check', { params });
        
        if (response.data.success) {
          displayResults(response.data.data);
        } else {
          alert('エラー: ' + response.data.error);
        }
      } catch (error) {
        console.error('Building regulations check error:', error);
        alert('建築基準法チェックに失敗しました');
      }
    }
    
    function displayResults(data) {
      document.getElementById('results').classList.remove('hidden');
      
      // Summary
      const totalCount = data.applicable_regulations.length + (data.municipal_regulations ? data.municipal_regulations.length : 0);
      document.getElementById('regulation-count').textContent = totalCount;
      
      if (data.is_three_story_wooden) {
        document.getElementById('three-story-warning').classList.remove('hidden');
      }
      
      if (data.fire_resistance_required) {
        document.getElementById('fire-zone-info').classList.remove('hidden');
      }
      
      // Regulations list - 建築基準法
      const regulationsList = document.getElementById('regulations-list');
      let html = '<h3 class="text-lg font-bold text-gray-900 mb-4"><i class="fas fa-book-open mr-2 text-blue-600"></i>建築基準法</h3>';
      html += data.applicable_regulations.map(reg => \`
        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition mb-3">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <i class="fas fa-gavel text-orange-600 mt-1"></i>
            </div>
            <div class="ml-3 flex-1">
              <h4 class="font-semibold text-gray-900">\${reg.title || reg.law_name || '規定'}</h4>
              <p class="text-sm text-gray-600 mt-1">\${reg.description || ''}</p>
              <div class="mt-2 text-xs text-gray-500">
                <i class="fas fa-book mr-1"></i>\${reg.article || ''}
              </div>
            </div>
          </div>
        </div>
      \`).join('');
      
      // 自治体条例情報を追加
      if (data.municipal_regulations && data.municipal_regulations.length > 0) {
        html += '<h3 class="text-lg font-bold text-gray-900 mb-4 mt-6"><i class="fas fa-landmark mr-2 text-green-600"></i>自治体条例・規則</h3>';
        html += data.municipal_regulations.map(reg => {
          const categoryIcons = {
            'PARKING': 'fa-parking',
            'THREE_STORY_WOODEN': 'fa-building',
            'DISPUTE_PREVENTION': 'fa-handshake',
            'LANDSCAPE': 'fa-tree',
            'FIRE_PREVENTION': 'fa-fire-extinguisher',
            'HEIGHT_DISTRICT': 'fa-ruler-vertical',
            'OTHER': 'fa-file-alt'
          };
          const icon = categoryIcons[reg.category] || 'fa-file-alt';
          return \`
            <div class="border border-green-200 rounded-lg p-4 hover:bg-green-50 transition mb-3">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <i class="fas \${icon} text-green-600 mt-1"></i>
                </div>
                <div class="ml-3 flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-semibold text-gray-900">\${reg.title}</h4>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">\${reg.city}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">\${reg.description}</p>
                  <div class="mt-2 text-xs text-gray-500 space-y-1">
                    <div><i class="fas fa-check-circle mr-1"></i>適用条件: \${reg.applicable_conditions}</div>
                    <div><i class="fas fa-clipboard-list mr-1"></i>要件: \${reg.requirements}</div>
                    <div><i class="fas fa-book mr-1"></i>\${reg.ordinance_name || ''}</div>
                    \${reg.reference_url ? \`<div><i class="fas fa-external-link-alt mr-1"></i><a href="\${reg.reference_url}" target="_blank" class="text-blue-600 hover:underline">詳細情報</a></div>\` : ''}
                  </div>
                </div>
              </div>
            </div>
          \`;
        }).join('');
      }
      
      regulationsList.innerHTML = html;
      
      // Warnings
      if (data.warnings && data.warnings.length > 0) {
        document.getElementById('warnings-section').classList.remove('hidden');
        const warningsList = document.getElementById('warnings-list');
        warningsList.innerHTML = data.warnings.map(warning => \`
          <div class="flex items-start bg-red-50 border border-red-200 rounded-lg p-4">
            <i class="fas fa-exclamation-circle text-red-600 mt-1"></i>
            <p class="ml-3 text-red-800">\${warning}</p>
          </div>
        \`).join('');
      }
      
      // Special requirements
      if (data.special_requirements && data.special_requirements.length > 0) {
        document.getElementById('special-requirements-section').classList.remove('hidden');
        const specialList = document.getElementById('special-requirements-list');
        specialList.innerHTML = data.special_requirements.map(req => \`
          <div class="flex items-start bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <i class="fas fa-star text-yellow-600 mt-1"></i>
            <p class="ml-3 text-yellow-800">\${req}</p>
          </div>
        \`).join('');
      }
      
      // Scroll to results
      document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }
  </script>
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
          <a href="/purchase-criteria" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-clipboard-check mr-2"></i>買取条件
          </a>
          <a href="/showcase" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-images mr-2"></i>ショーケース
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

    <!-- クイックアクセスカード -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- 新規案件作成 -->
      <a href="/deals/new" class="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg hover:shadow-2xl transition p-6 text-white hover:scale-105">
        <div class="flex items-center space-x-4">
          <div class="bg-white bg-opacity-20 rounded-full p-3">
            <i class="fas fa-plus-circle text-3xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold">新規案件</h3>
            <p class="text-sm text-green-100 mt-1">OCR自動入力対応</p>
          </div>
        </div>
      </a>

      <!-- 建築基準法チェック -->
      <a href="/building-regulations" class="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-lg hover:shadow-2xl transition p-6 text-white hover:scale-105">
        <div class="flex items-center space-x-4">
          <div class="bg-white bg-opacity-20 rounded-full p-3">
            <i class="fas fa-building text-3xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold">建築基準法</h3>
            <p class="text-sm text-orange-100 mt-1">規制チェック</p>
          </div>
        </div>
      </a>
    </div>

    <!-- ナビゲーションタブ -->
    <div class="bg-white rounded-xl shadow-lg mb-6 border border-slate-200">
      <div class="border-b border-slate-200">
        <nav class="flex space-x-8 px-6" aria-label="Tabs">
          <button 
            onclick="switchDashboardTab('overview')" 
            id="tab-overview"
            class="dashboard-tab border-b-2 border-blue-600 py-4 px-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
            <i class="fas fa-chart-line mr-2"></i>概要
          </button>
          <a href="/deals" class="border-b-2 border-transparent py-4 px-1 text-sm font-semibold text-gray-600 hover:text-blue-700 transition">
            <i class="fas fa-list mr-2"></i>案件一覧
          </a>
          <button 
            onclick="switchDashboardTab('files')" 
            id="tab-files-admin"
            class="dashboard-tab border-b-2 border-transparent py-4 px-1 text-sm font-semibold text-gray-600 hover:text-blue-700 transition"
            style="display: none;">
            <i class="fas fa-folder-open mr-2"></i>ファイル管理
          </button>
          <button 
            onclick="switchDashboardTab('login-history')" 
            id="tab-login-history"
            class="dashboard-tab border-b-2 border-transparent py-4 px-1 text-sm font-semibold text-gray-600 hover:text-blue-700 transition">
            <i class="fas fa-history mr-2"></i>ログイン履歴
          </button>
        </nav>
      </div>
    </div>

    <!-- 概要タブ -->
    <div id="content-overview" class="dashboard-content">
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
    </div>

    <!-- ログイン履歴タブ -->
    <div id="content-login-history" class="dashboard-content hidden">
      <div class="bg-white rounded-xl shadow-lg border border-slate-200">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">
            <i class="fas fa-history mr-2"></i>ログイン履歴
          </h2>
          <div class="text-sm text-gray-600">
            <span id="login-history-count">-</span> 件
          </div>
        </div>

        <!-- 統計情報 -->
        <div class="p-6 border-b">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 rounded-lg p-4">
              <div class="text-sm text-green-600 font-medium">成功したログイン</div>
              <div id="login-success-count" class="text-2xl font-bold text-green-900 mt-1">-</div>
            </div>
            <div class="bg-red-50 rounded-lg p-4">
              <div class="text-sm text-red-600 font-medium">失敗したログイン</div>
              <div id="login-failure-count" class="text-2xl font-bold text-red-900 mt-1">-</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="text-sm text-blue-600 font-medium">最終ログイン</div>
              <div id="last-login-time" class="text-lg font-bold text-blue-900 mt-1">-</div>
            </div>
          </div>
        </div>

        <!-- フィルター -->
        <div class="p-6 border-b">
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <label class="text-sm text-gray-600 mb-1 block">ステータス</label>
              <select id="login-history-status-filter" class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full">
                <option value="all">全て</option>
                <option value="success">成功のみ</option>
                <option value="failure">失敗のみ</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="text-sm text-gray-600 mb-1 block">表示件数</label>
              <select id="login-history-limit" class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full">
                <option value="20">20件</option>
                <option value="50" selected>50件</option>
                <option value="100">100件</option>
              </select>
            </div>
            <div class="pt-5">
              <button onclick="loadLoginHistory()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                <i class="fas fa-sync-alt mr-2"></i>更新
              </button>
            </div>
          </div>
        </div>

        <!-- ログイン履歴一覧 -->
        <div class="p-6">
          <div id="login-history-list" class="space-y-2">
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
              <p>読み込み中...</p>
            </div>
          </div>
        </div>

        <!-- ページネーション -->
        <div id="login-history-pagination" class="px-6 pb-6 hidden">
          <div class="flex items-center justify-between">
            <button onclick="loadLoginHistory(0)" id="prev-page" class="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400" disabled>
              <i class="fas fa-chevron-left mr-1"></i>前へ
            </button>
            <div class="text-sm text-gray-600">
              ページ <span id="current-page">1</span> / <span id="total-pages">1</span>
            </div>
            <button onclick="loadLoginHistory(1)" id="next-page" class="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400">
              次へ<i class="fas fa-chevron-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ファイル管理タブ（管理者専用） -->
    <div id="content-files-admin" class="dashboard-content hidden">
      <div class="bg-white rounded-xl shadow-lg border border-slate-200">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold text-gray-900">
            <i class="fas fa-folder-open mr-2"></i>全ユーザーのファイル管理
          </h2>
        </div>

        <!-- 統計情報 -->
        <div class="p-6 border-b">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="text-sm text-blue-600 font-medium">総ファイル数</div>
              <div id="stats-total-files" class="text-2xl font-bold text-blue-900 mt-1">-</div>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
              <div class="text-sm text-green-600 font-medium">総ストレージ使用量</div>
              <div id="stats-total-size" class="text-2xl font-bold text-green-900 mt-1">-</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-4">
              <div class="text-sm text-purple-600 font-medium">登録ユーザー数</div>
              <div id="stats-user-count" class="text-2xl font-bold text-purple-900 mt-1">-</div>
            </div>
          </div>
        </div>

        <!-- ユーザー別統計 -->
        <div class="p-6 border-b">
          <h3 class="text-md font-semibold text-gray-900 mb-4">ユーザー別統計</h3>
          <div id="user-stats-list" class="space-y-2">
            <div class="text-center py-4 text-gray-500">
              <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <p>読み込み中...</p>
            </div>
          </div>
        </div>

        <!-- ファイル一覧 -->
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-md font-semibold text-gray-900">全ファイル一覧</h3>
            <div class="flex items-center space-x-2">
              <input 
                type="text" 
                id="file-search-input" 
                placeholder="ファイル名で検索..." 
                class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
              <select id="file-type-filter" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">全タイプ</option>
                <option value="ocr">OCR資料</option>
                <option value="image">画像</option>
                <option value="document">書類</option>
                <option value="registry">登記簿謄本</option>
                <option value="proposal">提案書</option>
                <option value="report">報告書</option>
              </select>
            </div>
          </div>
          <div id="admin-files-list" class="divide-y">
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
              <p>読み込み中...</p>
            </div>
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

    // タブ切り替え
    function switchDashboardTab(tab) {
      // タブボタンのスタイル更新
      document.querySelectorAll('.dashboard-tab').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-600');
      });
      const activeTab = document.getElementById('tab-' + tab);
      if (activeTab) {
        activeTab.classList.remove('border-transparent', 'text-gray-600');
        activeTab.classList.add('border-blue-600', 'text-blue-600');
      }

      // コンテンツの表示切替
      document.querySelectorAll('.dashboard-content').forEach(content => {
        content.classList.add('hidden');
      });
      const activeContent = document.getElementById('content-' + tab + (tab === 'files' ? '-admin' : ''));
      if (activeContent) {
        activeContent.classList.remove('hidden');
      }

      // タブ切り替え時にデータをロード
      if (tab === 'files') {
        loadAdminFiles();
      } else if (tab === 'login-history') {
        loadLoginHistory();
      }
    }

    // 管理者向けファイル一覧読み込み
    let allFiles = [];
    async function loadAdminFiles() {
      try {
        const response = await axios.get('/api/deals/admin/files/all', {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        allFiles = response.data.files || [];
        const stats = response.data.statistics;

        // 統計情報を更新
        document.getElementById('stats-total-files').textContent = stats.total_files.toLocaleString();
        document.getElementById('stats-total-size').textContent = formatFileSize(stats.total_size);
        document.getElementById('stats-user-count').textContent = stats.user_stats.length.toLocaleString();

        // ユーザー別統計を表示
        displayUserStats(stats.user_stats);

        // ファイル一覧を表示
        displayAdminFiles(allFiles);
      } catch (error) {
        console.error('Failed to load admin files:', error);
        document.getElementById('admin-files-list').innerHTML = 
          '<div class="text-center py-8 text-red-600"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>ファイル読み込みに失敗しました</p></div>';
      }
    }

    // ユーザー別統計を表示
    function displayUserStats(userStats) {
      const container = document.getElementById('user-stats-list');
      
      if (userStats.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-gray-500"><i class="fas fa-users text-3xl mb-2 text-gray-400"></i><p>統計データがありません</p></div>';
        return;
      }

      // ファイル数でソート（降順）
      const sortedStats = [...userStats].sort((a, b) => b.file_count - a.file_count);

      container.innerHTML = sortedStats.map(stat => \`
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition">
          <div class="flex items-center space-x-3">
            <i class="fas fa-user-circle text-blue-600 text-xl"></i>
            <div>
              <div class="font-medium text-gray-900">\${stat.user_name || '名前なし'}</div>
              <div class="text-xs text-gray-500">\${stat.file_count} ファイル</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-gray-900">\${formatFileSize(stat.total_size)}</div>
            <div class="text-xs text-gray-500">使用中</div>
          </div>
        </div>
      \`).join('');
    }

    // ファイルサイズをフォーマット
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    // ログイン履歴を読み込み
    let currentOffset = 0;
    async function loadLoginHistory(direction = 0) {
      try {
        const limit = parseInt(document.getElementById('login-history-limit').value);
        const statusFilter = document.getElementById('login-history-status-filter').value;
        
        // ページネーション
        if (direction === 0) {
          currentOffset = Math.max(0, currentOffset - limit);
        } else if (direction === 1) {
          currentOffset += limit;
        } else {
          currentOffset = 0; // リセット
        }

        const response = await axios.get('/api/auth/login-history', {
          params: { limit, offset: currentOffset },
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const history = response.data.history || [];
        const total = response.data.total || 0;

        // フィルタリング
        let filteredHistory = history;
        if (statusFilter === 'success') {
          filteredHistory = history.filter(h => h.success === 1);
        } else if (statusFilter === 'failure') {
          filteredHistory = history.filter(h => h.success === 0);
        }

        // 統計情報を更新
        const successCount = history.filter(h => h.success === 1).length;
        const failureCount = history.filter(h => h.success === 0).length;
        const lastLogin = history.length > 0 ? history[0] : null;

        document.getElementById('login-history-count').textContent = total.toLocaleString();
        document.getElementById('login-success-count').textContent = successCount.toLocaleString();
        document.getElementById('login-failure-count').textContent = failureCount.toLocaleString();
        document.getElementById('last-login-time').textContent = lastLogin 
          ? formatDateTime(lastLogin.login_at) 
          : '記録なし';

        // 履歴一覧を表示
        displayLoginHistory(filteredHistory);

        // ページネーション更新
        const totalPages = Math.ceil(total / limit);
        const currentPage = Math.floor(currentOffset / limit) + 1;
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        document.getElementById('prev-page').disabled = currentOffset === 0;
        document.getElementById('next-page').disabled = currentOffset + limit >= total;
        document.getElementById('login-history-pagination').classList.remove('hidden');

      } catch (error) {
        console.error('Failed to load login history:', error);
        document.getElementById('login-history-list').innerHTML = 
          '<div class="text-center py-8 text-red-600"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>ログイン履歴の読み込みに失敗しました</p></div>';
      }
    }

    // ログイン履歴を表示
    function displayLoginHistory(history) {
      const container = document.getElementById('login-history-list');
      
      if (history.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-history text-4xl mb-3 text-gray-400"></i><p>ログイン履歴がありません</p></div>';
        return;
      }

      container.innerHTML = history.map(record => {
        const isSuccess = record.success === 1;
        const statusColor = isSuccess ? 'green' : 'red';
        const statusIcon = isSuccess ? 'check-circle' : 'exclamation-circle';
        const statusText = isSuccess ? '成功' : '失敗';
        
        return \`
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
            <div class="flex items-center space-x-4 flex-1">
              <div class="bg-\${statusColor}-100 rounded-full p-2">
                <i class="fas fa-\${statusIcon} text-\${statusColor}-600 text-lg"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-3">
                  <span class="font-medium text-gray-900">\${record.email || '不明'}</span>
                  \${record.user_name ? \`<span class="text-sm text-gray-600">(\${record.user_name})</span>\` : ''}
                  <span class="text-xs px-2 py-1 rounded-full bg-\${statusColor}-100 text-\${statusColor}-700 font-medium">
                    \${statusText}
                  </span>
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  <i class="fas fa-clock mr-1"></i>\${formatDateTime(record.login_at)}
                  <span class="mx-2">|</span>
                  <i class="fas fa-network-wired mr-1"></i>IP: \${record.ip_address || '不明'}
                </div>
                \${!isSuccess && record.failure_reason ? \`
                  <div class="text-sm text-red-600 mt-1">
                    <i class="fas fa-info-circle mr-1"></i>理由: \${record.failure_reason}
                  </div>
                \` : ''}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500 truncate max-w-xs" title="\${record.user_agent || '不明'}">
                <i class="fas fa-desktop mr-1"></i>\${truncateUserAgent(record.user_agent)}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // 日時をフォーマット
    function formatDateTime(dateString) {
      if (!dateString) return '不明';
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    }

    // User-Agentを短縮
    function truncateUserAgent(ua) {
      if (!ua) return '不明';
      if (ua.length > 50) {
        return ua.substring(0, 50) + '...';
      }
      return ua;
    }

    // ファイル一覧を表示
    function displayAdminFiles(files) {
      const container = document.getElementById('admin-files-list');
      
      if (files.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-folder-open text-4xl mb-3 text-gray-400"></i><p>ファイルがありません</p><p class="text-sm mt-2">ユーザーがファイルをアップロードすると、ここに表示されます。</p></div>';
        return;
      }

      container.innerHTML = files.map(file => {
        const iconClass = file.file_type === 'ocr' ? 'fa-file-pdf text-red-500' :
                         file.file_type === 'image' ? 'fa-image text-blue-500' :
                         'fa-file text-gray-500';
        const formattedSize = formatFileSize(file.file_size);
        
        return \`
        <div class="p-4 hover:bg-gray-50 transition">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 flex-1">
              <i class="fas \${iconClass} text-2xl"></i>
              <div class="flex-1">
                <div class="font-medium text-gray-900">\${file.file_name}</div>
                <div class="text-sm text-gray-500 space-x-2">
                  <span class="px-2 py-1 bg-gray-100 rounded text-xs">\${file.file_type}</span>
                  \${file.is_ocr_source ? '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"><i class="fas fa-robot"></i> OCR</span>' : ''}
                  <span class="ml-2">\${formattedSize}</span>
                  <span class="ml-2">\${new Date(file.uploaded_at).toLocaleString('ja-JP')}</span>
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  <i class="fas fa-user mr-1"></i>\${file.user_name || '不明'}
                  <i class="fas fa-map-marker-alt ml-3 mr-1"></i>\${file.deal_location || '場所不明'}
                </div>
              </div>
            </div>
            <div class="flex space-x-2">
              <button 
                onclick="downloadAdminFile('\${file.deal_id}', '\${file.id}')" 
                class="text-blue-600 hover:text-blue-800 transition" 
                title="ダウンロード">
                <i class="fas fa-download"></i>
              </button>
            </div>
          </div>
        </div>
      \`;
      }).join('');
    }

    // ファイルダウンロード（管理者用）
    window.downloadAdminFile = function(dealId, fileId) {
      window.location.href = \`/api/deals/\${dealId}/files/\${fileId}/download?token=\${token}\`;
    };

    // ファイル検索・フィルター
    function filterFiles() {
      const searchTerm = document.getElementById('file-search-input').value.toLowerCase();
      const fileType = document.getElementById('file-type-filter').value;

      const filtered = allFiles.filter(file => {
        const matchesSearch = file.file_name.toLowerCase().includes(searchTerm);
        const matchesType = !fileType || file.file_type === fileType;
        return matchesSearch && matchesType;
      });

      displayAdminFiles(filtered);
    }

    // イベントリスナー設定
    document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('file-search-input');
      const typeFilter = document.getElementById('file-type-filter');
      
      if (searchInput) {
        searchInput.addEventListener('input', filterFiles);
      }
      if (typeFilter) {
        typeFilter.addEventListener('change', filterFiles);
      }
    });

    // ページ読み込み後に初期化(window.load で確実に実行)
    window.addEventListener('load', function() {
      // ユーザー情報表示
      if (user.name) {
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('user-role').textContent = user.role === 'ADMIN' ? '管理者' : 'ユーザー';
        
        // 管理者の場合、ファイル管理タブを表示
        if (user.role === 'ADMIN') {
          const filesTab = document.getElementById('tab-files-admin');
          if (filesTab) {
            filesTab.style.display = 'block';
          }
        }
      }

      // KPIデータ読み込み
      loadKPIs();
    });
  </script>
</body>
</html>
  `);
});

// 旧/galleryパスからのリダイレクト（後方互換性のため）
app.get('/gallery', (c) => {
  return c.redirect('/showcase', 301);
});

// 物件OCRアップロード専用ページは/deals/newに統合されました（後方互換性のため残す）
app.get('/property-ocr', (c) => {
  return c.redirect('/deals/new', 301);
});

// 物件OCRアップロード専用ページ（旧実装 - v3.4.0で統合のため使用されない）
app.get('/property-ocr-legacy', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>物件OCRアップロード - 200棟土地仕入れ管理システム</title>
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
    .drop-zone {
      border: 3px dashed #cbd5e1;
      transition: all 0.3s ease;
      min-height: 300px;
    }
    .drop-zone.dragover {
      border-color: #3b82f6;
      background-color: #eff6ff;
      transform: scale(1.02);
    }
    .file-preview {
      position: relative;
      transition: all 0.2s ease;
    }
    .file-preview:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    .file-preview img {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    .remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .remove-btn:hover {
      background: rgba(220, 38, 38, 1);
      transform: scale(1.1);
    }
    .result-card {
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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
    <!-- ページヘッダー -->
    <div class="mb-8">
      <h2 class="text-3xl font-bold text-gray-900 mb-2">
        <i class="fas fa-camera text-blue-600 mr-3"></i>
        物件OCRアップロード
      </h2>
      <p class="text-gray-600">登記簿謄本や物件資料から物件情報を自動抽出します（最大10ファイル）</p>
    </div>

    <!-- ステップインジケーター -->
    <div class="mb-8 flex items-center justify-center space-x-4">
      <div class="flex items-center">
        <div id="step1-indicator" class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          1
        </div>
        <span class="ml-2 text-gray-700 font-medium">ファイル選択</span>
      </div>
      <div class="w-16 h-1 bg-gray-300" id="step1-line"></div>
      <div class="flex items-center">
        <div id="step2-indicator" class="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">
          2
        </div>
        <span class="ml-2 text-gray-500 font-medium">OCR処理</span>
      </div>
      <div class="w-16 h-1 bg-gray-300" id="step2-line"></div>
      <div class="flex items-center">
        <div id="step3-indicator" class="w-10 h-10 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center font-bold">
          3
        </div>
        <span class="ml-2 text-gray-500 font-medium">結果確認</span>
      </div>
    </div>

    <!-- ドロップゾーン -->
    <div id="upload-section" class="bg-white rounded-xl shadow-lg p-8 mb-6">
      <div id="drop-zone" class="drop-zone rounded-lg flex flex-col items-center justify-center cursor-pointer">
        <i class="fas fa-cloud-upload-alt text-6xl text-blue-500 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-800 mb-2">ファイルをドラッグ＆ドロップ</h3>
        <p class="text-gray-600 mb-4">または</p>
        <label for="file-input" class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 cursor-pointer transition text-lg font-medium">
          <i class="fas fa-folder-open mr-2"></i>ファイルを選択
        </label>
        <input type="file" id="file-input" accept="image/*,application/pdf,.pdf" class="hidden" multiple>
        <p class="text-sm text-gray-500 mt-4">PNG, JPG, JPEG, WEBP, PDF形式 / 最大10ファイル / 1ファイル最大10MB</p>
      </div>

      <!-- ファイルプレビュー -->
      <div id="file-preview-container" class="hidden mt-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          選択されたファイル（<span id="file-count">0</span>個）
        </h3>
        <div id="file-preview-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <!-- プレビューがここに表示されます -->
        </div>
        <div class="flex justify-end space-x-4">
          <button id="clear-files-btn" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <i class="fas fa-times mr-2"></i>クリア
          </button>
          <button id="process-btn" class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            <i class="fas fa-magic mr-2"></i>OCR処理を開始
          </button>
        </div>
      </div>
    </div>

    <!-- 処理中表示 -->
    <div id="processing-section" class="hidden bg-white rounded-xl shadow-lg p-8 mb-6">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-6xl text-blue-600 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-800 mb-2">OCR処理中...</h3>
        <p class="text-gray-600">物件情報を抽出しています。しばらくお待ちください。</p>
      </div>
    </div>

    <!-- 結果表示 -->
    <div id="result-section" class="hidden">
      <div class="bg-white rounded-xl shadow-lg p-8 mb-6 result-card">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-900">
            <i class="fas fa-check-circle text-green-600 mr-2"></i>
            抽出完了
          </h3>
          <span id="processed-files-count" class="text-sm text-gray-600"></span>
        </div>

        <!-- 抽出結果フォーム -->
        <form id="extracted-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 物件タイトル -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">物件タイトル</label>
            <input type="text" id="extracted_title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 所在地 -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">所在地</label>
            <input type="text" id="extracted_location" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 最寄り駅 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">最寄り駅</label>
            <input type="text" id="extracted_station" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 徒歩分数 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">徒歩分数</label>
            <input type="text" id="extracted_walk_minutes" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 土地面積 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">土地面積</label>
            <input type="text" id="extracted_land_area" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 建物面積 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">建物面積</label>
            <input type="text" id="extracted_building_area" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 用途地域 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">用途地域</label>
            <input type="text" id="extracted_zoning" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 建ぺい率 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">建ぺい率</label>
            <input type="text" id="extracted_building_coverage" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 容積率 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">容積率</label>
            <input type="text" id="extracted_floor_area_ratio" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 価格 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">価格</label>
            <input type="text" id="extracted_price" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 構造 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">構造</label>
            <input type="text" id="extracted_structure" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 築年月 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">築年月</label>
            <input type="text" id="extracted_built_year" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 道路情報 -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">道路情報</label>
            <input type="text" id="extracted_road_info" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 現況 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">現況</label>
            <input type="text" id="extracted_current_status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 表面利回り -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">表面利回り</label>
            <input type="text" id="extracted_yield" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>

          <!-- 賃貸状況 -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">賃貸状況</label>
            <input type="text" id="extracted_occupancy" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </form>

        <!-- アクションボタン -->
        <div class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button id="reset-btn" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <i class="fas fa-redo mr-2"></i>最初からやり直す
          </button>
          <button id="create-deal-btn" class="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium">
            <i class="fas fa-plus-circle mr-2"></i>この情報で案件を作成
          </button>
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

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // 状態管理
    let selectedFiles = [];
    let extractedData = null;

    // ページ読み込み後に初期化(window.load で確実に実行)
    window.addEventListener('load', function() {
      // ユーザー名表示
      if (user.name) {
        document.getElementById('user-name').textContent = user.name;
      }

      // DOM要素
      const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const filePreviewGrid = document.getElementById('file-preview-grid');
    const fileCount = document.getElementById('file-count');
    const clearFilesBtn = document.getElementById('clear-files-btn');
    const processBtn = document.getElementById('process-btn');
    const uploadSection = document.getElementById('upload-section');
    const processingSection = document.getElementById('processing-section');
    const resultSection = document.getElementById('result-section');
    const resetBtn = document.getElementById('reset-btn');
    const createDealBtn = document.getElementById('create-deal-btn');

    // ステップインジケーター更新
    function updateStep(step) {
      const steps = [1, 2, 3];
      steps.forEach(s => {
        const indicator = document.getElementById(\`step\${s}-indicator\`);
        const line = document.getElementById(\`step\${s}-line\`);
        
        if (s < step) {
          indicator.classList.remove('bg-gray-300', 'text-gray-500', 'bg-blue-600');
          indicator.classList.add('bg-green-600', 'text-white');
          indicator.innerHTML = '<i class="fas fa-check"></i>';
          if (line) line.classList.add('bg-green-600');
        } else if (s === step) {
          indicator.classList.remove('bg-gray-300', 'text-gray-500');
          indicator.classList.add('bg-blue-600', 'text-white');
          indicator.textContent = s;
        } else {
          indicator.classList.remove('bg-blue-600', 'bg-green-600');
          indicator.classList.add('bg-gray-300', 'text-gray-500');
          indicator.textContent = s;
        }
      });
    }

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
      
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    });

    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      handleFiles(files);
    });

    // ファイル処理
    function handleFiles(files) {
      // ファイル数チェック
      if (selectedFiles.length + files.length > 10) {
        alert('最大10ファイルまでアップロードできます');
        return;
      }

      files.forEach(file => {
        // ファイル形式チェック
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          alert(\`"\${file.name}" は対応していないファイル形式です\`);
          return;
        }

        // ファイルサイズチェック
        if (file.size > 10 * 1024 * 1024) {
          alert(\`"\${file.name}" のサイズが大きすぎます（最大10MB）\`);
          return;
        }

        selectedFiles.push(file);
      });

      updateFilePreview();
    }

    // プレビュー更新
    function updateFilePreview() {
      if (selectedFiles.length === 0) {
        filePreviewContainer.classList.add('hidden');
        return;
      }

      filePreviewContainer.classList.remove('hidden');
      fileCount.textContent = selectedFiles.length;
      filePreviewGrid.innerHTML = '';

      selectedFiles.forEach((file, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'file-preview bg-white rounded-lg shadow overflow-hidden';
        
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            previewDiv.innerHTML = \`
              <img src="\${e.target.result}" alt="\${file.name}">
              <div class="p-2 text-xs text-gray-600 truncate">\${file.name}</div>
              <button class="remove-btn" onclick="removeFile(\${index})">
                <i class="fas fa-times"></i>
              </button>
            \`;
          };
          reader.readAsDataURL(file);
        } else {
          previewDiv.innerHTML = \`
            <div class="h-[150px] bg-gray-100 flex items-center justify-center">
              <i class="fas fa-file-pdf text-5xl text-red-500"></i>
            </div>
            <div class="p-2 text-xs text-gray-600 truncate">\${file.name}</div>
            <button class="remove-btn" onclick="removeFile(\${index})">
              <i class="fas fa-times"></i>
            </button>
          \`;
        }

        filePreviewGrid.appendChild(previewDiv);
      });
    }

    // ファイル削除
    window.removeFile = function(index) {
      selectedFiles.splice(index, 1);
      updateFilePreview();
    };

    // 全ファイルクリア
    clearFilesBtn.addEventListener('click', () => {
      selectedFiles = [];
      fileInput.value = '';
      updateFilePreview();
    });

    // OCR処理開始（once:trueで1回のみ実行）
    if (processBtn && !processBtn.dataset.listenerAttached) {
      processBtn.dataset.listenerAttached = 'true';
      processBtn.addEventListener('click', async () => {
      if (selectedFiles.length === 0) {
        alert('ファイルを選択してください');
        return;
      }

      uploadSection.classList.add('hidden');
      processingSection.classList.remove('hidden');
      updateStep(2);

      try {
        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
          formData.append(\`file\${index}\`, file);
        });

        const response = await axios.post('/api/property-ocr/extract-multiple', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });

        extractedData = response.data.data;
        
        // 結果をフォームに表示
        displayExtractedData(extractedData);
        
        processingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        updateStep(3);

        // 処理したファイル数表示
        document.getElementById('processed-files-count').textContent = 
          \`\${response.data.processed_files.length} / \${response.data.total_files} ファイル処理完了\`;

      } catch (error) {
        console.error('OCR error:', error);
        alert('OCR処理に失敗しました: ' + (error.response?.data?.error || error.message));
        processingSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        updateStep(1);
      }
    });
    }

    // 抽出データ表示
    function displayExtractedData(data) {
      document.getElementById('extracted_title').value = data.property_name || '';
      document.getElementById('extracted_location').value = data.location || '';
      document.getElementById('extracted_station').value = data.station || '';
      document.getElementById('extracted_walk_minutes').value = data.walk_minutes || '';
      document.getElementById('extracted_land_area').value = data.land_area || '';
      document.getElementById('extracted_building_area').value = data.building_area || '';
      document.getElementById('extracted_zoning').value = data.zoning || '';
      document.getElementById('extracted_building_coverage').value = data.building_coverage || '';
      document.getElementById('extracted_floor_area_ratio').value = data.floor_area_ratio || '';
      document.getElementById('extracted_price').value = data.price || '';
      document.getElementById('extracted_structure').value = data.structure || '';
      document.getElementById('extracted_built_year').value = data.built_year || '';
      document.getElementById('extracted_road_info').value = data.road_info || '';
      document.getElementById('extracted_current_status').value = data.current_status || '';
      document.getElementById('extracted_yield').value = data.yield || '';
      document.getElementById('extracted_occupancy').value = data.occupancy || '';
    }

    // リセット
    resetBtn.addEventListener('click', () => {
      selectedFiles = [];
      extractedData = null;
      fileInput.value = '';
      resultSection.classList.add('hidden');
      uploadSection.classList.remove('hidden');
      updateStep(1);
      updateFilePreview();
    });

    // 案件作成
    createDealBtn.addEventListener('click', () => {
      // 抽出データをlocalStorageに保存して案件作成ページへ遷移
      const formData = {
        title: document.getElementById('extracted_title').value,
        location: document.getElementById('extracted_location').value,
        station: document.getElementById('extracted_station').value,
        walk_minutes: document.getElementById('extracted_walk_minutes').value,
        land_area: document.getElementById('extracted_land_area').value,
        zoning: document.getElementById('extracted_zoning').value,
        building_coverage: document.getElementById('extracted_building_coverage').value,
        floor_area_ratio: document.getElementById('extracted_floor_area_ratio').value,
        desired_price: document.getElementById('extracted_price').value,
        road_info: document.getElementById('extracted_road_info').value,
        current_status: document.getElementById('extracted_current_status').value
      };

      localStorage.setItem('ocr_extracted_data', JSON.stringify(formData));
      window.location.href = '/deals/new';
    });

      // 初期化
      updateStep(1);
    });
  </script>
</body>
</html>
  `);
});

// 事業ショーケースページ（旧ギャラリー）
app.get('/showcase', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>事業ショーケース - 200棟土地仕入れ管理システム</title>
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
          <a href="/purchase-criteria" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-clipboard-check mr-2"></i>買取条件
          </a>
          <a href="/showcase" class="text-gray-300 hover:text-white transition">
            <i class="fas fa-images mr-2"></i>ショーケース
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
      <h2 class="text-3xl font-bold text-gray-900 mb-2">事業ショーケース</h2>
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

    <!-- プレカット事業部 -->
    <div class="mt-12 bg-white rounded-xl shadow-lg p-8">
      <h3 class="text-2xl font-bold text-gray-900 mb-6">
        <i class="fas fa-tools text-blue-600 mr-2"></i>プレカット事業部
      </h3>
      <p class="text-gray-700 mb-6">
        2×4（ツー・バイ・フォー）工法の住宅に対して、資材調達・CAD入力・材料プレカット・パネル加工・現場搬入・建て方までを一貫した生産体制にて提供しています。
      </p>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 事業概要 -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
          <div class="map-container">
            <img src="/gallery/precut-business-overview.jpg" alt="プレカット事業部概要" class="w-full h-auto gallery-image">
          </div>
          <div class="p-6">
            <h5 class="text-lg font-bold text-gray-900 mb-2">事業概要</h5>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start">
                <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
                <span>カナダ・バンクーバーより直輸入</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
                <span>日本市場向け良質材「Jグレード」使用</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
                <span>自社トラックにて輸送</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
                <span>精巧な機械で精密にカット</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- メーカーとしての特長 -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
          <div class="map-container">
            <img src="/gallery/precut-business-features.jpg" alt="2×4メーカーとしての特長" class="w-full h-auto gallery-image">
          </div>
          <div class="p-6">
            <h5 class="text-lg font-bold text-gray-900 mb-2">2×4メーカーとしての3つの特長</h5>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start">
                <i class="fas fa-star text-yellow-500 mr-2 mt-1"></i>
                <span><strong>フルパネル対応可能</strong> - 壁・床・天井・屋根を供給</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-star text-yellow-500 mr-2 mt-1"></i>
                <span><strong>構造設計対応可能</strong> - プレカットと構造設計を合わせて担当</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-star text-yellow-500 mr-2 mt-1"></i>
                <span><strong>フレーマー対応可能</strong> - フレーミング（建て方工事）も弊社にて対応</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- ZEH基準・建物デザイン -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden gallery-card">
          <div class="map-container">
            <img src="/gallery/precut-business-quality.jpg" alt="ZEH基準と建物品質" class="w-full h-auto gallery-image">
          </div>
          <div class="p-6">
            <h5 class="text-lg font-bold text-gray-900 mb-2">高品質・高性能</h5>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start">
                <i class="fas fa-award text-blue-600 mr-2 mt-1"></i>
                <span><strong>ZEH基準を満たした新築アパート</strong> - 住宅版BELS★4、断熱等性能等級5、劣化対策等級3</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-home text-green-600 mr-2 mt-1"></i>
                <span><strong>入居率を高める建物デザイン</strong> - 長期的な入居率を左右する建物デザインにこだわり</span>
              </li>
              <li class="flex items-start">
                <i class="fas fa-shield-alt text-purple-600 mr-2 mt-1"></i>
                <span><strong>劣化等級3級の耐久性</strong> - 3世代の耐久性（おおむね75〜90年）</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-start">
          <i class="fas fa-map-marked-alt text-blue-600 text-2xl mr-3 mt-1"></i>
          <div>
            <h6 class="font-semibold text-gray-900 mb-2">対応エリア</h6>
            <p class="text-sm text-gray-700">
              <strong>愛知県と静岡県に工場を持ち</strong><br>
              関東・関西エリアに対応
            </p>
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

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // ページ読み込み後に初期化(window.load で確実に実行)
    window.addEventListener('load', function() {
      // ユーザー名表示
      if (user.name) {
        document.getElementById('user-name').textContent = user.name;
      }
    });
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
      <div class="flex space-x-3">
        <a href="/deals/new" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition shadow-lg">
          <i class="fas fa-plus mr-2"></i>新規案件作成（OCR自動入力対応）
        </a>
      </div>
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

    <!-- 一括操作バー（管理者のみ表示） -->
    <div id="bulk-actions-bar" class="bg-white rounded-xl shadow-lg border border-slate-200 p-4 mb-6 hidden">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <span id="selected-count" class="text-sm text-gray-600">0件選択中</span>
          <button onclick="clearSelection()" class="text-sm text-blue-600 hover:text-blue-800">
            選択解除
          </button>
        </div>
        <div class="flex items-center space-x-3">
          <select id="bulk-status" class="border border-slate-300 rounded-lg px-4 py-2 text-sm">
            <option value="">ステータス変更...</option>
            <option value="NEW">新規</option>
            <option value="REVIEWING">レビュー中</option>
            <option value="NEGOTIATING">交渉中</option>
            <option value="CONTRACTED">契約済み</option>
            <option value="REJECTED">却下</option>
          </select>
          <button onclick="bulkUpdateStatus()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">
            <i class="fas fa-edit mr-1"></i>ステータス更新
          </button>
          <button onclick="bulkDelete()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition">
            <i class="fas fa-trash mr-1"></i>一括削除
          </button>
        </div>
      </div>
    </div>

    <!-- 案件リスト -->
    <div class="bg-white rounded-xl shadow-lg border border-slate-200">
      <!-- テーブルヘッダー（管理者のみ表示） -->
      <div id="table-header" class="p-4 border-b border-slate-200 bg-slate-50 hidden">
        <div class="flex items-center">
          <label class="flex items-center cursor-pointer">
            <input type="checkbox" id="select-all" onchange="toggleSelectAll()" class="mr-3 w-4 h-4">
            <span class="text-sm text-gray-600">全て選択</span>
          </label>
        </div>
      </div>
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

    let allDeals = [];
    let filteredDeals = [];
    let selectedDeals = new Set();

    // 管理者権限チェック
    const isAdmin = user.role === 'ADMIN';

    function logout() {
      // 認証トークンとユーザー情報のみ削除（Remember Me情報は保持）
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // 一括操作機能
    function toggleSelectAll() {
      const selectAll = document.getElementById('select-all').checked;
      const checkboxes = document.querySelectorAll('.deal-checkbox');
      
      selectedDeals.clear();
      checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
        if (selectAll) {
          selectedDeals.add(checkbox.value);
        }
      });
      
      updateSelectionUI();
    }

    function toggleDealSelection(dealId) {
      if (selectedDeals.has(dealId)) {
        selectedDeals.delete(dealId);
      } else {
        selectedDeals.add(dealId);
      }
      updateSelectionUI();
    }

    function clearSelection() {
      selectedDeals.clear();
      document.getElementById('select-all').checked = false;
      document.querySelectorAll('.deal-checkbox').forEach(cb => cb.checked = false);
      updateSelectionUI();
    }

    function updateSelectionUI() {
      const count = selectedDeals.size;
      document.getElementById('selected-count').textContent = \`\${count}件選択中\`;
      
      if (count > 0) {
        document.getElementById('bulk-actions-bar').classList.remove('hidden');
      } else {
        document.getElementById('bulk-actions-bar').classList.add('hidden');
      }
      
      // 全選択チェックボックスの状態更新
      const totalCheckboxes = document.querySelectorAll('.deal-checkbox').length;
      document.getElementById('select-all').checked = (count === totalCheckboxes && count > 0);
    }

    async function bulkUpdateStatus() {
      const newStatus = document.getElementById('bulk-status').value;
      
      if (!newStatus) {
        alert('ステータスを選択してください');
        return;
      }
      
      if (selectedDeals.size === 0) {
        alert('案件を選択してください');
        return;
      }
      
      if (!confirm(\`選択した\${selectedDeals.size}件の案件のステータスを「\${newStatus}」に変更しますか？\`)) {
        return;
      }
      
      try {
        const response = await axios.post('/api/deals/bulk/status', {
          deal_ids: Array.from(selectedDeals),
          status: newStatus
        }, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        alert(\`\${response.data.results.success}件のステータスを更新しました\`);
        clearSelection();
        loadDeals();
      } catch (error) {
        console.error('Bulk status update failed:', error);
        alert('ステータス更新に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    }

    async function bulkDelete() {
      if (selectedDeals.size === 0) {
        alert('案件を選択してください');
        return;
      }
      
      if (!confirm(\`選択した\${selectedDeals.size}件の案件を削除しますか？この操作は取り消せません。\`)) {
        return;
      }
      
      try {
        const response = await axios.post('/api/deals/bulk/delete', {
          deal_ids: Array.from(selectedDeals)
        }, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        alert(\`\${response.data.results.success}件の案件を削除しました\`);
        clearSelection();
        loadDeals();
      } catch (error) {
        console.error('Bulk delete failed:', error);
        alert('一括削除に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    }

    async function loadDeals() {
      const container = document.getElementById('deals-container');
      try {
        console.log('[loadDeals] Starting to load deals...');
        console.log('[loadDeals] Token:', token ? 'exists' : 'missing');
        
        const response = await axios.get('/api/deals', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log('[loadDeals] Response received:', response);
        console.log('[loadDeals] Response data:', response.data);
        console.log('[loadDeals] Deals count:', response.data.deals ? response.data.deals.length : 0);
        
        allDeals = response.data.deals || [];
        filteredDeals = [...allDeals];
        console.log('[loadDeals] Calling displayDeals with', filteredDeals.length, 'deals');
        displayDeals();
      } catch (error) {
        console.error('[loadDeals] Error occurred:', error);
        if (error.response) {
          console.error('[loadDeals] Response data:', error.response.data);
          console.error('[loadDeals] Response status:', error.response.status);
        }
        
        if (error.response && error.response.status === 401) {
          container.innerHTML = 
            '<div class="p-8 text-center text-red-600"><p>認証エラー: ログインし直してください</p></div>';
          setTimeout(() => logout(), 2000);
        } else {
          const errorMsg = error.response?.data?.error || error.message || '不明なエラー';
          container.innerHTML = 
            \`<div class="p-8 text-center text-red-600">
              <p>案件の読み込みに失敗しました</p>
              <p class="text-sm mt-2">エラー: \${errorMsg}</p>
              <p class="text-xs mt-2 text-gray-500">\${error.stack || 'スタックトレースなし'}</p>
              <button onclick="loadDeals()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                再試行
              </button>
            </div>\`;
        }
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
      console.log('[displayDeals] Called with', filteredDeals.length, 'deals');

      if (filteredDeals.length === 0) {
        console.log('[displayDeals] No deals to display');
        container.innerHTML = '<div class="p-8 text-center text-gray-500"><p>案件がありません</p></div>';
        return;
      }
      
      console.log('[displayDeals] Rendering deals...');

      const statusColors = {
        'NEW': 'bg-blue-100 text-blue-800',
        'REVIEWING': 'bg-yellow-100 text-yellow-800',
        'NEGOTIATING': 'bg-purple-100 text-purple-800',
        'CONTRACTED': 'bg-green-100 text-green-800',
        'REJECTED': 'bg-red-100 text-red-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'REPLIED': 'bg-green-100 text-green-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      };

      const statusLabels = {
        'NEW': '新規',
        'REVIEWING': 'レビュー中',
        'NEGOTIATING': '交渉中',
        'CONTRACTED': '契約済み',
        'REJECTED': '却下',
        'IN_REVIEW': 'レビュー中',
        'REPLIED': '回答済み',
        'CLOSED': '終了'
      };

      // 管理者の場合はチェックボックス付きで表示
      container.innerHTML = filteredDeals.map(deal => {
        const checkboxHtml = isAdmin ? \`
          <div class="flex items-start mr-4" onclick="event.stopPropagation()">
            <input type="checkbox" 
              class="deal-checkbox mt-2 w-4 h-4 cursor-pointer" 
              value="\${deal.id}" 
              onchange="toggleDealSelection('\${deal.id}')"
              \${selectedDeals.has(deal.id) ? 'checked' : ''}>
          </div>
        \` : '';
        
        return \`
          <div class="p-6 hover:bg-gray-50 cursor-pointer flex" onclick="viewDeal('\${deal.id}')">
            \${checkboxHtml}
            <div class="flex justify-between items-start flex-1">
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
        \`;
      }).join('');
      
      // 管理者の場合はヘッダーも表示
      if (isAdmin) {
        document.getElementById('table-header').classList.remove('hidden');
      }
    }

    function viewDeal(dealId) {
      window.location.href = '/deals/' + dealId;
    }

    // ページ読み込み後に初期化（重複実行を防止）
    let isInitialized = false;
    
    function initializePage() {
      if (isInitialized) {
        console.log('[initializePage] Already initialized, skipping...');
        return;
      }
      
      isInitialized = true;
      console.log('[initializePage] Initializing page...');
      
      // ユーザー名表示
      if (user.name) {
        document.getElementById('user-name').textContent = user.name;
      }

      // 案件データ読み込み
      if (typeof axios !== 'undefined') {
        console.log('[initializePage] axios loaded, calling loadDeals');
        loadDeals();
      } else {
        console.error('[initializePage] axios not loaded');
        document.getElementById('deals-container').innerHTML = 
          '<div class="p-8 text-center text-red-600"><p>ライブラリの読み込みに失敗しました。ページを再読み込みしてください。</p></div>';
      }
    }
    
    // ページ読み込み後に初期化（window.loadのみ使用）
    window.addEventListener('load', initializePage);
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
  <!-- イベント委譲パターンスクリプトは</body>直前に移動 -->
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
      border: 3px dashed #c4b5fd;
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
      transition: all 0.3s ease;
    }
    .ocr-drop-zone.dragover {
      border-color: #9333ea;
      background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
      transform: scale(1.02);
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
      <p class="text-gray-600 mt-2">登記簿謄本などの画像・PDFからOCRで自動入力できます</p>
    </div>

    <!-- OCRセクション -->
    <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          <i class="fas fa-magic text-purple-600 mr-2"></i>
          OCR自動入力（複数ファイル対応）
        </h3>
        <div class="flex items-center space-x-2">
          <button id="ocr-history-btn" type="button" class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium hover:bg-gray-200 transition">
            <i class="fas fa-history mr-1"></i>履歴
          </button>
          <button id="ocr-settings-btn" type="button" class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium hover:bg-gray-200 transition">
            <i class="fas fa-cog mr-1"></i>設定
          </button>
          <div id="storage-quota-display" class="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-200">
            <div class="flex items-center space-x-2 mb-1">
              <i class="fas fa-database"></i>
              <span id="storage-usage-text">読込中...</span>
            </div>
            <div class="w-48 bg-gray-200 rounded-full h-2 hidden" id="storage-progress-container">
              <div id="storage-progress-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>
          <span class="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
            画像・PDF混在OK
          </span>
        </div>
        
        <!-- ストレージ警告メッセージ -->
        <div id="storage-warning-alert" class="hidden mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-yellow-400"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">
                <span class="font-medium">ストレージ容量警告</span>
                <br>
                <span id="storage-warning-message"></span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ドロップゾーン -->
      <div id="ocr-drop-zone" class="ocr-drop-zone rounded-lg p-8 text-center mb-4">
        <i class="fas fa-cloud-upload-alt text-5xl text-purple-400 mb-3"></i>
        <p class="text-gray-700 font-medium mb-2">登記簿謄本や物件資料を複数まとめてアップロード</p>
        <p class="text-sm text-gray-500 mb-2">PNG、JPG、WEBP、PDF形式に対応</p>
        <p class="text-sm text-gray-500 mb-4">画像とPDFを混在してアップロードできます（最大10ファイル）</p>
        <label for="ocr-file-input" class="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 cursor-pointer inline-block transition font-medium shadow-lg">
          <i class="fas fa-folder-open mr-2"></i>ファイルを選択またはドラッグ＆ドロップ
        </label>
        <input type="file" id="ocr-file-input" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf" class="hidden" multiple>
        <p class="text-sm text-gray-600 mt-2">
          <i class="fas fa-info-circle mr-1"></i>
          対応形式: PNG, JPG, JPEG, WEBP, PDF
          <br>
          <span class="text-purple-600">※ PDFは自動的に画像に変換してOCR処理します</span>
        </p>
      </div>

      <!-- プレビューとプログレスバー -->
      <div id="ocr-preview-container" class="hidden">
        <!-- ファイルプレビュー -->
        <div id="multi-file-preview" class="mb-4"></div>
        <img id="ocr-preview-image" class="ocr-preview rounded-lg shadow mb-4" style="display: none;" />

        <!-- プログレスバー -->
        <div id="ocr-progress-section" class="mb-4 hidden">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center text-blue-700">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                <span class="font-semibold">OCR処理中</span>
              </div>
              <div class="flex items-center space-x-3">
                <span id="ocr-progress-text" class="text-sm text-blue-600 font-medium">0/0 完了</span>
                <button id="ocr-cancel-btn" type="button" class="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition font-medium" style="display: none;">
                  <i class="fas fa-times-circle mr-1"></i>キャンセル
                </button>
              </div>
            </div>
            
            <!-- 全体プログレスバー -->
            <div class="w-full bg-blue-100 rounded-full h-3 mb-3 overflow-hidden">
              <div id="ocr-progress-bar" class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            
            <!-- 推定残り時間 -->
            <div id="ocr-eta-section" class="text-sm text-blue-600 mb-3 hidden">
              <i class="fas fa-clock mr-1"></i>
              <span>推定残り時間: <span id="ocr-eta-text">計算中...</span></span>
            </div>
            
            <!-- ファイル毎の処理状態 -->
            <div id="ocr-file-status-list" class="space-y-2 max-h-48 overflow-y-auto"></div>
          </div>
        </div>

        <!-- エラー表示 -->
        <div id="ocr-error-section" class="mb-4 hidden">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-start">
              <i class="fas fa-exclamation-triangle text-red-500 mt-1 mr-3"></i>
              <div class="flex-1">
                <h4 class="font-semibold text-red-800 mb-2">OCR処理エラー</h4>
                <p id="ocr-error-message" class="text-sm text-red-700 mb-2"></p>
                <div id="ocr-error-solution" class="text-sm text-red-600 bg-red-100 rounded p-2 mb-3"></div>
                <div class="flex items-center space-x-2">
                  <button id="ocr-retry-btn" type="button" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium">
                    <i class="fas fa-redo mr-2"></i>再試行
                  </button>
                  <button id="ocr-error-dismiss-btn" type="button" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium">
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- OCR結果編集UI -->
        <div id="ocr-result-edit-section" class="hidden">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center text-green-700">
                <i class="fas fa-check-circle mr-2"></i>
                <span class="font-semibold">OCR抽出完了</span>
              </div>
              <div class="flex items-center space-x-2">
                <span id="ocr-confidence-badge" class="text-sm px-3 py-1 rounded-full font-medium"></span>
                <button id="ocr-apply-btn" type="button" class="bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700 transition text-sm font-medium">
                  <i class="fas fa-check mr-1"></i>フォームに適用
                </button>
              </div>
            </div>
            
            <!-- 信頼度警告 -->
            <div id="ocr-confidence-warning" class="hidden mb-3 bg-yellow-50 border border-yellow-200 rounded p-3">
              <div class="flex items-start">
                <i class="fas fa-exclamation-circle text-yellow-600 mt-0.5 mr-2"></i>
                <div class="text-sm text-yellow-800">
                  <p class="font-medium mb-1">信頼度が低い項目があります</p>
                  <p class="text-yellow-700">赤色の項目は特に確認が必要です。必要に応じて手動で修正してください。</p>
                </div>
              </div>
            </div>
            
            <!-- 抽出結果フォーム -->
            <div id="ocr-extracted-data" class="grid grid-cols-2 gap-3 mb-3"></div>
            
            <div class="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-green-200">
              <span><i class="fas fa-info-circle mr-1"></i>内容を確認・修正してから適用してください</span>
              <button id="ocr-reextract-btn" type="button" class="text-purple-600 hover:text-purple-700 font-medium">
                <i class="fas fa-redo mr-1"></i>再抽出
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OCR履歴モーダル -->
    <div id="ocr-history-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-history text-purple-600 mr-2"></i>OCR履歴
          </h3>
          <button id="close-history-modal" type="button" data-modal-close="ocr-history-modal" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <!-- 検索とフィルター -->
          <div class="mb-4 space-y-2">
            <input 
              type="text" 
              id="history-search" 
              placeholder="物件名・所在地で検索..." 
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
            
            <!-- 信頼度フィルター -->
            <div class="flex gap-2 flex-wrap">
              <button type="button" id="history-filter-all" data-filter="all" class="px-3 py-1 text-sm rounded-full bg-purple-600 text-white">
                全て
              </button>
              <button type="button" id="history-filter-high" data-filter="high" class="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                高信頼度 (90%+)
              </button>
              <button type="button" id="history-filter-medium" data-filter="medium" class="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                中信頼度 (70-90%)
              </button>
              <button type="button" id="history-filter-low" data-filter="low" class="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                低信頼度 (~70%)
              </button>
            </div>
            
            <!-- ソート・日付フィルター -->
            <div class="flex gap-2 items-center flex-wrap">
              <label class="text-sm text-gray-700 font-medium">並び替え:</label>
              <select id="history-sort" class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                <option value="date_desc">新しい順</option>
                <option value="date_asc">古い順</option>
                <option value="confidence_desc">信頼度: 高→低</option>
                <option value="confidence_asc">信頼度: 低→高</option>
              </select>
              
              <div class="h-4 w-px bg-gray-300 mx-2"></div>
              
              <label class="text-sm text-gray-700 font-medium">期間:</label>
              <input type="date" id="history-date-from" class="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <span class="text-sm text-gray-500">〜</span>
              <input type="date" id="history-date-to" class="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <button id="history-date-clear" class="px-2 py-1 text-sm text-purple-600 hover:text-purple-700">
                <i class="fas fa-times-circle"></i> クリア
              </button>
            </div>
          </div>
          
          <div id="ocr-history-list" class="space-y-4">
            <!-- 履歴アイテムが動的に追加される -->
            <div class="text-center text-gray-500 py-8">
              <i class="fas fa-inbox text-5xl mb-3"></i>
              <p>履歴はまだありません</p>
            </div>
          </div>
          
          <!-- ページネーション -->
          <div id="history-pagination" class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 hidden">
            <div class="text-sm text-gray-600">
              <span id="history-count-info">1-20 件 / 全 50 件</span>
            </div>
            <div class="flex gap-2">
              <button id="history-page-prev" class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                <i class="fas fa-chevron-left mr-1"></i> 前へ
              </button>
              <span id="history-page-numbers" class="flex gap-1"></span>
              <button id="history-page-next" class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                次へ <i class="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OCR設定モーダル -->
    <div id="ocr-settings-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-cog text-purple-600 mr-2"></i>OCR設定
          </h3>
          <button id="close-settings-modal" type="button" data-modal-close="ocr-settings-modal" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <form id="ocr-settings-form">
            <div class="mb-6">
              <label class="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                <div>
                  <span class="font-medium text-gray-900">履歴を自動保存</span>
                  <p class="text-sm text-gray-600">OCR結果を自動的に履歴に保存します</p>
                </div>
                <input type="checkbox" id="setting-auto-save" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
              </label>
            </div>
            
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">信頼度閾値</label>
              <input type="range" id="setting-confidence-threshold" min="0" max="100" value="70" class="w-full">
              <div class="flex justify-between text-xs text-gray-600 mt-1">
                <span>0%</span>
                <span id="confidence-threshold-value" class="font-medium text-purple-600">70%</span>
                <span>100%</span>
              </div>
              <p class="text-xs text-gray-500 mt-2">この値未満の信頼度の項目に警告を表示します</p>
            </div>
            
            <div class="mb-6">
              <label class="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                <div>
                  <span class="font-medium text-gray-900">バッチ処理を有効化</span>
                  <p class="text-sm text-gray-600">複数ファイルの一括処理を許可します</p>
                </div>
                <input type="checkbox" id="setting-enable-batch" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" checked>
              </label>
            </div>
            
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">最大バッチサイズ</label>
              <input type="number" id="setting-max-batch-size" min="1" max="50" value="10" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <p class="text-xs text-gray-500 mt-1">一度に処理できるファイルの最大数（1-50）</p>
            </div>
            
            <!-- 並列処理設定 (v3.12.0で実装済み) -->
            <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start">
                <i class="fas fa-info-circle text-blue-600 mt-0.5 mr-2"></i>
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-900 mb-1">並列処理機能</p>
                  <p class="text-xs text-blue-700 mb-2">v3.12.0で実装済み：複数ファイルを同時に処理して処理速度を向上させます</p>
                  <ul class="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>最大3ファイルを同時処理（OpenAI APIレート制限対応）</li>
                    <li>Semaphoreパターンで並列度を自動制御</li>
                    <li>処理速度: 約3倍高速化（10ファイル: 150秒→50秒）</li>
                    <li>キャンセル機能との完全統合</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <!-- 進捗永続化機能 (v3.12.0で実装済み) -->
            <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex items-start">
                <i class="fas fa-check-circle text-green-600 mt-0.5 mr-2"></i>
                <div class="flex-1">
                  <p class="text-sm font-medium text-green-900 mb-1">進捗永続化機能</p>
                  <p class="text-xs text-green-700 mb-2">v3.12.0で実装済み：ブラウザをリロードしても処理進捗が復元されます</p>
                  <ul class="text-xs text-green-700 space-y-1 list-disc list-inside">
                    <li>localStorage自動保存</li>
                    <li>ページリロード後の自動復元</li>
                    <li>処理完了時の自動クリーンアップ</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3">
              <button type="button" id="cancel-settings-btn" data-modal-close="ocr-settings-modal" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                キャンセル
              </button>
              <button type="submit" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium">
                <i class="fas fa-save mr-2"></i>設定を保存
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 不足書類通知セクション -->
    <div id="missing-items-alert" class="hidden bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div class="flex items-start">
        <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3 mt-1"></i>
        <div class="flex-1">
          <h4 class="font-semibold text-yellow-800 mb-2">案件審査に必要な情報が不足しています</h4>
          <div id="missing-fields-list" class="text-sm text-yellow-700 mb-2"></div>
          <div id="missing-files-list" class="text-sm text-yellow-700 mb-3"></div>
          <div class="flex items-center space-x-4">
            <button type="button" id="dismiss-missing-alert" class="text-sm text-yellow-700 underline hover:text-yellow-900">
              閉じる
            </button>
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
          <div class="flex gap-2">
            <input type="text" id="location" required
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 東京都板橋区蓮根三丁目17-7">
            <button type="button" id="auto-fill-btn" onclick="autoFillFromReinfolib()"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap">
              <i class="fas fa-magic"></i>
              物件情報を自動入力
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            住所を入力後、「物件情報を自動入力」ボタンをクリックすると、不動産情報ライブラリから物件情報を取得して自動入力します
          </p>
        </div>

        <!-- 最寄り駅 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            最寄り駅 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="station" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 〇〇駅">
        </div>

        <!-- 徒歩分数 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            徒歩分数 <span class="text-red-500">*</span>
          </label>
          <input type="number" id="walk_minutes" min="0" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 10">
        </div>

        <!-- 土地面積 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            土地面積 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="land_area" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 150㎡">
        </div>

        <!-- 用途地域 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            用途地域 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="zoning" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 第一種住居地域">
        </div>

        <!-- 建ぺい率 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            建ぺい率 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="building_coverage" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 60%">
        </div>

        <!-- 容積率 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            容積率 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="floor_area_ratio" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 200%">
        </div>

        <!-- 高度地区 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            高度地区 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="height_district" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 第3種高度地区">
        </div>

        <!-- 防火地域 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            防火地域 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="fire_zone" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 準防火地域">
        </div>

        <!-- 道路情報 -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            道路情報 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="road_info" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 南側公道 幅員4.0m 接道6.0m">
        </div>

        <!-- 間口 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            間口 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="frontage" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 7.5m">
        </div>

        <!-- 建物面積 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">建物面積</label>
          <input type="text" id="building_area"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 120.50㎡">
        </div>

        <!-- 構造 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">構造</label>
          <input type="text" id="structure"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 木造2階建">
        </div>

        <!-- 築年月 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">築年月</label>
          <input type="text" id="built_year"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 1995年3月">
        </div>

        <!-- 表面利回り -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">表面利回り</label>
          <input type="text" id="yield_rate"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 5.2%">
        </div>

        <!-- 賃貸状況 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">賃貸状況</label>
          <input type="text" id="occupancy_status"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 満室">
        </div>

        <!-- 現況 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">現況</label>
          <input type="text" id="current_status"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 更地">
        </div>

        <!-- 希望価格 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            希望価格 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="desired_price" required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 5,000万円">
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

      <!-- 買取条件チェック結果 -->
      <div id="purchase-check-container" class="mt-6 hidden">
        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i class="fas fa-clipboard-check text-blue-600 mr-2"></i>
            買取条件チェック結果
          </h3>
          
          <div id="purchase-check-result" class="rounded-lg p-6">
            <!-- 結果がここに動的に表示されます -->
          </div>

          <div class="mt-4 text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            物件情報を入力すると、自動的に買取条件をチェックします
          </div>
        </div>
      </div>

      <!-- 建築基準法チェック結果 -->
      <div id="building-regulations-container" class="mt-6 hidden">
        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i class="fas fa-gavel text-orange-600 mr-2"></i>
            建築基準法・自治体条例チェック
          </h3>
          
          <!-- 自動チェック説明 -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div class="flex items-start">
              <i class="fas fa-magic text-blue-600 mt-0.5 mr-3"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-blue-900 mb-1">自動チェック機能</p>
                <p class="text-xs text-blue-700">
                  所在地、用途地域、防火地域、高度地区、構造などの入力に応じて、該当する建築基準法・自治体条例を自動表示します
                </p>
              </div>
            </div>
          </div>

          <!-- 検出された規定のサマリー -->
          <div id="building-regulations-summary" class="mb-4 hidden">
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div class="text-xs text-orange-600 mb-1">建築基準法</div>
                <div class="text-2xl font-bold text-orange-900">
                  <span id="national-reg-count">0</span>件
                </div>
              </div>
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="text-xs text-green-600 mb-1">自治体条例</div>
                <div class="text-2xl font-bold text-green-900">
                  <span id="municipal-reg-count">0</span>件
                </div>
              </div>
            </div>
          </div>

          <!-- 規定リスト -->
          <div id="building-regulations-result" class="space-y-3">
            <!-- 結果がここに動的に表示されます -->
          </div>

          <!-- 手動チェックボタン -->
          <div class="mt-4 flex items-center justify-between">
            <div class="text-sm text-gray-600">
              <i class="fas fa-info-circle mr-1"></i>
              必要項目を入力すると自動的にチェックされます
            </div>
            <button type="button" id="manual-check-btn" onclick="manualBuildingCheck()"
              class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm">
              <i class="fas fa-sync mr-1"></i>今すぐチェック
            </button>
          </div>
        </div>
      </div>

      <!-- ハザード情報セクション -->
      <div id="hazard-info-container" class="mt-6 hidden">
        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
            ハザード情報（災害リスク）
          </h3>
          
          <!-- 説明 -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div class="flex items-start">
              <i class="fas fa-info-circle text-yellow-600 mt-0.5 mr-3"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-yellow-900 mb-1">自動取得機能</p>
                <p class="text-xs text-yellow-700">
                  「物件情報を自動入力」ボタンで住所から災害リスク情報を取得します。詳細は国土交通省ハザードマップポータルサイトで確認してください。
                </p>
              </div>
            </div>
          </div>

          <!-- ハザード情報結果 -->
          <div id="hazard-info-result" class="space-y-3">
            <!-- ハザード情報がここに動的に表示されます -->
          </div>
        </div>
      </div>

      <!-- ファイルアップロードセクション -->
      <div class="border-t pt-6 mt-6" id="deal-files-section" style="display: none;">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          <i class="fas fa-paperclip mr-2"></i>添付資料
        </h3>
        
        <!-- ファイルアップロード -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ファイルをアップロード
          </label>
          <div class="flex items-center space-x-2">
            <input 
              type="file" 
              id="deal-file-input" 
              multiple 
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              class="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            >
            <select id="deal-file-type" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="document">一般資料</option>
              <option value="ocr">OCR資料</option>
              <option value="image">物件写真</option>
            </select>
            <button 
              type="button"
              id="deal-file-upload-btn"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
            >
              <i class="fas fa-upload mr-1"></i>アップロード
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            PDF, JPG, PNG, Word形式に対応（1ファイル最大10MB）
          </p>
        </div>

        <!-- ファイル一覧 -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium text-gray-700">アップロード済みファイル</h3>
            <div class="flex gap-2">
              <button type="button" id="select-all-files" onclick="toggleSelectAllFiles()" 
                class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition">
                <i class="fas fa-check-square mr-1"></i>全選択
              </button>
              <button type="button" id="bulk-download-btn" onclick="bulkDownloadFiles()" 
                class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled>
                <i class="fas fa-download mr-1"></i>選択ファイルをダウンロード
              </button>
            </div>
          </div>
          <div id="deal-files-list" class="space-y-2">
            <!-- ファイルがここに表示されます -->
          </div>
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

  <!-- テンプレート選択モーダル -->
  <div id="template-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-0 md:p-4" style="display: none;">
    <div class="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-hidden">
      <!-- モーダルヘッダー -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 md:px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg md:text-xl font-bold text-white flex items-center">
          <i class="fas fa-layer-group mr-2"></i>
          テンプレート選択
        </h3>
        <button onclick="closeTemplateModal()" class="text-white hover:text-gray-200 transition p-2 -mr-2">
          <i class="fas fa-times text-xl md:text-2xl"></i>
        </button>
      </div>

      <!-- モーダルコンテンツ -->
      <div class="p-4 md:p-6 overflow-y-auto h-[calc(100vh-80px)] md:h-auto" style="max-height: calc(90vh - 140px);">
        <!-- ローディング -->
        <div id="template-loading" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-3"></i>
          <p class="text-gray-600">テンプレート読み込み中...</p>
        </div>

        <!-- エラーメッセージ -->
        <div id="template-error" class="hidden bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center text-red-800">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span id="template-error-message">エラーが発生しました</span>
          </div>
        </div>

        <!-- プリセットテンプレート -->
        <div id="preset-templates-section" class="hidden">
          <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <i class="fas fa-star text-yellow-500 mr-2"></i>
            プリセットテンプレート
          </h4>
          <div id="preset-templates-list" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"></div>
        </div>

        <!-- カスタムテンプレート -->
        <div id="custom-templates-section" class="hidden">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-lg font-semibold text-gray-900 flex items-center">
              <i class="fas fa-user-edit text-blue-600 mr-2"></i>
              カスタムテンプレート
            </h4>
            <div class="flex items-center space-x-1 md:space-x-2">
              <button id="import-template-btn" type="button" class="text-xs md:text-sm bg-purple-600 text-white px-2 md:px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium min-h-[44px] touch-manipulation">
                <i class="fas fa-upload mr-1"></i><span class="hidden sm:inline">インポート</span>
              </button>
              <button id="create-template-btn" type="button" class="text-xs md:text-sm bg-green-600 text-white px-2 md:px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium min-h-[44px] touch-manipulation">
                <i class="fas fa-plus mr-1"></i><span class="hidden sm:inline">新規作成</span>
              </button>
            </div>
          </div>
          <div id="custom-templates-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
          <p id="no-custom-templates" class="text-gray-500 text-sm text-center py-8 hidden">
            まだカスタムテンプレートがありません
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- テンプレート作成・編集モーダル -->
  <div id="create-template-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-0 md:p-4" style="display: none;">
    <div class="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] overflow-hidden">
      <!-- モーダルヘッダー -->
      <div class="bg-gradient-to-r from-green-600 to-emerald-600 px-4 md:px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg md:text-xl font-bold text-white flex items-center">
          <i class="fas fa-plus-circle mr-2"></i>
          <span id="create-template-title">カスタムテンプレート作成</span>
        </h3>
        <button onclick="closeCreateTemplateModal()" class="text-white hover:text-gray-200 transition p-2 -mr-2">
          <i class="fas fa-times text-xl md:text-2xl"></i>
        </button>
      </div>

      <!-- モーダルコンテンツ -->
      <div class="p-4 md:p-6 overflow-y-auto h-[calc(100vh-80px)] md:h-auto" style="max-height: calc(90vh - 140px);">
        <!-- 成功メッセージ -->
        <div id="create-template-success" class="hidden bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div class="flex items-center text-green-800">
            <i class="fas fa-check-circle mr-2"></i>
            <span id="create-template-success-message">テンプレートを作成しました</span>
          </div>
        </div>

        <!-- エラーメッセージ -->
        <div id="create-template-error" class="hidden bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center text-red-800">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span id="create-template-error-message">エラーが発生しました</span>
          </div>
        </div>

        <!-- フォーム -->
        <form id="create-template-form" class="space-y-4">
          <!-- 隠しフィールド（編集時のID） -->
          <input type="hidden" id="edit-template-id" value="">

          <!-- テンプレート名 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              テンプレート名 <span class="text-red-600">*</span>
            </label>
            <input type="text" id="template-name-input" required 
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="例: 駅近マンション用地テンプレート">
          </div>

          <!-- テンプレートタイプ -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              テンプレートタイプ <span class="text-red-600">*</span>
            </label>
            <select id="template-type-input" required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
              <option value="custom">カスタム</option>
              <option value="residential_land">住宅用地</option>
              <option value="apartment_land">マンション用地</option>
              <option value="commercial_land">商業用地</option>
              <option value="investment_land">投資用地</option>
            </select>
          </div>

          <!-- 共有設定 -->
          <div class="flex items-center">
            <input type="checkbox" id="template-share-input" class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500">
            <label for="template-share-input" class="ml-2 text-sm text-gray-700">
              このテンプレートをチームメンバーと共有する
            </label>
          </div>

          <!-- 説明 -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start">
              <i class="fas fa-info-circle text-blue-600 mt-1 mr-2"></i>
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">現在のフォーム値からテンプレートを作成します</p>
                <p>保存されるフィールド: 用途地域、建ぺい率、容積率、前面道路幅員、想定戸数、土地形状、地勢、ライフライン状況</p>
              </div>
            </div>
          </div>

          <!-- プレビュー -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2">保存されるデータプレビュー</h5>
            <div id="template-data-preview" class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 space-y-1">
              <!-- JavaScriptで動的に生成 -->
            </div>
          </div>

          <!-- アクションボタン -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t">
            <button type="button" onclick="closeCreateTemplateModal()" 
              class="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              キャンセル
            </button>
            <button type="submit" id="save-template-btn"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
              <i class="fas fa-save mr-2"></i>
              <span id="save-template-btn-text">保存</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- テンプレートインポートモーダル -->
  <div id="import-template-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-0 md:p-4" style="display: none;">
    <div class="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] overflow-hidden">
      <!-- モーダルヘッダー -->
      <div class="bg-gradient-to-r from-purple-600 to-violet-600 px-4 md:px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg md:text-xl font-bold text-white flex items-center">
          <i class="fas fa-upload mr-2"></i>
          テンプレートインポート
        </h3>
        <button onclick="closeImportTemplateModal()" class="text-white hover:text-gray-200 transition p-2 -mr-2">
          <i class="fas fa-times text-xl md:text-2xl"></i>
        </button>
      </div>

      <!-- モーダルコンテンツ -->
      <div class="p-4 md:p-6 overflow-y-auto h-[calc(100vh-80px)] md:h-auto" style="max-height: calc(90vh - 140px);">
        <!-- 成功メッセージ -->
        <div id="import-template-success" class="hidden bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div class="flex items-center text-green-800">
            <i class="fas fa-check-circle mr-2"></i>
            <span id="import-template-success-message">テンプレートをインポートしました</span>
          </div>
        </div>

        <!-- エラーメッセージ -->
        <div id="import-template-error" class="hidden bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center text-red-800">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span id="import-template-error-message">エラーが発生しました</span>
          </div>
        </div>

        <!-- ファイルアップロード -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            テンプレートファイルを選択 <span class="text-red-600">*</span>
          </label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition">
            <input type="file" id="template-file-input" accept=".json" class="hidden">
            <button type="button" onclick="document.getElementById('template-file-input').click()" 
              class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium">
              <i class="fas fa-file-upload mr-2"></i>
              JSONファイルを選択
            </button>
            <p class="text-sm text-gray-500 mt-2">または、ここにファイルをドラッグ&ドロップ</p>
          </div>
          <div id="selected-file-info" class="hidden mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="fas fa-file-code text-blue-600 mr-2"></i>
                <span id="selected-file-name" class="text-sm font-medium text-gray-700"></span>
              </div>
              <button type="button" onclick="clearSelectedFile()" class="text-red-600 hover:text-red-700">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- プレビュー -->
        <div id="import-preview-section" class="hidden">
          <h5 class="text-sm font-medium text-gray-700 mb-2">インポートプレビュー</h5>
          <div id="import-template-preview" class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 space-y-1 max-h-48 overflow-y-auto">
            <!-- JavaScriptで動的に生成 -->
          </div>
        </div>

        <!-- 説明 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div class="flex items-start">
            <i class="fas fa-info-circle text-blue-600 mt-1 mr-2"></i>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-1">インポート可能なファイル形式</p>
              <ul class="list-disc list-inside space-y-1">
                <li>エクスポートされたテンプレートのJSONファイル</li>
                <li>複数のテンプレートを含むJSON配列</li>
                <li>必須フィールド: template_name, template_data</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- アクションボタン -->
        <div class="flex items-center justify-end space-x-3 pt-4 border-t mt-4">
          <button type="button" onclick="closeImportTemplateModal()" 
            class="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            キャンセル
          </button>
          <button type="button" id="import-template-btn-submit" onclick="submitImportTemplate()"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium">
            <i class="fas fa-upload mr-2"></i>
            インポート
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- テンプレートプレビューモーダル -->
  <div id="preview-template-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-0 md:p-4" style="display: none;">
    <div class="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] overflow-hidden">
      <!-- モーダルヘッダー -->
      <div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 md:px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg md:text-xl font-bold text-white flex items-center">
          <i class="fas fa-eye mr-2"></i>
          テンプレートプレビュー
        </h3>
        <button onclick="closePreviewModal()" class="text-white hover:text-gray-200 transition p-2 -mr-2">
          <i class="fas fa-times text-xl md:text-2xl"></i>
        </button>
      </div>

      <!-- モーダルコンテンツ -->
      <div class="p-4 md:p-6 overflow-y-auto h-[calc(100vh-160px)] md:h-auto" style="max-height: calc(90vh - 220px);">
        <!-- テンプレート名 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div class="flex items-center">
            <i class="fas fa-layer-group text-blue-600 text-xl mr-3"></i>
            <div>
              <p class="text-sm text-blue-600 font-medium">適用するテンプレート</p>
              <p id="preview-template-name" class="text-lg font-bold text-gray-900"></p>
            </div>
          </div>
        </div>

        <!-- 比較テーブル -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="text-md font-semibold text-gray-900 mb-3 flex items-center">
            <i class="fas fa-exchange-alt text-gray-600 mr-2"></i>
            変更内容の比較
          </h4>
          <div id="preview-comparison-table" class="space-y-2">
            <!-- JavaScriptで動的に生成 -->
          </div>
        </div>

        <!-- 説明 -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <div class="flex items-start">
            <i class="fas fa-info-circle text-amber-600 mt-1 mr-2"></i>
            <div class="text-sm text-amber-800">
              <p class="font-medium mb-1">変更されるフィールドについて</p>
              <p><span class="inline-block w-3 h-3 bg-green-200 rounded mr-1"></span>緑色: 新しい値が設定されます</p>
              <p><span class="inline-block w-3 h-3 bg-blue-200 rounded mr-1"></span>青色: 値が変更されます</p>
              <p><span class="inline-block w-3 h-3 bg-gray-200 rounded mr-1"></span>灰色: 変更なし</p>
            </div>
          </div>
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="border-t bg-gray-50 px-4 md:px-6 py-4 flex items-center justify-end space-x-3">
        <button type="button" onclick="closePreviewModal()" 
          class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          キャンセル
        </button>
        <button type="button" id="apply-template-from-preview" onclick="applyTemplateFromPreview()"
          class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">
          <i class="fas fa-check mr-2"></i>
          このテンプレートを適用
        </button>
      </div>
    </div>
  </div>

  <!-- ファイルプレビューモーダル -->
  <div id="file-preview-modal" class="fixed inset-0 bg-black bg-opacity-75 hidden items-center justify-center z-50 p-4" style="display: none;">
    <div class="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
      <!-- モーダルヘッダー -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
        <h3 class="text-xl font-bold text-white flex items-center">
          <i class="fas fa-eye mr-2"></i>
          <span id="preview-file-name">ファイルプレビュー</span>
        </h3>
        <button onclick="closeFilePreview()" class="text-white hover:text-gray-200 transition p-2">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>

      <!-- モーダルコンテンツ -->
      <div id="preview-content-area" class="flex-1 overflow-auto bg-gray-100 p-4">
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
            <p class="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>

      <!-- フッター（ダウンロードボタン） -->
      <div class="border-t bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
        <button type="button" onclick="closeFilePreview()" 
          class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          閉じる
        </button>
        <button type="button" id="download-preview-file" onclick="downloadPreviewFile()"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          <i class="fas fa-download mr-2"></i>
          ダウンロード
        </button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script>
    'use strict';
    
    // ========================================
    // 1. グローバル変数と設定
    // ========================================
    const DEBUG_MODE = false; // デバッグモード（本番環境ではfalse）
    const PAGE_LOAD_TIMEOUT = 10000; // ページロードタイムアウト: 10秒
    
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // ========================================
    // 2. 認証チェック
    // ========================================
    if (!token) {
      window.location.href = '/';
    }

    // ========================================
    // 3. グローバル関数定義（認証後）
    // ========================================
    
    // ユーザー名表示
    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
    }

    // ログアウト関数（グローバル）
    window.logout = function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    };
    
    // メッセージ表示関数（グローバル）- XSS対策済み
    window.showMessage = function showMessage(message, type) {
      const colors = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700'
      };
      
      const iconMap = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
      };
      
      // 安全なDOM要素作成（XSS対策）
      const messageDiv = document.createElement('div');
      messageDiv.className = 'fixed top-4 right-4 border-l-4 p-4 rounded shadow-lg z-50 ' + (colors[type] || colors.info);
      messageDiv.style.maxWidth = '400px';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'flex items-center';
      
      const icon = document.createElement('i');
      icon.className = 'fas fa-' + (iconMap[type] || iconMap.info) + ' mr-2';
      
      const span = document.createElement('span');
      span.textContent = message; // textContentで安全にテキスト挿入
      
      wrapper.appendChild(icon);
      wrapper.appendChild(span);
      messageDiv.appendChild(wrapper);
      
      document.body.insertAdjacentElement('beforeend', messageDiv);
      
      setTimeout(() => {
        messageDiv.style.transition = 'opacity 0.5s';
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
      }, 3000);
    };
    
    // テンプレートモーダル関数（スタブ - 後で実装を上書き）
    window.openTemplateModal = function openTemplateModal() {
      console.log('[Template] openTemplateModal called (stub)');
      const modal = document.getElementById('template-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
      }
    };
    
    window.closeTemplateModal = function closeTemplateModal() {
      console.log('[Template] closeTemplateModal called (stub)');
      const modal = document.getElementById('template-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    };
    
    // OCR履歴・設定関数（スタブ - 後で実装を上書き）
    window.loadOCRHistory = function loadOCRHistory(filters) {
      console.log('[OCR] loadOCRHistory called (stub)', filters);
    };
    
    window.loadSettings = function loadSettings() {
      console.log('[OCR] loadSettings called (stub)');
    };
    
    // ========================================
    // 4. ページロード監視とエラーハンドリング
    // ========================================
    
    if (DEBUG_MODE) {
      // ページロードタイムアウト
      const pageLoadTimer = setTimeout(() => {
        console.error('[Page Load] Timeout: Page failed to load within ' + (PAGE_LOAD_TIMEOUT / 1000) + ' seconds');
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:16px;z-index:99999;text-align:center;font-family:system-ui;';
        overlay.textContent = 'ページの読み込みがタイムアウトしました。ページをリロードしてください。';
        document.body.insertAdjacentElement('afterbegin', overlay);
      }, PAGE_LOAD_TIMEOUT);

      // ページロード成功時にタイマークリア
      window.addEventListener('load', () => {
        clearTimeout(pageLoadTimer);
        console.log('[Page Load] Page loaded successfully');
      });

      // グローバルエラーハンドラー
      window.addEventListener('error', (event) => {
        console.error('[Global Error]', event.error);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:10px;z-index:99999;font-family:system-ui;font-size:14px;';
        overlay.textContent = 'エラーが発生しました: ' + (event.error?.message || 'Unknown error');
        document.body.insertAdjacentElement('afterbegin', overlay);
      });

      // Promise拒否エラーハンドラー
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[Unhandled Rejection]', event.reason);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:20px;left:0;right:0;background:#f97316;color:white;padding:10px;z-index:99999;font-family:system-ui;font-size:14px;';
        overlay.textContent = '非同期エラー: ' + (event.reason?.message || event.reason || 'Unknown error');
        document.body.insertAdjacentElement('afterbegin', overlay);
      });
    }

    // ページロード時にOCRジョブを復元
    async function restoreOCRJobIfExists() {
      const savedJobId = localStorage.getItem('currentOCRJobId');
      if (!savedJobId) return;
      
      try {
        // ジョブのステータスを確認
        const response = await axios.get('/api/ocr-jobs/' + savedJobId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const job = response.data.job;
        
        // 進行中のジョブのみ復元
        if (job.status === 'processing' || job.status === 'pending') {
          console.log('Restoring OCR job:', savedJobId);
          
          // ユーザーに確認ダイアログを表示
          const fileName = job.file_names ? job.file_names.join(', ') : '不明';
          const statusText = job.status === 'processing' ? '処理中' : '待機中';
          const confirmMessage = '前回のOCR処理が中断されています。\\n\\n' +
            'ファイル: ' + fileName + '\\n' +
            'ステータス: ' + statusText + '\\n\\n' +
            '処理を再開しますか？\\n' +
            '「キャンセル」を選択すると、前回の処理をクリアして新しくOCRを開始できます。';
          const shouldRestore = confirm(confirmMessage);
          
          if (shouldRestore) {
            resumeOCRProgressDisplay(savedJobId, job);
          } else {
            // ユーザーがキャンセルした場合はlocalStorageをクリア
            localStorage.removeItem('currentOCRJobId');
            console.log('User cancelled OCR job restoration');
          }
        } else {
          // 完了/失敗/キャンセル済みの場合はlocalStorageをクリア
          localStorage.removeItem('currentOCRJobId');
        }
      } catch (error) {
        console.error('Failed to restore OCR job:', error);
        // エラーの場合もlocalStorageをクリア
        localStorage.removeItem('currentOCRJobId');
      }
    }

    // OCR進捗表示を復元
    function resumeOCRProgressDisplay(jobId, initialJob) {
      const progressSection = document.getElementById('ocr-progress-section');
      const progressBar = document.getElementById('ocr-progress-bar');
      const progressText = document.getElementById('ocr-progress-text');
      const fileStatusList = document.getElementById('ocr-file-status-list');
      const etaSection = document.getElementById('ocr-eta-section');
      const cancelBtn = document.getElementById('ocr-cancel-btn');
      
      // 進捗セクションを表示
      progressSection.classList.remove('hidden');
      cancelBtn.style.display = 'block';
      
      // 初期進捗を表示
      const processedFiles = initialJob.processed_files || 0;
      const totalFiles = initialJob.total_files || 0;
      const progress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;
      
      progressBar.style.width = progress + '%';
      progressText.textContent = processedFiles + '/' + totalFiles + ' 完了';
      
      // ファイルステータスを初期化（ファイル名がない場合は番号で表示）
      fileStatusList.innerHTML = '';
      for (let i = 0; i < totalFiles; i++) {
        const statusItem = document.createElement('div');
        statusItem.className = 'flex items-center justify-between text-sm p-2 bg-white rounded border border-gray-200';
        
        if (i < processedFiles) {
          statusItem.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700">ファイル ' + (i + 1) + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
        } else if (i === processedFiles) {
          statusItem.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i><span class="text-gray-700">ファイル ' + (i + 1) + '</span></div><span class="text-blue-600 text-xs font-medium">処理中</span>';
        } else {
          statusItem.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-clock text-gray-400 mr-2"></i><span class="text-gray-700">ファイル ' + (i + 1) + '</span></div><span class="text-gray-500 text-xs">待機中</span>';
        }
        
        fileStatusList.appendChild(statusItem);
      }
      
      // ポーリングを開始
      startOCRPolling(jobId, Date.now() - (processedFiles * 10000)); // 概算の開始時間
    }

    // OCRポーリング処理（共通化）
    function startOCRPolling(jobId, startTime) {
      const progressSection = document.getElementById('ocr-progress-section');
      const progressBar = document.getElementById('ocr-progress-bar');
      const progressText = document.getElementById('ocr-progress-text');
      const fileStatusList = document.getElementById('ocr-file-status-list');
      const etaSection = document.getElementById('ocr-eta-section');
      const etaText = document.getElementById('ocr-eta-text');
      const cancelBtn = document.getElementById('ocr-cancel-btn');
      
      let pollingAttempts = 0;
      const maxAttempts = 180; // 最大3分（1秒間隔）
      
      const pollInterval = setInterval(async () => {
        try {
          pollingAttempts++;
          
          if (pollingAttempts >= maxAttempts) {
            clearInterval(pollInterval);
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            throw new Error('OCR処理がタイムアウトしました。');
          }
          
          const statusResponse = await axios.get('/api/ocr-jobs/' + jobId, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          
          const job = statusResponse.data.job;
          const processedFiles = job.processed_files || 0;
          const totalFiles = job.total_files || 0;
          const status = job.status;
          
          // 進捗バーを更新
          const progress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;
          progressBar.style.width = progress + '%';
          progressText.textContent = processedFiles + '/' + totalFiles + ' 完了';
          
          // 推定時間計算
          const elapsedTime = (Date.now() - startTime) / 1000;
          if (processedFiles > 0 && processedFiles < totalFiles) {
            const estimatedTotalTime = (elapsedTime / processedFiles) * totalFiles;
            const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
            etaSection.classList.remove('hidden');
            etaText.textContent = '約' + Math.ceil(remainingTime) + '秒';
          }
          
          // ファイルステータス更新
          const statusItems = fileStatusList.children;
          for (let i = 0; i < statusItems.length; i++) {
            if (i < processedFiles) {
              statusItems[i].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700">ファイル ' + (i + 1) + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
            } else if (i === processedFiles) {
              statusItems[i].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i><span class="text-gray-700">ファイル ' + (i + 1) + '</span></div><span class="text-blue-600 text-xs font-medium">処理中</span>';
            }
          }
          
          // ステータスに応じた処理
          if (status === 'completed') {
            clearInterval(pollInterval);
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            
            progressBar.style.width = '100%';
            progressText.textContent = totalFiles + '/' + totalFiles + ' 完了';
            etaSection.classList.add('hidden');
            
            for (let i = 0; i < statusItems.length; i++) {
              statusItems[i].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700">ファイル ' + (i + 1) + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
            }
            
            setTimeout(() => {
              progressSection.classList.add('hidden');
            }, 1500);
            
            if (job.extracted_data) {
              displayOCRResultEditor(job.extracted_data);
            } else {
              showMessage('OCR処理は完了しましたが、データの取得に失敗しました。', 'error');
            }
            
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            progressSection.classList.add('hidden');
            showMessage('OCR処理に失敗しました: ' + (job.error_message || '不明なエラー'), 'error');
            
          } else if (status === 'cancelled') {
            clearInterval(pollInterval);
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            progressSection.classList.add('hidden');
            showMessage('OCR処理はキャンセルされました。', 'info');
          }
          
        } catch (error) {
          clearInterval(pollInterval);
          cancelBtn.style.display = 'none';
          localStorage.removeItem('currentOCRJobId');
          progressSection.classList.add('hidden');
          showMessage('OCR処理の監視中にエラーが発生しました: ' + error.message, 'error');
        }
      }, 1000);
      
      // キャンセルボタンのイベントハンドラ
      const cancelHandler = async () => {
        if (!confirm('OCR処理をキャンセルしますか？ 処理中のファイルは保存されません。')) {
          return;
        }
        
        try {
          await axios.delete('/api/ocr-jobs/' + jobId, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          
          clearInterval(pollInterval);
          cancelBtn.style.display = 'none';
          localStorage.removeItem('currentOCRJobId');
          progressSection.classList.add('hidden');
          showMessage('OCR処理をキャンセルしました。', 'info');
          
        } catch (error) {
          console.error('Cancel error:', error);
          showMessage('キャンセルに失敗しました: ' + (error.response?.data?.error || error.message), 'error');
        }
      };
      
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      const newCancelBtn = document.getElementById('ocr-cancel-btn');
      newCancelBtn.addEventListener('click', cancelHandler);
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

    // ストレージ使用量を取得して表示
    async function loadStorageQuota() {
      console.log('[Storage Quota] ========== START ==========');
      console.log('[Storage Quota] Token:', token ? 'exists (' + token.substring(0, 20) + '...)' : 'NULL/UNDEFINED');
      
      try {
        console.log('[Storage Quota] Calling API: /api/storage-quota');
        const response = await axios.get('/api/storage-quota', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log('[Storage Quota] API Response received:', response.status);
        const quota = response.data.quota;
        const usage = quota.usage;
        const usagePercent = usage.usage_percent.toFixed(1);
        const storageText = document.getElementById('storage-usage-text');
        const storageDisplay = document.getElementById('storage-quota-display');
        const progressContainer = document.getElementById('storage-progress-container');
        const progressBar = document.getElementById('storage-progress-bar');
        const warningAlert = document.getElementById('storage-warning-alert');
        const warningMessage = document.getElementById('storage-warning-message');
        
        if (storageText && storageDisplay) {
          storageText.textContent = usage.used_mb + 'MB / ' + usage.limit_mb + 'MB (' + usagePercent + '%)';
          
          // プログレスバー表示
          if (progressContainer && progressBar) {
            progressContainer.classList.remove('hidden');
            progressBar.style.width = Math.min(usage.usage_percent, 100) + '%';
            
            // 使用率に応じてプログレスバーの色を変更
            if (usage.usage_percent >= 95) {
              progressBar.className = 'bg-red-500 h-2 rounded-full transition-all duration-300';
            } else if (usage.usage_percent >= 80) {
              progressBar.className = 'bg-yellow-500 h-2 rounded-full transition-all duration-300';
            } else {
              progressBar.className = 'bg-blue-500 h-2 rounded-full transition-all duration-300';
            }
          }
          
          // 使用率に応じて色を変更
          if (usage.usage_percent >= 95) {
            storageDisplay.className = 'text-sm bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium border border-red-200';
            
            // 重大警告表示
            if (warningAlert && warningMessage) {
              warningAlert.className = 'mb-4 bg-red-50 border-l-4 border-red-400 p-4';
              warningMessage.textContent = 'ストレージ容量が限界に達しています（' + usagePercent + '%使用中）。ファイルのアップロードができなくなる可能性があります。不要なファイルを削除してください。';
              warningAlert.classList.remove('hidden');
            }
          } else if (usage.usage_percent >= 80) {
            storageDisplay.className = 'text-sm bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg font-medium border border-yellow-200';
            
            // 警告表示
            if (warningAlert && warningMessage) {
              warningAlert.className = 'mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4';
              warningMessage.textContent = 'ストレージ容量が残りわずかです（' + usagePercent + '%使用中）。残り容量: ' + usage.available_mb + 'MB';
              warningAlert.classList.remove('hidden');
            }
          } else {
            storageDisplay.className = 'text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-200';
            
            // 警告非表示
            if (warningAlert) {
              warningAlert.classList.add('hidden');
            }
          }
          
          console.log('[Storage Quota] Successfully loaded:', usage.used_mb + 'MB / ' + usage.limit_mb + 'MB');
        } else {
          console.error('[Storage Quota] CRITICAL: DOM elements not found after successful API call');
        }
      } catch (error) {
        console.error('[Storage Quota] ========== ERROR ==========');
        console.error('[Storage Quota] Error object:', error);
        console.error('[Storage Quota] Error type:', typeof error);
        console.error('[Storage Quota] Error.response:', error.response);
        console.error('[Storage Quota] Error.response?.status:', error.response?.status);
        console.error('[Storage Quota] Error.response?.data:', error.response?.data);
        console.error('[Storage Quota] Error.message:', error.message);
        
        const storageText = document.getElementById('storage-usage-text');
        const storageDisplay = document.getElementById('storage-quota-display');
        
        if (storageText) {
          // 認証エラーの場合は明確に表示
          if (error.response?.status === 401) {
            storageText.textContent = '認証エラー';
            if (storageDisplay) {
              storageDisplay.className = 'text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium border border-red-200';
            }
            console.warn('[Storage Quota] Authentication error - token may be expired');
            // 5秒後にログイン画面にリダイレクト
            setTimeout(() => {
              if (confirm('認証の有効期限が切れています。ログインページに移動しますか？')) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                window.location.href = '/';
              }
            }, 2000);
          } else if (!error.response) {
            // ネットワークエラーまたはCORS問題
            storageText.textContent = 'ネットワークエラー';
            if (storageDisplay) {
              storageDisplay.className = 'text-sm bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium border border-orange-200';
            }
            console.warn('[Storage Quota] Network error - please check your connection');
          } else {
            storageText.textContent = '取得失敗';
            if (storageDisplay) {
              storageDisplay.className = 'text-sm bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full font-medium border border-yellow-200';
            }
          }
        } else {
          console.error('[Storage Quota] CRITICAL: storageText element not found in error handler');
        }
      } finally {
        console.log('[Storage Quota] ========== END ==========');
      }
    }
    
    // OCR機能 - DOMContentLoaded後に初期化
    let dropZone, fileInput, previewContainer, previewImage, ocrStatus, ocrResult;
    
    // DOM要素を安全に取得する関数
    function initOCRElements() {
      console.log('[OCR Elements] initOCRElements called');
      if (!dropZone) {
        dropZone = document.getElementById('ocr-drop-zone');
        fileInput = document.getElementById('ocr-file-input');
        previewContainer = document.getElementById('ocr-preview-container');
        previewImage = document.getElementById('ocr-preview-image');
        ocrStatus = document.getElementById('ocr-status');
        ocrResult = document.getElementById('ocr-result');
        
        console.log('[OCR Elements] dropZone:', dropZone);
        console.log('[OCR Elements] fileInput:', fileInput);
        
        // OCRイベントリスナー（重複防止: dataset.listenerAttached）
        if (dropZone && fileInput) {
          // ドラッグ&ドロップ（重複防止）
          if (!dropZone.dataset.dragoverAttached) {
            dropZone.dataset.dragoverAttached = 'true';
            dropZone.addEventListener('dragover', (e) => {
              console.log('[OCR Elements] Dragover event');
              e.preventDefault();
              dropZone.classList.add('dragover');
            });
          }

          if (!dropZone.dataset.dragleaveAttached) {
            dropZone.dataset.dragleaveAttached = 'true';
            dropZone.addEventListener('dragleave', () => {
              dropZone.classList.remove('dragover');
            });
          }

          if (!dropZone.dataset.dropAttached) {
            dropZone.dataset.dropAttached = 'true';
            dropZone.addEventListener('drop', (e) => {
              console.log('[OCR Elements] Drop event');
              e.preventDefault();
              dropZone.classList.remove('dragover');
              const files = Array.from(e.dataTransfer.files).filter(f => 
                f.type.startsWith('image/') || f.type === 'application/pdf'
              );
              console.log('[OCR Elements] Files dropped:', files.length);
              if (files.length > 0) {
                processMultipleOCR(files);
              } else {
                // 非対応ファイルの場合
                displayOCRError(
                  'ファイル形式が対応していません',
                  '画像ファイル（PNG, JPG, JPEG, WEBP）またはPDFファイルをドロップしてください。'
                );
              }
            });
          }

          if (!fileInput.dataset.changeAttached) {
            fileInput.dataset.changeAttached = 'true';
            fileInput.addEventListener('change', (e) => {
              console.log('[OCR Elements] File input change event');
              const files = Array.from(e.target.files);
              console.log('[OCR Elements] Files selected:', files.length);
              if (files.length > 0) {
                processMultipleOCR(files);
              }
            });
          }
          console.log('[OCR Elements] Event listeners attached successfully (with duplication prevention)');
        }
      }
    }
    
    // ページ読み込み後に初期化（複数のタイミングで試行）
    function ensureOCRElementsInitialized() {
      console.log('[OCR Elements] ensureOCRElementsInitialized called, readyState:', document.readyState);
      if (document.readyState === 'loading') {
        console.log('[OCR Elements] Still loading, skipping');
        return; // まだ早すぎる
      }
      initOCRElements();
    }
    
    // 複数のタイミングで初期化を試行
    console.log('[OCR Elements] Initial readyState:', document.readyState);
    if (document.readyState === 'loading') {
      console.log('[OCR Elements] Adding DOMContentLoaded listener');
      document.addEventListener('DOMContentLoaded', ensureOCRElementsInitialized);
    } else {
      // すでにDOMContentLoaded後なら即座に実行
      console.log('[OCR Elements] DOM already loaded, initializing immediately');
      ensureOCRElementsInitialized();
    }
    window.addEventListener('load', ensureOCRElementsInitialized);
    console.log('[OCR Elements] Initialization setup complete');

    // OCR結果を一時保存する変数
    let currentOCRData = null;
    
    // リトライ用のファイル保存
    let lastUploadedFiles = [];

    /**
     * Convert PDF to images using PDF.js
     * @param {File} pdfFile - PDF file to convert
     * @returns {Promise<File[]>} Array of image files (one per page)
     */
    async function convertPdfToImages(pdfFile) {
      try {
        // Dynamically import PDF.js
        const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
        
        // Read PDF file as ArrayBuffer
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        console.log('[PDF Conversion] PDFファイル "' + pdfFile.name + '" を読み込みました（' + pdf.numPages + 'ページ）');
        
        // Convert each page to image
        const imageFiles = [];
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          // Set scale for high resolution (3.0 = 3x resolution for better OCR)
          // Higher resolution improves text recognition for small fonts in registry documents
          const scale = 3.0;
          const viewport = page.getViewport({ scale });
          
          // Create canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Render PDF page to canvas
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          await page.render(renderContext).promise;
          
          // Convert canvas to Blob
          const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png', 1.0);
          });
          
          // Create File object
          const fileName = pdfFile.name.replace(/\.pdf$/i, '_page' + pageNum + '.png');
          const imageFile = new File([blob], fileName, { type: 'image/png' });
          imageFiles.push(imageFile);
          
          console.log('[PDF Conversion] ページ ' + pageNum + '/' + pdf.numPages + ' を変換しました (' + (imageFile.size / 1024).toFixed(1) + 'KB)');
        }
        
        return imageFiles;
      } catch (error) {
        console.error('[PDF Conversion] PDF変換エラー:', error);
        throw new Error('PDF変換に失敗しました: ' + error.message);
      }
    }

    async function processMultipleOCR(files) {
      console.log('[OCR] ========================================');
      console.log('[OCR] OCR処理開始');
      console.log('[OCR] ファイル数:', files.length);
      console.log('[OCR] 認証トークン存在:', !!token);
      console.log('[OCR] ========================================');
      
      // ファイルを保存（リトライ用）
      lastUploadedFiles = Array.from(files);
      
      // PDFファイルを画像に変換
      const pdfFiles = files.filter(f => f.type === 'application/pdf');
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      
      console.log('[OCR] PDFファイル:', pdfFiles.length, '個');
      console.log('[OCR] 画像ファイル:', imageFiles.length, '個');
      
      let allFiles = [...imageFiles];
      
      if (pdfFiles.length > 0) {
        try {
          // Show conversion progress
          previewContainer.classList.remove('hidden');
          const progressSection = document.getElementById('ocr-progress-section');
          progressSection.classList.remove('hidden');
          document.getElementById('ocr-progress-text').textContent = 'PDFファイルを画像に変換中...';
          document.getElementById('ocr-progress-bar').style.width = '10%';
          
          for (const pdfFile of pdfFiles) {
            console.log('[PDF Conversion] PDFファイル "' + pdfFile.name + '" を変換中...');
            const convertedImages = await convertPdfToImages(pdfFile);
            allFiles.push(...convertedImages);
            console.log('[PDF Conversion] ' + pdfFile.name + ' から ' + convertedImages.length + ' 枚の画像を生成しました');
          }
          
          document.getElementById('ocr-progress-text').textContent = 'PDF変換完了。OCR処理を開始します...';
          document.getElementById('ocr-progress-bar').style.width = '20%';
          
        } catch (error) {
          console.error('[PDF Conversion] PDF変換エラー:', error);
          displayOCRError('PDF変換エラー', error.message);
          return;
        }
      }
      
      // リセット
      previewContainer.classList.remove('hidden');
      document.getElementById('ocr-progress-section').classList.add('hidden');
      document.getElementById('ocr-error-section').classList.add('hidden');
      document.getElementById('ocr-result-edit-section').classList.add('hidden');
      
      // 複数ファイルのプレビュー
      previewImage.style.display = 'none';
      const multiPreview = document.getElementById('multi-file-preview');
      multiPreview.innerHTML = '';
      multiPreview.className = 'grid grid-cols-2 gap-4 mb-4';
      
      allFiles.forEach(file => {
        const fileCard = document.createElement('div');
        fileCard.className = 'flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200';
        
        const icon = document.createElement('i');
        icon.className = file.type === 'application/pdf' ? 
          'fas fa-file-pdf text-4xl text-red-500 mb-2' :
          'fas fa-file-image text-4xl text-blue-500 mb-2';
        
        const fileName = document.createElement('p');
        fileName.className = 'text-sm font-medium text-gray-700 truncate w-full text-center';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('p');
        fileSize.className = 'text-xs text-gray-500';
        fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        
        fileCard.appendChild(icon);
        fileCard.appendChild(fileName);
        fileCard.appendChild(fileSize);
        multiPreview.appendChild(fileCard);
      });

      // プログレスバー初期化
      const progressSection = document.getElementById('ocr-progress-section');
      const progressBar = document.getElementById('ocr-progress-bar');
      const progressText = document.getElementById('ocr-progress-text');
      const fileStatusList = document.getElementById('ocr-file-status-list');
      const etaSection = document.getElementById('ocr-eta-section');
      const etaText = document.getElementById('ocr-eta-text');
      
      progressSection.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressText.textContent = '0/' + allFiles.length + ' 完了';
      fileStatusList.innerHTML = '';
      etaSection.classList.add('hidden');
      
      // ファイル毎のステータス作成
      const fileStatusItems = {};
      allFiles.forEach((file, index) => {
        const statusItem = document.createElement('div');
        statusItem.className = 'flex items-center justify-between text-sm p-2 bg-white rounded border border-gray-200';
        statusItem.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-clock text-gray-400 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-gray-500 text-xs">待機中</span>';
        fileStatusList.appendChild(statusItem);
        fileStatusItems[index] = statusItem;
      });

      // OCR実行（非同期ジョブとして送信）
      const startTime = Date.now();
      let currentJobId = null;
      let currentPollInterval = null;
      const cancelBtn = document.getElementById('ocr-cancel-btn');
      
      try {
        const formData = new FormData();
        allFiles.forEach(file => {
          formData.append('files', file);
        });

        // ステップ1: ジョブを作成
        console.log('[OCR] ジョブ作成リクエスト送信中...');
        console.log('[OCR] ファイル数:', allFiles.length);
        
        const createResponse = await axios.post('/api/ocr-jobs', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        currentJobId = createResponse.data.job_id;
        console.log('[OCR] ✅ ジョブ作成成功 - Job ID:', currentJobId);
        console.log('[OCR] レスポンス:', createResponse.data);
        
        // localStorageにjobIdを保存（永続化）
        localStorage.setItem('currentOCRJobId', currentJobId);
        
        // キャンセルボタンを表示
        cancelBtn.style.display = 'block';

        // ステップ2: 共通ポーリング関数を使用
        // 既存の詳細なポーリングロジックを保持
        let pollingAttempts = 0;
        const maxAttempts = 120; // 最大2分（1秒間隔）
        
        currentPollInterval = setInterval(async () => {
          try {
            pollingAttempts++;
            
            // タイムアウトチェック
            if (pollingAttempts >= maxAttempts) {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              throw new Error('OCR処理がタイムアウトしました。処理に時間がかかっています。');
            }
            
            // ジョブのステータスを取得
            const statusResponse = await axios.get('/api/ocr-jobs/' + currentJobId, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            
            const job = statusResponse.data.job;
            const processedFiles = job.processed_files || 0;
            const totalFiles = job.total_files || allFiles.length;
            const status = job.status;
            
            // 進捗バーを更新（実際の進捗に基づく）
            const progress = Math.round((processedFiles / totalFiles) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = processedFiles + '/' + totalFiles + ' 完了';
            
            // 推定時間計算
            const elapsedTime = (Date.now() - startTime) / 1000;
            if (processedFiles > 0) {
              const estimatedTotalTime = (elapsedTime / processedFiles) * totalFiles;
              const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
              etaSection.classList.remove('hidden');
              etaText.textContent = '約' + Math.ceil(remainingTime) + '秒';
            }
            
            // ファイルステータス更新（実際の進捗に基づく）
            allFiles.forEach((file, index) => {
              if (index < processedFiles) {
                fileStatusItems[index].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
              } else if (index === processedFiles) {
                fileStatusItems[index].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-blue-600 text-xs font-medium">処理中</span>';
              }
            });
            
            // ステータスに応じた処理
            if (status === 'completed') {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              
              // 完了処理
              progressBar.style.width = '100%';
              progressText.textContent = totalFiles + '/' + totalFiles + ' 完了';
              etaSection.classList.add('hidden');
              
              files.forEach((file, index) => {
                fileStatusItems[index].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
              });
              
              setTimeout(() => {
                progressSection.classList.add('hidden');
              }, 1500);
              
              // 抽出データを表示
              if (job.extracted_data) {
                currentOCRData = job.extracted_data;
                displayOCRResultEditor(job.extracted_data);
              } else {
                throw new Error('抽出データが見つかりません');
              }
              
            } else if (status === 'failed') {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              throw new Error(job.error_message || 'OCR処理に失敗しました');
            } else if (status === 'cancelled') {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              progressSection.classList.add('hidden');
              showMessage('OCR処理をキャンセルしました。', 'info');
              return;
            }
            
          } catch (pollError) {
            clearInterval(currentPollInterval);
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            progressSection.classList.add('hidden');
            displayOCRError(pollError);
          }
        }, 1000); // 1秒ごとにポーリング
        
        // キャンセルボタンのイベントハンドラ
        const cancelHandler = async () => {
          if (!confirm('OCR処理をキャンセルしますか？ 処理中のファイルは保存されません。')) {
            return;
          }
          
          try {
            // APIでジョブをキャンセル
            await axios.delete('/api/ocr-jobs/' + currentJobId, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            
            // ポーリングを停止
            if (currentPollInterval) {
              clearInterval(currentPollInterval);
            }
            
            // UIを更新
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            progressSection.classList.add('hidden');
            showMessage('OCR処理をキャンセルしました。', 'info');
            
          } catch (error) {
            console.error('Cancel error:', error);
            showMessage('キャンセルに失敗しました: ' + (error.response?.data?.error || error.message), 'error');
          }
        };
        
        // 既存のハンドラを削除してから新しいハンドラを追加
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        const newCancelBtn = document.getElementById('ocr-cancel-btn');
        newCancelBtn.addEventListener('click', cancelHandler);


      } catch (error) {
        console.error('[OCR] ❌ OCR処理エラー:', error);
        console.error('[OCR] エラー詳細:');
        console.error('[OCR]   - Status:', error.response?.status);
        console.error('[OCR]   - Message:', error.message);
        console.error('[OCR]   - Response:', error.response?.data);
        
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
        if (currentPollInterval) {
          clearInterval(currentPollInterval);
        }
        localStorage.removeItem('currentOCRJobId');
        progressSection.classList.add('hidden');
        
        // 認証エラーの場合は特別な処理
        if (error.response?.status === 401) {
          console.error('[OCR] 認証エラー - トークンが無効または期限切れ');
          showMessage('認証エラーが発生しました。ページを再読み込みしてログインし直してください。', 'error');
        }
        
        // エラー表示
        displayOCRError(error);
      }
    }
    
    // OCR処理関数をグローバルに公開（イベント委譲から呼び出し可能にする）
    window.processMultipleOCR = processMultipleOCR;

    // OCR結果編集UIの表示
    function displayOCRResultEditor(extractedData) {
      const resultSection = document.getElementById('ocr-result-edit-section');
      const confidenceBadge = document.getElementById('ocr-confidence-badge');
      const confidenceWarning = document.getElementById('ocr-confidence-warning');
      const extractedDataContainer = document.getElementById('ocr-extracted-data');
      
      resultSection.classList.remove('hidden');
      
      // 信頼度バッジ（overall_confidence or confidence）
      const confidence = extractedData.overall_confidence || extractedData.confidence || 0.5;
      if (confidence >= 0.9) {
        confidenceBadge.className = 'text-sm px-3 py-1 rounded-full font-medium bg-green-100 text-green-800';
        confidenceBadge.innerHTML = '<i class="fas fa-check-circle mr-1"></i>信頼度: 高 (' + (confidence * 100).toFixed(0) + '%)';
        confidenceWarning.classList.add('hidden');
      } else if (confidence >= 0.7) {
        confidenceBadge.className = 'text-sm px-3 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800';
        confidenceBadge.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>信頼度: 中 (' + (confidence * 100).toFixed(0) + '%)';
        confidenceWarning.classList.remove('hidden');
      } else {
        confidenceBadge.className = 'text-sm px-3 py-1 rounded-full font-medium bg-red-100 text-red-800';
        confidenceBadge.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>信頼度: 低 (' + (confidence * 100).toFixed(0) + '%)';
        confidenceWarning.classList.remove('hidden');
      }
      
      // フィールドマッピング
      const fieldMapping = {
        property_name: '物件名称',
        location: '所在地',
        station: '最寄り駅',
        walk_minutes: '徒歩分数',
        land_area: '土地面積',
        building_area: '建物面積',
        zoning: '用途地域',
        building_coverage: '建蔽率',
        floor_area_ratio: '容積率',
        price: '価格',
        structure: '構造',
        built_year: '築年月',
        road_info: '道路情報',
        frontage: '間口',
        current_status: '現況',
        yield: '表面利回り',
        occupancy: '賃貸状況'
      };
      
      // 編集可能フィールド生成（フィールド毎の信頼度対応）
      extractedDataContainer.innerHTML = '';
      Object.entries(fieldMapping).forEach(([key, label]) => {
        if (key === 'confidence' || key === 'overall_confidence') return;
        
        // 新形式: {value: "...", confidence: 0.9} または旧形式: "..." に対応
        let value, fieldConfidence;
        if (extractedData[key] && typeof extractedData[key] === 'object') {
          value = extractedData[key].value || '';
          fieldConfidence = extractedData[key].confidence || 0.5;
        } else {
          value = extractedData[key] || '';
          fieldConfidence = confidence; // 全体の信頼度を使用
        }
        
        // 信頼度に基づくスタイリング
        let fieldClass = 'border-gray-300';
        let confidenceBadge = '';
        if (fieldConfidence < 0.7 && value) {
          fieldClass = 'border-red-300 bg-red-50';
          confidenceBadge = '<span class="text-xs text-red-600 ml-1">(' + (fieldConfidence * 100).toFixed(0) + '%)</span>';
        } else if (fieldConfidence < 0.9 && value) {
          fieldClass = 'border-yellow-300 bg-yellow-50';
          confidenceBadge = '<span class="text-xs text-yellow-600 ml-1">(' + (fieldConfidence * 100).toFixed(0) + '%)</span>';
        } else if (value) {
          confidenceBadge = '<span class="text-xs text-green-600 ml-1">(' + (fieldConfidence * 100).toFixed(0) + '%)</span>';
        }
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'flex flex-col';
        fieldDiv.innerHTML = '<label class="text-xs font-medium text-gray-600 mb-1">' + label + confidenceBadge + '</label><input type="text" data-field="' + key + '" value="' + value + '" placeholder="未抽出" class="px-2 py-1 border ' + fieldClass + ' rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">';
        extractedDataContainer.appendChild(fieldDiv);
      });
      
      // 履歴に自動保存
      saveOCRHistory(extractedData);
      
      // 建築法規チェックを自動実行（構造と階数が取得できた場合）
      checkBuildingRegulations(extractedData);
    }
    
    // 建築法規チェック関数
    async function checkBuildingRegulations(extractedData) {
      try {
        // 構造と階数を抽出
        let structure = '';
        let floors = 0;
        
        // 構造の取得（新形式・旧形式対応）
        if (extractedData.structure) {
          structure = typeof extractedData.structure === 'object' ? 
                      extractedData.structure.value : 
                      extractedData.structure;
        }
        
        // 階数の推定（構造から抽出：「3階建て木造」「木造3階」等）
        if (structure) {
          const match = structure.match(/(\d+)階/);
          if (match) {
            floors = parseInt(match[1]);
          }
        }
        
        // 3階建て木造の場合のみ建築法規チェックを実行
        if ((structure.includes('木造') || structure.includes('W造')) && floors === 3) {
          const checkData = {
            location: typeof extractedData.location === 'object' ? extractedData.location.value : extractedData.location,
            zoning: typeof extractedData.zoning === 'object' ? extractedData.zoning.value : extractedData.zoning,
            fire_zone: extractedData.fire_zone ? (typeof extractedData.fire_zone === 'object' ? extractedData.fire_zone.value : extractedData.fire_zone) : '',
            current_status: typeof extractedData.current_status === 'object' ? extractedData.current_status.value : extractedData.current_status,
            structure: structure,
            floors: floors
          };
          
          const response = await axios.post('/api/building-regulations/check', checkData, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          
          if (response.data.success) {
            displayBuildingRegulationsResult(response.data.data);
          }
        }
      } catch (error) {
        console.error('建築法規チェックエラー:', error);
        // エラーは表示せず、チェック結果が表示されないだけ
      }
    }
    
    // 建築法規チェック結果の表示
    function displayBuildingRegulationsResult(data) {
      // 結果表示エリアを取得または作成
      let regulationsSection = document.getElementById('building-regulations-section');
      if (!regulationsSection) {
        regulationsSection = document.createElement('div');
        regulationsSection.id = 'building-regulations-section';
        regulationsSection.className = 'mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg';
        
        // OCR結果セクションの後に挿入
        const resultSection = document.getElementById('ocr-result-edit-section');
        if (resultSection && resultSection.parentNode) {
          resultSection.parentNode.insertBefore(regulationsSection, resultSection.nextSibling);
        }
      }
      
      regulationsSection.classList.remove('hidden');
      
      // 3階建て木造の警告バッジ
      let html = '<div class="mb-4">';
      if (data.is_three_story_wooden) {
        html += '<div class="flex items-center mb-3"><i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-2"></i><h3 class="text-lg font-bold text-yellow-800">⚠️ 3階建て木造建築の特別規定が適用されます</h3></div>';
        html += '<div class="mb-3 p-3 bg-white rounded border border-yellow-300"><p class="text-sm text-gray-700"><strong>構造:</strong> ' + (data.structure || '不明') + ' | <strong>階数:</strong> ' + (data.floors || '不明') + '階</p></div>';
      } else {
        html += '<h3 class="text-lg font-bold text-gray-800 mb-3"><i class="fas fa-balance-scale mr-2"></i>適用される建築基準法・条例</h3>';
      }
      html += '</div>';
      
      // 該当する法規の一覧表示
      if (data.applicable_regulations && data.applicable_regulations.length > 0) {
        html += '<div class="space-y-3">';
        data.applicable_regulations.forEach((reg, index) => {
          const categoryColors = {
            'BUILDING_CODE': 'bg-blue-50 border-blue-300 text-blue-800',
            'LOCAL_ORDINANCE': 'bg-green-50 border-green-300 text-green-800',
            'PARKING': 'bg-purple-50 border-purple-300 text-purple-800',
            'ENVIRONMENT': 'bg-teal-50 border-teal-300 text-teal-800',
            'OTHER': 'bg-gray-50 border-gray-300 text-gray-800'
          };
          const colorClass = categoryColors[reg.category] || categoryColors['OTHER'];
          
          html += '<div class="p-3 border rounded ' + colorClass + '">';
          html += '<h4 class="font-bold text-sm mb-1">' + (index + 1) + '. ' + reg.title + '</h4>';
          html += '<p class="text-xs mb-2">' + reg.description + '</p>';
          html += '<p class="text-xs italic">📖 ' + reg.article + '</p>';
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<p class="text-sm text-gray-600">該当する建築基準法・条例が検出されませんでした。</p>';
      }
      
      // 駐車場設置義務の表示
      if (data.has_parking_requirement && data.parking_info) {
        html += '<div class="mt-4 p-3 bg-purple-50 border border-purple-300 rounded">';
        html += '<h4 class="font-bold text-sm text-purple-800 mb-2"><i class="fas fa-parking mr-1"></i>駐車場設置義務</h4>';
        html += '<p class="text-xs text-purple-700">' + data.parking_info.prefecture + ': ' + data.parking_info.requirement.description + '</p>';
        html += '</div>';
      }
      
      regulationsSection.innerHTML = html;
    }

    // OCR履歴保存
    async function saveOCRHistory(extractedData) {
      try {
        await axios.post('/api/ocr-history', {
          file_names: 'OCR抽出結果',
          extracted_data: extractedData,
          confidence_score: extractedData.confidence || 0.5,
          processing_time_ms: 0
        }, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
      } catch (error) {
        console.error('Failed to save OCR history:', error);
      }
    }

    // エラー表示
    function displayOCRError(error) {
      const errorSection = document.getElementById('ocr-error-section');
      const errorMessage = document.getElementById('ocr-error-message');
      const errorSolution = document.getElementById('ocr-error-solution');
      
      errorSection.classList.remove('hidden');
      
      let message = 'OCR処理中に問題が発生しました。';
      let solution = '';
      
      if (error.response) {
        const errorData = error.response.data;
        
        if (error.response.status === 400) {
          message = 'アップロードされたファイルに問題があります。';
          solution = '✓ ファイル形式を確認してください（PNG、JPG、PDF対応）\\n✓ ファイルサイズが大きすぎないか確認してください（1ファイル10MB以下推奨）';
        } else if (error.response.status === 401) {
          message = '認証エラーが発生しました。';
          solution = '✓ ページを再読み込みしてログインし直してください';
        } else if (error.response.status === 500) {
          message = errorData.error || 'サーバーエラーが発生しました。';
          solution = '✓ ファイルが破損していないか確認してください\\n✓ 画像の品質が十分か確認してください（解像度300dpi以上推奨）\\n✓ しばらく待ってから再試行してください';
        } else {
          message = errorData.error || 'エラーが発生しました。';
          solution = '✓ 問題が続く場合は管理者にお問い合わせください';
        }
      } else if (error.request) {
        message = 'サーバーに接続できませんでした。';
        solution = '✓ インターネット接続を確認してください\\n✓ しばらく待ってから再試行してください';
      } else {
        message = error.message || '不明なエラーが発生しました。';
        solution = '✓ ページを再読み込みして再試行してください';
      }
      
      errorMessage.textContent = message;
      errorSolution.innerHTML = solution.split('\\n').map(function(line) { return '<div>' + line + '</div>'; }).join('');
    }
    
    // エラー閉じるボタン
    document.getElementById('ocr-error-dismiss-btn').addEventListener('click', () => {
      document.getElementById('ocr-error-section').classList.add('hidden');
    });
    
    // リトライボタン（最後にアップロードされたファイルを再処理）
    let retryAttempts = 0;
    const maxRetryAttempts = 3;
    
    document.getElementById('ocr-retry-btn').addEventListener('click', async () => {
      if (lastUploadedFiles.length === 0) {
        showMessage('再試行するファイルがありません。ファイルを選択してください。', 'error');
        return;
      }
      
      if (retryAttempts >= maxRetryAttempts) {
        if (!confirm('既に' + maxRetryAttempts + '回再試行しています。続行しますか？')) {
          return;
        }
        retryAttempts = 0;
      }
      
      retryAttempts++;
      
      // エラー表示を非表示
      document.getElementById('ocr-error-section').classList.add('hidden');
      
      // 再度OCR処理を実行（v3.12.0の非同期ジョブAPIを使用）
      const formData = new FormData();
      lastUploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // プログレスバー初期化
      const progressSection = document.getElementById('ocr-progress-section');
      const progressBar = document.getElementById('ocr-progress-bar');
      const progressText = document.getElementById('ocr-progress-text');
      const fileStatusList = document.getElementById('ocr-file-status-list');
      const etaSection = document.getElementById('ocr-eta-section');
      const cancelBtn = document.getElementById('ocr-cancel-btn');
      
      progressSection.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressText.textContent = '0/' + lastUploadedFiles.length + ' 完了';
      fileStatusList.innerHTML = '';
      etaSection.classList.add('hidden');
      
      // ファイル毎のステータス作成
      lastUploadedFiles.forEach((file, index) => {
        const statusItem = document.createElement('div');
        statusItem.className = 'flex items-center justify-between text-sm p-2 bg-white rounded border border-gray-200';
        statusItem.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-clock text-gray-400 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-gray-500 text-xs">待機中</span>';
        fileStatusList.appendChild(statusItem);
      });
      
      try {
        const startTime = Date.now();
        let currentJobId = null;
        let currentPollInterval = null;
        
        // ステップ1: ジョブを作成
        const createResponse = await axios.post('/api/ocr-jobs', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        currentJobId = createResponse.data.job_id;
        console.log('OCR retry job created:', currentJobId);
        
        // localStorageにjobIdを保存
        localStorage.setItem('currentOCRJobId', currentJobId);
        
        // キャンセルボタンを表示
        cancelBtn.style.display = 'block';

        // ステップ2: ポーリングで進捗を監視（既存のロジックを再利用）
        let pollingAttempts = 0;
        const maxAttempts = 180;
        
        currentPollInterval = setInterval(async () => {
          try {
            pollingAttempts++;
            
            if (pollingAttempts >= maxAttempts) {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              throw new Error('OCR処理がタイムアウトしました。');
            }
            
            const statusResponse = await axios.get('/api/ocr-jobs/' + currentJobId, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            
            const job = statusResponse.data.job;
            const processedFiles = job.processed_files || 0;
            const totalFiles = job.total_files || lastUploadedFiles.length;
            const status = job.status;
            
            const progress = Math.round((processedFiles / totalFiles) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = processedFiles + '/' + totalFiles + ' 完了';
            
            const elapsedTime = (Date.now() - startTime) / 1000;
            if (processedFiles > 0) {
              const estimatedTotalTime = (elapsedTime / processedFiles) * totalFiles;
              const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
              etaSection.classList.remove('hidden');
              document.getElementById('ocr-eta-text').textContent = '約' + Math.ceil(remainingTime) + '秒';
            }
            
            const statusItems = fileStatusList.children;
            for (let i = 0; i < statusItems.length; i++) {
              if (i < processedFiles) {
                statusItems[i].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700 truncate">' + lastUploadedFiles[i].name + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
              } else if (i === processedFiles) {
                statusItems[i].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i><span class="text-gray-700 truncate">' + lastUploadedFiles[i].name + '</span></div><span class="text-blue-600 text-xs font-medium">処理中</span>';
              }
            }
            
            if (status === 'completed') {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              retryAttempts = 0;
              
              progressBar.style.width = '100%';
              progressText.textContent = totalFiles + '/' + totalFiles + ' 完了';
              etaSection.classList.add('hidden');
              
              for (let i = 0; i < statusItems.length; i++) {
                statusItems[i].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700 truncate">' + lastUploadedFiles[i].name + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
              }
              
              setTimeout(() => {
                progressSection.classList.add('hidden');
              }, 1500);
              
              if (job.extracted_data) {
                currentOCRData = job.extracted_data;
                displayOCRResultEditor(job.extracted_data);
              } else {
                throw new Error('抽出データが見つかりません');
              }
              
            } else if (status === 'failed') {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              throw new Error(job.error_message || 'OCR処理に失敗しました');
            } else if (status === 'cancelled') {
              clearInterval(currentPollInterval);
              cancelBtn.style.display = 'none';
              localStorage.removeItem('currentOCRJobId');
              progressSection.classList.add('hidden');
              showMessage('OCR処理をキャンセルしました。', 'info');
              return;
            }
            
          } catch (pollError) {
            clearInterval(currentPollInterval);
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            progressSection.classList.add('hidden');
            displayOCRError(pollError);
          }
        }, 1000);
        
        // キャンセルボタンのイベントハンドラ
        const cancelHandler = async () => {
          if (!confirm('OCR処理をキャンセルしますか？ 処理中のファイルは保存されません。')) {
            return;
          }
          
          try {
            await axios.delete('/api/ocr-jobs/' + currentJobId, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (currentPollInterval) {
              clearInterval(currentPollInterval);
            }
            
            cancelBtn.style.display = 'none';
            localStorage.removeItem('currentOCRJobId');
            progressSection.classList.add('hidden');
            showMessage('OCR処理をキャンセルしました。', 'info');
            
          } catch (error) {
            console.error('Cancel error:', error);
            showMessage('キャンセルに失敗しました: ' + (error.response?.data?.error || error.message), 'error');
          }
        };
        
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        const newCancelBtn = document.getElementById('ocr-cancel-btn');
        newCancelBtn.addEventListener('click', cancelHandler);
        
      } catch (error) {
        console.error('OCR retry failed:', error);
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
        if (currentPollInterval) {
          clearInterval(currentPollInterval);
        }
        localStorage.removeItem('currentOCRJobId');
        progressSection.classList.add('hidden');
        displayOCRError(error);
      }
    });

    // フォームへの適用 - 安全に初期化（once:true で1回のみ実行）
    function initOCRButtons() {
      const ocrApplyBtn = document.getElementById('ocr-apply-btn');
      if (ocrApplyBtn && !ocrApplyBtn.dataset.listenerAttached) {
        ocrApplyBtn.dataset.listenerAttached = 'true';
        ocrApplyBtn.addEventListener('click', () => {
      if (!currentOCRData) return;
      
      // 編集内容を取得
      const inputs = document.querySelectorAll('#ocr-extracted-data input[data-field]');
      const updatedData = {};
      inputs.forEach(input => {
        const field = input.getAttribute('data-field');
        updatedData[field] = input.value;
      });
      
      // フォームに自動入力
      if (updatedData.property_name) document.getElementById('title').value = updatedData.property_name;
      if (updatedData.location) document.getElementById('location').value = updatedData.location;
      if (updatedData.station) document.getElementById('station').value = updatedData.station;
      if (updatedData.walk_minutes) document.getElementById('walk_minutes').value = updatedData.walk_minutes;
      if (updatedData.land_area) document.getElementById('land_area').value = updatedData.land_area;
      if (updatedData.building_area) document.getElementById('building_area').value = updatedData.building_area;
      if (updatedData.zoning) document.getElementById('zoning').value = updatedData.zoning;
      if (updatedData.building_coverage) document.getElementById('building_coverage').value = updatedData.building_coverage;
      if (updatedData.floor_area_ratio) document.getElementById('floor_area_ratio').value = updatedData.floor_area_ratio;
      if (updatedData.road_info) document.getElementById('road_info').value = updatedData.road_info;
      if (updatedData.frontage) document.getElementById('frontage').value = updatedData.frontage;
      if (updatedData.structure) document.getElementById('structure').value = updatedData.structure;
      if (updatedData.built_year) document.getElementById('built_year').value = updatedData.built_year;
      if (updatedData.current_status) document.getElementById('current_status').value = updatedData.current_status;
      if (updatedData.yield) document.getElementById('yield_rate').value = updatedData.yield;
      if (updatedData.occupancy) document.getElementById('occupancy_status').value = updatedData.occupancy;
      if (updatedData.price) document.getElementById('desired_price').value = updatedData.price;
      
      // 成功メッセージ
      alert('✓ フォームに情報を反映しました。内容を確認して保存してください。');
      
      // OCRセクションを閉じる
      document.getElementById('ocr-result-edit-section').classList.add('hidden');
      previewContainer.classList.add('hidden');
        });
      }
      
      // 再抽出
      const ocrReextractBtn = document.getElementById('ocr-reextract-btn');
      if (ocrReextractBtn && !ocrReextractBtn.dataset.listenerAttached) {
        ocrReextractBtn.dataset.listenerAttached = 'true';
        ocrReextractBtn.addEventListener('click', () => {
          const fileInput = document.getElementById('ocr-file-input');
          if (fileInput) fileInput.click();
        });
      }

      // OCR設定モーダル
      console.log('[OCR] Initializing OCR settings button');
      const settingsModal = document.getElementById('ocr-settings-modal');
      const settingsBtn = document.getElementById('ocr-settings-btn');
      const closeSettingsBtn = document.getElementById('close-settings-modal');
      
      console.log('[OCR] settingsBtn:', settingsBtn);
      console.log('[OCR] settingsModal:', settingsModal);
      
      // 設定ボタン - モーダルを開く
      // ⚠️ イベント委譲パターン（deals-new-events.js）で処理するためコメントアウト
      /*
      if (settingsBtn && settingsModal) {
        // 既存のリスナーを削除してから追加
        const newSettingsBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
        
        newSettingsBtn.addEventListener('click', async (e) => {
          console.log('[OCR] Settings button clicked');
          e.preventDefault();
          e.stopPropagation();
          settingsModal.classList.remove('hidden');
          await loadSettings();
        });
        console.log('[OCR] Event listener attached to settings button');
      } else {
        console.error('[OCR] Settings button or modal not found');
      }
      
      // 設定モーダルを閉じる
      if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
          settingsModal.classList.add('hidden');
        });
      }
    
    document.getElementById('cancel-settings-btn').addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
    
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });
    */
    
    // ⚠️ イベント委譲で処理するため、loadSettings関数は window スコープに移動
    console.log('[OCR] Settings button event delegation enabled');
    console.log('[OCR] settingsBtn:', settingsBtn);
    console.log('[OCR] settingsModal:', settingsModal);
    
    // 設定読み込み
    // ⚠️ イベント委譲パターンから呼び出せるようにwindowスコープに昇格
    window.loadSettings = async function loadSettings() {
      try {
        const response = await axios.get('/api/ocr-settings', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const settings = response.data.settings || {};
        
        document.getElementById('setting-auto-save').checked = settings.auto_save || false;
        document.getElementById('setting-confidence-threshold').value = Math.round((settings.confidence_threshold || 0.7) * 100);
        document.getElementById('confidence-threshold-value').textContent = Math.round((settings.confidence_threshold || 0.7) * 100) + '%';
        document.getElementById('setting-enable-batch').checked = settings.enable_batch !== false;
        document.getElementById('setting-max-batch-size').value = settings.max_batch_size || 10;
        
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    
    // 信頼度閾値スライダーのリアルタイム更新
    document.getElementById('setting-confidence-threshold').addEventListener('input', (e) => {
      document.getElementById('confidence-threshold-value').textContent = e.target.value + '%';
    });
    
    // OCR設定フォーム送信
    // OCR設定保存関数をグローバルスコープに定義（deals-new-events.jsから呼び出し可能）
    window.saveOCRSettings = async function() {
      console.log('[OCR Settings] saveOCRSettings called');
      try {
        const settings = {
          auto_save_history: document.getElementById('setting-auto-save').checked ? 1 : 0,
          default_confidence_threshold: parseFloat(document.getElementById('setting-confidence-threshold').value) / 100,
          enable_batch_processing: document.getElementById('setting-enable-batch').checked ? 1 : 0,
          max_batch_size: parseInt(document.getElementById('setting-max-batch-size').value)
        };
        
        console.log('[OCR Settings] Sending settings:', settings);
        
        const response = await axios.put('/api/ocr-settings', settings, {
          headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[OCR Settings] Save response:', response.data);
        
        settingsModal.classList.add('hidden');
        alert('✓ 設定を保存しました');
        
      } catch (error) {
        console.error('[OCR Settings] Failed to save settings:', error);
        console.error('[OCR Settings] Error details:', error.response?.data);
        alert('設定の保存に失敗しました');
      }
    };
    
    // フォーム送信は deals-new-events.js でハンドリング（重複防止のためコメントアウト）
    /*
    document.getElementById('ocr-settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await window.saveOCRSettings();
    });
    */

      // 履歴モーダル
      console.log('[OCR] Initializing OCR history button');
      const historyModal = document.getElementById('ocr-history-modal');
      const historyBtn = document.getElementById('ocr-history-btn');
      const closeHistoryBtn = document.getElementById('close-history-modal');
      
      console.log('[OCR] historyBtn:', historyBtn);
      console.log('[OCR] historyModal:', historyModal);
      
      // ⚠️ イベント委譲パターン（deals-new-events.js）で処理するためコメントアウト
      /*
      if (historyBtn && historyModal) {
        // 既存のリスナーを削除してから追加
        const newHistoryBtn = historyBtn.cloneNode(true);
        historyBtn.parentNode.replaceChild(newHistoryBtn, historyBtn);
        
        newHistoryBtn.addEventListener('click', async (e) => {
          console.log('[OCR] History button clicked');
          e.preventDefault();
          e.stopPropagation();
          historyModal.classList.remove('hidden');
          await loadOCRHistory();
        });
        console.log('[OCR] Event listener attached to history button');
      } else {
      */
      
      // ⚠️ イベント委譲で処理するため、loadOCRHistory関数は window スコープに移動
      console.log('[OCR] History button event delegation enabled');
      console.log('[OCR] historyBtn:', historyBtn);
      console.log('[OCR] historyModal:', historyModal);
      
      if (!historyBtn || !historyModal) {
        console.error('[OCR] History button or modal not found');
      }

      // ⚠️ イベント委譲パターン（deals-new-events.js）で処理するためコメントアウト
      /*
      if (closeHistoryBtn && historyModal) {
        closeHistoryBtn.addEventListener('click', () => {
          historyModal.classList.add('hidden');
        });
      }

      if (historyModal) {
        historyModal.addEventListener('click', (e) => {
          if (e.target === historyModal) {
            historyModal.classList.add('hidden');
          }
        });
      }
      */
      console.log('[OCR] Modal close buttons event delegation enabled');
    }
    
    // ページ読み込み後に初期化（複数のタイミングで試行）
    function ensureOCRButtonsInitialized() {
      console.log('[OCR] ensureOCRButtonsInitialized called, readyState:', document.readyState);
      if (document.readyState === 'loading') {
        console.log('[OCR] Still loading, skipping');
        return; // まだ早すぎる
      }
      initOCRButtons();
    }
    
    // 複数のタイミングで初期化を試行
    console.log('[OCR] Initial readyState:', document.readyState);
    if (document.readyState === 'loading') {
      console.log('[OCR] Adding DOMContentLoaded listener');
      document.addEventListener('DOMContentLoaded', ensureOCRButtonsInitialized);
    } else {
      // すでにDOMContentLoaded後なら即座に実行
      console.log('[OCR] DOM already loaded, initializing immediately');
      ensureOCRButtonsInitialized();
    }
    window.addEventListener('load', ensureOCRButtonsInitialized);
    console.log('[OCR] Initialization setup complete');

    // 現在のフィルター状態
    let currentHistoryFilter = { search: '', minConfidence: 0, maxConfidence: 1 };
    
    // 履歴読み込み（検索・フィルター対応）
    // ページネーション状態
    let currentPage = 1;
    const itemsPerPage = 20;
    let totalHistories = 0;
    
    // ⚠️ イベント委譲パターンから呼び出せるようにwindowスコープに昇格
    window.loadOCRHistory = async function loadOCRHistory(filters = {}) {
      const historyList = document.getElementById('ocr-history-list');
      currentHistoryFilter = { ...currentHistoryFilter, ...filters };
      
      // ページ変更時以外はページ1にリセット
      if (!filters.page) {
        currentPage = 1;
      }
      
      try {
        const params = new URLSearchParams({
          limit: String(itemsPerPage),
          offset: String((currentPage - 1) * itemsPerPage),
          search: currentHistoryFilter.search || '',
          minConfidence: String(currentHistoryFilter.minConfidence || 0),
          maxConfidence: String(currentHistoryFilter.maxConfidence || 1),
          sortBy: currentHistoryFilter.sortBy || 'date_desc',
          dateFrom: currentHistoryFilter.dateFrom || '',
          dateTo: currentHistoryFilter.dateTo || ''
        });
        
        const response = await axios.get('/api/ocr-history?' + params.toString(), {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const histories = response.data.histories || [];
        totalHistories = response.data.total || histories.length;
        
        if (histories.length === 0) {
          historyList.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="fas fa-inbox text-5xl mb-3"></i><p>履歴はまだありません</p></div>';
          return;
        }
        
        historyList.innerHTML = histories.map(item => {
          const data = item.extracted_data;
          const confidence = data.overall_confidence || data.confidence || 0.5;
          const propertyName = data.property_name?.value || data.property_name || '物件名未設定';
          const location = data.location?.value || data.location || '所在地未設定';
          const price = data.price?.value || data.price || '';
          
          let confidenceBadge = '';
          if (confidence >= 0.9) {
            confidenceBadge = '<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">信頼度: 高 (' + (confidence * 100).toFixed(0) + '%)</span>';
          } else if (confidence >= 0.7) {
            confidenceBadge = '<span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">信頼度: 中 (' + (confidence * 100).toFixed(0) + '%)</span>';
          } else {
            confidenceBadge = '<span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">信頼度: 低 (' + (confidence * 100).toFixed(0) + '%)</span>';
          }
          
          const date = new Date(item.created_at);
          const dateStr = date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const fileNames = Array.isArray(item.file_names) ? item.file_names.join(', ') : item.file_names;
          
          return '<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition" data-history-id="' + item.id + '"><div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2 flex-1 cursor-pointer" data-history-click="' + item.id + '"><i class="fas fa-file-alt text-gray-400"></i><span class="font-medium text-gray-900">' + propertyName + '</span></div><div class="flex items-center space-x-2">' + confidenceBadge + '<button class="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50" data-history-delete="' + item.id + '" title="削除"><i class="fas fa-trash-alt"></i></button></div></div><div class="text-sm text-gray-600 mb-2 cursor-pointer" data-history-click="' + item.id + '"><div class="flex items-center space-x-4"><span><i class="fas fa-map-marker-alt mr-1"></i>' + location + '</span>' + (price ? '<span><i class="fas fa-yen-sign mr-1"></i>' + price + '</span>' : '') + '</div></div><div class="flex items-center justify-between text-xs text-gray-500 cursor-pointer" data-history-click="' + item.id + '"><span><i class="fas fa-clock mr-1"></i>' + dateStr + '</span><span><i class="fas fa-images mr-1"></i>' + fileNames + '</span></div></div>';
        }).join('');
        
        // 履歴アイテムクリックイベント（詳細表示）
        document.querySelectorAll('[data-history-click]').forEach(item => {
          item.addEventListener('click', async () => {
            const historyId = item.getAttribute('data-history-click');
            await loadHistoryDetail(historyId);
          });
        });
        
        // 削除ボタンイベント
        document.querySelectorAll('[data-history-delete]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const historyId = btn.getAttribute('data-history-delete');
            if (confirm('この履歴を削除しますか？')) {
              await deleteHistory(historyId);
            }
          });
        });
        
        // ページネーション表示更新
        updatePagination();
        
      } catch (error) {
        console.error('Failed to load OCR history:', error);
        historyList.innerHTML = '<div class="text-center text-red-500 py-8"><i class="fas fa-exclamation-triangle text-5xl mb-3"></i><p>履歴の読み込みに失敗しました</p></div>';
      }
    }
    
    // ページネーション表示更新
    function updatePagination() {
      const pagination = document.getElementById('history-pagination');
      const countInfo = document.getElementById('history-count-info');
      const prevBtn = document.getElementById('history-page-prev');
      const nextBtn = document.getElementById('history-page-next');
      const pageNumbers = document.getElementById('history-page-numbers');
      
      const totalPages = Math.ceil(totalHistories / itemsPerPage);
      
      if (totalHistories === 0 || totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
      }
      
      pagination.classList.remove('hidden');
      
      // 表示件数情報
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage * itemsPerPage, totalHistories);
      countInfo.textContent = start + '-' + end + ' 件 / 全 ' + totalHistories + ' 件';
      
      // 前へボタン
      prevBtn.disabled = currentPage === 1;
      
      // 次へボタン
      nextBtn.disabled = currentPage === totalPages;
      
      // ページ番号ボタン
      pageNumbers.innerHTML = '';
      const maxPageButtons = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
      
      if (endPage - startPage < maxPageButtons - 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = String(i);
        pageBtn.className = i === currentPage ? 
          'px-3 py-1 text-sm bg-purple-600 text-white rounded-lg' : 
          'px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50';
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          loadOCRHistory({ page: i });
        });
        pageNumbers.appendChild(pageBtn);
      }
    }
    
    // 履歴削除関数
    async function deleteHistory(historyId) {
      try {
        await axios.delete('/api/ocr-history/' + historyId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        showMessage('履歴を削除しました', 'success');
        await loadOCRHistory();
        
      } catch (error) {
        console.error('Failed to delete history:', error);
        showMessage('履歴の削除に失敗しました: ' + (error.response?.data?.error || error.message), 'error');
      }
    }
    
    // 検索ボックスイベント
    document.getElementById('history-search').addEventListener('input', (e) => {
      loadOCRHistory({ search: e.target.value });
    });
    
    // ソートセレクトイベント
    document.getElementById('history-sort').addEventListener('change', (e) => {
      loadOCRHistory({ sortBy: e.target.value });
    });
    
    // 日付フィルターイベント
    document.getElementById('history-date-from').addEventListener('change', (e) => {
      loadOCRHistory({ dateFrom: e.target.value });
    });
    
    document.getElementById('history-date-to').addEventListener('change', (e) => {
      loadOCRHistory({ dateTo: e.target.value });
    });
    
    // ⚠️ イベント委譲パターン（deals-new-events.js）で処理するためコメントアウト
    /*
    document.getElementById('history-date-clear').addEventListener('click', () => {
      document.getElementById('history-date-from').value = '';
      document.getElementById('history-date-to').value = '';
      loadOCRHistory({ dateFrom: '', dateTo: '' });
    });
    */
    
    // ページネーションボタンイベント
    document.getElementById('history-page-prev').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadOCRHistory({ page: currentPage });
      }
    });
    
    document.getElementById('history-page-next').addEventListener('click', () => {
      const totalPages = Math.ceil(totalHistories / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        loadOCRHistory({ page: currentPage });
      }
    });
    
    // フィルターボタンイベント
    document.getElementById('history-filter-all').addEventListener('click', () => {
      loadOCRHistory({ minConfidence: 0, maxConfidence: 1 });
      updateFilterButtonStyles('all');
    });
    document.getElementById('history-filter-high').addEventListener('click', () => {
      loadOCRHistory({ minConfidence: 0.9, maxConfidence: 1 });
      updateFilterButtonStyles('high');
    });
    document.getElementById('history-filter-medium').addEventListener('click', () => {
      loadOCRHistory({ minConfidence: 0.7, maxConfidence: 0.9 });
      updateFilterButtonStyles('medium');
    });
    document.getElementById('history-filter-low').addEventListener('click', () => {
      loadOCRHistory({ minConfidence: 0, maxConfidence: 0.7 });
      updateFilterButtonStyles('low');
    });
    
    function updateFilterButtonStyles(active) {
      ['all', 'high', 'medium', 'low'].forEach(filter => {
        const btn = document.getElementById('history-filter-' + filter);
        if (filter === active) {
          btn.className = 'px-3 py-1 text-sm rounded-full bg-purple-600 text-white';
        } else {
          btn.className = 'px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
      });
    }

    // 履歴詳細読み込み
    async function loadHistoryDetail(historyId) {
      try {
        const response = await axios.get('/api/ocr-history/' + historyId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const historyData = response.data;
        const extractedData = JSON.parse(historyData.extracted_data);
        
        // OCR結果を復元
        currentOCRData = extractedData;
        displayOCRResultEditor(extractedData);
        
        // モーダルを閉じる
        historyModal.classList.add('hidden');
        
        // プレビューエリアを表示
        previewContainer.classList.remove('hidden');
        
      } catch (error) {
        console.error('Failed to load history detail:', error);
        alert('履歴の読み込みに失敗しました');
      }
    }

    async function processOCR(file) {
      // プレビュー表示
      previewContainer.classList.remove('hidden');
      
      if (file.type === 'application/pdf') {
        // PDFの場合はアイコン表示
        previewImage.src = '';
        previewImage.style.display = 'none';
        const pdfIcon = document.createElement('div');
        pdfIcon.id = 'pdf-icon-preview';
        pdfIcon.className = 'flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg';
        pdfIcon.innerHTML = '<i class="fas fa-file-pdf text-6xl text-red-500 mb-3"></i><p class="text-gray-700 font-medium">' + file.name + '</p><p class="text-sm text-gray-500">' + (file.size / 1024 / 1024).toFixed(2) + ' MB</p>';
        const existingIcon = document.getElementById('pdf-icon-preview');
        if (existingIcon) existingIcon.remove();
        previewImage.parentElement.insertBefore(pdfIcon, previewImage);
      } else {
        // 画像の場合は通常のプレビュー
        const existingIcon = document.getElementById('pdf-icon-preview');
        if (existingIcon) existingIcon.remove();
        previewImage.style.display = 'block';
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }

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
        const extracted = data.extracted || data;

        // フォームに自動入力
        if (extracted.property_name) document.getElementById('title').value = extracted.property_name;
        if (extracted.location) document.getElementById('location').value = extracted.location;
        if (extracted.land_area) document.getElementById('land_area').value = extracted.land_area;
        if (extracted.zoning) document.getElementById('zoning').value = extracted.zoning;
        if (extracted.building_coverage) document.getElementById('building_coverage').value = extracted.building_coverage;
        if (extracted.floor_area_ratio) document.getElementById('floor_area_ratio').value = extracted.floor_area_ratio;
        if (extracted.road_info) document.getElementById('road_info').value = extracted.road_info;
        if (extracted.price) document.getElementById('desired_price').value = extracted.price;

        // 成功表示
        ocrStatus.classList.add('hidden');
        ocrResult.classList.remove('hidden');
      } catch (error) {
        console.error('OCR error:', error);
        ocrStatus.innerHTML = '<div class="flex items-center text-red-600"><i class="fas fa-exclamation-circle mr-2"></i><span>OCR処理に失敗しました</span></div>';
      }
    }

    // フォーム送信
    const dealForm = document.getElementById('deal-form');
    if (dealForm && !dealForm.dataset.listenerAttached) {
      dealForm.dataset.listenerAttached = 'true';
      dealForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // seller_idのバリデーション
      const sellerIdInput = document.getElementById('seller_id');
      if (!sellerIdInput || !sellerIdInput.value) {
        const errorMsg = '売主を選択してください';
        if (typeof showMessage === 'function') {
          showMessage(errorMsg, 'error');
        } else if (typeof window.showMessage === 'function') {
          window.showMessage(errorMsg, 'error');
        } else {
          alert(errorMsg);
        }
        return;
      }

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
        frontage: document.getElementById('frontage')?.value || null,
        building_area: document.getElementById('building_area')?.value || null,
        structure: document.getElementById('structure')?.value || null,
        built_year: document.getElementById('built_year')?.value || null,
        yield_rate: document.getElementById('yield_rate')?.value || null,
        occupancy_status: document.getElementById('occupancy_status')?.value || null,
        current_status: document.getElementById('current_status').value || null,
        desired_price: document.getElementById('desired_price').value || null,
        seller_id: document.getElementById('seller_id').value,
        remarks: document.getElementById('remarks').value || null
      };

      // ボタン無効化とローディング表示
      const submitBtn = document.querySelector('#deal-form button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>作成中...';

      try {
        const response = await axios.post('/api/deals', dealData, {
          headers: { 'Authorization': 'Bearer ' + token },
          timeout: 15000  // 15秒タイムアウト
        });

        // 成功メッセージ表示
        showMessage('案件を作成しました', 'success');
        
        // 少し待ってからリダイレクト
        setTimeout(() => {
          window.location.href = '/deals/' + response.data.deal.id;
        }, 1000);
      } catch (error) {
        console.error('Create deal error:', error);
        console.error('Error details:', {
          message: error?.message,
          response: error?.response,
          responseData: error?.response?.data,
          responseStatus: error?.response?.status,
          stack: error?.stack
        });
        
        // エラーメッセージ表示
        let errorMsg = '案件作成に失敗しました';
        if (error?.response?.data?.error) {
          errorMsg += ': ' + error.response.data.error;
        } else if (error?.message) {
          errorMsg += ': ' + error.message;
        }
        
        // showMessage関数が存在するか確認
        if (typeof showMessage === 'function') {
          showMessage(errorMsg, 'error');
        } else if (typeof window.showMessage === 'function') {
          window.showMessage(errorMsg, 'error');
        } else {
          alert(errorMsg);
        }
        
        // ボタンを再有効化
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
    }

    // リアルタイム買取条件チェック
    let checkTimeout = null;
    
    // 買取条件チェック実行
    async function checkPurchaseCriteria() {
      const location = document.getElementById('location').value;
      const walkMinutes = document.getElementById('walk_minutes').value;
      const landArea = document.getElementById('land_area').value;
      const buildingCoverage = document.getElementById('building_coverage').value;
      const floorAreaRatio = document.getElementById('floor_area_ratio').value;

      // 最低限必要なデータが入力されているかチェック
      if (!location || !landArea) {
        document.getElementById('purchase-check-container').classList.add('hidden');
        return;
      }

      // APIリクエストデータ準備
      const checkData = {
        id: 'preview-deal-' + Date.now(),  // 一時的なプレビューID（DBには保存されない）
        location: location,
        walk_minutes: walkMinutes ? parseInt(walkMinutes) : undefined,
        land_area: landArea,
        building_coverage: buildingCoverage,
        floor_area_ratio: floorAreaRatio,
        station: document.getElementById('station').value || undefined,
        zoning: document.getElementById('zoning').value || undefined,
        road_info: document.getElementById('road_info').value || undefined
      };

      try {
        const response = await axios.post('/api/purchase-criteria/check', checkData, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        // APIレスポンス形式: {success: true, data: checkResult}
        const result = response.data.data;
        displayCheckResult(result);
        document.getElementById('purchase-check-container').classList.remove('hidden');
      } catch (error) {
        console.error('Purchase criteria check error:', error);
        document.getElementById('purchase-check-container').classList.add('hidden');
      }
    }

    // チェック結果表示
    function displayCheckResult(result) {
      const container = document.getElementById('purchase-check-result');
      
      // APIは overall_result と check_score を返す
      const status = result.overall_result || result.status;
      const score = result.check_score !== undefined ? result.check_score : result.score;
      
      // ステータスに応じた色とアイコン
      let statusColor, statusBg, statusIcon, statusText;
      if (status === 'PASS') {
        statusColor = 'text-green-700';
        statusBg = 'bg-green-50 border-green-200';
        statusIcon = 'fa-check-circle';
        statusText = '合格';
      } else if (status === 'SPECIAL_REVIEW') {
        statusColor = 'text-yellow-700';
        statusBg = 'bg-yellow-50 border-yellow-200';
        statusIcon = 'fa-exclamation-triangle';
        statusText = '要検討';
      } else {
        statusColor = 'text-red-700';
        statusBg = 'bg-red-50 border-red-200';
        statusIcon = 'fa-times-circle';
        statusText = '不合格';
      }

      // スコアバー
      const scorePercentage = score;
      let scoreBarColor;
      if (scorePercentage >= 80) {
        scoreBarColor = 'bg-green-500';
      } else if (scorePercentage >= 60) {
        scoreBarColor = 'bg-yellow-500';
      } else {
        scoreBarColor = 'bg-red-500';
      }

      // 理由リスト（recommendations配列を使用）
      const reasons = result.recommendations || [];
      const reasonsList = reasons.length > 0
        ? reasons.map(r => '<li class="flex items-start"><i class="fas fa-angle-right mt-1 mr-2 text-gray-400"></i><span>' + r + '</span></li>').join('')
        : '<li class="text-gray-500">理由情報なし</li>';

      container.innerHTML = '<div class="border ' + statusBg + ' rounded-lg p-4">' +
        '<!-- ステータスヘッダー -->' +
        '<div class="flex items-center justify-between mb-4">' +
          '<div class="flex items-center">' +
            '<i class="fas ' + statusIcon + ' ' + statusColor + ' text-2xl mr-3"></i>' +
            '<div>' +
              '<div class="text-lg font-bold ' + statusColor + '">' + statusText + '</div>' +
              '<div class="text-sm text-gray-600">買取条件チェック結果</div>' +
            '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="text-3xl font-bold ' + statusColor + '">' + score + '</div>' +
            '<div class="text-sm text-gray-600">点 / 100点</div>' +
          '</div>' +
        '</div>' +
        '<!-- スコアバー -->' +
        '<div class="mb-4">' +
          '<div class="w-full bg-gray-200 rounded-full h-3">' +
            '<div class="' + scoreBarColor + ' h-3 rounded-full transition-all duration-500" style="width: ' + scorePercentage + '%"></div>' +
          '</div>' +
        '</div>' +
        '<!-- 理由リスト -->' +
        '<div>' +
          '<div class="font-semibold text-gray-700 mb-2">評価理由:</div>' +
          '<ul class="space-y-1 text-sm text-gray-700">' +
            reasonsList +
          '</ul>' +
        '</div>' +
      '</div>';
    }

    // デバウンス付きイベントリスナー追加
    function addDebouncedListener(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener('input', () => {
          clearTimeout(checkTimeout);
          checkTimeout = setTimeout(checkPurchaseCriteria, 800);
        });
      }
    }

    // チェック対象フィールドにイベントリスナー追加
    addDebouncedListener('location');
    addDebouncedListener('station');
    addDebouncedListener('walk_minutes');
    addDebouncedListener('land_area');
    addDebouncedListener('zoning');
    addDebouncedListener('building_coverage');
    addDebouncedListener('floor_area_ratio');
    addDebouncedListener('road_info');

    // ========================================
    // 建築基準法・自治体条例チェック機能
    // ========================================
    let buildingCheckTimeout = null;

    // 建築基準法チェック実行
    async function checkBuildingRegulations() {
      const location = document.getElementById('location').value;
      const zoning = document.getElementById('zoning').value;
      const fireZone = document.getElementById('fire_zone').value;
      const heightDistrict = document.getElementById('height_district').value;
      const structure = document.getElementById('structure')?.value;
      const currentStatus = document.getElementById('current_status')?.value;

      // 最低限必要なデータが入力されているかチェック
      if (!location) {
        document.getElementById('building-regulations-container').classList.add('hidden');
        return;
      }

      // 階数を構造から抽出（例: "木造3階建" → 3）
      let floors = null;
      if (structure) {
        const floorMatch = structure.match(/(\d+)階/);
        if (floorMatch) {
          floors = parseInt(floorMatch[1]);
        }
      }

      // APIリクエストデータ準備
      const params = new URLSearchParams({
        location: location,
        ...(zoning && { zoning }),
        ...(fireZone && { fire_zone: fireZone }),
        ...(heightDistrict && { height_district: heightDistrict }),
        ...(structure && { structure }),
        ...(currentStatus && { current_status: currentStatus }),
        ...(floors && { floors: floors.toString() })
      });

      try {
        const response = await axios.get('/api/building-regulations/check?' + params.toString(), {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = response.data.data;
        
        if (data.applicable_regulations || data.municipal_regulations) {
          displayBuildingRegulations(data);
          document.getElementById('building-regulations-container').classList.remove('hidden');
        } else {
          document.getElementById('building-regulations-container').classList.add('hidden');
        }
      } catch (error) {
        console.error('Building regulations check error:', error);
        document.getElementById('building-regulations-container').classList.add('hidden');
      }
    }

    // 建築基準法チェック結果表示
    function displayBuildingRegulations(data) {
      const container = document.getElementById('building-regulations-result');
      const summary = document.getElementById('building-regulations-summary');
      
      const nationalRegs = data.applicable_regulations || [];
      const municipalRegs = data.municipal_regulations || [];
      
      // サマリー更新
      document.getElementById('national-reg-count').textContent = nationalRegs.length;
      document.getElementById('municipal-reg-count').textContent = municipalRegs.length;
      summary.classList.remove('hidden');

      let html = '';

      // 建築基準法
      if (nationalRegs.length > 0) {
        html += '<div class="mb-6">';
        html += '<h4 class="text-md font-bold text-gray-900 mb-3 flex items-center">';
        html += '<i class="fas fa-book-open text-orange-600 mr-2"></i>建築基準法';
        html += '</h4>';
        
        nationalRegs.forEach(reg => {
          html += '<div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition mb-3">';
          html += '<div class="flex items-start">';
          html += '<div class="flex-shrink-0"><i class="fas fa-gavel text-orange-600 mt-1"></i></div>';
          html += '<div class="ml-3 flex-1">';
          html += '<h5 class="font-semibold text-gray-900">' + (reg.title || '規定') + '</h5>';
          html += '<p class="text-sm text-gray-600 mt-1">' + (reg.description || '') + '</p>';
          html += '<div class="mt-2 text-xs text-gray-500">';
          html += '<i class="fas fa-book mr-1"></i>' + (reg.article || '');
          html += '</div></div></div></div>';
        });
        
        html += '</div>';
      }

      // 自治体条例
      if (municipalRegs.length > 0) {
        html += '<div class="mb-6">';
        html += '<h4 class="text-md font-bold text-gray-900 mb-3 flex items-center">';
        html += '<i class="fas fa-landmark text-green-600 mr-2"></i>自治体条例・規則';
        html += '</h4>';
        
        municipalRegs.forEach(reg => {
          const categoryIcons = {
            'PARKING': 'fa-parking',
            'THREE_STORY_WOODEN': 'fa-building',
            'DISPUTE_PREVENTION': 'fa-handshake',
            'LANDSCAPE': 'fa-tree',
            'FIRE_PREVENTION': 'fa-fire-extinguisher',
            'HEIGHT_DISTRICT': 'fa-ruler-vertical',
            'OTHER': 'fa-file-alt'
          };
          const icon = categoryIcons[reg.category] || 'fa-file-alt';
          
          html += '<div class="border border-green-200 rounded-lg p-4 hover:bg-green-50 transition mb-3">';
          html += '<div class="flex items-start">';
          html += '<div class="flex-shrink-0"><i class="fas ' + icon + ' text-green-600 mt-1"></i></div>';
          html += '<div class="ml-3 flex-1">';
          html += '<div class="flex items-center gap-2 mb-1">';
          html += '<h5 class="font-semibold text-gray-900">' + reg.title + '</h5>';
          html += '<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">' + reg.city + '</span>';
          html += '</div>';
          html += '<p class="text-sm text-gray-600 mt-1">' + reg.description + '</p>';
          html += '<div class="mt-2 text-xs text-gray-500 space-y-1">';
          html += '<div><i class="fas fa-check-circle mr-1"></i>適用条件: ' + reg.applicable_conditions + '</div>';
          html += '<div><i class="fas fa-clipboard-list mr-1"></i>要件: ' + reg.requirements + '</div>';
          html += '<div><i class="fas fa-book mr-1"></i>' + (reg.ordinance_name || '') + '</div>';
          if (reg.reference_url) {
            html += '<div><i class="fas fa-external-link-alt mr-1"></i><a href="' + reg.reference_url + '" target="_blank" class="text-blue-600 hover:underline">詳細情報</a></div>';
          }
          html += '</div></div></div></div>';
        });
        
        html += '</div>';
      }

      // 3階建て木造の警告
      if (data.is_three_story_wooden) {
        html += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">';
        html += '<div class="flex items-start">';
        html += '<i class="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-3"></i>';
        html += '<div class="flex-1">';
        html += '<p class="text-sm font-medium text-yellow-900">3階建て木造建築の特別規定が適用されます</p>';
        html += '<p class="text-xs text-yellow-700 mt-1">構造計算、防火対策、避難規定などの厳格な基準が適用されます。詳細は建築基準法第21条・第27条等を確認してください。</p>';
        html += '</div></div></div>';
      }

      container.innerHTML = html;
    }

    // 手動チェック関数（グローバルスコープ）
    window.manualBuildingCheck = function() {
      checkBuildingRegulations();
    };

    // 建築基準法チェック用デバウンス付きイベントリスナー追加
    function addBuildingCheckListener(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener('input', () => {
          clearTimeout(buildingCheckTimeout);
          buildingCheckTimeout = setTimeout(checkBuildingRegulations, 1000);
        });
      }
    }

    // 建築基準法チェック対象フィールドにイベントリスナー追加
    addBuildingCheckListener('location');
    addBuildingCheckListener('zoning');
    addBuildingCheckListener('fire_zone');
    addBuildingCheckListener('height_district');
    addBuildingCheckListener('structure');
    addBuildingCheckListener('current_status');

    // OCR抽出データの自動入力
    function loadOCRExtractedData() {
      const ocrData = localStorage.getItem('ocr_extracted_data');
      if (ocrData) {
        try {
          const data = JSON.parse(ocrData);
          
          // フォームに自動入力
          if (data.title) document.getElementById('title').value = data.title;
          if (data.location) document.getElementById('location').value = data.location;
          if (data.station) document.getElementById('station').value = data.station;
          if (data.walk_minutes) document.getElementById('walk_minutes').value = data.walk_minutes;
          if (data.land_area) document.getElementById('land_area').value = data.land_area;
          if (data.zoning) document.getElementById('zoning').value = data.zoning;
          if (data.building_coverage) document.getElementById('building_coverage').value = data.building_coverage;
          if (data.floor_area_ratio) document.getElementById('floor_area_ratio').value = data.floor_area_ratio;
          if (data.desired_price) document.getElementById('desired_price').value = data.desired_price;
          if (data.road_info) document.getElementById('road_info').value = data.road_info;
          if (data.current_status) document.getElementById('current_status').value = data.current_status;
          
          // localStorageからデータを削除（再利用を防ぐ）
          localStorage.removeItem('ocr_extracted_data');
          
          // 買取条件チェックと建築基準法チェックを実行
          setTimeout(() => {
            checkPurchaseCriteria();
            checkBuildingRegulations();
          }, 500);
          
          // 通知表示
          alert('OCRで抽出した物件情報を入力しました。内容を確認してください。');
        } catch (error) {
          console.error('Failed to load OCR data:', error);
        }
      }
    }

    // 初期化 - DOM要素が存在する場合のみ実行
    function initializePage() {
      console.log('[Init] initializePage called');
      loadSellers();
      loadOCRExtractedData();
      
      // ストレージ使用量表示の初期化
      const storageText = document.getElementById('storage-usage-text');
      console.log('[Init] storageText element:', storageText ? 'found' : 'NOT found');
      console.log('[Init] token:', token ? 'exists (' + token.substring(0, 20) + '...)' : 'NULL');
      
      if (storageText) {
        console.log('[Init] Calling loadStorageQuota() immediately');
        loadStorageQuota();
      } else {
        console.warn('[Init] storageText NOT found, will retry in 500ms');
        // DOM要素がまだ存在しない場合は再試行
        setTimeout(() => {
          const storageTextRetry = document.getElementById('storage-usage-text');
          console.log('[Init] Retry: storageText element:', storageTextRetry ? 'found' : 'STILL NOT found');
          if (storageTextRetry) {
            console.log('[Init] Calling loadStorageQuota() after retry');
            loadStorageQuota();
          } else {
            console.error('[Init] CRITICAL: storageText element never found!');
            // 強制的にエラー表示
            const storageDisplay = document.getElementById('storage-quota-display');
            if (storageDisplay) {
              storageDisplay.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i><span>要素エラー</span>';
              storageDisplay.className = 'text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium border border-red-200';
            }
          }
        }, 500);
      }
      
      // ページロード時にOCRジョブを復元（ブラウザリロード対応）
      restoreOCRJobIfExists();
      
      // 不足項目チェック（案件IDがある場合のみ）
      checkMissingItems();
    }
    
    /**
     * 不足項目チェック関数
     */
    async function checkMissingItems() {
      try {
        // URLから案件IDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const dealId = urlParams.get('deal_id');
        
        if (!dealId || !token) {
          return; // 新規作成の場合はチェック不要
        }
        
        console.log('[MissingItems] Checking for deal:', dealId);
        
        const response = await axios.get(\`/api/deals/\${dealId}/missing-items\`, {
          headers: { Authorization: \`Bearer \${token}\` }
        });
        
        if (response.data.success && response.data.total_missing > 0) {
          displayMissingItemsAlert(response.data);
        }
      } catch (error) {
        console.error('[MissingItems] Error:', error);
      }
    }
    
    /**
     * 不足項目アラート表示
     */
    function displayMissingItemsAlert(data) {
      const alertBox = document.getElementById('missing-items-alert');
      const fieldsList = document.getElementById('missing-fields-list');
      const filesList = document.getElementById('missing-files-list');
      
      if (!alertBox) return;
      
      // 不足フィールド表示
      if (data.missing_fields && data.missing_fields.length > 0) {
        const fieldsHTML = '<ul class="list-disc list-inside space-y-1">' +
          data.missing_fields.map(item => 
            \`<li><strong>\${item.label}</strong>の入力が必要です</li>\`
          ).join('') +
          '</ul>';
        fieldsList.innerHTML = fieldsHTML;
      }
      
      // 不足ファイル表示
      if (data.missing_files && data.missing_files.length > 0) {
        const filesHTML = '<ul class="list-disc list-inside space-y-1 mt-2">' +
          data.missing_files.map(item => 
            \`<li><strong>\${item.description}</strong>のアップロードが必要です（\${item.missing_count}件不足）</li>\`
          ).join('') +
          '</ul>';
        filesList.innerHTML = filesHTML;
      }
      
      // アラート表示
      alertBox.classList.remove('hidden');
      
      // 閉じるボタン
      document.getElementById('dismiss-missing-alert').addEventListener('click', () => {
        alertBox.classList.add('hidden');
      });
    }
    
    // DOMContentLoaded後に初期化を実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializePage);
    } else {
      initializePage();
    }

    // ============================================================
    // 不動産情報ライブラリAPI自動入力機能
    // ============================================================
    
    /**
     * 不動産情報ライブラリAPIから物件情報を取得して自動入力
     */
    async function autoFillFromReinfolib() {
      const locationInput = document.getElementById('location');
      const address = locationInput.value.trim();
      
      if (!address) {
        alert('住所を入力してください');
        return;
      }
      
      const btn = document.getElementById('auto-fill-btn');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 取得中...';
      
      try {
        const token = localStorage.getItem('token');
        const year = new Date().getFullYear();
        const quarter = Math.ceil((new Date().getMonth() + 1) / 3); // 現在の四半期
        
        const response = await axios.get(\`/api/reinfolib/property-info\`, {
          params: { address, year, quarter },
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.data.success) {
          alert('データの取得に失敗しました: ' + response.data.message);
          return;
        }
        
        const properties = response.data.data;
        const metadata = response.data.metadata;
        
        if (!properties || properties.length === 0) {
          alert(\`\${metadata.prefectureName}\${metadata.cityName}のデータが見つかりませんでした。\\n別の住所で試してください。\`);
          return;
        }
        
        // 最新のデータを取得（最初のデータを使用）
        const property = properties[0];
        
        // 各フィールドに自動入力
        const fields = [
          { id: 'land_area', value: property.land_area, label: '土地面積' },
          { id: 'zoning', value: property.use || property.city_planning, label: '用途地域' },
          { id: 'building_coverage', value: property.building_coverage_ratio, label: '建蔽率' },
          { id: 'floor_area_ratio', value: property.floor_area_ratio, label: '容積率' },
          { id: 'road_info', value: \`\${property.front_road_direction || ''} \${property.front_road_type || ''} 幅員\${property.front_road_width || ''}\`.trim(), label: '道路情報' },
          { id: 'frontage', value: property.frontage, label: '間口' },
          { id: 'building_area', value: property.building_area, label: '建物面積' },
          { id: 'structure', value: property.building_structure, label: '構造' },
          { id: 'built_year', value: property.building_year, label: '築年月' },
          { id: 'desired_price', value: property.trade_price, label: '希望価格' }
        ];
        
        let filledCount = 0;
        let filledFields = [];
        
        fields.forEach(field => {
          const input = document.getElementById(field.id);
          if (input && field.value) {
            const currentValue = input.value.trim();
            // 既に値が入っている場合は上書きしない
            if (!currentValue) {
              input.value = field.value;
              filledCount++;
              filledFields.push(field.label);
            }
          }
        });
        
        // ハザード情報も取得
        try {
          const hazardResponse = await axios.get(\`/api/reinfolib/hazard-info\`, {
            params: { address },
            headers: { 'Authorization': 'Bearer ' + token }
          });
          
          if (hazardResponse.data.success) {
            displayHazardInfo(hazardResponse.data.data);
          }
          
          // 融資制限条件もチェック
          try {
            const restrictionResponse = await axios.get(\`/api/reinfolib/check-financing-restrictions\`, {
              params: { address },
              headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (restrictionResponse.data.success && restrictionResponse.data.summary) {
              console.log('融資制限条件チェック結果:', restrictionResponse.data);
              // 融資制限警告はハザード情報表示内に含まれるため、ここでは追加処理なし
            }
          } catch (restrictionError) {
            console.error('Financing restriction check error:', restrictionError);
            // 融資制限チェック失敗は無視（メイン機能に影響しない）
          }
        } catch (hazardError) {
          console.error('Hazard info fetch error:', hazardError);
          // ハザード情報取得失敗は無視（メイン機能に影響しない）
        }
        
        if (filledCount > 0) {
          alert(\`✅ \${filledCount}項目を自動入力しました\\n\\n入力項目: \${filledFields.join(', ')}\\n\\nデータ元: 不動産情報ライブラリ（\${metadata.year}年第\${metadata.quarter}四半期）\\n\\n※ハザード情報も取得しました（下部に表示）\`);
        } else {
          alert('入力可能な項目が見つかりませんでした（既に入力済みの可能性があります）');
        }
        
      } catch (error) {
        console.error('Auto-fill error:', error);
        console.error('Error response:', error.response);
        
        if (error.response?.status === 401) {
          alert('❌ 認証エラー\\n\\nMLIT_API_KEYが設定されていません');
        } else if (error.response?.status === 400) {
          const message = error.response?.data?.message || '住所の解析に失敗しました';
          const details = error.response?.data?.details;
          let alertMessage = \`❌ エラー\\n\\n\${message}\\n\\n正しい形式で入力してください（例: 東京都板橋区蓮根三丁目17-7）\`;
          if (details) {
            alertMessage += \`\\n\\n入力された住所: \${details.address}\`;
          }
          alert(alertMessage);
        } else if (error.response?.status === 404) {
          alert('❌ エラー\\n\\n指定された住所のデータが見つかりませんでした。\\n\\n別の住所で試してください。');
        } else if (error.response?.data) {
          const errorData = error.response.data;
          const message = errorData.message || errorData.error || 'データ取得エラー';
          alert(\`❌ データの取得に失敗しました\\n\\n\${message}\`);
        } else {
          alert(\`❌ データの取得に失敗しました\\n\\nエラー: \${error.message}\\n\\nステータス: \${error.response?.status || '不明'}\`);
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    }
    
    /**
     * ハザード情報を表示
     */
    function displayHazardInfo(hazardData) {
      const container = document.getElementById('hazard-info-container');
      const resultDiv = document.getElementById('hazard-info-result');
      
      if (!hazardData || !hazardData.hazards) {
        container.classList.add('hidden');
        return;
      }
      
      // コンテナを表示
      container.classList.remove('hidden');
      
      // リスクレベルに応じた色クラス
      const getRiskClass = (level) => {
        if (level.includes('高')) return 'bg-red-100 text-red-800 border-red-200';
        if (level.includes('中')) return 'bg-orange-100 text-orange-800 border-orange-200';
        if (level.includes('低')) return 'bg-green-100 text-green-800 border-green-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
      };
      
      // ハザード情報カードを生成
      let html = '';
      
      // 融資制限警告バナーを追加
      html += \`
        <div class="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-4">
          <div class="flex items-start">
            <i class="fas fa-exclamation-triangle text-red-600 text-xl mr-3 mt-1"></i>
            <div class="flex-1">
              <h4 class="font-bold text-red-900 mb-2">⚠️ 融資制限条件の確認が必要です</h4>
              <p class="text-sm text-red-800 mb-3">
                以下に位置する物件は提携金融機関での融資が困難となります：
              </p>
              <ul class="text-sm text-red-800 space-y-1 mb-3 pl-4">
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span><strong>水害による想定浸水深度が10m以上</strong>の区域</span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span><strong>家屋倒壊等氾濫想定区域</strong>に該当</span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2">•</span>
                  <span><strong>土砂災害特別警戒区域（レッドゾーン）</strong>に該当</span>
                </li>
              </ul>
              <p class="text-sm text-red-800 font-semibold">
                📍 必ず市区町村作成のハザードマップで上記項目を確認してください
              </p>
            </div>
          </div>
        </div>
      \`;
      
      hazardData.hazards.forEach((hazard, index) => {
        html += \`
          <div class="border \${getRiskClass(hazard.risk_level)} rounded-lg p-4">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium mb-1">\${hazard.name}</h4>
                <p class="text-sm mb-2">\${hazard.description}</p>
                <p class="text-xs">リスクレベル: <span class="font-semibold">\${hazard.risk_level}</span></p>
              </div>
              <a href="\${hazard.url}" target="_blank" 
                class="ml-4 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition whitespace-nowrap">
                詳細確認 <i class="fas fa-external-link-alt ml-1"></i>
              </a>
            </div>
          </div>
        \`;
      });
      
      // 外部リンク
      if (hazardData.external_links && hazardData.external_links.length > 0) {
        html += \`
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 class="font-medium text-blue-900 mb-2 text-sm">
              <i class="fas fa-link mr-1"></i>詳細情報
            </h4>
            <div class="space-y-1">
        \`;
        
        hazardData.external_links.forEach(link => {
          html += \`
            <a href="\${link.url}" target="_blank" 
              class="text-sm text-blue-700 hover:text-blue-900 hover:underline block">
              <i class="fas fa-external-link-alt mr-1"></i>\${link.name}
            </a>
          \`;
        });
        
        html += \`
            </div>
            <p class="text-xs text-blue-600 mt-2">\${hazardData.note}</p>
          </div>
        \`;
      }
      
      resultDiv.innerHTML = html;
    }
    
    // ============================================================
    // ファイル管理機能
    // ============================================================
    
    /**
     * ファイルアップロード処理
     */
    async function uploadDealFiles(dealId) {
      const fileInput = document.getElementById('deal-file-input');
      const fileType = document.getElementById('deal-file-type').value;
      const files = fileInput.files;
      
      if (!files || files.length === 0) {
        alert('ファイルを選択してください');
        return;
      }
      
      // ファイルサイズチェック（10MB制限）
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSize) {
          alert(files[i].name + ' のサイズが大きすぎます（最大10MB）');
          return;
        }
      }
      
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('file_type', fileType);
      
      const uploadBtn = document.getElementById('deal-file-upload-btn');
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>アップロード中...';
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(\`/api/deals/\${dealId}/files\`, formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data.success) {
          alert(response.data.message);
          fileInput.value = '';
          await loadDealFiles(dealId);
          await loadStorageQuota(); // ストレージ使用量を更新
        }
      } catch (error) {
        console.error('File upload error:', error);
        if (error.response?.status === 413) {
          alert('ストレージ容量不足: ' + error.response.data.message);
        } else {
          alert('ファイルのアップロードに失敗しました: ' + (error.response?.data?.error || error.message));
        }
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload mr-1"></i>アップロード';
      }
    }
    
    /**
     * ファイル一覧読み込み
     */
    async function loadDealFiles(dealId) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(\`/api/deals/\${dealId}/files\`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const filesList = document.getElementById('deal-files-list');
        if (!filesList) return;
        
        if (response.data.files.length === 0) {
          filesList.innerHTML = '<p class="text-sm text-gray-500">まだファイルがアップロードされていません</p>';
          return;
        }
        
        filesList.innerHTML = response.data.files.map(file => {
          const iconClass = file.file_type === 'ocr' ? 'fa-file-pdf text-red-500' :
                           file.file_type === 'image' ? 'fa-image text-blue-500' :
                           'fa-file text-gray-500';
          const sizeKB = Math.round(file.file_size / 1024);
          
          return \`
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100">
              <div class="flex items-center space-x-3 flex-1">
                <input 
                  type="checkbox" 
                  class="file-checkbox w-4 h-4 text-blue-600 rounded" 
                  data-file-id="\${file.id}"
                  onchange="updateBulkDownloadButton()"
                />
                <i class="fas \${iconClass} text-lg"></i>
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-900">\${file.file_name}</div>
                  <div class="text-xs text-gray-500">\${sizeKB} KB · \${new Date(file.uploaded_at).toLocaleString('ja-JP')}</div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button 
                  onclick="previewFile('\${dealId}', '\${file.id}', '\${file.file_name}')"
                  class="text-green-600 hover:text-green-800 text-sm"
                  title="プレビュー"
                >
                  <i class="fas fa-eye"></i>
                </button>
                <button 
                  onclick="downloadDealFile('\${dealId}', '\${file.id}')"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                  title="ダウンロード"
                >
                  <i class="fas fa-download"></i>
                </button>
                <button 
                  onclick="deleteDealFile('\${dealId}', '\${file.id}')"
                  class="text-red-600 hover:text-red-800 text-sm"
                  title="削除"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          \`;
        }).join('');
      } catch (error) {
        console.error('Load files error:', error);
      }
    }
    
    /**
     * ファイルダウンロード
     */
    window.downloadDealFile = async function(dealId, fileId) {
      try {
        const token = localStorage.getItem('token');
        window.location.href = \`/api/deals/\${dealId}/files/\${fileId}/download?token=\${token}\`;
      } catch (error) {
        console.error('Download error:', error);
        alert('ダウンロードに失敗しました');
      }
    };
    
    /**
     * ファイル削除
     */
    window.deleteDealFile = async function(dealId, fileId) {
      if (!confirm('このファイルを削除しますか？')) return;
      
      try {
        const token = localStorage.getItem('token');
        await axios.delete(\`/api/deals/\${dealId}/files/\${fileId}\`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        alert('ファイルを削除しました');
        await loadDealFiles(dealId);
        await loadStorageQuota(); // ストレージ使用量を更新
      } catch (error) {
        console.error('Delete error:', error);
        alert('削除に失敗しました');
      }
    };
    
    /**
     * チェックボックスの状態に応じて一括ダウンロードボタンを有効/無効化
     */
    window.updateBulkDownloadButton = function() {
      const checkboxes = document.querySelectorAll('.file-checkbox:checked');
      const bulkDownloadBtn = document.getElementById('bulk-download-btn');
      if (bulkDownloadBtn) {
        bulkDownloadBtn.disabled = checkboxes.length === 0;
      }
    };
    
    /**
     * 全選択/全解除トグル
     */
    window.toggleSelectAllFiles = function() {
      const checkboxes = document.querySelectorAll('.file-checkbox');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
      });
      
      updateBulkDownloadButton();
    };
    
    /**
     * 選択ファイルを一括ダウンロード（JSZipを使用してクライアント側でZIP作成）
     */
    window.bulkDownloadFiles = async function() {
      const checkboxes = document.querySelectorAll('.file-checkbox:checked');
      const fileIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-file-id'));
      
      if (fileIds.length === 0) {
        alert('ダウンロードするファイルを選択してください');
        return;
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const dealId = urlParams.get('deal_id') || window.location.pathname.split('/').pop();
      
      const btn = document.getElementById('bulk-download-btn');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>ダウンロード準備中...';
      
      try {
        const token = localStorage.getItem('token');
        
        // JSZipライブラリを動的ロード
        if (!window.JSZip) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
          document.head.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }
        
        // 一括ダウンロードAPIを呼び出し
        const response = await axios.post(
          \`/api/deals/\${dealId}/files/bulk-download\`,
          { file_ids: fileIds },
          { headers: { 'Authorization': 'Bearer ' + token } }
        );
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'ダウンロード準備に失敗しました');
        }
        
        // ZIP作成
        const zip = new JSZip();
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>ZIPファイル作成中...';
        
        // 各ファイルをダウンロードしてZIPに追加
        for (let i = 0; i < response.data.files.length; i++) {
          const file = response.data.files[i];
          btn.innerHTML = \`<i class="fas fa-spinner fa-spin mr-1"></i>(\${i + 1}/\${response.data.files.length}) \${file.file_name}\`;
          
          try {
            const fileResponse = await axios.get(file.download_url, {
              headers: { 'Authorization': 'Bearer ' + token },
              responseType: 'blob'
            });
            
            zip.file(file.file_name, fileResponse.data);
          } catch (error) {
            console.error(\`Failed to download \${file.file_name}:\`, error);
          }
        }
        
        // ZIP生成とダウンロード
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>ZIPファイル生成中...';
        const content = await zip.generateAsync({ type: 'blob' });
        
        // ダウンロード実行
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`deal_\${dealId}_files_\${new Date().toISOString().split('T')[0]}.zip\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(\`✅ \${response.data.files.length}件のファイルをダウンロードしました\`);
        
        // チェックボックスをリセット
        checkboxes.forEach(cb => cb.checked = false);
        updateBulkDownloadButton();
        
      } catch (error) {
        console.error('Bulk download error:', error);
        alert('一括ダウンロードに失敗しました: ' + (error.response?.data?.error || error.message));
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    };
    
    /**
     * ファイルプレビュー機能
     */
    let currentPreviewFile = null;
    
    window.previewFile = async function(dealId, fileId, fileName) {
      try {
        currentPreviewFile = { dealId, fileId, fileName };
        
        // モーダル表示
        const modal = document.getElementById('file-preview-modal');
        modal.style.display = 'flex';
        
        // ファイル名を設定
        document.getElementById('preview-file-name').textContent = fileName;
        
        // プレビューエリア
        const previewArea = document.getElementById('preview-content-area');
        previewArea.innerHTML = \`
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
              <p class="text-gray-600">読み込み中...</p>
            </div>
          </div>
        \`;
        
        // ファイル拡張子から種類を判定
        const ext = fileName.toLowerCase().split('.').pop();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const pdfExtensions = ['pdf'];
        
        const token = localStorage.getItem('token');
        const fileUrl = \`/api/deals/\${dealId}/files/\${fileId}/download\`;
        
        if (imageExtensions.includes(ext)) {
          // 画像プレビュー
          previewArea.innerHTML = \`
            <div class="flex items-center justify-center h-full bg-gray-900 rounded-lg">
              <img 
                src="\${fileUrl}?token=\${token}" 
                alt="\${fileName}" 
                class="max-w-full max-h-full object-contain"
                onerror="this.parentElement.innerHTML='<div class=\\"text-white\\"><i class=\\"fas fa-exclamation-triangle text-3xl mb-2\\"></i><p>画像の読み込みに失敗しました</p></div>'"
              />
            </div>
          \`;
        } else if (pdfExtensions.includes(ext)) {
          // PDFプレビュー（PDF.jsを使用）
          await loadPDFPreview(fileUrl, token, previewArea);
        } else {
          // その他のファイル（プレビュー不可）
          previewArea.innerHTML = \`
            <div class="flex items-center justify-center h-full">
              <div class="text-center">
                <i class="fas fa-file-alt text-6xl text-gray-400 mb-4"></i>
                <p class="text-gray-600 text-lg font-medium mb-2">このファイル形式はプレビューできません</p>
                <p class="text-gray-500 text-sm mb-4">ダウンロードしてご確認ください</p>
                <button 
                  onclick="downloadPreviewFile()" 
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <i class="fas fa-download mr-2"></i>ダウンロード
                </button>
              </div>
            </div>
          \`;
        }
        
      } catch (error) {
        console.error('Preview error:', error);
        alert('プレビューの表示に失敗しました: ' + error.message);
      }
    };
    
    /**
     * PDFプレビュー読み込み（PDF.js使用）
     */
    async function loadPDFPreview(fileUrl, token, previewArea) {
      try {
        // PDF.jsライブラリを動的ロード
        if (!window.pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
          document.head.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
          
          // Worker設定
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }
        
        // PDFファイルをBlobとして取得
        const response = await axios.get(fileUrl, {
          headers: { 'Authorization': 'Bearer ' + token },
          responseType: 'blob'
        });
        
        const blob = response.data;
        const arrayBuffer = await blob.arrayBuffer();
        
        // PDFを読み込み
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        // プレビューエリアを初期化
        previewArea.innerHTML = \`
          <div class="bg-white rounded-lg p-4 w-full">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm text-gray-600">ページ <span id="current-page">1</span> / \${totalPages}</span>
              <div class="flex gap-2">
                <button id="prev-page" onclick="changePDFPage(-1)" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50" disabled>
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button id="next-page" onclick="changePDFPage(1)" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <div id="pdf-canvas-container" class="flex justify-center bg-gray-100 rounded overflow-auto" style="max-height: 70vh;">
              <canvas id="pdf-canvas"></canvas>
            </div>
          </div>
        \`;
        
        // ページレンダリング変数を保存
        window.currentPDF = {
          pdf: pdf,
          currentPage: 1,
          totalPages: totalPages
        };
        
        // 最初のページをレンダリング
        await renderPDFPage(1);
        
      } catch (error) {
        console.error('PDF preview error:', error);
        previewArea.innerHTML = \`
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
              <p class="text-gray-600">PDFの読み込みに失敗しました</p>
              <p class="text-sm text-gray-500 mt-2">\${error.message}</p>
            </div>
          </div>
        \`;
      }
    }
    
    /**
     * PDFページをレンダリング
     */
    async function renderPDFPage(pageNum) {
      if (!window.currentPDF) return;
      
      const pdf = window.currentPDF.pdf;
      const page = await pdf.getPage(pageNum);
      
      const canvas = document.getElementById('pdf-canvas');
      const context = canvas.getContext('2d');
      
      // スケール設定（高DPI対応）
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // ページ番号とボタンの状態を更新
      document.getElementById('current-page').textContent = pageNum;
      document.getElementById('prev-page').disabled = pageNum === 1;
      document.getElementById('next-page').disabled = pageNum === window.currentPDF.totalPages;
    }
    
    /**
     * PDFページ変更
     */
    window.changePDFPage = function(delta) {
      if (!window.currentPDF) return;
      
      const newPage = window.currentPDF.currentPage + delta;
      if (newPage < 1 || newPage > window.currentPDF.totalPages) return;
      
      window.currentPDF.currentPage = newPage;
      renderPDFPage(newPage);
    };
    
    /**
     * プレビューモーダルを閉じる
     */
    window.closeFilePreview = function() {
      const modal = document.getElementById('file-preview-modal');
      modal.style.display = 'none';
      currentPreviewFile = null;
      window.currentPDF = null;
    };
    
    /**
     * プレビュー中のファイルをダウンロード
     */
    window.downloadPreviewFile = function() {
      if (!currentPreviewFile) return;
      
      const { dealId, fileId } = currentPreviewFile;
      downloadDealFile(dealId, fileId);
    };
    
    // ファイルアップロードボタンのイベントリスナー
    document.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const dealId = urlParams.get('deal_id');
      
      if (dealId) {
        // 既存案件の編集モードの場合、ファイルセクションを表示
        const filesSection = document.getElementById('deal-files-section');
        if (filesSection) {
          filesSection.style.display = 'block';
          loadDealFiles(dealId);
        }
        
        // アップロードボタンのイベントリスナー
        const uploadBtn = document.getElementById('deal-file-upload-btn');
        if (uploadBtn) {
          uploadBtn.addEventListener('click', () => uploadDealFiles(dealId));
        }
      }
    });

    // ============================================================
    // テンプレート機能
    // ============================================================
    
    let currentTemplates = [];
    // ⚠️ イベント委譲パターンから参照できるようにwindowスコープに昇格
    window.selectedTemplate = null;

    // テンプレート選択ボタン - イベント委譲パターンで安全に初期化
    function initTemplateButtons() {
      console.log('[Template] initTemplateButtons called');
      const templateSelectBtn = document.getElementById('template-select-btn');
      const clearTemplateBtn = document.getElementById('clear-template-btn');
      
      console.log('[Template] templateSelectBtn:', templateSelectBtn);
      console.log('[Template] clearTemplateBtn:', clearTemplateBtn);
      
      // ⚠️ イベント委譲パターン（deals-new-events.js）で処理するためコメントアウト
      /*
      if (templateSelectBtn) {
        // 既存のリスナーを削除してから追加
        const newBtn = templateSelectBtn.cloneNode(true);
        templateSelectBtn.parentNode.replaceChild(newBtn, templateSelectBtn);
        
        newBtn.addEventListener('click', (e) => {
          console.log('[Template] Template select button clicked');
          e.preventDefault();
          e.stopPropagation();
          openTemplateModal();
        });
        console.log('[Template] Event listener attached to template-select-btn');
      } else {
        console.error('[Template] template-select-btn not found');
      }
      
      if (clearTemplateBtn) {
        // 既存のリスナーを削除してから追加
        const newBtn = clearTemplateBtn.cloneNode(true);
        clearTemplateBtn.parentNode.replaceChild(newBtn, clearTemplateBtn);
        
        newBtn.addEventListener('click', (e) => {
          console.log('[Template] Clear template button clicked');
          e.preventDefault();
          e.stopPropagation();
          selectedTemplate = null;
          document.getElementById('selected-template-info').classList.add('hidden');
          showToast('テンプレート選択を解除しました', 'info');
        });
        console.log('[Template] Event listener attached to clear-template-btn');
      }
      */
      console.log('[Template] Template buttons event delegation enabled');
      console.log('[Template] templateSelectBtn:', templateSelectBtn);
      console.log('[Template] clearTemplateBtn:', clearTemplateBtn);
    }
    
    // ページ読み込み後に初期化（複数のタイミングで試行）
    function ensureTemplateButtonsInitialized() {
      console.log('[Template] ensureTemplateButtonsInitialized called, readyState:', document.readyState);
      if (document.readyState === 'loading') {
        console.log('[Template] Still loading, skipping');
        return; // まだ早すぎる
      }
      initTemplateButtons();
    }
    
    // 複数のタイミングで初期化を試行
    console.log('[Template] Initial readyState:', document.readyState);
    if (document.readyState === 'loading') {
      console.log('[Template] Adding DOMContentLoaded listener');
      document.addEventListener('DOMContentLoaded', ensureTemplateButtonsInitialized);
    } else {
      // すでにDOMContentLoaded後なら即座に実行
      console.log('[Template] DOM already loaded, initializing immediately');
      ensureTemplateButtonsInitialized();
    }
    window.addEventListener('load', ensureTemplateButtonsInitialized);
    console.log('[Template] Initialization setup complete');

    // テンプレートモーダルを開く
    // ⚠️ イベント委譲パターンから呼び出せるようにwindowスコープに昇格
    window.openTemplateModal = async function openTemplateModal() {
      const modal = document.getElementById('template-modal');
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      
      // テンプレート一覧を読み込み
      await loadTemplates();
    }

    // テンプレートモーダルを閉じる
    // ⚠️ インラインonclick属性から呼び出せるようにwindowスコープに昇格
    window.closeTemplateModal = function closeTemplateModal() {
      const modal = document.getElementById('template-modal');
      modal.style.display = 'none';
      modal.classList.add('hidden');
    }

    // テンプレート一覧を読み込み
    async function loadTemplates() {
      const loading = document.getElementById('template-loading');
      const error = document.getElementById('template-error');
      const presetSection = document.getElementById('preset-templates-section');
      const customSection = document.getElementById('custom-templates-section');

      loading.style.display = 'block';
      error.classList.add('hidden');
      presetSection.classList.add('hidden');
      customSection.classList.add('hidden');

      try {
        const response = await axios.get('/api/property-templates', {
          headers: { Authorization: 'Bearer ' + token }
        });

        if (response.data.success) {
          currentTemplates = response.data.templates;
          
          // プリセットとカスタムを分離
          const presets = currentTemplates.filter(t => t.is_preset);
          const customs = currentTemplates.filter(t => !t.is_preset);

          // プリセットテンプレート表示
          if (presets.length > 0) {
            renderPresetTemplates(presets);
            presetSection.classList.remove('hidden');
          }

          // カスタムテンプレート表示
          if (customs.length > 0) {
            renderCustomTemplates(customs);
            customSection.classList.remove('hidden');
            document.getElementById('no-custom-templates').classList.add('hidden');
          } else {
            customSection.classList.remove('hidden');
            document.getElementById('no-custom-templates').classList.remove('hidden');
          }
        }
      } catch (err) {
        console.error('テンプレート読み込みエラー:', err);
        error.classList.remove('hidden');
        document.getElementById('template-error-message').textContent = 
          err.response?.data?.error || 'テンプレートの読み込みに失敗しました';
      } finally {
        loading.style.display = 'none';
      }
    }

    // プリセットテンプレート表示
    function renderPresetTemplates(presets) {
      const container = document.getElementById('preset-templates-list');
      container.innerHTML = presets.map(template => {
        const data = typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data;
        
        return '<div class="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer relative" onclick="event.stopPropagation(); openPreviewModal(&quot;' + template.id + '&quot;)">' +
          '<div class="flex items-start justify-between mb-2">' +
            '<div class="flex items-center">' +
              '<i class="fas fa-star text-yellow-600 mr-2"></i>' +
              '<h5 class="font-semibold text-gray-900">' + template.template_name + '</h5>' +
            '</div>' +
            '<span class="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">プリセット</span>' +
          '</div>' +
          '<p class="text-sm text-gray-600 mb-3">' + (template.description || '') + '</p>' +
          '<div class="text-xs text-gray-500 space-y-1">' +
            '<div><i class="fas fa-map-marker-alt mr-1"></i>用途: ' + (data.zoning || '-') + '</div>' +
            '<div><i class="fas fa-percentage mr-1"></i>建ぺい率: ' + (data.building_coverage_ratio || '-') + '% / 容積率: ' + (data.floor_area_ratio || '-') + '%</div>' +
          '</div>' +
          '<!-- プレビューバッジ -->' +
          '<div class="absolute bottom-2 right-2">' +
            '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center">' +
              '<i class="fas fa-eye mr-1"></i>クリックでプレビュー' +
            '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // カスタムテンプレート表示
    function renderCustomTemplates(customs) {
      const container = document.getElementById('custom-templates-list');
      container.innerHTML = customs.map(template => {
        const data = typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data;
        
        return '<div class="bg-white border-2 border-blue-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer relative" onclick="event.stopPropagation(); openPreviewModal(&quot;' + template.id + '&quot;)">' +
          '<!-- アクションボタン -->' +
          '<div class="absolute top-2 right-2 flex items-center space-x-1">' +
            '<button onclick="event.stopPropagation(); exportTemplate(&quot;' + template.id + '&quot;)" class="p-2 md:p-1.5 bg-purple-100 hover:bg-purple-200 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center" title="エクスポート">' +
              '<i class="fas fa-download text-purple-600 text-sm"></i>' +
            '</button>' +
            '<button onclick="event.stopPropagation(); openEditTemplateModal(&quot;' + template.id + '&quot;)" class="p-2 md:p-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center" title="編集">' +
              '<i class="fas fa-edit text-blue-600 text-sm"></i>' +
            '</button>' +
            '<button onclick="event.stopPropagation(); confirmDeleteTemplate(&quot;' + template.id + '&quot;)" class="p-2 md:p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center" title="削除">' +
              '<i class="fas fa-trash text-red-600 text-sm"></i>' +
            '</button>' +
          '</div>' +
          '<!-- プレビューバッジ -->' +
          '<div class="absolute bottom-2 right-2">' +
            '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center">' +
              '<i class="fas fa-eye mr-1"></i>クリックでプレビュー' +
            '</span>' +
          '</div>' +
          '<div class="flex items-start justify-between mb-2 pr-[140px] md:pr-24">' +
            '<div class="flex items-center">' +
              '<i class="fas fa-user-edit text-blue-600 mr-2"></i>' +
              '<h5 class="font-semibold text-gray-900">' + template.template_name + '</h5>' +
            '</div>' +
            '<div class="flex items-center space-x-2">' +
              (template.is_shared ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">共有</span>' : '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">個人</span>') +
            '</div>' +
          '</div>' +
          '<p class="text-sm text-gray-600 mb-3">' + (template.description || 'カスタムテンプレート') + '</p>' +
          '<div class="text-xs text-gray-500 space-y-1">' +
            '<div><i class="fas fa-chart-line mr-1"></i>使用回数: ' + (template.use_count || 0) + '回</div>' +
            '<div><i class="fas fa-calendar mr-1"></i>作成日: ' + new Date(template.created_at).toLocaleDateString('ja-JP') + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // テンプレート選択
    async function selectTemplate(templateId) {
      try {
        const template = currentTemplates.find(t => t.id === templateId);
        if (!template) {
          showToast('テンプレートが見つかりません', 'error');
          return;
        }

        // テンプレートデータを取得
        const data = typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data;

        // フォームに値を設定
        applyTemplateToForm(data);

        // 選択状態を保存
        selectedTemplate = template;
        document.getElementById('selected-template-name').textContent = template.template_name;
        document.getElementById('selected-template-info').classList.remove('hidden');

        // 使用回数を増やす（プリセット以外）
        if (!template.is_preset) {
          try {
            await axios.post('/api/property-templates/' + templateId + '/use', {}, {
              headers: { Authorization: 'Bearer ' + token }
            });
          } catch (err) {
            console.error('使用回数更新エラー:', err);
          }
        }

        // モーダルを閉じる
        closeTemplateModal();
        showToast('テンプレート「' + template.template_name + '」を適用しました', 'success');
      } catch (err) {
        console.error('テンプレート適用エラー:', err);
        showToast('テンプレートの適用に失敗しました', 'error');
      }
    }

    // テンプレートデータをフォームに適用
    function applyTemplateToForm(data) {
      // 用途地域
      if (data.zoning && document.getElementById('zoning')) {
        document.getElementById('zoning').value = data.zoning;
      }
      // 建ぺい率
      if (data.building_coverage_ratio && document.getElementById('building_coverage_ratio')) {
        document.getElementById('building_coverage_ratio').value = data.building_coverage_ratio;
      }
      // 容積率
      if (data.floor_area_ratio && document.getElementById('floor_area_ratio')) {
        document.getElementById('floor_area_ratio').value = data.floor_area_ratio;
      }
      // 前面道路幅員
      if (data.front_road_width && document.getElementById('front_road_width')) {
        document.getElementById('front_road_width').value = data.front_road_width;
      }
      // 想定戸数
      if (data.estimated_units && document.getElementById('estimated_units')) {
        document.getElementById('estimated_units').value = data.estimated_units;
      }
      // 土地形状
      if (data.land_shape && document.getElementById('land_shape')) {
        document.getElementById('land_shape').value = data.land_shape;
      }
      // 地勢
      if (data.topography && document.getElementById('topography')) {
        document.getElementById('topography').value = data.topography;
      }
      // ライフライン状況
      if (data.utility_status && document.getElementById('utility_status')) {
        document.getElementById('utility_status').value = data.utility_status;
      }
    }

    // ============================================================
    // カスタムテンプレート作成・編集機能
    // ============================================================

    let editingTemplateId = null;

    // 新規作成ボタン
    document.getElementById('create-template-btn').addEventListener('click', () => {
      openCreateTemplateModal();
    });

    // テンプレート作成モーダルを開く（新規作成）
    function openCreateTemplateModal() {
      const modal = document.getElementById('create-template-modal');
      const title = document.getElementById('create-template-title');
      const form = document.getElementById('create-template-form');
      const editIdField = document.getElementById('edit-template-id');
      const saveBtn = document.getElementById('save-template-btn-text');

      // モードを新規作成に設定
      editingTemplateId = null;
      editIdField.value = '';
      title.textContent = 'カスタムテンプレート作成';
      saveBtn.textContent = '保存';
      form.reset();

      // フォーム値からプレビューを更新
      updateTemplatePreview();

      // モーダルを表示
      modal.style.display = 'flex';
      modal.classList.remove('hidden');

      // エラー・成功メッセージをクリア
      document.getElementById('create-template-error').classList.add('hidden');
      document.getElementById('create-template-success').classList.add('hidden');
    }

    // テンプレート編集モーダルを開く
    function openEditTemplateModal(templateId) {
      const modal = document.getElementById('create-template-modal');
      const title = document.getElementById('create-template-title');
      const form = document.getElementById('create-template-form');
      const editIdField = document.getElementById('edit-template-id');
      const saveBtn = document.getElementById('save-template-btn-text');

      // 編集対象のテンプレートを取得
      const template = currentTemplates.find(t => t.id === templateId);
      if (!template) {
        showToast('テンプレートが見つかりません', 'error');
        return;
      }

      // モードを編集に設定
      editingTemplateId = templateId;
      editIdField.value = templateId;
      title.textContent = 'カスタムテンプレート編集';
      saveBtn.textContent = '更新';

      // フォームに既存データを設定
      document.getElementById('template-name-input').value = template.template_name;
      document.getElementById('template-type-input').value = template.template_type || 'custom';
      document.getElementById('template-share-input').checked = template.is_shared == 1;

      // プレビューを更新
      const data = typeof template.template_data === 'string' 
        ? JSON.parse(template.template_data) 
        : template.template_data;
      updateTemplatePreview(data);

      // モーダルを表示
      modal.style.display = 'flex';
      modal.classList.remove('hidden');

      // エラー・成功メッセージをクリア
      document.getElementById('create-template-error').classList.add('hidden');
      document.getElementById('create-template-success').classList.add('hidden');
    }

    // テンプレート作成モーダルを閉じる
    function closeCreateTemplateModal() {
      const modal = document.getElementById('create-template-modal');
      modal.style.display = 'none';
      modal.classList.add('hidden');
      editingTemplateId = null;
    }

    // テンプレートデータプレビューを更新
    function updateTemplatePreview(data) {
      const container = document.getElementById('template-data-preview');
      
      // データが指定されていない場合、現在のフォーム値から取得
      if (!data) {
        data = getCurrentFormData();
      }

      const fields = [
        { key: 'zoning', label: '用途地域' },
        { key: 'building_coverage_ratio', label: '建ぺい率' },
        { key: 'floor_area_ratio', label: '容積率' },
        { key: 'front_road_width', label: '前面道路幅員' },
        { key: 'estimated_units', label: '想定戸数' },
        { key: 'land_shape', label: '土地形状' },
        { key: 'topography', label: '地勢' },
        { key: 'utility_status', label: 'ライフライン状況' }
      ];

      const html = fields.map(field => {
        const value = data[field.key] || '-';
        return '<div><span class="font-medium">' + field.label + ':</span> ' + value + '</div>';
      }).join('');

      container.innerHTML = html || '<div class="text-gray-500">フォームに値を入力してください</div>';
    }

    // 現在のフォーム値を取得
    function getCurrentFormData() {
      return {
        zoning: document.getElementById('zoning')?.value || '',
        building_coverage_ratio: document.getElementById('building_coverage_ratio')?.value || '',
        floor_area_ratio: document.getElementById('floor_area_ratio')?.value || '',
        front_road_width: document.getElementById('front_road_width')?.value || '',
        estimated_units: document.getElementById('estimated_units')?.value || '',
        land_shape: document.getElementById('land_shape')?.value || '',
        topography: document.getElementById('topography')?.value || '',
        utility_status: document.getElementById('utility_status')?.value || ''
      };
    }

    // テンプレート保存フォーム送信
    document.getElementById('create-template-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const errorDiv = document.getElementById('create-template-error');
      const successDiv = document.getElementById('create-template-success');
      const saveBtn = document.getElementById('save-template-btn');
      
      errorDiv.classList.add('hidden');
      successDiv.classList.add('hidden');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...';

      try {
        const templateName = document.getElementById('template-name-input').value;
        const templateType = document.getElementById('template-type-input').value;
        const isShared = document.getElementById('template-share-input').checked;
        const templateData = getCurrentFormData();

        // バリデーション
        if (!templateName.trim()) {
          throw new Error('テンプレート名を入力してください');
        }

        const requestData = {
          template_name: templateName,
          template_type: templateType,
          template_data: templateData,
          is_shared: isShared
        };

        let response;
        if (editingTemplateId) {
          // 更新
          response = await axios.put('/api/property-templates/' + editingTemplateId, requestData, {
            headers: { Authorization: 'Bearer ' + token }
          });
        } else {
          // 新規作成
          response = await axios.post('/api/property-templates', requestData, {
            headers: { Authorization: 'Bearer ' + token }
          });
        }

        // 成功メッセージ
        const successMsg = editingTemplateId ? 'テンプレートを更新しました' : 'テンプレートを作成しました';
        document.getElementById('create-template-success-message').textContent = successMsg;
        successDiv.classList.remove('hidden');

        // テンプレート一覧を再読み込み
        await loadTemplates();

        // 2秒後にモーダルを閉じる
        setTimeout(() => {
          closeCreateTemplateModal();
          showToast(successMsg, 'success');
        }, 2000);

      } catch (err) {
        console.error('テンプレート保存エラー:', err);
        const errorMsg = err.response?.data?.error || err.message || 'テンプレートの保存に失敗しました';
        document.getElementById('create-template-error-message').textContent = errorMsg;
        errorDiv.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i><span id="save-template-btn-text">' + 
          (editingTemplateId ? '更新' : '保存') + '</span>';
      }
    });

    // テンプレート削除確認
    async function confirmDeleteTemplate(templateId) {
      if (!confirm('このテンプレートを削除してもよろしいですか？')) {
        return;
      }

      try {
        await axios.delete('/api/property-templates/' + templateId, {
          headers: { Authorization: 'Bearer ' + token }
        });

        showToast('テンプレートを削除しました', 'success');
        
        // テンプレート一覧を再読み込み
        await loadTemplates();
      } catch (err) {
        console.error('テンプレート削除エラー:', err);
        const errorMsg = err.response?.data?.error || 'テンプレートの削除に失敗しました';
        showToast(errorMsg, 'error');
      }
    }

    // ============================================================
    // テンプレートプレビュー機能
    // ============================================================

    let previewingTemplate = null;

    // プレビューモーダルを開く
    function openPreviewModal(templateId) {
      const template = currentTemplates.find(t => t.id === templateId);
      if (!template) {
        showToast('テンプレートが見つかりません', 'error');
        return;
      }

      previewingTemplate = template;
      
      // テンプレート名を表示
      document.getElementById('preview-template-name').textContent = template.template_name;

      // 現在のフォーム値を取得
      const currentData = getCurrentFormData();
      
      // テンプレートデータを取得
      const templateData = typeof template.template_data === 'string' 
        ? JSON.parse(template.template_data) 
        : template.template_data;

      // 比較表示を生成
      renderComparisonTable(currentData, templateData);

      // モーダルを表示
      const modal = document.getElementById('preview-template-modal');
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
    }

    // プレビューモーダルを閉じる
    function closePreviewModal() {
      const modal = document.getElementById('preview-template-modal');
      modal.style.display = 'none';
      modal.classList.add('hidden');
      previewingTemplate = null;
    }

    // 比較テーブルを生成
    function renderComparisonTable(currentData, templateData) {
      const container = document.getElementById('preview-comparison-table');
      
      const fields = [
        { key: 'zoning', label: '用途地域', icon: 'map-marker-alt' },
        { key: 'building_coverage_ratio', label: '建ぺい率', icon: 'percentage', suffix: '%' },
        { key: 'floor_area_ratio', label: '容積率', icon: 'percentage', suffix: '%' },
        { key: 'front_road_width', label: '前面道路幅員', icon: 'road', suffix: 'm' },
        { key: 'estimated_units', label: '想定戸数', icon: 'home', suffix: '戸' },
        { key: 'land_shape', label: '土地形状', icon: 'draw-polygon' },
        { key: 'topography', label: '地勢', icon: 'mountain' },
        { key: 'utility_status', label: 'ライフライン状況', icon: 'plug' }
      ];

      const html = fields.map(field => {
        const currentValue = currentData[field.key] || '';
        const templateValue = templateData[field.key] || '';
        
        // 変更状態を判定
        let changeType = 'no-change'; // no-change, new-value, changed-value
        let bgColor = 'bg-gray-50';
        let textColor = 'text-gray-600';
        
        if (!currentValue && templateValue) {
          changeType = 'new-value';
          bgColor = 'bg-green-50';
          textColor = 'text-green-800';
        } else if (currentValue && templateValue && currentValue !== templateValue) {
          changeType = 'changed-value';
          bgColor = 'bg-blue-50';
          textColor = 'text-blue-800';
        }

        const displayCurrent = currentValue ? (currentValue + (field.suffix || '')) : '-';
        const displayTemplate = templateValue ? (templateValue + (field.suffix || '')) : '-';

        return '<div class="' + bgColor + ' rounded-lg p-3 border border-' + bgColor.replace('50', '200') + '">' +
          '<div class="flex items-start justify-between">' +
            '<div class="flex-1">' +
              '<div class="flex items-center mb-2">' +
                '<i class="fas fa-' + field.icon + ' text-gray-500 mr-2 text-sm"></i>' +
                '<span class="font-medium text-gray-900 text-sm">' + field.label + '</span>' +
              '</div>' +
              '<div class="grid grid-cols-2 gap-3 text-sm">' +
                '<div>' +
                  '<p class="text-xs text-gray-500 mb-1">現在の値</p>' +
                  '<p class="font-mono ' + (changeType === 'changed-value' ? 'line-through text-gray-400' : 'text-gray-700') + '">' + displayCurrent + '</p>' +
                '</div>' +
                '<div>' +
                  '<p class="text-xs text-gray-500 mb-1">テンプレート値</p>' +
                  '<p class="font-mono font-semibold ' + textColor + '">' + displayTemplate + '</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
            (changeType !== 'no-change' ? 
              '<div class="ml-2"><i class="fas fa-arrow-right ' + textColor + '"></i></div>' : 
              '<div class="ml-2"><i class="fas fa-equals text-gray-400"></i></div>') +
          '</div>' +
        '</div>';
      }).join('');

      container.innerHTML = html;
    }

    // プレビューからテンプレートを適用
    async function applyTemplateFromPreview() {
      if (!previewingTemplate) {
        showToast('テンプレートが選択されていません', 'error');
        return;
      }

      try {
        // テンプレートデータを取得
        const data = typeof previewingTemplate.template_data === 'string' 
          ? JSON.parse(previewingTemplate.template_data) 
          : previewingTemplate.template_data;

        // フォームに値を設定
        applyTemplateToForm(data);

        // 選択状態を保存
        selectedTemplate = previewingTemplate;
        document.getElementById('selected-template-name').textContent = previewingTemplate.template_name;
        document.getElementById('selected-template-info').classList.remove('hidden');

        // 使用回数を増やす（プリセット以外）
        if (!previewingTemplate.is_preset) {
          try {
            await axios.post('/api/property-templates/' + previewingTemplate.id + '/use', {}, {
              headers: { Authorization: 'Bearer ' + token }
            });
          } catch (err) {
            console.error('使用回数更新エラー:', err);
          }
        }

        // モーダルを閉じる
        closePreviewModal();
        closeTemplateModal();

        showToast('テンプレートを適用しました', 'success');
      } catch (err) {
        console.error('テンプレート適用エラー:', err);
        showToast('テンプレートの適用に失敗しました', 'error');
      }
    }

    // ============================================================
    // テンプレートインポート/エクスポート機能
    // ============================================================

    let selectedImportFile = null;

    // インポートボタン - 安全に初期化
    function initImportTemplateButton() {
      const importTemplateBtn = document.getElementById('import-template-btn');
      if (importTemplateBtn) {
        importTemplateBtn.addEventListener('click', () => {
          openImportTemplateModal();
        });
      }
    }
    
    // ページ読み込み後に初期化（複数のタイミングで試行）
    function ensureImportTemplateButtonInitialized() {
      if (document.readyState === 'loading') {
        return; // まだ早すぎる
      }
      initImportTemplateButton();
    }
    
    // 複数のタイミングで初期化を試行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureImportTemplateButtonInitialized);
    } else {
      // すでにDOMContentLoaded後なら即座に実行
      ensureImportTemplateButtonInitialized();
    }
    window.addEventListener('load', ensureImportTemplateButtonInitialized);

    // テンプレートエクスポート（個別）
    function exportTemplate(templateId) {
      const template = currentTemplates.find(t => t.id === templateId);
      if (!template) {
        showToast('テンプレートが見つかりません', 'error');
        return;
      }

      // テンプレートデータをクリーンアップ（内部フィールドを除外）
      const exportData = {
        template_name: template.template_name,
        template_type: template.template_type || 'custom',
        template_data: typeof template.template_data === 'string' 
          ? JSON.parse(template.template_data) 
          : template.template_data,
        is_shared: template.is_shared,
        description: template.description || ''
      };

      // JSON文字列に変換（見やすくフォーマット）
      const json = JSON.stringify(exportData, null, 2);
      
      // Blobを作成してダウンロード
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-' + template.template_name.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('テンプレートをエクスポートしました', 'success');
    }

    // インポートモーダルを開く
    function openImportTemplateModal() {
      const modal = document.getElementById('import-template-modal');
      modal.style.display = 'flex';
      modal.classList.remove('hidden');

      // リセット
      selectedImportFile = null;
      document.getElementById('template-file-input').value = '';
      document.getElementById('selected-file-info').classList.add('hidden');
      document.getElementById('import-preview-section').classList.add('hidden');
      document.getElementById('import-template-error').classList.add('hidden');
      document.getElementById('import-template-success').classList.add('hidden');
    }

    // インポートモーダルを閉じる
    function closeImportTemplateModal() {
      const modal = document.getElementById('import-template-modal');
      modal.style.display = 'none';
      modal.classList.add('hidden');
      selectedImportFile = null;
    }

    // ファイル選択イベント
    document.getElementById('template-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        document.getElementById('import-template-error-message').textContent = 'JSONファイルを選択してください';
        document.getElementById('import-template-error').classList.remove('hidden');
        return;
      }

      selectedImportFile = file;
      document.getElementById('selected-file-name').textContent = file.name;
      document.getElementById('selected-file-info').classList.remove('hidden');
      document.getElementById('import-template-error').classList.add('hidden');

      // プレビュー表示
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        displayImportPreview(data);
      } catch (err) {
        document.getElementById('import-template-error-message').textContent = 'JSONの解析に失敗しました: ' + err.message;
        document.getElementById('import-template-error').classList.remove('hidden');
        document.getElementById('import-preview-section').classList.add('hidden');
      }
    });

    // ドラッグ&ドロップ対応
    const templateDropZone = document.querySelector('#import-template-modal .border-dashed');
    templateDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      templateDropZone.classList.add('border-purple-600', 'bg-purple-50');
    });

    templateDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      templateDropZone.classList.remove('border-purple-600', 'bg-purple-50');
    });

    templateDropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      templateDropZone.classList.remove('border-purple-600', 'bg-purple-50');

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        document.getElementById('template-file-input').files = e.dataTransfer.files;
        
        selectedImportFile = file;
        document.getElementById('selected-file-name').textContent = file.name;
        document.getElementById('selected-file-info').classList.remove('hidden');
        document.getElementById('import-template-error').classList.add('hidden');

        // プレビュー表示
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          displayImportPreview(data);
        } catch (err) {
          document.getElementById('import-template-error-message').textContent = 'JSONの解析に失敗しました: ' + err.message;
          document.getElementById('import-template-error').classList.remove('hidden');
          document.getElementById('import-preview-section').classList.add('hidden');
        }
      } else {
        document.getElementById('import-template-error-message').textContent = 'JSONファイルを選択してください';
        document.getElementById('import-template-error').classList.remove('hidden');
      }
    });

    // 選択ファイルをクリア
    function clearSelectedFile() {
      selectedImportFile = null;
      document.getElementById('template-file-input').value = '';
      document.getElementById('selected-file-info').classList.add('hidden');
      document.getElementById('import-preview-section').classList.add('hidden');
    }

    // インポートプレビュー表示
    function displayImportPreview(data) {
      const container = document.getElementById('import-template-preview');
      const previewSection = document.getElementById('import-preview-section');

      // 配列か単一オブジェクトか判定
      const templates = Array.isArray(data) ? data : [data];
      
      let html = '<div class="space-y-2">';
      templates.forEach((template, index) => {
        html += '<div class="border-l-4 border-purple-500 pl-3">';
        html += '<div class="font-medium text-gray-900">' + (index + 1) + '. ' + (template.template_name || '（名前なし）') + '</div>';
        html += '<div class="text-xs text-gray-600">タイプ: ' + (template.template_type || 'custom') + '</div>';
        html += '<div class="text-xs text-gray-600">共有: ' + (template.is_shared ? 'はい' : 'いいえ') + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '<div class="text-sm text-gray-600 mt-2">合計: ' + templates.length + ' 件のテンプレート</div>';

      container.innerHTML = html;
      previewSection.classList.remove('hidden');
    }

    // テンプレートインポート実行
    async function submitImportTemplate() {
      if (!selectedImportFile) {
        document.getElementById('import-template-error-message').textContent = 'ファイルを選択してください';
        document.getElementById('import-template-error').classList.remove('hidden');
        return;
      }

      const submitBtn = document.getElementById('import-template-btn-submit');
      const errorDiv = document.getElementById('import-template-error');
      const successDiv = document.getElementById('import-template-success');
      
      errorDiv.classList.add('hidden');
      successDiv.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>インポート中...';

      try {
        const text = await selectedImportFile.text();
        const data = JSON.parse(text);

        // バリデーション
        const templates = Array.isArray(data) ? data : [data];
        const errors = validateTemplates(templates);
        
        if (errors.length > 0) {
          throw new Error('バリデーションエラー: ' + errors.join(', '));
        }

        // 各テンプレートをインポート
        let successCount = 0;
        let errorCount = 0;
        
        for (const template of templates) {
          try {
            await axios.post('/api/property-templates', {
              template_name: template.template_name,
              template_type: template.template_type || 'custom',
              template_data: template.template_data,
              is_shared: template.is_shared || false,
              description: template.description || ''
            }, {
              headers: { Authorization: 'Bearer ' + token }
            });
            successCount++;
          } catch (err) {
            console.error('テンプレートインポートエラー:', err);
            errorCount++;
          }
        }

        // 成功メッセージ
        const successMsg = successCount + ' 件のテンプレートをインポートしました' + 
          (errorCount > 0 ? ' (' + errorCount + ' 件失敗)' : '');
        document.getElementById('import-template-success-message').textContent = successMsg;
        successDiv.classList.remove('hidden');

        // テンプレート一覧を再読み込み
        await loadTemplates();

        // 2秒後にモーダルを閉じる
        setTimeout(() => {
          closeImportTemplateModal();
          showToast(successMsg, 'success');
        }, 2000);

      } catch (err) {
        console.error('インポートエラー:', err);
        const errorMsg = err.message || 'テンプレートのインポートに失敗しました';
        document.getElementById('import-template-error-message').textContent = errorMsg;
        errorDiv.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>インポート';
      }
    }

    // テンプレートバリデーション
    function validateTemplates(templates) {
      const errors = [];
      
      templates.forEach((template, index) => {
        if (!template.template_name || template.template_name.trim() === '') {
          errors.push('テンプレート' + (index + 1) + ': 名前が必要です');
        }
        
        if (!template.template_data) {
          errors.push('テンプレート' + (index + 1) + ': template_dataが必要です');
        }
        
        // template_dataの構造をチェック（オブジェクトであること）
        if (template.template_data && typeof template.template_data !== 'object') {
          errors.push('テンプレート' + (index + 1) + ': template_dataはオブジェクトである必要があります');
        }
      });
      
      return errors;
    }

  </script>
  <!-- イベント委譲パターン - インラインロジックより前に実行 -->
  <script src="/static/deals-new-events.js"></script>
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
  <!-- Leaflet.js for maps -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
    crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""></script>
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
    'use strict';
    
    // デバッグモード（本番環境でも有効）
    const DEBUG_MODE = true;
    const PAGE_LOAD_TIMEOUT = 10000; // 10秒

    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const dealId = '${dealId}';

    if (!token) {
      window.location.href = '/';
    }

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    async function loadDeal() {
      try {
        if (DEBUG_MODE) console.log('[Deal Detail] Loading deal:', dealId);
        
        const response = await axios.get('/api/deals/' + dealId, {
          headers: { 'Authorization': 'Bearer ' + token },
          timeout: 15000  // 15秒タイムアウト
        });

        if (DEBUG_MODE) console.log('[Deal Detail] API response received:', response.data);

        const deal = response.data.deal;
        currentDealData = deal; // AI提案用にグローバル保存
        displayDeal(deal);
        
        if (DEBUG_MODE) console.log('[Deal Detail] Deal displayed successfully');
      } catch (error) {
        console.error('[Deal Detail] Failed to load deal:', error);
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
          const errorMsg = error.response?.data?.error || error.message || '不明なエラー';
          document.getElementById('deal-content').innerHTML = \`
            <div class="text-center py-12 text-red-600">
              <i class="fas fa-exclamation-triangle text-5xl mb-4"></i>
              <p class="text-xl font-semibold mb-2">案件の読み込みに失敗しました</p>
              <p class="text-sm text-gray-600">\${errorMsg}</p>
              <button onclick="loadDeal()" class="mt-4 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">
                再試行
              </button>
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
              <button onclick="showTab('ai-proposal')" id="tab-ai-proposal" class="tab-button border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                <i class="fas fa-robot mr-2"></i>AI提案
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

            <!-- 地図セクション -->
            <div class="bg-white rounded-lg shadow p-6 mt-6" id="map-section">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                  <i class="fas fa-map-marked-alt text-blue-600 mr-2"></i>
                  物件位置
                </h3>
                <button onclick="loadMapForDeal()" id="load-map-btn" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <i class="fas fa-sync-alt mr-1"></i>地図を更新
                </button>
              </div>

              <!-- 地図コンテナ -->
              <div id="map-container" class="hidden">
                <div id="map" style="height: 400px; border-radius: 8px; overflow: hidden;" class="mb-4"></div>
                <div id="map-info" class="text-sm text-gray-600">
                  <!-- 地図情報がここに表示されます -->
                </div>
              </div>

              <!-- ローディング表示 -->
              <div id="map-loading" class="hidden text-center py-8">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-3"></i>
                <p class="text-gray-600">地図を読み込んでいます...</p>
              </div>

              <!-- 地図未読み込み表示 -->
              <div id="map-placeholder" class="text-center py-8 bg-gray-50 rounded-lg">
                <i class="fas fa-map text-5xl text-gray-300 mb-3"></i>
                <p class="text-gray-600 mb-4">物件の位置を地図で確認できます</p>
                <button onclick="loadMapForDeal()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  <i class="fas fa-map-marker-alt mr-2"></i>地図を表示
                </button>
              </div>

              <!-- エラー表示 -->
              <div id="map-error" class="hidden text-center py-8 bg-red-50 rounded-lg">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-3"></i>
                <p class="text-red-700 font-medium mb-2">位置情報の取得に失敗しました</p>
                <p class="text-sm text-gray-600 mb-4" id="map-error-message"></p>
                <button onclick="loadMapForDeal()" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <i class="fas fa-redo mr-1"></i>再試行
                </button>
              </div>
            </div>
          </div>

          <!-- AI提案セクション -->
          <div id="content-ai-proposal" class="tab-content hidden">
            <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg p-8 mb-6">
              <div class="flex items-center mb-6">
                <div class="bg-purple-600 p-3 rounded-lg mr-4">
                  <i class="fas fa-robot text-white text-2xl"></i>
                </div>
                <div>
                  <h3 class="text-2xl font-bold text-gray-900">AI投資分析</h3>
                  <p class="text-gray-600">GPT-4oが物件の投資ポテンシャルを分析します</p>
                </div>
              </div>

              <!-- 買主要望入力 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  買主の要望・条件（オプション）
                </label>
                <textarea id="buyer-requirements" rows="3" 
                  placeholder="例: 利回り10%以上希望、アパート建設を検討、資金調達方法についてアドバイスが欲しい"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
              </div>

              <button onclick="generateAIProposal()" id="ai-proposal-btn"
                class="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition font-semibold shadow-lg">
                <i class="fas fa-magic mr-2"></i>AI提案を生成
              </button>

              <!-- ローディング表示 -->
              <div id="ai-loading" class="hidden mt-6 text-center">
                <div class="flex items-center justify-center">
                  <i class="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
                </div>
                <p class="mt-3 text-gray-600">AI分析中... (5-10秒ほどお待ちください)</p>
              </div>

              <!-- 結果表示 -->
              <div id="ai-proposal-result" class="hidden mt-6">
                <div class="bg-white rounded-lg shadow-xl p-6 space-y-6">
                  <h4 class="text-xl font-bold text-gray-900 mb-4">
                    <i class="fas fa-chart-line text-purple-600 mr-2"></i>分析結果
                  </h4>
                  <div id="ai-proposal-content"></div>
                </div>
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
                  <label class="block text-sm font-medium text-gray-700 mb-2">ファイル種別</label>
                  <select id="file-folder" required
                    class="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="document">書類</option>
                    <option value="ocr">OCR資料</option>
                    <option value="image">画像</option>
                    <option value="registry">登記簿謄本</option>
                    <option value="proposal">提案書</option>
                    <option value="report">報告書</option>
                    <option value="other">その他</option>
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

      // メッセージ添付ファイルイベントリスナー（displayDeal実行後に登録）
      const messageAttachmentInput = document.getElementById('message-attachment');
      if (messageAttachmentInput) {
        messageAttachmentInput.addEventListener('change', (e) => {
          messageAttachment = e.target.files[0];
          document.getElementById('attachment-name').textContent = messageAttachment ? messageAttachment.name : '';
        });
        if (DEBUG_MODE) console.log('[Deal Detail] Message attachment listener registered');
      }
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
        // 新しいAPIエンドポイントを使用
        const filesResponse = await axios.get('/api/deals/' + dealId + '/files', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        // ストレージ情報を取得
        const storageResponse = await axios.get('/api/storage-quota', {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const files = filesResponse.data.files || [];
        const storage = storageResponse.data;

        // ストレージ使用状況を更新
        const percentage = storage.percentage || 0;
        document.getElementById('storage-bar').style.width = percentage + '%';
        document.getElementById('storage-text').textContent = 
          \`\${(storage.used_mb).toFixed(2)} MB / \${(storage.limit_mb).toFixed(2)} MB 使用中 (\${percentage.toFixed(1)}%)\`;

        // ファイルリスト表示
        const filesList = document.getElementById('files-list');
        if (files.length === 0) {
          filesList.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-folder-open text-4xl mb-2"></i><p>アップロード済みファイルはありません</p></div>';
          return;
        }

        filesList.innerHTML = '<div class="divide-y">' + files.map(file => {
          const iconClass = file.file_type === 'ocr' ? 'fa-file-pdf text-red-500' :
                           file.file_type === 'image' ? 'fa-image text-blue-500' :
                           'fa-file text-gray-500';
          const sizeKB = (file.file_size / 1024).toFixed(2);
          
          return \`
          <div class="p-4 hover:bg-gray-50 transition">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <i class="fas \${iconClass} text-2xl"></i>
                <div>
                  <div class="font-medium text-gray-900">\${file.file_name}</div>
                  <div class="text-sm text-gray-500">
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs">\${file.file_type}</span>
                    \${file.is_ocr_source ? '<span class="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"><i class="fas fa-robot"></i> OCRソース</span>' : ''}
                    <span class="ml-2">\${sizeKB} KB</span>
                    <span class="ml-2">\${new Date(file.uploaded_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button onclick="downloadDealFileFromDetail('\${file.id}')" 
                  class="text-blue-600 hover:text-blue-800 transition" title="ダウンロード">
                  <i class="fas fa-download"></i>
                </button>
                <button onclick="deleteDealFileFromDetail('\${file.id}')" 
                  class="text-red-600 hover:text-red-800 transition" title="削除">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        \`;
        }).join('') + '</div>';
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
      const fileType = document.getElementById('file-folder').value;
      const files = fileInput.files;

      if (!files || files.length === 0) {
        alert('ファイルを選択してください');
        return;
      }

      try {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }
        formData.append('file_type', fileType);
        formData.append('is_ocr_source', 'false');

        const response = await axios.post('/api/deals/' + dealId + '/files', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });

        alert(response.data.message || 'ファイルをアップロードしました');
        fileInput.value = '';
        loadFiles();
      } catch (error) {
        console.error('Upload error:', error);
        alert('アップロードに失敗しました: ' + (error.response?.data?.error || error.message));
      }
    });

    // ダウンロード関数をグローバルスコープに追加
    window.downloadDealFileFromDetail = async function(fileId) {
      try {
        window.location.href = \`/api/deals/\${dealId}/files/\${fileId}/download?token=\${token}\`;
      } catch (error) {
        console.error('Download error:', error);
        alert('ダウンロードに失敗しました');
      }
    };

    // 削除関数をグローバルスコープに追加
    window.deleteDealFileFromDetail = async function(fileId) {
      if (!confirm('このファイルを削除しますか?')) return;
      
      try {
        await axios.delete(\`/api/deals/\${dealId}/files/\${fileId}\`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        alert('ファイルを削除しました');
        loadFiles();
      } catch (error) {
        console.error('Delete error:', error);
        alert('削除に失敗しました');
      }
    };

    // メッセージ機能
    let messageAttachment = null;

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

    // AI提案用のグローバル変数
    let currentDealData = null;
    
    async function generateAIProposal() {
      const buyerRequirements = document.getElementById('buyer-requirements').value;
      const loadingDiv = document.getElementById('ai-loading');
      const resultDiv = document.getElementById('ai-proposal-result');
      const contentDiv = document.getElementById('ai-proposal-content');
      const btn = document.getElementById('ai-proposal-btn');

      // ローディング表示
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
      loadingDiv.classList.remove('hidden');
      resultDiv.classList.add('hidden');

      try {
        const response = await axios.post('/api/ai-proposals/generate', {
          dealData: currentDealData,
          buyerRequirements: buyerRequirements
        }, {
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const proposal = response.data.proposal;

        // 結果表示
        contentDiv.innerHTML = \`
          <div class="space-y-6">
            <div class="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-green-900 mb-2">
                <i class="fas fa-chart-line mr-2"></i>投資ポテンシャル
              </h5>
              <p class="text-green-800">\$\{proposal.investment_potential\}</p>
            </div>

            <div class="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-blue-900 mb-2">
                <i class="fas fa-thumbs-up mr-2"></i>物件の強み
              </h5>
              <ul class="list-disc list-inside text-blue-800 space-y-1">
                \$\{proposal.strengths.map(s => '<li>' + s + '</li>').join('')\}
              </ul>
            </div>

            <div class="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-red-900 mb-2">
                <i class="fas fa-exclamation-triangle mr-2"></i>リスク要因
              </h5>
              <ul class="list-disc list-inside text-red-800 space-y-1">
                \$\{proposal.risks.map(r => '<li>' + r + '</li>').join('')\}
              </ul>
            </div>

            <div class="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-purple-900 mb-2">
                <i class="fas fa-home mr-2"></i>推奨活用方法
              </h5>
              <p class="text-purple-800">\$\{proposal.recommended_use\}</p>
            </div>

            <div class="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-yellow-900 mb-2">
                <i class="fas fa-percentage mr-2"></i>期待利回り
              </h5>
              <p class="text-yellow-800">\$\{proposal.expected_roi\}</p>
            </div>

            <div class="border-l-4 border-indigo-500 bg-indigo-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-indigo-900 mb-2">
                <i class="fas fa-lightbulb mr-2"></i>開発プラン
              </h5>
              <p class="text-indigo-800">\$\{proposal.development_plan\}</p>
            </div>

            <div class="border-l-4 border-pink-500 bg-pink-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-pink-900 mb-2">
                <i class="fas fa-money-bill-wave mr-2"></i>資金調達アドバイス
              </h5>
              <p class="text-pink-800">\$\{proposal.financing_suggestion\}</p>
            </div>

            <div class="border-l-4 border-gray-500 bg-gray-50 p-4 rounded-r-lg">
              <h5 class="font-semibold text-gray-900 mb-2">
                <i class="fas fa-tasks mr-2"></i>次のステップ
              </h5>
              <ol class="list-decimal list-inside text-gray-800 space-y-1">
                \$\{proposal.next_steps.map(step => '<li>' + step + '</li>').join('')\}
              </ol>
            </div>
          </div>
        \`;

        loadingDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic mr-2"></i>AI提案を再生成';

      } catch (error) {
        console.error('AI proposal error:', error);
        loadingDiv.classList.add('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic mr-2"></i>AI提案を生成';
        alert('AI提案の生成に失敗しました: ' + (error.response?.data?.error || error.message));
      }
    }

    // 地図表示機能
    let map = null;
    let marker = null;

    async function loadMapForDeal() {
      const mapLoading = document.getElementById('map-loading');
      const mapContainer = document.getElementById('map-container');
      const mapPlaceholder = document.getElementById('map-placeholder');
      const mapError = document.getElementById('map-error');
      const mapErrorMessage = document.getElementById('map-error-message');

      // 既存の表示をクリア
      mapPlaceholder.classList.add('hidden');
      mapError.classList.add('hidden');
      mapContainer.classList.add('hidden');
      mapLoading.classList.remove('hidden');

      if (!currentDealData || !currentDealData.location) {
        mapLoading.classList.add('hidden');
        mapError.classList.remove('hidden');
        mapErrorMessage.textContent = '所在地情報が登録されていません';
        return;
      }

      try {
        // Geocoding APIで緯度経度を取得
        const geocodingResponse = await axios.get('/api/geocoding/search', {
          params: { address: currentDealData.location },
          headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!geocodingResponse.data.success) {
          throw new Error(geocodingResponse.data.message || '位置情報が見つかりませんでした');
        }

        const { latitude, longitude, display_name, address } = geocodingResponse.data.data;

        // 地図を初期化（初回のみ）
        if (!map) {
          map = L.map('map').setView([latitude, longitude], 16);
          
          // OpenStreetMapタイルレイヤーを追加
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);
        } else {
          // 既存の地図の中心を更新
          map.setView([latitude, longitude], 16);
        }

        // 既存のマーカーを削除
        if (marker) {
          map.removeLayer(marker);
        }

        // 新しいマーカーを追加
        marker = L.marker([latitude, longitude]).addTo(map);
        
        // ポップアップを追加
        const popupContent = \`
          <div style="font-family: sans-serif;">
            <strong style="font-size: 14px; color: #1f2937;">\${currentDealData.title}</strong><br>
            <span style="font-size: 12px; color: #6b7280;">\${currentDealData.location}</span>
            \${currentDealData.station ? '<br><i class="fas fa-train" style="color: #3b82f6;"></i> ' + currentDealData.station + (currentDealData.walk_minutes ? ' 徒歩' + currentDealData.walk_minutes + '分' : '') : ''}
            \${currentDealData.land_area ? '<br><i class="fas fa-ruler-combined" style="color: #10b981;"></i> ' + currentDealData.land_area : ''}
          </div>
        \`;
        marker.bindPopup(popupContent).openPopup();

        // 地図情報を表示
        document.getElementById('map-info').innerHTML = \`
          <div class="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg">
            <i class="fas fa-info-circle text-blue-600 mt-1"></i>
            <div class="flex-1">
              <p class="font-medium text-gray-900 mb-1">取得した位置情報</p>
              <p class="text-sm text-gray-600 mb-1">
                <strong>表示名:</strong> \${display_name}
              </p>
              <p class="text-sm text-gray-600 mb-1">
                <strong>座標:</strong> 緯度 \${latitude.toFixed(6)}, 経度 \${longitude.toFixed(6)}
              </p>
              \${address && address.prefecture ? '<p class="text-sm text-gray-600"><strong>都道府県:</strong> ' + address.prefecture + '</p>' : ''}
              \${address && address.city ? '<p class="text-sm text-gray-600"><strong>市区町村:</strong> ' + address.city + '</p>' : ''}
            </div>
          </div>
        \`;

        mapLoading.classList.add('hidden');
        mapContainer.classList.remove('hidden');

        // 地図のサイズを再計算（表示後に必要）
        setTimeout(() => {
          map.invalidateSize();
        }, 100);

      } catch (error) {
        console.error('Map loading error:', error);
        mapLoading.classList.add('hidden');
        mapError.classList.remove('hidden');
        mapErrorMessage.textContent = error.response?.data?.error || error.message || '地図の読み込みに失敗しました';
      }
    }

    // ページロードタイムアウト監視
    const pageLoadTimer = setTimeout(() => {
      if (DEBUG_MODE) {
        console.error('[Deal Detail] Page load timeout exceeded');
        const dealContent = document.getElementById('deal-content');
        if (dealContent && dealContent.innerHTML.includes('読み込み中')) {
          dealContent.innerHTML = \`
            <div class="text-center py-12 text-orange-600">
              <i class="fas fa-clock text-5xl mb-4"></i>
              <p class="text-xl font-semibold mb-2">ページの読み込みがタイムアウトしました</p>
              <p class="text-sm text-gray-600 mb-4">ネットワーク接続を確認してください</p>
              <button onclick="window.location.reload()" class="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">
                ページを再読み込み
              </button>
            </div>
          \`;
        }
      }
    }, PAGE_LOAD_TIMEOUT);

    // グローバルエラーハンドラー
    window.addEventListener('error', function(event) {
      console.error('[Deal Detail] Global error:', event.error);
      if (DEBUG_MODE) {
        const errorOverlay = document.createElement('div');
        errorOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;z-index:99999;';
        errorOverlay.textContent = 'エラー: ' + (event.error?.message || 'Unknown error');
        document.body.insertBefore(errorOverlay, document.body.firstChild);
      }
    });

    // Promise拒否エラーハンドラー
    window.addEventListener('unhandledrejection', function(event) {
      console.error('[Deal Detail] Unhandled rejection:', event.reason);
      if (DEBUG_MODE) {
        const errorOverlay = document.createElement('div');
        errorOverlay.style.cssText = 'position:fixed;top:20px;left:0;right:0;background:orange;color:white;padding:10px;z-index:99999;';
        errorOverlay.textContent = '非同期エラー: ' + (event.reason?.message || 'Unknown error');
        document.body.insertBefore(errorOverlay, document.body.firstChild);
      }
    });

    // ページ読み込み後に初期化(window.load で確実に実行)
    window.addEventListener('load', function() {
      if (DEBUG_MODE) console.log('[Deal Detail] Window load event fired');
      
      // タイマークリア
      clearTimeout(pageLoadTimer);
      
      // ユーザー名表示
      if (user.name) {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
          userNameElement.textContent = user.name;
          if (DEBUG_MODE) console.log('[Deal Detail] User name displayed:', user.name);
        }
      }

      // 案件データ読み込み（メッセージ添付ファイルイベントはdisplayDeal内で登録）
      if (DEBUG_MODE) console.log('[Deal Detail] Starting deal load...');
      loadDeal();
    });
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
            placeholder="example@company.co.jp"
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
            placeholder="8文字以上のパスワード"
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

    // ページ読み込み時に自動ログインを試行（window.load で確実に実行）
    window.addEventListener('load', () => {
      // セキュリティ向上のため、古いパスワード保存を削除
      localStorage.removeItem('saved_password');
      localStorage.removeItem('auth_expiry');

      // 保存された認証情報を確認
      const savedToken = localStorage.getItem('auth_token');
      const savedEmail = localStorage.getItem('saved_email');

      // トークンが存在すれば自動リダイレクト（JWTの有効期限はサーバー側で管理）
      if (savedToken) {
        // トークンが有効なので自動リダイレクト
        window.location.href = '/dashboard';
        return;
      }

      // 保存されたメールアドレスを入力欄に復元し、チェックボックスをオン
      if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
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
          password,
          rememberMe
        });

        if (response.data.token) {
          // トークンを保存
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Remember Me が有効な場合、メールアドレスのみ保存（セキュリティのためパスワードは保存しない）
          if (rememberMe) {
            localStorage.setItem('saved_email', email);
          } else {
            // Remember Me が無効な場合、保存された情報を削除
            localStorage.removeItem('saved_email');
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
// 本番環境（Cloudflare Pages）ではpublicディレクトリの内容が自動的にルートで配信される
// 開発環境では画像ファイルは手動でdistにコピーされているため、そのまま配信される
// Note: Cloudflare Pages自動配信により、/gallery/* と /logo-3d.png は追加設定不要

// SVGロゴも配信（後方互換性のため）
app.get('/logo-3d.svg', async (c) => {
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

// 投資シミュレーターページ

// レポートダッシュボードページ

// 存在しない静的アセットへのリクエストに404を返す（静的ファイル配信の前に配置）
app.get('/favicon.ico', (c) => c.text('Not Found', 404));
app.get('/apple-touch-icon.png', (c) => c.text('Not Found', 404));
app.get('/manifest.json', (c) => c.text('Not Found', 404));
app.get('/robots.txt', (c) => c.text('Not Found', 404));

// グローバルエラーハンドラ
app.onError((err, c) => {
  console.error('[Global Error Handler]', err);
  console.error('[Error Stack]', err.stack);
  
  const errorResponse = {
    error: 'Internal server error',
    message: err.message || 'Unknown error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack?.substring(0, 500)
    })
  };
  
  return c.json(errorResponse, 500);
});

export default app;

