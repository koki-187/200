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
import aiProposals from './routes/ai-proposals';
import businessCardOCR from './routes/business-card-ocr';
import propertyOCR from './routes/property-ocr';
import purchaseCriteria from './routes/purchase-criteria';
import geocoding from './routes/geocoding';
import ocrHistory from './routes/ocr-history';
import ocrSettings from './routes/ocr-settings';
import ocrJobs from './routes/ocr-jobs';

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
app.route('/api/ai-proposals', aiProposals);
app.route('/api/business-card-ocr', businessCardOCR);
app.route('/api/property-ocr', propertyOCR);
app.route('/api/purchase-criteria', purchaseCriteria);
app.route('/api/geocoding', geocoding);
app.route('/api/ocr-history', ocrHistory);
app.route('/api/ocr-settings', ocrSettings);
app.route('/api/ocr-jobs', ocrJobs);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
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

    function showMessage(message, type) {
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

        const result = response.data;
        const resultDiv = document.getElementById('test-result');
        const contentDiv = document.getElementById('test-result-content');

        let statusColor = 'gray';
        let statusIcon = 'question-circle';
        if (result.status === 'PASS') {
          statusColor = 'green';
          statusIcon = 'check-circle';
        } else if (result.status === 'SPECIAL_REVIEW') {
          statusColor = 'yellow';
          statusIcon = 'clipboard-check';
        } else if (result.status === 'FAIL') {
          statusColor = 'red';
          statusIcon = 'times-circle';
        }

        contentDiv.innerHTML = \`
          <div class="mb-3 p-3 bg-\${statusColor}-50 border border-\${statusColor}-200 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <i class="fas fa-\${statusIcon} text-\${statusColor}-600 mr-2"></i>
                <strong class="text-\${statusColor}-900">\${result.status}</strong>
              </div>
              <div class="text-2xl font-bold text-\${statusColor}-700">\${result.score}点</div>
            </div>
          </div>
          <div class="space-y-2">
            \${result.reasons.map(reason => \`
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

    if (user.name) {
      document.getElementById('user-name').textContent = user.name;
    }

    function logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // 状態管理
    let selectedFiles = [];
    let extractedData = null;

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

    // OCR処理開始
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
        console.log('Loading deals...');
        const response = await axios.get('/api/deals', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log('Deals loaded:', response.data);
        allDeals = response.data.deals || [];
        filteredDeals = [...allDeals];
        displayDeals();
      } catch (error) {
        console.error('Failed to load deals:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        
        if (error.response && error.response.status === 401) {
          document.getElementById('deals-container').innerHTML = 
            '<div class="p-8 text-center text-red-600"><p>認証エラー: ログインし直してください</p></div>';
          setTimeout(() => logout(), 2000);
        } else {
          const errorMsg = error.response?.data?.error || error.message || '不明なエラー';
          document.getElementById('deals-container').innerHTML = 
            \`<div class="p-8 text-center text-red-600">
              <p>案件の読み込みに失敗しました</p>
              <p class="text-sm mt-2">エラー: \${errorMsg}</p>
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

    // Wait for axios to load before calling loadDeals
    if (typeof axios !== 'undefined') {
      loadDeals();
    } else {
      window.addEventListener('load', () => {
        if (typeof axios !== 'undefined') {
          loadDeals();
        } else {
          console.error('axios not loaded');
          document.getElementById('deals-container').innerHTML = 
            '<div class="p-8 text-center text-red-600"><p>ライブラリの読み込みに失敗しました。ページを再読み込みしてください。</p></div>';
        }
      });
    }
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
          <span class="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
            画像・PDF混在OK
          </span>
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
        <input type="file" id="ocr-file-input" accept="image/*,application/pdf,.pdf" class="hidden" multiple>
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
              <span id="ocr-progress-text" class="text-sm text-blue-600 font-medium">0/0 完了</span>
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
          <button id="close-history-modal" type="button" class="text-gray-400 hover:text-gray-600">
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
            <div class="flex gap-2">
              <button id="history-filter-all" class="px-3 py-1 text-sm rounded-full bg-purple-600 text-white">
                全て
              </button>
              <button id="history-filter-high" class="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                高信頼度 (90%+)
              </button>
              <button id="history-filter-medium" class="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                中信頼度 (70-90%)
              </button>
              <button id="history-filter-low" class="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                低信頼度 (~70%)
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
          <button id="close-settings-modal" type="button" class="text-gray-400 hover:text-gray-600">
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
                <input type="checkbox" id="setting-enable-batch" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
              </label>
            </div>
            
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">最大バッチサイズ</label>
              <input type="number" id="setting-max-batch-size" min="1" max="50" value="10" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <p class="text-xs text-gray-500 mt-1">一度に処理できるファイルの最大数（1-50）</p>
            </div>
            
            <div class="flex justify-end space-x-3">
              <button type="button" id="cancel-settings-btn" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
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
      const files = Array.from(e.dataTransfer.files).filter(f => 
        f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      if (files.length > 0) {
        processMultipleOCR(files);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        processMultipleOCR(files);
      }
    });

    // OCR結果を一時保存する変数
    let currentOCRData = null;
    
    // リトライ用のファイル保存
    let lastUploadedFiles = [];

    async function processMultipleOCR(files) {
      // ファイルを保存（リトライ用）
      lastUploadedFiles = Array.from(files);
      
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
      
      files.forEach(file => {
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
      progressText.textContent = '0/' + files.length + ' 完了';
      fileStatusList.innerHTML = '';
      etaSection.classList.add('hidden');
      
      // ファイル毎のステータス作成
      const fileStatusItems = {};
      files.forEach((file, index) => {
        const statusItem = document.createElement('div');
        statusItem.className = 'flex items-center justify-between text-sm p-2 bg-white rounded border border-gray-200';
        statusItem.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-clock text-gray-400 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-gray-500 text-xs">待機中</span>';
        fileStatusList.appendChild(statusItem);
        fileStatusItems[index] = statusItem;
      });

      // OCR実行（非同期ジョブとして送信）
      const startTime = Date.now();
      try {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });

        // ステップ1: ジョブを作成
        const createResponse = await axios.post('/api/ocr-jobs', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        const jobId = createResponse.data.job_id;
        console.log('OCR job created:', jobId);

        // ステップ2: ポーリングで進捗を監視
        let pollingAttempts = 0;
        const maxAttempts = 120; // 最大2分（1秒間隔）
        
        const pollInterval = setInterval(async () => {
          try {
            pollingAttempts++;
            
            // タイムアウトチェック
            if (pollingAttempts >= maxAttempts) {
              clearInterval(pollInterval);
              throw new Error('OCR処理がタイムアウトしました。処理に時間がかかっています。');
            }
            
            // ジョブのステータスを取得
            const statusResponse = await axios.get('/api/ocr-jobs/' + jobId, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            
            const job = statusResponse.data.job;
            const processedFiles = job.processed_files || 0;
            const totalFiles = job.total_files || files.length;
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
            files.forEach((file, index) => {
              if (index < processedFiles) {
                fileStatusItems[index].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-check-circle text-green-500 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-green-600 text-xs font-medium">完了</span>';
              } else if (index === processedFiles) {
                fileStatusItems[index].innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i><span class="text-gray-700 truncate">' + file.name + '</span></div><span class="text-blue-600 text-xs font-medium">処理中</span>';
              }
            });
            
            // ステータスに応じた処理
            if (status === 'completed') {
              clearInterval(pollInterval);
              
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
              clearInterval(pollInterval);
              throw new Error(job.error_message || 'OCR処理に失敗しました');
            }
            
          } catch (pollError) {
            clearInterval(pollInterval);
            progressSection.classList.add('hidden');
            displayOCRError(pollError);
          }
        }, 1000); // 1秒ごとにポーリング


      } catch (error) {
        console.error('OCR error:', error);
        progressSection.classList.add('hidden');
        
        // エラー表示
        displayOCRError(error);
      }
    }

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
    let lastUploadedFiles = [];
    document.getElementById('ocr-retry-btn').addEventListener('click', async () => {
      if (lastUploadedFiles.length === 0) {
        alert('再試行するファイルがありません');
        return;
      }
      
      // エラー表示を非表示
      document.getElementById('ocr-error-section').classList.add('hidden');
      
      // 再度OCR処理を実行
      const formData = new FormData();
      lastUploadedFiles.forEach((file, index) => {
        formData.append('file_' + index, file);
      });
      
      try {
        const response = await axios.post('/api/property-ocr/extract-multiple', formData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload progress:', percentCompleted + '%');
          }
        });
        
        if (response.data.results && response.data.results.length > 0) {
          const extractedData = response.data.results[0];
          currentOCRData = extractedData;
          displayOCRResultEditor(extractedData);
        }
      } catch (error) {
        console.error('OCR retry failed:', error);
        displayOCRError(error);
      }
    });

    // フォームへの適用
    document.getElementById('ocr-apply-btn').addEventListener('click', () => {
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
      if (updatedData.land_area) document.getElementById('land_area').value = updatedData.land_area;
      if (updatedData.zoning) document.getElementById('zoning').value = updatedData.zoning;
      if (updatedData.building_coverage) document.getElementById('building_coverage').value = updatedData.building_coverage;
      if (updatedData.floor_area_ratio) document.getElementById('floor_area_ratio').value = updatedData.floor_area_ratio;
      if (updatedData.road_info) document.getElementById('road_info').value = updatedData.road_info;
      if (updatedData.price) document.getElementById('desired_price').value = updatedData.price;
      
      // 成功メッセージ
      alert('✓ フォームに情報を反映しました。内容を確認して保存してください。');
      
      // OCRセクションを閉じる
      document.getElementById('ocr-result-edit-section').classList.add('hidden');
      previewContainer.classList.add('hidden');
    });

    // 再抽出
    document.getElementById('ocr-reextract-btn').addEventListener('click', () => {
      const fileInput = document.getElementById('ocr-file-input');
      fileInput.click();
    });

    // OCR設定モーダル
    const settingsModal = document.getElementById('ocr-settings-modal');
    
    // 設定ボタン - モーダルを開く
    document.getElementById('ocr-settings-btn').addEventListener('click', async () => {
      settingsModal.classList.remove('hidden');
      await loadSettings();
    });
    
    // 設定モーダルを閉じる
    document.getElementById('close-settings-modal').addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
    
    document.getElementById('cancel-settings-btn').addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
    
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });
    
    // 設定読み込み
    async function loadSettings() {
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
    document.getElementById('ocr-settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const settings = {
          auto_save: document.getElementById('setting-auto-save').checked,
          confidence_threshold: parseFloat(document.getElementById('setting-confidence-threshold').value) / 100,
          enable_batch: document.getElementById('setting-enable-batch').checked,
          max_batch_size: parseInt(document.getElementById('setting-max-batch-size').value)
        };
        
        await axios.post('/api/ocr-settings', settings, {
          headers: { 
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          }
        });
        
        settingsModal.classList.add('hidden');
        alert('✓ 設定を保存しました');
        
      } catch (error) {
        console.error('Failed to save settings:', error);
        alert('設定の保存に失敗しました');
      }
    });

    // 履歴モーダル
    const historyModal = document.getElementById('ocr-history-modal');
    document.getElementById('ocr-history-btn').addEventListener('click', async () => {
      historyModal.classList.remove('hidden');
      await loadOCRHistory();
    });

    document.getElementById('close-history-modal').addEventListener('click', () => {
      historyModal.classList.add('hidden');
    });

    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) {
        historyModal.classList.add('hidden');
      }
    });

    // 現在のフィルター状態
    let currentHistoryFilter = { search: '', minConfidence: 0, maxConfidence: 1 };
    
    // 履歴読み込み（検索・フィルター対応）
    async function loadOCRHistory(filters = {}) {
      const historyList = document.getElementById('ocr-history-list');
      currentHistoryFilter = { ...currentHistoryFilter, ...filters };
      
      try {
        const params = new URLSearchParams({
          limit: '50',
          search: currentHistoryFilter.search || '',
          minConfidence: String(currentHistoryFilter.minConfidence || 0),
          maxConfidence: String(currentHistoryFilter.maxConfidence || 1)
        });
        
        const response = await axios.get('/api/ocr-history?' + params.toString(), {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const histories = response.data.histories || [];
        
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
          
          return '<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer" data-history-id="' + item.id + '"><div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2"><i class="fas fa-file-alt text-gray-400"></i><span class="font-medium text-gray-900">' + propertyName + '</span></div>' + confidenceBadge + '</div><div class="text-sm text-gray-600 mb-2"><div class="flex items-center space-x-4"><span><i class="fas fa-map-marker-alt mr-1"></i>' + location + '</span>' + (price ? '<span><i class="fas fa-yen-sign mr-1"></i>' + price + '</span>' : '') + '</div></div><div class="flex items-center justify-between text-xs text-gray-500"><span><i class="fas fa-clock mr-1"></i>' + dateStr + '</span><span><i class="fas fa-images mr-1"></i>' + fileNames + '</span></div></div>';
        }).join('');
        
        // 履歴アイテムクリックイベント
        document.querySelectorAll('[data-history-id]').forEach(item => {
          item.addEventListener('click', async () => {
            const historyId = item.getAttribute('data-history-id');
            await loadHistoryDetail(historyId);
          });
        });
        
      } catch (error) {
        console.error('Failed to load OCR history:', error);
        historyList.innerHTML = '<div class="text-center text-red-500 py-8"><i class="fas fa-exclamation-triangle text-5xl mb-3"></i><p>履歴の読み込みに失敗しました</p></div>';
      }
    }
    
    // 検索ボックスイベント
    document.getElementById('history-search').addEventListener('input', (e) => {
      loadOCRHistory({ search: e.target.value });
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

    // テンプレート管理
    const templatesModal = document.getElementById('ocr-templates-modal');
    const templateEditModal = document.getElementById('template-edit-modal');
    
    document.getElementById('ocr-templates-btn').addEventListener('click', async () => {
      templatesModal.classList.remove('hidden');
      await loadTemplates();
    });

    document.getElementById('close-templates-modal').addEventListener('click', () => {
      templatesModal.classList.add('hidden');
    });

    document.getElementById('create-template-btn').addEventListener('click', () => {
      document.getElementById('template-edit-title').innerHTML = '<i class="fas fa-plus text-purple-600 mr-2"></i>テンプレート作成';
      document.getElementById('template-id').value = '';
      document.getElementById('template-name').value = '';
      document.getElementById('template-type').value = 'apartment';
      document.getElementById('template-shared').checked = false;
      document.getElementById('template-data').value = '';
      templateEditModal.classList.remove('hidden');
    });

    document.getElementById('close-template-edit-modal').addEventListener('click', () => {
      templateEditModal.classList.add('hidden');
    });

    document.getElementById('cancel-template-btn').addEventListener('click', () => {
      templateEditModal.classList.add('hidden');
    });

    templatesModal.addEventListener('click', (e) => {
      if (e.target === templatesModal) {
        templatesModal.classList.add('hidden');
      }
    });

    templateEditModal.addEventListener('click', (e) => {
      if (e.target === templateEditModal) {
        templateEditModal.classList.add('hidden');
      }
    });

    // テンプレート一覧読み込み
    async function loadTemplates() {
      const templatesList = document.getElementById('templates-list');
      
      try {
        const response = await axios.get('/api/property-templates', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const templates = response.data.templates || [];
        
        if (templates.length === 0) {
          templatesList.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="fas fa-inbox text-5xl mb-3"></i><p>テンプレートはまだありません</p></div>';
          return;
        }
        
        templatesList.innerHTML = templates.map(template => {
          const typeLabels = {
            apartment: 'マンション',
            house: '一戸建て',
            land: '土地',
            commercial: '商業物件',
            custom: 'カスタム'
          };
          
          return '<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"><div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-3"><span class="font-medium text-gray-900">' + template.template_name + '</span><span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">' + typeLabels[template.template_type] + '</span>' + (template.is_shared ? '<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full"><i class="fas fa-users mr-1"></i>共有</span>' : '') + '</div><div class="flex items-center space-x-2"><button class="apply-template-btn text-purple-600 hover:text-purple-700 font-medium text-sm" data-template-id="' + template.id + '"><i class="fas fa-check mr-1"></i>適用</button><button class="edit-template-btn text-blue-600 hover:text-blue-700 text-sm" data-template-id="' + template.id + '"><i class="fas fa-edit"></i></button><button class="delete-template-btn text-red-600 hover:text-red-700 text-sm" data-template-id="' + template.id + '"><i class="fas fa-trash"></i></button></div></div><div class="text-xs text-gray-500"><span>使用回数: ' + template.use_count + '回</span><span class="ml-4">作成日: ' + new Date(template.created_at).toLocaleDateString('ja-JP') + '</span></div></div>';
        }).join('');
        
        // イベントリスナー追加
        document.querySelectorAll('.apply-template-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            await applyTemplate(btn.getAttribute('data-template-id'));
          });
        });
        
        document.querySelectorAll('.edit-template-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            await editTemplate(btn.getAttribute('data-template-id'));
          });
        });
        
        document.querySelectorAll('.delete-template-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('このテンプレートを削除してもよろしいですか？')) {
              await deleteTemplate(btn.getAttribute('data-template-id'));
            }
          });
        });
        
      } catch (error) {
        console.error('Failed to load templates:', error);
        templatesList.innerHTML = '<div class="text-center text-red-500 py-8"><i class="fas fa-exclamation-triangle text-5xl mb-3"></i><p>テンプレートの読み込みに失敗しました</p></div>';
      }
    }

    // テンプレート適用
    async function applyTemplate(templateId) {
      try {
        const response = await axios.get('/api/property-templates/' + templateId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const template = response.data;
        const data = JSON.parse(template.template_data);
        
        // OCR結果エディターに表示
        currentOCRData = data;
        displayOCRResultEditor(data);
        
        // 使用回数更新
        await axios.post('/api/property-templates/' + templateId + '/use', {}, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        templatesModal.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        
      } catch (error) {
        console.error('Failed to apply template:', error);
        alert('テンプレートの適用に失敗しました');
      }
    }

    // テンプレート編集
    async function editTemplate(templateId) {
      try {
        const response = await axios.get('/api/property-templates/' + templateId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const template = response.data;
        
        document.getElementById('template-edit-title').innerHTML = '<i class="fas fa-edit text-purple-600 mr-2"></i>テンプレート編集';
        document.getElementById('template-id').value = template.id;
        document.getElementById('template-name').value = template.template_name;
        document.getElementById('template-type').value = template.template_type;
        document.getElementById('template-shared').checked = template.is_shared === 1;
        document.getElementById('template-data').value = template.template_data;
        
        templateEditModal.classList.remove('hidden');
        
      } catch (error) {
        console.error('Failed to load template:', error);
        alert('テンプレートの読み込みに失敗しました');
      }
    }

    // テンプレート削除
    async function deleteTemplate(templateId) {
      try {
        await axios.delete('/api/property-templates/' + templateId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        await loadTemplates();
        
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('テンプレートの削除に失敗しました');
      }
    }

    // テンプレートフォーム送信
    document.getElementById('template-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const templateId = document.getElementById('template-id').value;
      const templateData = {
        template_name: document.getElementById('template-name').value,
        template_type: document.getElementById('template-type').value,
        is_shared: document.getElementById('template-shared').checked,
        template_data: document.getElementById('template-data').value
      };
      
      // JSON validation
      try {
        JSON.parse(templateData.template_data);
      } catch (e) {
        alert('テンプレートデータが正しいJSON形式ではありません');
        return;
      }
      
      try {
        if (templateId) {
          // 更新
          await axios.put('/api/property-templates/' + templateId, templateData, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
        } else {
          // 新規作成
          await axios.post('/api/property-templates', templateData, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
        }
        
        templateEditModal.classList.add('hidden');
        await loadTemplates();
        
      } catch (error) {
        console.error('Failed to save template:', error);
        alert('テンプレートの保存に失敗しました');
      }
    });

    // OCR設定
    const settingsModal = document.getElementById('ocr-settings-modal');
    
    document.getElementById('ocr-settings-btn').addEventListener('click', async () => {
      settingsModal.classList.remove('hidden');
      await loadOCRSettings();
    });

    document.getElementById('close-settings-modal').addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    document.getElementById('cancel-settings-btn').addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });

    // 信頼度閾値スライダー
    document.getElementById('setting-confidence-threshold').addEventListener('input', (e) => {
      document.getElementById('confidence-threshold-value').textContent = e.target.value + '%';
    });

    // OCR設定読み込み
    async function loadOCRSettings() {
      try {
        const response = await axios.get('/api/ocr-settings', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const settings = response.data;
        
        document.getElementById('setting-auto-save').checked = settings.auto_save_history === 1;
        document.getElementById('setting-confidence-threshold').value = (settings.default_confidence_threshold * 100).toFixed(0);
        document.getElementById('confidence-threshold-value').textContent = (settings.default_confidence_threshold * 100).toFixed(0) + '%';
        document.getElementById('setting-enable-batch').checked = settings.enable_batch_processing === 1;
        document.getElementById('setting-max-batch-size').value = settings.max_batch_size;
        
      } catch (error) {
        console.error('Failed to load OCR settings:', error);
        // デフォルト値を設定
        document.getElementById('setting-auto-save').checked = true;
        document.getElementById('setting-confidence-threshold').value = 70;
        document.getElementById('confidence-threshold-value').textContent = '70%';
        document.getElementById('setting-enable-batch').checked = true;
        document.getElementById('setting-max-batch-size').value = 10;
      }
    }

    // OCR設定フォーム送信
    document.getElementById('ocr-settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const settings = {
        auto_save_history: document.getElementById('setting-auto-save').checked ? 1 : 0,
        default_confidence_threshold: parseInt(document.getElementById('setting-confidence-threshold').value) / 100,
        enable_batch_processing: document.getElementById('setting-enable-batch').checked ? 1 : 0,
        max_batch_size: parseInt(document.getElementById('setting-max-batch-size').value)
      };
      
      try {
        await axios.put('/api/ocr-settings', settings, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        settingsModal.classList.add('hidden');
        alert('設定を保存しました');
        
      } catch (error) {
        console.error('Failed to save OCR settings:', error);
        alert('設定の保存に失敗しました');
      }
    });

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

        const result = response.data;
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
      
      // ステータスに応じた色とアイコン
      let statusColor, statusBg, statusIcon, statusText;
      if (result.status === 'PASS') {
        statusColor = 'text-green-700';
        statusBg = 'bg-green-50 border-green-200';
        statusIcon = 'fa-check-circle';
        statusText = '合格';
      } else if (result.status === 'SPECIAL_REVIEW') {
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
      const scorePercentage = result.score;
      let scoreBarColor;
      if (scorePercentage >= 80) {
        scoreBarColor = 'bg-green-500';
      } else if (scorePercentage >= 60) {
        scoreBarColor = 'bg-yellow-500';
      } else {
        scoreBarColor = 'bg-red-500';
      }

      // 理由リスト
      const reasonsList = result.reasons && result.reasons.length > 0
        ? result.reasons.map(r => \`<li class="flex items-start"><i class="fas fa-angle-right mt-1 mr-2 text-gray-400"></i><span>\${r}</span></li>\`).join('')
        : '<li class="text-gray-500">理由情報なし</li>';

      container.innerHTML = \`
        <div class="border \${statusBg} rounded-lg p-4">
          <!-- ステータスヘッダー -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <i class="fas \${statusIcon} \${statusColor} text-2xl mr-3"></i>
              <div>
                <div class="text-lg font-bold \${statusColor}">\${statusText}</div>
                <div class="text-sm text-gray-600">買取条件チェック結果</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold \${statusColor}">\${result.score}</div>
              <div class="text-sm text-gray-600">点 / 100点</div>
            </div>
          </div>

          <!-- スコアバー -->
          <div class="mb-4">
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div class="\${scoreBarColor} h-3 rounded-full transition-all duration-500" style="width: \${scorePercentage}%"></div>
            </div>
          </div>

          <!-- 理由リスト -->
          <div>
            <div class="font-semibold text-gray-700 mb-2">評価理由:</div>
            <ul class="space-y-1 text-sm text-gray-700">
              \${reasonsList}
            </ul>
          </div>
        </div>
      \`;
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
          
          // 買取条件チェックを実行
          setTimeout(() => {
            checkPurchaseCriteria();
          }, 500);
          
          // 通知表示
          alert('OCRで抽出した物件情報を入力しました。内容を確認してください。');
        } catch (error) {
          console.error('Failed to load OCR data:', error);
        }
      }
    }

    // 初期化
    loadSellers();
    loadOCRExtractedData();
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
        currentDealData = deal; // AI提案用にグローバル保存
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

    // ページ読み込み時に自動ログインを試行
    window.addEventListener('DOMContentLoaded', () => {
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

// 静的ファイルの配信（最後に配置してAPIルートより優先度を下げる）
app.use('/*', serveStatic({ root: './' }));

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
