-- Migration: Add notification settings for LINE/Slack integration
-- Version: v3.66.0
-- Date: 2025-11-30

-- Notification settings table for user-specific LINE/Slack configurations
CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- LINE settings
  line_enabled INTEGER DEFAULT 0,
  line_webhook_url TEXT,
  
  -- Slack settings
  slack_enabled INTEGER DEFAULT 0,
  slack_webhook_url TEXT,
  
  -- Notification preferences
  notify_on_deal_create INTEGER DEFAULT 1,
  notify_on_deal_update INTEGER DEFAULT 1,
  notify_on_message INTEGER DEFAULT 1,
  notify_on_status_change INTEGER DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
