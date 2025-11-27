# v3.55.0 機能拡張設計書

**作成日時**: 2025-11-26  
**対象バージョン**: v3.55.0  
**前バージョン**: v3.54.0

---

## 📋 要件サマリー

### ユーザー要求

1. **OCRフィールドとフォームフィールドの最適化**
2. **間口フィールドの追加**（買取条件評価で必要）
3. **欠落フィールドの追加**（築年月、建物面積、構造など）
4. **ファイル管理機能の実装**（フォルダ管理、保存、ダウンロード）
5. **容量制限の拡張**（100MB → 1GB、ユーザー10人+管理者1人）
6. **管理者への資料共有機能**
7. **不動産情報ライブラリAPI連携**
8. **不足書類の入力促進機能**

---

## 1️⃣ OCRフィールドとフォームフィールドの最適化

### 現状分析

#### OCR抽出フィールド（16フィールド）
| OCRフィールド名 | 日本語名 | フォーム入力 | 状態 |
|----------------|----------|------------|------|
| `property_name` | 物件名称 | `title` | ✅ 一致 |
| `location` | 所在地 | `location` | ✅ 一致 |
| `station` | 最寄り駅 | `station` | ✅ 一致 |
| `walk_minutes` | 徒歩分数 | `walk_minutes` | ✅ 一致 |
| `land_area` | 土地面積 | `land_area` | ✅ 一致 |
| `building_area` | 建物面積 | **なし** | ❌ 欠落 |
| `zoning` | 用途地域 | `zoning` | ✅ 一致 |
| `building_coverage` | 建蔽率 | `building_coverage` | ✅ 一致 |
| `floor_area_ratio` | 容積率 | `floor_area_ratio` | ✅ 一致 |
| `price` | 価格 | `desired_price` | ⚠️ 名前違い |
| `structure` | 構造 | **なし** | ❌ 欠落 |
| `built_year` | 築年月 | **なし** | ❌ 欠落 |
| `road_info` | 道路情報 | `road_info` | ✅ 一致 |
| `current_status` | 現況 | `current_status` | ✅ 一致 |
| `yield` | 表面利回り | **なし** | ❌ 欠落 |
| `occupancy` | 賃貸状況 | **なし** | ❌ 欠落 |

#### 買取条件評価で必要なフィールド
| フィールド | OCR | フォーム | 状態 |
|-----------|-----|---------|------|
| 間口 | **なし** | **なし** | ❌ 完全欠落 |
| 土地面積 | ✅ | ✅ | ✅ OK |
| 用途地域 | ✅ | ✅ | ✅ OK |
| 建蔽率 | ✅ | ✅ | ✅ OK |
| 容積率 | ✅ | ✅ | ✅ OK |
| 道路情報 | ✅ | ✅ | ✅ OK |

### 対応方針

#### 1.1 フォームに追加するフィールド

**優先度: 高（買取条件評価に必須）**
- ✅ **間口** (`frontage`) - 新規追加（OCR + フォーム + 適用処理）

**優先度: 中（物件情報として重要）**
- ✅ **築年月** (`built_year`) - フォーム追加（OCR抽出済み）
- ✅ **建物面積** (`building_area`) - フォーム追加（OCR抽出済み）
- ✅ **構造** (`structure`) - フォーム追加（OCR抽出済み）

**優先度: 低（投資判断に有用）**
- ✅ **表面利回り** (`yield`) - フォーム追加（OCR抽出済み）
- ✅ **賃貸状況** (`occupancy`) - フォーム追加（OCR抽出済み）

#### 1.2 OCR抽出プロンプトの更新

**追加するフィールド**:
```typescript
const PROPERTY_EXTRACTION_PROMPT = `
...
- 間口 (frontage): 道路に接する土地の幅（例: "7.5m", "12.3m"）
...
`;
```

#### 1.3 フィールドマッピングの更新

**src/index.tsx Line 4585-4602**:
```typescript
const fieldMapping = {
  property_name: '物件名称',
  location: '所在地',
  station: '最寄り駅',
  walk_minutes: '徒歩分数',
  land_area: '土地面積',
  building_area: '建物面積',      // 追加
  zoning: '用途地域',
  building_coverage: '建蔽率',
  floor_area_ratio: '容積率',
  price: '価格',
  structure: '構造',               // 追加
  built_year: '築年月',            // 追加
  road_info: '道路情報',
  frontage: '間口',                // 新規追加
  current_status: '現況',
  yield: '表面利回り',              // 追加
  occupancy: '賃貸状況'            // 追加
};
```

#### 1.4 OCR適用処理の更新

**src/index.tsx Line 4926-4942**:
```typescript
// フォームに自動入力
if (updatedData.property_name) document.getElementById('title').value = updatedData.property_name;
if (updatedData.location) document.getElementById('location').value = updatedData.location;
if (updatedData.station) document.getElementById('station').value = updatedData.station;
if (updatedData.walk_minutes) document.getElementById('walk_minutes').value = updatedData.walk_minutes;
if (updatedData.land_area) document.getElementById('land_area').value = updatedData.land_area;
if (updatedData.building_area) document.getElementById('building_area').value = updatedData.building_area; // 追加
if (updatedData.zoning) document.getElementById('zoning').value = updatedData.zoning;
if (updatedData.building_coverage) document.getElementById('building_coverage').value = updatedData.building_coverage;
if (updatedData.floor_area_ratio) document.getElementById('floor_area_ratio').value = updatedData.floor_area_ratio;
if (updatedData.road_info) document.getElementById('road_info').value = updatedData.road_info;
if (updatedData.frontage) document.getElementById('frontage').value = updatedData.frontage; // 新規追加
if (updatedData.structure) document.getElementById('structure').value = updatedData.structure; // 追加
if (updatedData.built_year) document.getElementById('built_year').value = updatedData.built_year; // 追加
if (updatedData.current_status) document.getElementById('current_status').value = updatedData.current_status;
if (updatedData.yield) document.getElementById('yield').value = updatedData.yield; // 追加
if (updatedData.occupancy) document.getElementById('occupancy').value = updatedData.occupancy; // 追加
if (updatedData.price) document.getElementById('desired_price').value = updatedData.price;
```

---

## 2️⃣ ファイル管理機能の設計

### 要件

1. **案件ごとのフォルダ管理**
2. **OCR資料の自動保存**
3. **追加資料のアップロード機能**
4. **ファイル一覧表示とダウンロード**
5. **管理者への自動共有**
6. **容量制限の管理**

### データモデル

#### 2.1 deal_files テーブル（新規作成）

```sql
CREATE TABLE IF NOT EXISTS deal_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,        -- 'ocr', 'document', 'image', 'other'
  file_size INTEGER NOT NULL,     -- bytes
  r2_key TEXT NOT NULL,           -- R2のオブジェクトキー
  mime_type TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploaded_by TEXT NOT NULL,      -- user_id or 'admin'
  is_ocr_source BOOLEAN DEFAULT 0, -- OCR元資料かどうか
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_deal_files_deal_id ON deal_files(deal_id);
CREATE INDEX idx_deal_files_user_id ON deal_files(user_id);
```

#### 2.2 フォルダ構造（R2）

```
/deals/{deal_id}/
  ├── ocr/                    # OCR元資料
  │   ├── {file_id}_{original_name}.pdf
  │   └── {file_id}_{original_name}.jpg
  ├── documents/              # 追加資料
  │   ├── contract.pdf
  │   └── survey_report.pdf
  └── images/                 # 物件写真
      ├── exterior_01.jpg
      └── interior_01.jpg
```

### API設計

#### 2.3 ファイルアップロードAPI

**POST /api/deals/:deal_id/files**

Request:
```typescript
// multipart/form-data
files: File[]
file_type: 'ocr' | 'document' | 'image' | 'other'
is_ocr_source?: boolean
```

Response:
```typescript
{
  success: true,
  uploaded_files: [{
    id: number,
    file_name: string,
    file_size: number,
    r2_url: string
  }]
}
```

#### 2.4 ファイル一覧取得API

**GET /api/deals/:deal_id/files**

Response:
```typescript
{
  success: true,
  files: [{
    id: number,
    file_name: string,
    file_type: string,
    file_size: number,
    uploaded_at: string,
    uploaded_by: string,
    is_ocr_source: boolean
  }],
  total_size: number,
  file_count: number
}
```

#### 2.5 ファイルダウンロードAPI

**GET /api/deals/:deal_id/files/:file_id/download**

Response:
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="..."
```

#### 2.6 ファイル削除API

**DELETE /api/deals/:deal_id/files/:file_id**

Response:
```typescript
{
  success: true,
  message: 'ファイルを削除しました'
}
```

---

## 3️⃣ 容量制限の拡張

### 現状

- **ユーザーごと**: 100MB
- **R2 Total**: 10GB

### 要件

- **ユーザーごと**: 1GB（10倍に拡張）
- **ユーザー数**: 10人 + 管理者1人 = 11人
- **合計必要容量**: 11GB

### 対応方針

#### 3.1 マイグレーション

**migrations/0003_increase_storage_quota.sql**:
```sql
-- ユーザーごとのストレージクォータを1GBに拡張
UPDATE storage_quota
SET limit_bytes = 1073741824  -- 1GB (1024 * 1024 * 1024)
WHERE limit_bytes = 104857600; -- 現在の100MB

-- 新規ユーザーのデフォルトクォータを1GBに設定
-- Note: アプリケーションコードでも変更が必要
```

#### 3.2 アプリケーションコード更新

**src/routes/storage-quota.ts**:
```typescript
// デフォルトクォータを1GBに変更
const DEFAULT_USER_QUOTA_BYTES = 1073741824; // 1GB
```

#### 3.3 R2容量の確認と拡張

**Cloudflare R2の容量**:
- Free Tier: 10GB
- **必要**: 11GB (10ユーザー + 1管理者 × 1GB)
- **対応**: Cloudflare Paidプランへアップグレード、または既存のR2バケット容量を確認

---

## 4️⃣ 管理者への資料共有機能

### 要件

1. **案件作成時に管理者がファイルにアクセス可能**
2. **管理者がファイル一覧を閲覧**
3. **管理者がファイルをダウンロード**
4. **不足資料がある場合、ユーザーに通知**

### 実装方針

#### 4.1 権限チェック

**ファイルアクセス権限**:
- 案件の作成者（user_id）
- 管理者（role = 'ADMIN'）

**src/routes/deal-files.ts**:
```typescript
// ファイルアクセス権限チェック
async function canAccessDealFiles(c, dealId) {
  const user = c.get('user');
  
  // 管理者は全案件のファイルにアクセス可能
  if (user.role === 'ADMIN') {
    return true;
  }
  
  // 案件の所有者チェック
  const deal = await c.env.DB.prepare(`
    SELECT user_id FROM deals WHERE id = ?
  `).bind(dealId).first();
  
  return deal && deal.user_id === user.id;
}
```

#### 4.2 管理者ダッシュボードへのファイル一覧追加

**管理者用案件詳細画面**:
```html
<div class="border-t pt-4 mt-4">
  <h3 class="font-semibold text-gray-900 mb-3">
    <i class="fas fa-folder mr-2"></i>添付資料
  </h3>
  <div id="deal-files-list">
    <!-- ファイル一覧 -->
  </div>
</div>
```

#### 4.3 不足資料の通知

**案件ステータスに「資料不足」を追加**:
```typescript
// ステータス: pending, in_review, approved, rejected, documents_needed
if (status === 'documents_needed') {
  // ユーザーに通知
  await sendNotification(userId, {
    type: 'documents_needed',
    deal_id: dealId,
    message: '案件審査に必要な資料が不足しています'
  });
}
```

---

## 5️⃣ 不動産情報ライブラリAPI連携

### 概要

不動産情報ライブラリ（国土交通省）のAPIを利用して、物件の詳細情報を取得します。

### API仕様

**エンドポイント**: `https://www.reinfolib.mlit.go.jp/api/...`

**取得可能な情報**:
- 都市計画情報
- 用途地域
- 建蔽率・容積率
- ハザードマップ情報

### 実装方針

#### 5.1 APIルートの作成

**src/routes/reinfolib.ts**:
```typescript
import { Hono } from 'hono';

const reinfolib = new Hono<{ Bindings: Bindings }>();

// 住所から物件情報を取得
reinfolib.get('/search', async (c) => {
  const address = c.req.query('address');
  
  // 不動産情報ライブラリAPIを呼び出し
  const response = await fetch(`https://www.reinfolib.mlit.go.jp/api/search?address=${address}`);
  const data = await response.json();
  
  return c.json({
    success: true,
    data: data
  });
});

export { reinfolib };
```

#### 5.2 フロントエンド統合

**自動入力機能**:
```typescript
// 所在地入力時に不動産情報ライブラリから情報を取得
document.getElementById('location').addEventListener('blur', async () => {
  const location = document.getElementById('location').value;
  
  if (location) {
    const response = await axios.get(`/api/reinfolib/search?address=${location}`);
    if (response.data.success) {
      // 取得した情報を自動入力
      if (response.data.data.zoning) {
        document.getElementById('zoning').value = response.data.data.zoning;
      }
      // ...
    }
  }
});
```

---

## 6️⃣ 不足書類の入力促進機能

### 要件

管理者が案件を審査する際、不足している情報をユーザーに通知し、追加入力を促す。

### 実装方針

#### 6.1 必須フィールドのチェック

**案件審査時の必須フィールド**:
```typescript
const REQUIRED_FIELDS_FOR_REVIEW = [
  'title',
  'location',
  'land_area',
  'zoning',
  'building_coverage',
  'floor_area_ratio',
  'road_info',
  'frontage',        // 新規追加
  'desired_price'
];

const REQUIRED_FILES = [
  { type: 'ocr', min_count: 1, description: '物件概要書' },
  { type: 'document', min_count: 1, description: '登記簿謄本' }
];
```

#### 6.2 不足チェックAPI

**GET /api/deals/:deal_id/missing-items**

Response:
```typescript
{
  success: true,
  missing_fields: ['frontage', 'built_year'],
  missing_files: [{
    type: 'document',
    description: '登記簿謄本',
    required_count: 1,
    current_count: 0
  }],
  is_ready_for_review: false
}
```

#### 6.3 通知UI

**ユーザー側**:
```html
<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
  <div class="flex items-start">
    <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3"></i>
    <div class="flex-1">
      <h4 class="font-semibold text-yellow-800 mb-2">案件審査に必要な情報が不足しています</h4>
      <ul class="text-sm text-yellow-700 space-y-1">
        <li>• 間口の入力が必要です</li>
        <li>• 登記簿謄本のアップロードが必要です</li>
      </ul>
      <button class="mt-3 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
        <i class="fas fa-edit mr-1"></i>情報を追加
      </button>
    </div>
  </div>
</div>
```

---

## 📊 実装優先度

### Phase 1: 必須機能（今回実装）

1. ✅ **OCRフィールドとフォームフィールドの最適化**
2. ✅ **間口フィールドの追加**
3. ✅ **築年月・建物面積・構造フィールドの追加**
4. ✅ **ファイル管理機能の基本実装**（アップロード、一覧、ダウンロード）
5. ✅ **容量制限の拡張**（100MB → 1GB）

### Phase 2: 管理者機能（次回実装）

6. ⏳ **管理者への資料共有機能**
7. ⏳ **不足書類の入力促進機能**

### Phase 3: 外部API連携（今後検討）

8. ⏳ **不動産情報ライブラリAPI連携**

---

## 🚀 実装スケジュール

### セッション v3.55.0（今回）

- [x] 設計書作成
- [ ] マイグレーションファイル作成
- [ ] フォームフィールド追加（HTML）
- [ ] OCR抽出プロンプト更新
- [ ] フィールドマッピング更新
- [ ] OCR適用処理更新
- [ ] ファイル管理API実装
- [ ] フロントエンド実装
- [ ] テスト・デプロイ

---

**最終更新**: 2025-11-26  
**ステータス**: 📝 設計完了 - 実装開始準備
