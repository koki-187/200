# 不動産200ユニット管理システム v3.65.0 引き継ぎドキュメント

## 📋 バージョン情報
- **バージョン**: v3.65.0 (Major Feature Release)
- **リリース日**: 2025-12-01
- **リリース種別**: 新機能実装 - クライテリア強化・特別案件フロー
- **Git コミット**: 9126b06

## 🚀 本番環境情報
- **本番URL**: https://c1a201a3.real-estate-200units-v2.pages.dev
- **GitHubリポジトリ**: https://github.com/koki-187/200
- **デプロイ日時**: 2025-12-01 06:11 UTC
- **ステータス**: ✅ 本番稼働中

## 🎯 v3.65.0 実装内容

### 1. 初回6情報の必須チェック機能 ✅

**目的**: 案件受付時に必須情報が揃っていない場合、受付を不可とする

**実装内容**:
- 新しいバリデーションスキーマ `requiredInitialInfoSchema` と `dealCreateSchema` を作成
- 必須項目（9フィールド）:
  1. **所在地（location）・最寄駅（station）**: 完全な住所と最寄り駅
  2. **面積（land_area）**: 土地面積（実測／公簿）
  3. **用途・建蔽・容積・防火（zoning, building_coverage, floor_area_ratio, fire_zone）**: 都市計画情報
  4. **接道（road_info, frontage）**: 接道状況（方位・幅員・間口）
  5. **現況（current_status）**: 物件の現在の状態
  6. **希望価格（desired_price）**: 価格情報

**バリデーションメッセージ例**:
```
【必須】所在地を入力してください
【必須】最寄駅を入力してください
【必須】土地面積を入力してください
【必須】用途地域を入力してください
【必須】建蔽率を入力してください
【必須】容積率を入力してください
【必須】防火地域区分を入力してください
【必須】接道状況（方位・幅員）を入力してください
【必須】間口を入力してください
【必須】現況を入力してください
【必須】希望価格を入力してください
```

**関連ファイル**:
- `src/utils/validation.ts`: バリデーションスキーマ定義
- `src/routes/deals.ts`: 案件作成API（POST /api/deals）

### 2. 特別案件フロー実装 ✅

**目的**: クライテリア非該当時でも、理由を記入して特別案件として処理できる仕組み

**データベース変更**:
```sql
-- 0025_add_special_case_fields.sql
ALTER TABLE deals ADD COLUMN special_case_reason TEXT;
ALTER TABLE deals ADD COLUMN special_case_status TEXT 
  CHECK(special_case_status IN ('PENDING', 'APPROVED', 'REJECTED') OR special_case_status IS NULL);
ALTER TABLE deals ADD COLUMN special_case_reviewed_by TEXT;
ALTER TABLE deals ADD COLUMN special_case_reviewed_at TEXT;
```

**新しいAPIエンドポイント**:

1. **特別案件申請** (POST `/api/purchase-criteria/special-case`)
   - クライテリア非該当時に理由を記入して申請
   - リクエスト: `{ deal_id, reason }`
   - レスポンス: `{ success: true, message: "特別案件として申請しました。管理者の承認をお待ちください。" }`

2. **特別案件承認/却下** (PUT `/api/purchase-criteria/special-case/:dealId/review`)
   - 管理者が特別案件を承認または却下
   - リクエスト: `{ status: "APPROVED" | "REJECTED", reviewer_id }`
   - レスポンス: `{ success: true, message: "特別案件を承認しました" }`

3. **特別案件一覧取得** (GET `/api/purchase-criteria/special-cases?status=PENDING`)
   - 管理者用: 特別案件の一覧を取得
   - フィルター: `PENDING`, `APPROVED`, `REJECTED`, `ALL`

**フロー**:
```
1. 案件登録 → クライテリアチェック → 非該当（FAIL または SPECIAL_REVIEW）
2. エージェントが理由を記入 → POST /api/purchase-criteria/special-case
3. 管理者が承認/却下 → PUT /api/purchase-criteria/special-case/:dealId/review
4. ステータス更新: PENDING → APPROVED / REJECTED
```

**関連ファイル**:
- `migrations/0025_add_special_case_fields.sql`: DB マイグレーション
- `src/routes/purchase-criteria.ts`: 特別案件API

### 3. 建築基準法・条例の自動補足調査機能 ✅

**目的**: 物件情報から該当する建築基準法や条例の規定を自動表示

**実装内容**:
- 7つの主要な建築基準法規定を定義:
  1. **接道義務（建築基準法第43条）**: 全物件に適用
  2. **準防火地域の制限（第61条、第62条）**: 準防火地域
  3. **防火地域の制限（第61条）**: 防火地域
  4. **高度地区による高さ制限（第58条）**: 高度地区指定時
  5. **北側斜線制限（第56条）**: 低層・中高層住居専用地域
  6. **絶対高さ制限（第55条）**: 第一種・第二種低層住居専用地域（10m/12m）
  7. **集合住宅の駐車場設置義務**: 集合住宅・マンション・アパート

- 都道府県別の駐車場設置基準:
  - **東京都**: 住戸3戸につき1台以上
  - **埼玉県**: 住戸2戸につき1台以上
  - **千葉県**: 住戸2戸につき1台以上
  - **神奈川県**: 住戸2戸につき1台以上
  - **愛知県**: 住戸2戸につき1台以上

**APIエンドポイント**:

1. **建築基準法チェック** (POST `/api/building-regulations/check`)
   - リクエスト: 物件情報（location, zoning, fire_zone, height_district, current_status, etc.）
   - レスポンス:
     ```json
     {
       "success": true,
       "data": {
         "regulations": [
           {
             "id": "road_access",
             "title": "接道義務（建築基準法第43条）",
             "description": "建築物の敷地は、原則として幅員4m以上の道路に2m以上接しなければなりません。",
             "reference": "建築基準法第43条",
             "category": "BUILDING_CODE"
           }
         ],
         "parking_requirement": {
           "prefecture": "埼玉県",
           "requirement": {
             "units_per_parking": 2,
             "min_area_sqm": 500,
             "description": "延べ面積500㎡以上の集合住宅：住戸2戸につき1台以上（地域により異なる）"
           }
         },
         "total_applicable": 3
       }
     }
     ```

2. **駐車場基準取得** (GET `/api/building-regulations/parking/:prefecture`)
   - 都道府県別の駐車場設置基準を取得

**関連ファイル**:
- `src/utils/buildingRegulations.ts`: 建築基準法ロジック
- `src/routes/building-regulations.ts`: 建築基準法API
- `src/index.tsx`: ルート追加

### 4. OCR機能の精度向上 ✅

**目的**: 初回6情報の抽出精度を向上

**改善内容**:
- OCRプロンプトに「初回必須情報（最優先で抽出）」セクションを追加
- 文字認識の優先順位に「初回6情報を最優先」を明記
- 防火地域（fire_zone）と高度地区（height_district）の抽出ガイドを追加
- OCR出力フォーマットに `height_district` と `fire_zone` を追加

**プロンプト変更箇所**:
```typescript
# ⚠️ 初回必須情報（最優先で抽出）

以下の6つの情報は**必須項目**です。これらは高精度で抽出してください：

1. **所在地（location）・最寄駅（station）**: 完全な住所と最寄り駅を必ず抽出
2. **面積（land_area）**: 土地面積（実測／公簿）を単位込みで抽出
3. **用途地域（zoning）・建蔽率（building_coverage）・容積率（floor_area_ratio）・防火地域（fire_zone）**: 都市計画情報を正確に抽出
4. **接道（road_info）・間口（frontage）**: 接道状況（方位・幅員）と間口を詳細に抽出
5. **現況（current_status）**: 物件の現在の状態を明確に抽出
6. **希望価格（price）**: 価格情報を単位込みで正確に抽出

これらの情報がない場合、案件受付ができません。最優先で抽出してください。
```

**関連ファイル**:
- `src/routes/property-ocr.ts`: OCRプロンプト更新

## 📊 テスト結果

### ローカル環境テスト ✅

1. **ヘルスチェック**: ✅ 成功
   ```bash
   curl http://localhost:3000/api/health
   # {"status":"ok","timestamp":"2025-12-01T06:08:05.565Z"}
   ```

2. **建築基準法API**: ✅ 成功
   ```bash
   # 埼玉県さいたま市の集合住宅 → 3つの規定が該当
   curl -X POST http://localhost:3000/api/building-regulations/check \
     -d '{"location":"埼玉県さいたま市浦和区","zoning":"第一種住居地域","fire_zone":"準防火地域","current_status":"集合住宅"}'
   # 該当規定: 接道義務、準防火地域の制限、集合住宅の駐車場設置義務
   ```

3. **購入条件チェックAPI**: ✅ 成功
   ```bash
   # 埼玉県さいたま市、面積150坪、間口8.0m → PASS (スコア100)
   curl -X POST http://localhost:3000/api/purchase-criteria/check \
     -d '{"id":"test-deal-001","location":"埼玉県さいたま市浦和区","station":"浦和","walk_minutes":"10","land_area":"150","building_coverage":"60%","floor_area_ratio":"200%","frontage":"8.0"}'
   # 結果: "overall_result": "PASS", "check_score": 100
   ```

### 本番環境テスト ✅

1. **ヘルスチェック**: ✅ 成功
   ```bash
   curl https://c1a201a3.real-estate-200units-v2.pages.dev/api/health
   # {"status":"ok","timestamp":"2025-12-01T06:11:14.891Z"}
   ```

2. **建築基準法API**: ✅ 成功
   ```bash
   # 東京都渋谷区の第一種低層住居専用地域 → 6つの規定が該当
   curl -X POST https://c1a201a3.real-estate-200units-v2.pages.dev/api/building-regulations/check \
     -d '{"location":"東京都渋谷区","zoning":"第一種低層住居専用地域","fire_zone":"準防火地域","height_district":"第2種高度地区","current_status":"集合住宅"}'
   # 該当規定: 接道義務、準防火地域の制限、高度地区制限、絶対高さ制限、北側斜線制限、駐車場設置義務
   ```

3. **購入条件チェックAPI**: ✅ 成功
   ```bash
   # 神奈川県横浜市、間口6.5m（基準7.5m未満） → SPECIAL_REVIEW (スコア86)
   curl -X POST https://c1a201a3.real-estate-200units-v2.pages.dev/api/purchase-criteria/check \
     -d '{"id":"prod-test-001","location":"神奈川県横浜市中区","station":"関内","walk_minutes":"12","land_area":"160","building_coverage":"80%","floor_area_ratio":"400%","fire_zone":"防火地域","frontage":"6.5"}'
   # 結果: "overall_result": "SPECIAL_REVIEW", "check_score": 86, "failed_conditions": ["間口7.5m以上: 不合格 (実際: 6.5m)"]
   ```

## 🗂️ データベース変更

### マイグレーション履歴

- **0025_add_special_case_fields.sql**: ✅ 適用済み（本番・ローカル）
  - `special_case_reason`: 特別案件理由
  - `special_case_status`: 特別案件ステータス（PENDING, APPROVED, REJECTED）
  - `special_case_reviewed_by`: 承認/却下した管理者ID
  - `special_case_reviewed_at`: 承認/却下日時

### スキーマ変更の影響

- **deals テーブル**: 特別案件フィールド4つ追加
- **既存データへの影響**: なし（既存案件は `special_case_status = NULL`）

## 📁 ファイル変更サマリー

### 新規作成ファイル
- `migrations/0025_add_special_case_fields.sql` - 特別案件フィールド追加
- `src/routes/building-regulations.ts` - 建築基準法API
- `src/utils/buildingRegulations.ts` - 建築基準法ロジック

### 変更ファイル
- `src/utils/validation.ts` - 初回6情報必須バリデーション追加
- `src/routes/deals.ts` - 案件作成時のバリデーション強化
- `src/routes/purchase-criteria.ts` - 特別案件API追加
- `src/routes/property-ocr.ts` - OCRプロンプト強化
- `src/index.tsx` - 建築基準法ルート追加

## 🔄 Git コミット履歴

```bash
9126b06 fix(v3.65.0): Update migration file comments
74bed73 feat(v3.65.0): Implement initial 6 required fields check, special case flow, and building regulations API
```

## 🎯 完了した実装タスク

1. ✅ **初回6情報の必須チェック機能実装** - バリデーションスキーマ作成とAPI修正
2. ✅ **特別案件フロー実装** - DB拡張とAPI追加
3. ✅ **建築基準法・条例の自動補足調査機能** - ロジック実装と表示
4. ✅ **OCR機能の精度向上** - プロンプト強化
5. ✅ **ビルドとローカルテスト実施**
6. ✅ **本番環境へデプロイとテスト**

## 📝 残存タスク（次のセッション用）

### 高優先度タスク
1. ⏳ **資料格納機能改善** - ファイル分類と検索の最適化
2. ⏳ **フロントエンド実装** - 特別案件申請UI、建築基準法情報表示UI
3. ⏳ **通知統合** - 特別案件申請時の管理者通知

### 中優先度タスク
4. ⏳ **セキュリティ強化** - 2要素認証（2FA）の実装
5. ⏳ **セキュリティ強化** - IP制限機能の実装
6. ⏳ **UI/UX改善** - リアルタイムバリデーション
7. ⏳ **UI/UX改善** - 日本語エラーメッセージの統一
8. ⏳ **UI/UX改善** - レスポンシブデザインの最適化

### 低優先度タスク
9. ⏳ **外部通知統合** - LINE通知の実装
10. ⏳ **外部通知統合** - Slack通知の実装
11. ⏳ **その他** - Resendカスタムドメイン設定
12. ⏳ **コード最適化** - 不要ファイル削除（安全性確認後）

## 🚨 既知の問題・制約事項

### マイグレーション関連
- **0020_add_notifications.sql**: 本番環境で既にカラムが存在するためスキップ
  - 影響: なし（機能は正常動作）
  - 対処: マイグレーション履歴には記録されないが、機能的に問題なし

### OCR機能
- **OpenAI APIキー未設定**: OCR機能を使用するには設定が必要
  - 設定方法: `OPENAI_API_KEY_SETUP.md` 参照
  - ローカル: `.dev.vars` に `OPENAI_API_KEY` 追加
  - 本番: `npx wrangler pages secret put OPENAI_API_KEY`

## 💡 推奨される次のステップ

1. **フロントエンド実装**（最優先）
   - 案件作成フォームに初回6情報の必須マークを表示
   - クライテリアチェック結果表示に特別案件申請ボタンを追加
   - 管理者ダッシュボードに特別案件承認/却下UI追加
   - 案件詳細ページに建築基準法情報を表示

2. **資料格納機能改善**
   - ファイルのカテゴリー分類機能
   - ファイル検索・フィルター機能の強化
   - ファイルプレビュー機能

3. **通知統合**
   - 特別案件申請時に管理者へメール/LINE/Slack通知
   - 承認/却下時にエージェントへ通知

4. **テストの拡充**
   - 特別案件フローのE2Eテスト
   - 建築基準法API��レスポンステスト
   - 初回6情報バリデーションのユニットテスト

## 📞 サポート情報

### テスト用ログイン情報（ローカル）
- **管理者**: navigator-187@docomo.ne.jp / kouki187
- **エージェント1**: seller1@example.com / agent123
- **エージェント2**: seller2@example.com / agent123

### 本番環境ログイン情報
- **管理者**: admin@test.com / admin123（v3.64.0時点）

### デバッグコマンド
```bash
# ローカル開発サーバー起動
cd /home/user/webapp && pm2 start ecosystem.config.cjs

# ログ確認
pm2 logs webapp --nostream

# ローカルDB確認
npx wrangler d1 execute real-estate-200units-db --local --command="SELECT * FROM deals WHERE is_special_case = 1"

# 本番DB確認
npx wrangler d1 execute real-estate-200units-db --remote --command="SELECT COUNT(*) as total FROM deals"
```

## 📚 関連ドキュメント

- `README.md` - プロジェクト概要とクイックスタート
- `API_DOCUMENTATION.md` - API仕様書
- `OPENAI_API_KEY_SETUP.md` - OCR機能セットアップガイド
- `HANDOVER_V3.64.0.md` - 前バージョン引き継ぎドキュメント

---

**次のセッションへの引き継ぎ事項**:
1. フロントエンド実装が最優先タスク
2. 特別案件フローのUI実装（申請・承認・却下）
3. 建築基準法情報の表示UI実装
4. 資料格納機能の改善

**バージョン**: v3.65.0  
**作成日**: 2025-12-01  
**作成者**: AI Assistant  
**ステータス**: ✅ 本番稼働中
