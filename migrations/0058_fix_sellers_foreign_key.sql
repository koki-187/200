-- Migration: 0058_fix_sellers_foreign_key.sql
-- Description: Fix sellers table foreign key constraint issue
-- Version: v3.161.6
-- Date: 2026-01-06

-- Drop existing sellers table if exists (to retry with correct data)
DROP TABLE IF EXISTS sellers;

-- Create sellers table
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

-- Insert default sellers for testing (using admin-001 as created_by)
INSERT OR IGNORE INTO sellers (id, name, company_name, email, phone, created_by, created_at, updated_at, is_deleted)
VALUES 
  ('default-seller-001', 'テスト売主A', '不動産会社A株式会社', 'seller-a@example.com', '03-1234-5678', 'admin-001', datetime('now'), datetime('now'), 0),
  ('default-seller-002', 'テスト売主B', '不動産会社B株式会社', 'seller-b@example.com', '03-2345-6789', 'admin-001', datetime('now'), datetime('now'), 0),
  ('default-seller-003', 'テスト売主C', '不動産会社C株式会社', 'seller-c@example.com', '03-3456-7890', 'admin-001', datetime('now'), datetime('now'), 0);

-- Success message
SELECT 'Migration 0058: sellers table foreign key fixed successfully' AS message;
