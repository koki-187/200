/**
 * Button Listeners Setup - Separate file to avoid scope issues
 * v3.153.77 - CRITICAL FIX: Move setupButtonListeners to separate file
 */

console.log('[ButtonListeners] ========================================');
console.log('[ButtonListeners] VERSION: v3.153.77 (2025-12-14)');
console.log('[ButtonListeners] Loading setupButtonListeners function');
console.log('[ButtonListeners] ========================================');

/**
 * ボタンイベントリスナー設定
 * CRITICAL FIX v3.153.77: Moved to separate file for global scope access
 */
window.setupButtonListeners = function(retryCount = 0) {
  console.log('[ButtonListeners] setupButtonListeners called, attempt:', retryCount);
  
  const autoFillBtn = document.getElementById('auto-fill-btn');
  const riskCheckBtn = document.getElementById('comprehensive-check-btn');
  
  let needsRetry = false;
  
  // Auto-fill button setup
  if (autoFillBtn && !autoFillBtn.dataset.listenerAttached) {
    console.log('[ButtonListeners] Setting up auto-fill button event listener');
    autoFillBtn.addEventListener('click', function() {
      console.log('[ButtonListeners] Auto-fill button clicked');
      if (typeof window.autoFillFromReinfolib === 'function') {
        window.autoFillFromReinfolib();
      } else {
        console.error('[ButtonListeners] autoFillFromReinfolib function not found');
        alert('物件情報補足機能の初期化に失敗しました。ページを再読み込みしてください。');
      }
    });
    autoFillBtn.dataset.listenerAttached = 'true';
    console.log('[ButtonListeners] ✅ Auto-fill button listener attached');
  } else if (!autoFillBtn) {
    console.warn('[ButtonListeners] auto-fill-btn not found (attempt ' + retryCount + ')');
    needsRetry = true;
  }
  
  // Risk check button setup
  if (riskCheckBtn && !riskCheckBtn.dataset.listenerAttached) {
    console.log('[ButtonListeners] Setting up risk check button event listener');
    riskCheckBtn.addEventListener('click', function() {
      console.log('[ButtonListeners] Risk check button clicked');
      if (typeof window.manualComprehensiveRiskCheck === 'function') {
        window.manualComprehensiveRiskCheck();
      } else {
        console.error('[ButtonListeners] manualComprehensiveRiskCheck function not found');
        alert('リスクチェック機能の初期化に失敗しました。ページを再読み込みしてください。');
      }
    });
    riskCheckBtn.dataset.listenerAttached = 'true';
    console.log('[ButtonListeners] ✅ Risk check button listener attached');
  } else if (!riskCheckBtn) {
    console.warn('[ButtonListeners] comprehensive-check-btn not found (attempt ' + retryCount + ')');
    needsRetry = true;
  }
  
  // Retry if buttons not found and we haven't exceeded max retries
  if (needsRetry && retryCount < 5) {
    console.log('[ButtonListeners] Retrying button setup in 300ms...');
    setTimeout(function() {
      window.setupButtonListeners(retryCount + 1);
    }, 300);
  } else if (needsRetry) {
    console.error('[ButtonListeners] ❌ CRITICAL: Failed to find buttons after 5 retries');
    alert('ボタンの初期化に失敗しました。ページを再読み込みしてください。');
  } else {
    console.log('[ButtonListeners] ✅ All button listeners successfully attached');
  }
};

console.log('[ButtonListeners] ✅ window.setupButtonListeners defined');
console.log('[ButtonListeners] typeof window.setupButtonListeners:', typeof window.setupButtonListeners);
console.log('[ButtonListeners] ========================================');
