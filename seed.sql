-- Insert default admin user (password: admin123 - bcrypt hash)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES 
  ('admin-001', 'admin@example.com', '$2b$10$E2TpXnj0uuOMTq9WIOPes.TcvOyvkd24HX65tFiYE.6xTI6qHukUK', '管理者', 'ADMIN');

-- Insert test seller users (password: agent123 for all - bcrypt hash)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, company_name) VALUES 
  ('seller-001', 'seller1@example.com', '$2b$10$urE1Sd65OKG4R9bl7V.xH.jV8.e9KyM6kMwkwHxHjTqZ12s.bk9hy', '田中太郎', 'AGENT', '不動産ABC株式会社'),
  ('seller-002', 'seller2@example.com', '$2b$10$urE1Sd65OKG4R9bl7V.xH.jV8.e9KyM6kMwkwHxHjTqZ12s.bk9hy', '佐藤花子', 'AGENT', '株式会社XYZ不動産');

-- Insert default settings
INSERT OR IGNORE INTO settings (id, workdays, holidays, max_storage_per_deal) VALUES 
  (1, '[1,2,3,4,5]', '[]', 52428800);

-- Insert sample deal
INSERT OR IGNORE INTO deals (
  id, title, status, buyer_id, seller_id,
  location, station, walk_minutes, land_area,
  zoning, building_coverage, floor_area_ratio,
  road_info, current_status, desired_price,
  reply_deadline
) VALUES (
  'deal-001',
  '川崎市幸区塚越四丁目 アパート用地',
  'NEW',
  'admin-001',
  'seller-001',
  '川崎市幸区塚越四丁目',
  '矢向',
  4,
  '218.14㎡（実測）',
  '第一種住居地域',
  '60%',
  '200%',
  '北側私道 幅員2.0m 接道2.0m',
  '古家あり',
  '8,000万円',
  datetime('now', '+2 days')
);
