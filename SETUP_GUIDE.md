# 📘 完全セットアップガイド - データベース＆ストレージ有効化

**対象ユーザー**: 技術的な背景知識が少ない方向けの詳細ガイド  
**所要時間**: 約15〜20分  
**目的**: 本番環境（https://real-estate-200units-v2.pages.dev）で完全な機能を使えるようにする

---

## 📋 目次

1. [現在の状態と必要な作業](#現在の状態と必要な作業)
2. [ステップ1: APIトークンに権限を追加](#ステップ1-apiトークンに権限を追加)
3. [ステップ2: D1データベースの作成](#ステップ2-d1データベースの作成)
4. [ステップ3: R2ストレージの作成](#ステップ3-r2ストレージの作成)
5. [ステップ4: 設定ファイルの更新](#ステップ4-設定ファイルの更新)
6. [ステップ5: 本番環境へ再デプロイ](#ステップ5-本番環境へ再デプロイ)
7. [ステップ6: 環境変数の追加設定（オプション）](#ステップ6-環境変数の追加設定オプション)
8. [動作確認とトラブルシューティング](#動作確認とトラブルシューティング)

---

## 現在の状態と必要な作業

### ✅ 現在動作している機能
- 基本的なAPIエンドポイント（ヘルスチェック、バージョン情報）
- APIドキュメント（Scalar UI）
- 静的ページ（オンボーディング、ヘルプ、用語集）
- Service Worker（プッシュ通知の準備）

### ⚠️ 動作していない機能（これから有効化）
- **ログイン・認証機能**（データベースがないため）
- **案件管理、メッセージ、ファイル管理**（データベースがないため）
- **ファイルアップロード**（ストレージがないため）
- **バックアップ機能**（ストレージがないため）

### 🎯 必要な作業（この順番で実施）
1. Cloudflare APIトークンに「D1」と「R2」の権限を追加
2. D1データベースを作成
3. R2ストレージバケットを作成
4. 設定ファイルを更新
5. 本番環境に再デプロイ

---

## ステップ1: APIトークンに権限を追加

### なぜ必要？
現在のAPIトークンには、Cloudflare Pagesへのデプロイ権限しかありません。  
データベース（D1）とストレージ（R2）を作成・管理するには、それぞれの権限が必要です。

### 手順（画像付きで説明）

#### 1-1. Cloudflareダッシュボードにアクセス
1. ブラウザで以下のURLを開く:  
   👉 **https://dash.cloudflare.com/profile/api-tokens**

2. ログインしていない場合は、メールアドレスとパスワードでログイン

#### 1-2. 既存のAPIトークンを探す
- 画面に表示されているトークン一覧から、現在使用しているトークンを探します
- おそらく以下のような名前になっています:
  - `Cloudflare Pages Deploy`
  - `My API Token`
  - `Wrangler Token`
  - または自分で設定した名前

#### 1-3. トークンを編集する
1. 該当トークンの右端にある **「編集」**（または「Edit」）ボタンをクリック

2. **Permissions（権限）** セクションまでスクロール

3. 現在は以下のような権限のみがあるはずです:
   - `Account` → `Cloudflare Pages` → `Edit`

#### 1-4. D1とR2の権限を追加
1. **「+ Add more」** ボタンをクリック

2. 以下を選択:
   - **Scope（範囲）**: `Account`
   - **Permission（権限）**: `D1`
   - **Access（アクセス）**: `Edit`

3. もう一度 **「+ Add more」** をクリック

4. 以下を選択:
   - **Scope（範囲）**: `Account`
   - **Permission（権限）**: `Workers R2 Storage`
   - **Access（アクセス）**: `Edit`

#### 1-5. 保存する
1. ページ下部の **「Continue to summary」** ボタンをクリック

2. 変更内容を確認し、**「Update Token」** ボタンをクリック

3. ✅ **成功メッセージが表示されればOK！**

### ⚠️ 注意点
- トークン自体（文字列）を再度コピーする必要はありません
- 既存のトークンに権限を追加しただけなので、設定し直す必要はありません
- 次のステップ（D1作成）でエラーが出なければ、権限追加成功です

---

## ステップ2: D1データベースの作成

### D1とは？
Cloudflare D1は、SQLiteベースのグローバル分散データベースです。  
ユーザー情報、案件データ、メッセージなどを保存します。

### 手順

#### 2-1. サンドボックスでコマンド実行
このステップは、私（AI）がサポートします。以下のコマンドを実行します:

```bash
cd /home/user/webapp && npx wrangler d1 create webapp-production
```

**実行結果の例**:
```
✅ Successfully created DB 'webapp-production'

[[d1_databases]]
binding = "DB"
database_name = "webapp-production"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  ← これをメモ！
```

#### 2-2. Database IDをメモ
- 出力された **`database_id`**（例: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`）をメモ
- 次のステップ4で使用します

#### 2-3. データベース構造を作成（マイグレーション）
私が以下のコマンドを実行します:

```bash
# 本番環境のD1にテーブル構造を適用
npx wrangler d1 migrations apply webapp-production
```

このコマンドで、以下のテーブルが作成されます:
- `users`（ユーザー情報）
- `properties`（物件情報）
- `deals`（案件情報）
- `messages`（メッセージ）
- `files`（ファイルメタデータ）
- など、全15テーブル

#### 2-4. 初期データを投入（オプション）
テスト用の管理者アカウントを作成します（推奨）:

```bash
npx wrangler d1 execute webapp-production --file=./seed.sql
```

これで以下のアカウントが使えるようになります:
- **Email**: `admin@example.com`
- **Password**: `Admin!2025`

---

## ステップ3: R2ストレージの作成

### R2とは？
Cloudflare R2は、S3互換のオブジェクトストレージです。  
ファイルアップロード（契約書PDF、物件写真など）やバックアップデータを保存します。

### 手順

#### 3-1. R2バケットを作成
私が以下のコマンドを実行します:

```bash
npx wrangler r2 bucket create webapp-files
```

**実行結果の例**:
```
✅ Created bucket 'webapp-files' with default storage class set to Standard.
```

これだけで完了です！R2はバケット名だけで接続できます。

---

## ステップ4: 設定ファイルの更新

### 何をするの？
`wrangler.jsonc`というファイルに、ステップ2で取得した**Database ID**を追加します。

### 手順

#### 4-1. 現在の設定ファイルを確認
私が現在の `wrangler.jsonc` を読み取ります。

#### 4-2. D1とR2の設定を追加
私が以下の内容を追加します:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  // ← ここから追加
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "【ステップ2でメモしたID】",  // ← ここに設定
      "migrations_dir": "migrations"
    }
  ],

  "r2_buckets": [
    {
      "binding": "R2_FILES",
      "bucket_name": "webapp-files"
    }
  ]
  // ← ここまで追加
}
```

#### 4-3. 保存とGitコミット
私が以下を実行します:

```bash
git add wrangler.jsonc
git commit -m "feat: add D1 and R2 configuration for production"
```

---

## ステップ5: 本番環境へ再デプロイ

### なぜ再デプロイが必要？
設定ファイル（`wrangler.jsonc`）を更新したので、新しい設定で本番環境を更新する必要があります。

### 手順

#### 5-1. ビルド
私が以下を実行します:

```bash
cd /home/user/webapp && npm run build
```

これで、最新のコードがコンパイルされます（1〜2分かかります）。

#### 5-2. デプロイ
私が以下を実行します:

```bash
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

**実行結果の例**:
```
✅ Deployment complete! Take a peek over at
  https://real-estate-200units-v2.pages.dev
```

#### 5-3. 完了！
これで、**データベースとストレージが有効化された本番環境**がデプロイされました！🎉

---

## ステップ6: 環境変数の追加設定（オプション）

これらは必須ではありませんが、追加機能を有効化するために推奨されます。

### 6-1. JWT_SECRET（認証用の秘密鍵）
**目的**: ユーザー認証の安全性を高める

```bash
# ランダムな強力な秘密鍵を生成して設定
echo "$(openssl rand -base64 32)" | npx wrangler pages secret put JWT_SECRET --project-name real-estate-200units-v2
```

### 6-2. OPENAI_API_KEY（OCR機能用）
**目的**: 契約書PDFから自動でテキストを抽出

**取得方法**:
1. https://platform.openai.com/api-keys にアクセス
2. 「Create new secret key」をクリック
3. キーをコピー

**設定**:
```bash
echo "sk-proj-XXXXXXXXXXXXXXXX" | npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
```

### 6-3. RESEND_API_KEY（メール通知用）
**目的**: 案件更新時にメール通知を送信

**取得方法**:
1. https://resend.com/api-keys にアクセス
2. 「Create API Key」をクリック
3. キーをコピー

**設定**:
```bash
echo "re_XXXXXXXXXXXXXXXX" | npx wrangler pages secret put RESEND_API_KEY --project-name real-estate-200units-v2
```

### 6-4. SENTRY_DSN（エラートラッキング用）
**目的**: 本番環境のエラーを自動で記録・通知

**取得方法**:
1. https://sentry.io にアクセス
2. プロジェクトを作成
3. DSN（例: `https://xxxxx@sentry.io/xxxxx`）をコピー

**設定**:
```bash
echo "https://xxxxx@sentry.io/xxxxx" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
```

### 6-5. GA_MEASUREMENT_ID（Googleアナリティクス用）
**目的**: アクセス解析・ユーザー行動追跡

**取得方法**:
1. https://analytics.google.com にアクセス
2. プロパティを作成
3. 測定ID（例: `G-XXXXXXXXXX`）をコピー

**設定**:
```bash
echo "G-XXXXXXXXXX" | npx wrangler pages secret put GA_MEASUREMENT_ID --project-name real-estate-200units-v2
```

---

## 動作確認とトラブルシューティング

### ✅ 動作確認方法

#### 1. ログイン機能をテスト
1. https://real-estate-200units-v2.pages.dev にアクセス
2. 以下のアカウントでログイン:
   - **Email**: `admin@example.com`
   - **Password**: `Admin!2025`
3. ✅ ダッシュボードが表示されればOK！

#### 2. API動作確認（curlコマンド）
私が以下のコマンドでテストします:

```bash
# ログインAPIテスト
curl -X POST https://real-estate-200units-v2.pages.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin!2025"}'

# 期待される結果: JWTトークンが返される
```

#### 3. ファイルアップロードテスト
ブラウザで案件管理画面にアクセスし、ファイルをアップロードしてみます。

---

### ❌ トラブルシューティング

#### 問題1: D1作成時に「Authentication error」
**原因**: APIトークンの権限が反映されていない

**解決方法**:
1. ステップ1をもう一度確認
2. 権限追加後、5〜10分待つ（Cloudflareの反映に時間がかかる場合がある）
3. 再度 `npx wrangler d1 create` を実行

#### 問題2: ログインできない
**原因**: D1マイグレーションが実行されていない、またはシードデータが未投入

**解決方法**:
```bash
# マイグレーション再実行
npx wrangler d1 migrations apply webapp-production

# シードデータ投入
npx wrangler d1 execute webapp-production --file=./seed.sql
```

#### 問題3: ファイルアップロードで500エラー
**原因**: R2バケットが作成されていない、または設定ミス

**解決方法**:
```bash
# R2バケット確認
npx wrangler r2 bucket list

# webapp-files が表示されない場合は再作成
npx wrangler r2 bucket create webapp-files
```

#### 問題4: デプロイは成功したが機能が動かない
**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# 設定済み環境変数を確認
npx wrangler pages secret list --project-name real-estate-200units-v2

# JWT_SECRET が表示されない場合は設定
echo "$(openssl rand -base64 32)" | npx wrangler pages secret put JWT_SECRET --project-name real-estate-200units-v2
```

---

## 📊 完了チェックリスト

すべて✅になれば、完全な機能が使えます！

- [ ] **ステップ1**: APIトークンにD1とR2の権限を追加
- [ ] **ステップ2**: D1データベース作成（database_idをメモ）
- [ ] **ステップ3**: R2バケット作成
- [ ] **ステップ4**: wrangler.jsoncに設定追加
- [ ] **ステップ5**: 本番環境に再デプロイ
- [ ] **動作確認**: ログイン成功
- [ ] **動作確認**: 案件作成・編集成功
- [ ] **動作確認**: ファイルアップロード成功

### オプション（推奨）
- [ ] **ステップ6-1**: JWT_SECRET設定
- [ ] **ステップ6-2**: OPENAI_API_KEY設定
- [ ] **ステップ6-3**: RESEND_API_KEY設定
- [ ] **ステップ6-4**: SENTRY_DSN設定
- [ ] **ステップ6-5**: GA_MEASUREMENT_ID設定

---

## 🎉 完了後の状態

すべてのステップを完了すると、以下が使えるようになります:

### ✅ 有効化される機能
- ✅ ユーザーログイン・認証
- ✅ 案件管理（作成・編集・削除）
- ✅ メッセージ送受信
- ✅ ファイルアップロード（契約書、写真など）
- ✅ バックアップ・リストア
- ✅ 通知設定
- ✅ フィードバック送信
- ✅ Analytics（KPIダッシュボード）

### 📊 システムアーキテクチャ
```
【ユーザー】
    ↓
【Cloudflare Pages】
    ↓
【Hono API】 ← JWT認証
    ↓
┌─────────────┬─────────────┐
│   D1 DB     │   R2 Files  │
│ ユーザー    │  契約書PDF  │
│ 案件データ  │  物件写真   │
│ メッセージ  │  バックアップ│
└─────────────┴─────────────┘
```

---

## 📞 サポート

何か問題があれば、以下を確認してください:

1. **Cloudflare Dashboard**  
   https://dash.cloudflare.com/pages  
   → デプロイログを確認

2. **API Docs（エラーコード説明）**  
   https://real-estate-200units-v2.pages.dev/api/docs

3. **トラブルシューティングセクション**  
   このガイドの上記セクションを参照

4. **プロジェクトログ**  
   ```bash
   # ローカルでログ確認
   pm2 logs webapp --nostream
   ```

---

**作成日**: 2025-11-17  
**対象バージョン**: v2.0.1  
**本番URL**: https://real-estate-200units-v2.pages.dev

**次のステップ**: まずは **ステップ1（APIトークン権限追加）** から始めてください！
