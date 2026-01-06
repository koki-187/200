/**
 * OCR Processor - Complete Standalone Implementation
 * v3.153.120 - FEATURE: Re-enabled automatic risk check after OCR
 * 
 * This standalone file provides a complete processMultipleOCR implementation
 * with PDF conversion support, bypassing main script syntax errors.
 * 
 * CHANGELOG v3.153.120:
 * - Re-enabled automatic risk check after OCR completion (user request)
 * - Added visual feedback for automatic risk check progress
 * - Display hazard information in dedicated UI section
 * - Silent error handling (console log only)
 */

console.log('[OCR Init] ========================================');
console.log('[OCR Init] VERSION: v3.153.120 (2025-12-18) - FEATURE: Automatic risk check re-enabled');
console.log('[OCR Init] ocr-init.js loaded - complete implementation with PDF support');
console.log('[OCR Init] Creating window.processMultipleOCR function...');

// PDF.js Configuration - Preload for iOS Safari
// CRITICAL FIX v3.153.15: Use window property to avoid duplicate declaration error
window.pdfjsLibPreloaded = window.pdfjsLibPreloaded || null;
if (!window.pdfjsLibPreloaded) {
  (async () => {
    try {
      window.pdfjsLibPreloaded = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
      window.pdfjsLibPreloaded.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
      console.log('[OCR Init] ✅ PDF.js preloaded for iOS Safari');
    } catch (error) {
      console.warn('[OCR Init] ⚠️ PDF.js preload failed (will use dynamic import):', error);
    }
  })();
}

// PDF Conversion Function
async function convertPdfToImages(pdfFile) {
  try {
    // iOS Safari対応: 事前読み込み済みのPDF.jsを優先的に使用
    let pdfjsLib = window.pdfjsLibPreloaded;
    
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
// CRITICAL FIX v3.153.92: Re-enable alert for user-facing errors
function displayOCRError(title, message) {
  console.error('[OCR Error] ' + title + ':', message);
  console.error('[OCR Error] Message:', message);
  
  // CRITICAL: Display alert to user
  alert('OCRエラー: ' + title + '\n\n' + message + '\n\n詳細はコンソールログを確認してください。');
  
  // Hide progress UI
  const progressSection = document.getElementById('ocr-progress-section');
  if (progressSection) progressSection.classList.add('hidden');
}

// CRITICAL FIX v3.153.112: OCR実行中フラグ（リコール防止）
// CRITICAL FIX v3.153.117: Force reset flag on script load to prevent stuck state
console.log('[OCR Init v3.153.117] Initializing OCR processing flag...');
console.log('[OCR Init v3.153.117] Previous flag value:', window._ocrProcessingInProgress);
window._ocrProcessingInProgress = false; // Always reset to FALSE on page load
window._ocrProcessingStartTime = null;
console.log('[OCR Init v3.153.117] ✅ Flag forcefully reset to FALSE');

// Complete processMultipleOCR Implementation
window.processMultipleOCR = async function(files) {
  // CRITICAL DEBUG v3.153.116: Enhanced flag status logging
  console.log('[OCR v3.153.116] 🚩 Processing flag status:', window._ocrProcessingInProgress);
  
  // リコール防止: 既に実行中の場合は処理をスキップ
  if (window._ocrProcessingInProgress) {
    console.error('[OCR v3.153.116] ❌❌❌ DUPLICATE CALL BLOCKED');
    console.error('[OCR v3.153.116] Flag is still TRUE - previous execution may not have completed');
    console.error('[OCR v3.153.116] This is the RECALL ISSUE user reported');
    console.error('[OCR v3.153.116] To fix: Force reset flag after 60 seconds timeout');
    
    // CRITICAL FIX v3.153.116: Force reset flag if stuck
    const flagAge = Date.now() - (window._ocrProcessingStartTime || 0);
    if (flagAge > 60000) {
      console.warn('[OCR v3.153.116] ⚠️ Flag stuck for ' + Math.round(flagAge/1000) + 's - FORCE RESET');
      window._ocrProcessingInProgress = false;
      window._ocrProcessingStartTime = null;
    } else {
      console.warn('[OCR v3.153.116] ⏳ Please wait... processing started ' + Math.round(flagAge/1000) + 's ago');
      return;
    }
  }
  
  window._ocrProcessingInProgress = true;
  window._ocrProcessingStartTime = Date.now();
  console.log('[OCR v3.153.116] ✅ Flag set to TRUE, processing started');
  
  console.log('[OCR] ========================================');
  console.log('[OCR] processMultipleOCR CALLED (complete standalone version with PDF support)');
  console.log('[OCR] Arguments:', arguments);
  console.log('[OCR] Files parameter:', files);
  console.log('[OCR] Files type:', typeof files);
  console.log('[OCR] Files is Array:', Array.isArray(files));
  
  // Validate files parameter
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.warn('[OCR v3.153.116] ⚠️ Invalid or empty files parameter, ignoring call');
    console.warn('[OCR v3.153.116] This may be an unintended call from page initialization');
    window._ocrProcessingInProgress = false;
    window._ocrProcessingStartTime = null;
    console.log('[OCR v3.153.116] ✅ Flag reset (invalid input)');
    return;
  }
  
  console.log('[OCR] Files count:', files.length);
  console.log('[OCR] User Agent:', navigator.userAgent);
  console.log('[OCR] iOS Detection:', /iPhone|iPad|iPod/.test(navigator.userAgent));
  console.log('[OCR] ========================================');
  
  // CRITICAL FIX v3.153.92: Get auth token - REQUIRED for OCR
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('[OCR] ❌ No auth token found - OCR requires login');
    alert('ログインが必要です。\n\nOCR機能を使用するには、先にログインしてください。\n\n「OK」をクリックするとログインページに移動します。');
    // Hide progress UI
    if (progressSection) progressSection.classList.add('hidden');
    // Redirect to login page
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
    return;
  }
  
  console.log('[OCR] ✅ Auth token found');
  
  // v3.153.96: 月間コスト情報を取得
  let monthlyUsage = null;
  try {
    const costResponse = await fetch('/api/ocr-jobs/monthly-cost', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (costResponse.ok) {
      monthlyUsage = await costResponse.json();
      console.log('[OCR] 💰 Monthly usage:', monthlyUsage);
    }
  } catch (error) {
    console.warn('[OCR] ⚠️ Could not fetch monthly usage (will continue):', error);
  }
  
  // v3.153.96: OCR実行前の確認ダイアログ
  const estimatedCostPerFile = 0.02; // 推定: $0.02/ファイル（実際はトークン数に依存）
  const totalEstimatedCost = files.length * estimatedCostPerFile;
  
  let confirmMessage = `【OCR実行確認】\n\n`;
  confirmMessage += `ファイル数: ${files.length}件\n`;
  confirmMessage += `推定コスト: $${totalEstimatedCost.toFixed(2)}\n\n`;
  
  if (monthlyUsage) {
    const remainingBudget = monthlyUsage.monthly_limit - monthlyUsage.monthly_used;
    confirmMessage += `今月の使用状況:\n`;
    confirmMessage += `- 使用済み: $${monthlyUsage.monthly_used.toFixed(2)} / $${monthlyUsage.monthly_limit.toFixed(2)}\n`;
    confirmMessage += `- 残高: $${remainingBudget.toFixed(2)}\n\n`;
    
    // 残高不足の警告
    if (remainingBudget < totalEstimatedCost) {
      confirmMessage += `⚠️ 警告: 残高が不足する可能性があります。\n\n`;
    }
  }
  
  confirmMessage += `実行しますか？`;
  
  if (!confirm(confirmMessage)) {
    console.log('[OCR] ❌ User canceled OCR execution');
    return;
  }
  
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
    const headers = {
      'Content-Type': 'multipart/form-data'
    };
    
    // Add Authorization header only if token exists
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    
    // 🔥 CRITICAL FIX: 同期処理に変更、タイムアウトを120秒に延長
    const createResponse = await axios.post('/api/ocr-jobs', formData, {
      headers: headers,
      timeout: 120000, // 120秒（OCR処理が同期的に実行されるため）
      onUploadProgress: (event) => {
        const percent = Math.round((event.loaded * 100) / event.total);
        console.log('[OCR] Upload progress:', percent + '%');
        if (progressText) progressText.textContent = 'アップロード中... ' + percent + '%';
        if (progressBar) progressBar.style.width = (20 + percent * 0.3) + '%'; // 20% - 50%
      }
    });
    
    console.log('[OCR] ========================================');
    console.log('[OCR] 📥 Response received from /api/ocr-jobs');
    console.log('[OCR] Response status:', createResponse.status);
    console.log('[OCR] Response data:', JSON.stringify(createResponse.data, null, 2));
    console.log('[OCR] ========================================');
    
    // 🔥 NEW: 同期処理なので結果が直接返される
    const responseData = createResponse.data;
    
    if (!responseData || !responseData.success) {
      throw new Error('サーバーからエラーが返されました: ' + (responseData?.error || 'Unknown error'));
    }
    
    // 進捗を100%に
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = responseData.total_files + '/' + responseData.total_files + ' 完了';
    
    console.log('[OCR] ========================================');
    console.log('[OCR] ✅ OCR completed successfully (synchronous)');
    console.log('[OCR] Total files processed:', responseData.total_files);
    console.log('[OCR] Extracted data:', responseData.extracted_data);
    console.log('[OCR] ========================================');
    
    // 🔥 NEW: ポーリング不要、直接フォーム自動入力へ
    const extracted = responseData.extracted_data;
    
    // Hide progress after delay
    setTimeout(() => {
      if (progressSection) progressSection.classList.add('hidden');
    }, 2000);
    
    // Auto-fill form with extracted data
    if (extracted) {
      console.log('[OCR] ========================================');
      console.log('[OCR] Auto-filling form with extracted data...');
      console.log('[OCR] extracted_data type:', typeof extracted);
      console.log('[OCR] 🔥 FULL extracted_data:', JSON.stringify(extracted, null, 2));
      console.log('[OCR] extracted_data keys:', Object.keys(extracted));
      
      // 🔍 DEBUG: 各フィールドの詳細な値をログ出力
      console.log('[OCR] 🔍 DETAILED FIELD VALUES:');
      console.log('[OCR]   property_name:', JSON.stringify(extracted.property_name));
      console.log('[OCR]   location:', JSON.stringify(extracted.location));
      console.log('[OCR]   station:', JSON.stringify(extracted.station));
      console.log('[OCR]   land_area:', JSON.stringify(extracted.land_area));
      console.log('[OCR]   building_area:', JSON.stringify(extracted.building_area));
      console.log('[OCR]   building_coverage:', JSON.stringify(extracted.building_coverage));
      console.log('[OCR]   floor_area_ratio:', JSON.stringify(extracted.floor_area_ratio));
      console.log('[OCR] ========================================');
            
            // Map extracted data to form fields
            // NOTE: データ構造は { value: '...', confidence: 0.8 } 形式
            const getFieldValue = (fieldData) => {
              console.log('[OCR] 🔍 getFieldValue called with:', JSON.stringify(fieldData));
              
              if (!fieldData) {
                console.log('[OCR] ⚠️ getFieldValue: fieldData is null/undefined');
                return '';
              }
              
              // 新形式: { value, confidence }
              if (typeof fieldData === 'object' && 'value' in fieldData) {
                const value = fieldData.value;
                console.log('[OCR] 🔍 fieldData.value:', value, '(type:', typeof value, ')');
                if (value === null || value === undefined) {
                  console.log('[OCR] ⚠️ getFieldValue: extracted value is null/undefined');
                  return '';
                }
                console.log('[OCR] ✅ getFieldValue: extracted value from object:', value);
                return String(value);
              }
              
              // 旧形式または文字列（直接値）
              if (typeof fieldData === 'string' || typeof fieldData === 'number') {
                console.log('[OCR] ℹ️ getFieldValue: using direct value:', fieldData);
                return String(fieldData);
              }
              
              // その他のオブジェクトまたは未知の形式
              console.warn('[OCR] ⚠️ getFieldValue: unexpected data format:', typeof fieldData, JSON.stringify(fieldData));
              return '';
            };
            
            if (extracted.property_name) {
              const titleField = document.getElementById('title');
              if (titleField) {
                console.log('[OCR] 📝 Processing property_name:', extracted.property_name);
                const value = getFieldValue(extracted.property_name);
                titleField.value = value;
                console.log('[OCR] Set title:', value, '(length:', value.length, ')');
              } else {
                console.log('[OCR] ❌ title field not found in DOM');
              }
            } else {
              console.log('[OCR] ⚠️ property_name is empty/null');
            }
            if (extracted.location) {
              const locationField = document.getElementById('location');
              if (locationField) {
                const value = getFieldValue(extracted.location);
                locationField.value = value;
                console.log('[OCR] Set location:', value);
              }
            }
            if (extracted.station) {
              const stationField = document.getElementById('station');
              if (stationField) {
                const value = getFieldValue(extracted.station);
                stationField.value = value;
                console.log('[OCR] Set station:', value);
              }
            }
            if (extracted.walk_minutes) {
              const walkField = document.getElementById('walk_minutes');
              if (walkField) {
                walkField.value = getFieldValue(extracted.walk_minutes);
                console.log('[OCR] Set walk_minutes:', walkField.value);
              }
            }
            if (extracted.land_area) {
              const landAreaField = document.getElementById('land_area');
              if (landAreaField) {
                landAreaField.value = getFieldValue(extracted.land_area);
                console.log('[OCR] Set land_area:', landAreaField.value);
              }
            }
            if (extracted.building_area) {
              const buildingAreaField = document.getElementById('building_area');
              if (buildingAreaField) {
                buildingAreaField.value = getFieldValue(extracted.building_area);
                console.log('[OCR] Set building_area:', buildingAreaField.value);
              }
            }
            if (extracted.zoning) {
              const zoningField = document.getElementById('zoning');
              if (zoningField) {
                zoningField.value = getFieldValue(extracted.zoning);
                console.log('[OCR] Set zoning:', zoningField.value);
              }
            }
            if (extracted.building_coverage) {
              const coverageField = document.getElementById('building_coverage');
              if (coverageField) {
                coverageField.value = getFieldValue(extracted.building_coverage);
                console.log('[OCR] Set building_coverage:', coverageField.value);
              }
            }
            if (extracted.floor_area_ratio) {
              const farField = document.getElementById('floor_area_ratio');
              if (farField) {
                farField.value = getFieldValue(extracted.floor_area_ratio);
                console.log('[OCR] Set floor_area_ratio:', farField.value);
              }
            }
            if (extracted.road_info) {
              const roadField = document.getElementById('road_info');
              if (roadField) {
                roadField.value = getFieldValue(extracted.road_info);
                console.log('[OCR] Set road_info:', roadField.value);
              }
            }
            if (extracted.height_district) {
              const heightDistrictField = document.getElementById('height_district');
              if (heightDistrictField) {
                heightDistrictField.value = getFieldValue(extracted.height_district);
                console.log('[OCR] Set height_district:', heightDistrictField.value);
              }
            }
            if (extracted.fire_zone) {
              const fireZoneField = document.getElementById('fire_zone');
              if (fireZoneField) {
                fireZoneField.value = getFieldValue(extracted.fire_zone);
                console.log('[OCR] Set fire_zone:', fireZoneField.value);
              }
            }
            if (extracted.frontage) {
              const frontageField = document.getElementById('frontage');
              if (frontageField) {
                frontageField.value = getFieldValue(extracted.frontage);
                console.log('[OCR] Set frontage:', frontageField.value);
              }
            }
            if (extracted.structure) {
              const structureField = document.getElementById('structure');
              if (structureField) {
                structureField.value = getFieldValue(extracted.structure);
                console.log('[OCR] Set structure:', structureField.value);
              }
            }
            if (extracted.built_year) {
              const builtYearField = document.getElementById('built_year');
              if (builtYearField) {
                builtYearField.value = getFieldValue(extracted.built_year);
                console.log('[OCR] Set built_year:', builtYearField.value);
              }
            }
            if (extracted.current_status) {
              const statusField = document.getElementById('current_status');
              if (statusField) {
                statusField.value = getFieldValue(extracted.current_status);
                console.log('[OCR] Set current_status:', statusField.value);
              }
            }
            if (extracted.yield) {
              const yieldField = document.getElementById('yield_rate');
              if (yieldField) {
                yieldField.value = getFieldValue(extracted.yield);
                console.log('[OCR] Set yield_rate:', yieldField.value);
              }
            }
            if (extracted.occupancy) {
              const occupancyField = document.getElementById('occupancy_status');
              if (occupancyField) {
                occupancyField.value = getFieldValue(extracted.occupancy);
                console.log('[OCR] Set occupancy_status:', occupancyField.value);
              }
            }
            if (extracted.price) {
              const priceField = document.getElementById('desired_price');
              if (priceField) {
                priceField.value = getFieldValue(extracted.price);
                console.log('[OCR] Set desired_price:', priceField.value);
              }
            }
      
      console.log('[OCR] ✅ Form auto-filled successfully');
      
      // v3.153.5: 住所が抽出された場合、自動的に物件情報とリスクチェックを実行
      console.log('[OCR] ========================================');
      console.log('[OCR] v3.153.5: Starting automatic property info and risk check...');
      
      // 住所のバリデーション（厳格化）
      const location = extracted.location;
      const locationValue = location && location.value ? location.value.trim() : '';
      
      console.log('[OCR] Extracted location:', locationValue);
      console.log('[OCR] Location confidence:', location ? location.confidence : 0);
      
      // 住所の妥当性チェック（都道府県名を含むか確認）
      const prefectures = ['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島', 
                          '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
                          '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知', '三重',
                          '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
                          '鳥取', '島根', '岡山', '広島', '山口',
                          '徳島', '香川', '愛媛', '高知',
                          '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'];
      
      const hasPrefecture = prefectures.some(pref => 
        locationValue.includes(pref + '都') || 
        locationValue.includes(pref + '府') || 
        locationValue.includes(pref + '県') ||
        locationValue === '北海道' ||
        locationValue.includes('北海道')
      );
      
      const hasCity = locationValue.includes('市') || locationValue.includes('区') || 
                     locationValue.includes('町') || locationValue.includes('村');
      
      const isValidAddress = locationValue && 
                           locationValue.length >= 8 && 
                           hasPrefecture && 
                           hasCity;
      
      console.log('[OCR] Address validation:', {
        length: locationValue.length,
        hasPrefecture,
        hasCity,
        isValid: isValidAddress
      });
      
      // 🔥 NEW v3.153.120: リスクチェック自動実行機能を再実装
      // ユーザー要望により、OCR完了後に自動的にハザード情報を取得
      if (isValidAddress) {
        console.log('[OCR] ✅ Valid location extracted:', locationValue);
        console.log('[OCR v3.153.120] 🚀 Starting automatic risk check...');
        
        // Display loading banner
        const riskCheckSection = document.querySelector('[data-section="risk-check-results"]') || 
                                document.getElementById('risk-check-section');
        if (riskCheckSection) {
          riskCheckSection.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div class="flex items-center gap-3">
                <i class="fas fa-spinner fa-spin text-blue-600 text-xl"></i>
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-800">
                    🔍 ハザード情報を自動取得中...
                  </p>
                  <p class="text-xs text-blue-600 mt-1">
                    住所: ${locationValue}
                  </p>
                </div>
              </div>
            </div>
          `;
          riskCheckSection.classList.remove('hidden');
        }
        
        // Call automatic risk check function
        setTimeout(() => {
          autoRunRiskCheck(locationValue);
        }, 1000); // 1秒遅延で実行（フォーム入力完了を待つ）
      } else {
        console.warn('[OCR] ⚠️ No valid location extracted');
        console.warn('[OCR] ℹ️ User can enter location manually and use buttons');
      }
      
      console.log('[OCR] ========================================');
    } else {
      console.warn('[OCR] ⚠️ No extracted data found');
    }
    
    // Success message - logged to console only
    console.log('[OCR] ✅ OCR processing completed');
    console.log('[OCR] Total files processed:', responseData.total_files);
    console.log('[OCR] Data extracted and filled into form');
    console.log('[OCR] User should verify content before saving');
    // alert removed per user requirement - success messages logged to console only
    
    // CRITICAL FIX v3.153.116: Reset flag and timestamp on success
    window._ocrProcessingInProgress = false;
    window._ocrProcessingStartTime = null;
    console.log('[OCR v3.153.116] ✅ Flag reset to FALSE, ready for next execution');
    
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
      errorMessage = 'ログインが必要です。\n\nこの機能を使用するには、先にログインしてください。\n\n「OK」をクリックするとログインページに移動します。';
    } else if (error.response?.status === 400) {
      errorMessage = 'リクエストエラー: ' + (error.response?.data?.error || 'ファイル形式またはサイズを確認してください');
    } else if (error.response?.status >= 500) {
      errorMessage = 'サーバーエラーが発生しました。\n\n時間をおいて再度お試しください。';
    }
    
    // CRITICAL FIX v3.153.81: Always show error messages to user
    console.error('[OCR] ❌ OCR processing error:', errorMessage);
    alert(errorMessage);
    
    // CRITICAL FIX v3.153.116: Reset flag and timestamp on error
    window._ocrProcessingInProgress = false;
    window._ocrProcessingStartTime = null;
    console.log('[OCR v3.153.116] ✅ Flag reset to FALSE after error, ready for retry');
    
    // Redirect to login for 401 errors
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
  }
};

/**
 * 包括的リスクチェック実行関数
 */
async function runComprehensiveRiskCheck(address) {
  console.log('[COMPREHENSIVE CHECK] ========================================');
  console.log('[COMPREHENSIVE CHECK] Starting check for address:', address);
  console.log('[COMPREHENSIVE CHECK] Address type:', typeof address);
  console.log('[COMPREHENSIVE CHECK] Address length:', address ? address.length : 0);
  
  // 住所のバリデーション
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    console.error('[COMPREHENSIVE CHECK] ❌ Invalid address - empty or not a string');
    console.error('[COMPREHENSIVE CHECK] User needs to input valid address');
    // alert removed per user requirement - errors logged to console only
    return;
  }
  
  const trimmedAddress = address.trim();
  console.log('[COMPREHENSIVE CHECK] Trimmed address:', trimmedAddress);
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[COMPREHENSIVE CHECK] No auth token');
      console.error('[COMPREHENSIVE CHECK] User should reload page and re-login');
      // alert removed per user requirement - errors logged to console only
      return;
    }
    
    console.log('[COMPREHENSIVE CHECK] Token found, calling API...');
    
    // API呼び出し
    console.log('[COMPREHENSIVE CHECK] API URL: /api/reinfolib/comprehensive-check');
    console.log('[COMPREHENSIVE CHECK] API params:', { address: trimmedAddress });
    
    const response = await axios.get('/api/reinfolib/comprehensive-check', {
      params: { address: trimmedAddress },
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 30000
    });
    
    console.log('[COMPREHENSIVE CHECK] Response:', response.data);
    
    if (!response.data.success) {
      console.error('[COMPREHENSIVE CHECK] Check failed:', response.data.error);
      console.error('[COMPREHENSIVE CHECK] User should verify address');
      // alert removed per user requirement - errors logged to console only
      return;
    }
    
    // 結果表示（簡易版：アラートで表示）
    const result = response.data;
    const judgment = result.financingJudgment;
    const propertyInfo = result.propertyInfo;
    
    let message = `📊 包括的リスクチェック結果 (${result.version || 'v3.152'})\n\n`;
    message += `住所: ${result.address}\n`;
    message += `都道府県: ${propertyInfo.prefecture || 'N/A'}\n`;
    message += `市区町村: ${propertyInfo.city || 'N/A'}\n\n`;
    message += `【総合判定】\n`;
    message += `${judgment.message}\n\n`;
    
    if (result.processingTime) {
      message += `処理時間: ${result.processingTime}`;
    }
    
    console.log('[COMPREHENSIVE CHECK] ✅ Result message:');
    console.log(message);
    console.log('[COMPREHENSIVE CHECK] ✅ Check completed');
    
  } catch (error) {
    console.error('[COMPREHENSIVE CHECK] ❌ Error:', error);
    console.error('[COMPREHENSIVE CHECK] Error message:', error.message);
    console.error('[COMPREHENSIVE CHECK] Error response:', error.response?.data);
    console.error('[COMPREHENSIVE CHECK] Error status:', error.response?.status);
    
    // ユーザーへのエラー表示
    let errorMessage = 'リスクチェック中にエラーが発生しました。';
    if (error.response?.data?.error) {
      errorMessage += '\n\n' + error.response.data.error;
    } else if (error.message) {
      errorMessage += '\n\n' + error.message;
    }
    console.error('[COMPREHENSIVE CHECK] Error to display:', errorMessage);
    // alert removed per user requirement - errors logged to console only
  }
  
  console.log('[COMPREHENSIVE CHECK] ========================================');
}

/**
 * 物件情報自動取得（OCR完了後の自動実行用）
 * エラーが発生してもサイレントに処理
 */
async function autoFetchPropertyInfo(address) {
  console.log('[Auto Property Info] ========================================');
  console.log('[Auto Property Info] Starting automatic property info fetch...');
  console.log('[Auto Property Info] Address:', address);
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Auto Property Info] ⚠️ No auth token, skipping');
      return;
    }
    
    const year = new Date().getFullYear();
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
    
    console.log('[Auto Property Info] Calling API with:', { address, year, quarter });
    
    const response = await axios.get('/api/reinfolib/property-info', {
      params: { address, year, quarter },
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 15000
    });
    
    console.log('[Auto Property Info] API response received');
    
    if (!response.data.success) {
      console.warn('[Auto Property Info] ⚠️ API returned error:', response.data.message);
      return;
    }
    
    const properties = response.data.data;
    if (!properties || properties.length === 0) {
      console.warn('[Auto Property Info] ⚠️ No property data found');
      return;
    }
    
    const property = properties[0];
    console.log('[Auto Property Info] Property data:', property);
    
    // フォームフィールドに自動入力
    const fields = [
      { id: 'land_area', value: property.land_area },
      { id: 'zoning', value: property.use || property.city_planning },
      { id: 'building_coverage', value: property.building_coverage_ratio },
      { id: 'floor_area_ratio', value: property.floor_area_ratio },
      { id: 'frontage', value: property.frontage },
      { id: 'building_area', value: property.building_area },
      { id: 'structure', value: property.building_structure },
      { id: 'built_year', value: property.building_year }
    ];
    
    let filledCount = 0;
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input && field.value && !input.value.trim()) {
        input.value = field.value;
        filledCount++;
        console.log('[Auto Property Info] ✅ Filled:', field.id, '=', field.value);
      }
    });
    
    console.log('[Auto Property Info] ✅ Completed: ' + filledCount + ' fields filled');
    
  } catch (error) {
    console.error('[Auto Property Info] ❌ Error:', error.message);
    // エラーはサイレントに処理（ユーザーに通知しない）
  }
  
  console.log('[Auto Property Info] ========================================');
}

/**
 * リスクチェック自動実行（OCR完了後の自動実行用）
 * エラーが発生してもサイレントに処理
 */
async function autoRunRiskCheck(address) {
  console.log('[Auto Risk Check] ========================================');
  console.log('[Auto Risk Check] Starting automatic risk check...');
  console.log('[Auto Risk Check] Address:', address);
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Auto Risk Check] ⚠️ No auth token, skipping');
      return;
    }
    
    console.log('[Auto Risk Check] Calling API...');
    
    const response = await axios.get('/api/reinfolib/comprehensive-check', {
      params: { address: address },
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 30000
    });
    
    console.log('[Auto Risk Check] API response received');
    
    if (!response.data.success) {
      console.warn('[Auto Risk Check] ⚠️ API returned error:', response.data.error);
      return;
    }
    
    const result = response.data;
    console.log('[Auto Risk Check] ✅ Risk check completed');
    console.log('[Auto Risk Check] Prefecture:', result.propertyInfo?.prefecture);
    console.log('[Auto Risk Check] City:', result.propertyInfo?.city);
    console.log('[Auto Risk Check] Judgment:', result.financingJudgment?.message);
    
    // 結果は Console ログのみ（ユーザーにアラート表示しない）
    
  } catch (error) {
    console.error('[Auto Risk Check] ❌ Error:', error.message);
    // エラーはサイレントに処理（ユーザーに通知しない）
  }
  
  console.log('[Auto Risk Check] ========================================');
}

// Export to global scope
window.runComprehensiveRiskCheck = runComprehensiveRiskCheck;
window.autoFetchPropertyInfo = autoFetchPropertyInfo;
window.autoRunRiskCheck = autoRunRiskCheck;

// Flag to indicate this file has loaded
window.ocrInitLoaded = true;

console.log('[OCR Init] ========================================');
console.log('[OCR Init] 🆕 VERSION: v3.153.106 (2025-12-16) - CRITICAL FIX: Event listeners registration added');
console.log('[OCR Init] ✅ window.processMultipleOCR function created (complete with PDF support)');
console.log('[OCR Init] ✅ window.runComprehensiveRiskCheck function created');
console.log('[OCR Init] ✅ PDF.js preload initiated for iOS Safari');
console.log('[OCR Init] ⚠️ v3.153.83: AUTO-EXECUTION DISABLED - User must manually click buttons for property info and risk check');
console.log('[OCR Init] window.ocrInitLoaded = true');
console.log('[OCR Init] ========================================');

// CRITICAL FIX v3.153.106: DOM Event Listener Registration
// This ensures OCR button/drop-zone work correctly
function initializeOCREventListeners() {
  console.log('[OCR Init v3.161.3] Initializing event listeners...');
  
  // v3.161.3: Guard against duplicate initialization
  if (window._ocrEventListenersInitialized) {
    console.warn('[OCR Init v3.161.3] ⚠️ Event listeners already initialized, skipping...');
    return;
  }
  
  // Get DOM elements
  const dropZone = document.getElementById('ocr-drop-zone');
  const fileInput = document.getElementById('ocr-file-input');
  
  console.log('[OCR Init v3.161.3] dropZone element:', dropZone);
  console.log('[OCR Init v3.161.3] fileInput element:', fileInput);
  
  if (!dropZone || !fileInput) {
    console.error('[OCR Init v3.161.3] ❌ CRITICAL: DOM elements not found!');
    console.error('[OCR Init v3.161.3] dropZone:', dropZone);
    console.error('[OCR Init v3.161.3] fileInput:', fileInput);
    return;
  }
  
  // v3.161.3: Mark as initialized
  window._ocrEventListenersInitialized = true;
  console.log('[OCR Init v3.161.3] ✅ Event listeners initialization guard set');
  
  // Click event for drop zone
  // CRITICAL FIX v3.153.107: Remove preventDefault to allow fileInput.click()
  dropZone.addEventListener('click', (e) => {
    console.log('[OCR Init] 🖱️ Drop zone clicked');
    // e.preventDefault() removed - it blocks fileInput.click()
    e.stopPropagation();
    console.log('[OCR Init] Triggering file input click...');
    
    // Try multiple methods to trigger file dialog
    try {
      // Method 1: Direct click (most browsers)
      fileInput.click();
      console.log('[OCR Init] ✅ File input clicked (method 1)');
    } catch (err) {
      console.error('[OCR Init] ❌ Method 1 failed:', err);
      
      // Method 2: Create new click event
      try {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        fileInput.dispatchEvent(clickEvent);
        console.log('[OCR Init] ✅ File input clicked (method 2)');
      } catch (err2) {
        console.error('[OCR Init] ❌ Method 2 failed:', err2);
      }
    }
  });
  
  // Touch event for iOS Safari
  dropZone.addEventListener('touchend', (e) => {
    console.log('[OCR Init] 📱 Drop zone touched (iOS)');
    // e.preventDefault() removed for iOS compatibility
    e.stopPropagation();
    console.log('[OCR Init] Triggering file input click (iOS)...');
    
    // iOS Safari requires direct click in same event context
    try {
      fileInput.click();
      console.log('[OCR Init] ✅ File input clicked (iOS)');
    } catch (err) {
      console.error('[OCR Init] ❌ iOS click failed:', err);
    }
  });
  
  // Drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('ocr-drop-zone-active');
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('ocr-drop-zone-active');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('ocr-drop-zone-active');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      console.log('[OCR Init] 📁 Files dropped:', files.length);
      window.processMultipleOCR(files);
    }
  });
  
  // File input change event
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    console.log('[OCR Init] 📂 Files selected:', files.length);
    
    if (files.length > 0) {
      window.processMultipleOCR(files);
    }
    
    // Reset file input
    fileInput.value = '';
  });
  
  console.log('[OCR Init] ✅ Event listeners registered successfully');
}

/**
 * v3.153.120: 自動リスクチェック実行関数
 * OCR完了後に自動的にハザード情報を取得
 */
async function autoRunRiskCheck(address) {
  console.log('[Auto Risk Check v3.153.120] ========================================');
  console.log('[Auto Risk Check] Starting automatic risk check...');
  console.log('[Auto Risk Check] Address:', address);
  
  try {
    // Get token
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Auto Risk Check] ⚠️ No token found, skipping');
      
      // Update UI to show login required
      const riskCheckSection = document.querySelector('[data-section="risk-check-results"]') || 
                              document.getElementById('risk-check-section');
      if (riskCheckSection) {
        riskCheckSection.innerHTML = `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-yellow-800">
                  ℹ️ ハザード情報の取得にはログインが必要です
                </p>
                <p class="text-xs text-yellow-600 mt-1">
                  ログイン後に「リスクチェック」ボタンをクリックしてください
                </p>
              </div>
            </div>
          </div>
        `;
      }
      return;
    }
    
    console.log('[Auto Risk Check] Token found, calling API...');
    
    // Call comprehensive risk check API
    const response = await axios.get('/api/reinfolib/comprehensive-check', {
      params: { address: address },
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 30000
    });
    
    console.log('[Auto Risk Check] API response received');
    console.log('[Auto Risk Check] Response data:', response.data);
    
    if (!response.data.success) {
      console.warn('[Auto Risk Check] ⚠️ API returned error:', response.data.error);
      
      // Update UI to show error
      const riskCheckSection = document.querySelector('[data-section="risk-check-results"]') || 
                              document.getElementById('risk-check-section');
      if (riskCheckSection) {
        riskCheckSection.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-exclamation-circle text-red-600 text-xl"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-800">
                  ❌ ハザード情報の取得に失敗しました
                </p>
                <p class="text-xs text-red-600 mt-1">
                  ${response.data.error || '不明なエラー'}
                </p>
                <p class="text-xs text-red-600 mt-1">
                  手動で「リスクチェック」ボタンをクリックしてください
                </p>
              </div>
            </div>
          </div>
        `;
      }
      return;
    }
    
    const result = response.data;
    console.log('[Auto Risk Check] ✅ Risk check completed successfully');
    console.log('[Auto Risk Check] Prefecture:', result.propertyInfo?.prefecture);
    console.log('[Auto Risk Check] City:', result.propertyInfo?.city);
    console.log('[Auto Risk Check] Judgment:', result.financingJudgment?.judgment);
    
    // Display results in UI
    const riskCheckSection = document.querySelector('[data-section="risk-check-results"]') || 
                            document.getElementById('risk-check-section');
    if (riskCheckSection) {
      const risks = result.risks || {};
      const riskDetails = result.riskDetails || {};
      const financingJudgment = result.financingJudgment || {};
      
      // Determine financing status icon and message
      let financingIcon = '✅';
      let financingMessage = '問題なし';
      let financingColor = 'green';
      
      if (financingJudgment.judgment === 'MANUAL_CHECK_REQUIRED') {
        financingIcon = '⚠️';
        financingMessage = '手動確認必要';
        financingColor = 'yellow';
      } else if (financingJudgment.judgment === 'RESTRICTED') {
        financingIcon = '❌';
        financingMessage = '融資制限あり';
        financingColor = 'red';
      }
      
      riskCheckSection.innerHTML = `
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
          <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-shield-alt text-blue-600"></i>
            ハザード情報（自動取得）
          </h3>
          
          <!-- Location Info -->
          <div class="mb-4 pb-3 border-b border-gray-200">
            <p class="text-sm text-gray-600">
              <i class="fas fa-map-marker-alt mr-2"></i>
              <strong>所在地:</strong> ${result.propertyInfo?.prefecture || '-'}${result.propertyInfo?.city || '-'}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              座標: ${result.propertyInfo?.latitude || '-'}, ${result.propertyInfo?.longitude || '-'}
            </p>
          </div>
          
          <!-- Financing Judgment -->
          <div class="mb-4 p-3 bg-${financingColor}-50 border border-${financingColor}-200 rounded-lg">
            <p class="text-sm font-medium text-${financingColor}-800">
              ${financingIcon} <strong>融資判定:</strong> ${financingMessage}
            </p>
            ${financingJudgment.message ? `
              <p class="text-xs text-${financingColor}-600 mt-1">
                ${financingJudgment.message}
              </p>
            ` : ''}
          </div>
          
          <!-- Risk Details -->
          <div class="space-y-2 mb-4">
            <div class="text-sm">
              <strong class="text-gray-700">🌊 洪水リスク:</strong>
              <span class="text-gray-600">${riskDetails.sedimentDisaster || '情報なし'}</span>
            </div>
            <div class="text-sm">
              <strong class="text-gray-700">🏔️ 土砂災害リスク:</strong>
              <span class="text-gray-600">${riskDetails.flood || '情報なし'}</span>
            </div>
            <div class="text-sm">
              <strong class="text-gray-700">🌊 津波リスク:</strong>
              <span class="text-gray-600">${riskDetails.tsunami || '情報なし'}</span>
            </div>
            <div class="text-sm">
              <strong class="text-gray-700">🌀 高潮リスク:</strong>
              <span class="text-gray-600">${riskDetails.stormSurge || '情報なし'}</span>
            </div>
          </div>
          
          <!-- Hazard Map Link -->
          ${result.hazardMapUrl ? `
            <div class="mt-4 pt-3 border-t border-gray-200">
              <a href="${result.hazardMapUrl}" target="_blank" rel="noopener" 
                 class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                <i class="fas fa-external-link-alt"></i>
                国土交通省ハザードマップで詳細確認
              </a>
            </div>
          ` : ''}
          
          <p class="text-xs text-gray-500 mt-3">
            <i class="fas fa-info-circle mr-1"></i>
            OCR完了後に自動取得されました
          </p>
        </div>
      `;
      riskCheckSection.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('[Auto Risk Check] ❌ Error:', error);
    console.error('[Auto Risk Check] Error message:', error.message);
    console.error('[Auto Risk Check] Error response:', error.response?.data);
    
    // Update UI to show error
    const riskCheckSection = document.querySelector('[data-section="risk-check-results"]') || 
                            document.getElementById('risk-check-section');
    if (riskCheckSection) {
      riskCheckSection.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center gap-3">
            <i class="fas fa-exclamation-circle text-red-600 text-xl"></i>
            <div class="flex-1">
              <p class="text-sm font-medium text-red-800">
                ❌ ハザード情報の取得に失敗しました
              </p>
              <p class="text-xs text-red-600 mt-1">
                ${error.message || '不明なエラー'}
              </p>
              <p class="text-xs text-red-600 mt-1">
                手動で「リスクチェック」ボタンをクリックしてください
              </p>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  console.log('[Auto Risk Check] ========================================');
}

// Export to global scope
window.autoRunRiskCheck = autoRunRiskCheck;
console.log('[OCR Init v3.153.120] ✅ autoRunRiskCheck function created');

// Wait for DOM to be ready
// CRITICAL FIX v3.161.3: Add initialization guard to prevent multiple event listener registration
if (!window._ocrInitLoaded) {
  window._ocrInitLoaded = true;
  console.log('[OCR Init v3.161.3] ✅ Initialization guard set - preventing duplicate initialization');
  
  if (document.readyState === 'loading') {
    console.log('[OCR Init] Waiting for DOM content loaded...');
    document.addEventListener('DOMContentLoaded', initializeOCREventListeners);
  } else {
    console.log('[OCR Init] DOM already loaded, initializing immediately...');
    // DOM is already loaded
    setTimeout(initializeOCREventListeners, 100);
  }
} else {
  console.warn('[OCR Init v3.161.3] ⚠️ OCR already initialized - skipping to prevent duplicate event listeners');
}
