-- v3.55.0: 新規フォームフィールドの追加
-- 目的: 間口、築年数、建物面積、構造、利回り、稼働率の追加

-- deals テーブルに新規カラムを追加（frontageは既に存在するためスキップ）
-- ALTER TABLE deals ADD COLUMN frontage TEXT;         -- 間口（既存）
ALTER TABLE deals ADD COLUMN built_year TEXT;          -- 築年月（例: "1995年3月", "1995"）
ALTER TABLE deals ADD COLUMN building_area TEXT;       -- 建物面積（例: "120.50㎡"）
ALTER TABLE deals ADD COLUMN structure TEXT;           -- 構造（例: "木造", "鉄筋コンクリート造"）
ALTER TABLE deals ADD COLUMN yield_rate TEXT;          -- 表面利回り（例: "5.2%"）
ALTER TABLE deals ADD COLUMN occupancy_status TEXT;    -- 賃貸状況（例: "満室", "空室", "80%稼働"）

-- ocr_field_confidence テーブルに新規フィールドを追加
-- Note: ocr_field_confidence テーブルは動的にフィールドを追加する設計のため、
--       アプリケーションコードでこれらのフィールドに対応する必要がある

-- インデックスは不要（検索対象外のため）
