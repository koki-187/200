# ⚡ Sentry 超速セットアップガイド（5分）

## 📋 必要なもの
- GitHubアカウント（推奨）または メールアドレス

---

## 🚀 3ステップで完了

### ステップ1: アカウント作成（2分）

1. **以下のURLを開く**:
   👉 https://sentry.io/signup/

2. **「Sign up with GitHub」をクリック**
   - GitHubアカウントでログイン
   - Sentryへのアクセス許可を承認

3. **基本情報を入力**:
   - **Organization Name**: `Real Estate 200 Units`
   - **Role**: `Developer`
   - **Plan**: `Developer` (無料プラン)

---

### ステップ2: プロジェクト作成とDSN取得（2分）

#### 方法A: 自動的にプロジェクト作成画面が表示される場合

1. **Platform**: `Node.js` を選択
2. **Project Name**: `real-estate-200units`
3. **Alert Frequency**: `On every new issue`
4. **Create Project** をクリック

→ DSNが自動的に表示されます（コピーする）

#### 方法B: 既存のダッシュボードから作成する場合

1. **以下のURLを開く**:
   👉 https://sentry.io/projects/new/

2. **Platform**: `Node.js` を選択
3. **Project Name**: `real-estate-200units`
4. **Create Project** をクリック

5. **DSN取得**:
   - 作成後、自動的にDSNが表示される
   - または、左サイドバー → Settings（歯車） → Projects → `real-estate-200units` → Client Keys (DSN)

---

### ステップ3: DSNをコピーして私に送る（1分）

**DSNの形式**:
```
https://xxxxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXXX.ingest.sentry.io/XXXXXXX
```

**例**:
```
https://a1b2c3d4e5f67890abcdef1234567890@o1234567.ingest.sentry.io/7890123
```

👉 **このDSNをコピーしてチャットに貼り付けてください**

---

## ✅ 完了後の作業（私が代行します）

DSNを受け取ったら、以下のコマンドで設定を完了させます:

```bash
echo "YOUR_DSN_HERE" | npx wrangler pages secret put SENTRY_DSN --project-name real-estate-200units-v2
```

---

## 🎯 もっと詳しく知りたい場合

詳細な手順は以下のファイルを参照してください:
- `/home/user/webapp/RESEND_SENTRY_SETUP_GUIDE.md`

---

## ❓ トラブルシューティング

### DSNが見つからない場合

1. **Sentryダッシュボード**: https://sentry.io/
2. **左サイドバー**: Settings（歯車アイコン）
3. **Projects** → `real-estate-200units`
4. **Client Keys (DSN)** をクリック
5. DSNが表示されます

### プロジェクトがない場合

1. **Projects**: https://sentry.io/projects/
2. **Create Project** をクリック
3. 上記の手順でプロジェクトを作成

---

**DSNを取得したら、そのまま貼り付けてください！すぐに設定を完了させます。** 🚀
