# 最終ユーザーテスト手順 v3.153.14

## 🔗 最新デプロイURL
```
https://5c9c4dd5.real-estate-200units-v2.pages.dev
```

## ✅ バックエンドAPI動作確認済み

以下のAPIは **完全に動作している** ことを確認済みです：

```bash
# Login API
✅ POST /api/auth/login

# Sellers API (4 AGENT users取得成功)
✅ GET /api/auth/users

# Property Info API
✅ GET /api/reinfolib/property-info

# Risk Check API
✅ GET /api/reinfolib/comprehensive-check
```

## 🧪 ユーザーテスト手順

### 📋 テスト 1: 売主ドロップダウン

1. **ブラウザで以下のURLを開く**
   ```
   https://5c9c4dd5.real-estate-200units-v2.pages.dev
   ```

2. **ログイン**
   - Email: `navigator-187@docomo.ne.jp`
   - Password: `kouki187`

3. **「新規登録」ボタンをクリック** → `/deals/new` ページに移動

4. **売主ドロップダウンを確認**
   - 「売主」ドロップダウンを開く
   - 以下の4人が表示されているか確認：
     - 本番テスト担当者 (本番テスト不動産)
     - テスト担当者 (不動産仲介株式会社)
     - 田中太郎 (不動産ABC株式会社)
     - 佐藤花子 (株式会社XYZ不動産)

5. **ブラウザコンソールを確認** (F12 → Console)
   - 以下のログが表示されているか：
     ```
     [Sellers] ========== START (Retry: 0) ==========
     [Sellers] Token: exists (eyJ0eXAiOiJKV1Q...)
     [Sellers] Calling API: /api/auth/users
     [Sellers] Filtered sellers: 4 AGENT users found
     [Sellers] ✅ Successfully loaded 4 sellers
     ```

### 📋 テスト 2: 物件情報自動取得ボタン

1. **「所在地」フィールドに住所を入力**
   ```
   東京都板橋区蓮根三丁目17-7
   ```

2. **「🏢 物件情報自動取得」ボタンをクリック**

3. **以下のフィールドが自動入力されるか確認**
   - 土地面積
   - 用途地域
   - 建ぺい率
   - 容積率
   - 間口
   - 建築面積
   - 構造

4. **ブラウザコンソールを確認**
   - エラーが表示されていないか
   - `[Property Info]` 関連のログが表示されているか

### 📋 テスト 3: 総合リスクチェックボタン

1. **「所在地」フィールドに住所を入力**（テスト2と同じ）
   ```
   東京都板橋区蓮根三丁目17-7
   ```

2. **「⚠️ 総合リスクチェック」ボタンをクリック**

3. **リスクチェック結果が表示されるか確認**
   - 都道府県
   - 市区町村
   - 融資判定

4. **ブラウザコンソールを確認**
   - エラーが表示されていないか
   - `[Risk Check]` 関連のログが表示されているか

## 🔍 デバッグ情報

### もし売主ドロップダウンが空の場合：

ブラウザコンソール (F12) で以下を実行してください：

```javascript
// 1. Token確認
console.log('Token:', localStorage.getItem('auth_token') ? 'exists' : 'NULL');

// 2. loadSellers関数の存在確認
console.log('typeof window.loadSellers:', typeof window.loadSellers);

// 3. 手動でloadSellersを実行
if (typeof window.loadSellers === 'function') {
  window.loadSellers();
} else {
  console.error('window.loadSellers is not a function');
}

// 4. seller_id要素の確認
const select = document.getElementById('seller_id');
console.log('seller_id element:', select);
console.log('Current options:', select ? select.options.length : 'element not found');
```

## 📝 期待される結果

### ✅ 成功の場合：
- 売主ドロップダウンに4人のAGENTが表示される
- 物件情報自動取得ボタンが動作し、フィールドが自動入力される
- 総合リスクチェックボタンが動作し、結果が表示される
- ブラウザコンソールにエラーが表示されない

### ❌ 失敗の場合：
- 売主ドロップダウンが空
- ボタンをクリックしても反応しない
- ブラウザコンソールにエラーが表示される

その場合は、以下の情報をご提供ください：
1. ブラウザコンソールの全ログ（スクリーンショット）
2. 売主ドロップダウンのスクリーンショット
3. 「デバッグ情報」セクションのコマンド実行結果

## 🔧 技術的詳細

### v3.153.14での修正内容：
1. **JavaScript構文エラー修正**: `return` statement をトップレベルから削除
2. **loadSellers関数のグローバルエクスポート**: `window.loadSellers = loadSellers;`
3. **Emergency script追加**: `loadSellers` が自動実行されない場合の強制実行
4. **setTimeout時間短縮**: 500ms → 100ms（早期実行）

### 関連ファイル：
- `src/index.tsx` (Line 6400: loadSellers, Line 8818: initializePage)
- `public/static/ocr-init.js`
- `public/static/deals-new-events.js`

### デプロイ履歴：
- v3.153.8: JavaScript構文エラー修正（escape newlines）
- v3.153.11: loadSellers グローバルエクスポート + setTimeout短縮
- v3.153.12: `return` statement 修正
- v3.153.14: loadSellers 関数宣言 + 個別グローバル代入

---

**最終確認日時**: 2025-12-08
**デプロイID**: 5c9c4dd5
**プロジェクト名**: real-estate-200units-v2
