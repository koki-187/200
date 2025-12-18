# 現状と今後のタスク - v3.153.124

**最終更新**: 2025-12-18  
**本番URL**: https://4d98dcb8.real-estate-200units-v2.pages.dev  
**プロジェクトステータス**: ✅ **Phase 1完了 - 本番運用可能（サンプルデータ）**

---

## 📊 現在の実装状況

### ✅ 完了済み機能

#### 1. ハザードデータベース基盤構築
- **データベース構造**: 4テーブル完成（hazard_info, zoning_restrictions, geography_risks, loan_restrictions）
- **データ投入**: 846件のサンプルデータ（本番環境: 838件）
- **対象エリア**: 一都三県184市区町村
- **政令指定都市対応**: 横浜市・川崎市・相模原市・さいたま市・千葉市の区レベルまで対応完了

#### 2. API実装
- ✅ `/api/hazard-db/info` - ハザード情報取得
- ✅ `/api/hazard-db/cities` - 登録市区町村一覧
- ✅ Address解析ロジック（政令指定都市対応）
- ✅ 融資NG判定ロジック（7条件）

#### 3. フロントエンド実装
- ✅ ハザード情報自動表示機能
- ✅ NG条件表示（赤色バナー）
- ✅ 案件作成時のバリデーション（NG時は作成不可）
- ✅ 備考欄への自動注意事項挿入

#### 4. E2Eテスト
- ✅ 東京都渋谷区: Success (8 hazards)
- ✅ 神奈川県横浜市西区: Success (4 hazards)
- ✅ 神奈川県川崎市川崎区: Success (4 hazards)
- ✅ 埼玉県さいたま市大宮区: Success (4 hazards)
- ✅ 千葉県千葉市中央区: Success (4 hazards)

---

## ⚠️ 重要な制限事項

### 現在のデータはサンプル（ランダム生成）

**問題点**:
```javascript
// scripts/collect-hazard-data.cjs (Line 53)
const riskLevel = hazardType.riskLevels[Math.floor(Math.random() * hazardType.riskLevels.length)];
```

現在のハザードデータは **ランダムに生成されたサンプルデータ** です。

**影響**:
- 実際のハザードリスクと異なる情報が表示される可能性
- 融資NG判定が不正確
- 本番運用には不適切

**対策**:
Phase 1（データ精度向上）の実装が必須

---

## 🚀 未完了タスク（優先度順）

### **Phase 1: データ精度向上** 🔴 **【最優先】**

#### Task 1.1: 国交省ハザードマップAPIからの正確なデータ取得

**目的**: サンプルデータを国交省APIから取得した正確なデータに置き換える

**実装内容**:
1. **国交省API統合**
   - 洪水浸水想定区域API (XKT034)
   - 土砂災害警戒区域API (XKT031)
   - 津波浸水想定区域API (XKT033)
   - 高潮浸水想定区域API (XKT032)

2. **データ収集スクリプト改善**
   ```javascript
   // scripts/collect-real-hazard-data.cjs
   // - MLIT APIキーを使用
   // - 座標変換（住所→緯度経度→タイル座標）
   // - GeoJSONレスポンスの解析
   // - 実際のリスクレベル判定
   ```

3. **段階的データ更新**
   - Step 1: 東京都23区のみ（検証用）
   - Step 2: 一都三県の政令指定都市
   - Step 3: 全184市区町村

**参考ドキュメント**: `/home/user/webapp/docs/MLIT_API_INTEGRATION.md`

**推定工数**: 8-12時間

---

#### Task 1.2: ファクトチェックシステム実装

**目的**: データ品質を管理し、手動確認が必要な項目をトラッキング

**実装内容**:
1. **データ信頼度フィールド追加**
   ```sql
   ALTER TABLE hazard_info ADD COLUMN confidence_level TEXT DEFAULT 'pending';
   -- high: API+複数ソース確認済み
   -- medium: API単独ソース
   -- low: サンプルデータ
   -- pending: 未確認
   
   ALTER TABLE hazard_info ADD COLUMN verification_status TEXT DEFAULT 'pending';
   -- verified: ファクトチェック完了
   -- pending: 確認待ち
   -- conflict: データ矛盾検出
   ```

2. **ファクトチェックスクリプト**
   ```javascript
   // scripts/fact-check.cjs
   // - 複数データソースの比較
   // - データ矛盾の検出
   // - 手動確認リストの生成
   ```

3. **管理画面（ダッシュボード）**
   - データ品質概要表示
   - 未確認データ一覧
   - 矛盾データ一覧
   - 手動確認ワークフロー

**推定工数**: 4-6時間

---

### **Phase 2: 機能拡張** 🟡 **【推奨】**

#### Task 2.1: データ自動更新機能

**目的**: 定期的に国交省APIからデータを同期

**実装内容**:
1. **Cloudflare Cron Triggers**
   ```javascript
   // wrangler.jsonc
   {
     "triggers": {
       "crons": ["0 3 * * 0"]  // 毎週日曜3時
     }
   }
   ```

2. **差分更新ロジック**
   - 変更検出（last_updated比較）
   - 増分更新のみ実行
   - ログ記録

**推定工数**: 3-4時間

---

#### Task 2.2: 詳細なNG条件説明

**目的**: ユーザーに各NG条件の詳細と対策を提示

**実装内容**:
1. **NG条件詳細ページ**
   - 各条件の法的根拠
   - 金融機関の判断基準
   - 対策方法（建築確認申請、地盤改良等）
   - 関連リンク（国交省、自治体）

2. **モーダルUI実装**
   - NG条件クリックで詳細表示
   - 専門家への相談リンク

**推定工数**: 2-3時間

---

#### Task 2.3: ハザードマップ可視化

**目的**: 地図上でハザード情報を視覚的に表示

**実装内容**:
1. **地図ライブラリ統合**
   - Leaflet.js または Mapbox GL JS
   - 国交省重ねるハザードマップ連携

2. **レイヤー表示**
   - 洪水浸水想定区域（色分け）
   - 土砂災害警戒区域（アイコン）
   - 物件位置マーカー

3. **インタラクティブ機能**
   - クリックで詳細情報表示
   - ズーム・パン操作
   - レイヤー切り替え

**推定工数**: 6-8時間

---

## 📁 重要なファイル一覧

### データベース関連
| ファイル | 説明 |
|---------|------|
| `/home/user/webapp/migrations/0029_hazard_database.sql` | ハザードDBスキーマ |
| `/home/user/webapp/migrations/0030_loan_restriction_criteria.sql` | 融資制限基準 |
| `/home/user/webapp/migrations/0031_ordinance_database.sql` | 条例DB |
| `/home/user/webapp/migrations/0032_financial_analysis.sql` | 収支計算DB |
| `/home/user/webapp/migrations/0033_buyer_criteria.sql` | 買主別基準 |
| `/home/user/webapp/migrations/0034_hazard_data.sql` | **サンプルデータ（要置換）** |

### スクリプト関連
| ファイル | 説明 |
|---------|------|
| `/home/user/webapp/scripts/collect-hazard-data.cjs` | サンプルデータ生成 |
| `/home/user/webapp/scripts/municipalities.json` | 市区町村リスト（184件） |

### API実装
| ファイル | 説明 |
|---------|------|
| `/home/user/webapp/src/routes/hazard-database.ts` | ハザードDB API |
| `/home/user/webapp/src/routes/reinfolib.ts` | 国交省API統合 |

### フロントエンド
| ファイル | 説明 |
|---------|------|
| `/home/user/webapp/public/static/global-functions.js` | ハザード情報表示ロジック |
| `/home/user/webapp/src/index.tsx` | 案件作成バリデーション |

### ドキュメント
| ファイル | 説明 |
|---------|------|
| `/home/user/webapp/HAZARD_DATABASE_CONSTRUCTION.md` | ハザードDB構築詳細 |
| `/home/user/webapp/docs/MLIT_API_INTEGRATION.md` | 国交省API統合ドキュメント |
| `/home/user/webapp/V3.153.123_COMPLETION_REPORT.md` | v3.153.123完成報告 |
| `/home/user/webapp/V3.153.124_FINAL_COMPLETION_REPORT.md` | v3.153.124完成報告 |
| `/home/user/webapp/README.md` | プロジェクト全体ドキュメント |

---

## 🎯 次のアクション

### 最優先タスク
1. ✅ 現状ドキュメント作成（このファイル）
2. ⏳ **Task 1.1実装開始**: 国交省APIからの正確なデータ取得
3. ⏳ **Task 1.2実装開始**: ファクトチェックシステム

### 推奨される開発順序
```
1. Task 1.1 (Step 1) - 東京都23区の正確なデータ取得・検証
2. Task 1.2 - ファクトチェックシステム実装
3. Task 1.1 (Step 2-3) - 全エリアのデータ取得
4. Task 2.1 - データ自動更新機能
5. Task 2.2 - NG条件詳細説明
6. Task 2.3 - ハザードマップ可視化
```

---

## ⚠️ 注意事項

### 本番運用前に必須
- [ ] Task 1.1完了（正確なデータへの置換）
- [ ] Task 1.2完了（ファクトチェック）
- [ ] E2Eテスト実施（正確なデータで再検証）
- [ ] ユーザー承認

### データ投入時の注意
- バックアップ必須（既存データの退避）
- 段階的な投入（全件一括は避ける）
- ロールバック手順の準備

---

**作成者**: AI Assistant  
**作成日**: 2025-12-18  
**ドキュメントバージョン**: v1.0.0
