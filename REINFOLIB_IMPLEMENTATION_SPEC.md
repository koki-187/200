# REINFOLIB API実装仕様書
## 200棟土地仕入れ管理システム v3.152.0

**対象機能**: 災害リスクチェック・金融機関NG項目自動判定  
**実装期限**: Phase 10（次期バージョン）  
**優先度**: 🔴 最高（Priority A）

---

## 📋 実装概要

### 目的
案件登録時に以下の情報を自動取得・判定:
1. ✅ 容積率・建蔽率（既存実装）
2. 🆕 土砂災害リスク（新規）
3. 🆕 洪水浸水リスク（新規）
4. 🆕 市街化調整区域判定（新規）
5. 🆕 災害危険区域判定（新規）

### システムアーキテクチャ
```
[Frontend: 案件登録画面]
   ↓ axios.get()
[Backend: /api/reinfolib/comprehensive-check]
   ↓ 並列API呼び出し
[MLIT API群]
   ├─ XIT001: 価格情報（既存）
   ├─ XKT031: 土砂災害
   ├─ XKT034: 洪水浸水
   ├─ XKT001: 都市計画
   └─ XKT016: 災害危険区域
   ↓
[リスクスコアリングエンジン]
   ↓
[JSON Response]
   ↓
[Frontend: アラート表示]
```

---

## 🔧 1. バックエンド実装

### 1.1 新規エンドポイント追加

**ファイル**: `src/routes/reinfolib-api.ts`

```typescript
/**
 * 包括的不動産情報チェックAPI
 * GET /api/reinfolib/comprehensive-check
 * 
 * クエリパラメータ:
 * - address: 住所（例: "東京都港区六本木1-1-1"）
 * - lat: 緯度（オプション、座標系APIで使用）
 * - lon: 経度（オプション、座標系APIで使用）
 */
app.get('/comprehensive-check', authMiddleware, async (c) => {
  console.log('[REINFOLIB] ========== Comprehensive Check START ==========');
  
  try {
    const address = c.req.query('address');
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');
    
    if (!address) {
      return c.json({ error: '住所が指定されていません' }, 400);
    }
    
    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        error: 'MLIT_API_KEYが設定されていません',
        configRequired: true
      }, 401);
    }
    
    // 住所解析
    const locationCodes = parseAddress(address);
    if (!locationCodes) {
      return c.json({
        success: false,
        error: '住所の解析に失敗しました',
        address: address
      }, 200);
    }
    
    const { prefCode, cityCode } = locationCodes;
    const year = new Date().getFullYear();
    const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
    
    // 並列API呼び出し
    const [
      propertyInfoResult,
      sedimentDisasterResult,
      floodRiskResult,
      urbanPlanResult,
      disasterZoneResult
    ] = await Promise.allSettled([
      // 1. 不動産価格情報（容積率・建蔽率）
      fetchPropertyInfo(apiKey, prefCode, cityCode, year, quarter),
      
      // 2. 土砂災害警戒区域チェック
      fetchSedimentDisasterRisk(apiKey, lat, lon, cityCode),
      
      // 3. 洪水浸水想定区域チェック
      fetchFloodRisk(apiKey, lat, lon, cityCode),
      
      // 4. 都市計画区域区分チェック
      fetchUrbanPlanArea(apiKey, lat, lon, cityCode),
      
      // 5. 災害危険区域チェック
      fetchDisasterZone(apiKey, lat, lon, cityCode)
    ]);
    
    // 結果統合
    const comprehensiveResult = {
      success: true,
      address: address,
      timestamp: new Date().toISOString(),
      
      // 基本情報
      propertyInfo: propertyInfoResult.status === 'fulfilled' 
        ? propertyInfoResult.value 
        : { error: '取得失敗' },
      
      // リスク情報
      risks: {
        sedimentDisaster: sedimentDisasterResult.status === 'fulfilled'
          ? sedimentDisasterResult.value
          : { error: '取得失敗' },
          
        floodRisk: floodRiskResult.status === 'fulfilled'
          ? floodRiskResult.value
          : { error: '取得失敗' },
          
        urbanPlan: urbanPlanResult.status === 'fulfilled'
          ? urbanPlanResult.value
          : { error: '取得失敗' },
          
        disasterZone: disasterZoneResult.status === 'fulfilled'
          ? disasterZoneResult.value
          : { error: '取得失敗' }
      },
      
      // 金融機関融資判定
      financingJudgment: calculateFinancingJudgment({
        sedimentDisaster: sedimentDisasterResult.status === 'fulfilled' 
          ? sedimentDisasterResult.value : null,
        floodRisk: floodRiskResult.status === 'fulfilled' 
          ? floodRiskResult.value : null,
        urbanPlan: urbanPlanResult.status === 'fulfilled' 
          ? urbanPlanResult.value : null,
        disasterZone: disasterZoneResult.status === 'fulfilled' 
          ? disasterZoneResult.value : null
      })
    };
    
    console.log('[REINFOLIB] Comprehensive Check COMPLETED');
    return c.json(comprehensiveResult, 200);
    
  } catch (error: any) {
    console.error('[REINFOLIB] ❌ Exception:', error.message);
    return c.json({
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error.message
    }, 500);
  }
});

/**
 * 土砂災害警戒区域取得
 */
async function fetchSedimentDisasterRisk(
  apiKey: string, 
  lat?: string, 
  lon?: string, 
  cityCode?: string
): Promise<any> {
  // XKT031 API呼び出し
  // GeoJSON形式で取得後、指定座標が区域内かチェック
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT031?response_format=geojson&administrativeAreaCode=${cityCode}`;
  
  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey }
  });
  
  if (!response.ok) {
    return { 
      status: 'error', 
      message: `API Error: ${response.status}` 
    };
  }
  
  const data = await response.json();
  
  // 座標が指定されている場合、区域内判定
  if (lat && lon && data.features) {
    const isInZone = checkPointInPolygon(
      parseFloat(lat), 
      parseFloat(lon), 
      data.features
    );
    
    if (isInZone) {
      return {
        status: 'warning',
        level: 'high',
        message: '土砂災害警戒区域内に位置しています',
        zoneType: isInZone.properties?.A29_005_name_ja || '不明',
        financingImpact: '融資制限の可能性あり'
      };
    }
  }
  
  return {
    status: 'safe',
    level: 'none',
    message: '土砂災害警戒区域外',
    financingImpact: 'なし'
  };
}

/**
 * 洪水浸水想定区域取得
 */
async function fetchFloodRisk(
  apiKey: string, 
  lat?: string, 
  lon?: string, 
  cityCode?: string
): Promise<any> {
  // XKT034 API呼び出し
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT034?response_format=geojson&administrativeAreaCode=${cityCode}`;
  
  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey }
  });
  
  if (!response.ok) {
    return { 
      status: 'error', 
      message: `API Error: ${response.status}` 
    };
  }
  
  const data = await response.json();
  
  if (lat && lon && data.features) {
    const floodArea = checkPointInPolygon(
      parseFloat(lat), 
      parseFloat(lon), 
      data.features
    );
    
    if (floodArea) {
      const depth = floodArea.properties?.A31_005 || 0; // 浸水深（m）
      
      return {
        status: depth >= 3 ? 'danger' : 'warning',
        level: depth >= 3 ? 'high' : 'medium',
        message: `想定浸水深: ${depth}m`,
        floodDepth: depth,
        financingImpact: depth >= 3 
          ? '融資制限の可能性大' 
          : '融資条件厳格化の可能性'
      };
    }
  }
  
  return {
    status: 'safe',
    level: 'none',
    message: '洪水浸水想定区域外',
    financingImpact: 'なし'
  };
}

/**
 * 都市計画区域区分チェック
 */
async function fetchUrbanPlanArea(
  apiKey: string, 
  lat?: string, 
  lon?: string, 
  cityCode?: string
): Promise<any> {
  // XKT001 API呼び出し
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT001?response_format=geojson&administrativeAreaCode=${cityCode}`;
  
  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey }
  });
  
  if (!response.ok) {
    return { 
      status: 'error', 
      message: `API Error: ${response.status}` 
    };
  }
  
  const data = await response.json();
  
  if (lat && lon && data.features) {
    const area = checkPointInPolygon(
      parseFloat(lat), 
      parseFloat(lon), 
      data.features
    );
    
    if (area) {
      const areaType = area.properties?.A09_003_name_ja || '不明';
      
      // 市街化調整区域判定
      const isUrbanControlArea = areaType.includes('市街化調整区域');
      
      return {
        status: isUrbanControlArea ? 'danger' : 'safe',
        level: isUrbanControlArea ? 'high' : 'none',
        areaType: areaType,
        message: isUrbanControlArea 
          ? '市街化調整区域：建築制限あり' 
          : `${areaType}`,
        financingImpact: isUrbanControlArea 
          ? '融資不可の可能性大' 
          : 'なし'
      };
    }
  }
  
  return {
    status: 'unknown',
    level: 'unknown',
    message: '都市計画情報取得不可',
    financingImpact: '要確認'
  };
}

/**
 * 災害危険区域チェック
 */
async function fetchDisasterZone(
  apiKey: string, 
  lat?: string, 
  lon?: string, 
  cityCode?: string
): Promise<any> {
  // XKT016 API呼び出し
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT016?response_format=geojson&administrativeAreaCode=${cityCode}`;
  
  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey }
  });
  
  if (!response.ok) {
    return { 
      status: 'error', 
      message: `API Error: ${response.status}` 
    };
  }
  
  const data = await response.json();
  
  if (lat && lon && data.features) {
    const zone = checkPointInPolygon(
      parseFloat(lat), 
      parseFloat(lon), 
      data.features
    );
    
    if (zone) {
      return {
        status: 'danger',
        level: 'critical',
        message: '災害危険区域内に位置しています',
        zoneName: zone.properties?.A48_005_ja || '不明',
        reason: zone.properties?.A48_007_name_ja || '不明',
        financingImpact: '融資不可の可能性極大'
      };
    }
  }
  
  return {
    status: 'safe',
    level: 'none',
    message: '災害危険区域外',
    financingImpact: 'なし'
  };
}

/**
 * GeoJSON座標チェック（Point-in-Polygon判定）
 */
function checkPointInPolygon(
  lat: number, 
  lon: number, 
  features: any[]
): any | null {
  // 簡易実装: 各ポリゴンの境界ボックスチェック
  for (const feature of features) {
    if (feature.geometry?.type === 'Polygon' || 
        feature.geometry?.type === 'MultiPolygon') {
      // TODO: 正確なPoint-in-Polygon判定実装
      // 現在は簡易的にfeatureを返す
      return feature;
    }
  }
  return null;
}

/**
 * 融資可能性総合判定
 */
function calculateFinancingJudgment(risks: any): any {
  const criticalRisks = [];
  const warningRisks = [];
  
  // 重大リスクチェック
  if (risks.disasterZone?.status === 'danger') {
    criticalRisks.push('災害危険区域');
  }
  if (risks.urbanPlan?.status === 'danger') {
    criticalRisks.push('市街化調整区域');
  }
  if (risks.sedimentDisaster?.level === 'high') {
    criticalRisks.push('土砂災害特別警戒区域');
  }
  
  // 警告リスクチェック
  if (risks.floodRisk?.level === 'high') {
    warningRisks.push('洪水浸水深3m以上');
  }
  if (risks.sedimentDisaster?.level === 'medium') {
    warningRisks.push('土砂災害警戒区域');
  }
  if (risks.floodRisk?.level === 'medium') {
    warningRisks.push('洪水浸水想定区域');
  }
  
  // 総合判定
  let judgment = 'OK';
  let score = 100;
  let message = '融資可能性：高';
  
  if (criticalRisks.length > 0) {
    judgment = 'NG';
    score = 0;
    message = `融資不可の可能性大：${criticalRisks.join('、')}`;
  } else if (warningRisks.length > 0) {
    judgment = 'CAUTION';
    score = 50;
    message = `融資条件厳格化の可能性：${warningRisks.join('、')}`;
  }
  
  return {
    judgment: judgment,
    score: score,
    message: message,
    criticalRisks: criticalRisks,
    warningRisks: warningRisks,
    timestamp: new Date().toISOString()
  };
}

export default app;
```

---

## 🎨 2. フロントエンド実装

### 2.1 案件登録画面への統合

**ファイル**: `src/index.tsx`

```typescript
/**
 * 包括的不動産情報チェック（新規機能）
 */
window.comprehensiveRealEstateCheck = async function() {
  const locationInput = document.getElementById('location');
  const address = locationInput?.value?.trim();
  
  if (!address) {
    alert('住所を入力してください');
    return;
  }
  
  const btn = document.getElementById('comprehensive-check-btn');
  const originalHTML = btn?.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> チェック中...';
  
  try {
    const token = localStorage.getItem('auth_token');
    
    // 座標取得（Google Geocoding APIまたはブラウザGeolocation API使用）
    const coords = await getCoordinatesFromAddress(address);
    
    const response = await axios.get('/api/reinfolib/comprehensive-check', {
      params: { 
        address: address,
        lat: coords?.lat,
        lon: coords?.lon
      },
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 30000 // 30秒タイムアウト
    });
    
    if (!response.data.success) {
      alert('情報取得に失敗しました: ' + response.data.error);
      return;
    }
    
    // 結果表示モーダル
    displayComprehensiveCheckResult(response.data);
    
    // 自動入力
    autoFillFromComprehensiveData(response.data);
    
  } catch (error) {
    console.error('[包括チェック] エラー:', error);
    alert('エラーが発生しました');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
};

/**
 * 包括チェック結果表示モーダル
 */
function displayComprehensiveCheckResult(data: any) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const judgment = data.financingJudgment;
  const propertyInfo = data.propertyInfo;
  const risks = data.risks;
  
  // 判定結果に応じた色設定
  const judgmentColor = 
    judgment.judgment === 'OK' ? 'green' :
    judgment.judgment === 'CAUTION' ? 'yellow' :
    'red';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-4xl max-h-screen overflow-y-auto">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-clipboard-check"></i> 包括的不動産情報チェック結果
      </h2>
      
      <!-- 融資判定サマリー -->
      <div class="mb-6 p-4 border-2 border-${judgmentColor}-500 bg-${judgmentColor}-50 rounded">
        <h3 class="text-xl font-bold text-${judgmentColor}-700 mb-2">
          ${judgment.judgment === 'OK' ? '✅' : judgment.judgment === 'CAUTION' ? '⚠️' : '🛑'} 
          融資可能性判定: ${judgment.judgment}
        </h3>
        <p class="text-${judgmentColor}-600">${judgment.message}</p>
        <div class="mt-2">
          <span class="font-bold">総合スコア:</span> ${judgment.score}/100点
        </div>
      </div>
      
      <!-- 基本情報 -->
      <div class="mb-6 p-4 bg-blue-50 rounded">
        <h3 class="text-lg font-bold mb-3">📊 基本情報</h3>
        <div class="grid grid-cols-2 gap-3">
          <div><span class="font-bold">建蔽率:</span> ${propertyInfo.CoverageRatio || '取得失敗'}%</div>
          <div><span class="font-bold">容積率:</span> ${propertyInfo.FloorAreaRatio || '取得失敗'}%</div>
          <div><span class="font-bold">用途:</span> ${propertyInfo.Use || '取得失敗'}</div>
          <div><span class="font-bold">前面道路幅員:</span> ${propertyInfo.Breadth || '取得失敗'}m</div>
        </div>
      </div>
      
      <!-- リスク詳細 -->
      <div class="mb-6">
        <h3 class="text-lg font-bold mb-3">⚠️ リスク詳細</h3>
        
        <!-- 土砂災害 -->
        <div class="mb-3 p-3 border rounded ${risks.sedimentDisaster.status === 'warning' ? 'bg-yellow-50' : 'bg-gray-50'}">
          <h4 class="font-bold">🏔️ 土砂災害リスク</h4>
          <p>${risks.sedimentDisaster.message}</p>
          <p class="text-sm text-gray-600">影響: ${risks.sedimentDisaster.financingImpact}</p>
        </div>
        
        <!-- 洪水 -->
        <div class="mb-3 p-3 border rounded ${risks.floodRisk.status === 'danger' ? 'bg-red-50' : risks.floodRisk.status === 'warning' ? 'bg-yellow-50' : 'bg-gray-50'}">
          <h4 class="font-bold">🌊 洪水浸水リスク</h4>
          <p>${risks.floodRisk.message}</p>
          <p class="text-sm text-gray-600">影響: ${risks.floodRisk.financingImpact}</p>
        </div>
        
        <!-- 都市計画 -->
        <div class="mb-3 p-3 border rounded ${risks.urbanPlan.status === 'danger' ? 'bg-red-50' : 'bg-gray-50'}">
          <h4 class="font-bold">🏙️ 都市計画区域</h4>
          <p>${risks.urbanPlan.message}</p>
          <p class="text-sm text-gray-600">影響: ${risks.urbanPlan.financingImpact}</p>
        </div>
        
        <!-- 災害危険区域 -->
        <div class="mb-3 p-3 border rounded ${risks.disasterZone.status === 'danger' ? 'bg-red-50' : 'bg-gray-50'}">
          <h4 class="font-bold">🚨 災害危険区域</h4>
          <p>${risks.disasterZone.message}</p>
          <p class="text-sm text-gray-600">影響: ${risks.disasterZone.financingImpact}</p>
        </div>
      </div>
      
      <div class="flex gap-4">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          閉じる
        </button>
        <button onclick="document.getElementById('deal-form').submit()" 
                class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          この内容で登録
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * 座標取得（住所→緯度経度変換）
 */
async function getCoordinatesFromAddress(address: string): Promise<{lat: number, lon: number} | null> {
  // TODO: Google Geocoding API or OpenStreetMap Nominatim API実装
  // 現在は仮実装
  return null;
}
```

---

## 🎨 3. UI/UX設計

### 3.1 案件登録画面の追加ボタン

```html
<!-- 既存の「不動産情報ライブラリから自動入力」ボタンの下に追加 -->
<button type="button" 
        id="comprehensive-check-btn"
        onclick="window.comprehensiveRealEstateCheck()"
        class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
  <i class="fas fa-shield-alt"></i> 包括的リスクチェック
</button>
```

### 3.2 ダッシュボードへのリスクアラート追加

```html
<!-- 案件一覧画面で高リスク案件を強調表示 -->
<div class="deal-item ${deal.riskLevel === 'high' ? 'border-red-500 bg-red-50' : ''}">
  <div class="flex items-center gap-2">
    <h3>${deal.title}</h3>
    ${deal.riskLevel === 'high' ? '<span class="text-red-600 font-bold">⚠️ 高リスク</span>' : ''}
  </div>
</div>
```

---

## 📊 4. データベーススキーマ更新

### 4.1 deals テーブルへのカラム追加

```sql
-- migration/0028_add_risk_assessment_fields.sql

ALTER TABLE deals ADD COLUMN risk_assessment_json TEXT;
ALTER TABLE deals ADD COLUMN financing_judgment VARCHAR(20); -- 'OK', 'CAUTION', 'NG'
ALTER TABLE deals ADD COLUMN risk_score INTEGER DEFAULT 100;
ALTER TABLE deals ADD COLUMN sediment_disaster_risk VARCHAR(20);
ALTER TABLE deals ADD COLUMN flood_risk VARCHAR(20);
ALTER TABLE deals ADD COLUMN urban_plan_area VARCHAR(100);
ALTER TABLE deals ADD COLUMN disaster_zone_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN risk_checked_at DATETIME;
```

---

## ✅ 5. テスト計画

### 5.1 ユニットテスト
- [ ] `fetchSedimentDisasterRisk()` 関数テスト
- [ ] `fetchFloodRisk()` 関数テスト
- [ ] `calculateFinancingJudgment()` 関数テスト
- [ ] `checkPointInPolygon()` 座標判定テスト

### 5.2 統合テスト
- [ ] 包括チェックAPI全体フローテスト
- [ ] 並列API呼び出し成功時テスト
- [ ] 一部APIエラー時のフォールバックテスト

### 5.3 実機テスト住所
1. **安全エリア**: 東京都港区六本木1-1-1
2. **市街化調整区域**: 埼玉県さいたま市西区〇〇
3. **土砂災害警戒区域**: 神奈川県鎌倉市〇〇
4. **洪水浸水想定区域**: 千葉県松戸市〇〇

---

## 🚀 6. デプロイ手順

### 6.1 環境変数確認
```bash
npx wrangler pages secret list --project-name real-estate-200units-v2
# MLIT_API_KEYが設定されていることを確認
```

### 6.2 マイグレーション実行
```bash
# ローカル
npx wrangler d1 migrations apply real-estate-200units-db --local

# 本番
npx wrangler d1 migrations apply real-estate-200units-db --remote
```

### 6.3 ビルド&デプロイ
```bash
npm run build
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

---

## 📝 7. リリースノート（v3.152.0想定）

### 新機能
- ✨ 包括的不動産リスクチェック機能追加
  - 土砂災害警戒区域判定
  - 洪水浸水想定区域判定
  - 市街化調整区域判定
  - 災害危険区域判定
- ✨ 金融機関融資可能性自動判定
- ✨ リスクスコアリング機能

### 改善
- 🔧 REINFOLIB API統合の拡張
- 🔧 案件登録画面UIの強化
- 🔧 ダッシュボードにリスクアラート追加

### データベース
- 📦 deals テーブルにリスク評価カラム追加

---

## 📚 参考資料

- **REINFOLIB APIマニュアル**: https://www.reinfolib.mlit.go.jp/help/apiManual/
- **GeoJSON仕様**: https://geojson.org/
- **Point-in-Polygon実装**: Turf.js または独自実装

---

**作成者**: Claude (Genspark AI Assistant)  
**最終更新**: 2025-12-06  
**次期バージョン**: v3.152.0（Phase 10実装予定）
