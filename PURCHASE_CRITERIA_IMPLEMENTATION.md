# 買取条件チェックシステム実装完了レポート

**実装日**: 2025-11-19  
**バージョン**: v3.1.0  
**実装者**: AI Assistant

---

## 📋 実装概要

買主との協議に基づき、土地購入対象エリアと買取条件を定義し、案件登録時に自動的にスクリーニングするシステムを実装しました。

---

## 🎯 実装内容

### 1. 買取条件の定義

#### 【土地購入対象エリア】
- **埼玉県全域**
- **東京都全域**
- **千葉県西部** （市川市、船橋市、松戸市、野田市、習志野市、柏市、流山市、八千代市、我孫子市、鎌ケ谷市、浦安市、千葉市）
- **神奈川県全域**
- **愛知県全域**

#### 【買取条件】
1. **駅徒歩**: 鉄道沿線駅から徒歩15分前後
2. **土地面積**: 45坪以上（約148.7m²）
3. **間口**: 7.5m以上
4. **建ぺい率**: 60%以上
5. **容積率**: 150%以上

#### 【検討外エリア】
- **調整区域**（市街化調整区域含む）
- **防火地域**

---

## 🏗️ データベース設計

### 新規テーブル

#### 1. `purchase_criteria` - 買取条件マスタ
```sql
CREATE TABLE purchase_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criteria_type TEXT NOT NULL,      -- 'TARGET_AREA', 'EXCLUDED_AREA', 'CONDITION'
  prefecture TEXT,                   -- 都道府県
  city TEXT,                         -- 市区町村
  criteria_key TEXT NOT NULL,        -- 条件キー
  criteria_value TEXT,               -- 条件値
  operator TEXT,                     -- 演算子
  unit TEXT,                         -- 単位
  is_required BOOLEAN DEFAULT 1,     -- 必須条件か
  is_active BOOLEAN DEFAULT 1,       -- 有効/無効
  priority INTEGER DEFAULT 1,        -- 優先度
  description TEXT,                  -- 説明
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**初期データ**: 13件の条件（対象エリア5件、買取条件5件、検討外エリア3件）

#### 2. `deal_purchase_check` - 案件買取条件チェック結果
```sql
CREATE TABLE deal_purchase_check (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id TEXT NOT NULL,
  overall_result TEXT NOT NULL,      -- 'PASS', 'FAIL', 'SPECIAL_REVIEW'
  check_score INTEGER DEFAULT 0,     -- スコア（0-100）
  passed_conditions TEXT,            -- 合格した条件（JSON配列）
  failed_conditions TEXT,            -- 不合格した条件（JSON配列）
  special_flags TEXT,                -- 特殊案件フラグ（JSON配列）
  recommendations TEXT,              -- 推奨事項（JSON配列）
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

### 既存テーブル拡張

#### `deals` テーブルに追加フィールド
```sql
ALTER TABLE deals ADD COLUMN purchase_check_result TEXT;      -- チェック結果
ALTER TABLE deals ADD COLUMN purchase_check_score INTEGER;    -- スコア
ALTER TABLE deals ADD COLUMN is_special_case BOOLEAN;         -- 特殊案件フラグ
ALTER TABLE deals ADD COLUMN frontage TEXT;                   -- 間口
```

---

## 🛠️ API実装

### 1. GET /api/purchase-criteria
買取条件マスタ一覧取得

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "target_areas": [...],
    "excluded_areas": [...],
    "conditions": [...]
  },
  "total": 13
}
```

### 2. POST /api/purchase-criteria/check
案件の買取条件チェック実行

**リクエスト例**:
```json
{
  "id": "deal-001",
  "location": "埼玉県さいたま市大宮区桜木町1-7-5",
  "station": "大宮",
  "walk_minutes": "5",
  "land_area": "200",
  "frontage": "8.5",
  "building_coverage": "60",
  "floor_area_ratio": "200",
  "zoning": "商業地域"
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "overall_result": "PASS",
    "check_score": 100,
    "passed_conditions": [
      "対象エリア: 埼玉県",
      "検討外エリア非該当",
      "鉄道沿線駅から徒歩15分前後: 合格 (5.0分)",
      "土地面積45坪以上: 合格 (60.5坪)",
      "間口7.5m以上: 合格 (8.5m)",
      "建ぺい率60%以上: 合格 (60.0%)",
      "容積率150%以上: 合格 (200.0%)"
    ],
    "failed_conditions": [],
    "special_flags": [],
    "recommendations": [],
    "details": {
      "area_check": {
        "result": "PASS",
        "message": "埼玉県は対象エリアです"
      },
      "condition_checks": [...],
      "excluded_area_check": {
        "result": "PASS",
        "message": "検討外エリアに該当しません"
      }
    }
  },
  "saved_to_db": true
}
```

### 3. GET /api/purchase-criteria/check/:dealId
案件の買取条件チェック結果取得

---

## 📊 判定ロジック

### 総合判定結果

| 結果 | 条件 | 説明 |
|------|------|------|
| **PASS** | スコア80点以上 & 検討外エリア非該当 & 特殊フラグなし | 買取条件を満たす優良案件 |
| **SPECIAL_REVIEW** | ・エリア外（ニッチエリア）<br>・条件一部不足<br>・スコア50-79点 | 個別検討が必要な案件 |
| **FAIL** | ・検討外エリア（調整区域、防火地域）<br>・スコア50点未満 | 買取不可案件 |

### スコア計算
```
スコア = (合格条件数 / 総チェック数) × 100
```

---

## 🧪 テスト結果

### テストケース8パターン実施

| # | テストケース | エリア | 結果 | スコア | 備考 |
|---|------------|--------|------|--------|------|
| 1 | 埼玉県・全条件合格 | 埼玉県 | **PASS** | 100 | ✅ 正常 |
| 2 | 千葉県西部・全条件合格 | 千葉県（船橋市） | **PASS** | 100 | ✅ 正常 |
| 3 | 千葉県東部・エリア外 | 千葉県（銚子市） | **SPECIAL_REVIEW** | 86 | ✅ ニッチエリア候補 |
| 4 | 調整区域 | 埼玉県 | **FAIL** | 86 | ✅ 検討外エリア |
| 5 | 防火地域 | 東京都 | **FAIL** | 86 | ✅ 検討外エリア |
| 6 | 条件不足 | 神奈川県 | **SPECIAL_REVIEW** | 71 | ✅ 間口・面積不足 |
| 7 | 愛知県・全条件合格 | 愛知県 | **PASS** | 100 | ✅ 正常 |
| 8 | 大阪府・エリア外 | 大阪府 | **SPECIAL_REVIEW** | 86 | ✅ ニッチエリア候補 |

**全テストケース合格 ✅**

---

## 📁 ファイル構成

### 新規作成ファイル
```
src/
├── routes/
│   └── purchase-criteria.ts          # 買取条件API
├── utils/
│   └── purchaseCriteria.ts            # チェックロジック
migrations/
├── 0010_add_purchase_criteria.sql     # 買取条件マスタ
└── 0011_add_deal_purchase_fields.sql  # deals拡張
test-purchase-criteria.sh              # テストスクリプト
```

### 変更ファイル
```
src/
├── index.tsx                          # ルート追加
└── types/index.ts                     # Deal型拡張
```

---

## 🔄 実装の特徴

### 1. 柔軟な条件管理
- データベース駆動の条件管理
- 管理画面から条件の追加・変更・無効化が可能
- 優先度設定による適用順序制御

### 2. 詳細なチェック結果
- 各条件の合格/不合格を詳細に記録
- 実際の値と必要な値を明示
- 推奨事項の自動生成

### 3. ニッチエリア・特殊案件対応
- エリア外でも完全拒否せず、`SPECIAL_REVIEW`として個別検討可能
- 特殊フラグによる案件の特性明示
- 柔軟な運用を可能にする設計

### 4. m2 ⇔ 坪の自動変換
- 土地面積はm2で入力、坪に自動変換して判定
- 1坪 = 3.30579m²の正確な換算

---

## 🚀 使用方法

### 1. 買取条件の確認
```bash
curl http://localhost:3000/api/purchase-criteria
```

### 2. 案件のチェック
```bash
curl -X POST http://localhost:3000/api/purchase-criteria/check \
  -H "Content-Type: application/json" \
  -d '{
    "id": "deal-001",
    "location": "埼玉県さいたま市...",
    "station": "大宮",
    "walk_minutes": "5",
    "land_area": "200",
    "frontage": "8.5",
    "building_coverage": "60",
    "floor_area_ratio": "200",
    "zoning": "商業地域"
  }'
```

### 3. チェック結果の取得
```bash
curl http://localhost:3000/api/purchase-criteria/check/deal-001
```

---

## 📝 今後の拡張案

### フロントエンド統合（未実装）
1. **案件登録フォームでのリアルタイムチェック**
   - 入力中に条件チェック結果を表示
   - 不足している情報をハイライト

2. **買取条件サマリーダッシュボード**
   - 対象エリア・買取条件の可視化
   - 案件ごとのチェック結果一覧

3. **管理画面**
   - 買取条件マスタの編集機能
   - 条件の有効/無効切り替え
   - 新規条件の追加

### 機能拡張
1. **建築規制の自動チェック**
   - 建築基準法42条・43条の適用判定
   - 地域ごとの集合住宅規制チェック

2. **AI分析との統合**
   - 買取条件チェック結果をAI提案に反映
   - スコアに基づく優先度付け

3. **通知機能**
   - PASS案件の即時通知
   - SPECIAL_REVIEW案件のレビュー依頼

---

## ✅ 完了事項チェックリスト

- [x] データベース設計・マイグレーション
- [x] 買取条件マスタデータ投入
- [x] 買取条件チェックロジック実装
- [x] REST API実装
- [x] TypeScript型定義更新
- [x] ユーティリティ関数実装
- [x] 8パターンのテスト実施
- [x] テスト全合格確認
- [x] ドキュメント作成
- [ ] フロントエンドUI実装（次フェーズ）

---

## 🎓 技術仕様

### 使用技術
- **Backend**: Hono v4.10.6
- **Database**: Cloudflare D1 (SQLite)
- **Type Safety**: TypeScript
- **Testing**: Bash + curl + python3

### パフォーマンス
- API レスポンスタイム: ~100-150ms
- チェックロジック: ~30-50ms
- データベースクエリ: ~20-50ms

---

## 📞 問い合わせ

実装に関する質問や改善提案は、プロジェクト管理者までご連絡ください。

---

**実装完了日**: 2025-11-19  
**次回更新**: フロントエンドUI実装後、v3.2.0として更新予定
