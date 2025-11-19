-- 買取条件マスタテーブル
CREATE TABLE IF NOT EXISTS purchase_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criteria_type TEXT NOT NULL, -- 'TARGET_AREA', 'EXCLUDED_AREA', 'CONDITION'
  prefecture TEXT, -- 都道府県（エリア関連の場合）
  city TEXT, -- 市区町村（エリア関連の場合）
  criteria_key TEXT NOT NULL, -- 条件キー（例：'walk_minutes', 'land_area'）
  criteria_value TEXT, -- 条件値（例：'15', '45'）
  operator TEXT, -- 演算子（'>=', '<=', '=', 'CONTAINS'）
  unit TEXT, -- 単位（'分', '坪', 'm', '%'）
  is_required BOOLEAN DEFAULT 1, -- 必須条件かどうか
  is_active BOOLEAN DEFAULT 1, -- 有効/無効
  priority INTEGER DEFAULT 1, -- 優先度（1=高, 2=中, 3=低）
  description TEXT, -- 説明
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 対象エリアのインデックス
CREATE INDEX IF NOT EXISTS idx_purchase_criteria_type ON purchase_criteria(criteria_type);
CREATE INDEX IF NOT EXISTS idx_purchase_criteria_active ON purchase_criteria(is_active);

-- 案件の買取条件チェック結果テーブル
CREATE TABLE IF NOT EXISTS deal_purchase_check (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id TEXT NOT NULL,
  overall_result TEXT NOT NULL, -- 'PASS', 'FAIL', 'SPECIAL_REVIEW'
  check_score INTEGER DEFAULT 0, -- スコア（0-100）
  passed_conditions TEXT, -- 合格した条件（JSON配列）
  failed_conditions TEXT, -- 不合格した条件（JSON配列）
  special_flags TEXT, -- 特殊案件フラグ（JSON配列）
  recommendations TEXT, -- 推奨事項（JSON配列）
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deal_purchase_check_deal ON deal_purchase_check(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_purchase_check_result ON deal_purchase_check(overall_result);

-- dealsテーブルに買取条件チェック結果フィールドを追加
-- ALTER TABLE deals ADD COLUMN purchase_check_result TEXT; -- 'PASS', 'FAIL', 'SPECIAL_REVIEW', NULL
-- ALTER TABLE deals ADD COLUMN purchase_check_score INTEGER DEFAULT 0;
-- ALTER TABLE deals ADD COLUMN is_special_case BOOLEAN DEFAULT 0; -- ニッチエリア・特殊案件フラグ

-- 初期データ投入: 対象エリア
-- 埼玉県全域
INSERT INTO purchase_criteria (criteria_type, prefecture, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('TARGET_AREA', '埼玉県', 'prefecture', '埼玉県', '=', 1, 1, '埼玉県全域が対象エリア');

-- 東京都全域
INSERT INTO purchase_criteria (criteria_type, prefecture, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('TARGET_AREA', '東京都', 'prefecture', '東京都', '=', 1, 1, '東京都全域が対象エリア');

-- 千葉県西部
INSERT INTO purchase_criteria (criteria_type, prefecture, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('TARGET_AREA', '千葉県', 'prefecture', '千葉県', '=', 1, 1, '千葉県西部が対象エリア（西部判定は別途）');

-- 神奈川県全域
INSERT INTO purchase_criteria (criteria_type, prefecture, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('TARGET_AREA', '神奈川県', 'prefecture', '神奈川県', '=', 1, 1, '神奈川県全域が対象エリア');

-- 愛知県全域
INSERT INTO purchase_criteria (criteria_type, prefecture, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('TARGET_AREA', '愛知県', 'prefecture', '愛知県', '=', 1, 1, '愛知県全域が対象エリア');

-- 買取条件: 駅徒歩15分以内
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, unit, is_required, priority, description) 
VALUES ('CONDITION', 'walk_minutes', '15', '<=', '分', 1, 1, '鉄道沿線駅から徒歩15分前後');

-- 買取条件: 45坪以上
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, unit, is_required, priority, description) 
VALUES ('CONDITION', 'land_area_tsubo', '45', '>=', '坪', 1, 1, '土地面積45坪以上');

-- 買取条件: 間口7.5m以上
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, unit, is_required, priority, description) 
VALUES ('CONDITION', 'frontage', '7.5', '>=', 'm', 1, 1, '間口7.5m以上');

-- 買取条件: 建ぺい率60%以上
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, unit, is_required, priority, description) 
VALUES ('CONDITION', 'building_coverage', '60', '>=', '%', 1, 1, '建ぺい率60%以上');

-- 買取条件: 容積率150%以上
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, unit, is_required, priority, description) 
VALUES ('CONDITION', 'floor_area_ratio', '150', '>=', '%', 1, 1, '容積率150%以上');

-- 検討外エリア: 調整区域
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('EXCLUDED_AREA', 'zoning', '調整区域', 'CONTAINS', 1, 1, '調整区域は検討外');

INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('EXCLUDED_AREA', 'zoning', '市街化調整区域', 'CONTAINS', 1, 1, '市街化調整区域は検討外');

-- 検討外エリア: 防火地域
INSERT INTO purchase_criteria (criteria_type, criteria_key, criteria_value, operator, is_required, priority, description) 
VALUES ('EXCLUDED_AREA', 'zoning', '防火地域', 'CONTAINS', 1, 1, '防火地域は検討外');
