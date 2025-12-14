// ============================================================
// Page Initialization Script
// VERSION: v3.153.80 (2025-12-14)
// CRITICAL FIX: Separated from main inline script to ensure execution
// ============================================================

console.log('[Page Init] ========================================');
console.log('[Page Init] VERSION: v3.153.80 (2025-12-14)');
console.log('[Page Init] Script loaded - Initializing /deals/new page');
console.log('[Page Init] Document ready state:', document.readyState);
console.log('[Page Init] Current URL:', window.location.href);
console.log('[Page Init] ========================================');

// ストレージ使用量を取得して表示
async function loadStorageQuota() {
  console.log('[Storage Quota] ========== START ==========');
  
  // Get token from localStorage (same as main page)
  const token = localStorage.getItem('token');
  console.log('[Storage Quota] Token:', token ? 'exists (' + token.substring(0, 20) + '...)' : 'NULL/UNDEFINED');
  console.log('[Storage Quota] Current URL:', window.location.href);
  
  try {
    console.log('[Storage Quota] Calling API: /api/storage-quota');
    // CRITICAL FIX v3.153.77: Add 10-second timeout to prevent eternal "取得中..."
    const response = await axios.get('/api/storage-quota', {
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 10000 // 10 seconds
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
      storageText.textContent = usage.used_mb + 'MB / ' + usage.limit_mb + 'MB (' + usagePercent + '%使用中)';
      
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
      
      // 使用率警告表示
      if (warningAlert && warningMessage) {
        if (usage.usage_percent >= 95) {
          warningMessage.textContent = 'ストレージ使用率が95%を超えています。空き容量を確保してください。';
          warningAlert.classList.remove('hidden');
        } else if (usage.usage_percent >= 80) {
          warningMessage.textContent = 'ストレージ使用率が80%を超えています。ファイルの整理をご検討ください。';
          warningAlert.classList.remove('hidden');
        } else {
          warningAlert.classList.add('hidden');
        }
      }
      
      console.log('[Storage Quota] ✅ Storage quota loaded successfully:', usage.used_mb + 'MB / ' + usage.limit_mb + 'MB');
    } else {
      console.error('[Storage Quota] ❌ CRITICAL: DOM elements not found after successful API call!');
      console.error('[Storage Quota] storageText:', storageText ? 'found' : 'NOT FOUND');
      console.error('[Storage Quota] storageDisplay:', storageDisplay ? 'found' : 'NOT FOUND');
    }
  } catch (error) {
    console.error('[Storage Quota] ❌ Error occurred:');
    console.error('[Storage Quota] Error object:', error);
    console.error('[Storage Quota] Error type:', error.constructor.name);
    console.error('[Storage Quota] Error response:', error.response);
    console.error('[Storage Quota] Error message:', error.message);
    
    const storageText = document.getElementById('storage-usage-text');
    const storageDisplay = document.getElementById('storage-quota-display');
    
    // 認証エラーの場合は特別なハンドリング
    if (error.response && error.response.status === 401) {
      console.error('[Storage Quota] 401 Unauthorized - Authentication error');
      console.warn('[Storage Quota] ⚠️ OCR functions remain fully usable despite auth error');
      if (storageText) {
        storageText.textContent = '認証エラー（再ログインが必要です）';
        storageText.className = 'text-xs text-red-500 font-medium';
      }
      // 認証エラーの場合、ユーザーに通知
      if (typeof showMessage === 'function') {
        showMessage('ストレージ情報の取得に失敗しました。ログインをご確認ください。', 'error');
      }
      // トークンをクリアしてログインページにリダイレクト
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
      
      // エラー時も3秒後にストレージ表示を非表示にする
      setTimeout(() => {
        if (storageDisplay) {
          storageDisplay.style.display = 'none';
        }
      }, 3000);
      
      return;
    }
    
    // タイムアウトエラー
    if (error.code === 'ECONNABORTED') {
      console.warn('[Storage Quota] Timeout - OCR functions remain fully usable');
      if (storageText) {
        storageText.textContent = 'タイムアウト';
        storageText.className = 'text-xs text-yellow-500 font-medium';
      }
    } 
    // ネットワークエラー
    else if (error.message === 'Network Error') {
      console.warn('[Storage Quota] Network error - OCR functions remain fully usable');
      if (storageText) {
        storageText.textContent = 'ネットワークエラー';
        storageText.className = 'text-xs text-yellow-500 font-medium';
      }
    } 
    // その他のエラー
    else {
      console.warn('[Storage Quota] API failure - OCR functions remain fully usable');
      const status = error.response ? error.response.status : 'unknown';
      if (storageText) {
        storageText.textContent = '取得失敗 (' + status + ')';
        storageText.className = 'text-xs text-yellow-500 font-medium';
      }
    }
    
    // エラー時も3秒後にストレージ表示を非表示にする
    setTimeout(() => {
      if (storageDisplay) {
        storageDisplay.style.display = 'none';
      }
    }, 3000);
    
    if (!storageText) {
      console.error('[Storage Quota] ❌ CRITICAL: storageText element not found in error handler!');
    }
  }
  
  console.log('[Storage Quota] ========== END ==========');
}

// Export loadStorageQuota to global scope
window.loadStorageQuota = loadStorageQuota;
console.log('[Page Init] ✅ window.loadStorageQuota defined:', typeof window.loadStorageQuota);

// Initialize page when DOM is ready
function initializePage() {
  console.log('[Page Init] ========== INITIALIZE PAGE (deals/new) ==========');
  console.log('[Page Init] Document ready state:', document.readyState);
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  console.log('[Page Init] Token exists:', !!token);
  console.log('[Page Init] User:', user);
  console.log('[Page Init] Current URL:', window.location.href);
  console.log('[Page Init] Axios loaded:', typeof axios !== 'undefined');
  
  // ストレージ使用量表示の初期化
  const storageText = document.getElementById('storage-usage-text');
  console.log('[Page Init] storageText element:', storageText ? 'found' : 'NOT found');
  console.log('[Page Init] token:', token ? 'exists (' + token.substring(0, 20) + '...)' : 'NULL');
  
  // CRITICAL FIX v3.153.80: Force storage info to complete or hide within 3 seconds
  if (storageText) {
    console.log('[Page Init] Calling loadStorageQuota() with 3-second safety timeout');
    
    // Set a safety timeout to hide storage info if it takes too long
    const storageDisplay = document.getElementById('storage-quota-display');
    const safetyTimeout = setTimeout(() => {
      console.warn('[Page Init] ⚠️ Storage quota load exceeded 3 seconds - hiding display');
      if (storageDisplay) {
        storageDisplay.style.display = 'none';
      }
    }, 3000);
    
    // Call loadStorageQuota and clear timeout if it completes
    loadStorageQuota().then(() => {
      clearTimeout(safetyTimeout);
      console.log('[Page Init] ✅ loadStorageQuota completed successfully');
    }).catch((err) => {
      clearTimeout(safetyTimeout);
      console.error('[Page Init] ❌ loadStorageQuota failed:', err);
      if (storageDisplay) {
        storageDisplay.style.display = 'none';
      }
    });
  } else {
    console.warn('[Page Init] storageText NOT found, will retry in 500ms');
    // DOM要素がまだ存在しない場合は再試行
    setTimeout(() => {
      const storageTextRetry = document.getElementById('storage-usage-text');
      const storageDisplay = document.getElementById('storage-quota-display');
      console.log('[Page Init] Retry: storageText element:', storageTextRetry ? 'found' : 'STILL NOT found');
      if (storageTextRetry) {
        console.log('[Page Init] Calling loadStorageQuota() after retry with 3-second safety timeout');
        
        const safetyTimeout = setTimeout(() => {
          console.warn('[Page Init] ⚠️ Storage quota load (retry) exceeded 3 seconds - hiding display');
          if (storageDisplay) {
            storageDisplay.style.display = 'none';
          }
        }, 3000);
        
        loadStorageQuota().then(() => {
          clearTimeout(safetyTimeout);
          console.log('[Page Init] ✅ loadStorageQuota (retry) completed successfully');
        }).catch((err) => {
          clearTimeout(safetyTimeout);
          console.error('[Page Init] ❌ loadStorageQuota (retry) failed:', err);
          if (storageDisplay) {
            storageDisplay.style.display = 'none';
          }
        });
      } else {
        console.error('[Page Init] CRITICAL: storageText element never found - hiding storage display');
        if (storageDisplay) {
          storageDisplay.style.display = 'none';
        }
      }
    }, 500);
  }
  
  console.log('[Page Init] ========== INITIALIZATION COMPLETE ==========');
}

// DOMContentLoaded後に初期化を実行（フェイルセーフ付き）
console.log('[Page Init] Setting up initialization...');
console.log('[Page Init] Document ready state:', document.readyState);

let initializePageCalled = false;

function safeInitializePage() {
  if (initializePageCalled) {
    console.log('[Page Init] initializePage already called, skipping...');
    return;
  }
  initializePageCalled = true;
  console.log('[Page Init] Calling initializePage NOW');
  initializePage();
}

if (document.readyState === 'loading') {
  console.log('[Page Init] Waiting for DOMContentLoaded event...');
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Page Init] DOMContentLoaded event fired');
    safeInitializePage();
  });
  
  // フェイルセーフ: 3秒後にまだ初期化されていなければ強制実行
  setTimeout(function() {
    if (!initializePageCalled) {
      console.warn('[Page Init] ⚠️ FAILSAFE: initializePage was not called after 3s, forcing execution');
      safeInitializePage();
    }
  }, 3000);
} else {
  console.log('[Page Init] Document already ready, calling initializePage immediately');
  safeInitializePage();
}

// CRITICAL FIX v3.153.17: Also listen to window.load event as additional failsafe
window.addEventListener('load', function() {
  console.log('[Page Init] window.load event fired');
  if (!initializePageCalled) {
    console.warn('[Page Init] ⚠️ window.load FAILSAFE: initializePage was not called yet, executing now');
    safeInitializePage();
  } else {
    console.log('[Page Init] initializePage already called, skipping window.load execution');
  }
});

console.log('[Page Init] ========================================');
console.log('[Page Init] Initialization script setup complete');
console.log('[Page Init] ========================================');
