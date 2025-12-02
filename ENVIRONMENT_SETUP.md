# 環境変数設定ガイド

## 🔑 必須の環境変数

本システムを正常に動作させるためには、以下の環境変数を設定する必要があります。

### 1. MLIT_API_KEY（必須）

**説明**: 国土交通省の不動産情報ライブラリAPIにアクセスするためのAPIキー

**取得方法**:
1. [不動産情報ライブラリ](https://www.reinfolib.mlit.go.jp/)にアクセス
2. 「API利用申請」ページから申請
3. 承認後、APIキーが発行されます

**設定方法（Cloudflare Pages）**:

#### 方法1: Wrangler CLI（推奨）
```bash
# プロジェクトディレクトリで実行
cd /home/user/webapp

# 本番環境に設定
npx wrangler pages secret put MLIT_API_KEY --project-name real-estate-200units-v2

# プロンプトが表示されるので、APIキーを入力してEnter
```

#### 方法2: Cloudflare Dashboard（Webブラウザ）
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左サイドバーから「Workers & Pages」を選択
3. プロジェクト「real-estate-200units-v2」を選択
4. 「Settings」タブをクリック
5. 「Environment Variables」セクションまでスクロール
6. 「Production」環境を選択
7. 「Add Variable」ボタンをクリック
8. 変数名: `MLIT_API_KEY`
9. 値: （取得したAPIキーを貼り付け）
10. 「Encrypt」オプションをON（推奨）
11. 「Save」をクリック

#### 方法3: ローカル開発環境（.dev.vars）
```bash
# プロジェクトルートに .dev.vars ファイルを作成
cd /home/user/webapp
echo "MLIT_API_KEY=your-api-key-here" > .dev.vars

# .gitignoreに追加（すでに追加済み）
echo ".dev.vars" >> .gitignore
```

**注意**: `.dev.vars`ファイルは**絶対にGitにコミットしないでください**（機密情報が含まれます）

---

## 🔒 その他の環境変数

### JWT_SECRET（自動生成）
- **説明**: JWT認証トークンの署名に使用する秘密鍵
- **設定**: Cloudflare Pagesが自動で生成
- **手動設定**: 通常は不要

---

## 🧪 環境変数の確認方法

### 本番環境で確認
```bash
# Wrangler経由で確認
cd /home/user/webapp
npx wrangler pages secret list --project-name real-estate-200units-v2
```

### ローカル環境で確認
```bash
# .dev.varsファイルを確認
cat .dev.vars
```

---

## ❌ エラーが発生する場合

### エラー: 「MLIT_API_KEYが設定されていません」

**スクリーンショット例**:
```
❌ 認証エラー
MLIT_API_KEYが設定されていません
```

**原因**: 環境変数`MLIT_API_KEY`が本番環境に設定されていない

**解決方法**:
1. 上記の「方法1」または「方法2」で環境変数を設定
2. 設定後、数分待ってからブラウザをリロード
3. それでもエラーが出る場合は、Cloudflare Pagesの再デプロイを実行:
   ```bash
   cd /home/user/webapp
   npm run build
   npx wrangler pages deploy dist --project-name real-estate-200units-v2
   ```

### エラー: 「API認証エラー」（HTTP 401）

**原因**: 設定した`MLIT_API_KEY`が無効または期限切れ

**解決方法**:
1. 不動産情報ライブラリの管理画面でAPIキーを確認
2. 新しいAPIキーを再発行
3. 環境変数を更新:
   ```bash
   npx wrangler pages secret put MLIT_API_KEY --project-name real-estate-200units-v2
   ```

---

## 📝 チェックリスト

環境構築が完了したら、以下を確認してください:

- [ ] `MLIT_API_KEY`を取得した
- [ ] 本番環境（Cloudflare Pages）に`MLIT_API_KEY`を設定した
- [ ] ローカル開発環境用に`.dev.vars`を作成した（ローカル開発する場合）
- [ ] `.dev.vars`が`.gitignore`に含まれていることを確認した
- [ ] 本番環境で「取得中...」ボタンをクリックしてテストした
- [ ] エラーが表示されないことを確認した

---

## 🚀 次のステップ

環境変数の設定が完了したら、以下の機能をテストしてください:

1. **案件作成画面**にアクセス: https://9f468f0c.real-estate-200units-v2.pages.dev/deals/new
2. 所在地に住所を入力（例: 埼玉県幸手市北二丁目1-8）
3. 「取得中...」ボタンをクリック
4. 自動入力が成功することを確認

---

**最終更新日**: 2025-12-02  
**対応バージョン**: v3.99.0  
**問い合わせ**: 環境変数の設定で問題が発生した場合は、スクリーンショットを添えて報告してください。
