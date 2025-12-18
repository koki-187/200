#!/usr/bin/env python3
"""
CSVファイルから建築規制データベース投入用のマイグレーションSQLを生成
VERIFIED自治体を優先的に処理
"""

import csv
import sys
import os
from datetime import datetime

def escape_sql_string(s):
    """SQLインジェクション対策: シングルクォートをエスケープ"""
    if s is None or s == '' or s == '要確認':
        return 'NULL'
    # シングルクォートをエスケープ
    escaped = s.replace("'", "''")
    return f"'{escaped}'"

def parse_csv_to_sql(csv_file_path, output_sql_path, filter_verified_only=True):
    """
    CSVファイルを読み込んで、マイグレーションSQLを生成
    
    Args:
        csv_file_path: 入力CSVファイルパス
        output_sql_path: 出力SQLファイルパス
        filter_verified_only: Trueの場合、VERIFIEDの自治体のみ処理
    """
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)
    
    # VERIFIEDフィルタ
    if filter_verified_only:
        rows = [row for row in rows if row.get('verification_status') == 'VERIFIED']
    
    print(f"📊 処理対象: {len(rows)}自治体")
    
    # SQLファイル生成
    with open(output_sql_path, 'w', encoding='utf-8') as sqlfile:
        sqlfile.write(f"""-- Migration 0055: Import VERIFIED Tokyo Wards Phase 2 Data
-- Target: VERIFIED municipalities from comprehensive CSV data
-- Strategy: Import 11 VERIFIED municipalities with full regulation details
-- Version: v3.153.138
-- Date: {datetime.now().strftime('%Y-%m-%d')}
-- Source: 1to3ken_apartment_regulation_db_phase2_tokyo_wards_started_remaining.csv

""")
        
        for idx, row in enumerate(rows, 1):
            prefecture = row['prefecture']
            municipality = row['municipality']
            municipality_type = row['municipality_type']
            
            print(f"  {idx}. {prefecture} {municipality} ({municipality_type})")
            
            # building_regulations テーブルへの INSERT
            sqlfile.write(f"""
-- {idx}. {prefecture} {municipality}
INSERT INTO building_regulations (
    prefecture, city, district, chome, banchi_start, banchi_end,
    normalized_address,
    zoning_type, zoning_note,
    building_coverage_ratio, floor_area_ratio,
    height_limit, height_limit_type,
    shadow_regulation, shadow_regulation_note,
    fire_prevention_area,
    district_plan, district_plan_note,
    local_ordinance, local_ordinance_note,
    building_restrictions, building_restrictions_note,
    affects_loan, loan_impact_note,
    apartment_restrictions, apartment_restrictions_note,
    apartment_parking_ratio, apartment_parking_area_per_space, apartment_parking_note,
    apartment_bicycle_ratio, apartment_bicycle_area_per_space, apartment_bicycle_note,
    apartment_construction_feasible, apartment_infeasibility_reason,
    development_guideline, development_guideline_url,
    data_source, confidence_level, verification_status
) VALUES (
    {escape_sql_string(prefecture)},
    {escape_sql_string(municipality)},
    NULL, -- district
    NULL, -- chome
    NULL, -- banchi_start
    NULL, -- banchi_end
    {escape_sql_string(f"{prefecture}{municipality}")},
    '要確認', -- zoning_type (CSVに含まれていないため)
    NULL, -- zoning_note
    NULL, -- building_coverage_ratio
    NULL, -- floor_area_ratio
    NULL, -- height_limit
    NULL, -- height_limit_type
    0, -- shadow_regulation
    NULL, -- shadow_regulation_note
    NULL, -- fire_prevention_area
    NULL, -- district_plan
    {escape_sql_string(row.get('district_plan_notes'))},
    NULL, -- local_ordinance
    NULL, -- local_ordinance_note
    NULL, -- building_restrictions
    NULL, -- building_restrictions_note
    0, -- affects_loan (デフォルト: 影響なし)
    NULL, -- loan_impact_note
    NULL, -- apartment_restrictions
    NULL, -- apartment_restrictions_note
    NULL, -- apartment_parking_ratio
    NULL, -- apartment_parking_area_per_space
    {escape_sql_string(row.get('bike_parking_rule'))},
    NULL, -- apartment_bicycle_ratio
    NULL, -- apartment_bicycle_area_per_space
    NULL, -- apartment_bicycle_note
    1, -- apartment_construction_feasible (デフォルト: 可能)
    NULL, -- apartment_infeasibility_reason
    {escape_sql_string(row.get('development_guideline_or_ordinance'))},
    {escape_sql_string(row.get('development_guideline_url'))},
    {escape_sql_string(row.get('verification_method', 'CSV Import'))},
    {escape_sql_string(row.get('confidence', 'MED'))},
    {escape_sql_string(row.get('verification_status', 'VERIFIED'))}
);

""")
            
            # building_regulations の最後に挿入されたIDを取得
            building_regulation_id_var = f"last_building_regulation_id_{idx}"
            
            sqlfile.write(f"""-- Get last inserted ID for {municipality}
SELECT last_insert_rowid() AS {building_regulation_id_var};

""")
            
            # building_design_requirements テーブルへの INSERT (ワンルーム規制情報)
            one_room_guideline = row.get('one_room_guideline', '')
            if one_room_guideline and one_room_guideline != '要確認':
                min_unit_area = row.get('min_unit_area_m2', '')
                if min_unit_area and min_unit_area != '要確認':
                    try:
                        min_unit_area_float = float(min_unit_area.replace('（定住型以外の最低）', '').replace('（定義）', '').strip().split('（')[0].split('未満')[0])
                    except:
                        min_unit_area_float = None
                else:
                    min_unit_area_float = None
                
                ceiling_height = row.get('ceiling_height_m', '')
                if ceiling_height and ceiling_height != '要確認':
                    try:
                        ceiling_height_float = float(ceiling_height)
                    except:
                        ceiling_height_float = None
                else:
                    ceiling_height_float = None
                
                manager_room_threshold = row.get('manager_room_threshold_units', '')
                if manager_room_threshold and manager_room_threshold != '要確認':
                    try:
                        manager_room_threshold_int = int(manager_room_threshold.split('（')[0].strip())
                    except:
                        manager_room_threshold_int = None
                else:
                    manager_room_threshold_int = None
                
                signboard_neighbor = row.get('signboard_neighbor_explanation', '')
                signboard_required = 1 if signboard_neighbor and '標識' in signboard_neighbor and signboard_neighbor != '要確認' else 0
                neighbor_explanation_required = 1 if signboard_neighbor and '説明' in signboard_neighbor and signboard_neighbor != '要確認' else 0
                
                sqlfile.write(f"""-- Insert building_design_requirements for {municipality}
INSERT INTO building_design_requirements (
    building_regulation_id,
    min_unit_area,
    ceiling_height_min,
    manager_room_required,
    manager_room_threshold,
    signboard_required,
    neighbor_explanation_required,
    studio_definition
) SELECT 
    id,
    {min_unit_area_float if min_unit_area_float else 'NULL'},
    {ceiling_height_float if ceiling_height_float else 'NULL'},
    {1 if manager_room_threshold_int else 0},
    {manager_room_threshold_int if manager_room_threshold_int else 'NULL'},
    {signboard_required},
    {neighbor_explanation_required},
    {escape_sql_string(row.get('one_room_apply_threshold'))}
FROM building_regulations 
WHERE prefecture = {escape_sql_string(prefecture)} 
  AND city = {escape_sql_string(municipality)}
LIMIT 1;

""")
            
            # local_specific_requirements テーブルへの INSERT
            sqlfile.write(f"""-- Insert local_specific_requirements for {municipality}
INSERT INTO local_specific_requirements (
    building_regulation_id,
    has_building_standards_act,
    has_prefecture_ordinance,
    has_municipal_ordinance,
    has_development_guideline,
    notes
) SELECT 
    id,
    1, -- has_building_standards_act (建築基準法は全国適用)
    {1 if '東京都建築安全条例' in row.get('prefecture_level_key_ordinances', '') else 0},
    {1 if one_room_guideline and one_room_guideline != '要確認' else 0},
    {1 if row.get('development_guideline_or_ordinance') and row.get('development_guideline_or_ordinance') != '要確認' else 0},
    {escape_sql_string(row.get('notes'))}
FROM building_regulations 
WHERE prefecture = {escape_sql_string(prefecture)} 
  AND city = {escape_sql_string(municipality)}
LIMIT 1;

""")
        
        sqlfile.write(f"""
-- Verification query
SELECT 
    '✅ Import complete' as status,
    COUNT(*) as imported_count,
    COUNT(DISTINCT prefecture) as prefectures,
    COUNT(DISTINCT city) as municipalities
FROM building_regulations
WHERE verification_status = 'VERIFIED';

""")
    
    print(f"\n✅ マイグレーションSQL生成完了: {output_sql_path}")
    print(f"📊 処理済み: {len(rows)}自治体")

if __name__ == '__main__':
    csv_path = '/home/user/uploaded_files/1to3ken_apartment_regulation_db_phase2_tokyo_wards_started_remaining.csv'
    output_path = '/home/user/webapp/migrations/0055_import_verified_municipalities.sql'
    
    if not os.path.exists(csv_path):
        print(f"❌ CSVファイルが見つかりません: {csv_path}")
        sys.exit(1)
    
    parse_csv_to_sql(csv_path, output_path, filter_verified_only=True)
