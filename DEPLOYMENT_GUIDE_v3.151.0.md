# デプロイメントガイド v3.151.0

## 目次
1. [デプロイメント概要](#デプロイメント概要)
2. [前提条件](#前提条件)
3. [環境変数の設定](#環境変数の設定)
4. [ローカル開発環境](#ローカル開発環境)
5. [本番環境へのデプロイ](#本番環境へのデプロイ)
6. [データベースマイグレーション](#データベースマイグレーション)
7. [デプロイ後の検証](#デプロイ後の検証)
8. [ロールバック手順](#ロールバック手順)
9. [トラブルシューティング](#トラブルシューティング)

---

## デプロイメント概要

### アーキテクチャ
- **フロントエンド**: Hono + TypeScript + TailwindCSS
- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1（SQLite）
- **ストレージ**: Cloudflare R2
- **認証**: JWT (JSON Web Token)
- **CI/CD**: Wrangler CLI

### デプロイ先
- **プラットフォーム**: Cloudflare Pages
- **プロジェクト名**: `real-estate-200units-v2`
- **本番URL**: https://real-estate-200units-v2.pages.dev/
- **最新デプロイURL**: https://b3bb6080.real-estate-200units-v2.pages.dev/

---

## 前提条件

### 必要なツール
```bash
# Node.js (v18以降)
node --version
# v18.0.0以降

# npm (v9以降)
npm --version
# v9.0.0以降

# Wrangler CLI
npm install -g wrangler
wrangler --version
# 3.78.0以降
```

### Cloudflareアカウント
1. Cloudflareアカウントの作成: https://dash.cloudflare.com/sign-up
2. API Tokenの取得: https://dash.cloudflare.com/profile/api-tokens
   - 必要な権限: `Cloudflare Pages:Edit`、`D1:Edit`、`R2:Edit`

### リポジトリのクローン
```bash
# GitHubからクローン
git clone https://github.com/koki-187/200.git
cd 200

# または、ローカルで既に開発している場合
cd /home/user/webapp
```

---

## 環境変数の設定

### ローカル開発用（.dev.vars）
```bash
# .dev.varsファイルを作成（gitignoreに含める）
cat > .dev.vars << 'EOF'
# JWT認証
JWT_SECRET=your-jwt-secret-key-min-32-chars

# OpenAI API（OCR機能用）
OPENAI_API_KEY=sk-your-openai-api-key

# 国土交通省 不動産情報ライブラリAPI
MLIT_API_KEY=your-mlit-api-key

# Resend（メール送信用）
RESEND_API_KEY=re_your-resend-api-key

# Sentry（エラートラッキング用、オプション）
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
EOF
```

### 本番環境用（Cloudflare Pages Secrets）
```bash
# Wrangler CLIで環境変数を設定
npx wrangler pages secret put JWT_SECRET
# プロンプトで値を入力: your-jwt-secret-key-min-32-chars

npx wrangler pages secret put OPENAI_API_KEY
# プロンプトで値を入力: sk-your-openai-api-key

npx wrangler pages secret put MLIT_API_KEY
# プロンプトで値を入力: your-mlit-api-key

npx wrangler pages secret put RESEND_API_KEY
# プロンプトで値を入力: re_your-resend-api-key

npx wrangler pages secret put SENTRY_DSN
# プロンプトで値を入力: https://your-sentry-dsn@sentry.io/project-id
```

### 環境変数の確認
```bash
# 本番環境の環境変数を確認
npx wrangler pages secret list

# 期待される出力:
# [
#   {"name": "JWT_SECRET"},
#   {"name": "OPENAI_API_KEY"},
#   {"name": "MLIT_API_KEY"},
#   {"name": "RESEND_API_KEY"},
#   {"name": "SENTRY_DSN"}
# ]
```

---

## ローカル開発環境

### 依存関係のインストール
```bash
cd /home/user/webapp
npm install
```

### D1データベースのセットアップ（ローカル）
```bash
# ローカルD1データベースにマイグレーションを適用
npx wrangler d1 migrations apply webapp-production --local

# テストデータの投入（オプション）
npx wrangler d1 execute webapp-production --local --file=./seed.sql
```

### ローカルサーバーの起動
```bash
# ビルド（初回のみ必須）
npm run build

# PM2で開発サーバーを起動
pm2 start ecosystem.config.cjs

# または、npm scriptで直接起動
npm run dev:sandbox
```

### 動作確認
```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# 期待される出力:
# {"status":"ok","timestamp":"2025-12-06T06:37:51.555Z"}

# ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# 期待される出力:
# {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{...}}
```

---

## 本番環境へのデプロイ

### デプロイ前のチェックリスト
```bash
# ✅ 環境変数が全て設定されているか確認
npx wrangler pages secret list

# ✅ データベースマイグレーションが完了しているか確認
npx wrangler d1 migrations list webapp-production

# ✅ ビルドが成功するか確認
npm run build

# ✅ 静的ファイルが正しく配置されているか確認
ls -la dist/

# ✅ _routes.jsonが正しく生成されているか確認
cat dist/_routes.json

# ✅ favicon.icoが存在するか確認
ls -la dist/favicon.ico
```

### デプロイの実行
```bash
# ステップ1: ビルド
cd /home/user/webapp
npm run build

# ステップ2: デプロイ（初回）
npx wrangler pages deploy dist \
  --project-name real-estate-200units-v2 \
  --branch main

# ステップ3: デプロイURLの確認
# 出力例:
# ✨ Success! Uploaded 15 files (10.2 sec)
# ✨ Deployment complete! Take a peek over at https://b3bb6080.real-estate-200units-v2.pages.dev

# ステップ4: 本番URLの自動更新
# main branchへのデプロイは自動的に本番URL（https://real-estate-200units-v2.pages.dev/）に反映されます
```

### 継続的なデプロイ
```bash
# v3.151.0の場合
cd /home/user/webapp

# ステップ1: コード変更のコミット
git add .
git commit -m "feat: v3.151.0 - Final Release Candidate"

# ステップ2: GitHubへプッシュ（オプション）
git push origin main

# ステップ3: ビルドとデプロイ
npm run build
npx wrangler pages deploy dist

# ステップ4: デプロイURLの確認と動作確認
curl https://b3bb6080.real-estate-200units-v2.pages.dev/api/health
```

---

## データベースマイグレーション

### D1データベースの作成（初回のみ）
```bash
# 本番用D1データベースを作成
npx wrangler d1 create webapp-production

# 出力例:
# ✅ Successfully created DB 'webapp-production'
#
# [[d1_databases]]
# binding = "DB"
# database_name = "webapp-production"
# database_id = "abc123-def456-ghi789"

# database_idをwrangler.jsonc にコピー
```

### マイグレーションファイルの作成
```bash
# 新しいマイグレーションファイルを作成
mkdir -p migrations
cat > migrations/0001_initial_schema.sql << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_name TEXT,
  address TEXT,
  land_area REAL,
  building_area REAL,
  frontage REAL,
  zoning TEXT,
  building_coverage REAL,
  floor_area_ratio REAL,
  structure TEXT,
  built_year TEXT,
  desired_price REAL,
  yield REAL,
  occupancy TEXT,
  nearest_station TEXT,
  station_distance INTEGER,
  road_info TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Deal files table
CREATE TABLE IF NOT EXISTS deal_files (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  category TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deal_files_deal_id ON deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_files_user_id ON deal_files(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
EOF
```

### マイグレーションの実行

#### ローカル環境
```bash
# ローカルD1にマイグレーションを適用
npx wrangler d1 migrations apply webapp-production --local

# 実行されたマイグレーションを確認
npx wrangler d1 migrations list webapp-production --local
```

#### 本番環境
```bash
# 本番D1にマイグレーションを適用（初回デプロイ前に実行）
npx wrangler d1 migrations apply webapp-production

# 実行されたマイグレーションを確認
npx wrangler d1 migrations list webapp-production
```

### テストデータの投入（オプション）
```bash
# seed.sqlファイルを作成
cat > seed.sql << 'EOF'
-- Admin user
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES 
  ('admin-001', 'admin@test.com', '$2a$10$hashedpassword', 'Admin User', 'ADMIN');

-- Test deals
INSERT OR IGNORE INTO deals (id, user_id, property_name, address, land_area, status) VALUES 
  ('deal-001', 'admin-001', 'テスト物件1', '東京都港区六本木1-1-1', 100.50, 'active');
EOF

# ローカルにテストデータを投入
npx wrangler d1 execute webapp-production --local --file=./seed.sql

# 本番にテストデータを投入（注意: 本番環境への投入は慎重に）
# npx wrangler d1 execute webapp-production --file=./seed.sql
```

---

## デプロイ後の検証

### スモークテスト（Smoke Tests）

#### テスト1: ヘルスチェック
```bash
curl https://real-estate-200units-v2.pages.dev/api/health

# 期待される出力:
# {"status":"ok","timestamp":"2025-12-06T06:37:51.555Z"}
```

#### テスト2: REINFOLIB API
```bash
curl https://real-estate-200units-v2.pages.dev/api/reinfolib/test

# 期待される出力:
# {"message":"REINFOLIB API is working"}
```

#### テスト3: ルートページ
```bash
curl -I https://real-estate-200units-v2.pages.dev/

# 期待される出力:
# HTTP/2 200
# content-type: text/html; charset=UTF-8
```

#### テスト4: favicon.ico（v3.151.0の修正確認）
```bash
curl -I https://real-estate-200units-v2.pages.dev/favicon.ico

# 期待される出力:
# HTTP/2 200
# content-type: image/vnd.microsoft.icon
```

#### テスト5: 認証API
```bash
curl -X POST https://real-estate-200units-v2.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# 期待される出力:
# {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{"id":"admin-001",...}}
```

### 包括的テスト（Comprehensive Tests）

#### テスト6: 案件一覧API
```bash
# JWTトークンを取得
TOKEN=$(curl -s -X POST https://real-estate-200units-v2.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | jq -r '.token')

# 案件一覧を取得
curl https://real-estate-200units-v2.pages.dev/api/deals?page=1&limit=5 \
  -H "Authorization: Bearer $TOKEN"

# 期待される出力:
# {"deals":[...],"total":5,"page":1,"limit":5}
```

#### テスト7: ストレージクォータAPI
```bash
curl https://real-estate-200units-v2.pages.dev/api/storage-quota \
  -H "Authorization: Bearer $TOKEN"

# 期待される出力:
# {"used_bytes":0,"limit_bytes":3221225472,"used_mb":0,"limit_mb":3072,...}
```

#### テスト8: REINFOLIB 物件情報取得
```bash
curl 'https://real-estate-200units-v2.pages.dev/api/reinfolib/property-info?address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%AF%E5%8C%BA%E5%85%AD%E6%9C%AC%E6%9C%A81-1-1&period=2024%E5%B9%B4%E7%AC%AC4%E5%9B%9B%E5%8D%8A%E6%9C%9F'

# 期待される出力:
# [{"取引時期":"2024年第4四半期","土地の形状":"ほぼ整形",...}] (232件のデータ)
```

### ブラウザテスト

#### 手動テスト
1. **ログインページ**: https://real-estate-200units-v2.pages.dev/
   - テストアカウントでログイン
   - ダッシュボードへのリダイレクトを確認

2. **ダッシュボード**: https://real-estate-200units-v2.pages.dev/dashboard
   - サマリーカードの表示を確認
   - 最近の案件一覧の表示を確認

3. **新規案件登録**: https://real-estate-200units-v2.pages.dev/deals/new
   - OCRファイルアップロードを確認（iOS Safari推奨）
   - 物件情報自動取得ボタンを確認
   - フォーム保存を確認

4. **favicon.ico**: ブラウザのタブでファビコンが表示されることを確認

#### 自動テスト（Playwright）
```bash
# Playwrightでコンソールログを取得
npm install -g playwright
npx playwright install chromium

# テストスクリプト
cat > test-production.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // コンソールログをキャプチャ
  page.on('console', msg => console.log('CONSOLE:', msg.text()));

  // ページを開く
  await page.goto('https://real-estate-200units-v2.pages.dev/');
  await page.waitForTimeout(5000);

  await browser.close();
})();
EOF

node test-production.js
```

---

## ロールバック手順

### 前のバージョンへのロールバック

#### 方法1: Cloudflare Pagesのダッシュボードから
1. Cloudflareダッシュボードにログイン
2. Pages > `real-estate-200units-v2` を選択
3. デプロイ履歴から前のバージョンを選択
4. "Rollback to this deployment" をクリック

#### 方法2: Wrangler CLIから
```bash
# デプロイ履歴を確認
npx wrangler pages deployment list

# 特定のデプロイIDにロールバック（手動でURLを本番に設定）
# 注: Wrangler CLIには直接的なロールバックコマンドがないため、
# 前のバージョンのコードを再デプロイする

# 前のバージョンのコードをチェックアウト
git checkout v3.150.0

# ビルドとデプロイ
npm run build
npx wrangler pages deploy dist
```

### データベースのロールバック

#### D1マイグレーションのロールバック
```bash
# 注意: D1は自動ロールバックをサポートしていないため、
# 手動でロールバックSQLを作成・実行する必要がある

# ロールバックSQL例
cat > rollback.sql << 'EOF'
-- 0002_add_new_column.sql のロールバック
ALTER TABLE deals DROP COLUMN new_column;
EOF

# 本番環境で実行（注意: 慎重に実行）
npx wrangler d1 execute webapp-production --file=./rollback.sql
```

---

## トラブルシューティング

### 問題1: デプロイが失敗する

#### 原因と対処法
```bash
# エラー: "Authentication failed"
# 対処法: Wrangler認証を再実行
npx wrangler login

# エラー: "Build failed"
# 対処法: ローカルでビルドが成功するか確認
npm run build
# ビルドエラーがあれば修正

# エラー: "Out of memory"
# 対処法: wrangler.jsonc でcompatibility_flagsを確認
# "compatibility_flags": ["nodejs_compat"]
```

---

### 問題2: 環境変数が反映されない

#### 原因と対処法
```bash
# 確認: 環境変数が設定されているか
npx wrangler pages secret list

# 対処法: 環境変数を再設定
npx wrangler pages secret put OPENAI_API_KEY

# 確認: デプロイ後に環境変数を確認
# 本番環境でAPIをテスト
curl https://real-estate-200units-v2.pages.dev/api/reinfolib/test
```

---

### 問題3: D1マイグレーションが失敗する

#### 原因と対処法
```bash
# エラー: "Migration already applied"
# 対処法: マイグレーション履歴を確認
npx wrangler d1 migrations list webapp-production

# エラー: "SQL syntax error"
# 対処法: SQLの構文をローカルでテスト
npx wrangler d1 execute webapp-production --local --command="SELECT 1"

# 対処法: マイグレーションファイルの構文を確認
cat migrations/0001_initial_schema.sql
```

---

### 問題4: 本番環境でOCRが動作しない

#### 原因と対処法
```bash
# 確認1: OPENAI_API_KEYが設定されているか
npx wrangler pages secret list | grep OPENAI_API_KEY

# 確認2: 本番環境でAPIテスト
curl -X POST https://real-estate-200units-v2.pages.dev/api/ocr \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"

# 確認3: Cloudflare Pagesのログを確認
npx wrangler pages deployment tail
```

---

## 付録

### デプロイチェックリスト
```
デプロイ前:
☐ コード変更をgitにコミット
☐ 環境変数が全て設定されている
☐ ローカルでビルドが成功する
☐ ローカルでテストが全てパスする
☐ データベースマイグレーションが準備されている

デプロイ中:
☐ npm run build が成功する
☐ npx wrangler pages deploy が成功する
☐ デプロイURLを記録する

デプロイ後:
☐ スモークテスト（5項目）が全てパスする
☐ ブラウザで主要機能を手動テスト
☐ エラーログを確認
☐ パフォーマンスを確認
☐ ユーザーに通知
```

### 環境別URL一覧
```
本番環境:
- メインURL: https://real-estate-200units-v2.pages.dev/
- 最新デプロイ: https://b3bb6080.real-estate-200units-v2.pages.dev/

ローカル開発:
- ローカルURL: http://localhost:3000/

GitHub:
- リポジトリ: https://github.com/koki-187/200
```

---

**最終更新日**: 2025-12-06  
**ドキュメントバージョン**: 1.0.0  
**対象システムバージョン**: v3.151.0
