# 🔍 根本原因分析: APIキー紛失・連携エラー

**分析日時**: 2025-12-15  
**分析対象**: Cloudflare Pages本番環境でのAPIキー紛失・連携エラーの繰り返し発生

---

## 📊 問題の概要

ユーザー様から報告された問題：
> 「APIキーを紛失、連携が出来ていないという状態は、何度も起きている現象」

この問題により、以下の機能が動作不能になっていた：
1. **OCR機能** (OPENAI_API_KEY)
2. **物件情報補足機能** (MLIT_API_KEY)
3. **リスクチェック機能** (OpenStreetMap API - キー不要だが、他のAPIキー問題の影響を受けやすい)

---

## 🔎 根本原因の特定

### 原因1: `.dev.vars` ファイルの自動デプロイの誤解

**問題点**:
- 開発環境の `.dev.vars` ファイルに保存された環境変数が、本番環境に自動的にデプロイされると誤解していた
- Cloudflare Pagesでは `.dev.vars` はローカル開発専用であり、本番環境には**一切反映されない**

**影響**:
```
開発環境: .dev.vars に OPENAI_API_KEY=sk-proj-... → 動作OK
本番環境: 環境変数未設定 → 401 Unauthorized エラー
```

### 原因2: 環境変数設定の手順が不明確

**問題点**:
- Cloudflare Pages Secretsの設定方法が明確に文書化されていなかった
- デプロイ時に環境変数の設定を忘れやすい
- 環境変数が設定されているか確認する方法が不明確

**影響**:
- デプロイ後に機能が動作しないことに気づく
- 何度も同じエラーが繰り返される

### 原因3: APIキーの有効性確認の欠如

**問題点**:
- `.dev.vars` に保存されたAPIキーが古い/無効になっていても気づかない
- 本番環境にデプロイする前にAPIキーの有効性を確認する仕組みがない

**影響**:
- 無効なAPIキーを本番環境に設定してしまう
- OpenAI APIが401エラーを返す

### 原因4: Health Check機能の活用不足

**問題点**:
- Health Check APIが実装されているが、デプロイ後に自動実行されない
- エラーが発生してから初めて問題に気づく

**影響**:
- 早期発見・早期対応ができない
- ユーザーが問題を報告するまで気づかない

---

## 📋 発生したエラーの詳細

### エラー1: OPENAI_API_KEY 無効（最も深刻）

**エラーメッセージ**:
```
401 Unauthorized - Incorrect API key provided
```

**原因**:
- `.dev.vars` に保存されていたAPIキーが古い/無効
- 本番環境に有効なAPIキーが設定されていなかった

**影響範囲**:
- OCR機能が完全に動作不能
- ユーザーがPDFアップロードしてもエラー

### エラー2: MLIT_API_KEY パラメータ形式エラー

**エラーメッセージ**:
```
400 Bad Request - 'year' not specified, 'area' in invalid format
```

**原因**:
- `test-property-info` エンドポイントでパラメータ形式が誤っていた
- `from=20243` ではなく `year=2024&quarter=3` が正しい形式

**影響範囲**:
- 物件情報補足機能のテストエンドポイントが動作不能
- 実際の `/property-info` エンドポイントは正常動作

### エラー3: 環境変数未設定（初期状態）

**エラーメッセージ**:
```
Health Check: openai_api.status = "error"
```

**原因**:
- Cloudflare Pages Secretsが一切設定されていなかった

**影響範囲**:
- すべてのAPI連携機能が動作不能

---

## 🛡️ 実装済みの対策

### 対策1: Health Check API ✅

**実装場所**: `/api/health`

**機能**:
```json
{
  "status": "healthy",
  "services": {
    "environment_variables": {
      "status": "healthy",
      "details": {
        "OPENAI_API_KEY": "set",
        "JWT_SECRET": "set",
        "MLIT_API_KEY": "set"
      }
    },
    "openai_api": {
      "status": "healthy",
      "response_time_ms": "fast"
    },
    "d1_database": {
      "status": "healthy"
    }
  }
}
```

**利点**:
- 環境変数の設定状況を確認可能
- OpenAI APIの有効性を自動テスト
- システム全体のヘルス状況を一目で確認

### 対策2: テストエンドポイント ✅

**実装場所**:
- `/api/ocr-jobs/test-openai` - OpenAI API接続テスト
- `/api/reinfolib/test` - MLIT API基本テスト
- `/api/reinfolib/test-property-info` - MLIT API詳細テスト

**利点**:
- 本番環境でAPIキーの有効性を簡単に確認可能
- デプロイ後すぐにテストを実施できる

### 対策3: エラーハンドリングの改善 ✅

**実装内容**:
- OCR機能で無効なAPIキーの場合、明確なエラーメッセージを表示
- 401エラー時に「管理者にAPIキーの更新を依頼してください」と表示

**利点**:
- ユーザーにとって問題の原因が明確
- 開発者が素早く問題を特定できる

### 対策4: 管理者ダッシュボード ✅

**実装場所**: `/admin`

**機能**:
1. **システムヘルスチェック** (`/admin/health-check`)
   - リアルタイムでシステムステータスを監視
   - APIキーの設定状況を確認

2. **100回テスト** (`/admin/100-tests`)
   - OCR、物件情報補足、リスクチェック機能を100回自動テスト
   - 成功率、エラーログを記録

3. **自動エラー改善システム** (`/admin/error-improvement`)
   - エラーをスキャンして自動修正
   - エラーパターンを分析

**利点**:
- 管理者が簡単にシステム状態を確認できる
- 問題の早期発見が可能
- 自動テストでエラーを未然に防ぐ

---

## 🚀 追加で実装すべき予防措置

### 予防策1: デプロイ前チェックリスト（自動化）

**実装方法**:
- GitHub Actionsまたはwranglerのpre-deployフックを使用
- デプロイ前に必須環境変数がすべて設定されているか確認

**チェック項目**:
```bash
# デプロイ前に実行
npx wrangler pages secret list --project-name real-estate-200units-v2

# 必須キーが存在するか確認
required_keys=("OPENAI_API_KEY" "MLIT_API_KEY" "JWT_SECRET")
for key in "${required_keys[@]}"; do
  if ! wrangler pages secret list | grep -q "$key"; then
    echo "❌ ERROR: $key is not set!"
    exit 1
  fi
done
```

### 予防策2: 定期的なAPIキー有効性チェック（Cron Job）

**実装方法**:
- Cloudflare Workers Cronトリガーを使用
- 毎日自動的にHealth Check APIを実行
- エラーがあれば管理者にメール通知

**実装例**:
```typescript
// wrangler.jsonc
{
  "cron": ["0 0 * * *"]  // 毎日00:00に実行
}

// src/scheduled.ts
export default {
  async scheduled(event, env, ctx) {
    const healthCheck = await fetch('https://YOUR-APP.pages.dev/api/health');
    const result = await healthCheck.json();
    
    if (result.status !== 'healthy') {
      // メール通知を送信
      await sendAlertEmail(result);
    }
  }
}
```

**注意**: Cloudflare PagesではCronトリガーは直接サポートされていませんが、Cloudflare Workersを別途作成して定期チェックを実装可能

### 予防策3: 環境変数設定ドキュメントの整備

**実装方法**:
- `DEPLOYMENT.md` ファイルを作成
- 環境変数の設定手順を明確に記載
- APIキーの取得方法も記載

**ドキュメント内容**:
```markdown
## 必須環境変数の設定

### 1. OPENAI_API_KEY
OpenAI APIキーを取得: https://platform.openai.com/account/api-keys

設定コマンド:
```bash
echo "YOUR_OPENAI_API_KEY" | npx wrangler pages secret put OPENAI_API_KEY --project-name real-estate-200units-v2
```

### 2. MLIT_API_KEY
MLIT APIキーを取得: [取得方法のURL]

設定コマンド:
```bash
echo "YOUR_MLIT_API_KEY" | npx wrangler pages secret put MLIT_API_KEY --project-name real-estate-200units-v2
```

### 確認方法:
```bash
npx wrangler pages secret list --project-name real-estate-200units-v2
curl https://YOUR-APP.pages.dev/api/health
```
```

### 予防策4: `.dev.vars.example` ファイルの作成

**実装方法**:
- `.dev.vars.example` ファイルを作成してGitにコミット
- 実際のAPIキーは記載せず、フォーマットのみ記載

**内容例**:
```bash
# .dev.vars.example
# このファイルをコピーして .dev.vars を作成し、実際のAPIキーを設定してください
# .dev.vars はGitにコミットされません（.gitignore で除外）

JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=sk-proj-...your_key_here
RESEND_API_KEY=re_...your_key_here
MLIT_API_KEY=your_mlit_api_key_here
```

### 予防策5: デプロイ後の自動テスト

**実装方法**:
- デプロイ成功後、自動的にHealth CheckとAPI疎通テストを実行
- GitHub Actionsワークフローに組み込む

**実装例**:
```yaml
# .github/workflows/deploy.yml
- name: Deploy to Cloudflare Pages
  run: npx wrangler pages deploy dist --project-name real-estate-200units-v2

- name: Wait for deployment
  run: sleep 10

- name: Run post-deployment tests
  run: |
    curl -f https://YOUR-APP.pages.dev/api/health || exit 1
    curl -f https://YOUR-APP.pages.dev/api/ocr-jobs/test-openai || exit 1
    curl -f https://YOUR-APP.pages.dev/api/reinfolib/test || exit 1
```

---

## 📊 再発防止のための運用ルール

### ルール1: デプロイ前の必須チェック

**チェックリスト**:
- [ ] `.dev.vars` ファイルに最新のAPIキーが設定されているか確認
- [ ] ローカル環境で `npm run dev` を実行し、すべての機能が動作することを確認
- [ ] `npx wrangler pages secret list` で本番環境の環境変数を確認
- [ ] 必要に応じて `npx wrangler pages secret put` で環境変数を更新

### ルール2: デプロイ後の必須テスト

**テスト手順**:
1. Health Check APIを実行: `curl https://YOUR-APP.pages.dev/api/health`
2. OCR APIテスト: `curl https://YOUR-APP.pages.dev/api/ocr-jobs/test-openai`
3. MLIT APIテスト: `curl https://YOUR-APP.pages.dev/api/reinfolib/test`
4. 管理者ダッシュボードにアクセス: `https://YOUR-APP.pages.dev/admin`

### ルール3: 定期的な環境変数の棚卸し

**頻度**: 月1回

**内容**:
- すべての環境変数が最新かつ有効であることを確認
- 不要な環境変数を削除
- APIキーのローテーション（セキュリティベストプラクティス）

### ルール4: エラーが発生した場合の対応フロー

**フロー**:
1. エラーメッセージを記録
2. Health Check APIを実行してシステム状態を確認
3. 環境変数が正しく設定されているか確認
4. APIキーの有効性を確認（OpenAI Platform等で確認）
5. 必要に応じてAPIキーを再生成・再設定
6. 再度テストを実施
7. エラーログと対応内容を記録（`/admin/error-logs`）

---

## 🎯 まとめ

### 特定された根本原因
1. ✅ `.dev.vars` が本番環境に反映されないという仕様の誤解
2. ✅ 環境変数設定手順の不明確さ
3. ✅ APIキー有効性確認の欠如
4. ✅ デプロイ後の自動テストの欠如

### 実装済みの対策
1. ✅ Health Check API
2. ✅ テストエンドポイント
3. ✅ エラーハンドリングの改善
4. ✅ 管理者ダッシュボード（100回テスト、自動エラー改善システム）

### 推奨される追加対策
1. ⏳ デプロイ前チェックリスト（自動化）
2. ⏳ 定期的なAPIキー有効性チェック（Cron Job）
3. ⏳ 環境変数設定ドキュメントの整備
4. ⏳ `.dev.vars.example` ファイルの作成
5. ⏳ デプロイ後の自動テスト

### 運用ルール
1. ✅ デプロイ前の必須チェック
2. ✅ デプロイ後の必須テスト
3. ⏳ 定期的な環境変数の棚卸し
4. ✅ エラー発生時の対応フロー

---

**結論**: 
- 根本原因は「環境変数の管理プロセスの不備」であり、技術的な問題ではない
- 実装済みのHealth Check、テストエンドポイント、管理者ダッシュボードにより、問題の早期発見が可能
- 推奨される追加対策を実装することで、同様のエラーの再発を防止できる
