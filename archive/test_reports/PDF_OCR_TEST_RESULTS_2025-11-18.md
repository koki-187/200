# PDF OCR テスト結果レポート

**テスト日時**: 2025-11-18  
**テスト対象**: アップロードされた物件情報PDFファイル  
**現在のシステムバージョン**: v2.10.0

---

## 📋 テスト対象ファイル

| ファイル名 | サイズ | 内容 |
|-----------|--------|------|
| `100133710595_1.pdf` | 1.2 MB | 吉祥寺コーポ - 中古マンション物件資料 |
| `南大塚　紹介資料.pdf` | 1.7 MB | 南大塚物件の紹介資料 |
| `Grand Soleil紹介資料0911.pdf` | 7.9 MB | Grand Soleil物件概要書（画像多数） |

---

## 🎯 テスト目的

物件情報PDFファイルから、以下の情報を自動抽出できるかを検証：

- 物件名称
- 価格
- 所在地
- 交通アクセス（駅・徒歩分数）
- 土地面積
- 建物構造・築年数
- 用途地域
- その他物件詳細情報

---

## ⚠️ テスト結果サマリー

### 現状の対応状況

| 項目 | 状況 | 詳細 |
|------|------|------|
| **名刺画像OCR** | ✅ 対応済み | JPG/PNG/WEBP形式の名刺画像から会社情報を抽出可能 |
| **PDF文書OCR** | ❌ 未対応 | PDFファイルの処理機能は未実装 |

### テスト実施結果

**結論**: 現在のシステムは**名刺画像専用**であり、**PDFファイルのOCRには対応していません**。

#### テスト1: 名刺OCR APIへのPDFアップロード
```bash
curl -X POST http://localhost:3000/api/business-card-ocr/extract \
  -F "file=@100133710595_1.pdf"
```

**結果**: ❌ **エラー**
```json
{
  "error": "対応していないファイル形式です",
  "details": "PNG, JPG, JPEG, WEBP形式の画像ファイルのみ対応しています"
}
```

**原因**: 
- `/api/business-card-ocr/extract` エンドポイントは画像ファイル専用
- ファイルタイプチェックでPDFが拒否される（`src/routes/business-card-ocr.ts` 38-43行目）

---

## 🔍 技術的分析

### 現在の制限事項

#### 1. ファイルタイプ制限（コード）
```typescript
// src/routes/business-card-ocr.ts (38-43行目)
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
  return c.json({ 
    error: '対応していないファイル形式です',
    details: 'PNG, JPG, JPEG, WEBP形式の画像ファイルのみ対応しています'
  }, 400);
}
```

#### 2. 設計上の制約
- **OpenAI Vision API**: 画像URLまたはbase64エンコードされた画像のみ対応
- **プロンプト**: 名刺情報抽出に特化
- **出力フォーマット**: 名刺用の8フィールドJSON構造

---

## 💡 PDF OCR機能の実装推奨方法

### オプション1: PDF → 画像変換 + Vision API（推奨）

**実装手順**:
1. PDFの各ページを画像に変換（pdf2image、pdf.js等）
2. 変換された画像をOpenAI Vision APIで解析
3. 物件情報用のプロンプトでデータ抽出

**メリット**:
- 既存のVision API基盤を再利用
- 複雑なレイアウトにも対応
- 画像品質による精度向上

**デメリット**:
- PDF変換処理のオーバーヘッド
- 複数ページの処理に時間がかかる
- Cloudflare Workers環境での実装制約

### オプション2: テキスト抽出 + GPT-4テキスト解析

**実装手順**:
1. PDFからテキストを直接抽出（pdf-parse、pdfjs-dist等）
2. 抽出テキストをGPT-4で解析
3. 構造化データとして出力

**メリット**:
- 処理速度が速い
- テキストベースで正確
- APIコストが低い

**デメリット**:
- レイアウト情報が失われる
- 画像内テキストは抽出不可
- 複雑なフォーマットに弱い

### オプション3: 専門OCRサービス統合

**サービス例**:
- **Google Document AI**: 不動産文書特化モデルあり
- **AWS Textract**: レイアウト解析強力
- **Azure Form Recognizer**: カスタムモデル作成可能

**メリット**:
- 高精度なOCR
- レイアウト・テーブル認識
- 業界特化モデル利用可能

**デメリット**:
- 追加コスト
- 外部サービス依存
- API統合の手間

---

## 🚀 実装提案（段階的アプローチ）

### Phase 1: 基本PDF対応（推定工数: 4-6時間）

#### 1.1 新しいAPIエンドポイント作成
```typescript
// src/routes/property-ocr.ts
import { Hono } from 'hono';

const propertyOCR = new Hono();

propertyOCR.post('/extract-pdf', async (c) => {
  // PDFファイル受信
  // 画像変換またはテキスト抽出
  // GPT-4で物件情報抽出
  // 構造化JSON返却
});

export default propertyOCR;
```

#### 1.2 物件情報専用プロンプト
```typescript
const propertyPrompt = `
あなたは不動産物件資料の情報抽出専門家です。
以下のJSON形式で情報を返してください：

{
  "property_name": "物件名称",
  "price": "価格（総額）",
  "location": "所在地",
  "access": "交通アクセス",
  "land_area": "土地面積",
  "building_area": "建物面積",
  "structure": "構造",
  "built_year": "築年月",
  "zoning": "用途地域",
  "yield": "表面利回り",
  "occupancy": "賃貸状況"
}
`;
```

### Phase 2: 高度な機能（推定工数: 8-12時間）

- 複数ページPDFの一括処理
- テーブル・図面の認識
- 物件画像の自動分類
- 信頼度スコアの表示
- エラーハンドリング強化

### Phase 3: 本番環境対応（推定工数: 4-6時間）

- Cloudflare Workers環境での最適化
- 大容量PDF処理（10MB+）
- キャッシュ機能
- バッチ処理API

---

## 📊 コスト試算

### OpenAI Vision API コスト
- **GPT-4o Vision**: 入力 $2.50/1M tokens、出力 $10.00/1M tokens
- **1ページPDF解析**: 約500-1000トークン
- **推定コスト**: 1物件PDF（5ページ）で約 $0.01-0.03

### 専門OCRサービスコスト
- **Google Document AI**: $1.50/1000ページ
- **AWS Textract**: $1.50/1000ページ
- **推定コスト**: 1物件PDFで約 $0.01

---

## 🎯 推奨アクション

### 短期（次セッション）
1. **仕様確認**: PDF OCR機能の必要性と優先度を確認
2. **サンプルテスト**: 小規模な実装でPDFテキスト抽出をテスト
3. **コスト検証**: API使用量とコストの試算

### 中期（1-2週間）
1. **プロトタイプ実装**: Phase 1の基本PDF対応を実装
2. **精度検証**: 実際の物件PDFでテスト実施
3. **UI統合**: フロントエンドからのPDFアップロード機能

### 長期（1ヶ月+）
1. **本番デプロイ**: Cloudflare環境での動作確認
2. **運用最適化**: パフォーマンス・コスト最適化
3. **機能拡張**: バッチ処理、高度な解析機能

---

## 📝 参考情報

### PDFライブラリ（JavaScript/TypeScript）
- **pdfjs-dist**: Mozilla製、ブラウザ/Node.js対応
- **pdf-parse**: シンプルなテキスト抽出
- **pdf2pic**: PDF→画像変換

### Cloudflare Workers制約
- **CPU時間制限**: 10ms（無料）/ 30ms（有料）
- **メモリ制限**: 128MB
- **ファイルサイズ**: Workers自体は10MB制限

**注意**: PDFライブラリはWorkers環境で動作しない可能性があり、
Edge環境での実装には工夫が必要です。

---

## ✅ 結論

### 現状
- ✅ **名刺画像OCR**: 完全動作（v2.10.0で安定化）
- ❌ **PDF文書OCR**: 未実装

### 次ステップ
1. **要件定義**: PDF OCR機能の必要性・優先度を確認
2. **技術検証**: Cloudflare Workers環境でのPDF処理可能性を調査
3. **実装計画**: 段階的な実装ロードマップの策定

### 推奨事項
PDF OCR機能が必要な場合は、**Phase 1から段階的に実装**することを推奨します。
特に、Cloudflare Workers環境での制約を考慮した設計が重要です。

---

**テスト実施者**: AI Assistant  
**ドキュメント作成日**: 2025-11-18  
**システムバージョン**: v2.10.0  
**関連ファイル**: `src/routes/business-card-ocr.ts`
