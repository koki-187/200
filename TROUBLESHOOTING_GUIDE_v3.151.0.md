# トラブルシューティングガイド v3.151.0

## 目次
1. [よくある問題と解決策](#よくある問題と解決策)
2. [OCR関連のトラブル](#ocr関連のトラブル)
3. [認証・ログイン問題](#認証ログイン問題)
4. [ファイルアップロード問題](#ファイルアップロード問題)
5. [API関連のエラー](#api関連のエラー)
6. [パフォーマンス問題](#パフォーマンス問題)
7. [iOS Safari特有の問題](#ios-safari特有の問題)
8. [環境変数とデプロイ問題](#環境変数とデプロイ問題)
9. [エラーコード一覧](#エラーコード一覧)

---

## よくある問題と解決策

### 問題1: ページが表示されない（白い画面）

#### 症状
- ブラウザで開いても白い画面のまま
- 読み込み中のまま止まる

#### 原因
- JavaScriptエラー
- キャッシュの問題
- ネットワークエラー

#### 解決策

**ステップ1: ブラウザキャッシュのクリア**
```
Chrome:
1. Shift + F5 でハードリロード
2. または、設定 > プライバシーとセキュリティ > 閲覧履歴データの削除

Safari:
1. Command + Option + E でキャッシュを空にする
2. または、開発 > キャッシュを空にする
```

**ステップ2: ブラウザコンソールの確認**
```
1. F12 または Command + Option + I でデベロッパーツールを開く
2. Consoleタブを確認
3. 赤色のエラーメッセージを確認
```

**ステップ3: シークレットモードで試行**
```
Chrome: Ctrl/Command + Shift + N
Safari: Command + Shift + N
```

**ステップ4: 別のブラウザで試行**
- Chrome → Safari または Firefox に切り替え

---

### 問題2: favicon.ico が404エラー

#### 症状
- ブラウザコンソールに `GET https://real-estate-200units-v2.pages.dev/favicon.ico 404` エラー

#### 原因
- v3.150.0以前のバージョンでfavicon.icoが存在しなかった

#### 解決策（v3.151.0で完全修正）
```bash
# 最新デプロイURLで確認
curl -I https://b3bb6080.real-estate-200units-v2.pages.dev/favicon.ico
# 期待される結果: HTTP/2 200
```

**手動修正が必要な場合**:
```bash
# favicon.icoを生成
cp public/logo-3d-new.png public/favicon.ico

# _routes.jsonにfavicon.icoを追加
# "exclude": ["/favicon.ico", ...]

# 再ビルド
npm run build
npx wrangler pages deploy dist
```

---

## OCR関連のトラブル

### 問題3: OCRが開始しない（iOS Safari）

#### 症状
- ファイル選択後、OCR処理が開始しない
- 「OCR処理中...」メッセージが表示されない

#### 原因
- v3.107.0以前: `fileInput.addEventListener('change')` が欠落
- v3.108.0で完全修正

#### 解決策

**確認1: バージョン確認**
```javascript
// ブラウザコンソールで実行
console.log('App Version:', '3.151.0');
```

**確認2: Change Handlerの確認**
```javascript
// ブラウザコンソールで以下のログを確認
"OCR File Input Change Handler attached"
```

**確認3: イベントリスナーの確認**
```javascript
// deals-new-events.js の内容確認
fileInput.addEventListener('change', async function(event) {
  const selectedFile = event.target.files[0];
  if (!selectedFile) {
    console.log('No file selected');
    return;
  }
  // ...OCR処理
});
```

**解決手順**:
1. ページをリロード（Shift + F5）
2. ブラウザコンソールで `OCR File Input Change Handler attached` を確認
3. ファイルを再選択
4. それでも解決しない場合、管理者に連絡

---

### 問題4: OCR処理が途中で止まる

#### 症状
- 「OCR処理中...」のまま30秒以上経過
- 処理完了メッセージが表示されない

#### 原因
- ネットワークタイムアウト（30秒制限）
- OpenAI API制限
- 画像サイズが大きすぎる

#### 解決策

**ステップ1: ネットワーク接続を確認**
```bash
# Wi-Fi接続を確認
# モバイルデータ接続の場合、Wi-Fiに切り替え
```

**ステップ2: 画像サイズを確認**
```javascript
// 推奨サイズ: 5MB以下
// ファイルサイズ確認
console.log('File size:', selectedFile.size / 1024 / 1024, 'MB');
```

**ステップ3: 画像を縮小**
```
方法1: iPhoneの写真アプリで編集
  1. 写真を開く
  2. 編集 > サイズ変更
  3. 「大」または「中」を選択

方法2: 画像圧縮アプリを使用
  - TinyPNG
  - Image Resizer
```

**ステップ4: タイムアウト設定の確認**
```javascript
// src/routes/ocr.ts の確認
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒
```

---

### 問題5: OCR抽出精度が低い

#### 症状
- 抽出された情報が不正確
- フィールドが空のまま

#### 原因
- 画像の品質が低い
- 文字が不鮮明
- フォーマットが標準と異なる

#### 解決策

**撮影時の注意点**:
```
✅ 推奨:
- 明るい場所で撮影
- 書類全体が写るように撮影
- 手ブレを防ぐ（三脚やスタンド使用）
- 正面から撮影（斜めにならないように）
- 影が入らないように撮影

❌ 避けるべき:
- 暗い場所での撮影
- 一部が切れている
- ピントがずれている
- 反射光が入っている
- 書類が傾いている
```

**PDFの場合**:
```
✅ 推奨:
- テキスト埋め込み型PDF
- 300dpi以上のスキャン
- カラーモード

❌ 避けるべき:
- 画像のみのPDF
- 低解像度スキャン（150dpi以下）
- 白黒コピー
```

---

## 認証・ログイン問題

### 問題6: ログインできない

#### 症状
- 正しいメールアドレスとパスワードを入力してもログインできない
- 「認証に失敗しました」エラー

#### 原因
- 間違ったパスワード
- アカウントがロックされている
- JWT認証エラー

#### 解決策

**ステップ1: 認証情報の確認**
```
テスト用アカウント:
  Email: admin@test.com
  Password: admin123

実運用アカウント:
  Email: navigator-187@docomo.ne.jp
  Password: kouki187
```

**ステップ2: アカウントロックの確認**
```
原因: 連続5回以上のログイン失敗
解決: 30分待機、または管理者に解除依頼
```

**ステップ3: ブラウザキャッシュのクリア**
```bash
# ブラウザの設定から
# プライバシーとセキュリティ > 閲覧履歴データの削除
# - Cookie
# - キャッシュされた画像とファイル
```

**ステップ4: JWT_SECRETの確認（管理者のみ）**
```bash
# Cloudflare Pages環境変数の確認
npx wrangler pages secret list

# 出力に以下が含まれることを確認:
# - JWT_SECRET
# - OPENAI_API_KEY
# - MLIT_API_KEY
```

---

### 問題7: セッションが切れる

#### 症状
- ログイン後、しばらくすると自動的にログアウトされる

#### 原因
- JWTトークンの有効期限切れ（24時間）

#### 解決策
```
正常な動作:
- JWTトークンは24時間で自動的に期限切れ
- セキュリティのための設計仕様

対処法:
- 再度ログイン
- ブラウザに自動ログイン情報を保存
```

---

## ファイルアップロード問題

### 問題8: ファイルがアップロードできない

#### 症状
- 「ファイルをアップロード」ボタンをクリックしても反応しない
- アップロード中にエラーが発生

#### 原因
- ファイルサイズが10MBを超過
- ストレージクォータ（3GB）を超過
- 対応していないファイル形式

#### 解決策

**ステップ1: ファイルサイズの確認**
```javascript
// ブラウザコンソールで確認
console.log('File size:', file.size / 1024 / 1024, 'MB');
// 制限: 10MB以下
```

**ステップ2: ストレージクォータの確認**
```bash
# API経由で確認
curl https://real-estate-200units-v2.pages.dev/api/storage-quota \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 出力例:
# {
#   "used_bytes": 1048576,
#   "limit_bytes": 3221225472,
#   "used_mb": 1,
#   "limit_mb": 3072
# }
```

**ステップ3: ファイル形式の確認**
```
対応形式:
- 画像: JPEG, PNG, HEIC
- ドキュメント: PDF, Word, Excel, PowerPoint

非対応形式:
- 動画ファイル
- 圧縮ファイル（ZIP, RAR）
- 実行ファイル（EXE, DMG）
```

**ステップ4: ファイル圧縮**
```
方法1: 画像圧縮ツール
  - TinyPNG (https://tinypng.com/)
  - Compressor.io (https://compressor.io/)

方法2: PDF圧縮ツール
  - Smallpdf (https://smallpdf.com/)
  - iLovePDF (https://www.ilovepdf.com/)
```

---

### 問題9: ストレージクォータを超過

#### 症状
- `ERR_STORAGE_QUOTA_EXCEEDED` エラー

#### 原因
- ユーザーあたり3GB（3,072MB）の制限を超過

#### 解決策

**ステップ1: 使用状況の確認**
```bash
# ダッシュボードで確認
# または、API経由で確認
curl https://real-estate-200units-v2.pages.dev/api/storage-quota \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**ステップ2: 不要ファイルの削除**
```
1. ファイル一覧を確認
2. 古いまたは不要なファイルを削除
3. ゴミ箱を空にする
```

**ステップ3: 管理者にクォータ増量を依頼**
```
連絡先: navigator-187@docomo.ne.jp
件名: ストレージクォータ増量依頼
内容:
  - ユーザーID
  - 現在の使用量
  - 希望する容量
```

---

## API関連のエラー

### 問題10: 物件情報自動取得が動作しない

#### 症状
- 「物件情報を取得」ボタンをクリックしても反応しない
- `MLIT API Error` が表示される

#### 原因
- v3.149.0以前: MLIT_API_KEY環境変数の設定ミス
- v3.150.0で完全修正

#### 解決策

**確認1: バージョン確認**
```bash
# 本番環境のバージョンを確認
curl https://real-estate-200units-v2.pages.dev/api/health
# 出力例: {"status":"ok","timestamp":"2025-12-06T06:37:51.555Z"}
```

**確認2: REINFOLIB API テスト**
```bash
# テストエンドポイントで確認
curl https://real-estate-200units-v2.pages.dev/api/reinfolib/test

# 期待される出力:
# {"message":"REINFOLIB API is working"}
```

**確認3: 環境変数の確認（管理者のみ）**
```bash
# Cloudflare Pages環境変数
npx wrangler pages secret list

# 出力に以下が含まれることを確認:
# - MLIT_API_KEY
```

**確認4: 実際のAPIコール**
```bash
# 東京都港区六本木の物件情報を取得
curl 'https://real-estate-200units-v2.pages.dev/api/reinfolib/property-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%AF%E5%8C%BA%E5%85%AD%E6%9C%AC%E6%9C%A81-1-1&period=2024%E5%B9%B4%E7%AC%AC4%E5%9B%9B%E5%8D%8A%E6%9C%9F'

# 期待される出力: 232件のデータ配列
```

---

### 問題11: APIレスポンスが遅い

#### 症状
- APIリクエストに10秒以上かかる

#### 原因
- ネットワーク遅延
- APIサーバーの高負荷
- 大量のデータ処理

#### 解決策

**ステップ1: ネットワーク接続の確認**
```bash
# 本番環境へのping確認
ping real-estate-200units-v2.pages.dev
```

**ステップ2: APIレスポンス時間の測定**
```bash
# curlで測定
curl -w "\nTime: %{time_total}s\n" \
  https://real-estate-200units-v2.pages.dev/api/health
```

**ステップ3: ページネーション設定の確認**
```bash
# 案件一覧APIで適切なlimitを設定
curl 'https://real-estate-200units-v2.pages.dev/api/deals?page=1&limit=5'

# limit推奨値:
# - デスクトップ: 20
# - モバイル: 10
```

---

## パフォーマンス問題

### 問題12: ページ読み込みが遅い

#### 症状
- 初期ページ読み込みに10秒以上かかる

#### 原因
- 大きな画像ファイル
- CDNキャッシュミス
- ネットワーク遅延

#### 解決策

**ステップ1: ページ読み込み時間の測定**
```javascript
// ブラウザコンソールで実行
console.log('Page Load Time:', performance.timing.loadEventEnd - performance.timing.navigationStart, 'ms');
```

**ステップ2: ネットワークタブの確認**
```
Chrome DevTools:
1. F12でデベロッパーツールを開く
2. Networkタブを選択
3. ページをリロード
4. 大きなファイルを特定（赤色で表示）
```

**ステップ3: 画像最適化**
```
推奨設定:
- 画像形式: WebP
- 画像サイズ: 1920px以下
- 圧縮率: 80%
```

**ステップ4: CDNキャッシュの活用**
```
Cloudflare Pages:
- 静的ファイルは自動的にキャッシュされる
- キャッシュ期間: 30日間
```

---

## iOS Safari特有の問題

### 問題13: iOSでOCRのファイル選択ができない

#### 症状
- 「ファイルを選択」ボタンをタップしても反応しない

#### 原因
- iOS Safariの制限
- v3.101.0でfallbackメソッド実装

#### 解決策

**ステップ1: ブラウザバージョンの確認**
```
設定 > Safari > 詳細 > Safari のバージョン
推奨: iOS 15.0以降
```

**ステップ2: JavaScript有効化の確認**
```
設定 > Safari > 詳細 > JavaScript
スイッチがオンになっていることを確認
```

**ステップ3: サイト設定の確認**
```
設定 > Safari > Webサイト設定 > real-estate-200units-v2.pages.dev
カメラとファイルへのアクセスを許可
```

---

### 問題14: iOSでレイアウトが崩れる

#### 症状
- ボタンが小さくてタップしづらい
- テキストが画面外にはみ出る

#### 原因
- v3.107.0以前: iOS対応が不十分
- v3.107.0でiOS UI/UX改善

#### 解決策

**確認1: バージョン確認**
```javascript
// ブラウザコンソールで確認
console.log('App Version:', '3.151.0');
```

**確認2: Viewport設定の確認**
```html
<!-- index.html の meta viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

**確認3: iOS固有のスタイル調整**
```css
/* iOS Safari用の調整 */
@supports (-webkit-touch-callout: none) {
  button {
    min-height: 44px; /* Appleのガイドライン */
    min-width: 44px;
  }
}
```

---

## 環境変数とデプロイ問題

### 問題15: 本番環境でOCRが動作しない

#### 症状
- ローカル環境では動作するが、本番環境では動作しない

#### 原因
- OPENAI_API_KEY環境変数が未設定または誤設定

#### 解決策（管理者のみ）

**ステップ1: 環境変数の確認**
```bash
# Cloudflare Pages環境変数の確認
npx wrangler pages secret list

# 出力に以下が含まれることを確認:
# - OPENAI_API_KEY
# - JWT_SECRET
# - MLIT_API_KEY
# - RESEND_API_KEY
# - SENTRY_DSN
```

**ステップ2: 環境変数の設定**
```bash
# OpenAI API Keyの設定
npx wrangler pages secret put OPENAI_API_KEY

# プロンプトでAPI Keyを入力
```

**ステップ3: デプロイの再実行**
```bash
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist
```

**ステップ4: 動作確認**
```bash
# OCR APIのテスト
curl -X POST https://real-estate-200units-v2.pages.dev/api/ocr \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-image.jpg"
```

---

### 問題16: デプロイ後にバージョンが更新されない

#### 症状
- 新しいバージョンをデプロイしても、古いバージョンが表示される

#### 原因
- ブラウザキャッシュ
- CDNキャッシュ
- Service Workerのキャッシュ

#### 解決策

**ステップ1: ブラウザキャッシュのクリア**
```
Chrome: Shift + F5
Safari: Command + Shift + R
```

**ステップ2: Service Workerの削除**
```javascript
// ブラウザコンソールで実行
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
```

**ステップ3: 新しいデプロイURLで確認**
```bash
# 最新のデプロイURLを確認
npx wrangler pages deployment list

# 新しいURLでアクセス
# 例: https://b3bb6080.real-estate-200units-v2.pages.dev/
```

---

## エラーコード一覧

### ERR_OCR_TIMEOUT
```
原因: OCR処理が30秒以内に完了しなかった
対処法:
  1. 画像サイズを縮小（5MB以下推奨）
  2. Wi-Fi接続を確認
  3. 再度アップロード
```

### ERR_API_AUTH_FAILED
```
原因: 認証トークンが無効または期限切れ
対処法:
  1. ログアウト後、再ログイン
  2. ブラウザのキャッシュをクリア
  3. それでも解決しない場合、管理者に連絡
```

### ERR_STORAGE_QUOTA_EXCEEDED
```
原因: ストレージクォータ（3GB）を超過
対処法:
  1. 不要なファイルを削除
  2. 管理者にクォータ増量を依頼
```

### ERR_FILE_TOO_LARGE
```
原因: ファイルサイズが10MBを超過
対処法:
  1. ファイルサイズを圧縮
  2. 複数のファイルに分割
```

### ERR_INVALID_FILE_TYPE
```
原因: 対応していないファイル形式
対処法:
  1. 対応形式を確認（JPEG, PNG, PDF等）
  2. ファイル形式を変換
```

### ERR_DB_CONNECTION_FAILED
```
原因: データベース接続エラー
対処法:
  1. しばらく時間をおいて再試行
  2. それでも解決しない場合、管理者に連絡
```

### ERR_MLIT_API_FAILED
```
原因: 国土交通省APIエラー
対処法:
  1. 住所を詳細に入力（番地まで）
  2. しばらく時間をおいて再試行
  3. v3.150.0以降へのアップグレード
```

### ERR_PERMISSION_DENIED
```
原因: アクセス権限がない
対処法:
  1. 管理者に権限の確認を依頼
  2. 適切なロール（ADMIN/AGENT）でログイン
```

---

## サポート情報

### お問い合わせ先
- **システム管理者**: navigator-187@docomo.ne.jp
- **GitHub Issues**: https://github.com/koki-187/200
- **API ドキュメント**: https://real-estate-200units-v2.pages.dev/api/docs

### デバッグ情報の収集方法
```
問題報告時に以下の情報を提供:
1. バージョン番号（v3.151.0）
2. ブラウザとOSの情報
3. エラーメッセージのスクリーンショット
4. ブラウザコンソールのログ
5. 再現手順
```

### ログの確認方法
```javascript
// ブラウザコンソールを開く
// Chrome: F12 または Command + Option + I
// Safari: Command + Option + I

// 全てのログを表示
console.log('App Version:', '3.151.0');
console.log('Environment:', 'production');
```

---

**最終更新日**: 2025-12-06  
**ドキュメントバージョン**: 1.0.0  
**対象システムバージョン**: v3.151.0
