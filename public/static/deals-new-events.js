/**
 * 案件作成ページのイベント委譲ハンドラー
 * Cloudflare Pages/Workers環境でも確実に動作するイベント委譲パターン
 */

// グローバルイベント委譲ハンドラー
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Event Delegation] DOMContentLoaded - Initializing event delegation');
  
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
        if (typeof showToast === 'function') {
          showToast('テンプレート選択を解除しました', 'info');
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
    
    // モーダルを閉じるボタン（汎用）
    const closeModalBtn = target.closest('[data-modal-close]');
    if (closeModalBtn) {
      console.log('[Event Delegation] Close modal button clicked');
      const modalId = closeModalBtn.dataset.modalClose;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('hidden');
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
  
  // ファイル入力の変更イベント
  document.body.addEventListener('change', function(event) {
    if (event.target.id === 'ocr-file-input') {
      console.log('[Event Delegation] File input changed');
      const files = Array.from(event.target.files);
      console.log('[Event Delegation] Files selected:', files.length);
      if (files.length > 0 && typeof processMultipleOCR === 'function') {
        processMultipleOCR(files);
      }
    }
  });
  
  console.log('[Event Delegation] Event delegation setup complete');
});

// ドロップゾーンのクリックでファイル選択ダイアログを開く
document.addEventListener('DOMContentLoaded', function() {
  const dropZone = document.getElementById('ocr-drop-zone');
  const fileInput = document.getElementById('ocr-file-input');
  
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', function(event) {
      // ボタン要素のクリックは無視（ボタンの動作を優先）
      if (!event.target.closest('button')) {
        console.log('[Event Delegation] Drop zone clicked - opening file dialog');
        fileInput.click();
      }
    });
  }
});
