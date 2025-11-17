# 🌐 独自ドメイン設定ガイド

## 目次
1. [概要](#概要)
2. [前提条件](#前提条件)
3. [ドメイン取得](#ドメイン取得)
4. [Cloudflareへのドメイン追加](#cloudflareへのドメイン追加)
5. [DNS設定](#dns設定)
6. [Pages Projectへのドメイン追加](#pages-projectへのドメイン追加)
7. [SSL/TLS設定](#ssltls設定)
8. [動作確認](#動作確認)
9. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このガイドでは、200戸土地仕入れ管理システムに独自ドメインを設定する手順を説明します。

### 現在のURL
- **デフォルトURL**: https://real-estate-200units-v2.pages.dev

### 設定後のURL例
- **独自ドメイン**: https://app.yourcompany.com
- **ルートドメイン**: https://yourcompany.com

---

## 前提条件

### 必要なもの
- ✅ 独自ドメイン（例: yourcompany.com）
- ✅ Cloudflareアカウント
- ✅ ドメイン管理権限（レジストラへのアクセス）
- ✅ Pages Projectへのアクセス権

### 推奨事項
- DNSの基本知識
- ドメイン設定の待機時間（最大48時間）を考慮

---

## ドメイン取得

### おすすめレジストラ
1. **Cloudflare Registrar**（推奨）
   - 最安値
   - Cloudflare DNSと統合
   - WHOIS保護無料
   - URL: https://www.cloudflare.com/products/registrar/

2. **他のレジストラ**
   - Google Domains
   - Namecheap
   - GoDaddy
   - お名前.com（日本）

### ドメイン取得手順
```bash
# Cloudflare Registrarの場合
1. Cloudflareダッシュボードにログイン
2. "Domain Registration" セクションへ移動
3. ドメイン名を検索（例: yourcompany.com）
4. 購入手続き（年間約$10-$15）
```

---

## Cloudflareへのドメイン追加

### ステップ1: ドメインをCloudflareに追加

#### Cloudflare Registrarで取得した場合
- 自動的にCloudflareに追加されます
- ステップ2へスキップ

#### 他のレジストラで取得した場合
1. Cloudflareダッシュボードにログイン
2. 「Add a Site」をクリック
3. ドメイン名を入力（例: yourcompany.com）
4. プラン選択（無料プランでOK）
5. 「Continue」をクリック

### ステップ2: ネームサーバー変更

Cloudflareが提供するネームサーバーに変更します。

#### Cloudflareから提供されるネームサーバー例:
```
alice.ns.cloudflare.com
bob.ns.cloudflare.com
```

#### レジストラでの設定方法

**お名前.com の場合:**
```
1. お名前.comにログイン
2. 「ドメイン設定」→「ネームサーバーの変更」
3. 「他のネームサーバーを使う」を選択
4. Cloudflareのネームサーバーを入力
5. 確認画面で「設定する」
```

**Namecheap の場合:**
```
1. Namecheapにログイン
2. Domain Listから対象ドメインを選択
3. "Nameservers" セクションで "Custom DNS" を選択
4. Cloudflareのネームサーバーを入力
5. 緑のチェックマークをクリック
```

### ステップ3: DNS伝播を待つ

- **待機時間**: 通常30分〜48時間
- **確認方法**: Cloudflareダッシュボードでステータスを確認
- **ステータス**: "Active" になれば完了

---

## DNS設定

Cloudflareダッシュボードで DNS レコードを追加します。

### ステップ1: DNS管理画面へ移動
```
1. Cloudflareダッシュボード
2. 対象ドメインを選択
3. "DNS" タブをクリック
```

### ステップ2: DNSレコード追加

#### ルートドメイン（yourcompany.com）の場合:
```
Type: CNAME
Name: @ (または空白)
Target: real-estate-200units-v2.pages.dev
Proxy status: ✅ Proxied (オレンジ色のクラウド)
TTL: Auto
```

#### サブドメイン（app.yourcompany.com）の場合:
```
Type: CNAME
Name: app
Target: real-estate-200units-v2.pages.dev
Proxy status: ✅ Proxied (オレンジ色のクラウド)
TTL: Auto
```

### ステップ3: DNS設定の確認

```bash
# ターミナルで確認
dig yourcompany.com
dig app.yourcompany.com

# または
nslookup yourcompany.com
nslookup app.yourcompany.com
```

---

## Pages Projectへのドメイン追加

### 方法1: Wrangler CLI（推奨）

```bash
# プロジェクトディレクトリで実行
cd /path/to/webapp

# ルートドメインを追加
npx wrangler pages domain add yourcompany.com --project-name real-estate-200units-v2

# サブドメインを追加
npx wrangler pages domain add app.yourcompany.com --project-name real-estate-200units-v2

# ドメイン一覧を確認
npx wrangler pages domain list --project-name real-estate-200units-v2
```

### 方法2: Cloudflareダッシュボード

```
1. Cloudflareダッシュボードにログイン
2. "Workers & Pages" セクション
3. "real-estate-200units-v2" プロジェクトを選択
4. "Custom domains" タブ
5. "Set up a custom domain" をクリック
6. ドメイン名を入力（例: app.yourcompany.com）
7. "Continue" → "Activate domain"
```

### ドメイン検証

Cloudflareが自動的にドメインを検証します:
- ✅ DNS設定が正しい → 即時有効化
- ❌ DNS設定に問題 → エラーメッセージ表示

---

## SSL/TLS設定

Cloudflareが自動的にSSL証明書を発行します。

### ステップ1: SSL/TLSモード設定

```
1. Cloudflareダッシュボード
2. 対象ドメインを選択
3. "SSL/TLS" タブ
4. "Full (strict)" を選択（推奨）
```

### SSL/TLSモードの説明
- **Off**: SSL無効（非推奨）
- **Flexible**: クライアント↔Cloudflare間のみSSL
- **Full**: クライアント↔Cloudflare↔Origin間SSL（証明書検証なし）
- **Full (strict)**: クライアント↔Cloudflare↔Origin間SSL（証明書検証あり）✅ 推奨

### ステップ2: SSL証明書の確認

```
1. "SSL/TLS" タブ
2. "Edge Certificates" サブタブ
3. 証明書のステータスを確認
   - ✅ Active: 正常に発行済み
   - ⏳ Pending: 発行処理中（最大24時間）
```

### ステップ3: HTTPS自動リダイレクト

```
1. "SSL/TLS" タブ
2. "Edge Certificates" サブタブ
3. "Always Use HTTPS" を ON に設定
```

---

## 動作確認

### ステップ1: 基本動作確認

```bash
# HTTPSアクセス確認
curl -I https://yourcompany.com
curl -I https://app.yourcompany.com

# 期待されるレスポンス
HTTP/2 200
server: cloudflare
```

### ステップ2: ブラウザで確認

1. ブラウザで https://yourcompany.com を開く
2. 以下を確認:
   - ✅ HTTPSで表示される
   - ✅ SSL証明書が有効
   - ✅ ログインページが表示される
   - ✅ ログイン→ダッシュボード遷移が正常

### ステップ3: 証明書の確認

```
1. ブラウザで対象URLを開く
2. アドレスバーの鍵アイコンをクリック
3. 証明書の詳細を確認
   - 発行者: Cloudflare Inc
   - 有効期限: 3ヶ月（自動更新）
```

---

## トラブルシューティング

### 問題1: "DNS_PROBE_FINISHED_NXDOMAIN" エラー

**原因**: DNSレコードが正しく設定されていない

**解決方法**:
```bash
# DNS設定を確認
dig yourcompany.com

# Cloudflare DNSレコードを再確認
# CNAMEレコードが正しく設定されているか確認
```

### 問題2: "Too Many Redirects" エラー

**原因**: SSL/TLSモードが不適切

**解決方法**:
```
1. Cloudflareダッシュボード → SSL/TLS
2. "Full" または "Full (strict)" に変更
3. ブラウザキャッシュをクリア
```

### 問題3: SSL証明書エラー

**原因**: 証明書の発行待ち

**解決方法**:
```
1. Cloudflareダッシュボード → SSL/TLS → Edge Certificates
2. 証明書のステータスを確認
3. "Pending" の場合は最大24時間待つ
4. 24時間経過しても "Pending" の場合:
   - Universal SSL を一度Disableにして再度Enable
   - Cloudflareサポートに連絡
```

### 問題4: ドメインが追加できない

**原因**: DNSがCloudflareに移管されていない

**解決方法**:
```
1. ネームサーバーが正しく設定されているか確認
2. DNS伝播を待つ（最大48時間）
3. 確認コマンド:
   dig NS yourcompany.com
   # Cloudflareのネームサーバーが表示されるはず
```

### 問題5: wwwサブドメインが動作しない

**解決方法**:
```
Cloudflare DNS設定に以下を追加:
Type: CNAME
Name: www
Target: yourcompany.com (または real-estate-200units-v2.pages.dev)
Proxy status: Proxied
```

---

## ベストプラクティス

### セキュリティ
- ✅ Always Use HTTPS を有効化
- ✅ SSL/TLS モードを "Full (strict)" に設定
- ✅ HSTS (HTTP Strict Transport Security) を有効化

### パフォーマンス
- ✅ Cloudflare CDN を利用（Proxied モード）
- ✅ Auto Minify を有効化（HTML, CSS, JS）
- ✅ Brotli 圧縮を有効化

### 監視
- ✅ Cloudflare Analytics で トラフィックを監視
- ✅ アラート設定（ダウンタイム、SSL期限切れ等）
- ✅ ログを定期的にチェック

---

## 費用

### 無料プラン
- Cloudflare Pages: 無料
- Cloudflare CDN: 無料
- SSL証明書: 無料
- DNS管理: 無料

### 有料オプション
- **ドメイン登録**: 約$10-$15/年
- **Pro プラン** ($20/月):
  - より高度なDDoS保護
  - Web Application Firewall (WAF)
  - より詳細なアナリティクス

---

## サポート

### Cloudflareドキュメント
- Pages Custom Domains: https://developers.cloudflare.com/pages/platform/custom-domains/
- SSL/TLS: https://developers.cloudflare.com/ssl/
- DNS管理: https://developers.cloudflare.com/dns/

### 問い合わせ
- Cloudflareサポート: https://support.cloudflare.com/
- Community Forum: https://community.cloudflare.com/

---

**最終更新**: 2025-11-17
**バージョン**: v1.0
