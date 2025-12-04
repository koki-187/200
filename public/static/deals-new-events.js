/**
 * 案件作成ページのイベント委譲ハンドラー
 * Cloudflare Pages/Workers環境でも確実に動作するイベント委譲パターン
 */

// イベント委譲の初期化関数
function initializeEventDelegation() {
  console.log('[Event Delegation] Initializing event delegation');
  
  // ボディ全体にイベント委譲を設定
  document.body.addEventListener('click', function(event) {
    const target = event.target;
    
    // テンプレート選択ボタン
    const templateSelectBtn = target.closest('#template-select-btn');
    if (templateSelectBtn) {
      console.log('[Event Delegation] Template select button clicked');
      event.preventDefault();
      event.stopPropagation();
      if (typeof openTemplateModal === 'function') {
        openTemplateModal();
      } else {
        console.error('[Event Delegation] openTemplateModal function not found');
      }
      return;
    }
    
    // テンプレートクリアボタン
    const clearTemplateBtn = target.closest('#clear-template-btn');
    if (clearTemplateBtn) {
      console.log('[Event Delegation] Clear template button clicked');
      event.preventDefault();
      event.stopPropagation();
      if (typeof window.selectedTemplate !== 'undefined') {
        window.selectedTemplate = null;
        const infoEl = document.getElementById('selected-template-info');
        if (infoEl) infoEl.classList.add('hidden');
        if (typeof window.showMessage === 'function') {
          window.showMessage('テンプレート選択を解除しました', 'info');
        }
      }
      return;
    }
    
    // OCR履歴ボタン
    const historyBtn = target.closest('#ocr-history-btn');
    if (historyBtn) {
      console.log('[Event Delegation] OCR history button clicked');
      event.preventDefault();
      event.stopPropagation();
      const modal = document.getElementById('ocr-history-modal');
      if (modal) {
        modal.classList.remove('hidden');
        if (typeof loadOCRHistory === 'function') {
          loadOCRHistory();
        }
      }
      return;
    }
    
    // OCR設定ボタン
    const settingsBtn = target.closest('#ocr-settings-btn');
    if (settingsBtn) {
      console.log('[Event Delegation] OCR settings button clicked');
      event.preventDefault();
      event.stopPropagation();
      const modal = document.getElementById('ocr-settings-modal');
      if (modal) {
        modal.classList.remove('hidden');
        if (typeof loadSettings === 'function') {
          loadSettings();
        }
      }
      return;
    }
    
    // テンプレート選択モーダル内のテンプレートアイテム
    const templateItem = target.closest('.template-item');
    if (templateItem) {
      console.log('[Event Delegation] Template item clicked');
      const templateId = templateItem.dataset.templateId;
      if (templateId && typeof selectTemplate === 'function') {
        selectTemplate(templateId);
      }
      return;
    }
    
    // モーダルを閉じるボタン（汎用 - data-modal-close属性）
    const closeModalBtn = target.closest('[data-modal-close]');
    if (closeModalBtn) {
      console.log('[Event Delegation] Close modal button clicked (data-modal-close)');
      event.preventDefault();
      event.stopPropagation();
      const modalId = closeModalBtn.dataset.modalClose;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('hidden');
      }
      return;
    }
    
    // OCR履歴モーダルの個別閉じるボタン（フォールバック）
    const closeHistoryBtn = target.closest('#close-history-modal');
    if (closeHistoryBtn) {
      console.log('[Event Delegation] Close history modal button clicked');
      event.preventDefault();
      event.stopPropagation();
      const modal = document.getElementById('ocr-history-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
      return;
    }
    
    // OCR設定モーダルの個別閉じるボタン（フォールバック）
    const closeSettingsBtn = target.closest('#close-settings-modal');
    if (closeSettingsBtn) {
      console.log('[Event Delegation] Close settings modal button clicked');
      event.preventDefault();
      event.stopPropagation();
      const modal = document.getElementById('ocr-settings-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
      return;
    }
    
    // OCR設定モーダルのキャンセルボタン（フォールバック）
    const cancelSettingsBtn = target.closest('#cancel-settings-btn');
    if (cancelSettingsBtn) {
      console.log('[Event Delegation] Cancel settings button clicked');
      event.preventDefault();
      event.stopPropagation();
      const modal = document.getElementById('ocr-settings-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
      return;
    }
    
    // 履歴の日付クリアボタン
    const historyClearBtn = target.closest('#history-date-clear');
    if (historyClearBtn) {
      console.log('[Event Delegation] History date clear button clicked');
      event.preventDefault();
      event.stopPropagation();
      const dateFromInput = document.getElementById('history-date-from');
      const dateToInput = document.getElementById('history-date-to');
      if (dateFromInput) dateFromInput.value = '';
      if (dateToInput) dateToInput.value = '';
      // loadOCRHistory関数が存在すれば再読み込み
      if (typeof loadOCRHistory === 'function') {
        loadOCRHistory();
      }
      return;
    }
    
    // OCR履歴の信頼度フィルターボタン
    const historyFilterBtn = target.closest('[data-filter]');
    if (historyFilterBtn && historyFilterBtn.id && historyFilterBtn.id.startsWith('history-filter-')) {
      console.log('[Event Delegation] History filter button clicked:', historyFilterBtn.id);
      event.preventDefault();
      event.stopPropagation();
      
      const filter = historyFilterBtn.dataset.filter;
      console.log('[Event Delegation] Filter value:', filter);
      
      // 全てのフィルターボタンのスタイルをリセット
      const allFilterBtns = document.querySelectorAll('[data-filter]');
      allFilterBtns.forEach(btn => {
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
      });
      
      // クリックされたボタンをアクティブに
      historyFilterBtn.classList.remove('bg-gray-200', 'text-gray-700');
      historyFilterBtn.classList.add('bg-purple-600', 'text-white');
      
      // loadOCRHistory関数を信頼度フィルターで呼び出し
      if (typeof loadOCRHistory === 'function') {
        const filters = {};
        if (filter !== 'all') {
          filters.confidence = filter; // 'high', 'medium', 'low'
        }
        loadOCRHistory(filters);
      }
      return;
    }
  });
  
  // ドラッグ&ドロップイベント
  document.body.addEventListener('dragover', function(event) {
    const dropZone = event.target.closest('#ocr-drop-zone');
    if (dropZone) {
      console.log('[Event Delegation] Dragover on drop zone');
      event.preventDefault();
      dropZone.classList.add('dragover');
    }
  });
  
  document.body.addEventListener('dragleave', function(event) {
    const dropZone = event.target.closest('#ocr-drop-zone');
    if (dropZone && !dropZone.contains(event.relatedTarget)) {
      console.log('[Event Delegation] Dragleave from drop zone');
      dropZone.classList.remove('dragover');
    }
  });
  
  document.body.addEventListener('drop', function(event) {
    const dropZone = event.target.closest('#ocr-drop-zone');
    if (dropZone) {
      console.log('[Event Delegation] Drop on drop zone');
      event.preventDefault();
      dropZone.classList.remove('dragover');
      const files = Array.from(event.dataTransfer.files).filter(f => 
        f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      console.log('[Event Delegation] Files dropped:', files.length);
      if (files.length > 0 && typeof processMultipleOCR === 'function') {
        processMultipleOCR(files);
      }
    }
  });
  
  // CRITICAL FIX v3.112.0: document.bodyのchangeイベント委譲を削除
  // 理由: fileInput.addEventListener('change')と競合し、
  //      event.preventDefault()/stopPropagation()により個別ハンドラーが実行されない
  // 解決策: initializeDropZone()内の個別changeハンドラーのみを使用
  
  // フォーム送信イベント（OCR設定フォームの送信を制御）
  document.body.addEventListener('submit', function(event) {
    const ocrSettingsForm = event.target.closest('#ocr-settings-form');
    if (ocrSettingsForm) {
      console.log('[Event Delegation] OCR settings form submitted');
      event.preventDefault(); // ページ遷移を防ぐ
      event.stopPropagation();
      
      // 設定を保存する処理を実行
      if (typeof window.saveOCRSettings === 'function') {
        window.saveOCRSettings();
      } else {
        console.warn('[Event Delegation] saveOCRSettings function not found - closing modal');
        // 関数が見つからない場合はモーダルを閉じるだけ
        const modal = document.getElementById('ocr-settings-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
      return false; // フォーム送信を確実に防ぐ
    }
  });
  
  console.log('[Event Delegation] Event delegation setup complete');
}

// ドロップゾーンのクリックハンドラー初期化
// CRITICAL FIX v3.109.0: labelのネイティブ動作を完全に尊重するため、
// ドロップゾーン全体のクリックハンドラーを削除
// labelの<for>属性によるネイティブなファイル選択ダイアログに完全に依存
function initializeDropZone() {
  console.log('[Event Delegation] ========================================');
  console.log('[Event Delegation] Initializing drop zone (label native behavior mode)');
  
  const dropZone = document.getElementById('ocr-drop-zone');
  const fileInput = document.getElementById('ocr-file-input');
  
  console.log('[Event Delegation] dropZone element:', dropZone);
  console.log('[Event Delegation] fileInput element:', fileInput);
  
  if (dropZone && fileInput) {
    console.log('[Event Delegation] ========================================');
    console.log('[Event Delegation] ℹ️ Using <label for="ocr-file-input"> native behavior');
    console.log('[Event Delegation] ℹ️ No custom click handlers on drop zone');
    console.log('[Event Delegation] ℹ️ File dialog will open via browser native mechanism');
    console.log('[Event Delegation] ========================================');
    
    // CRITICAL: ファイル入力のchangeイベントハンドラーは必須
    fileInput.addEventListener('change', function(e) {
      console.log('[Event Delegation] ========================================');
      console.log('[Event Delegation] 🔔 File input CHANGE event triggered');
      console.log('[Event Delegation] Event object:', e);
      console.log('[Event Delegation] Event target:', e.target);
      console.log('[Event Delegation] Files object:', e.target.files);
      console.log('[Event Delegation] Files count:', e.target.files?.length || 0);
      console.log('[Event Delegation] ========================================');
      
      const allFiles = Array.from(e.target.files || []);
      console.log('[Event Delegation] All files (before filter):', allFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      const files = allFiles.filter(f => 
        f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      console.log('[Event Delegation] Valid files (after filter):', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      if (files.length > 0) {
        console.log('[Event Delegation] ✅ Valid files:', files.length);
        console.log('[Event Delegation] 🔍 Checking for processMultipleOCR function...');
        console.log('[Event Delegation] window.processMultipleOCR type:', typeof window.processMultipleOCR);
        console.log('[Event Delegation] window.processMultipleOCR value:', window.processMultipleOCR);
        
        // CRITICAL FIX: Check window.processMultipleOCR first (global scope)
        const processFunc = window.processMultipleOCR || (typeof processMultipleOCR === 'function' ? processMultipleOCR : null);
        
        if (processFunc) {
          console.log('[Event Delegation] ✅✅✅ processMultipleOCR found, calling with', files.length, 'files');
          console.log('[Event Delegation] 🚀 Starting OCR processing in 150ms...');
          setTimeout(() => {
            console.log('[Event Delegation] 🚀 NOW calling processMultipleOCR with files:', files.map(f => f.name));
            processFunc(files);
          }, 150); // iOS stability delay
        } else {
          console.error('[Event Delegation] ❌❌❌ processMultipleOCR function not found');
          console.error('[Event Delegation] window.processMultipleOCR:', typeof window.processMultipleOCR);
          console.error('[Event Delegation] local processMultipleOCR:', typeof processMultipleOCR);
          alert('OCR処理関数が見つかりません。ページを再読み込みしてください。');
        }
      } else {
        console.warn('[Event Delegation] ⚠️ No valid image/PDF files selected');
        console.warn('[Event Delegation] All files were:', allFiles.map(f => ({ name: f.name, type: f.type })));
        alert('画像ファイル（PNG, JPG, JPEG, WEBP）またはPDFファイルを選択してください。');
      }
      console.log('[Event Delegation] ========================================');
    });
    
    console.log('[Event Delegation] ✅ File input change handler attached');
  } else {
    console.error('[Event Delegation] ========================================');
    console.error('[Event Delegation] ❌ Drop zone or file input NOT FOUND');
    console.error('[Event Delegation] dropZone:', dropZone);
    console.error('[Event Delegation] fileInput:', fileInput);
    console.error('[Event Delegation] ========================================');
  }
}

// CRITICAL FIX v3.114.0: Retry logic to wait for window.processMultipleOCR
// Reason: Main script may have syntax errors or slow execution
// Solution: Poll for window.processMultipleOCR availability with retries

console.log('[Event Delegation] Script loaded, waiting for window.load event');

// Retry function to check if window.processMultipleOCR is available
function checkAndInitialize(attempt = 0) {
  const maxAttempts = 20; // 最大10秒待機（500ms * 20）
  
  console.log('[Event Delegation] ========================================');
  console.log('[Event Delegation] Attempt', attempt + 1, '/', maxAttempts);
  console.log('[Event Delegation] Checking window.processMultipleOCR availability...');
  console.log('[Event Delegation] window.processMultipleOCR type:', typeof window.processMultipleOCR);
  console.log('[Event Delegation] window.processMultipleOCR value:', window.processMultipleOCR);
  console.log('[Event Delegation] ========================================');
  
  if (typeof window.processMultipleOCR === 'function') {
    console.log('[Event Delegation] ✅✅✅ window.processMultipleOCR is available!');
    console.log('[Event Delegation] Starting initialization');
    initializeEventDelegation();
    initializeDropZone();
    console.log('[Event Delegation] Initialization complete');
    console.log('[Event Delegation] ========================================');
  } else if (attempt < maxAttempts) {
    console.log('[Event Delegation] ⏳ window.processMultipleOCR not yet available, retrying in 500ms...');
    setTimeout(() => checkAndInitialize(attempt + 1), 500);
  } else {
    console.error('[Event Delegation] ❌❌❌ FATAL: window.processMultipleOCR not available after', maxAttempts, 'attempts');
    console.error('[Event Delegation] Initializing anyway, but OCR will NOT work');
    initializeEventDelegation();
    initializeDropZone();
  }
}

// Start checking after window.load
window.addEventListener('load', function() {
  console.log('[Event Delegation] ========================================');
  console.log('[Event Delegation] window.load event fired');
  console.log('[Event Delegation] Starting retry logic for window.processMultipleOCR');
  console.log('[Event Delegation] ========================================');
  checkAndInitialize();
});
