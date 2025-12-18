-- マイグレーション 0041a: data_source_urlカラムの追加
-- 目的: geography_risksテーブルにデータソースURL用のカラムを追加
-- 作成日: 2025-12-18

ALTER TABLE geography_risks ADD COLUMN data_source_url TEXT;
