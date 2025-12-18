# 未完了タスク一覧（v3.153.124実装計画）

## 📅 作成日時
2025-12-17

## 🎯 目標
国交省APIからの正確なデータ取得とファクトチェックシステムの実装

---

## 📊 現在の状況

### ✅ 完了済み（v3.153.123）
- ハザードデータベーススキーマ構築（4テーブル）
- サンプルデータ投入（846件）
- NG条件厳格化（7項目）
- フロントエンドUI実装
- データ収集スクリプト作成（collect-hazard-data.cjs）
- 完全なドキュメント化

### 🔲 未完了（これから実施）
- 国交省APIからの正確なデータ取得
- ファクトチェックシステム実装
- 本番環境デプロイ
- E2Eテスト

---

## 📋 Phase 1: データ精度向上（最優先）

### Task 1-1: 国交省APIからの正確なデータ取得
**目的**: サンプルデータを国交省の正確なデータに置き換える

**利用可能なAPI**:
1. **ハザードマップポータルサイト API**
   - URL: https://disaportal.gsi.go.jp/
   - 提供データ: 洪水、土砂災害、津波、液状化
   - 形式: REST API / GeoJSON

2. **MLIT API（既に連携済み）**
   - `XKT002`: 用途地域（市街化調整区域、防火地域）
   - `XKT031`: 土砂災害警戒区域
   - `XKT034`: 洪水浸水想定区域（コード実装済み）

**実装方針**:
- 現在のサンプルデータは **仮データ** であることを明示
- 国交省APIへのアクセス方法をドキュメント化
- APIレート制限を考慮したバッチ処理
- エラーハンドリングと再試行ロジック

**成果物**:
- [ ] `scripts/fetch-real-hazard-data.cjs`: 国交省API連携スクリプト
- [ ] `migrations/0035_real_hazard_data.sql`: 正確なデータ投入SQL
- [ ] `docs/MLIT_API_INTEGRATION.md`: API連携ドキュメント

---

### Task 1-2: ファクトチェックシステム実装
**目的**: 複数データソースでクロスチェックし、データの信頼性を確保

**チェック項目**:
1. **データソースの一致性**
   - 国交省ハザードマップ
   - 都道府県ハザードマップ
   - 市区町村ハザードマップ

2. **データの矛盾検出**
   - リスクレベルの不一致
   - 影響範囲の不一致
   - 更新日時の差異

3. **信頼度スコアリング**
   - `confidence_level`: high/medium/low
   - 一致度が高い → high
   - 一部不一致 → medium
   - 大きな不一致 → low（手動確認）

**実装方針**:
```javascript
// scripts/fact-check.cjs
async function factCheck(prefecture, city, hazardType) {
  // 1. 国交省データ取得
  const mlitData = await fetchMLITData(prefecture, city, hazardType);
  
  // 2. 都道府県データ取得（可能な場合）
  const prefectureData = await fetchPrefectureData(prefecture, city, hazardType);
  
  // 3. データ比較
  const comparison = compareData(mlitData, prefectureData);
  
  // 4. 信頼度スコア計算
  const confidenceLevel = calculateConfidence(comparison);
  
  return {
    hazardType,
    riskLevel: mlitData.riskLevel,
    confidenceLevel,
    dataSource: 'MLIT + Prefecture',
    needsManualCheck: confidenceLevel === 'low'
  };
}
```

**成果物**:
- [ ] `scripts/fact-check.cjs`: ファクトチェックスクリプト
- [ ] `migrations/0036_add_confidence_level.sql`: 信頼度フィールド追加
- [ ] `reports/fact-check-results.json`: ファクトチェック結果

---

### Task 1-3: データ更新の自動化
**目的**: 定期的にハザードデータを最新化

**実装方針**:
1. **更新頻度**: 月次更新
2. **更新対象**: `last_updated`が1ヶ月以上前のデータ
3. **差分更新**: 変更があったデータのみ更新
4. **履歴管理**: 更新履歴をログに記録

**スクリプト設計**:
```javascript
// scripts/update-hazard-data.cjs
async function updateHazardData() {
  // 1. 古いデータを抽出
  const oldData = await findOldData(30); // 30日以上前
  
  // 2. APIから最新データ取得
  const newData = await fetchLatestData(oldData);
  
  // 3. 差分検出
  const diff = detectDifferences(oldData, newData);
  
  // 4. 変更があるデータのみ更新
  await updateDatabase(diff);
  
  // 5. 更新ログ記録
  await logUpdate(diff);
}
```

**成果物**:
- [ ] `scripts/update-hazard-data.cjs`: 自動更新スクリプト
- [ ] `logs/update-history.log`: 更新履歴ログ

---

## 📋 Phase 2: 本番環境デプロイ（中優先）

### Task 2-1: 本番DBへのマイグレーション適用
**コマンド**:
```bash
# ローカルで最終確認
npx wrangler d1 migrations list real-estate-200units-db --local

# 本番環境に適用
npx wrangler d1 migrations apply real-estate-200units-db
```

**確認項目**:
- [ ] 全マイグレーションが正常に適用される
- [ ] データ整合性チェック
- [ ] インデックスが正しく作成される

---

### Task 2-2: 本番環境デプロイ
**コマンド**:
```bash
# ビルド
npm run build

# デプロイ
npm run deploy:prod
```

**確認項目**:
- [ ] ビルドエラーなし
- [ ] デプロイ成功
- [ ] 本番URL動作確認

---

### Task 2-3: E2Eテスト
**テストケース**:

#### **ケース1: 渋谷区（ハザード情報表示）**
1. ログイン
2. 案件作成画面
3. 住所入力: "東京都渋谷区恵比寿1-1-1"
4. ハザード情報が自動表示される
5. 確認項目:
   - [ ] 洪水リスク表示
   - [ ] 土砂災害リスク表示
   - [ ] 津波リスク表示
   - [ ] 液状化リスク表示

#### **ケース2: 横浜市（NG条件判定）**
1. 住所入力: "神奈川県横浜市〇〇区（市街化調整区域）"
2. NG条件が表示される
3. 確認項目:
   - [ ] 赤色の「検討外エリア・条件」セクション表示
   - [ ] NG条件名と説明文が正確
   - [ ] 案件作成ボタンが無効化

#### **ケース3: 千葉市（OK判定）**
1. 住所入力: "千葉県千葉市中央区〇〇（リスクなし）"
2. ハザード情報が表示される
3. 確認項目:
   - [ ] リスクレベルが全て"none"または"low"
   - [ ] 融資判定が"OK"
   - [ ] 案件作成ボタンが有効

---

## 📋 Phase 3: 機能拡張（将来）

### Task 3-1: 条例データベース
- 駐車場附置義務条例
- ワンルーム規制条例
- その他条例（風致地区、景観条例等）

### Task 3-2: 収支計算DB
- 賃料相場マスタ
- 建築費マスタ
- 融資基準マスタ
- 市場価格評価マスタ

### Task 3-3: 買主別基準DB
- Felix（200棟プロジェクト）
- GA Technologies
- その他買主

### Task 3-4: 高度な分析機能
- P/L計算（利回り>6.5%）
- 市場価格評価（5段階）
- 融資適合性判定（オリックス>7%、スルガ>8%）

---

## ⚠️ 重要な注意事項

### 1. API利用制限
- 国交省APIにはレート制限がある
- データ収集時は適切な間隔（1秒/1リクエスト推奨）
- 大量データ取得時はバッチ処理

### 2. データの正確性
- 現在のデータは **サンプルデータ**
- 本番運用には国交省APIからの正確なデータが **必須**
- ファクトチェックを必ず実施

### 3. データ保守
- ハザードマップは随時更新される
- 月次更新を推奨
- `last_updated`フィールドで古いデータを管理

### 4. エラーハンドリング
- API障害時のフォールバック処理
- データ不整合時の手動確認フロー
- エラーログの詳細記録

---

## 📝 実装優先順位

### 🔴 最優先（Phase 1）
1. Task 1-1: 国交省APIからの正確なデータ取得
2. Task 1-2: ファクトチェックシステム実装

### 🟡 中優先（Phase 2）
3. Task 2-1: 本番DBマイグレーション
4. Task 2-2: 本番環境デプロイ
5. Task 2-3: E2Eテスト

### 🟢 低優先（Phase 3）
6. Task 3-1: 条例データベース
7. Task 3-2: 収支計算DB
8. Task 3-3: 買主別基準DB
9. Task 3-4: 高度な分析機能

---

## 📊 進捗トラッキング

### Phase 1: データ精度向上
- [ ] Task 1-1: 国交省API連携スクリプト作成
- [ ] Task 1-2: ファクトチェックシステム実装
- [ ] Task 1-3: データ更新自動化スクリプト作成

### Phase 2: 本番環境デプロイ
- [ ] Task 2-1: 本番DBマイグレーション
- [ ] Task 2-2: 本番環境デプロイ
- [ ] Task 2-3: E2Eテスト（3ケース）

### Phase 3: 機能拡張
- [ ] Task 3-1: 条例データベース
- [ ] Task 3-2: 収支計算DB
- [ ] Task 3-3: 買主別基準DB
- [ ] Task 3-4: 高度な分析機能

---

**最終更新**: 2025-12-17  
**次のアクション**: Phase 1 Task 1-1の実装開始
