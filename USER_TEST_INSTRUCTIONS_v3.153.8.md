# ユーザーテスト手順書 v3.153.8

## 🔴 重要: 必ず正しいURLでテストしてください

**最新デプロイURL**: `https://933741bf.real-estate-200units-v2.pages.dev`

**⚠️ 古いURLでテストすると、修正が反映されていません**

---

## 📝 今回の修正内容

### 根本原因
JavaScriptの構文エラーにより、メインscriptタグ全体が実行されていませんでした。

### 具体的な問題
- セラードロップダウンが空白
- 物件情報自動取得ボタンが動作しない
- 総合リスクチェックボタンが動作しない

### 修正内容
alert文字列内の改行が正しくエスケープされていなかった問題を修正しました。

---

## 🧪 テスト手順

### 1. キャッシュクリア（必須）

テスト前に必ずキャッシュをクリアしてください:

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

または、シークレットモード/プライベートブラウジングモードでテストしてください。

---

### 2. 正しいURLでアクセス

```
https://933741bf.real-estate-200units-v2.pages.dev
```

**URLバーを確認**: `933741bf`が含まれていることを確認してください。

---

### 3. ログイン

- **Email**: `navigator-187@docomo.ne.jp`
- **Password**: `kouki187`

---

### 4. 新規案件作成ページにアクセス

ログイン後、「新規案件作成」をクリックするか、以下のURLに直接アクセス:

```
https://933741bf.real-estate-200units-v2.pages.dev/deals/new
```

---

### 5. ブラウザの開発者ツールを開く

テスト中は必ず開発者ツールのConsoleタブを開いてください:

- **Windows/Linux**: `F12` または `Ctrl + Shift + I`
- **Mac**: `Cmd + Option + I`

---

### 6. テスト項目

#### ✅ テスト A: セラードロップダウン

**場所**: フォーム内の「売主」フィールド

**期待される結果**:
- ドロップダウンに「選択してください」の他に、4人のAGENTユーザーが表示される:
  1. 本番テスト担当者 (本番テスト不動産)
  2. テスト担当者 (不動産仲介株式会社)
  3. 田中太郎 (不動産ABC株式会社)
  4. 佐藤花子 (株式会社XYZ不動産)

**Console ログ確認**:
```
[Sellers] ========== START (Retry: 0 ) ==========
[Sellers] Token: exists (eyJ0eXAiOiJKV1QiL...)
[Sellers] seller_id element found
[Sellers] Calling API: /api/auth/users
[Sellers] API Response: { users: [...] }
[Sellers] Filtered sellers: 4 AGENT users found
[Sellers] Added option: 本番テスト担当者 (本番テスト不動産)
[Sellers] Added option: テスト担当者 (不動産仲介株式会社)
[Sellers] Added option: 田中太郎 (不動産ABC株式会社)
[Sellers] Added option: 佐藤花子 (株式会社XYZ不動産)
[Sellers] ✅ Successfully loaded 4 sellers
```

---

#### ✅ テスト B: 物件情報自動取得ボタン

**手順**:
1. 「所在地」フィールドに完全な住所を入力:
   ```
   東京都板橋区蓮根三丁目17-7
   ```
2. 「物件情報を自動取得」ボタンをクリック

**期待される結果**:
- フォームに以下の項目が自動入力される:
  - 土地面積
  - 用途地域
  - 建蔽率
  - 容積率
  - 道路情報
  - 構造
  - 築年月

**Console ログ確認**:
```
[不動産情報ライブラリ] Auto-fill function called
[不動産情報ライブラリ] Using address: 東京都板橋区蓮根三丁目17-7
[不動産情報ライブラリ] ✅ 379件のデータを取得しました
```

---

#### ✅ テスト C: 総合リスクチェックボタン

**手順**:
1. 「所在地」フィールドに完全な住所を入力（上記と同じ）
2. 「総合リスクチェック実施」ボタンをクリック

**期待される結果**:
- アラートダイアログで総合判定結果が表示される
- 災害リスク情報が表示される

**Console ログ確認**:
```
[COMPREHENSIVE CHECK] Address: 東京都板橋区蓮根三丁目17-7
[COMPREHENSIVE CHECK] ✅ Check completed
```

---

### 7. エラーが発生した場合

もしエラーが発生した場合:

1. **スクリーンショットを撮影**:
   - URLバーが見えるようにページ全体
   - 開発者ツールのConsoleタブ全体

2. **Console ログ全体をコピー**:
   - Consoleタブで右クリック → 「Save as...」
   - または、全選択してコピー

3. **以下の情報を記録**:
   - 使用しているブラウザ（Chrome, Firefox, Safari等）
   - ブラウザのバージョン
   - OS（Windows, Mac, iOS, Android等）
   - 実行した操作の詳細

---

## 🔍 トラブルシューティング

### 問題: セラードロップダウンがまだ空白

**確認事項**:
1. URLが正しいか: `https://933741bf.real-estate-200units-v2.pages.dev`
2. キャッシュクリアを実行したか
3. Console ログに`[Sellers]`のログが表示されているか

**Console ログに`[Sellers]`がない場合**:
- `[CRITICAL DEBUG] SCRIPT START`のログがあるか確認
- もしこのログもない場合、古いデプロイを見ている可能性が高い

---

### 問題: ボタンをクリックしても何も起こらない

**確認事項**:
1. Console ログにエラーが表示されていないか
2. ボタンがdisabled状態になっていないか
3. 住所が正しく入力されているか（完全な住所: 都道府県+市区町村+番地）

---

### 問題: 「Invalid or unexpected token」エラーが表示される

**これはv3.153.8で修正されたはずのエラーです**

もしこのエラーが表示される場合:
1. URLが`https://933741bf.real-estate-200units-v2.pages.dev`であることを再確認
2. 強制的にキャッシュクリア: `Ctrl + Shift + Delete`（キャッシュと Cookie を削除）
3. ブラウザを完全に閉じて再起動
4. シークレットモードで再度テスト

---

## 📊 期待される Console ログの全体像

正常に動作している場合、Console ログは以下のようになります:

```
[CRITICAL DEBUG] ========== SCRIPT START v3.149.1 ==========
[CRITICAL DEBUG] typeof localStorage: object
[CRITICAL DEBUG] typeof JSON: object
[CRITICAL DEBUG] Token retrieved: true
[CRITICAL DEBUG] Token exists: true
[CRITICAL DEBUG] axios loaded: true
[Global Init] processMultipleOCR placeholder created
[OCR Elements] ✅ All event listeners attached successfully
[Main] ========== v3.149.1 ==========
[Main] Document already ready, calling initializePage immediately
[Main] Calling initializePage NOW
[Init] ========== INITIALIZE PAGE (deals/new) ==========
[Init] Token exists: true
[Init] Axios loaded: true
[Init] Starting delayed initialization...
[Sellers] ========== START (Retry: 0 ) ==========
[Sellers] Token: exists (eyJ0eXAiOiJKV1QiL...)
[Sellers] seller_id element found
[Sellers] Calling API: /api/auth/users
[Sellers] Filtered sellers: 4 AGENT users found
[Sellers] ✅ Successfully loaded 4 sellers
```

---

## 💬 報告フォーマット

テスト結果を報告する際は、以下のフォーマットを使用してください:

```
【テスト環境】
- URL: https://933741bf.real-estate-200units-v2.pages.dev
- ブラウザ: Chrome 120.0.0.0
- OS: Windows 11
- キャッシュクリア: 実施済み

【テスト結果】
✅ テスト A: セラードロップダウン - 4人のAGENT表示
✅ テスト B: 物件情報自動取得ボタン - 正常動作
✅ テスト C: 総合リスクチェックボタン - 正常動作

【Console ログ】
（Console ログ全体を貼り付け）

【スクリーンショット】
（添付）
```

---

**最後に**: テスト中に問題が発生した場合、遠慮なく報告してください。詳細な情報があれば、迅速に対応できます。

---

**デプロイ情報**:
- Version: v3.153.8
- Commit: a0d799b
- Date: 2025-12-08
- Critical Fix: JavaScript syntax error in alert statements
