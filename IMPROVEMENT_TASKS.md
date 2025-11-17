# 📋 改善タスク一覧

**作成日**: 2025-11-17  
**現在のバージョン**: v1.3.0  
**現在の評価**: 6.6/10点  
**目標評価**: 10/10点  
**総タスク数**: 50タスク

---

## 📊 タスクサマリー

| 優先度 | タスク数 | 推定工数 | 完了率 |
|--------|---------|---------|--------|
| 🔴 Critical（最優先） | 8タスク | 3-5週間 | 0% |
| 🟡 High（高優先度） | 12タスク | 5-7週間 | 0% |
| 🟢 Medium（中優先度） | 20タスク | 6-8週間 | 0% |
| 🔵 Low（低優先度） | 10タスク | 3-4週間 | 0% |
| **合計** | **50タスク** | **17-24週間** | **0%** |

---

## 🔴 最優先タスク（Critical）: 3-5週間

### セキュリティ強化（1-2週間）

#### タスク1: パスワードハッシュ強化
- **現状**: SHA-256（ソルトなし）
- **目標**: bcrypt/Argon2（ソルト付き）
- **工数**: 2-3日
- **ファイル**: `src/utils/crypto.ts`, `seed.sql`
- **実装例**:
```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

#### タスク2: JWT署名の正しい実装
- **現状**: Base64エンコードのみ
- **目標**: HMAC-SHA256による署名
- **工数**: 2-3日
- **ファイル**: `src/utils/crypto.ts`
- **実装例**:
```typescript
import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export async function generateToken(userId: string, role: string, secret: string): Promise<string> {
  return await sign({
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  }, secret);
}
```

#### タスク3: セキュリティヘッダー設定
- **現状**: ヘッダー未設定
- **目標**: CSP、X-Frame-Options等設定
- **工数**: 1-2日
- **ファイル**: `src/index.tsx`
- **実装例**:
```typescript
app.use('*', async (c, next) => {
  await next();
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net");
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});
```

#### タスク4: ファイルアップロード検証強化
- **現状**: クライアント側のみ
- **目標**: MIMEタイプ、サイズ、ウイルススキャン
- **工数**: 2-3日
- **ファイル**: `src/routes/files.ts`

#### タスク5: バックエンド入力検証実装
- **現状**: フロントエンドのみ
- **目標**: 全エンドポイントで検証
- **工数**: 3-4日
- **ファイル**: 全ルートファイル

---

### テスト実装（2-3週間）

#### タスク6: Jest導入とユニットテスト実装
- **現状**: テストコード0件
- **目標**: カバレッジ50%以上
- **工数**: 1-2週間
- **実装範囲**:
  - `src/db/queries.ts`（データベースクエリ）
  - `src/utils/crypto.ts`（暗号化ユーティリティ）
  - `src/utils/email.ts`（メール送信）
  - `src/utils/pdf.ts`（PDF生成）
- **実装例**:
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

#### タスク7: Playwright導入とE2Eテスト実装
- **現状**: E2Eテスト0件
- **目標**: 主要シナリオ全て
- **工数**: 1週間
- **テストシナリオ**:
  - ログイン・ログアウト
  - 案件作成・編集・削除
  - ファイルアップロード・ダウンロード
  - チャット送信・受信
  - AI提案生成
  - PDF生成
- **実装例**:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

#### タスク8: GitHub ActionsでCI/CD構築
- **現状**: CI/CDなし
- **目標**: テスト自動化、デプロイ自動化
- **工数**: 2-3日
- **ファイル**: `.github/workflows/ci.yml`
- **実装例**:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
```

---

## 🟡 高優先度タスク（High）: 5-7週間

### UI/UX改善（2-3週間）

#### タスク9: レスポンシブデザイン完全対応
- **工数**: 1週間
- **ブレークポイント**: 320px、768px、1024px、1440px
- **対応範囲**: 全ページ

#### タスク10: モバイルナビゲーション実装
- **工数**: 2-3日
- **実装内容**: ハンバーガーメニュー、ボトムナビ

#### タスク11: 空状態デザイン実装
- **工数**: 2-3日
- **対象**: 案件なし、通知なし、検索結果なし

#### タスク12: スケルトンスクリーン実装
- **工数**: 2-3日
- **対象**: 案件一覧、案件詳細、通知一覧

#### タスク13: カスタム確認ダイアログ実装
- **工数**: 1-2日
- **内容**: alert置き換え、モーダルコンポーネント

#### タスク14: トーストUI導入
- **工数**: 1-2日
- **ライブラリ**: react-hot-toast または sonner

---

### フロントエンド再構築（3-4週間）

#### タスク15: React + TypeScript化
- **現状**: Vanilla JS 1,632行
- **工数**: 2-3週間
- **構成**: Vite + React + TypeScript
- **実装例**:
```bash
npm create vite@latest webapp-frontend -- --template react-ts
npm install zustand react-query react-router-dom react-hook-form
```

#### タスク16: 状態管理ライブラリ導入
- **工数**: 3-4日
- **ライブラリ**: Zustand（推奨）または Redux Toolkit

#### タスク17: コンポーネント分割と再利用性向上
- **工数**: 1週間
- **コンポーネント例**:
  - `DealCard`、`DealList`
  - `ChatMessage`、`ChatInput`
  - `FileUploader`、`FileList`
  - `NotificationItem`、`NotificationList`

---

### パフォーマンス最適化（1週間）

#### タスク18: ページネーション実装
- **工数**: 2-3日
- **対象**: 案件一覧、通知一覧

#### タスク19: 画像遅延読み込み実装
- **工数**: 1-2日
- **実装**: Intersection Observer API

#### タスク20: デバウンス実装
- **工数**: 1日
- **対象**: 検索、入力フィールド

---

## 🟢 中優先度タスク（Medium）: 6-8週間

### 検索・フィルター機能強化（1週間）

#### タスク21-26: フィルター・表示機能
- **タスク21**: 案件カードに主要情報追加（2-3日）
- **タスク22**: 価格帯フィルター（1-2日）
- **タスク23**: 面積フィルター（1-2日）
- **タスク24**: エリアフィルター（市区町村）（1-2日）
- **タスク25**: リスト/グリッド表示切り替え（1日）
- **タスク26**: Excelエクスポート（2-3日）

---

### ファイル管理強化（1-2週間）

#### タスク27-30: R2統合とファイル管理
- **タスク27**: Cloudflare R2統合（3-4日）
  ```bash
  npx wrangler r2 bucket create webapp-files
  ```
- **タスク28**: フォルダ分類機能（2-3日）
- **タスク29**: ファイルプレビュー（PDF、画像）（3-4日）
- **タスク30**: ファイルバージョン管理（2-3日）

---

### チャット機能強化（1週間）

#### タスク31-33: チャット拡張
- **タスク31**: ファイル添付機能（2-3日）
- **タスク32**: チャット履歴検索（2-3日）
- **タスク33**: @メンション機能（2-3日）

---

### 通知機能強化（3-4日）

#### タスク34-35: 通知拡張
- **タスク34**: メール送信設定（ON/OFF）（1-2日）
- **タスク35**: ブラウザプッシュ通知（2-3日）

---

### バックエンド強化（2-3週間）

#### タスク36-40: バックエンド拡張
- **タスク36**: APIバージョニング（/api/v1/）（1-2日）
- **タスク37**: レート制限実装（2-3日）
- **タスク38**: OpenAPI仕様書作成（3-4日）
- **タスク39**: エラートラッキング導入（2-3日）
- **タスク40**: データベースバックアップ自動化（2-3日）

---

## 🔵 低優先度タスク（Low）: 3-4週間

### プロダクト機能（1-2週間）

#### タスク41-45: オンボーディング・分析
- **タスク41**: オンボーディングチュートリアル（3-4日）
- **タスク42**: ヘルプセンター構築（3-4日）
- **タスク43**: 用語集・ツールチップ（1-2日）
- **タスク44**: Google Analytics導入（1日）
- **タスク45**: フィードバック機能（2-3日）

---

### 分析・レポーティング（2-3週間）

#### タスク46-48: データ分析機能
- **タスク46**: KPIダッシュボード（1週間）
- **タスク47**: 月次レポート自動生成（3-4日）
- **タスク48**: トレンド分析機能（3-4日）

---

### UI/UX高度化（3-4日）

#### タスク49-50: デザイン拡張
- **タスク49**: ダークモード対応（2-3日）
- **タスク50**: アニメーションライブラリ導入（1-2日）

---

## 📅 推奨実装スケジュール

### フェーズ1: 基盤強化（Week 1-5）
**期間**: 5週間  
**タスク**: 1-8（セキュリティ + テスト）  
**目標**: 本番運用可能なセキュリティレベル達成

### フェーズ2: UI/UX改善（Week 6-10）
**期間**: 5週間  
**タスク**: 9-20（レスポンシブ + React化 + パフォーマンス）  
**目標**: モダンなユーザー体験提供

### フェーズ3: 機能拡充（Week 11-18）
**期間**: 8週間  
**タスク**: 21-40（検索 + ファイル + チャット + バックエンド）  
**目標**: エンタープライズグレード機能完成

### フェーズ4: 価値向上（Week 19-22）
**期間**: 4週間  
**タスク**: 41-50（オンボーディング + 分析 + 高度化）  
**目標**: 10/10点達成

---

## 📊 進捗トラッキング

### 現在の状態
- **完了タスク**: 0/50（0%）
- **進行中タスク**: 0/50（0%）
- **未着手タスク**: 50/50（100%）

### マイルストーン
- [ ] **M1**: セキュリティ強化完了（Week 2）
- [ ] **M2**: テスト実装完了（Week 5）
- [ ] **M3**: レスポンシブ対応完了（Week 6）
- [ ] **M4**: React化完了（Week 10）
- [ ] **M5**: 機能拡充完了（Week 18）
- [ ] **M6**: 10/10点達成（Week 22）

---

## 🎯 成功の定義

### 定量指標
- [ ] テストカバレッジ: 80%以上
- [ ] セキュリティスコア: 90/100以上
- [ ] Lighthouse Performance: 90以上
- [ ] ページ読み込み時間: 2秒以内
- [ ] エラー率: 3%以下

### 定性指標
- [ ] プロフェッショナルテスター評価: 9.5/10以上
- [ ] ユーザー満足度: 90%以上
- [ ] 初回訪問からアクティブ化: 80%以上
- [ ] 月次アクティブ率: 70%以上

---

## 📝 次のアクション

### 今すぐ開始すべきタスク
1. **タスク1**: パスワードハッシュ強化（bcrypt導入）
2. **タスク2**: JWT署名の正しい実装
3. **タスク3**: セキュリティヘッダー設定

### 1週間以内に開始すべきタスク
4. **タスク4**: ファイルアップロード検証強化
5. **タスク5**: バックエンド入力検証実装
6. **タスク6**: Jest導入（テスト環境構築）

### 1ヶ月以内に開始すべきタスク
7. **タスク7**: Playwright導入（E2Eテスト）
8. **タスク8**: GitHub Actions（CI/CD）
9. **タスク9**: レスポンシブデザイン対応

---

## 🔗 関連ドキュメント

- [PROFESSIONAL_TEST_REPORT.md](./PROFESSIONAL_TEST_REPORT.md) - 10名のテスター評価詳細
- [PRODUCTION_RELEASE_v1.3.0.md](./PRODUCTION_RELEASE_v1.3.0.md) - 現在のリリース状態
- [DEPLOYMENT.md](./DEPLOYMENT.md) - デプロイガイド
- [NEXT_TASKS.md](./NEXT_TASKS.md) - Phase 2タスク詳細

---

**このタスク一覧は、プロダクトを10/10点に引き上げるための完全なロードマップです。**

**計画的に実行することで、確実に目標を達成できます！🚀**
