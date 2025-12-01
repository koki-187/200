-- v3.65.0: 特別案件フロー実装
-- 目的: クライテリア非該当時の特別案件処理フィールド追加

-- deals テーブルに特別案件関連フィールドを追加
-- is_special_case は既に 0011_add_deal_purchase_fields.sql で追加済みのためスキップ
ALTER TABLE deals ADD COLUMN special_case_reason TEXT;           -- 特別案件理由
ALTER TABLE deals ADD COLUMN special_case_status TEXT            -- 特別案件ステータス（PENDING, APPROVED, REJECTED）
  CHECK(special_case_status IN ('PENDING', 'APPROVED', 'REJECTED') OR special_case_status IS NULL);
ALTER TABLE deals ADD COLUMN special_case_reviewed_by TEXT;      -- 承認/却下した管理者ID
ALTER TABLE deals ADD COLUMN special_case_reviewed_at TEXT;      -- 承認/却下日時

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_deals_special_case_status ON deals(special_case_status);
