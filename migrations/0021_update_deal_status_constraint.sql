-- Update deals table status constraint to support unified status values
-- Drop the old constraint and add new one with extended values

-- SQLiteではCHECK制約を直接変更できないため、テーブルを再作成する必要があります
-- しかし、本番環境でデータを保持するため、以下の手順を実行します：

-- 1. 新しいテーブルを作成（CHECK制約を更新）
CREATE TABLE IF NOT EXISTS deals_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  location TEXT,
  station TEXT,
  walk_minutes INTEGER,
  land_area TEXT,
  zoning TEXT,
  building_coverage TEXT,
  floor_area_ratio TEXT,
  height_district TEXT,
  fire_zone TEXT,
  road_info TEXT,
  current_status TEXT,
  desired_price TEXT,
  remarks TEXT,
  missing_fields TEXT DEFAULT '[]',
  reply_deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  purchase_check_result TEXT,
  purchase_check_score REAL,
  is_special_case INTEGER DEFAULT 0,
  frontage TEXT,
  built_year TEXT,
  building_area TEXT,
  structure TEXT,
  yield_rate TEXT,
  occupancy_status TEXT,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  CHECK(status IN ('NEW', 'IN_REVIEW', 'REVIEWING', 'REPLIED', 'NEGOTIATING', 'CONTRACTED', 'REJECTED', 'CLOSED'))
);

-- 2. 既存データをコピー
INSERT INTO deals_new SELECT * FROM deals;

-- 3. 古いテーブルを削除
DROP TABLE deals;

-- 4. 新しいテーブルをリネーム
ALTER TABLE deals_new RENAME TO deals;

-- 5. インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_deals_seller ON deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
