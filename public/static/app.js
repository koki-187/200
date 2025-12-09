// グローバル状態管理
const state = {
  token: localStorage.getItem('token') || null,
  user: null,
  deals: [],
  currentDeal: null
};

// API設定
const API_BASE = '/api';
axios.defaults.baseURL = API_BASE;

// トークンがあればヘッダーに設定
if (state.token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
}

// ページ要素
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const dealDetailPage = document.getElementById('deal-detail-page');
const notificationsPage = document.getElementById('notifications-page');
const settingsPage = document.getElementById('settings-page');
const dealsList = document.getElementById('deals-list');

// ログインフォーム
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  console.log('Login attempt:', { email, password: '***' });
  
  // ローディング表示
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>ログイン中...';
  submitBtn.disabled = true;
  
  try {
    const response = await axios.post('/auth/login', { email, password });
    
    console.log('Login success:', response.data);
    
    state.token = response.data.token;
    state.user = response.data.user;
    
    localStorage.setItem('token', state.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    
    showDashboard();
  } catch (error) {
    console.error('Login error:', error);
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    const errorMsg = error.response?.data?.error || error.message || '不明なエラーが発生しました';
    // alert removed per user requirement - see console
    console.error('ログインに失敗しました:\n\n' + errorMsg + '\n\n入力内容を確認してください。');
  }
});

// ナビゲーション - 案件タブ
document.getElementById('nav-deals')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (state.token) {
    showDashboard();
  }
});

// ナビゲーション - お知らせタブ
document.getElementById('nav-notifications')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (state.token) {
    showNotifications();
  }
});

// ナビゲーション - 設定タブ
document.getElementById('nav-settings')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (state.token) {
    showSettings();
  }
});

// ログアウト
document.getElementById('btn-logout')?.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
  
  updateHeaderVisibility(false);
  loginPage.classList.remove('hidden');
  dashboardPage.classList.add('hidden');
  dealDetailPage.classList.add('hidden');
  notificationsPage.classList.add('hidden');
  settingsPage.classList.add('hidden');
});

// ダッシュボード表示
async function showDashboard() {
  updateHeaderVisibility(true);
  loginPage.classList.add('hidden');
  dashboardPage.classList.remove('hidden');
  dealDetailPage.classList.add('hidden');
  notificationsPage.classList.add('hidden');
  settingsPage.classList.add('hidden');
  
  // 新規案件ボタンの表示制御
  const newDealBtn = document.getElementById('btn-new-deal');
  if (newDealBtn) {
    newDealBtn.style.display = state.user?.role === 'ADMIN' ? 'block' : 'none';
  }
  
  await loadDeals();
  
  // フィルターとソートのイベントリスナー
  document.getElementById('filter-status')?.addEventListener('change', renderDeals);
  document.getElementById('filter-deadline')?.addEventListener('change', renderDeals);
  document.getElementById('sort-deals')?.addEventListener('change', renderDeals);
  document.getElementById('search-deals')?.addEventListener('input', renderDeals);
}

// 案件一覧読み込み
async function loadDeals() {
  try {
    const response = await axios.get('/deals');
    state.deals = response.data.deals || [];
    
    renderDeals();
  } catch (error) {
    console.error('Failed to load deals:', error);
    dealsList.innerHTML = `
      <div class="text-center py-12 text-red-500">
        <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
        <p>案件の読み込みに失敗しました</p>
      </div>
    `;
  }
}

// 案件一覧レンダリング
function renderDeals() {
  // フィルター適用
  let filteredDeals = [...state.deals];
  
  const filterStatus = document.getElementById('filter-status')?.value;
  const filterDeadline = document.getElementById('filter-deadline')?.value;
  const searchQuery = document.getElementById('search-deals')?.value?.toLowerCase();
  
  if (filterStatus) {
    filteredDeals = filteredDeals.filter(d => d.status === filterStatus);
  }
  
  if (filterDeadline) {
    filteredDeals = filteredDeals.filter(d => {
      const status = getDeadlineStatus(d.reply_deadline);
      return status === filterDeadline;
    });
  }
  
  if (searchQuery) {
    filteredDeals = filteredDeals.filter(d => 
      d.title?.toLowerCase().includes(searchQuery) ||
      d.location?.toLowerCase().includes(searchQuery) ||
      d.station?.toLowerCase().includes(searchQuery)
    );
  }
  
  // ソート適用
  const sortBy = document.getElementById('sort-deals')?.value || 'updated_at';
  filteredDeals.sort((a, b) => {
    if (sortBy === 'updated_at') {
      return new Date(b.updated_at) - new Date(a.updated_at);
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'deadline') {
      if (!a.reply_deadline) return 1;
      if (!b.reply_deadline) return -1;
      return new Date(a.reply_deadline) - new Date(b.reply_deadline);
    } else if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });
  
  if (filteredDeals.length === 0) {
    dealsList.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-search text-6xl mb-4"></i>
        <p>条件に一致する案件が見つかりません</p>
        ${state.user?.role === 'ADMIN' ? `
          <button onclick="showNewDealForm()" class="btn-primary mt-4">
            <i class="fas fa-plus mr-2"></i>新規案件を作成
          </button>
        ` : ''}
      </div>
    `;
    return;
  }
  
  dealsList.innerHTML = filteredDeals.map(deal => {
    const deadlineStatus = getDeadlineStatus(deal.reply_deadline);
    const statusBadge = getStatusBadge(deal.status);
    const deadlineBadge = getDeadlineBadge(deadlineStatus);
    
    return `
      <div class="card hover:shadow-lg transition-shadow cursor-pointer" onclick="showDealDetail('${deal.id}')">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-3 mb-2">
              <h3 class="text-lg font-bold text-navy">${escapeHtml(deal.title)}</h3>
              ${statusBadge}
              ${deadlineBadge}
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <i class="fas fa-map-marker-alt text-gold mr-2"></i>
                ${escapeHtml(deal.location || '所在地未入力')}
              </div>
              <div>
                <i class="fas fa-train text-gold mr-2"></i>
                ${escapeHtml(deal.station || '未入力')} 徒歩${deal.walk_minutes || '?'}分
              </div>
              <div>
                <i class="fas fa-ruler-combined text-gold mr-2"></i>
                ${escapeHtml(deal.land_area || '面積未入力')}
              </div>
              <div>
                <i class="fas fa-yen-sign text-gold mr-2"></i>
                ${escapeHtml(deal.desired_price || '価格未入力')}
              </div>
            </div>
            <div class="mt-3 flex items-center space-x-4 text-sm text-gray-500">
              <span>
                <i class="fas fa-clock mr-1"></i>
                ${formatDate(deal.updated_at)}
              </span>
              ${deal.reply_deadline ? `
                <span>
                  <i class="fas fa-alarm-clock mr-1"></i>
                  期限: ${formatDate(deal.reply_deadline)}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="ml-4">
            <i class="fas fa-chevron-right text-gray-400"></i>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 案件詳細表示
async function showDealDetail(dealId) {
  try {
    const response = await axios.get(`/deals/${dealId}`);
    state.currentDeal = response.data.deal;
    
    loginPage.classList.add('hidden');
    dashboardPage.classList.add('hidden');
    dealDetailPage.classList.remove('hidden');
    notificationsPage.classList.add('hidden');
    settingsPage.classList.add('hidden');
    
    document.getElementById('deal-title').textContent = state.currentDeal.title;
    renderDealDetail();
  } catch (error) {
    console.error('Failed to load deal detail:', error);
    // alert removed per user requirement - see console
    console.error('案件詳細の読み込みに失敗しました');
  }
}

// 案件詳細レンダリング
function renderDealDetail() {
  const deal = state.currentDeal;
  const statusBadge = getStatusBadge(deal.status);
  const deadlineStatus = getDeadlineStatus(deal.reply_deadline);
  const deadlineBadge = getDeadlineBadge(deadlineStatus);
  const isEditable = state.user?.role === 'ADMIN' || deal.seller_id === state.user?.id;
  
  // 未入力項目をチェック
  const missingFields = [];
  const requiredFields = {
    'location': '所在地',
    'station': '最寄駅',
    'walk_minutes': '徒歩分数',
    'land_area': '土地面積',
    'zoning': '用途地域',
    'building_coverage': '建蔽率',
    'floor_area_ratio': '容積率',
    'road_info': '接道状況',
    'current_status': '現況',
    'desired_price': '希望価格'
  };
  
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!deal[field] || deal[field] === '' || deal[field] === null) {
      missingFields.push(label);
    }
  }
  
  document.getElementById('deal-detail-content').innerHTML = `
    <div class="grid grid-cols-3 gap-6">
      <!-- 左カラム: 基本情報とファイル -->
      <div class="col-span-2 space-y-6">
        <!-- ヘッダー -->
        <div class="flex items-center justify-between pb-4 border-b">
          <div class="flex items-center space-x-3">
            ${statusBadge}
            ${deadlineBadge}
            ${deal.reply_deadline ? `
              <span class="text-sm text-gray-600">
                <i class="fas fa-clock mr-1"></i>
                期限: ${formatDate(deal.reply_deadline)}
              </span>
            ` : ''}
          </div>
          <div class="flex items-center space-x-3">
            ${state.user?.role === 'ADMIN' ? `
              <button onclick="generateProposal()" class="btn-primary">
                <i class="fas fa-magic mr-2"></i>AI提案生成
              </button>
            ` : ''}
            <select id="deal-status" class="input-field text-sm" ${isEditable ? '' : 'disabled'}>
              <option value="NEW" ${deal.status === 'NEW' ? 'selected' : ''}>新規</option>
              <option value="IN_REVIEW" ${deal.status === 'IN_REVIEW' ? 'selected' : ''}>調査中</option>
              <option value="REPLIED" ${deal.status === 'REPLIED' ? 'selected' : ''}>一次回答済</option>
              <option value="CLOSED" ${deal.status === 'CLOSED' ? 'selected' : ''}>クロージング</option>
            </select>
          </div>
        </div>
        
        <!-- 基本情報編集フォーム -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-navy">
              <i class="fas fa-info-circle text-gold mr-2"></i>基本情報
            </h3>
            ${isEditable ? `
              <button id="btn-save-deal" class="btn-primary text-sm" onclick="saveDealInfo()">
                <i class="fas fa-save mr-2"></i>保存
              </button>
            ` : ''}
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                所在地 ${!deal.location ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-location" class="input-field text-sm" value="${escapeHtml(deal.location || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                最寄駅 ${!deal.station ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-station" class="input-field text-sm" value="${escapeHtml(deal.station || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                徒歩分数 ${!deal.walk_minutes ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="number" id="edit-walk-minutes" class="input-field text-sm" value="${deal.walk_minutes || ''}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                土地面積 ${!deal.land_area ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-land-area" class="input-field text-sm" value="${escapeHtml(deal.land_area || '')}" placeholder="例: 218.14㎡（実測）" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                用途地域 ${!deal.zoning ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-zoning" class="input-field text-sm" value="${escapeHtml(deal.zoning || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                建蔽率（%） ${!deal.building_coverage ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-building-coverage" class="input-field text-sm" value="${escapeHtml(deal.building_coverage || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                容積率（%） ${!deal.floor_area_ratio ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-floor-area-ratio" class="input-field text-sm" value="${escapeHtml(deal.floor_area_ratio || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">高度地区</label>
              <input type="text" id="edit-height-district" class="input-field text-sm" value="${escapeHtml(deal.height_district || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">防火地域</label>
              <input type="text" id="edit-fire-zone" class="input-field text-sm" value="${escapeHtml(deal.fire_zone || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                接道状況 ${!deal.road_info ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-road-info" class="input-field text-sm" value="${escapeHtml(deal.road_info || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                現況 ${!deal.current_status ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-current-status" class="input-field text-sm" value="${escapeHtml(deal.current_status || '')}" ${isEditable ? '' : 'disabled'}>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                希望価格 ${!deal.desired_price ? '<span class="text-red-500">*</span>' : ''}
              </label>
              <input type="text" id="edit-desired-price" class="input-field text-sm" value="${escapeHtml(deal.desired_price || '')}" placeholder="例: 8,000万円" ${isEditable ? '' : 'disabled'}>
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">備考</label>
              <textarea id="edit-remarks" class="input-field text-sm" rows="3" ${isEditable ? '' : 'disabled'}>${escapeHtml(deal.remarks || '')}</textarea>
            </div>
          </div>
        </div>
        
        <!-- ファイル管理 -->
        <div class="card">
          <h3 class="text-lg font-bold text-navy mb-4">
            <i class="fas fa-folder text-gold mr-2"></i>添付ファイル
          </h3>
          
          <!-- ファイルアップロード -->
          ${isEditable ? `
            <div class="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div class="flex items-center space-x-3">
                <input type="file" id="file-upload" class="hidden" multiple>
                <button onclick="document.getElementById('file-upload').click()" class="btn-secondary text-sm">
                  <i class="fas fa-upload mr-2"></i>ファイルを選択
                </button>
                <span id="file-upload-info" class="text-sm text-gray-600">またはドラッグ＆ドロップ</span>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                PDF, 画像（JPG, PNG）, Excel, Wordファイルをアップロードできます
              </p>
            </div>
          ` : ''}
          
          <!-- ファイル一覧 -->
          <div id="files-list">
            <p class="text-center text-gray-500 py-4">ファイルを読み込み中...</p>
          </div>
        </div>
      </div>
      
      <!-- 右カラム: チャットと未入力項目 -->
      <div class="space-y-6">
        <!-- 未入力項目パネル -->
        ${missingFields.length > 0 ? `
          <div class="card bg-red-50 border-2 border-red-200">
            <h3 class="text-lg font-bold text-red-800 mb-3">
              <i class="fas fa-exclamation-triangle mr-2"></i>未入力項目
            </h3>
            <p class="text-sm text-red-700 mb-3">以下の項目が未入力です。情報を入力してください。</p>
            <ul class="space-y-1">
              ${missingFields.map(f => `
                <li class="text-sm text-red-700">
                  <i class="fas fa-times-circle mr-2"></i>${f}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : `
          <div class="card bg-green-50 border-2 border-green-200">
            <h3 class="text-lg font-bold text-green-800 mb-2">
              <i class="fas fa-check-circle mr-2"></i>全項目入力済み
            </h3>
            <p class="text-sm text-green-700">必要な情報がすべて入力されています。</p>
          </div>
        `}
        
        <!-- チャット -->
        <div class="card">
          <h3 class="text-lg font-bold text-navy mb-3">
            <i class="fas fa-comments text-gold mr-2"></i>チャット
          </h3>
          <div id="chat-messages" class="bg-gray-50 rounded p-3 mb-3 max-h-[400px] overflow-y-auto">
            <p class="text-center text-gray-500">メッセージを読み込み中...</p>
          </div>
          <div class="space-y-2">
            <textarea id="chat-input" class="input-field text-sm" rows="3" placeholder="メッセージを入力..."></textarea>
            <button onclick="sendMessage()" class="btn-primary w-full text-sm">
              <i class="fas fa-paper-plane mr-2"></i>送信
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // ステータス変更時の自動保存
  if (isEditable) {
    document.getElementById('deal-status')?.addEventListener('change', async (e) => {
      try {
        await axios.put(`/deals/${deal.id}`, { status: e.target.value });
        state.currentDeal.status = e.target.value;
        // alert removed per user requirement - see console
    console.error('ステータスを更新しました');
      } catch (error) {
        // alert removed per user requirement - see console
    console.error('ステータスの更新に失敗しました');
      }
    });
    
    // ファイルアップロードイベント
    document.getElementById('file-upload')?.addEventListener('change', handleFileUpload);
  }
  
  loadMessages(deal.id);
  loadFiles(deal.id);
}

// メッセージ読み込み
async function loadMessages(dealId) {
  try {
    const response = await axios.get(`/messages/deals/${dealId}`);
    const messages = response.data.messages || [];
    
    const chatMessages = document.getElementById('chat-messages');
    if (messages.length === 0) {
      chatMessages.innerHTML = '<p class="text-center text-gray-500">まだメッセージがありません</p>';
      return;
    }
    
    chatMessages.innerHTML = messages.map(msg => `
      <div class="mb-3 ${msg.sender_id === state.user?.id ? 'text-right' : ''}">
        <div class="inline-block ${msg.sender_id === state.user?.id ? 'bg-gold text-white' : 'bg-white'} rounded-lg px-4 py-2 max-w-[70%]">
          <p class="text-sm">${escapeHtml(msg.content)}</p>
          <p class="text-xs opacity-75 mt-1">${formatDate(msg.created_at)}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load messages:', error);
  }
}

// メッセージ送信
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  
  if (!content) return;
  
  try {
    await axios.post(`/messages/deals/${state.currentDeal.id}`, { content });
    input.value = '';
    loadMessages(state.currentDeal.id);
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('メッセージの送信に失敗しました');
  }
}

// 案件情報保存
async function saveDealInfo() {
  const updates = {
    location: document.getElementById('edit-location').value,
    station: document.getElementById('edit-station').value,
    walk_minutes: parseInt(document.getElementById('edit-walk-minutes').value) || null,
    land_area: document.getElementById('edit-land-area').value,
    zoning: document.getElementById('edit-zoning').value,
    building_coverage: document.getElementById('edit-building-coverage').value,
    floor_area_ratio: document.getElementById('edit-floor-area-ratio').value,
    height_district: document.getElementById('edit-height-district').value,
    fire_zone: document.getElementById('edit-fire-zone').value,
    road_info: document.getElementById('edit-road-info').value,
    current_status: document.getElementById('edit-current-status').value,
    desired_price: document.getElementById('edit-desired-price').value,
    remarks: document.getElementById('edit-remarks').value
  };
  
  try {
    await axios.put(`/deals/${state.currentDeal.id}`, updates);
    state.currentDeal = { ...state.currentDeal, ...updates };
    // alert removed per user requirement - see console
    console.error('案件情報を保存しました');
    renderDealDetail();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('保存に失敗しました: ' + (error.response?.data?.error || error.message));
  }
}

// ファイル一覧読み込み
async function loadFiles(dealId) {
  try {
    const response = await axios.get(`/files/deals/${dealId}`);
    const files = response.data.files || [];
    
    renderFiles(files);
  } catch (error) {
    console.error('Failed to load files:', error);
    document.getElementById('files-list').innerHTML = `
      <p class="text-center text-red-500 py-4">ファイルの読み込みに失敗しました</p>
    `;
  }
}

// ファイル一覧レンダリング
function renderFiles(files) {
  const list = document.getElementById('files-list');
  
  if (files.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-500 py-4">添付ファイルはありません</p>';
    return;
  }
  
  const totalSize = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const limitMB = 50; // デフォルト50MB
  const usagePercent = (totalSize / (limitMB * 1024 * 1024) * 100).toFixed(1);
  
  list.innerHTML = `
    <!-- ストレージ使用状況 -->
    <div class="mb-4 p-3 bg-gray-50 rounded">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-gray-700">ストレージ使用状況</span>
        <span class="text-xs text-gray-600">${totalSizeMB}MB / ${limitMB}MB</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="bg-gold h-2 rounded-full" style="width: ${Math.min(usagePercent, 100)}%"></div>
      </div>
      ${usagePercent > 80 ? `
        <p class="text-xs text-orange-600 mt-1">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          ストレージ容量が残りわずかです
        </p>
      ` : ''}
    </div>
    
    <!-- ファイル一覧 -->
    <div class="space-y-2">
      ${files.map(file => {
        const iconMap = {
          'application/pdf': 'fa-file-pdf text-red-500',
          'image/jpeg': 'fa-file-image text-blue-500',
          'image/png': 'fa-file-image text-blue-500',
          'application/vnd.ms-excel': 'fa-file-excel text-green-500',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel text-green-500',
          'application/msword': 'fa-file-word text-blue-700',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word text-blue-700'
        };
        
        const icon = iconMap[file.file_type] || 'fa-file text-gray-500';
        const sizeMB = (file.size_bytes / (1024 * 1024)).toFixed(2);
        
        return `
          <div class="flex items-center justify-between p-2 bg-white rounded border hover:border-gold transition-colors">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
              <i class="fas ${icon} text-xl"></i>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-navy truncate">${escapeHtml(file.filename)}</p>
                <p class="text-xs text-gray-500">${sizeMB}MB • ${formatDate(file.created_at)}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button onclick="downloadFile('${file.id}')" class="text-gold hover:text-gold-dark text-sm">
                <i class="fas fa-download"></i>
              </button>
              ${state.user?.role === 'ADMIN' || state.currentDeal.seller_id === state.user?.id ? `
                <button onclick="deleteFile('${file.id}')" class="text-red-500 hover:text-red-700 text-sm">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ファイルアップロード処理
async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`/files/deals/${state.currentDeal.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      // alert removed per user requirement - see console
    console.error(`${file.name}のアップロードに失敗しました: ${error.response?.data?.error || error.message}`);
    }
  }
  
  // ファイル一覧を再読み込み
  loadFiles(state.currentDeal.id);
  event.target.value = ''; // input をリセット
}

// ファイルダウンロード
async function downloadFile(fileId) {
  try {
    window.open(`/api/files/${fileId}`, '_blank');
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('ファイルのダウンロードに失敗しました');
  }
}

// ファイル削除
async function deleteFile(fileId) {
  if (!confirm('このファイルを削除しますか?')) return;
  
  try {
    await axios.delete(`/files/${fileId}`);
    loadFiles(state.currentDeal.id);
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('ファイルの削除に失敗しました');
  }
}

// AI提案生成
async function generateProposal() {
  if (!state.currentDeal) return;
  
  if (!confirm('この案件のAI提案を生成しますか?\n\n生成には数秒かかる場合があります。')) {
    return;
  }
  
  const btn = event?.target;
  const originalText = btn?.innerHTML;
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
    btn.disabled = true;
  }
  
  try {
    const response = await axios.post(`/proposals/deals/${state.currentDeal.id}`, {
      buyer_profile: '200棟アパート開発プロジェクト',
      investment_criteria: '利回り重視、駅近物件優先'
    });
    
    const proposal = response.data.proposal;
    
    // 提案結果を表示
    // alert removed per user requirement - see console
    console.error(`AI提案を生成しました！\n\n【総合評価】\n${proposal.summary}\n\n提案の詳細は案件メモに保存されました。`);
    
    // 案件詳細を再読み込み
    await showDealDetail(state.currentDeal.id);
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('AI提案の生成に失敗しました: ' + (error.response?.data?.error || error.message));
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

// 新規案件作成モーダル
document.getElementById('btn-new-deal')?.addEventListener('click', async () => {
  // 管理者権限チェック
  if (state.user?.role !== 'ADMIN') {
    // alert removed per user requirement - see console
    console.error('案件作成は管理者のみ可能です');
    return;
  }
  
  // エージェント一覧を取得
  try {
    const response = await axios.get('/settings/users');
    const users = response.data.users || [];
    const agents = users.filter(u => u.role === 'AGENT');
    
    const sellerSelect = document.getElementById('new-deal-seller');
    sellerSelect.innerHTML = '<option value="">選択してください</option>' + 
      agents.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.email)})</option>`).join('');
    
    // モーダルを表示
    document.getElementById('new-deal-modal').classList.remove('hidden');
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('エージェント情報の取得に失敗しました');
  }
});

// モーダルを閉じる
document.getElementById('btn-close-modal')?.addEventListener('click', () => {
  document.getElementById('new-deal-modal').classList.add('hidden');
});

document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
  document.getElementById('new-deal-modal').classList.add('hidden');
});

// 新規案件作成フォーム送信
document.getElementById('new-deal-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newDeal = {
    title: document.getElementById('new-deal-title').value,
    seller_id: document.getElementById('new-deal-seller').value,
    status: document.getElementById('new-deal-status').value,
    location: document.getElementById('new-deal-location').value || null,
    station: document.getElementById('new-deal-station').value || null,
    walk_minutes: parseInt(document.getElementById('new-deal-walk').value) || null,
    land_area: document.getElementById('new-deal-area').value || null,
    desired_price: document.getElementById('new-deal-price').value || null
  };
  
  if (!newDeal.title || !newDeal.seller_id) {
    // alert removed per user requirement - see console
    console.error('案件名とエージェントは必須です');
    return;
  }
  
  try {
    await axios.post('/deals', newDeal);
    document.getElementById('new-deal-modal').classList.add('hidden');
    document.getElementById('new-deal-form').reset();
    // alert removed per user requirement - see console
    console.error('案件を作成しました');
    await loadDeals();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('案件の作成に失敗しました: ' + (error.response?.data?.error || error.message));
  }
});

// フィルターとソートのイベントリスナー
document.getElementById('filter-status')?.addEventListener('change', renderDeals);
document.getElementById('filter-deadline')?.addEventListener('change', renderDeals);
document.getElementById('search-deals')?.addEventListener('input', renderDeals);
document.getElementById('sort-deals')?.addEventListener('change', renderDeals);

// 一覧に戻る
document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
  showDashboard();
});

// ユーティリティ関数
function getDeadlineStatus(deadline) {
  if (!deadline) return 'UNKNOWN';
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffHours = (deadlineDate - now) / (1000 * 60 * 60);
  
  if (diffHours < 0) return 'OVERDUE';
  if (diffHours < 24) return 'WARNING';
  return 'IN_TIME';
}

function getStatusBadge(status) {
  const badges = {
    'NEW': '<span class="badge bg-blue-100 text-blue-800">新規</span>',
    'IN_REVIEW': '<span class="badge bg-yellow-100 text-yellow-800">調査中</span>',
    'REPLIED': '<span class="badge bg-green-100 text-green-800">一次回答済</span>',
    'CLOSED': '<span class="badge bg-gray-100 text-gray-800">クロージング</span>'
  };
  return badges[status] || '';
}

function getDeadlineBadge(status) {
  const badges = {
    'IN_TIME': '<span class="badge badge-success">期限内</span>',
    'WARNING': '<span class="badge badge-warning">期限迫る</span>',
    'OVERDUE': '<span class="badge badge-danger">期限超過</span>'
  };
  return badges[status] || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '未設定';
  const date = new Date(dateStr);
  return date.toLocaleString('ja-JP', { 
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ヘッダーとバナーの表示制御
function updateHeaderVisibility(isLoggedIn) {
  const header = document.querySelector('header');
  const banner = document.querySelector('.bg-blue-50');
  
  if (header) {
    header.style.display = isLoggedIn ? 'block' : 'none';
  }
  if (banner) {
    banner.style.display = isLoggedIn ? 'block' : 'none';
  }
}

// お知らせページ表示
async function showNotifications() {
  updateHeaderVisibility(true);
  loginPage.classList.add('hidden');
  dashboardPage.classList.add('hidden');
  dealDetailPage.classList.add('hidden');
  settingsPage.classList.add('hidden');
  notificationsPage.classList.remove('hidden');
  
  await loadNotifications();
}

// お知らせ読み込み
async function loadNotifications(filterType = 'ALL') {
  try {
    const response = await axios.get('/notifications');
    let notifications = response.data.notifications || [];
    
    // フィルター適用
    if (filterType !== 'ALL') {
      notifications = notifications.filter(n => n.type === filterType);
    }
    
    renderNotifications(notifications);
  } catch (error) {
    console.error('Failed to load notifications:', error);
    document.getElementById('notifications-list').innerHTML = `
      <div class="text-center py-12 text-red-500">
        <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
        <p>お知らせの読み込みに失敗しました</p>
      </div>
    `;
  }
}

// お知らせレンダリング
function renderNotifications(notifications) {
  const list = document.getElementById('notifications-list');
  
  if (notifications.length === 0) {
    list.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-bell-slash text-6xl mb-4"></i>
        <p>お知らせはありません</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = notifications.map(notif => {
    const iconMap = {
      'NEW_DEAL': 'fa-folder-plus',
      'NEW_MESSAGE': 'fa-comment',
      'DEADLINE': 'fa-clock',
      'MISSING_INFO': 'fa-exclamation-triangle'
    };
    
    const colorMap = {
      'NEW_DEAL': 'text-blue-500',
      'NEW_MESSAGE': 'text-green-500',
      'DEADLINE': 'text-orange-500',
      'MISSING_INFO': 'text-red-500'
    };
    
    const icon = iconMap[notif.type] || 'fa-bell';
    const color = colorMap[notif.type] || 'text-gray-500';
    
    return `
      <div class="card ${notif.is_read ? 'opacity-60' : 'border-l-4 border-gold'}" data-notification-id="${notif.id}">
        <div class="flex items-start">
          <div class="mr-4">
            <i class="fas ${icon} ${color} text-2xl"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-bold text-navy">${escapeHtml(notif.title)}</h3>
              ${!notif.is_read ? '<span class="badge bg-gold text-white">未読</span>' : ''}
            </div>
            <p class="text-gray-700 mb-2">${escapeHtml(notif.message)}</p>
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>${formatDate(notif.created_at)}</span>
              <div class="flex space-x-2">
                ${!notif.is_read ? `
                  <button onclick="markAsRead('${notif.id}')" class="text-gold hover:text-gold-dark">
                    <i class="fas fa-check mr-1"></i>既読にする
                  </button>
                ` : ''}
                <button onclick="deleteNotification('${notif.id}')" class="text-red-500 hover:text-red-700">
                  <i class="fas fa-trash mr-1"></i>削除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 通知フィルター
document.querySelectorAll('.notification-filter').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.notification-filter').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const type = e.target.dataset.type;
    loadNotifications(type);
  });
});

// 全て既読にする
document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
  try {
    await axios.put('/notifications/read-all');
    loadNotifications();
    // alert removed per user requirement - see console
    console.error('すべての通知を既読にしました');
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('既読処理に失敗しました');
  }
});

// 既読にする
async function markAsRead(notificationId) {
  try {
    await axios.put(`/notifications/${notificationId}/read`);
    loadNotifications();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('既読処理に失敗しました');
  }
}

// 通知削除
async function deleteNotification(notificationId) {
  if (!confirm('この通知を削除しますか?')) return;
  
  try {
    await axios.delete(`/notifications/${notificationId}`);
    loadNotifications();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('通知の削除に失敗しました');
  }
}

// 設定ページ表示
async function showSettings() {
  updateHeaderVisibility(true);
  loginPage.classList.add('hidden');
  dashboardPage.classList.add('hidden');
  dealDetailPage.classList.add('hidden');
  notificationsPage.classList.add('hidden');
  settingsPage.classList.remove('hidden');
  
  // 管理者専用セクションの表示制御
  const userMgmtSection = document.getElementById('user-management-section');
  if (state.user?.role === 'ADMIN' && userMgmtSection) {
    userMgmtSection.classList.remove('hidden');
  }
  
  await loadSettings();
}

// 設定読み込み
async function loadSettings() {
  try {
    const response = await axios.get('/settings');
    const settings = response.data.settings;
    
    // ビジネスデイ設定
    if (settings.business_days) {
      const businessDays = JSON.parse(settings.business_days);
      document.querySelectorAll('input[name="business-day"]').forEach(checkbox => {
        checkbox.checked = businessDays.includes(parseInt(checkbox.value));
      });
    }
    
    // 休日一覧
    if (settings.holidays) {
      const holidays = JSON.parse(settings.holidays);
      renderHolidays(holidays);
    } else {
      renderHolidays([]);
    }
    
    // ストレージ上限
    if (settings.storage_limit_mb) {
      document.getElementById('storage-limit').value = settings.storage_limit_mb;
    }
    
    // ユーザー一覧（管理者のみ）
    if (state.user?.role === 'ADMIN') {
      await loadUsers();
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    // alert removed per user requirement - see console
    console.error('設定の読み込みに失敗しました');
  }
}

// 休日レンダリング
function renderHolidays(holidays) {
  const list = document.getElementById('holidays-list');
  
  if (holidays.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-500 py-4">登録された休日はありません</p>';
    return;
  }
  
  list.innerHTML = holidays.map(h => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div>
        <span class="font-medium text-navy">${h.date}</span>
        <span class="text-gray-600 ml-3">${escapeHtml(h.description || '休日')}</span>
      </div>
      <button onclick="deleteHoliday('${h.date}')" class="text-red-500 hover:text-red-700">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// ビジネスデイ保存
document.getElementById('btn-save-business-days')?.addEventListener('click', async () => {
  const checkedDays = Array.from(document.querySelectorAll('input[name="business-day"]:checked'))
    .map(cb => parseInt(cb.value));
  
  try {
    await axios.put('/settings', { business_days: checkedDays });
    // alert removed per user requirement - see console
    console.error('ビジネスデイ設定を保存しました');
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('保存に失敗しました');
  }
});

// 休日追加
document.getElementById('btn-add-holiday')?.addEventListener('click', async () => {
  const date = document.getElementById('new-holiday-date').value;
  const description = document.getElementById('new-holiday-desc').value;
  
  if (!date) {
    // alert removed per user requirement - see console
    console.error('日付を選択してください');
    return;
  }
  
  try {
    await axios.post('/settings/holidays', { date, description });
    document.getElementById('new-holiday-date').value = '';
    document.getElementById('new-holiday-desc').value = '';
    loadSettings();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('休日の追加に失敗しました');
  }
});

// 休日削除
async function deleteHoliday(date) {
  if (!confirm(`${date}を休日から削除しますか?`)) return;
  
  try {
    await axios.delete(`/settings/holidays/${date}`);
    loadSettings();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('休日の削除に失敗しました');
  }
}

// ストレージ設定保存
document.getElementById('btn-save-storage')?.addEventListener('click', async () => {
  const limit = parseInt(document.getElementById('storage-limit').value);
  
  if (limit < 10 || limit > 500) {
    // alert removed per user requirement - see console
    console.error('ストレージ上限は10MB〜500MBの範囲で設定してください');
    return;
  }
  
  try {
    await axios.put('/settings', { storage_limit_mb: limit });
    // alert removed per user requirement - see console
    console.error('ストレージ設定を保存しました');
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('保存に失敗しました');
  }
});

// ユーザー一覧読み込み
async function loadUsers() {
  try {
    const response = await axios.get('/settings/users');
    const users = response.data.users || [];
    
    const usersList = document.querySelector('#users-list .space-y-2');
    if (users.length === 0) {
      usersList.innerHTML = '<p class="text-center text-gray-500 py-4">登録ユーザーはいません</p>';
      return;
    }
    
    usersList.innerHTML = users.map(u => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
        <div class="flex-1">
          <div class="font-medium text-navy">${escapeHtml(u.name)}</div>
          <div class="text-sm text-gray-600">${escapeHtml(u.email)}</div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="badge ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
            ${u.role === 'ADMIN' ? '管理者' : 'エージェント'}
          </span>
          <span class="text-xs text-gray-500">${formatDate(u.created_at)}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

// ユーザー作成
document.getElementById('btn-create-user')?.addEventListener('click', async () => {
  const email = document.getElementById('new-user-email').value;
  const name = document.getElementById('new-user-name').value;
  const password = document.getElementById('new-user-password').value;
  const userRole = document.getElementById('new-user-role').value;
  
  if (!email || !name || !password) {
    // alert removed per user requirement - see console
    console.error('すべての項目を入力してください');
    return;
  }
  
  try {
    await axios.post('/settings/users', { email, name, password, userRole });
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-password').value = '';
    // alert removed per user requirement - see console
    console.error('ユーザーを追加しました');
    loadUsers();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('ユーザーの追加に失敗しました: ' + (error.response?.data?.error || error.message));
  }
});

// 新規案件作成モーダル表示
document.getElementById('btn-new-deal')?.addEventListener('click', async () => {
  // エージェント一覧を読み込み
  try {
    const response = await axios.get('/settings/users');
    const users = response.data.users || [];
    const agents = users.filter(u => u.role === 'AGENT');
    
    const sellerSelect = document.getElementById('new-deal-seller');
    sellerSelect.innerHTML = '<option value="">選択してください</option>' + 
      agents.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.email)})</option>`).join('');
    
    document.getElementById('new-deal-modal').classList.remove('hidden');
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('ユーザー情報の読み込みに失敗しました');
  }
});

// 新規案件作成モーダルを閉じる
function closeNewDealModal() {
  document.getElementById('new-deal-modal').classList.add('hidden');
  document.getElementById('new-deal-title').value = '';
  document.getElementById('new-deal-seller').value = '';
  document.getElementById('new-deal-location').value = '';
  document.getElementById('new-deal-station').value = '';
  document.getElementById('new-deal-walk-minutes').value = '';
  document.getElementById('new-deal-price').value = '';
  document.getElementById('new-deal-remarks').value = '';
}

// 新規案件作成
async function createNewDeal() {
  const title = document.getElementById('new-deal-title').value.trim();
  const sellerId = document.getElementById('new-deal-seller').value;
  const location = document.getElementById('new-deal-location').value.trim();
  const station = document.getElementById('new-deal-station').value.trim();
  const walkMinutes = document.getElementById('new-deal-walk-minutes').value;
  const desiredPrice = document.getElementById('new-deal-price').value.trim();
  const remarks = document.getElementById('new-deal-remarks').value.trim();
  
  if (!title || !sellerId) {
    // alert removed per user requirement - see console
    console.error('案件名と売主担当者は必須です');
    return;
  }
  
  try {
    const newDeal = {
      title,
      seller_id: sellerId,
      location: location || null,
      station: station || null,
      walk_minutes: walkMinutes ? parseInt(walkMinutes) : null,
      desired_price: desiredPrice || null,
      remarks: remarks || null,
      status: 'NEW'
    };
    
    await axios.post('/deals', newDeal);
    closeNewDealModal();
    // alert removed per user requirement - see console
    console.error('案件を作成しました');
    await loadDeals();
  } catch (error) {
    // alert removed per user requirement - see console
    console.error('案件の作成に失敗しました: ' + (error.response?.data?.error || error.message));
  }
}

// OCR機能
document.getElementById('btn-ocr-upload')?.addEventListener('click', () => {
  document.getElementById('ocr-file-input').click();
});

document.getElementById('ocr-file-input')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const statusDiv = document.getElementById('ocr-status');
  statusDiv.classList.remove('hidden');
  statusDiv.className = 'mt-2 text-sm text-center text-blue-600';
  statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>画像を解析中...';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/api/ocr/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.data.success && response.data.extracted) {
      const data = response.data.extracted;
      
      // フォームに自動入力
      if (data.property_name && !document.getElementById('new-deal-title').value) {
        document.getElementById('new-deal-title').value = data.property_name;
      }
      if (data.location) {
        document.getElementById('new-deal-location').value = data.location;
      }
      if (data.access) {
        // "最寄駅名 徒歩X分" のような形式を解析
        const stationMatch = data.access.match(/(.+?)(?:駅)?(?:\s*徒歩\s*(\d+)\s*分)?/);
        if (stationMatch) {
          if (stationMatch[1]) {
            document.getElementById('new-deal-station').value = stationMatch[1].trim();
          }
          if (stationMatch[2]) {
            document.getElementById('new-deal-walk').value = stationMatch[2];
          }
        }
      }
      if (data.land_area) {
        document.getElementById('new-deal-area').value = data.land_area;
      }
      if (data.price) {
        document.getElementById('new-deal-price').value = data.price;
      }

      statusDiv.className = 'mt-2 text-sm text-center text-green-600';
      statusDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>情報を自動入力しました！';
      
      setTimeout(() => {
        statusDiv.classList.add('hidden');
      }, 3000);
    } else {
      throw new Error('OCR結果が取得できませんでした');
    }
  } catch (error) {
    console.error('OCR error:', error);
    statusDiv.className = 'mt-2 text-sm text-center text-red-600';
    statusDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>エラー: ' + (error.response?.data?.error || error.message);
  }
  
  // ファイル入力をリセット
  e.target.value = '';
});

// PDF生成機能
document.getElementById('btn-download-pdf')?.addEventListener('click', async () => {
  if (!state.currentDeal) {
    // alert removed per user requirement - see console
    console.error('案件情報が読み込まれていません');
    return;
  }

  const dealId = state.currentDeal.id;
  
  // ローディング表示
  const btn = document.getElementById('btn-download-pdf');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>PDF生成中...';
  btn.disabled = true;

  try {
    // PDFデータ取得
    const response = await axios.get(`/pdf/deal/${dealId}/data`);
    const { data } = response.data;

    // jsPDF初期化
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let y = 20;
    const lineHeight = 7;
    const pageHeight = 280;

    // タイトル
    doc.setFontSize(18);
    doc.text('案件レポート', 105, y, { align: 'center' });
    y += 15;

    // 案件情報
    doc.setFontSize(14);
    doc.text('【案件情報】', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`案件名: ${data.deal.title}`, 20, y);
    y += lineHeight;
    
    doc.text(`ステータス: ${getStatusLabel(data.deal.status)}`, 20, y);
    y += lineHeight;

    if (data.deal.location) {
      doc.text(`所在地: ${data.deal.location}`, 20, y);
      y += lineHeight;
    }

    if (data.deal.station) {
      doc.text(`最寄駅: ${data.deal.station}`, 20, y);
      y += lineHeight;
    }

    if (data.deal.land_area) {
      doc.text(`土地面積: ${data.deal.land_area}`, 20, y);
      y += lineHeight;
    }

    if (data.deal.desired_price) {
      doc.text(`希望価格: ${data.deal.desired_price}`, 20, y);
      y += lineHeight;
    }

    if (data.deal.response_deadline) {
      doc.text(`回答期限: ${new Date(data.deal.response_deadline).toLocaleString('ja-JP')}`, 20, y);
      y += lineHeight;
    }

    y += 5;

    // 担当者情報
    if (data.buyer || data.seller) {
      doc.setFontSize(14);
      doc.text('【担当者情報】', 20, y);
      y += 10;

      doc.setFontSize(10);
      if (data.buyer) {
        doc.text(`買側: ${data.buyer.name} (${data.buyer.email})`, 20, y);
        y += lineHeight;
      }
      if (data.seller) {
        doc.text(`売側: ${data.seller.name} (${data.seller.email})`, 20, y);
        y += lineHeight;
      }
      y += 5;
    }

    // AI提案
    if (data.proposal) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text('【AI提案】', 20, y);
      y += 10;

      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(data.proposal.summary, 170);
      summaryLines.forEach(line => {
        if (y > pageHeight - 10) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += lineHeight;
      });

      y += 5;

      if (data.proposal.strengths && data.proposal.strengths.length > 0) {
        doc.text('強み:', 20, y);
        y += lineHeight;
        data.proposal.strengths.forEach(strength => {
          const lines = doc.splitTextToSize(`• ${strength}`, 165);
          lines.forEach(line => {
            if (y > pageHeight - 10) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 25, y);
            y += lineHeight;
          });
        });
        y += 3;
      }

      if (data.proposal.concerns && data.proposal.concerns.length > 0) {
        doc.text('懸念点:', 20, y);
        y += lineHeight;
        data.proposal.concerns.forEach(concern => {
          const lines = doc.splitTextToSize(`• ${concern}`, 165);
          lines.forEach(line => {
            if (y > pageHeight - 10) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 25, y);
            y += lineHeight;
          });
        });
        y += 3;
      }
    }

    // メッセージ履歴
    if (data.messages && data.messages.length > 0) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text('【メッセージ履歴】', 20, y);
      y += 10;

      doc.setFontSize(9);
      data.messages.slice(0, 10).forEach(msg => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }

        const dateStr = new Date(msg.created_at).toLocaleString('ja-JP');
        doc.text(`${dateStr} - ${msg.sender_name}:`, 20, y);
        y += lineHeight;

        const contentLines = doc.splitTextToSize(msg.content, 165);
        contentLines.slice(0, 3).forEach(line => {
          if (y > pageHeight - 10) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 25, y);
          y += lineHeight - 1;
        });
        y += 5;
      });
    }

    // ファイル一覧
    if (data.files && data.files.length > 0) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text('【添付ファイル】', 20, y);
      y += 10;

      doc.setFontSize(9);
      data.files.forEach(file => {
        if (y > pageHeight - 10) {
          doc.addPage();
          y = 20;
        }
        const sizeKB = Math.round(file.file_size / 1024);
        doc.text(`• ${file.filename} (${sizeKB} KB)`, 20, y);
        y += lineHeight;
      });
    }

    // フッター
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString('ja-JP')} - Page ${i}/${pageCount}`, 105, 290, { align: 'center' });
    }

    // PDF保存
    const filename = `案件レポート_${data.deal.title.replace(/[^\w\s]/gi, '')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    // alert removed per user requirement - see console
    console.error('PDFレポートを生成しました');

  } catch (error) {
    console.error('PDF generation error:', error);
    // alert removed per user requirement - see console
    console.error('PDF生成に失敗しました: ' + (error.response?.data?.error || error.message));
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
});

// ステータスラベル取得（PDF用）
function getStatusLabel(status) {
  const labels = {
    'NEW': '新規',
    'IN_REVIEW': '調査中',
    'REPLIED': '一次回答済',
    'CLOSED': 'クロージング'
  };
  return labels[status] || status;
}

// 初期化 - ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, checking authentication...');
  console.log('Stored token:', state.token ? 'exists' : 'none');
  
  if (state.token) {
    console.log('Token found, attempting to load dashboard...');
    updateHeaderVisibility(true);
    showDashboard();
  } else {
    console.log('No token found, showing login page');
    updateHeaderVisibility(false);
  }
});
