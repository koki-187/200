-- Create message_attachments junction table
CREATE TABLE IF NOT EXISTS message_attachments (
  message_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (message_id, file_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Add file_type for CHAT
-- Note: SQLite doesn't support modifying CHECK constraints, 
-- so we'll just document that CHAT is now a valid file_type

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_file ON message_attachments(file_id);
