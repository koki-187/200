-- Add folder support and version tracking to files table
ALTER TABLE files ADD COLUMN folder TEXT DEFAULT 'deals';
ALTER TABLE files ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE files ADD COLUMN parent_file_id TEXT;

-- File versions tracking table
CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- File preview metadata table
CREATE TABLE IF NOT EXISTS file_previews (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL UNIQUE,
  preview_type TEXT NOT NULL CHECK(preview_type IN ('thumbnail', 'text', 'none')),
  preview_path TEXT,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder);
CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_previews_file ON file_previews(file_id);
