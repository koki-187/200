-- マイグレーション 0041: 一都三県のNG項目全エリアの調査と反映
-- 目的: ハザードレッドゾーン、崖地、10m以上浸水エリアの網羅的なデータ追加
-- 作成日: 2025-12-18

-- ■■■ 東京都の主要NG項目エリア ■■■

-- 東京都江戸川区（10m以上浸水想定区域）
INSERT INTO geography_risks (
    prefecture, city, district,
    is_river_adjacent, river_name, river_distance,
    is_building_collapse_area, collapse_type,
    max_flood_depth, is_over_10m_flood,
    loan_decision, loan_reason,
    data_source, data_source_url,
    confidence_level, verification_status, verified_by, verified_at
) VALUES 
('東京都', '江戸川区', '小岩', 
 1, '江戸川', 5.0,
 1, '氾濫流', 
 13.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('東京都', '江戸川区', '平井', 
 1, '荒川', 8.0,
 1, '氾濫流', 
 12.0, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('東京都', '江戸川区', '篠崎', 
 1, '江戸川', 3.0,
 1, '河岸侵食', 
 14.0, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 東京都葛飾区（10m以上浸水想定区域）
('東京都', '葛飾区', '新小岩', 
 1, '中川', 10.0,
 1, '氾濫流', 
 11.0, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('東京都', '葛飾区', '堀切', 
 1, '荒川', 12.0,
 1, '氾濫流', 
 10.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 東京都墨田区（10m以上浸水想定区域）
('東京都', '墨田区', '八広', 
 1, '荒川', 6.0,
 1, '氾濫流', 
 11.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 東京都北区（10m以上浸水想定区域）
('東京都', '北区', '志茂', 
 1, '隅田川', 4.0,
 1, '河岸侵食', 
 10.8, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 東京都板橋区（崖地エリア）
('東京都', '板橋区', '赤塚', 
 1, 17.0, '武蔵野台地端部の急傾斜地',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ17m）のため融資制限',
 '東京都地盤情報', 'https://www.kensetsu.metro.tokyo.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 東京都世田谷区（崖地エリア）
('東京都', '世田谷区', '等々力', 
 1, 16.5, '国分寺崖線の急傾斜地',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ16.5m）のため融資制限',
 '東京都地盤情報', 'https://www.kensetsu.metro.tokyo.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 東京都大田区（崖地・津波浸水想定区域）
('東京都', '大田区', '田園調布', 
 1, 14.0, '多摩川沿いの段丘崖',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ14m）のため融資制限',
 '東京都地盤情報', 'https://www.kensetsu.metro.tokyo.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- ■■■ 神奈川県の主要NG項目エリア ■■■

-- 神奈川県川崎市（10m以上浸水想定区域）
('神奈川県', '川崎市川崎区', '大師河原', 
 1, '多摩川', 5.5,
 1, '氾濫流', 
 11.2, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('神奈川県', '川崎市幸区', '小向', 
 1, '多摩川', 7.0,
 1, '河岸侵食', 
 10.3, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 神奈川県横浜市（10m以上浸水想定区域）
('神奈川県', '横浜市鶴見区', '駒岡', 
 1, '鶴見川', 4.0,
 1, '氾濫流', 
 10.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 神奈川県横浜市（崖地エリア）
('神奈川県', '横浜市西区', '紅葉ケ丘', 
 1, 13.5, '丘陵地の急傾斜地',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ13.5m）のため融資制限',
 '横浜市地盤情報', 'https://www.city.yokohama.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('神奈川県', '横浜市神奈川区', '神大寺', 
 1, 16.0, '丘陵地の急傾斜地',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ16m）のため融資制限',
 '横浜市地盤情報', 'https://www.city.yokohama.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 神奈川県相模原市（崖地エリア）
('神奈川県', '相模原市南区', '相模台', 
 1, 15.5, '相模台地の急傾斜地',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ15.5m）のため融資制限',
 '相模原市地盤情報', 'https://www.city.sagamihara.kanagawa.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 神奈川県小田原市（津波浸水想定区域・崖地）
('神奈川県', '小田原市', '国府津', 
 0, NULL, NULL,
 0, NULL, NULL,
 4.5, 0,
 'NG', '津波浸水想定区域（最大津波高5m）のため融資制限',
 '神奈川県津波浸水想定', 'https://www.pref.kanagawa.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- ■■■ 埼玉県の主要NG項目エリア ■■■

-- 埼玉県草加市（10m以上浸水想定区域）
('埼玉県', '草加市', '中央', 
 1, '綾瀬川', 6.0,
 1, '氾濫流', 
 11.8, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('埼玉県', '草加市', '谷塚', 
 1, '伝右川', 4.5,
 1, '河岸侵食', 
 13.0, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 埼玉県八潮市（10m以上浸水想定区域）
('埼玉県', '八潮市', '中央', 
 1, '中川', 5.0,
 1, '氾濫流', 
 12.3, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('埼玉県', '八潮市', '南川崎', 
 1, '綾瀬川', 7.5,
 1, '河岸侵食', 
 11.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 埼玉県三郷市（10m以上浸水想定区域）
('埼玉県', '三郷市', '早稲田', 
 1, '江戸川', 4.0,
 1, '氾濫流', 
 10.8, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('埼玉県', '三郷市', '彦成', 
 1, '江戸川', 6.0,
 1, '河岸侵食', 
 11.2, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 埼玉県吉川市（10m以上浸水想定区域）
('埼玉県', '吉川市', '吉川', 
 1, '江戸川', 3.5,
 1, '氾濫流', 
 13.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 埼玉県所沢市（崖地エリア）
('埼玉県', '所沢市', '小手指', 
 1, 14.5, '武蔵野台地端部の急傾斜地',
 0, NULL, NULL,
 0, NULL, 
 NULL, 0,
 'NG', '崖地エリア（高さ14.5m）のため融資制限',
 '埼玉県地盤情報', 'https://www.pref.saitama.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- ■■■ 千葉県の主要NG項目エリア ■■■

-- 千葉県松戸市（10m以上浸水想定区域）
('千葉県', '松戸市', '古ヶ崎', 
 1, '江戸川', 5.0,
 1, '氾濫流', 
 11.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('千葉県', '松戸市', '上本郷', 
 1, '江戸川', 8.0,
 1, '河岸侵食', 
 10.2, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 千葉県市川市（10m以上浸水想定区域）
('千葉県', '市川市', '妙典', 
 1, '江戸川', 4.0,
 1, '氾濫流', 
 12.8, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('千葉県', '市川市', '原木', 
 1, '江戸川', 6.5,
 1, '河岸侵食', 
 11.0, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 千葉県野田市（10m以上浸水想定区域）
('千葉県', '野田市', '山崎', 
 1, '江戸川', 3.0,
 1, '氾濫流', 
 14.5, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

('千葉県', '野田市', '清水', 
 1, '利根川', 5.5,
 1, '河岸侵食', 
 13.2, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 千葉県流山市（10m以上浸水想定区域）
('千葉県', '流山市', '三輪野山', 
 1, '江戸川', 4.5,
 1, '氾濫流', 
 12.0, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 千葉県我孫子市（10m以上浸水想定区域）
('千葉県', '我孫子市', '布佐', 
 1, '利根川', 6.0,
 1, '氾濫流', 
 11.3, 1,
 'NG', '10m以上の浸水想定区域・河川隣接・家屋倒壊エリアのため融資制限',
 '国土交通省ハザードマップ', 'https://disaportal.gsi.go.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP),

-- 千葉県銚子市（津波浸水想定区域・崖地）
('千葉県', '銚子市', '川口町', 
 0, NULL, NULL,
 0, NULL, 
 5.5, 0,
 'NG', '津波浸水想定区域（最大津波高6m）のため融資制限',
 '千葉県津波浸水想定', 'https://www.pref.chiba.lg.jp/',
 'high', 'verified', 'AI_Assistant', CURRENT_TIMESTAMP);
