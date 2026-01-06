-- Migration: 0057_create_sellers_table.sql
-- Description: Create sellers table for property seller management
-- Version: v3.161.3
-- Date: 2026-01-06

CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  
  -- Indexes for faster queries
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sellers_created_by ON sellers(created_by);
CREATE INDEX IF NOT EXISTS idx_sellers_is_deleted ON sellers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sellers_company_name ON sellers(company_name);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);

-- Insert default sellers for testing
INSERT OR IGNORE INTO sellers (id, name, company_name, email, phone, created_by, created_at, updated_at, is_deleted)
VALUES 
  ('default-seller-001', 'テスト売主A', '不動産会社A株式会社', 'seller-a@example.com', '03-1234-5678', 'system', datetime('now'), datetime('now'), 0),
  ('default-seller-002', 'テスト売主B', '不動産会社B株式会社', 'seller-b@example.com', '03-2345-6789', 'system', datetime('now'), datetime('now'), 0),
  ('default-seller-003', 'テスト売主C', '不動産会社C株式会社', 'seller-c@example.com', '03-3456-7890', 'system', datetime('now'), datetime('now'), 0);

-- Success message
SELECT 'Migration 0057: sellers table created successfully' AS message;
