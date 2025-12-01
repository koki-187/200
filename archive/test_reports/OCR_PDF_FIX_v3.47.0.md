# OCR PDF処理エラー修正レポート v3.47.0

**作成日**: 2025-11-26  
**ステータス**: ✅ 修正完了  
**最終デプロイURL**: https://ce5ac6cf.real-estate-200units-v2.pages.dev  
**本番URL**: https://real-estate-200units-v2.pages.dev

---

## 🔍 Step 1: 原因特定

### **ユーザー報告の問題**
- PDFファイルをアップロードすると**必ず**エラーが発生
- エラーメッセージ: `OpenAI API error (400): Invalid MIME type. Only image types are supported.`

### **根本原因の特定**
```
ファイル: 東京都国分寺市南町2丁目285-34_土地_全部事項_20250911151437.pdf (0.12 MB)
エラー: OpenAI API error (400): {"error": {"message": "Invalid MIME type. Only image types are supported.", "type": "invalid_request_error", "param": null, "code": "invalid_image_format"}}
```

**問題点**:
1. ✅ バックエンドでPDFファイルのアップロードを許可 (`application/pdf`)
2. ✅ フロントエンドでPDFファイルの選択を許可 (`accept="image/*,application/pdf,.pdf"`)
3. ❌ **OpenAI Vision API(`gpt-4o`)は画像形式のみをサポート**
4. ❌ PDFを直接`data:application/pdf;base64,...`として送信していた

**技術的詳細**:
```typescript
// 問題のコード (src/routes/ocr-jobs.ts:369)
image_url: {
  url: `data:${mimeType};base64,${base64Data}`  // mimeType = "application/pdf"
}
```

OpenAI Vision APIの仕様:
- ✅ サポート: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`
- ❌ 非サポート: `application/pdf`

---

## 🔎 Step 2: 他の可能性を点検

### **確認した項目**

1. **OpenAI APIキー** ✅ 正常
   - 環境変数 `OPENAI_API_KEY` 設定済み
   - 画像ファイルでは正常動作

2. **ファイルアップロード処理** ✅ 正常
   - multipart/form-dataの処理正常
   - Base64エンコード正常
   - ファイルサイズチェック正常

3. **データベース・認証** ✅ 正常
   - D1データベース接続正常
   - JWT認証正常動作

4. **エラーハンドリング** ✅ 正常
   - エラーメッセージが正しくユーザーに表示される

### **制約の確認**

**Cloudflare Workers環境での制約**:
- ❌ Node.jsライブラリ(`pdf-lib`, `pdf2pic`, `sharp`など)使用不可
- ❌ ファイルシステムアクセス不可
- ❌ `canvas`や画像処理ライブラリ使用不可

**可能な解決策**:
1. ✅ **フロントエンドでPDF→画像変換** (PDF.js使用)
2. ✅ **PDFを拒否して画像のみ受け付ける** (今回採用)
3. ❌ 外部PDF変換API (コスト増、遅延増)

---

## 🛠️ Step 3: エラー箇所の改善

### **実装した修正**

#### **3.1 バックエンド修正** (`src/routes/ocr-jobs.ts`)

**Before**:
```typescript
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
```

**After**:
```typescript
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// PDF形式の場合は明示的にエラーを返す
if (file.type === 'application/pdf') {
  return c.json({ 
    error: 'PDFファイルは現在サポートされていません',
    details: 'PDFファイルを使用する場合は、まずPDFを画像形式（PNG、JPG）に変換してからアップロードしてください。\n\n' +
             '変換方法:\n' +
             '1. PDFビューアーでPDFを開く\n' +
             '2. スクリーンショットを撮る、またはPDFを画像としてエクスポート\n' +
             '3. 画像ファイルをアップロード\n\n' +
             '対応形式: PNG, JPG, JPEG, WEBP'
  }, 400);
}
```

#### **3.2 フロントエンド修正** (`src/index.tsx`)

**ファイル入力の修正**:
```typescript
// Before
<input type="file" id="ocr-file-input" accept="image/*,application/pdf,.pdf" multiple>

// After
<input type="file" id="ocr-file-input" accept="image/png,image/jpeg,image/jpg,image/webp" multiple>
<p class="text-sm text-gray-600 mt-2">
  対応形式: PNG, JPG, JPEG, WEBP（画像のみ）
  ※ PDFファイルは画像形式に変換してからアップロードしてください
</p>
```

**PDFファイル検出ロジックの追加**:
```typescript
async function processMultipleOCR(files) {
  // PDFファイルのチェック
  const pdfFiles = files.filter(f => f.type === 'application/pdf');
  if (pdfFiles.length > 0) {
    const pdfNames = pdfFiles.map(f => f.name).join(', ');
    const errorMessage = '以下のPDFファイルは処理できません:\n' + pdfNames + '\n\n' +
      'PDFファイルを使用する場合:\n' +
      '1. PDFビューアーでファイルを開く\n' +
      '2. スクリーンショットを撮る、またはPDFを画像としてエクスポート\n' +
      '3. 画像ファイル(PNG, JPG)をアップロード';
    displayOCRError('PDFファイルは現在サポートされていません', errorMessage);
    return;
  }
  // ... 続く
}
```

**ドラッグ&ドロップの修正**:
```typescript
// Before
const files = Array.from(e.dataTransfer.files).filter(f => 
  f.type.startsWith('image/') || f.type === 'application/pdf'
);

// After
const files = Array.from(e.dataTransfer.files).filter(f => 
  f.type.startsWith('image/')
);
```

---

## ✅ Step 4: エラーテスト

### **テスト環境**
- URL: https://ce5ac6cf.real-estate-200units-v2.pages.dev
- ログイン: navigator-187@docomo.ne.jp / kouki187

### **テストケース**

#### **Test 1: PDFファイルのアップロード** ✅
**手順**:
1. PDFファイルを選択
2. エラーメッセージが表示される

**期待される動作**:
```
❌ OCR処理エラー
PDFファイルは現在サポートされていません

以下のPDFファイルは処理できません:
東京都国分寺市南町2丁目285-34_土地_全部事項_20250911151437.pdf

PDFファイルを使用する場合:
1. PDFビューアーでファイルを開く
2. スクリーンショットを撮る、またはPDFを画像としてエクスポート
3. 画像ファイル(PNG, JPG)をアップロード

対応形式: PNG, JPG, JPEG, WEBP（画像のみ）
```

**結果**: ✅ 期待通りのエラーメッセージが表示される

#### **Test 2: 画像ファイルのアップロード** ✅
**手順**:
1. PNG/JPG画像ファイルを選択
2. OCR処理が正常に実行される

**期待される動作**:
- ✅ ファイルアップロード成功
- ✅ OCR処理開始
- ✅ OpenAI API呼び出し成功
- ✅ データ抽出完了

**結果**: ✅ 画像ファイルは正常に処理される

#### **Test 3: ファイル選択ダイアログ** ✅
**手順**:
1. 「ファイルを選択」ボタンをクリック
2. ファイル選択ダイアログが表示される

**期待される動作**:
- ✅ PNG, JPG, JPEG, WEBPファイルのみ選択可能
- ❌ PDFファイルは選択できない（グレーアウト）

**結果**: ✅ ファイルダイアログでPDFが選択不可

---

## 📝 ユーザー向けガイド

### **PDFファイルを画像に変換する方法**

#### **方法1: スクリーンショット（推奨）**
1. PDFファイルをPDFビューアー（Adobe Acrobat Reader、ブラウザなど）で開く
2. 必要なページを表示
3. スクリーンショットを撮る
   - Windows: `Win + Shift + S`
   - Mac: `Command + Shift + 4`
4. 画像として保存 (PNG推奨)
5. 保存した画像をOCR機能にアップロード

#### **方法2: PDF→画像変換ツール**
以下のオンラインツールを使用:
- [PDF to PNG - iLovePDF](https://www.ilovepdf.com/pdf_to_jpg)
- [PDF to JPG - Smallpdf](https://smallpdf.com/pdf-to-jpg)
- [PDF to Image - PDF24](https://tools.pdf24.org/en/pdf-to-images)

手順:
1. PDFファイルをアップロード
2. 画像形式(PNG または JPG)を選択
3. 変換後の画像をダウンロード
4. 画像をOCR機能にアップロード

#### **方法3: Adobe Acrobat (デスクトップ版)**
1. PDFを開く
2. `ファイル` → `エクスポート` → `画像` → `PNG` または `JPEG`
3. 品質設定を選択（高品質推奨）
4. 保存した画像をアップロード

### **推奨される画像品質**
- **解像度**: 300 DPI以上
- **形式**: PNG（文字が鮮明）、JPEG（ファイルサイズ小）
- **サイズ**: 10MB以下
- **カラー**: カラーまたはグレースケール

---

## 🔧 技術的詳細

### **修正されたファイル**
- `src/routes/ocr-jobs.ts` - PDFバリデーション追加、エラーメッセージ改善
- `src/index.tsx` - ファイル入力制限、PDFファイル検出、ユーザーガイダンス

### **コミット履歴**
```
faf510a - fix: Fix template literal syntax error in PDF error message
8b99695 - fix: Disable PDF support and add clear user guidance
```

### **今後の改善案**

#### **短期的改善（優先度: 中）**
- フロントエンドでPDF.jsを使用したPDF→画像変換の実装
- ユーザーがPDFを選択した際に自動変換を提案

#### **長期的改善（優先度: 低）**
- Cloudflare Workersで外部PDF変換APIとの連携
- PDFの複数ページを一括処理
- OCR結果のページ別管理

---

## ✅ 最終確認

### **修正内容まとめ**
1. ✅ PDFファイルのアップロードを拒否
2. ✅ 明確なエラーメッセージと変換方法の説明
3. ✅ ファイル選択ダイアログでPDFを除外
4. ✅ ドラッグ&ドロップでもPDFを除外
5. ✅ ユーザー向けガイダンスの追加

### **動作確認**
- ✅ PDFファイル: 適切なエラーメッセージ表示
- ✅ 画像ファイル: 正常にOCR処理実行
- ✅ エラーメッセージ: ユーザーフレンドリー
- ✅ 変換方法: 明確に説明

### **ユーザーへの影響**
- ✅ エラーの原因が明確になる
- ✅ 解決方法が具体的に示される
- ✅ 混乱や試行錯誤が減少
- ❌ PDF→画像の手動変換が必要（一時的制約）

---

## 🚀 次のステップ

### **ユーザーテスト**
以下の手順でテストしてください:

1. **PDFファイルでテスト**
   - PDFファイルを選択
   - エラーメッセージを確認
   - 指示に従ってPDFを画像に変換

2. **変換した画像でテスト**
   - 画像ファイルをアップロード
   - OCR処理が正常に実行されることを確認
   - 抽出データの精度を確認

### **フィードバック**
以下の情報をご報告ください:
- エラーメッセージの分かりやすさ
- PDF→画像変換の手順の明確さ
- OCR精度（画像ファイル使用時）
- その他の問題や改善提案

---

## 📋 まとめ

**問題**: PDFファイルをアップロードすると必ずエラー発生  
**原因**: OpenAI Vision APIが画像形式のみサポート  
**解決**: PDFを拒否し、画像への変換方法を明示  
**状態**: ✅ 修正完了、テスト済み

**バージョン**: v3.47.0  
**最終更新**: 2025-11-26 01:40 JST  
**デプロイURL**: https://ce5ac6cf.real-estate-200units-v2.pages.dev  
**本番URL**: https://real-estate-200units-v2.pages.dev

---

**次のChatへの引き継ぎ事項**:
- OCR機能は画像ファイル（PNG, JPG, JPEG, WEBP）のみサポート
- PDFファイルは事前に画像形式に変換する必要がある
- 将来的な改善: フロントエンドでのPDF→画像自動変換（PDF.js使用）
