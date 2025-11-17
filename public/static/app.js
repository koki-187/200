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
    alert('ログインに失敗しました:\n\n' + errorMsg + '\n\n入力内容を確認してください。');
  }
});

// ログアウト
document.getElementById('btn-logout')?.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
  
  loginPage.classList.remove('hidden');
  dashboardPage.classList.add('hidden');
  dealDetailPage.classList.add('hidden');
});

// ダッシュボード表示
async function showDashboard() {
  loginPage.classList.add('hidden');
  dashboardPage.classList.remove('hidden');
  dealDetailPage.classList.add('hidden');
  
  await loadDeals();
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
  if (state.deals.length === 0) {
    dealsList.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-folder-open text-6xl mb-4"></i>
        <p>案件がまだありません</p>
        <button onclick="showNewDealForm()" class="btn-primary mt-4">
          <i class="fas fa-plus mr-2"></i>最初の案件を作成
        </button>
      </div>
    `;
    return;
  }
  
  dealsList.innerHTML = state.deals.map(deal => {
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
    
    dashboardPage.classList.add('hidden');
    dealDetailPage.classList.remove('hidden');
    
    document.getElementById('deal-title').textContent = state.currentDeal.title;
    renderDealDetail();
  } catch (error) {
    console.error('Failed to load deal detail:', error);
    alert('案件詳細の読み込みに失敗しました');
  }
}

// 案件詳細レンダリング
function renderDealDetail() {
  const deal = state.currentDeal;
  const statusBadge = getStatusBadge(deal.status);
  const deadlineStatus = getDeadlineStatus(deal.reply_deadline);
  const deadlineBadge = getDeadlineBadge(deadlineStatus);
  
  document.getElementById('deal-detail-content').innerHTML = `
    <div class="space-y-6">
      <!-- ヘッダー -->
      <div class="flex items-center justify-between pb-4 border-b">
        <div class="flex items-center space-x-3">
          ${statusBadge}
          ${deadlineBadge}
        </div>
        <div class="flex items-center space-x-3">
          ${state.user?.role === 'ADMIN' ? `
            <button onclick="generateProposal()" class="btn-primary">
              <i class="fas fa-magic mr-2"></i>AI提案生成
            </button>
          ` : ''}
        </div>
      </div>
      
      <!-- 基本情報 -->
      <div>
        <h3 class="text-lg font-bold text-navy mb-3">
          <i class="fas fa-info-circle text-gold mr-2"></i>基本情報
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">所在地</label>
            <p class="text-gray-900">${escapeHtml(deal.location || '未入力')}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">最寄駅</label>
            <p class="text-gray-900">${escapeHtml(deal.station || '未入力')} 徒歩${deal.walk_minutes || '?'}分</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">土地面積</label>
            <p class="text-gray-900">${escapeHtml(deal.land_area || '未入力')}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">用途地域</label>
            <p class="text-gray-900">${escapeHtml(deal.zoning || '未入力')}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">建蔽率 / 容積率</label>
            <p class="text-gray-900">${escapeHtml(deal.building_coverage || '?')}% / ${escapeHtml(deal.floor_area_ratio || '?')}%</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">接道状況</label>
            <p class="text-gray-900">${escapeHtml(deal.road_info || '未入力')}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">現況</label>
            <p class="text-gray-900">${escapeHtml(deal.current_status || '未入力')}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">希望価格</label>
            <p class="text-gray-900">${escapeHtml(deal.desired_price || '未入力')}</p>
          </div>
        </div>
      </div>
      
      <!-- チャット -->
      <div>
        <h3 class="text-lg font-bold text-navy mb-3">
          <i class="fas fa-comments text-gold mr-2"></i>チャット
        </h3>
        <div id="chat-messages" class="bg-gray-50 rounded p-4 mb-4 min-h-[200px]">
          <p class="text-center text-gray-500">メッセージを読み込み中...</p>
        </div>
        <div class="flex space-x-2">
          <input type="text" id="chat-input" class="input-field flex-1" placeholder="メッセージを入力...">
          <button onclick="sendMessage()" class="btn-primary">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  loadMessages(deal.id);
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
    alert('メッセージの送信に失敗しました');
  }
}

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

// 初期化 - ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, checking authentication...');
  console.log('Stored token:', state.token ? 'exists' : 'none');
  
  if (state.token) {
    console.log('Token found, attempting to load dashboard...');
    showDashboard();
  } else {
    console.log('No token found, showing login page');
  }
});
