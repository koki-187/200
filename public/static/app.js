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
    alert('ログインに失敗しました:\n\n' + errorMsg + '\n\n入力内容を確認してください。');
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
    
    loginPage.classList.add('hidden');
    dashboardPage.classList.add('hidden');
    dealDetailPage.classList.remove('hidden');
    notificationsPage.classList.add('hidden');
    settingsPage.classList.add('hidden');
    
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
    alert('すべての通知を既読にしました');
  } catch (error) {
    alert('既読処理に失敗しました');
  }
});

// 既読にする
async function markAsRead(notificationId) {
  try {
    await axios.put(`/notifications/${notificationId}/read`);
    loadNotifications();
  } catch (error) {
    alert('既読処理に失敗しました');
  }
}

// 通知削除
async function deleteNotification(notificationId) {
  if (!confirm('この通知を削除しますか?')) return;
  
  try {
    await axios.delete(`/notifications/${notificationId}`);
    loadNotifications();
  } catch (error) {
    alert('通知の削除に失敗しました');
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
    alert('設定の読み込みに失敗しました');
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
    alert('ビジネスデイ設定を保存しました');
  } catch (error) {
    alert('保存に失敗しました');
  }
});

// 休日追加
document.getElementById('btn-add-holiday')?.addEventListener('click', async () => {
  const date = document.getElementById('new-holiday-date').value;
  const description = document.getElementById('new-holiday-desc').value;
  
  if (!date) {
    alert('日付を選択してください');
    return;
  }
  
  try {
    await axios.post('/settings/holidays', { date, description });
    document.getElementById('new-holiday-date').value = '';
    document.getElementById('new-holiday-desc').value = '';
    loadSettings();
  } catch (error) {
    alert('休日の追加に失敗しました');
  }
});

// 休日削除
async function deleteHoliday(date) {
  if (!confirm(`${date}を休日から削除しますか?`)) return;
  
  try {
    await axios.delete(`/settings/holidays/${date}`);
    loadSettings();
  } catch (error) {
    alert('休日の削除に失敗しました');
  }
}

// ストレージ設定保存
document.getElementById('btn-save-storage')?.addEventListener('click', async () => {
  const limit = parseInt(document.getElementById('storage-limit').value);
  
  if (limit < 10 || limit > 500) {
    alert('ストレージ上限は10MB〜500MBの範囲で設定してください');
    return;
  }
  
  try {
    await axios.put('/settings', { storage_limit_mb: limit });
    alert('ストレージ設定を保存しました');
  } catch (error) {
    alert('保存に失敗しました');
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
    alert('すべての項目を入力してください');
    return;
  }
  
  try {
    await axios.post('/settings/users', { email, name, password, userRole });
    document.getElementById('new-user-email').value = '';
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-password').value = '';
    alert('ユーザーを追加しました');
    loadUsers();
  } catch (error) {
    alert('ユーザーの追加に失敗しました: ' + (error.response?.data?.error || error.message));
  }
});

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
