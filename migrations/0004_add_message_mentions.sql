-- Create message_mentions table for @mention functionality
CREATE TABLE IF NOT EXISTS message_mentions (
  message_id TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL,
  is_notified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (message_id, mentioned_user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_message_mentions_message ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user ON message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_notified ON message_mentions(is_notified);
