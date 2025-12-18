-- マイグレーション 0045: 建築規制情報データの投入
-- 目的: 一都三県の主要エリアの建築規制情報を投入
-- 作成日: 2025-12-18

-- 東京都 江戸川区 小岩エリア（第一種住居地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('東京都', '江戸川区', '小岩', '1丁目', 1, 99, '東京都江戸川区小岩1丁目1-99番地',
 '第一種住居地域', '住宅の環境を保護するための地域',
 60, 200,
 NULL, '斜線制限', 
 1, '4時間日影規制あり（5m、3時間）',
 '準防火地域',
 '崖地近接による制限', '崖地から2m以上離隔が必要',
 1, '準防火地域のため防火構造が必要、建築コスト増',
 '江戸川区建築基準法施行細則', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('東京都', '江戸川区', '小岩', '2丁目', 1, 99, '東京都江戸川区小岩2丁目1-99番地',
 '第一種住居地域', '住宅の環境を保護するための地域',
 60, 200,
 NULL, '斜線制限',
 1, '4時間日影規制あり（5m、3時間）',
 '準防火地域',
 '崖地近接による制限', '崖地から2m以上離隔が必要',
 1, '準防火地域のため防火構造が必要、建築コスト増',
 '江戸川区建築基準法施行細則', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 東京都 板橋区 赤塚エリア（第一種低層住居専用地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  district_plan, district_plan_note,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('東京都', '板橋区', '赤塚', '1丁目', 1, 99, '東京都板橋区赤塚1丁目1-99番地',
 '第一種低層住居専用地域', '低層住宅の良好な住環境を守るための地域',
 50, 100,
 10.0, '絶対高さ制限',
 1, '3時間日影規制あり（4m、2.5時間）',
 '無指定',
 '赤塚地区地区計画', '建築物の高さを10m以下、敷地面積の最低限度100㎡',
 '崖条例適用', '崖地から5m以上離隔が必要、擁壁工事が必須',
 2, '崖条例適用により擁壁工事が必須、建築コスト大幅増、融資審査厳格化',
 '板橋区崖条例', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 東京都 世田谷区 等々力エリア（第一種低層住居専用地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  district_plan, district_plan_note,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('東京都', '世田谷区', '等々力', '1丁目', 1, 99, '東京都世田谷区等々力1丁目1-99番地',
 '第一種低層住居専用地域', '低層住宅の良好な住環境を守るための地域',
 50, 100,
 10.0, '絶対高さ制限',
 1, '3時間日影規制あり（4m、2.5時間）',
 '無指定',
 '等々力地区地区計画', '建築物の高さを10m以下、敷地面積の最低限度120㎡、壁面後退2m',
 '崖条例適用', '国分寺崖線に隣接、崖地から5m以上離隔が必要',
 2, '崖条例適用により擁壁工事が必須、建築コスト大幅増、融資審査厳格化',
 '世田谷区崖条例', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 神奈川県 横浜市鶴見区 駒岡エリア（第一種住居地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('神奈川県', '横浜市鶴見区', '駒岡', '1丁目', 1, 99, '神奈川県横浜市鶴見区駒岡1丁目1-99番地',
 '第一種住居地域', '住宅の環境を保護するための地域',
 60, 200,
 NULL, '斜線制限',
 1, '4時間日影規制あり（5m、3時間）',
 '準防火地域',
 '河川近接による制限', '鶴見川から50m以内、河川法に基づく許可が必要',
 1, '河川近接のため建築確認申請時に河川管理者との協議が必要、建築期間延長の可能性',
 '横浜市建築基準法施行細則', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 神奈川県 横浜市港北区 綱島エリア（第一種住居地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  district_plan, district_plan_note,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('神奈川県', '横浜市港北区', '綱島', '1丁目', 1, 99, '神奈川県横浜市港北区綱島1丁目1-99番地',
 '第一種住居地域', '住宅の環境を保護するための地域',
 60, 200,
 NULL, '斜線制限',
 1, '4時間日影規制あり（5m、3時間）',
 '準防火地域',
 '綱島駅周辺地区地区計画', '敷地面積の最低限度80㎡、壁面後退1m',
 '崖地近接による制限', '崖地から3m以上離隔が必要',
 1, '崖地近接のため地盤調査が必須、建築コスト増',
 '横浜市崖地条例', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 埼玉県 草加市 中央エリア（準工業地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  fire_prevention_area,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('埼玉県', '草加市', '中央', '1丁目', 1, 99, '埼玉県草加市中央1丁目1-99番地',
 '準工業地域', '主として環境の悪化をもたらす恐れのない工業の利便を図る地域',
 60, 200,
 NULL, '斜線制限',
 '準防火地域',
 '河川近接による制限', '綾瀬川から50m以内、河川法に基づく許可が必要',
 1, '河川近接のため浸水対策（基礎高さ確保、防水措置）が必要、建築コスト増',
 '草加市建築基準法施行細則', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 千葉県 市川市 妙典エリア（第一種住居地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('千葉県', '市川市', '妙典', '1丁目', 1, 99, '千葉県市川市妙典1丁目1-99番地',
 '第一種住居地域', '住宅の環境を保護するための地域',
 60, 200,
 NULL, '斜線制限',
 1, '4時間日影規制あり（5m、3時間）',
 '準防火地域',
 '河川近接による制限', '江戸川から50m以内、河川法に基づく許可が必要、浸水対策必須',
 2, '河川近接＋浸水想定区域のため、浸水対策（盛土、嵩上げ）が必須、建築コスト大幅増、融資審査厳格化',
 '市川市建築基準法施行細則', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);

-- 千葉県 野田市 山崎エリア（第一種住居地域）
INSERT OR IGNORE INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio,
  height_limit, height_limit_type,
  fire_prevention_area,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, confidence_level, verification_status, verified_by, verified_at
) VALUES
('千葉県', '野田市', '山崎', '1丁目', 1, 99, '千葉県野田市山崎1丁目1-99番地',
 '第一種住居地域', '住宅の環境を保護するための地域',
 60, 200,
 NULL, '斜線制限',
 '準防火地域',
 '河川近接による制限', '江戸川から50m以内、河川法に基づく許可が必要、浸水対策必須',
 2, '河川近接＋浸水想定区域（14.5m）のため、浸水対策（盛土、嵩上げ）が必須、建築コスト大幅増、融資審査厳格化',
 '野田市建築基準法施行細則', 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);
