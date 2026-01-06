/**
 * Button Listeners Setup - Separate file to avoid scope issues
 * v3.161.5 - CRITICAL FIX: Handle missing buttons gracefully (don't show alert if some buttons exist)
 * v3.161.4 - CRITICAL FIX: Use DOMContentLoaded to ensure DOM is ready
 * PREVIOUS: v3.153.77 - Move setupButtonListeners to separate file
 */

console.log('[ButtonListeners] ========================================');
console.log('[ButtonListeners] VERSION: v3.161.5 (2026-01-06)');
console.log('[ButtonListeners] CRITICAL FIX: Graceful handling of missing buttons');
console.log('[ButtonListeners] Loading setupButtonListeners function');
console.log('[ButtonListeners] ========================================');

/**
 * ボタンイベントリスナー設定
 * CRITICAL FIX v3.161.5: Graceful handling of missing buttons
 */
window.setupButtonListeners = function(retryCount = 0) {
  console.log('[ButtonListeners v3.161.5] setupButtonListeners called, attempt:', retryCount);
  console.log('[ButtonListeners v3.161.5] document.readyState:', document.readyState);
  console.log('[ButtonListeners v3.161.5] DOM fully loaded:', document.readyState === 'complete');
  
  const autoFillBtn = document.getElementById('auto-fill-btn');
  const riskCheckBtn = document.getElementById('comprehensive-check-btn');
  
  console.log('[ButtonListeners v3.161.5] auto-fill-btn found:', !!autoFillBtn);
  console.log('[ButtonListeners v3.161.5] risk-check-btn found:', !!riskCheckBtn);
  
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
  const MAX_RETRIES = 10; // Increased from 5 to 10
  if (needsRetry && retryCount < MAX_RETRIES) {
    console.log('[ButtonListeners v3.161.5] Retrying button setup in 500ms... (attempt ' + (retryCount + 1) + '/' + MAX_RETRIES + ')');
    setTimeout(function() {
      window.setupButtonListeners(retryCount + 1);
    }, 500); // Increased from 300ms to 500ms
  } else if (needsRetry) {
    console.error('[ButtonListeners v3.161.5] ❌ WARNING: Some buttons not found after ' + MAX_RETRIES + ' retries');
    console.error('[ButtonListeners v3.161.5] document.readyState:', document.readyState);
    console.error('[ButtonListeners v3.161.5] All button IDs in document:', 
      Array.from(document.querySelectorAll('button[id]')).map(b => b.id).join(', '));
    // v3.161.5: Don't show alert if at least one button was found
    const autoFillBtn = document.getElementById('auto-fill-btn');
    const riskCheckBtn = document.getElementById('comprehensive-check-btn');
    if (!autoFillBtn && !riskCheckBtn) {
      // Only show error if NO buttons were found
      alert('ボタンの初期化に失敗しました。ページを再読み込みしてください。');
    } else {
      console.warn('[ButtonListeners v3.161.5] ⚠️ Some buttons missing but continuing (auto-fill: ' + !!autoFillBtn + ', risk-check: ' + !!riskCheckBtn + ')');
    }
  } else {
    console.log('[ButtonListeners v3.161.5] ✅ All button listeners successfully attached');
  }
};

console.log('[ButtonListeners v3.161.5] ✅ window.setupButtonListeners defined');
console.log('[ButtonListeners v3.161.5] typeof window.setupButtonListeners:', typeof window.setupButtonListeners);

// CRITICAL FIX v3.161.4: Wait for DOMContentLoaded before calling setupButtonListeners
if (document.readyState === 'loading') {
  console.log('[ButtonListeners v3.161.5] DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[ButtonListeners v3.161.5] DOMContentLoaded fired, calling setupButtonListeners');
    window.setupButtonListeners();
  });
} else {
  console.log('[ButtonListeners v3.161.5] DOM already loaded (readyState: ' + document.readyState + '), calling setupButtonListeners immediately');
  // DOM already loaded, call immediately but with a small delay to ensure all scripts are processed
  setTimeout(function() {
    window.setupButtonListeners();
  }, 100);
}

console.log('[ButtonListeners v3.161.5] ========================================');
