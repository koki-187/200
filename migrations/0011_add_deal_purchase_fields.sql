-- dealsテーブルに買取条件チェック結果フィールドを追加

-- 買取条件チェック結果（'PASS', 'FAIL', 'SPECIAL_REVIEW', NULL）
ALTER TABLE deals ADD COLUMN purchase_check_result TEXT;

-- 買取条件スコア（0-100）
ALTER TABLE deals ADD COLUMN purchase_check_score INTEGER DEFAULT 0;

-- ニッチエリア・特殊案件フラグ
ALTER TABLE deals ADD COLUMN is_special_case BOOLEAN DEFAULT 0;

-- 間口（フロンテージ）
ALTER TABLE deals ADD COLUMN frontage TEXT;

-- 前面道路情報（既存のroad_infoに統合可能だが、明示的に追加）
-- ALTER TABLE deals ADD COLUMN road_width TEXT; -- 必要に応じて追加

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_deals_purchase_result ON deals(purchase_check_result);
CREATE INDEX IF NOT EXISTS idx_deals_special_case ON deals(is_special_case);
