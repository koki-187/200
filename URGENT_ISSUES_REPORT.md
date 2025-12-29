# 緊急課題レポート - プロダクション環境の問題

**作成日**: 2025-12-28 17:10  
**優先度**: 🔴 HIGH  
**ステータス**: 🚨 対応必要

---

## 🚨 発見された問題

### 1. OCR読み込み機能エラー（HIGH）

**症状**:
- OCR機能が正常に動作していない
- ファイルアップロード後のエラー

**影響範囲**:
- 物件情報の自動抽出機能
- ユーザー体験の低下

**原因推定**:
- `/api/property-ocr/extract-multiple` エンドポイントの問題
- フロントエンド側のエラーハンドリング不足
- 認証トークンの問題

**確認コード位置**:
- `src/index.tsx` 3240行目付近
- OCR API呼び出し処理

---

### 2. ハザード情報の重複表示（HIGH）

**症状**:
- 同じハザード情報が複数回表示される
- 「洪水浸水想定」「土砂災害警戒」「津波浸水想定」「液状化リスク」が重複
- ユーザーが混乱する表示

**影響範囲**:
- 物件評価画面
- ハザード情報表示セクション
- 融資判定の可読性

**原因推定**:
1. **APIレスポンスの重複データ**
   - `geography_risks` テーブルから複数の district レコードを取得
   - 同じリスク情報が複数の district に存在

2. **フロントエンド側の表示ロジック**
   - `response.data.data.hazards` 配列の重複処理
   - `response.data.data.geography_risks` の重複表示
   - フィルタリング処理の不足

**確認コード位置**:
- `src/routes/hazard-database.ts` 346-410行目
- `src/index.tsx` ハザード情報表示部分

---

## 📊 実際の画面表示

### スクリーンショット分析

**画面1**: 東京都港区の検索結果
- ❌ 融資判定: 融資不可（金融機関基準）
- ⚠️ 洪水浸水想定: 中リスクエリアが一部存在
- ✅ 洪水浸水想定: リスクなし（**重複表示**）
- ⚠️ 土砂災害警戒: 中リスクエリアが一部存在
- ✅ 土砂災害警戒: リスクなし（**重複表示**）× 2
- ⚠️ 津波浸水想定: 中リスクエリアが一部存在
- ✅ 津波浸水想定: リスクなし（**重複表示**）× 2
- ✅ 液状化リスク: リスクなし（**重複表示**）× 3

**問題点**:
- 同じハザード種別が複数回表示
- リスクレベルが異なる情報が混在（中リスク / リスクなし）
- ユーザーがどの情報を信頼すべきか不明

---

## 🔍 技術的詳細

### ハザード情報API (`/api/hazard-db/info`)

**現在の実装**:
```typescript
// src/routes/hazard-database.ts (135-161行目)
const geographyResults = await c.env.DB.prepare(`
  SELECT 
    district,
    is_cliff_area,
    cliff_height,
    cliff_note,
    is_river_adjacent,
    river_name,
    river_distance,
    is_building_collapse_area,
    collapse_type,
    max_flood_depth,
    is_over_10m_flood,
    loan_decision,
    loan_reason,
    confidence_level,
    verification_status
  FROM geography_risks
  WHERE prefecture = ? AND city = ?
  ORDER BY 
    is_over_10m_flood DESC,
    is_cliff_area DESC,
    is_building_collapse_area DESC,
    is_river_adjacent DESC
  LIMIT 10
`).bind(prefecture, city).all();
```

**問題**:
- 同じ市区町村内の複数の district レコードを取得
- 各 district ごとに重複した情報を返す可能性
- LIMIT 10 で制限しているが、根本的な解決にはなっていない

---

## 🛠️ 修正案

### 修正1: ハザード情報の重複削除（APIサイド）

**アプローチ1**: district でグループ化してリスクの最大値を取得
```sql
SELECT 
  prefecture,
  city,
  MAX(is_cliff_area) as is_cliff_area,
  MAX(cliff_height) as cliff_height,
  MAX(is_river_adjacent) as is_river_adjacent,
  MAX(is_building_collapse_area) as is_building_collapse_area,
  MAX(is_over_10m_flood) as is_over_10m_flood,
  -- その他のフィールド
FROM geography_risks
WHERE prefecture = ? AND city = ?
GROUP BY prefecture, city
```

**アプローチ2**: ハザードタイプごとにユニークな情報のみ返す
```typescript
// 重複を削除してユニークなハザード情報のみ返す
const uniqueHazards = hazardResults.results?.reduce((acc, row: any) => {
  const key = `${row.hazard_type}-${row.risk_level}`;
  if (!acc[key]) {
    acc[key] = row;
  }
  return acc;
}, {} as Record<string, any>);

const hazards = Object.values(uniqueHazards).map((row: any) => ({
  type: row.hazard_type,
  type_name: getHazardTypeName(row.hazard_type),
  risk_level: row.risk_level,
  risk_level_text: getRiskLevelText(row.risk_level),
  description: row.description,
  affected_area: row.affected_area,
  data_source: row.data_source,
}));
```

---

### 修正2: OCR機能の修正

**確認項目**:
1. **API エンドポイントの動作確認**
   ```bash
   curl -X POST https://c439086d.real-estate-200units-v2.pages.dev/api/property-ocr/extract-multiple \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file0=@test.pdf"
   ```

2. **エラーハンドリングの追加**
   ```typescript
   try {
     const response = await axios.post('/api/property-ocr/extract-multiple', formData, {
       headers: {
         'Authorization': 'Bearer ' + token,
         'Content-Type': 'multipart/form-data'
       }
     });
     extractedData = response.data.data;
   } catch (error) {
     console.error('OCR error:', error);
     // ユーザーにエラーメッセージを表示
     alert('OCR処理に失敗しました: ' + (error.response?.data?.error || error.message));
     // 処理セクションを非表示に戻す
     processingSection.classList.add('hidden');
     uploadSection.classList.remove('hidden');
     return;
   }
   ```

3. **認証トークンの確認**
   ```typescript
   // トークンの存在確認
   if (!token || token === 'null' || token === 'undefined') {
     console.error('認証トークンが無効です');
     alert('ログインが必要です');
     window.location.href = '/login';
     return;
   }
   ```

---

## 📝 次セッションへのアクション

### 優先度 HIGH（即座に対応）

#### 1. ハザード情報の重複削除（30分）

**ファイル**: `src/routes/hazard-database.ts`

**変更箇所**: 175-183行目

**修正コード**:
```typescript
// 重複を削除してユニークなハザード情報のみ返す
const uniqueHazardsMap = new Map();
hazardResults.results?.forEach((row: any) => {
  const key = row.hazard_type;
  const existing = uniqueHazardsMap.get(key);
  
  // より高いリスクレベルを優先
  if (!existing || getRiskPriority(row.risk_level) > getRiskPriority(existing.risk_level)) {
    uniqueHazardsMap.set(key, row);
  }
});

const hazards = Array.from(uniqueHazardsMap.values()).map((row: any) => ({
  type: row.hazard_type,
  type_name: getHazardTypeName(row.hazard_type),
  risk_level: row.risk_level,
  risk_level_text: getRiskLevelText(row.risk_level),
  description: row.description,
  affected_area: row.affected_area,
  data_source: row.data_source,
}));

// リスクレベルの優先度を返すヘルパー関数
function getRiskPriority(level: string): number {
  const priority: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
    none: 0,
  };
  return priority[level] || 0;
}
```

#### 2. OCRエラーハンドリング追加（15分）

**ファイル**: `src/index.tsx`

**変更箇所**: 3234-3249行目

**追加コード**:
```typescript
try {
  const formData = new FormData();
  selectedFiles.forEach((file, index) => {
    formData.append(`file${index}`, file);
  });

  const response = await axios.post('/api/property-ocr/extract-multiple', formData, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data'
    },
    timeout: 300000  // 5分のタイムアウト
  });

  if (!response.data || !response.data.data) {
    throw new Error('OCRレスポンスが不正です');
  }

  extractedData = response.data.data;
  
} catch (error) {
  console.error('OCR error:', error);
  
  // エラーメッセージを表示
  const errorMessage = error.response?.data?.error || error.message || 'OCR処理に失敗しました';
  const errorDiv = document.createElement('div');
  errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
  errorDiv.innerHTML = `
    <strong class="font-bold">エラー: </strong>
    <span class="block sm:inline">${errorMessage}</span>
  `;
  processingSection.insertBefore(errorDiv, processingSection.firstChild);
  
  // 処理セクションを非表示に戻す
  setTimeout(() => {
    processingSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    updateStep(1);
  }, 3000);
  
  return;
}
```

---

### 優先度 MEDIUM（1週間以内）

#### 3. プロダクション再デプロイ（30分）

**手順**:
```bash
cd /home/user/webapp

# 修正をコミット
git add src/routes/hazard-database.ts src/index.tsx
git commit -m "Fix: Remove duplicate hazard info display and improve OCR error handling"
git push origin main

# ビルド
npm run build

# デプロイ
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

#### 4. API統合テスト（30分）

**テスト項目**:
1. ハザード情報API - 重複なし確認
2. OCR API - エラーハンドリング確認
3. 融資判定 - 正確性確認

---

## 🎯 期待される結果

### 修正後の画面表示

**東京都港区の検索結果**（修正後）:
- ❌ 融資判定: 融資不可（金融機関基準）
- ⚠️ 洪水浸水想定: 中リスク（港区内の一部地域）
- ⚠️ 土砂災害警戒: 中リスク（港区内の一部地域）
- ⚠️ 津波浸水想定: 中リスク（港区内の一部地域）
- ✅ 液状化リスク: リスクなし

**改善点**:
- 各ハザードタイプが1回のみ表示
- 最も高いリスクレベルを表示
- ユーザーが理解しやすい表示

---

## 📞 サポート情報

### デバッグコマンド

```bash
# ハザード情報API確認
curl "https://c439086d.real-estate-200units-v2.pages.dev/api/hazard-db/info?address=東京都港区"

# データベース確認
cd /home/user/webapp
npx wrangler d1 execute real-estate-200units-db \
  --remote \
  --command="SELECT prefecture, city, COUNT(*) as count FROM hazard_info GROUP BY prefecture, city LIMIT 10;"

# geography_risks テーブル確認
npx wrangler d1 execute real-estate-200units-db \
  --remote \
  --command="SELECT prefecture, city, district, COUNT(*) as count FROM geography_risks WHERE prefecture='東京都' AND city='港区' GROUP BY prefecture, city, district;"
```

---

**作成日**: 2025-12-28 17:10  
**優先度**: 🔴 HIGH  
**推定修正時間**: 1時間  
**次回セッションで対応**: 必須
