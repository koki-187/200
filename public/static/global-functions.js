/**
 * Global Functions for Deals/New Page
 * v3.153.39 - CRITICAL FIX: Define functions BEFORE HTML to make inline onclick work
 * 
 * This file MUST be loaded BEFORE the HTML that contains onclick attributes
 */

console.log('[Global Functions] ========================================');
console.log('[Global Functions] VERSION: v3.153.39 (2025-12-10)');
console.log('[Global Functions] Defining window.autoFillFromReinfolib and window.manualComprehensiveRiskCheck');
console.log('[Global Functions] ========================================');

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
  
  const address = locationInput.value.trim();
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
  
  try {
    const token = localStorage.getItem('token');
    console.log('[不動産情報ライブラリ] トークン取得:', !!token);
    
    if (!token) {
      console.error('[不動産情報ライブラリ] ❌ トークンなし');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      return;
    }
    
    const year = new Date().getFullYear();
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
    
    console.log('[不動産情報ライブラリ] リクエスト送信:', { address, year, quarter });
    
    const response = await axios.get('/api/reinfolib/property-info', {
      params: { address, year, quarter },
      headers: { 'Authorization': 'Bearer ' + token },
      timeout: 15000
    });
    
    console.log('[不動産情報ライブラリ] ✅ レスポンス受信:', response.data);
    
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
    
  } catch (error) {
    console.error('[不動産情報ライブラリ] ❌ Error:', error);
    
    // CRITICAL FIX v3.153.91: ユーザーにエラーを通知
    let errorMessage = '物件情報の取得に失敗しました。';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'ログインが必要です。再度ログインしてください。';
        // 401エラーの場合はログインページにリダイレクト
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else if (error.response.status === 400) {
        errorMessage = '住所の形式が正しくありません。都道府県・市区町村を入力してください。';
      } else {
        errorMessage = `エラーが発生しました (HTTP ${error.response.status})`;
      }
    } else if (error.request) {
      errorMessage = 'ネットワークエラー: サーバーに接続できません。';
    }
    
    alert(errorMessage);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
};

/**
 * 総合リスクチェック実施
 */
window.manualComprehensiveRiskCheck = async function manualComprehensiveRiskCheck() {
  console.log('[COMPREHENSIVE CHECK] ========================================');
  console.log('[COMPREHENSIVE CHECK] Manual risk check initiated');
  
  const locationInput = document.getElementById('location');
  if (!locationInput) {
    console.error('[COMPREHENSIVE CHECK] ❌ location input not found');
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
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[COMPREHENSIVE CHECK] ❌ No token');
      // CRITICAL FIX v3.153.81: Show user-visible error message
      alert('ログインが必要です。\n\nこの機能を使用するには、先にログインしてください。\n\n「OK」をクリックするとログインページに移動します。');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      // Redirect to login page
      window.location.href = '/login';
      return;
    }
    
    console.log('[COMPREHENSIVE CHECK] Sending request...');
    
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
    console.error('[COMPREHENSIVE CHECK] ❌ Error:', error);
    
    // CRITICAL FIX v3.153.91: 詳細なエラーメッセージ
    let errorMessage = 'リスクチェックに失敗しました。';
    
    if (error.response) {
      console.error('[COMPREHENSIVE CHECK] Response error:', error.response.data);
      
      if (error.response.status === 401) {
        errorMessage = 'ログインが必要です。再度ログインしてください。';
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else if (error.response.status === 400) {
        errorMessage = '住所の解析に失敗しました。正しい住所を入力してください。\n例: 東京都渋谷区';
      } else {
        errorMessage = 'リスクチェックエラー: ' + (error.response.data.error || error.message);
      }
    } else if (error.request) {
      errorMessage = 'ネットワークエラー: サーバーに接続できません。';
    } else {
      errorMessage = 'リスクチェックエラー: ' + error.message;
    }
    
    alert(errorMessage);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
};

console.log('[Global Functions] ✅ Functions defined successfully');
console.log('[Global Functions] typeof window.autoFillFromReinfolib:', typeof window.autoFillFromReinfolib);
console.log('[Global Functions] typeof window.manualComprehensiveRiskCheck:', typeof window.manualComprehensiveRiskCheck);
console.log('[Global Functions] ========================================');
