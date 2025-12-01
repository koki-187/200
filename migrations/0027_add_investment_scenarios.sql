-- 投資シミュレーションシナリオテーブル
CREATE TABLE IF NOT EXISTS investment_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  deal_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 物件基本情報
  property_price REAL NOT NULL DEFAULT 0,
  land_price REAL DEFAULT 0,
  building_price REAL DEFAULT 0,
  
  -- 初期投資
  down_payment REAL DEFAULT 0,
  loan_amount REAL DEFAULT 0,
  loan_interest_rate REAL DEFAULT 0,
  loan_period INTEGER DEFAULT 0,
  initial_costs REAL DEFAULT 0,
  
  -- 収入
  annual_rent REAL DEFAULT 0,
  occupancy_rate REAL DEFAULT 95.0,
  other_income REAL DEFAULT 0,
  
  -- 支出
  annual_management_fee REAL DEFAULT 0,
  annual_repair_cost REAL DEFAULT 0,
  annual_property_tax REAL DEFAULT 0,
  annual_insurance REAL DEFAULT 0,
  other_expenses REAL DEFAULT 0,
  
  -- 計算結果
  roi REAL DEFAULT 0,
  cash_on_cash_return REAL DEFAULT 0,
  net_operating_income REAL DEFAULT 0,
  annual_cash_flow REAL DEFAULT 0,
  cap_rate REAL DEFAULT 0,
  debt_coverage_ratio REAL DEFAULT 0,
  break_even_occupancy REAL DEFAULT 0,
  
  -- メタデータ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_favorite BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
);

-- 投資シミュレーション詳細キャッシュフローテーブル
CREATE TABLE IF NOT EXISTS investment_cash_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  
  -- 収入
  rental_income REAL DEFAULT 0,
  other_income REAL DEFAULT 0,
  total_income REAL DEFAULT 0,
  
  -- 支出
  management_fee REAL DEFAULT 0,
  repair_cost REAL DEFAULT 0,
  property_tax REAL DEFAULT 0,
  insurance REAL DEFAULT 0,
  loan_payment REAL DEFAULT 0,
  other_expenses REAL DEFAULT 0,
  total_expenses REAL DEFAULT 0,
  
  -- キャッシュフロー
  net_cash_flow REAL DEFAULT 0,
  cumulative_cash_flow REAL DEFAULT 0,
  
  -- 物件価値
  property_value REAL DEFAULT 0,
  loan_balance REAL DEFAULT 0,
  equity REAL DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (scenario_id) REFERENCES investment_scenarios(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_investment_scenarios_user_id ON investment_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_scenarios_deal_id ON investment_scenarios(deal_id);
CREATE INDEX IF NOT EXISTS idx_investment_scenarios_created_at ON investment_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_scenarios_is_favorite ON investment_scenarios(is_favorite);

CREATE INDEX IF NOT EXISTS idx_investment_cash_flows_scenario_id ON investment_cash_flows(scenario_id);
CREATE INDEX IF NOT EXISTS idx_investment_cash_flows_year ON investment_cash_flows(year);

-- トリガー: updated_at自動更新
CREATE TRIGGER IF NOT EXISTS update_investment_scenarios_updated_at
AFTER UPDATE ON investment_scenarios
FOR EACH ROW
BEGIN
  UPDATE investment_scenarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
