# Cloudflare Pages D1バインディング設定手順書

**対象プロジェクト**: real-estate-200units-v2  
**D1データベース**: real-estate-200units-db  
**最終更新**: 2025-12-18 v3.153.130  
**本番DB状態**: 78件のNG項目データ（10m以上浸水30件、崖地11件）反映済み

---

## 📋 概要

Cloudflare Pagesで `/api/hazard-db/info` エンドポイントを動作させるためには、D1データベースのバインディング設定が必要です。

**現状**:
- ✅ ローカル環境: 正常動作（wrangler.jsonc設定のみで動作）
- ❌ 本番環境: 400エラー（D1バインディング未設定）

**対応**:
Cloudflare Pagesダッシュボードから手動でD1バインディングを設定する必要があります。

---

## 🔧 設定手順

### Step 1: Cloudflare Dashboardにログイン

1. https://dash.cloudflare.com/ にアクセス
2. Cloudflareアカウントでログイン

### Step 2: Pagesプロジェクトを選択

1. 左サイドバーから **「Workers & Pages」** を選択
2. プロジェクト一覧から **「real-estate-200units-v2」** をクリック

### Step 3: Settings > Functions を開く

1. 上部タブから **「Settings」** を選択
2. 左サイドメニューから **「Functions」** をクリック

### Step 4: D1 database bindings を追加

1. **「D1 database bindings」** セクションを探す
2. **「Add binding」** ボタンをクリック
3. 以下の情報を入力:
   - **Variable name**: `DB`
   - **D1 database**: `real-estate-200units-db` を選択
4. **「Save」** ボタンをクリック

### Step 5: 再デプロイ（必要な場合）

設定変更後、自動的に反映される場合もありますが、確実にするためには再デプロイを推奨します:

```bash
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist --project-name real-estate-200units-v2
```

### Step 6: 動作確認

設定完了後、本番環境でAPIが動作するか確認します:

```bash
# ハザード情報取得テスト
curl "https://c439086d.real-estate-200units-v2.pages.dev/api/hazard-db/info?address=東京都渋谷区1-1-1"

# 対応都市一覧テスト
curl "https://c439086d.real-estate-200units-v2.pages.dev/api/hazard-db/cities"
```

**期待される結果**:
- HTTPステータス: 200
- JSONレスポンス: ハザード情報または都市一覧が返る

---

## ✅ 設定確認チェックリスト

- [ ] Cloudflare Dashboardにログイン完了
- [ ] real-estate-200units-v2 プロジェクトを選択
- [ ] Settings > Functions を開いた
- [ ] D1 database bindings に以下を追加:
  - Variable name: `DB`
  - D1 database: `real-estate-200units-db`
- [ ] 設定を保存
- [ ] (オプション) 再デプロイ実行
- [ ] 本番環境でAPIテスト実施
- [ ] HTTPステータス 200 を確認
- [ ] JSONレスポンスが正しく返ることを確認

---

## 🚨 トラブルシューティング

### 問題1: D1 database が選択肢に表示されない

**原因**: D1データベースが存在しない、または権限がない

**対応**:
1. D1データベースが作成されているか確認:
   ```bash
   npx wrangler d1 list
   ```
2. `real-estate-200units-db` が表示されるか確認
3. 表示されない場合は作成:
   ```bash
   npx wrangler d1 create real-estate-200units-db
   ```

### 問題2: 設定後も400エラーが続く

**原因**: 設定が反映されていない、またはキャッシュ

**対応**:
1. Cloudflare Pagesの **「Deployments」** タブを開く
2. 最新デプロイメントの **「Retry deployment」** をクリック
3. または、新規デプロイを実行:
   ```bash
   npm run deploy:prod
   ```
4. 5-10分待ってから再度テスト

### 問題3: Variable name が間違っている

**原因**: コード内で使用している変数名と設定が不一致

**確認**:
- コード内: `c.env.DB`（src/routes/hazard-database.ts）
- 設定: Variable name は `DB` である必要がある

**対応**:
- Variable name を `DB` に修正して保存

---

## 📚 参考情報

### wrangler.jsonc の設定（参考）

ローカル環境では以下の設定で動作しています:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "real-estate-200units-v2",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "real-estate-200units-db",
      "database_id": "4df8f06f-eca1-48b0-9dcc-a17778913760"
    }
  ]
}
```

ただし、Cloudflare Pagesでは **wrangler.jsonc の設定だけでは不十分** で、ダッシュボードからの手動設定が必要です。

### コード内でのD1使用箇所

```typescript
// src/routes/hazard-database.ts
app.get('/info', async (c) => {
  // D1データベースからハザード情報を取得
  const hazardResults = await c.env.DB.prepare(`
    SELECT * FROM hazard_info WHERE prefecture = ? AND city = ?
  `).bind(prefecture, city).all();
  
  // ...
});
```

### Cloudflare公式ドキュメント

- [Cloudflare Pages Functions - Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [D1 Databases](https://developers.cloudflare.com/d1/)
- [Pages + D1 Integration](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/#d1-databases)

---

## 🎯 設定完了後の次のステップ

### 1. 本番環境E2Eテスト実施

10ヶ所のランダム住所でテストを実行:

```bash
# 本番URLでテスト（スクリプト修正が必要）
# BASE_URL を https://c439086d.real-estate-200units-v2.pages.dev に変更
bash scripts/e2e-test-10-addresses.sh
```

### 2. データ品質の継続的モニタリング

定期的にファクトチェックを実行:

```bash
# 本番DBの品質確認（月次推奨）
node scripts/fact-check-database-quality.cjs --remote
```

### 3. README.mdの更新

設定完了を記録:

```markdown
## ✅ Cloudflare Pages D1バインディング設定完了

- 設定日: 2025-12-18
- Variable name: DB
- D1 database: real-estate-200units-db
- ステータス: ✅ 完了
```

---

**作成日**: 2025-12-18  
**バージョン**: v3.153.128  
**作成者**: AI Assistant
