# 環境変数設定ガイド

## 根本原因

OCRと物件情報自動入力機能が動作しない根本原因は、**本番環境（Cloudflare Pages）に必要なAPI Keyが設定されていないこと**です。

### 必要な環境変数

以下の環境変数をCloudflare Pagesに設定する必要があります：

1. **MLIT_API_KEY** - 国土交通省の不動産情報ライブラリAPI Key
   - 値: `cc077c568d8e4b0e917cb0660298821e`
   - 用途: 物件情報自動入力機能

2. **OPENAI_API_KEY** - OpenAI API Key
   - 値: `sk-proj-xsXysPR49r6wq4BOhUjCT3BlbkFJZVS3PQMp3dXH8h9J7Kp2`
   - 用途: OCR機能（登記簿謄本の自動読み取り）

3. **JWT_SECRET** - JWT認証シークレット
   - 値: `your-super-secret-jwt-key-change-this-in-production-2024`
   - 用途: ユーザー認証

4. **RESEND_API_KEY** - Resend API Key（メール送信用）
   - 値: `re_Ns5TSSqs_2Gc1G2ezZP6KPU637JkEDDF8`
   - 用途: メール通知機能

## 設定手順（方法1: wrangler CLIを使用）

### 前提条件
- `setup_cloudflare_api_key` が実行済みであること
- `CLOUDFLARE_API_TOKEN` 環境変数が設定されていること

### コマンド実行

```bash
cd /home/user/webapp

# MLIT_API_KEY を設定
echo "cc077c568d8e4b0e917cb0660298821e" | npx wrangler pages secret put MLIT_API_KEY --project-name real-estate-200units-v2

# OPENAI_API_KEY を設定
echo "sk-proj-xsXysPR49r6wq4BOhUjCT3BlbkFJZVS3PQMp3dXH8h9J7Kp2" | npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2

# JWT_SECRET を設定
echo "your-super-secret-jwt-key-change-this-in-production-2024" | npx wrangler pages secret put JWT_SECRET --project-name real-estate-200units-v2

# RESEND_API_KEY を設定
echo "re_Ns5TSSqs_2Gc1G2ezZP6KPU637JkEDDF8" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
```

### 設定確認

```bash
# 設定された環境変数のリストを確認
npx wrangler pages secret list --project-name real-estate-200units-v2
```

## 設定手順（方法2: Cloudflare Dashboardを使用）

### Web UIでの設定

1. Cloudflare Dashboard にアクセス
   - URL: https://dash.cloudflare.com/
   
2. **Workers & Pages** セクションに移動

3. `real-estate-200units-v2` プロジェクトを選択

4. **Settings** タブをクリック

5. **Environment variables** セクションまでスクロール

6. **Production** 環境で以下の変数を追加：

   | Variable Name | Value |
   |---|---|
   | MLIT_API_KEY | `cc077c568d8e4b0e917cb0660298821e` |
   | OPENAI_API_KEY | `sk-proj-xsXysPR49r6wq4BOhUjCT3BlbkFJZVS3PQMp3dXH8h9J7Kp2` |
   | JWT_SECRET | `your-super-secret-jwt-key-change-this-in-production-2024` |
   | RESEND_API_KEY | `re_Ns5TSSqs_2Gc1G2ezZP6KPU637JkEDDF8` |

7. **Save** をクリック

## 設定後の確認

環境変数の設定後、以下の手順で動作確認を行ってください：

### 1. ブラウザのキャッシュをクリア

**Chromeの場合:**
```
1. Ctrl+Shift+Delete（Windowsの場合）または Cmd+Shift+Delete（Macの場合）
2. 「閲覧履歴データの削除」で「キャッシュされた画像とファイル」にチェック
3. 「データを削除」をクリック
```

**またはシークレットウィンドウを使用:**
```
Ctrl+Shift+N（Windowsの場合）または Cmd+Shift+N（Macの場合）
```

### 2. アプリケーションにアクセス

```
URL: https://real-estate-200units-v2.pages.dev
Email: navigator-187@docomo.ne.jp
Password: kouki187
```

### 3. 機能テスト

#### 物件情報自動入力のテスト
1. `/deals/new` ページに移動
2. 「所在地」フィールドに `東京都港区六本木1-1-1` を入力
3. 「物件情報を自動入力」ボタンをクリック
4. 以下を確認：
   - 10項目が自動入力されること（土地面積、用途地域、建蔽率、容積率、道路情報、間口、建物面積、構造、築年月、希望価格）
   - アラートメッセージ「✅ XX項目を自動入力しました」が表示されること

#### OCR機能のテスト
1. `/deals/new` ページのOCRセクション
2. 登記簿謄本PDFまたは画像をアップロード
3. OCR処理が正常に実行されること
4. 17項目が自動抽出されること

### 4. エラーログ確認

**Consoleを開く（F12）**
```
# 期待されるログ:
[不動産情報ライブラリ] ========================================
[不動産情報ライブラリ] トークン取得: true
[不動産情報ライブラリ] 住所: 東京都港区六本木1-1-1
[不動産情報ライブラリ] リクエスト送信: {address: '東京都港区六本木1-1-1', year: 2024, quarter: 4}
[不動産情報ライブラリ] ✅ レスポンス受信: {success: true, ...}

# エラーが出る場合（環境変数未設定）:
❌ 認証エラー
MLIT_API_KEYが設定されていないか、認証トークンが無効です。
```

## トラブルシューティング

### 環境変数が反映されない場合

1. **再デプロイが必要：** 環境変数の変更後は、アプリケーションを再デプロイする必要がある場合があります。
   ```bash
   cd /home/user/webapp
   npm run build
   npx wrangler pages deploy dist --project-name real-estate-200units-v2
   ```

2. **キャッシュのクリア：** ブラウザとCloudflareの両方のキャッシュをクリアしてください。

3. **Production環境の確認：** 環境変数が **Production** 環境に設定されていることを確認してください（Preview環境ではない）。

### それでも動作しない場合

1. **Consoleログを確認：** F12キーでConsoleを開き、エラーメッセージを確認
2. **Networkタブを確認：** API リクエストが401または500エラーを返していないか確認
3. **エラーメッセージを報告：** エラーの詳細情報（スクリーンショット、Consoleログ）を開発チームに報告

## 重要な注意事項

- **セキュリティ：** API Keyは機密情報です。`.dev.vars` ファイルは `.gitignore` に含まれており、Gitにコミットされません。
- **本番環境のAPI Key：** 本番環境では、より安全なAPI Keyを使用することを推奨します。
- **定期的な更新：** API Keyは定期的に更新し、古いキーは無効化してください。

## 次のステップ

環境変数の設定後：
1. 実際に機能をテストする
2. 問題が解決されたことを確認する
3. ユーザーに動作確認を依頼する
4. 必要に応じて追加のエラーハンドリングを実装する
