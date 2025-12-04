-- 金融機関NG項目の追加
-- 2025-12-04: v3.121.0

-- dealsテーブルに金融機関評価用フィールドを追加
ALTER TABLE deals ADD COLUMN cliff_fire_area INTEGER DEFAULT 0 CHECK(cliff_fire_area IN (0, 1));
ALTER TABLE deals ADD COLUMN flood_depth_m REAL DEFAULT 0;
ALTER TABLE deals ADD COLUMN hazard_map_categories TEXT DEFAULT '';  -- カンマ区切りで複数のカテゴリを保存
ALTER TABLE deals ADD COLUMN river_adjacent INTEGER DEFAULT 0 CHECK(river_adjacent IN (0, 1));
ALTER TABLE deals ADD COLUMN house_collapse_zone INTEGER DEFAULT 0 CHECK(house_collapse_zone IN (0, 1));
ALTER TABLE deals ADD COLUMN financial_ng_reasons TEXT DEFAULT '';  -- NG理由をJSON配列として保存

-- インデックス追加（検索・フィルタリング用）
CREATE INDEX IF NOT EXISTS idx_deals_cliff_fire_area ON deals(cliff_fire_area);
CREATE INDEX IF NOT EXISTS idx_deals_flood_depth_m ON deals(flood_depth_m);
CREATE INDEX IF NOT EXISTS idx_deals_river_adjacent ON deals(river_adjacent);
CREATE INDEX IF NOT EXISTS idx_deals_house_collapse_zone ON deals(house_collapse_zone);

-- コメント（SQLiteではサポートされていないが、ドキュメントとして記載）
-- cliff_fire_area: 崖火地域（0=該当なし、1=該当）
-- flood_depth_m: 想定浸水深（メートル）、10m以上で金融NG
-- hazard_map_categories: ハザードマップ該当区域（洪水、内水、高潮、津波、土砂災害、液状化、家屋倒壊等）
-- river_adjacent: 河川隣接地（0=該当なし、1=該当）
-- house_collapse_zone: 家屋倒壊等氾濫想定区域（0=該当なし、1=該当）
-- financial_ng_reasons: 金融NG理由の配列（JSON形式）
