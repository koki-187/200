/**
 * OCR Processor - Complete Standalone Implementation
 * v3.116.0 - FINAL FIX: PDF Conversion + Full OCR Implementation
 * 
 * This standalone file provides a complete processMultipleOCR implementation
 * with PDF conversion support, bypassing main script syntax errors.
 */

console.log('[OCR Init] ========================================');
console.log('[OCR Init] ocr-init.js loaded - complete implementation with PDF support');
console.log('[OCR Init] Creating window.processMultipleOCR function...');

// PDF.js Configuration - Preload for iOS Safari
let pdfjsLibPreloaded = null;
(async () => {
  try {
    pdfjsLibPreloaded = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
    pdfjsLibPreloaded.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
    console.log('[OCR Init] ✅ PDF.js preloaded for iOS Safari');
  } catch (error) {
    console.warn('[OCR Init] ⚠️ PDF.js preload failed (will use dynamic import):', error);
  }
})();

// PDF Conversion Function
async function convertPdfToImages(pdfFile) {
  try {
    // iOS Safari対応: 事前読み込み済みのPDF.jsを優先的に使用
    let pdfjsLib = pdfjsLibPreloaded;
    
    if (!pdfjsLib) {
      console.log('[PDF Conversion] Preloaded PDF.js not available, importing dynamically...');
      // Fallback: Dynamically import PDF.js
      pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
    } else {
      console.log('[PDF Conversion] ✅ Using preloaded PDF.js (iOS optimized)');
    }
    
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

// Display OCR Error Function
function displayOCRError(title, message) {
  console.error('[OCR Error] ' + title + ':', message);
  alert('[OCR エラー] ' + title + '\n\n' + message);
  
  // Hide progress UI
  const progressSection = document.getElementById('ocr-progress-section');
  if (progressSection) progressSection.classList.add('hidden');
}

// Complete processMultipleOCR Implementation
window.processMultipleOCR = async function(files) {
  console.log('[OCR] ========================================');
  console.log('[OCR] processMultipleOCR CALLED (complete standalone version with PDF support)');
  console.log('[OCR] Arguments:', arguments);
  console.log('[OCR] Files parameter:', files);
  console.log('[OCR] Files type:', typeof files);
  console.log('[OCR] Files is Array:', Array.isArray(files));
  
  // Validate files parameter
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.warn('[OCR] ⚠️ Invalid or empty files parameter, ignoring call');
    console.warn('[OCR] This may be an unintended call from page initialization');
    return;
  }
  
  console.log('[OCR] Files count:', files.length);
  console.log('[OCR] User Agent:', navigator.userAgent);
  console.log('[OCR] iOS Detection:', /iPhone|iPad|iPod/.test(navigator.userAgent));
  console.log('[OCR] ========================================');
  
  // Get auth token (required)
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.error('[OCR] ❌ No auth token found');
    displayOCRError('認証エラー', '認証トークンが見つかりません。ページを再読み込みしてログインし直してください。');
    return;
  }
  
  console.log('[OCR] ✅ Auth token found');
  
  // Separate PDF and image files
  const pdfFiles = files.filter(f => f.type === 'application/pdf');
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  
  console.log('[OCR] Image files:', imageFiles.length);
  console.log('[OCR] PDF files:', pdfFiles.length);
  
  // Get UI elements
  const previewContainer = document.getElementById('ocr-preview-container');
  const progressSection = document.getElementById('ocr-progress-section');
  const progressBar = document.getElementById('ocr-progress-bar');
  const progressText = document.getElementById('ocr-progress-text');
  const fileStatusList = document.getElementById('ocr-file-status-list');
  
  // Show preview and progress UI
  if (previewContainer) previewContainer.classList.remove('hidden');
  if (progressSection) progressSection.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = '処理を準備しています...';
  
  // Convert PDFs to images
  let allFiles = [...imageFiles];
  
  if (pdfFiles.length > 0) {
    try {
      console.log('[PDF Conversion] ========================================');
      console.log('[PDF Conversion] Converting ' + pdfFiles.length + ' PDF files...');
      
      if (progressText) progressText.textContent = 'PDF変換中... 0/' + pdfFiles.length;
      if (progressBar) progressBar.style.width = '10%';
      
      for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        console.log('[PDF Conversion] Converting: ' + pdfFile.name);
        
        if (progressText) {
          progressText.textContent = 'PDF変換中... ' + (i + 1) + '/' + pdfFiles.length + ' (' + pdfFile.name + ')';
        }
        
        const convertedImages = await convertPdfToImages(pdfFile);
        allFiles.push(...convertedImages);
        console.log('[PDF Conversion] ' + pdfFile.name + ' から ' + convertedImages.length + ' 枚の画像を生成しました');
      }
      
      if (progressText) progressText.textContent = 'PDF変換完了。OCR処理を開始します...';
      if (progressBar) progressBar.style.width = '20%';
      
      console.log('[PDF Conversion] ✅ All PDFs converted successfully');
      console.log('[PDF Conversion] Total files to process:', allFiles.length);
      console.log('[PDF Conversion] ========================================');
      
    } catch (error) {
      console.error('[PDF Conversion] ========================================');
      console.error('[PDF Conversion] PDF変換エラー:', error);
      console.error('[PDF Conversion] ========================================');
      displayOCRError('PDF変換エラー', error.message);
      return;
    }
  }
  
  console.log('[OCR] Processing ' + allFiles.length + ' total files (after PDF conversion)');
  
  // Display file preview
  const multiPreview = document.getElementById('multi-file-preview');
  if (multiPreview) {
    multiPreview.innerHTML = '';
    multiPreview.className = 'grid grid-cols-2 gap-4 mb-4';
    
    allFiles.forEach(file => {
      const fileCard = document.createElement('div');
      fileCard.className = 'flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200';
      
      const icon = document.createElement('i');
      icon.className = 'fas fa-file-image text-4xl text-blue-500 mb-2';
      
      const fileName = document.createElement('p');
      fileName.className = 'text-sm font-medium text-gray-700 truncate w-full text-center';
      fileName.textContent = file.name;
      
      const fileSize = document.createElement('p');
      fileSize.className = 'text-xs text-gray-500';
      fileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
      
      fileCard.appendChild(icon);
      fileCard.appendChild(fileName);
      fileCard.appendChild(fileSize);
      multiPreview.appendChild(fileCard);
    });
  }
  
  // Initialize progress bar
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = '0/' + allFiles.length + ' 完了';
  
  // Create file status list
  if (fileStatusList) {
    fileStatusList.innerHTML = '';
    allFiles.forEach((file, index) => {
      const statusItem = document.createElement('div');
      statusItem.className = 'flex items-center justify-between text-sm p-2 bg-white rounded border border-gray-200';
      statusItem.innerHTML = 
        '<div class="flex items-center flex-1">' +
        '<i class="fas fa-clock text-gray-400 mr-2"></i>' +
        '<span class="text-gray-700 truncate">' + file.name + '</span>' +
        '</div>' +
        '<span class="text-gray-500 text-xs">待機中</span>';
      fileStatusList.appendChild(statusItem);
    });
  }
  
  // Prepare FormData
  const formData = new FormData();
  allFiles.forEach(file => formData.append('files', file));
  
  try {
    console.log('[OCR] ========================================');
    console.log('[OCR] Creating OCR job...');
    console.log('[OCR] Total files:', allFiles.length);
    console.log('[OCR] ========================================');
    
    // Create OCR job with 30 second timeout (iOS Safari support)
    const createResponse = await axios.post('/api/ocr-jobs', formData, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000,
      onUploadProgress: (event) => {
        const percent = Math.round((event.loaded * 100) / event.total);
        console.log('[OCR] Upload progress:', percent + '%');
        if (progressText) progressText.textContent = 'アップロード中... ' + percent + '%';
        if (progressBar) progressBar.style.width = (20 + percent * 0.3) + '%'; // 20% - 50%
      }
    });
    
    const jobId = createResponse.data.job_id;
    console.log('[OCR] ✅ Job created:', jobId);
    
    // Save job ID for persistence
    localStorage.setItem('currentOCRJobId', jobId);
    
    if (progressText) progressText.textContent = 'OCR処理中...';
    if (progressBar) progressBar.style.width = '50%';
    
    // Poll for job status
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max
    const startTime = Date.now();
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          throw new Error('OCR処理がタイムアウトしました（2分）');
        }
        
        // Get job status
        const statusResponse = await axios.get('/api/ocr-jobs/' + jobId, {
          headers: { 'Authorization': 'Bearer ' + token },
          timeout: 10000
        });
        
        const job = statusResponse.data.job;
        const processed = job.processed_files || 0;
        const total = job.total_files || allFiles.length;
        const status = job.status;
        
        // Calculate progress (50% - 100%)
        const progress = 50 + Math.round((processed / total) * 50);
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = processed + '/' + total + ' 完了';
        
        // Estimate time remaining
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const etaSeconds = processed > 0 ? 
          Math.floor((elapsedSeconds / processed) * (total - processed)) : 0;
        
        console.log('[OCR] Poll #' + attempts + ' - Status:', status, 'Progress:', processed + '/' + total, 'ETA:', etaSeconds + 's');
        
        // Update file status list
        if (fileStatusList && job.file_results) {
          const statusItems = fileStatusList.children;
          job.file_results.forEach((result, index) => {
            if (statusItems[index]) {
              const statusText = statusItems[index].querySelector('span:last-child');
              const icon = statusItems[index].querySelector('i');
              
              if (result.status === 'completed') {
                statusText.textContent = '完了';
                statusText.className = 'text-green-600 text-xs font-medium';
                icon.className = 'fas fa-check-circle text-green-500 mr-2';
              } else if (result.status === 'processing') {
                statusText.textContent = '処理中...';
                statusText.className = 'text-blue-600 text-xs';
                icon.className = 'fas fa-spinner fa-spin text-blue-500 mr-2';
              } else if (result.status === 'failed') {
                statusText.textContent = 'エラー';
                statusText.className = 'text-red-600 text-xs font-medium';
                icon.className = 'fas fa-times-circle text-red-500 mr-2';
              }
            }
          });
        }
        
        // Check completion
        if (status === 'completed') {
          clearInterval(pollInterval);
          localStorage.removeItem('currentOCRJobId');
          
          if (progressBar) progressBar.style.width = '100%';
          if (progressText) progressText.textContent = total + '/' + total + ' 完了';
          
          console.log('[OCR] ========================================');
          console.log('[OCR] ✅ OCR completed successfully');
          console.log('[OCR] Total files processed:', total);
          console.log('[OCR] Time taken:', Math.floor((Date.now() - startTime) / 1000) + 's');
          console.log('[OCR] Extracted data:', job.extracted_data);
          console.log('[OCR] ========================================');
          
          // Hide progress after delay
          setTimeout(() => {
            if (progressSection) progressSection.classList.add('hidden');
          }, 2000);
          
          // Show success message
          alert('✅ OCR処理が完了しました！\n\n処理ファイル数: ' + total + '\n処理時間: ' + Math.floor((Date.now() - startTime) / 1000) + '秒\n\n抽出されたデータを確認してください。');
          
          // TODO: Display extracted data in form fields
          // This would require accessing the deal form elements
          
        } else if (status === 'failed') {
          clearInterval(pollInterval);
          localStorage.removeItem('currentOCRJobId');
          
          const errorMessage = job.error_message || 'OCR処理に失敗しました';
          throw new Error(errorMessage);
        }
        
      } catch (pollError) {
        clearInterval(pollInterval);
        localStorage.removeItem('currentOCRJobId');
        throw pollError;
      }
    }, 1000); // Poll every second
    
  } catch (error) {
    console.error('[OCR] ========================================');
    console.error('[OCR] ❌ OCR Error:', error);
    console.error('[OCR] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    console.error('[OCR] ========================================');
    
    if (progressSection) progressSection.classList.add('hidden');
    
    // Determine error message
    let errorMessage = error.message;
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'OCR処理がタイムアウトしました。\n\nネットワーク接続を確認してください。';
    } else if (!error.response) {
      errorMessage = 'サーバーに接続できませんでした。\n\nインターネット接続を確認してください。';
    } else if (error.response?.status === 401) {
      errorMessage = '認証トークンが無効です。\n\nページを再読み込みしてログインし直してください。';
    } else if (error.response?.status === 400) {
      errorMessage = 'リクエストエラー: ' + (error.response?.data?.error || 'ファイル形式またはサイズを確認してください');
    } else if (error.response?.status >= 500) {
      errorMessage = 'サーバーエラーが発生しました。\n\n時間をおいて再度お試しください。';
    }
    
    // iOS specific error alert
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) {
      alert('❌ OCR処理エラー（iOS）\n\n' + errorMessage + '\n\niOSで問題が続く場合は、デスクトップ版をお試しください。');
    } else {
      alert('❌ OCR処理エラー\n\n' + errorMessage);
    }
  }
};

// Flag to indicate this file has loaded
window.ocrInitLoaded = true;

console.log('[OCR Init] ✅ window.processMultipleOCR function created (complete with PDF support)');
console.log('[OCR Init] ✅ PDF.js preload initiated for iOS Safari');
console.log('[OCR Init] window.ocrInitLoaded = true');
console.log('[OCR Init] ========================================');
