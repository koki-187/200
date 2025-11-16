-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'AGENT')),
  company_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'IN_REVIEW', 'REPLIED', 'CLOSED')),
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  location TEXT,
  station TEXT,
  walk_minutes INTEGER,
  land_area TEXT,
  zoning TEXT,
  building_coverage TEXT,
  floor_area_ratio TEXT,
  height_district TEXT,
  fire_zone TEXT,
  road_info TEXT,
  current_status TEXT,
  desired_price TEXT,
  remarks TEXT,
  missing_fields TEXT DEFAULT '[]',
  reply_deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  has_attachments INTEGER DEFAULT 0,
  is_read_by_buyer INTEGER DEFAULT 0,
  is_read_by_seller INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  uploader_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('OVERVIEW', 'REGISTRY', 'MAP', 'REPORT', 'OTHER')),
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);

-- OCR Jobs table
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  raw_text TEXT,
  mapped_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  deal_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('NEW_DEAL', 'NEW_MESSAGE', 'DEADLINE', 'MISSING_INFO')),
  channel TEXT NOT NULL CHECK(channel IN ('EMAIL', 'LINE')),
  payload TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  openai_api_key TEXT,
  workdays TEXT DEFAULT '[1,2,3,4,5]',
  holidays TEXT DEFAULT '[]',
  max_storage_per_deal INTEGER DEFAULT 52428800,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  buyer_profile TEXT,
  cf_data TEXT,
  summary TEXT,
  strengths TEXT,
  risks TEXT,
  cf_summary TEXT,
  proposal_text TEXT,
  meeting_points TEXT,
  email_draft TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_seller ON deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_messages_deal ON messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_files_deal ON files(deal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON proposals(deal_id);
