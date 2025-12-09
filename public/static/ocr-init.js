/**
 * OCR Processor - Complete Standalone Implementation
 * v3.153.4 - CRITICAL FIX: Removed automatic risk check after OCR
 * 
 * This standalone file provides a complete processMultipleOCR implementation
 * with PDF conversion support, bypassing main script syntax errors.
 * 
 * CHANGELOG v3.153.4:
 * - Removed automatic runComprehensiveRiskCheck() call after OCR completion
 * - User must manually click "総合リスクチェック実施" button
 */

console.log('[OCR Init] ========================================');
console.log('[OCR Init] VERSION: v3.153.4 - No automatic risk check');
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
function displayOCRError(title, message) {
  console.error('[OCR Error] ' + title + ':', message);
  console.error('[OCR Error] Message:', message);
  // alert removed per user requirement - errors logged to console only
  
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
  
  // Get auth token (optional - server will validate)
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('[OCR] ⚠️ No auth token found in localStorage');
    console.log('[OCR] Attempting OCR without explicit token (server-side auth will be checked)');
  } else {
    console.log('[OCR] ✅ Auth token found');
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
      
      if (isValidAddress) {
        console.log('[OCR] ✅ Valid location found, starting automatic processes...');
        
        try {
          // Step 1: 物件情報自動取得
          console.log('[OCR] Step 1: Fetching property info from MLIT API...');
          await autoFetchPropertyInfo(locationValue);
          
          // Step 2: リスクチェック（物件情報取得後に実行）
          console.log('[OCR] Step 2: Running comprehensive risk check...');
          await autoRunRiskCheck(locationValue);
          
          console.log('[OCR] ✅ All automatic processes completed successfully');
        } catch (autoError) {
          console.error('[OCR] ⚠️ Automatic process error (non-critical):', autoError.message);
          // エラーが発生してもOCR処理は成功として扱う
        }
      } else {
        console.warn('[OCR] ⚠️ No valid location extracted, skipping automatic processes');
        console.warn('[OCR] User can manually use buttons if needed');
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
      console.error('[OCR] ❌ OCR processing error (iOS):', errorMessage);
      console.error('[OCR] If problem persists on iOS, try desktop version');
      // alert removed per user requirement - errors logged to console only
    } else {
      console.error('[OCR] ❌ OCR processing error:', errorMessage);
      // alert removed per user requirement - errors logged to console only
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
    const token = localStorage.getItem('auth_token');
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
    const token = localStorage.getItem('auth_token');
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
    const token = localStorage.getItem('auth_token');
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
console.log('[OCR Init] 🆕 VERSION: v3.153.4 (2025-12-08)');
console.log('[OCR Init] ✅ window.processMultipleOCR function created (complete with PDF support)');
console.log('[OCR Init] ✅ window.runComprehensiveRiskCheck function created');
console.log('[OCR Init] ✅ PDF.js preload initiated for iOS Safari');
console.log('[OCR Init] ⚠️ NO AUTOMATIC RISK CHECK - User must click button manually');
console.log('[OCR Init] window.ocrInitLoaded = true');
console.log('[OCR Init] ========================================');
