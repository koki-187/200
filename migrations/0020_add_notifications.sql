-- Add new columns to existing notifications table for enhanced notification system
-- Note: Some columns may already exist in production, using IF NOT EXISTS where possible
-- SQLite doesn't support ALTER TABLE ... IF NOT EXISTS, so these may fail if columns exist
-- This is expected behavior and safe to ignore in production
ALTER TABLE notifications ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN message TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN link TEXT DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN is_read INTEGER DEFAULT 0;
-- created_at might already exist from initial schema
-- ALTER TABLE notifications ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
