# 実装計画書 v3.0.0 - PDF OCR & 複数ファイル対応

**作成日**: 2025-11-18  
**対象バージョン**: v3.0.0  
**前提バージョン**: v2.10.1

---

## 📋 実装要件

### 1. 名刺OCRのPDF対応
- **現状**: JPG/PNG/WEBP画像のみ対応
- **要件**: PDFファイルから名刺情報を抽出
- **実装方法**: PDF → 画像変換 → Vision API

### 2. 新規物件登録用OCR機能
- **現状**: 登記簿OCRは単一ファイルのみ
- **要件**: 
  - 複数PDFファイルの一括処理
  - 複数画像（1枚×複数）の一括処理
  - 物件情報の自動抽出とフォーム反映
  - OCRデータ + 物件関連ファイルの同時保存

### 3. 物件ファイル格納フォルダ
- **現状**: フォルダ分類（deals, registry, proposals, reports, chat）
- **要件**: 物件ID（deal_id）ごとの整理されたフォルダ構造

### 4. 住所から地図表示機能
- **要件**: 物件住所を地図上に表示
- **実装方法**: Google Maps API または OpenStreetMap

### 5. 管理者アカウント変更
- **要件**: 
  - Email: `navigator-187@docomo.ne.jp`
  - Password: `kouki187`
  - Role: ADMIN

---

## 🏗️ 技術設計

### Phase 1: 名刺OCR PDF対応（2時間）

#### 実装ファイル
- `src/routes/business-card-ocr.ts` - 既存修正
- `src/utils/pdf-converter.ts` - 新規作成

#### 技術アプローチ
```typescript
// PDFファイル判定
if (file.type === 'application/pdf') {
  // Option 1: pdf.js でPDF → Canvas → base64
  // Option 2: OpenAI APIに直接PDFを送信（PDF URLサポート）
  // → Option 2を採用（シンプル、Workers環境互換）
}
```

#### API仕様
```
POST /api/business-card-ocr/extract
Content-Type: multipart/form-data
file: File (JPG|PNG|WEBP|PDF)

Response:
{
  "success": true,
  "data": {
    "company_name": "...",
    "name": "...",
    ...
  }
}
```

---

### Phase 2: 複数ファイルOCR機能（3時間）

#### 新規エンドポイント
- `POST /api/property-ocr/extract-multiple` - 複数ファイル一括OCR
- `POST /api/property-ocr/extract-batch` - バッチ処理（非同期）

#### 実装ファイル
- `src/routes/property-ocr.ts` - 新規作成

#### データフロー
```
1. 複数ファイル受信（PDF複数 または 画像複数）
2. 各ファイルをループ処理
   - PDFの場合: 各ページを画像化 or 直接Vision API
   - 画像の場合: 直接Vision API
3. 抽出データを統合（重複除去、優先順位付け）
4. 物件情報フォーム用JSON返却
```

#### 抽出データ構造
```typescript
interface PropertyOCRResult {
  property_name: string;
  location: string; // 住所
  access: {
    station: string;
    walk_minutes: number;
  };
  land_area: string;
  building_area?: string;
  zoning: string;
  price: string;
  yield?: string;
  structure?: string;
  built_year?: string;
  occupancy?: string;
  // 追加フィールド
  images: string[]; // OCR元画像のパス
  extracted_from: string[]; // ファイル名リスト
}
```

---

### Phase 3: 物件ファイル格納フォルダ（1時間）

#### フォルダ構造設計
```
R2バケット構造:
/deals/{deal_id}/
  ├── registry/       # 登記簿謄本
  ├── proposals/      # 提案書
  ├── reports/        # 報告書
  ├── chat/           # チャット添付ファイル
  ├── ocr-source/     # OCR元ファイル（新規）
  └── photos/         # 物件写真（新規）
```

#### 実装内容
1. R2アップロード時に `deal_id` をパス prefix に含める
2. ファイル一覧API `/api/files?deal_id=xxx&folder=yyy` でフィルタ
3. フロントエンドでフォルダ別表示

---

### Phase 4: 地図表示機能（2時間）

#### 技術選定
- **Option 1**: Google Maps JavaScript API（有料、高機能）
- **Option 2**: OpenStreetMap + Leaflet.js（無料、オープンソース）
- **推奨**: Option 2（コスト削減）

#### 実装ファイル
- `public/static/map-viewer.js` - 新規作成
- フロントエンドに地図表示コンポーネント追加

#### 機能
```javascript
// 住所 → 緯度経度変換（Geocoding）
const coords = await geocodeAddress(property.location);

// 地図表示
const map = L.map('mapDiv').setView([coords.lat, coords.lng], 15);
L.marker([coords.lat, coords.lng]).addTo(map)
  .bindPopup(property.property_name);
```

#### Geocoding API
- **無料オプション**: Nominatim（OpenStreetMap）
- **制限**: 1秒1リクエスト
- **キャッシュ**: D1データベースに緯度経度を保存

---

### Phase 5: 管理者アカウント変更（10分）

#### 実装内容
1. seed.sqlの管理者情報更新
2. パスワードハッシュ生成（PBKDF2）
3. ローカルDB・本番DBに反映

#### コード
```sql
-- seed.sql 修正
DELETE FROM users WHERE email = 'admin@example.com';

INSERT OR REPLACE INTO users (id, email, password_hash, name, role) VALUES 
  ('admin-001', 'navigator-187@docomo.ne.jp', '{PBKDF2_HASH}', '管理者', 'ADMIN');
```

---

## 🚀 実装順序

### ステップ1: 管理者アカウント変更（10分）
→ すぐに反映可能、影響小

### ステップ2: 名刺OCR PDF対応（2時間）
→ 既存機能拡張、リスク小

### ステップ3: 物件ファイル格納フォルダ（1時間）
→ インフラ整備、他機能の基盤

### ステップ4: 複数ファイルOCR機能（3時間）
→ 新機能実装、複雑度高

### ステップ5: 地図表示機能（2時間）
→ フロントエンド主体、独立性高

**合計推定時間**: 8.17時間（約1日）

---

## 🧪 テスト計画

### 単体テスト
- [ ] 名刺OCR: PDFファイル処理
- [ ] 複数ファイルOCR: 2ファイル、5ファイル、10ファイル
- [ ] フォルダ構造: deal_id別アップロード・取得
- [ ] Geocoding: 日本語住所 → 緯度経度変換

### 統合テスト
- [ ] 名刺OCR → 物件登録フォーム自動入力
- [ ] 複数PDF OCR → 物件登録 → ファイル保存
- [ ] 物件詳細ページ → 地図表示

---

## 📦 依存関係

### 新規追加パッケージ（検討中）
- なし（Cloudflare Workers環境に配慮）

### 外部API
- OpenAI GPT-4 Vision API（既存）
- Nominatim Geocoding API（無料、新規）

---

## ⚠️ リスクと対策

### リスク1: Cloudflare Workers環境制約
- **問題**: PDF処理ライブラリが動作しない可能性
- **対策**: OpenAI APIに直接PDF URLを送信（Workers互換）

### リスク2: 複数ファイル処理の時間
- **問題**: 10ファイル処理で30秒超過 → Workers timeout
- **対策**: 非同期バッチ処理（Cloudflare Queue）を実装

### リスク3: Geocoding API制限
- **問題**: Nominatimの1秒1リクエスト制限
- **対策**: D1データベースに緯度経度キャッシュ

---

## 🎯 完成基準

### Phase 1: 名刺OCR PDF対応
- [x] PDFファイルアップロード可能
- [x] PDF から名刺情報抽出
- [x] 既存画像OCRと同じJSON形式

### Phase 2: 複数ファイルOCR
- [x] 複数PDF一括処理
- [x] 複数画像一括処理
- [x] 統合されたJSON結果
- [x] フォーム自動入力

### Phase 3: ファイル格納フォルダ
- [x] deal_id 別フォルダ
- [x] サブフォルダ分類
- [x] フィルタAPI

### Phase 4: 地図表示
- [x] 住所 → 緯度経度変換
- [x] 地図表示
- [x] マーカー設置

### Phase 5: 管理者アカウント
- [x] 新メールアドレス設定
- [x] 新パスワード設定
- [x] ログイン動作確認

---

**計画承認**: 実装開始前にレビュー推奨  
**想定完了**: 1日（8時間）
