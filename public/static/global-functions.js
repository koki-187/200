/**
 * Global Functions for Deals/New Page
 * v3.153.39 - CRITICAL FIX: Define functions BEFORE HTML to make inline onclick work
 * 
 * This file MUST be loaded BEFORE the HTML that contains onclick attributes
 */

console.log('[Global Functions] ========================================');
console.log('[Global Functions] VERSION: v3.153.121 (2025-12-18) - Hazard DB Auto Display');
console.log('[Global Functions] Pattern 1-5: API統一, エラー詳細化, フォールバック, ハザードリンク');
console.log('[Global Functions] Pattern 6-10: 住所正規化, 年四半期推定, リトライ最適化, ログ強化, UI改善');
console.log('[Global Functions] v3.153.121: 住所入力時ハザード情報自動表示（ローカルDB、API不要）');
console.log('[Global Functions] Defining window.autoFillFromReinfolib and window.autoDisplayHazardInfo');
console.log('[Global Functions] ========================================');

/**
 * v3.153.108: Pattern 6 - 住所の正規化と補完
 */
function normalizeAddress(address) {
  let normalized = address.trim();
  
  // 全角・半角の統一
  normalized = normalized.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  normalized = normalized.replace(/[ー−]/g, '-');
  
  // 略称の補完
  const abbreviations = {
    '横浜': '横浜市',
    'さいたま': 'さいたま市',
    '川崎': '川崎市',
    '千葉': '千葉市'
  };
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (normalized.includes(abbr) && !normalized.includes(full)) {
      normalized = normalized.replace(abbr, full);
    }
  }
  
  console.log('[Address Normalization] Original:', address, '→ Normalized:', normalized);
  return normalized;
}

/**
 * v3.153.108: Pattern 7 - 年・四半期の自動推定
 */
function estimateLatestQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  
  // データは通常1四半期遅れで公開されるため、前四半期を推定
  let estimatedQuarter = quarter - 1;
  let estimatedYear = year;
  
  if (estimatedQuarter < 1) {
    estimatedQuarter = 4;
    estimatedYear = year - 1;
  }
  
  console.log('[Quarter Estimation] Latest available:', `${estimatedYear}年第${estimatedQuarter}四半期`);
  return { year: estimatedYear, quarter: estimatedQuarter };
}

/**
 * 不動産情報ライブラリAPIから物件情報を取得して自動入力
 */
window.autoFillFromReinfolib = async function autoFillFromReinfolib() {
  console.log('[不動産情報ライブラリ] ========================================');
  console.log('[不動産情報ライブラリ] Auto-fill function called');
  
  const locationInput = document.getElementById('location');
  if (!locationInput) {
    console.error('[不動産情報ライブラリ] ❌ location input element not found');
    return;
  }
  
  // v3.153.108: Pattern 6 - 住所の正規化
  const address = normalizeAddress(locationInput.value);
  console.log('[不動産情報ライブラリ] Address from input:', address);
  
  if (!address) {
    console.warn('[不動産情報ライブラリ] ⚠️ Address is empty');
    return;
  }
  
  const btn = document.getElementById('auto-fill-btn');
  if (!btn) {
    console.error('[不動産情報ライブラリ] ❌ auto-fill-btn not found');
    return;
  }
  
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 取得中...';
  
  // CRITICAL FIX v3.153.118: Force reset button after 60 seconds (increased from 30s)
  // Reason: Fallback attempts can take up to 45 seconds (3 attempts × 15s each)
  const forceResetTimer = setTimeout(() => {
    console.error('[不動産情報ライブラリ v3.153.118] ⚠️ 60秒タイムアウト - ボタン強制リセット');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    alert('物件情報の取得がタイムアウトしました。\n\nネットワーク接続を確認して、再度お試しください。');
  }, 60000);
  
  // v3.153.98: Task A4 - リトライ中メッセージ表示
  let retryMessageTimer = null;
  
  try {
    // CRITICAL FIX v3.153.92: Check token and show user-friendly error
    const token = localStorage.getItem('token');
    console.log('[不動産情報ライブラリ] トークン取得:', !!token);
    
    if (!token) {
      console.error('[不動産情報ライブラリ] ❌ トークンなし');
      alert('ログインが必要です。\n\n物件情報補足機能を使用するには、先にログインしてください。\n\n「OK」をクリックするとログインページに移動します。');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      return;
    }
    
    // v3.153.108: Pattern 7 - 年・四半期の自動推定
    const { year, quarter } = estimateLatestQuarter();
    
    console.log('[不動産情報ライブラリ] リクエスト送信:', { address, year, quarter });
    
    // v3.153.119: 進捗表示コールバック関数
    const updateProgress = (message) => {
      btn.innerHTML = message;
    };
    
    // v3.153.98: 5秒後にリトライ中メッセージを表示
    retryMessageTimer = setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 時間がかかっています...';
    }, 5000);
    
    // v3.153.119: Pattern 4 - フォールバック処理を使用（進捗表示付き）
    const result = await fetchPropertyInfoWithFallback(address, year, quarter, token, updateProgress);
    
    if (!result.success) {
      // 全てのフォールバックが失敗
      throw {
        response: {
          status: 404,
          data: {
            message: '指定された住所のデータが見つかりませんでした。',
            details: { address, year: result.attemptInfo.year, quarter: result.attemptInfo.quarter }
          }
        }
      };
    }
    
    const response = { data: result.data };
    
    console.log('[不動産情報ライブラリ] ✅ レスポンス受信:', response.data);
    
    // フォールバックで取得できた場合は通知
    if (result.attemptInfo.year !== year || result.attemptInfo.quarter !== quarter) {
      console.log(`[不動産情報ライブラリ] ℹ️ ${result.attemptInfo.label}のデータを使用しています`);
    }
    
    if (!response.data.success) {
      console.error('[不動産情報ライブラリ] ❌ Data fetch failed:', response.data.message);
      return;
    }
    
    const properties = response.data.data;
    const metadata = response.data.metadata;
    
    if (!properties || properties.length === 0) {
      console.warn('[不動産情報ライブラリ] ⚠️ No data found for:', metadata.prefectureName, metadata.cityName);
      return;
    }
    
    const property = properties[0];
    
    // 各フィールドに自動入力
    const fields = [
      { id: 'land_area', value: property.land_area, label: '土地面積' },
      { id: 'zoning', value: property.use || property.city_planning, label: '用途地域' },
      { id: 'building_coverage', value: property.building_coverage_ratio, label: '建蔽率' },
      { id: 'floor_area_ratio', value: property.floor_area_ratio, label: '容積率' },
      { id: 'road_info', value: ((property.front_road_direction || '') + ' ' + (property.front_road_type || '') + ' 幅員' + (property.front_road_width || '')).trim(), label: '道路情報' },
      { id: 'frontage', value: property.frontage, label: '間口' },
      { id: 'building_area', value: property.building_area, label: '建物面積' },
      { id: 'structure', value: property.building_structure, label: '構造' },
      { id: 'built_year', value: property.building_year, label: '築年月' },
      { id: 'desired_price', value: property.trade_price, label: '希望価格' }
    ];
    
    let filledCount = 0;
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (input && field.value) {
        input.value = field.value;
        filledCount++;
        console.log(`[不動産情報ライブラリ] ✅ ${field.label} を入力: ${field.value}`);
      }
    });
    
    console.log(`[不動産情報ライブラリ] ✅ 自動入力完了: ${filledCount}項目`);
    
    // v3.153.108: Pattern 5 - ハザードマップリンク常時表示
    showHazardMapLink(address);
    
  } catch (error) {
    console.error('[不動産情報ライブラリ] ❌ Error:', error);
    
    // CRITICAL FIX v3.153.92: 詳細なエラーメッセージを表示
    let errorMessage = '物件情報の取得に失敗しました。';
    let details = '';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'ログインが必要です。再度ログインしてください。';
        // 401エラーの場合はログインページにリダイレクト
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else if (error.response.status === 400) {
        errorMessage = '住所を認識できませんでした。';
        if (error.response.data && error.response.data.examples) {
          details = '\\n\\n入力例:\\n' + error.response.data.examples.join('\\n');
        } else {
          details = '\\n\\n入力例:\\n東京都渋谷区\\n埼玉県さいたま市\\n神奈川県横浜市';
        }
      } else if (error.response.status === 404) {
        // v3.153.108: Pattern 2 - エラーメッセージの詳細化と明確化
        errorMessage = '📋 物件情報が見つかりませんでした';
        
        // APIレスポンスから詳細情報を取得
        const responseData = error.response.data || {};
        const address = responseData.details?.address || locationInput.value;
        const year = responseData.details?.year || new Date().getFullYear();
        const quarter = responseData.details?.quarter || Math.ceil((new Date().getMonth() + 1) / 3);
        
        details = '\\n\\n【入力された情報】';
        details += '\\n📍 住所: ' + address;
        details += '\\n📅 年: ' + year;
        details += '\\n📊 四半期: 第' + quarter + '四半期';
        
        details += '\\n\\n【推奨する対応】';
        details += '\\n✅ 最新の四半期（第4四半期）または前年（' + (year - 1) + '年）のデータを試す';
        details += '\\n✅ 住所を市区町村レベルまで簡略化（例: 神奈川県横浜市）';
        details += '\\n✅ 国土交通省ハザードマップポータルで手動確認';
        details += '\\n   → https://disaportal.gsi.go.jp/';
        
        details += '\\n\\n【注意事項】';
        details += '\\n⚠️ 郵便番号での検索には対応していません';
        details += '\\n⚠️ 番地まで含む詳細住所では見つからない場合があります';
        
        details += '\\n\\n【代替手段】';
        details += '\\n1️⃣ 不動産情報ライブラリ（MLIT）で直接検索';
        details += '\\n   → https://www.reinfolib.mlit.go.jp/';
        details += '\\n2️⃣ 各自治体の不動産取引価格情報サイト';
        details += '\\n3️⃣ 手動入力（下記のフォームに直接入力）';
        
      } else {
        errorMessage = `エラーが発生しました (HTTP ${error.response.status})`;
        if (error.response.data && error.response.data.error) {
          details = '\\n\\n詳細: ' + error.response.data.error;
        }
      }
    } else if (error.request) {
      errorMessage = 'ネットワークエラー: サーバーに接続できません。';
      details = '\\n\\n【対処方法】';
      details += '\\n1. インターネット接続を確認してください';
      details += '\\n2. しばらく待ってから再試行してください';
      details += '\\n3. それでも解決しない場合は管理者に連絡してください';
    }
    
    // v3.153.99: Task A5 - より詳細なエラーダイアログ
    const shouldShowLink = error.response && (error.response.status === 404 || error.response.status === 400);
    
    if (shouldShowLink && confirm(errorMessage + details + '\\n\\n外部サイトを開きますか？')) {
      window.open('https://www.reinfolib.mlit.go.jp/', '_blank');
    } else if (!shouldShowLink) {
      alert(errorMessage + details);
    }
  } finally {
    // CRITICAL FIX v3.153.117: Guaranteed button reset with safety checks
    console.log('[不動産情報ライブラリ v3.153.117] Finally block executing...');
    
    try {
      if (retryMessageTimer) {
        clearTimeout(retryMessageTimer);
        console.log('[不動産情報ライブラリ v3.153.117] ✓ Retry timer cleared');
      }
      if (typeof forceResetTimer !== 'undefined') {
        clearTimeout(forceResetTimer);
        console.log('[不動産情報ライブラリ v3.153.117] ✓ Force reset timer cleared');
      }
    } catch (timerError) {
      console.error('[不動産情報ライブラリ v3.153.117] ⚠️ Timer clear error:', timerError);
    }
    
    // Guaranteed button reset
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      console.log('[不動産情報ライブラリ v3.153.117] ✅ Button reset completed');
      console.log('[不動産情報ライブラリ v3.153.117] Button text:', btn.innerHTML);
      console.log('[不動産情報ライブラリ v3.153.117] Button disabled:', btn.disabled);
    } else {
      console.error('[不動産情報ライブラリ v3.153.117] ❌ Button reference lost!');
    }
  }
};

/**
 * v3.153.108: Pattern 5 - ハザードマップリンク常時表示
 */
async function showHazardMapLink(address) {
  try {
    // 住所から座標を取得（Nominatim API）
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const geocodeResponse = await axios.get(geocodeUrl, {
      headers: { 'User-Agent': 'Real-Estate-200units-v2/1.0' },
      timeout: 10000
    });
    
    if (geocodeResponse.data && geocodeResponse.data.length > 0) {
      const { lat, lon } = geocodeResponse.data[0];
      const hazardMapUrl = `https://disaportal.gsi.go.jp/maps/?ll=${lat},${lon}&z=15&base=pale&vs=c1j0l0u0`;
      
      // リンクを表示（既存の要素があれば更新、なければ作成）
      let linkContainer = document.getElementById('hazard-map-link-container');
      if (!linkContainer) {
        linkContainer = document.createElement('div');
        linkContainer.id = 'hazard-map-link-container';
        linkContainer.className = 'mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg';
        
        // 所在地フィールドの後に挿入
        const locationInput = document.getElementById('location');
        if (locationInput && locationInput.parentElement) {
          locationInput.parentElement.insertAdjacentElement('afterend', linkContainer);
        }
      }
      
      linkContainer.innerHTML = `
        <div class="flex items-center gap-3">
          <i class="fas fa-map-marked-alt text-blue-600 text-xl"></i>
          <div class="flex-1">
            <p class="text-sm font-medium text-blue-800 mb-1">
              🗺️ 国土交通省ハザードマップで詳細確認
            </p>
            <a href="${hazardMapUrl}" target="_blank" rel="noopener" 
               class="text-sm text-blue-600 hover:text-blue-800 underline">
              洪水・土砂災害・津波・液状化リスクを確認 →
            </a>
          </div>
        </div>
      `;
      
      console.log('[Hazard Map Link] ✅ Link displayed:', hazardMapUrl);
    }
  } catch (error) {
    console.warn('[Hazard Map Link] ⚠️ Failed to generate link:', error.message);
  }
}

/**
 * v3.153.119: Pattern 4 - 404エラー時の自動フォールバック処理（進捗表示付き）
 * 前年・前四半期で自動リトライ
 */
async function fetchPropertyInfoWithFallback(address, year, quarter, token, updateProgressCallback) {
  const attempts = [
    { year, quarter, label: `${year}年第${quarter}四半期` },
    { year: year - 1, quarter, label: `${year - 1}年第${quarter}四半期（前年）` },
    { year, quarter: quarter > 1 ? quarter - 1 : 4, label: `${year}年第${quarter > 1 ? quarter - 1 : 4}四半期（前四半期）` }
  ];
  
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      console.log(`[Property Info Fallback] Trying ${i + 1}/${attempts.length}: ${attempt.label}`);
      
      // CRITICAL FIX v3.153.119: 進捗表示をユーザーにフィードバック
      if (updateProgressCallback) {
        updateProgressCallback(`<i class="fas fa-sync-alt fa-spin"></i> 検索中... (${i + 1}/${attempts.length})`);
      }
      
      const response = await axios.get('/api/reinfolib/property-info', {
        params: { address, year: attempt.year, quarter: attempt.quarter },
        headers: { 'Authorization': 'Bearer ' + token },
        timeout: 15000
      });
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        console.log(`[Property Info Fallback] ✅ Success with: ${attempt.label}`);
        return { success: true, data: response.data, attemptInfo: attempt };
      }
    } catch (error) {
      console.warn(`[Property Info Fallback] ⚠️ Failed: ${attempt.label}`, error.message);
      // 404以外のエラーは即座に終了
      if (error.response && error.response.status !== 404) {
        throw error;
      }
    }
  }
  
  // 全てのフォールバックが失敗
  return { success: false, attemptInfo: attempts[attempts.length - 1] };
}

/**
 * 総合リスクチェック実施
 */
// CRITICAL FIX v3.153.110: 無限ループ防止フラグ
window._riskCheckInProgress = window._riskCheckInProgress || false;

window.manualComprehensiveRiskCheck = async function manualComprehensiveRiskCheck() {
  // 無限ループ防止: 既に実行中の場合は処理をスキップ
  if (window._riskCheckInProgress) {
    console.warn('[COMPREHENSIVE CHECK] ⚠️ Already in progress, skipping duplicate call');
    return;
  }
  
  window._riskCheckInProgress = true;
  console.log('[COMPREHENSIVE CHECK] ========================================');
  console.log('[COMPREHENSIVE CHECK] Manual risk check initiated');
  
  const locationInput = document.getElementById('location');
  if (!locationInput) {
    console.error('[COMPREHENSIVE CHECK] ❌ location input not found');
    window._riskCheckInProgress = false; // Reset flag
    return;
  }
  
  const address = locationInput.value.trim();
  console.log('[COMPREHENSIVE CHECK] Address:', address);
  
  if (!address) {
    console.warn('[COMPREHENSIVE CHECK] ⚠️ Address is empty');
    return;
  }
  
  const btn = document.getElementById('comprehensive-check-btn');
  if (!btn) {
    console.error('[COMPREHENSIVE CHECK] ❌ comprehensive-check-btn not found');
    return;
  }
  
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> チェック中...';
  
  // v3.153.98: Task A4 - リトライ中メッセージ表示
  let retryMessageTimer = null;
  
  try {
    // CRITICAL FIX v3.153.92: Check token and redirect to root
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[COMPREHENSIVE CHECK] ❌ No token');
      alert('ログインが必要です。\n\nリスクチェック機能を使用するには、先にログインしてください。\n\n「OK」をクリックするとログインページに移動します。');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      // Redirect to login page (root path)
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      return;
    }
    
    console.log('[COMPREHENSIVE CHECK] Sending request...');
    
    // v3.153.98: 8秒後にリトライ中メッセージを表示（comprehensive-checkは時間がかかるため）
    retryMessageTimer = setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 時間がかかっています...';
    }, 8000);
    
    const response = await axios.get('/api/reinfolib/comprehensive-check', {
      params: { address },
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 30000
    });
    
    console.log('[COMPREHENSIVE CHECK] ✅ Response:', response.data);
    
    if (!response.data.success) {
      console.error('[COMPREHENSIVE CHECK] ❌ Check failed:', response.data.error);
      alert('リスクチェックに失敗しました: ' + response.data.error);
      return;
    }
    
    // リスク結果を表示
    const risks = response.data.risks;
    const riskDetails = response.data.riskDetails;
    
    // CRITICAL FIX v3.153.77: Improve MANUAL_CHECK_REQUIRED message display
    let financingStatus = response.data.financingJudgment;
    if (financingStatus === 'MANUAL_CHECK_REQUIRED') {
      financingStatus = '⚠️ 手動確認必要';
    } else if (financingStatus === 'OK') {
      financingStatus = '✅ 問題なし';
    } else if (financingStatus === 'NG') {
      financingStatus = '❌ 融資制限あり';
    }
    
    let message = '=== 総合リスクチェック結果 ===\n\n';
    message += `住所: ${response.data.address}\n`;
    message += `座標: 緯度${response.data.coordinates.latitude}, 経度${response.data.coordinates.longitude}\n\n`;
    message += `土砂災害: ${risks.sedimentDisaster}\n`;
    message += `洪水リスク: ${risks.floodRisk}\n`;
    message += `津波リスク: ${risks.tsunamiRisk}\n`;
    message += `高潮リスク: ${risks.stormSurgeRisk}\n\n`;
    message += `融資判定: ${financingStatus}\n`;
    message += `メッセージ: ${response.data.financingMessage}\n\n`;
    message += `ハザードマップ: ${response.data.hazardMapUrl}`;
    
    alert(message);
    
    console.log('[COMPREHENSIVE CHECK] ✅ Success');
    
  } catch (error) {
    console.error('[COMPREHENSIVE CHECK v3.153.117] ❌ Error:', error);
    
    // CRITICAL FIX v3.153.92: 詳細なエラーメッセージと入力例
    let errorMessage = 'リスクチェックに失敗しました。';
    let details = '';
    
    if (error.response) {
      console.error('[COMPREHENSIVE CHECK] Response error:', error.response.data);
      
      if (error.response.status === 401) {
        errorMessage = 'ログインが必要です。再度ログインしてください。';
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else if (error.response.status === 400) {
        errorMessage = '住所を認識できませんでした。';
        if (error.response.data && error.response.data.examples) {
          details = '\\n\\n入力例:\\n' + error.response.data.examples.join('\\n');
        } else {
          details = '\\n\\n入力例:\\n東京都渋谷区\\n埼玉県さいたま市北区\\n神奈川県横浜市\\n千葉県千葉市';
        }
      } else {
        errorMessage = 'リスクチェックエラー: ' + (error.response.data.error || error.message);
        if (error.response.data && error.response.data.suggestion) {
          details = '\\n\\n' + error.response.data.suggestion;
        }
      }
    } else if (error.request) {
      errorMessage = 'ネットワークエラー: サーバーに接続できません。';
    } else {
      errorMessage = 'リスクチェックエラー: ' + error.message;
    }
    
    // v3.153.99: Task A5-3 - リスクチェックエラー時の外部サイトリンク
    details += '\\n\\n【代替手段: ハザードマップで直接確認】';
    details += '\\n1. 国土交通省ハザードマップポータルサイト';
    details += '\\n   → https://disaportal.gsi.go.jp/';
    details += '\\n2. 各自治体のハザードマップ';
    details += '\\n3. 不動産会社に直接確認';
    
    if (confirm(errorMessage + details + '\\n\\nハザードマップポータルサイトを開きますか？')) {
      window.open('https://disaportal.gsi.go.jp/', '_blank');
    }
  } finally {
    // v3.153.98: タイマーをクリア
    if (retryMessageTimer) {
      clearTimeout(retryMessageTimer);
    }
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    // CRITICAL FIX v3.153.110: Reset flag on exit
    window._riskCheckInProgress = false;
    console.log('[COMPREHENSIVE CHECK] ✅ Flag reset, ready for next execution');
  }
};

/**
 * v3.153.120: 住所入力時のハザード情報自動表示（一都三県ローカルDB）
 * リスクチェックボタン廃止に伴う代替機能
 */
window.autoShowHazardInfo = async function autoShowHazardInfo(address) {
  console.log('[Hazard Auto Display] ========================================');
  console.log('[Hazard Auto Display] v3.153.120: Auto-display from local DB');
  console.log('[Hazard Auto Display] Address:', address);
  
  if (!address || address.length < 5) {
    console.log('[Hazard Auto Display] ⚠️ Address too short, skipping');
    hideHazardInfo();
    return;
  }
  
  // 一都三県チェック（簡易）
  const isTargetArea = ['東京都', '神奈川県', '埼玉県', '千葉県'].some(pref => address.includes(pref));
  if (!isTargetArea) {
    console.log('[Hazard Auto Display] ⚠️ Not in target area (一都三県), skipping');
    hideHazardInfo();
    return;
  }
  
  try {
    // ローカルDBからハザード情報取得（API呼び出しは1回のみ、トークン消費なし）
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[Hazard Auto Display] ⚠️ No token, skipping');
      return;
    }
    
    const response = await axios.get('/api/hazard-db/info', {
      params: { address },
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (response.data.success) {
      console.log('[Hazard Auto Display] ✅ Hazard info retrieved:', response.data.data);
      displayHazardInfo(response.data.data);
    }
  } catch (error) {
    console.log('[Hazard Auto Display] ⚠️ Error (silent):', error.message);
    // エラーは無視（サイレント処理）
    hideHazardInfo();
  }
};

/**
 * ハザード情報表示関数（v3.94.0からの復活・改良版）
 */
function displayHazardInfo(hazardData) {
  console.log('[Hazard Display] Rendering hazard info UI');
  
  const container = document.getElementById('hazard-info-container');
  const resultDiv = document.getElementById('hazard-info-result');
  
  if (!container || !resultDiv) {
    console.error('[Hazard Display] ❌ Container elements not found');
    return;
  }
  
  const { location, hazards, loan } = hazardData;
  
  // リスクレベルに応じた色クラス
  const getRiskClass = (level) => {
    if (level === 'high') return 'bg-red-100 text-red-800 border-red-300';
    if (level === 'medium') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (level === 'low') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (level === 'none') return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };
  
  const getRiskIcon = (level) => {
    if (level === 'high') return 'fa-exclamation-triangle text-red-600';
    if (level === 'medium') return 'fa-exclamation-circle text-orange-600';
    if (level === 'low') return 'fa-info-circle text-yellow-600';
    if (level === 'none') return 'fa-check-circle text-green-600';
    return 'fa-question-circle text-gray-600';
  };
  
  // v3.153.122: ローン判定バッジ（要調査対応）
  let loanBadgeClass = 'bg-green-100 text-green-800 border-green-300';
  let loanBadgeIcon = 'fa-check-circle';
  if (loan.judgment === 'REQUIRES_INVESTIGATION') {
    loanBadgeClass = 'bg-orange-100 text-orange-800 border-orange-300';
    loanBadgeIcon = 'fa-search';
  } else if (loan.judgment === 'NG') {
    loanBadgeClass = 'bg-red-100 text-red-800 border-red-300';
    loanBadgeIcon = 'fa-ban';
  } else if (loan.judgment === 'RESTRICTED') {
    loanBadgeClass = 'bg-red-100 text-red-800 border-red-300';
    loanBadgeIcon = 'fa-exclamation-triangle';
  } else if (loan.judgment === 'WARNING' || loan.judgment === 'MANUAL_CHECK') {
    loanBadgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    loanBadgeIcon = 'fa-clipboard-check';
  }
  
  // HTML生成
  let html = `
    <!-- 所在地情報 -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div class="flex items-center mb-2">
        <i class="fas fa-map-marker-alt text-blue-600 mr-2"></i>
        <span class="font-semibold text-blue-900">対象エリア</span>
      </div>
      <p class="text-sm text-blue-800">${location.prefecture}${location.city}</p>
    </div>
    
    <!-- ローン判定 -->
    <div class="border ${loanBadgeClass} rounded-lg p-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <i class="fas ${loanBadgeIcon} mr-2"></i>
          <span class="font-semibold">融資判定: ${loan.judgment_text}</span>
        </div>
      </div>
    </div>
    
    <!-- ハザード情報カード -->
    <div class="space-y-3">
  `;
  
  hazards.forEach((hazard) => {
    html += `
      <div class="border ${getRiskClass(hazard.risk_level)} rounded-lg p-4">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <i class="fas ${getRiskIcon(hazard.risk_level)} mr-2"></i>
              <h4 class="font-medium">${hazard.type_name}</h4>
            </div>
            <p class="text-sm mb-2">${hazard.description}</p>
            <div class="text-xs space-y-1">
              <p><span class="font-semibold">リスクレベル:</span> ${hazard.risk_level_text}</p>
              ${hazard.affected_area !== 'なし' ? `<p><span class="font-semibold">影響範囲:</span> ${hazard.affected_area}</p>` : ''}
              <p class="text-gray-600"><span class="font-semibold">情報源:</span> ${hazard.data_source}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
  `;
  
  // v3.153.121: 融資制限詳細（用途地域・地理的リスク）
  const restrictions = loan.restrictions || {};
  
  if (restrictions.zoning && restrictions.zoning.length > 0) {
    html += `
      <div class="border-t pt-4 mt-4">
        <h4 class="font-semibold mb-3 text-red-700 flex items-center">
          <i class="fas fa-map-marked-alt mr-2"></i>用途地域制限
        </h4>
    `;
    restrictions.zoning.forEach((r) => {
      html += `
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          <p class="font-medium text-red-800 flex items-center">
            <i class="fas fa-ban mr-2"></i>${r.name}
          </p>
          <p class="text-sm text-red-700 mt-1">${r.details}</p>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  if (restrictions.geography && restrictions.geography.length > 0) {
    html += `
      <div class="border-t pt-4 mt-4">
        <h4 class="font-semibold mb-3 text-red-700 flex items-center">
          <i class="fas fa-mountain mr-2"></i>地理的リスク
        </h4>
    `;
    restrictions.geography.forEach((r) => {
      html += `
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          <p class="font-medium text-red-800 flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>${r.name}
          </p>
          <p class="text-sm text-red-700 mt-1">${r.details}</p>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  // v3.153.122: 要調査の場合の詳細指示
  if (loan.requires_investigation && loan.investigation_instructions && loan.investigation_instructions.length > 0) {
    html += `
      <div class="mt-4 pt-4 border-t border-gray-200 bg-orange-50 border border-orange-300 rounded-lg p-4">
        <h4 class="font-semibold mb-3 text-orange-800 flex items-center">
          <i class="fas fa-clipboard-list mr-2"></i>詳細調査が必要な項目
        </h4>
        <div class="text-sm text-orange-900 mb-3">
          <p class="font-medium mb-2">以下の項目について詳細調査を実施し、<span class="text-red-600 font-bold">備考欄に必ず記入</span>してください:</p>
        </div>
        <ul class="space-y-2">
    `;
    
    loan.investigation_instructions.forEach((instruction, index) => {
      html += `
        <li class="flex items-start text-sm text-orange-800">
          <span class="font-semibold mr-2">${index + 1}.</span>
          <span>${instruction}</span>
        </li>
      `;
    });
    
    html += `
        </ul>
        <div class="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
          <p class="text-sm text-red-800 font-semibold flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            案件作成時の注意事項
          </p>
          <p class="text-xs text-red-700 mt-2">
            上記の調査を実施せず、備考欄が空欄の場合は案件を作成できません。調査結果を必ず備考欄に記入してください。
          </p>
        </div>
      </div>
    `;
    
    // v3.153.122: 備考欄を必須化（グローバル変数に保存 + UI更新）
    window._hazardInvestigationRequired = true;
    window._hazardNgConditions = loan.ng_conditions || [];
    console.log('[Hazard Display] ⚠️ Investigation required, remarks field will be mandatory');
    console.log('[Hazard Display] NG Conditions:', window._hazardNgConditions);
    
    // 備考欄の必須表示を更新
    const remarksIndicator = document.getElementById('remarks-required-indicator');
    const remarksWarningBanner = document.getElementById('remarks-warning-banner');
    const remarksTextarea = document.getElementById('remarks');
    
    if (remarksIndicator) {
      remarksIndicator.classList.remove('hidden');
    }
    if (remarksWarningBanner) {
      remarksWarningBanner.classList.remove('hidden');
    }
    if (remarksTextarea) {
      // プレースホルダーに調査項目のヒントを追加
      const conditions = loan.ng_conditions.join('、');
      remarksTextarea.placeholder = `以下の項目について調査結果を記入してください（必須）：\n${conditions}\n\n例: 市街化調整区域について◯◯市都市計画課に確認済み。当該地は既存宅地で建築可能との回答を得た。`;
    }
  } else {
    // 要調査フラグをリセット
    window._hazardInvestigationRequired = false;
    window._hazardNgConditions = [];
    
    // 備考欄の必須表示をクリア
    const remarksIndicator = document.getElementById('remarks-required-indicator');
    const remarksWarningBanner = document.getElementById('remarks-warning-banner');
    const remarksTextarea = document.getElementById('remarks');
    
    if (remarksIndicator) {
      remarksIndicator.classList.add('hidden');
    }
    if (remarksWarningBanner) {
      remarksWarningBanner.classList.add('hidden');
    }
    if (remarksTextarea && remarksTextarea.placeholder.includes('必須')) {
      remarksTextarea.placeholder = '備考がある場合は入力してください';
    }
  }
  
  // 外部リンク
  html += `
    <div class="mt-4 pt-4 border-t border-gray-200">
      <a href="https://disaportal.gsi.go.jp/" target="_blank" 
         class="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline">
        <i class="fas fa-external-link-alt mr-2"></i>
        国土交通省ハザードマップポータルサイトで詳細を確認
      </a>
    </div>
  `;
  
  resultDiv.innerHTML = html;
  container.classList.remove('hidden');
  
  console.log('[Hazard Display] ✅ UI rendered successfully (v3.153.122: with investigation instructions)');
}

/**
 * ハザード情報非表示
 */
function hideHazardInfo() {
  const container = document.getElementById('hazard-info-container');
  if (container) {
    container.classList.add('hidden');
  }
}

console.log('[Global Functions] ✅ Functions defined successfully');
console.log('[Global Functions] typeof window.autoFillFromReinfolib:', typeof window.autoFillFromReinfolib);
console.log('[Global Functions] typeof window.manualComprehensiveRiskCheck:', typeof window.manualComprehensiveRiskCheck);
console.log('[Global Functions] typeof window.autoShowHazardInfo:', typeof window.autoShowHazardInfo);
console.log('[Global Functions] ========================================');
