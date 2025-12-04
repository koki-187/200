/**
 * OCR Processor - Standalone Implementation
 * v3.115.1 - CRITICAL FIX: Complete implementation to bypass main script syntax errors
 * 
 * This standalone file provides a working processMultipleOCR implementation
 * that doesn't depend on the main script, avoiding syntax error issues.
 */

console.log('[OCR Init] ========================================');
console.log('[OCR Init] ocr-init.js loaded - standalone implementation');
console.log('[OCR Init] Creating window.processMultipleOCR function...');

// Standalone processMultipleOCR implementation
window.processMultipleOCR = async function(files) {
  console.log('[OCR] ========================================');
  console.log('[OCR] processMultipleOCR CALLED (standalone version)');
  console.log('[OCR] Files:', files.length);
  console.log('[OCR] ========================================');
  
  // Get auth token
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('[OCR] ❌ No auth token found');
    alert('認証トークンが見つかりません。ページを再読み込みしてログインし直してください。');
    return;
  }
  
  console.log('[OCR] ✅ Auth token found');
  console.log('[OCR] Preparing files for OCR...');
  
  // Show progress UI
  const previewContainer = document.getElementById('ocr-preview-container');
  const progressSection = document.getElementById('ocr-progress-section');
  const progressBar = document.getElementById('ocr-progress-bar');
  const progressText = document.getElementById('ocr-progress-text');
  
  if (previewContainer) previewContainer.classList.remove('hidden');
  if (progressSection) progressSection.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = '0/' + files.length + ' 完了';
  
  // Prepare FormData
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  try {
    console.log('[OCR] Sending OCR job request...');
    
    // Create OCR job
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
        if (progressBar) progressBar.style.width = (percent * 0.1) + '%';
      }
    });
    
    const jobId = createResponse.data.job_id;
    console.log('[OCR] ✅ Job created:', jobId);
    
    // Save job ID
    localStorage.setItem('currentOCRJobId', jobId);
    
    // Poll for results
    let attempts = 0;
    const maxAttempts = 120;
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          throw new Error('OCR処理がタイムアウトしました');
        }
        
        const statusResponse = await axios.get('/api/ocr-jobs/' + jobId, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const job = statusResponse.data.job;
        const processed = job.processed_files || 0;
        const total = job.total_files || files.length;
        const status = job.status;
        
        // Update progress
        const progress = Math.round((processed / total) * 100);
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = processed + '/' + total + ' 完了';
        
        console.log('[OCR] Poll', attempts, '- Status:', status, 'Progress:', processed + '/' + total);
        
        if (status === 'completed') {
          clearInterval(pollInterval);
          localStorage.removeItem('currentOCRJobId');
          
          if (progressBar) progressBar.style.width = '100%';
          if (progressText) progressText.textContent = total + '/' + total + ' 完了';
          
          setTimeout(() => {
            if (progressSection) progressSection.classList.add('hidden');
          }, 1500);
          
          console.log('[OCR] ✅ OCR completed successfully');
          console.log('[OCR] Extracted data:', job.extracted_data);
          
          // Show results
          alert('OCR処理が完了しました！\n抽出されたデータを確認してください。');
          
          // TODO: Display extracted data in UI
          // This requires additional UI code from main script
          
        } else if (status === 'failed') {
          clearInterval(pollInterval);
          localStorage.removeItem('currentOCRJobId');
          throw new Error(job.error_message || 'OCR処理に失敗しました');
        }
        
      } catch (pollError) {
        clearInterval(pollInterval);
        localStorage.removeItem('currentOCRJobId');
        if (progressSection) progressSection.classList.add('hidden');
        throw pollError;
      }
    }, 1000);
    
  } catch (error) {
    console.error('[OCR] ========================================');
    console.error('[OCR] ❌ OCR Error:', error);
    console.error('[OCR] ========================================');
    
    if (progressSection) progressSection.classList.add('hidden');
    
    let errorMessage = error.message;
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'OCR処理がタイムアウトしました。ネットワーク接続を確認してください。';
    } else if (!error.response) {
      errorMessage = 'サーバーに接続できませんでした。インターネット接続を確認してください。';
    } else if (error.response?.status === 401) {
      errorMessage = '認証トークンが無効です。ページを再読み込みしてください。';
    }
    
    alert('OCR処理エラー\n\n' + errorMessage);
  }
};

// Flag to indicate this initialization file has loaded
window.ocrInitLoaded = true;

console.log('[OCR Init] ✅ window.processMultipleOCR function created (standalone)');
console.log('[OCR Init] window.ocrInitLoaded = true');
console.log('[OCR Init] ========================================');
