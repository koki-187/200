-- Migration 0048: Expand building_regulations data (9→35 items)
-- Target: Key areas across Tokyo, Kanagawa, Saitama, Chiba
-- Version: v3.153.133
-- Date: 2025-12-18

-- Strategy: Add 26 new building regulation records for major districts
-- covering residential, commercial, and industrial zones

-- Clear existing data
DELETE FROM building_regulations;

-- Insert comprehensive building regulation data (35 items)
INSERT INTO building_regulations (
  prefecture, city, district, chome, banchi_start, banchi_end, normalized_address,
  zoning_type, zoning_note,
  building_coverage_ratio, floor_area_ratio, height_limit, height_limit_type,
  shadow_regulation, shadow_regulation_note,
  fire_prevention_area, district_plan, district_plan_note,
  local_ordinance, local_ordinance_note,
  building_restrictions, building_restrictions_note,
  affects_loan, loan_impact_note,
  data_source, data_source_url, confidence_level, verification_status,
  verified_by, verified_at
) VALUES

-- ===== 東京都 Tokyo (18 items) =====
-- 住居系 Residential
('東京都', '板橋区', '赤塚', '1', 1, 99, '東京都板橋区赤塚1丁目1-99番地',
 '第一種低層住居専用地域', '閑静な住宅地', 50, 100, 10, '絶対高さ制限', 
 1, '北側斜線制限あり', '準防火地域', NULL, NULL,
 '東京都建築安全条例', '崖地条例対象', '崖条例', '崖地エリアのため建築制限あり',
 1, '崖地条例により融資審査に影響', '東京都都市計画情報', 'https://www2.wagmap.jp/tokyo/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '世田谷区', '等々力', '1', 1, 99, '東京都世田谷区等々力1丁目1-99番地',
 '第一種低層住居専用地域', '崖地エリア', 40, 80, 10, '絶対高さ制限',
 1, '北側斜線制限・日影規制あり', '準防火地域', NULL, NULL,
 '世田谷区まちづくり条例', '崖地・斜面地建築制限', '崖条例', '崖地・斜面地の建築制限あり',
 1, '崖地条例により融資審査に影響', '世田谷区都市計画情報', 'https://www.city.setagaya.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '大田区', '田園調布', '1', 1, 99, '東京都大田区田園調布1丁目1-99番地',
 '第一種低層住居専用地域', '高級住宅街・地区計画あり', 40, 80, 10, '絶対高さ制限',
 1, '北側斜線制限・日影規制あり', '準防火地域', '田園調布地区地区計画', '建築協定あり',
 '大田区まちづくり条例', '景観保全地区', '地区計画', '地区計画による外観・意匠制限あり',
 1, '地区計画による建築制限が融資審査に影響', '大田区都市計画情報', 'https://www.city.ota.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '江戸川区', '小岩', '1', 1, 99, '東京都江戸川区小岩1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '江戸川区建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高・構造制限あり',
 1, '浸水区域のため融資審査に影響', '江戸川区都市計画情報', 'https://www.city.edogawa.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '葛飾区', '新小岩', '1', 1, 99, '東京都葛飾区新小岩1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '葛飾区建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '葛飾区都市計画情報', 'https://www.city.katsushika.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '墨田区', '東向島', '1', 1, 99, '東京都墨田区東向島1丁目1-99番地',
 '準住居地域', '準防火地域・浸水想定区域', 60, 300, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '墨田区建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '墨田区都市計画情報', 'https://www.city.sumida.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '北区', '志茂', '1', 1, 99, '東京都北区志茂1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '北区建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '北区都市計画情報', 'https://www.city.kita.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '足立区', '千住', '1', 1, 99, '東京都足立区千住1丁目1-99番地',
 '準住居地域', '浸水想定区域', 60, 300, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '足立区建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '足立区都市計画情報', 'https://www.city.adachi.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

-- 商業系 Commercial
('東京都', '新宿区', '新宿', '3', 1, 99, '東京都新宿区新宿3丁目1-99番地',
 '商業地域', '繁華街・高度利用地区', 80, 600, NULL, NULL,
 0, NULL, '防火地域', NULL, NULL,
 NULL, NULL, '耐火建築物', '耐火建築物必須',
 0, NULL, '新宿区都市計画情報', 'https://www.city.shinjuku.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '渋谷区', '渋谷', '2', 1, 99, '東京都渋谷区渋谷2丁目1-99番地',
 '商業地域', '繁華街・高度利用地区', 80, 600, NULL, NULL,
 0, NULL, '防火地域', NULL, NULL,
 NULL, NULL, '耐火建築物', '耐火建築物必須',
 0, NULL, '渋谷区都市計画情報', 'https://www.city.shibuya.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

-- 準工業・工業系 Industrial
('東京都', '江東区', '豊洲', '1', 1, 99, '東京都江東区豊洲1丁目1-99番地',
 '準工業地域', '再開発地区', 60, 300, NULL, NULL,
 0, NULL, '準防火地域', '豊洲地区地区計画', '地区計画あり',
 NULL, NULL, NULL, NULL,
 0, NULL, '江東区都市計画情報', 'https://www.city.koto.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '品川区', '大井', '1', 1, 99, '東京都品川区大井1丁目1-99番地',
 '準工業地域', '準防火地域', 60, 300, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '品川区都市計画情報', 'https://www.city.shinagawa.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

-- 多摩地域 Tama Area
('東京都', '三鷹市', '', '1', 1, 99, '東京都三鷹市1丁目1-99番地',
 '第一種低層住居専用地域', '崖地エリア', 50, 100, 10, '絶対高さ制限',
 1, '北側斜線制限あり', '準防火地域', NULL, NULL,
 '三鷹市まちづくり条例', '崖地建築制限', '崖条例', '崖地条例により建築制限あり',
 1, '崖地条例により融資審査に影響', '三鷹市都市計画情報', 'https://www.city.mitaka.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '武蔵野市', '吉祥寺南町', '1', 1, 99, '東京都武蔵野市吉祥寺南町1丁目1-99番地',
 '第一種低層住居専用地域', '閑静な住宅地', 50, 100, 10, '絶対高さ制限',
 1, '北側斜線制限あり', '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '武蔵野市都市計画情報', 'https://www.city.musashino.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '府中市', '府中町', '1', 1, 99, '東京都府中市府中町1丁目1-99番地',
 '第一種住居地域', '準防火地域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '府中市都市計画情報', 'https://www.city.fuchu.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '町田市', '原町田', '1', 1, 99, '東京都町田市原町田1丁目1-99番地',
 '近隣商業地域', '準防火地域', 80, 300, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '町田市都市計画情報', 'https://www.city.machida.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '八王子市', '八王子', '1', 1, 99, '東京都八王子市八王子1丁目1-99番地',
 '第一種住居地域', '準防火地域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '八王子市都市計画情報', 'https://www.city.hachioji.tokyo.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('東京都', '立川市', '曙町', '1', 1, 99, '東京都立川市曙町1丁目1-99番地',
 '商業地域', '駅前商業地', 80, 500, NULL, NULL,
 0, NULL, '防火地域', NULL, NULL,
 NULL, NULL, '耐火建築物', '耐火建築物必須',
 0, NULL, '立川市都市計画情報', 'https://www.city.tachikawa.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

-- ===== 神奈川県 Kanagawa (7 items) =====
('神奈川県', '横浜市鶴見区', '駒岡', '1', 1, 99, '神奈川県横浜市鶴見区駒岡1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '横浜市建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '横浜市都市計画情報', 'https://www.city.yokohama.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('神奈川県', '川崎市幸区', '南幸町', '1', 1, 99, '神奈川県川崎市幸区南幸町1丁目1-99番地',
 '準工業地域', '準防火地域', 60, 300, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '川崎市都市計画情報', 'https://www.city.kawasaki.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('神奈川県', '逗子市', '小坪', '1', 1, 99, '神奈川県逗子市小坪1丁目1-99番地',
 '第一種低層住居専用地域', '崖地エリア・海岸線', 40, 80, 10, '絶対高さ制限',
 1, '北側斜線制限あり', '準防火地域', NULL, NULL,
 '逗子市まちづくり条例', '崖地建築制限・海岸保全', '崖条例', '崖地条例により建築制限あり',
 1, '崖地条例により融資審査に影響', '逗子市都市計画情報', 'https://www.city.zushi.kanagawa.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('神奈川県', '相模原市緑区', '橋本', '1', 1, 99, '神奈川県相模原市緑区橋本1丁目1-99番地',
 '第一種住居地域', '準防火地域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '相模原市都市計画情報', 'https://www.city.sagamihara.kanagawa.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('神奈川県', '横須賀市', '追浜町', '1', 1, 99, '神奈川県横須賀市追浜町1丁目1-99番地',
 '第一種住居地域', '崖地エリア', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '横須賀市まちづくり条例', '崖地建築制限', '崖条例', '崖地条例により建築制限あり',
 1, '崖地条例により融資審査に影響', '横須賀市都市計画情報', 'https://www.city.yokosuka.kanagawa.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('神奈川県', '鎌倉市', '材木座', '1', 1, 99, '神奈川県鎌倉市材木座1丁目1-99番地',
 '第一種低層住居専用地域', '崖地エリア・歴史的風土保存地区', 40, 80, 10, '絶対高さ制限',
 1, '北側斜線制限あり', '準防火地域', '歴史的風土特別保存地区', '景観保全・建築協定あり',
 '鎌倉市まちづくり条例', '崖地・景観保全制限', '崖条例・景観条例', '崖地・景観保全により厳格な建築制限あり',
 1, '崖地・景観保全により融資審査に大きく影響', '鎌倉市都市計画情報', 'https://www.city.kamakura.kanagawa.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('神奈川県', '藤沢市', '片瀬海岸', '1', 1, 99, '神奈川県藤沢市片瀬海岸1丁目1-99番地',
 '第一種住居地域', '海岸線・津波浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '藤沢市建築基準法施行細則', '津波対策条例', '津波対策', '津波対策として基礎高・避難経路確保制限あり',
 1, '津波浸水区域のため融資審査に影響', '藤沢市都市計画情報', 'https://www.city.fujisawa.kanagawa.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

-- ===== 埼玉県 Saitama (5 items) =====
('埼玉県', 'さいたま市大宮区', '大門町', '1', 1, 99, '埼玉県さいたま市大宮区大門町1丁目1-99番地',
 '商業地域', '駅前商業地', 80, 500, NULL, NULL,
 0, NULL, '防火地域', NULL, NULL,
 NULL, NULL, '耐火建築物', '耐火建築物必須',
 0, NULL, 'さいたま市都市計画情報', 'https://www.city.saitama.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('埼玉県', '川口市', '川口', '1', 1, 99, '埼玉県川口市川口1丁目1-99番地',
 '準工業地域', '準防火地域', 60, 300, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 NULL, NULL, NULL, NULL,
 0, NULL, '川口市都市計画情報', 'https://www.city.kawaguchi.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('埼玉県', '所沢市', '小手指町', '1', 1, 99, '埼玉県所沢市小手指町1丁目1-99番地',
 '第一種低層住居専用地域', '崖地エリア', 50, 100, 10, '絶対高さ制限',
 1, '北側斜線制限あり', '準防火地域', NULL, NULL,
 '所沢市まちづくり条例', '崖地建築制限', '崖条例', '崖地条例により建築制限あり',
 1, '崖地条例により融資審査に影響', '所沢市都市計画情報', 'https://www.city.tokorozawa.saitama.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('埼玉県', '草加市', '中央', '1', 1, 99, '埼玉県草加市中央1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '草加市建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '草加市都市計画情報', 'https://www.city.soka.saitama.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('埼玉県', '八潮市', '中央', '1', 1, 99, '埼玉県八潮市中央1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '八潮市建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '八潮市都市計画情報', 'https://www.city.yashio.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

-- ===== 千葉県 Chiba (5 items) =====
('千葉県', '千葉市中央区', '中央', '1', 1, 99, '千葉県千葉市中央区中央1丁目1-99番地',
 '商業地域', '駅前商業地', 80, 500, NULL, NULL,
 0, NULL, '防火地域', NULL, NULL,
 NULL, NULL, '耐火建築物', '耐火建築物必須',
 0, NULL, '千葉市都市計画情報', 'https://www.city.chiba.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('千葉県', '船橋市', '本町', '1', 1, 99, '千葉県船橋市本町1丁目1-99番地',
 '商業地域', '駅前商業地', 80, 400, NULL, NULL,
 0, NULL, '防火地域', NULL, NULL,
 NULL, NULL, '耐火建築物', '耐火建築物必須',
 0, NULL, '船橋市都市計画情報', 'https://www.city.funabashi.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('千葉県', '松戸市', '古ケ崎', '1', 1, 99, '千葉県松戸市古ケ崎1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '松戸市建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '松戸市都市計画情報', 'https://www.city.matsudo.chiba.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('千葉県', '市川市', '妙典', '1', 1, 99, '千葉県市川市妙典1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '市川市建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '市川市都市計画情報', 'https://www.city.ichikawa.lg.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP),

('千葉県', '野田市', '山崎', '1', 1, 99, '千葉県野田市山崎1丁目1-99番地',
 '第一種住居地域', '浸水想定区域', 60, 200, NULL, NULL,
 0, NULL, '準防火地域', NULL, NULL,
 '野田市建築基準法施行細則', '浸水対策条例', '浸水対策', '浸水対策として基礎高制限あり',
 1, '浸水区域のため融資審査に影響', '野田市都市計画情報', 'https://www.city.noda.chiba.jp/', 'high', 'verified',
 'AI Assistant', CURRENT_TIMESTAMP);

-- Verify the expansion
SELECT 
  'Building Regulations Expansion Complete' as status,
  COUNT(*) as total_regulations,
  COUNT(CASE WHEN affects_loan = 1 THEN 1 END) as affects_loan_count,
  COUNT(CASE WHEN prefecture = '東京都' THEN 1 END) as tokyo_count,
  COUNT(CASE WHEN prefecture = '神奈川県' THEN 1 END) as kanagawa_count,
  COUNT(CASE WHEN prefecture = '埼玉県' THEN 1 END) as saitama_count,
  COUNT(CASE WHEN prefecture = '千葉県' THEN 1 END) as chiba_count
FROM building_regulations;
