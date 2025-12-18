# MLIT API統合ドキュメント

## 📚 概要

国土交通省（MLIT）が提供する不動産情報APIを使用して、ハザード情報を正確に取得するためのドキュメント。

---

## 🔑 利用可能なMLIT API

### 1. **用途地域API（XKT002）**
**エンドポイント**: 既に統合済み  
**取得データ**:
- 用途地域区分
- 市街化調整区域フラグ
- 防火地域・準防火地域フラグ
- 建蔽率・容積率

**使用方法**:
```javascript
// /api/reinfolib/zoning-info?address={住所}
const response = await fetch('/api/reinfolib/zoning-info?address=東京都渋谷区恵比寿1-1-1');
const data = await response.json();
```

---

### 2. **土砂災害警戒区域API（XKT031）**
**エンドポイント**: 既に統合済み  
**取得データ**:
- 土砂災害警戒区域（イエローゾーン）
- 土砂災害特別警戒区域（レッドゾーン）
- 区域の詳細情報

**使用方法**:
```javascript
// /api/reinfolib/comprehensive-check で利用
```

---

### 3. **洪水浸水想定区域API（XKT034）**
**エンドポイント**: コード実装済み（MLIT公開待ち）  
**取得データ**:
- 洪水浸水想定区域
- 想定浸水深
- 家屋倒壊等氾濫想定区域

**ステータス**: ⚠️ MLIT側で公開準備中

---

## 📋 データ取得の実装方針

### **方針A: 既存API活用（推奨）**
既に実装済みの `/api/reinfolib/comprehensive-check` を使用。

**メリット**:
- ✅ 既に認証・エラーハンドリング実装済み
- ✅ MLITのレート制限対応済み
- ✅ 再試行ロジック実装済み

**実装例**:
```javascript
// scripts/fetch-mlit-data.cjs
const fetch = require('node-fetch');

async function fetchHazardData(address) {
  const response = await fetch(
    `http://localhost:3000/api/reinfolib/comprehensive-check?address=${encodeURIComponent(address)}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.JWT_TOKEN}`
      }
    }
  );
  
  const data = await response.json();
  return data;
}
```

---

### **方針B: 直接MLIT API呼び出し（代替案）**
MLIT APIを直接呼び出す場合。

**必要な設定**:
1. MLIT API Key（.dev.varsに設定済み）
2. レート制限対応（1秒/1リクエスト）
3. エラーハンドリング

**実装例**:
```javascript
const MLIT_API_BASE = 'https://www.reinfolib.mlit.go.jp/ex-api/external';

async function fetchMLITDirect(cityCode, addressCode) {
  const url = `${MLIT_API_BASE}/XKT002?city=${cityCode}&address=${addressCode}`;
  const response = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.MLIT_API_KEY
    }
  });
  
  return await response.json();
}
```

---

## 🗺️ ハザードマップポータルサイト

### **概要**
国交省が提供する統合ハザードマップ。

**URL**: https://disaportal.gsi.go.jp/

**提供データ**:
- 洪水浸水想定区域
- 土砂災害警戒区域
- 津波浸水想定区域
- 液状化リスク

**注意**: REST APIは提供されていないため、スクレイピングまたは手動データ収集が必要。

---

## 📊 データ収集の実装計画

### **Phase 1: 既存API活用**
```javascript
// scripts/collect-accurate-data.cjs
const municipalities = require('./municipalities.json');

async function collectAllData() {
  const results = [];
  
  for (const area of ['tokyo', 'kanagawa', 'saitama', 'chiba']) {
    for (const muni of municipalities[area]) {
      // サンプル住所を構築
      const address = `${muni.prefecture}${muni.city}1-1-1`;
      
      try {
        // 既存APIから取得
        const data = await fetchHazardData(address);
        
        // データベース形式に変換
        const records = convertToDBFormat(data, muni);
        results.push(...records);
        
        // レート制限対応
        await sleep(1000);
      } catch (error) {
        console.error(`Failed: ${address}`, error.message);
      }
    }
  }
  
  return results;
}
```

---

### **Phase 2: ファクトチェック**
```javascript
// scripts/fact-check.cjs
async function factCheckData(record) {
  // 1. 複数ソースからデータ取得
  const mlitData = await fetchMLITData(record);
  const prefectureData = await fetchPrefectureData(record);
  
  // 2. データ比較
  const isConsistent = compareData(mlitData, prefectureData);
  
  // 3. 信頼度スコア計算
  return {
    ...record,
    confidence_level: isConsistent ? 'high' : 'medium',
    needs_manual_check: !isConsistent
  };
}
```

---

## 🔄 データ更新フロー

### **1. 初期データ収集**
```bash
node scripts/collect-accurate-data.cjs
# 出力: migrations/0035_accurate_hazard_data.sql
```

### **2. ファクトチェック**
```bash
node scripts/fact-check.cjs
# 出力: reports/fact-check-results.json
```

### **3. データベース投入**
```bash
npx wrangler d1 migrations apply real-estate-200units-db --local
```

### **4. 定期更新（月次）**
```bash
node scripts/update-hazard-data.cjs
# 古いデータ（30日以上前）を自動更新
```

---

## ⚠️ 実装上の注意事項

### **1. APIレート制限**
- MLIT API: 1秒/1リクエスト推奨
- Nominatim: 1秒/1リクエスト必須
- バッチ処理時は適切な間隔を設ける

### **2. エラーハンドリング**
```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      
      // レート制限エラーの場合は待機
      if (response.status === 429) {
        await sleep(5000);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
```

### **3. データ品質管理**
- 必須フィールドの検証
- 範囲チェック（緯度経度、浸水深等）
- 重複データの排除
- `last_updated`の管理

---

## 📝 データベーススキーマ拡張

### **信頼度フィールドの追加**
```sql
-- migrations/0036_add_confidence_level.sql
ALTER TABLE hazard_info ADD COLUMN confidence_level TEXT DEFAULT 'medium';
ALTER TABLE hazard_info ADD COLUMN data_sources TEXT; -- JSON形式
ALTER TABLE hazard_info ADD COLUMN needs_manual_check INTEGER DEFAULT 0;

CREATE INDEX idx_hazard_confidence ON hazard_info(confidence_level);
CREATE INDEX idx_hazard_manual_check ON hazard_info(needs_manual_check);
```

---

## 🎯 実装スケジュール

### **Week 1: データ収集基盤**
- [ ] `collect-accurate-data.cjs` 実装
- [ ] 既存API活用のテスト
- [ ] エラーハンドリング実装

### **Week 2: ファクトチェック**
- [ ] `fact-check.cjs` 実装
- [ ] データ比較ロジック実装
- [ ] 信頼度スコアリング

### **Week 3: データ投入**
- [ ] データベースへの投入
- [ ] 信頼度フィールド追加
- [ ] データ検証

### **Week 4: 定期更新**
- [ ] `update-hazard-data.cjs` 実装
- [ ] 差分更新ロジック
- [ ] ログ記録

---

## 📚 参考資料

### **公式ドキュメント**
- 国交省不動産情報ライブラリ: https://www.reinfolib.mlit.go.jp/
- ハザードマップポータルサイト: https://disaportal.gsi.go.jp/
- OpenStreetMap Nominatim: https://nominatim.openstreetmap.org/

### **プロジェクト内ドキュメント**
- HAZARD_DATABASE_CONSTRUCTION.md: データベース構造
- V3.153.123_COMPLETION_REPORT.md: v3.153.123実装報告
- REMAINING_TASKS.md: 未完了タスク一覧

---

**最終更新**: 2025-12-17  
**次のアクション**: collect-accurate-data.cjsの実装開始
