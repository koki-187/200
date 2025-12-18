/**
 * ピンポイント建築規制情報API
 * v3.153.137 - 建築基準法・規則・条例・要綱のピンポイント判定（拡張テーブル対応）
 * 
 * ハザード情報と同様のデータベース駆動型ピンポイント判定を実現
 * - 基本building_regulationsテーブル
 * - 6つの拡張テーブル（urban_planning, site_road, building_design, development_ground, construction_env, local_specific）
 */

import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { parseDetailedAddress } from '../utils/address-parser';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * ピンポイント建築規制情報取得API
 * GET /api/building-regulations-pinpoint/info?address=東京都江戸川区小岩1丁目1-10番地
 * 
 * 階層的検索戦略:
 * Level 1: 完全一致（〇丁目〇番地）
 * Level 2: 丁目一致（〇丁目）
 * Level 3: 地区一致（地区名）
 * Level 4: 市区町村レベル（フォールバック）
 */
app.get('/info', async (c) => {
  try {
    const address = c.req.query('address');

    if (!address) {
      return c.json({
        success: false,
        error: '住所パラメータが必要です',
      }, 400);
    }

    // 住所解析（詳細）
    const parsed = parseDetailedAddress(address);
    if (!parsed) {
      return c.json({
        success: false,
        error: '住所の解析に失敗しました（一都三県の住所を入力してください）',
        address,
      }, 400);
    }

    const { prefecture, city, district, chome, banchi } = parsed;

    console.log(`[Building Regs Search] 住所解析結果: prefecture=${prefecture}, city=${city}, district=${district}, chome=${chome}, banchi=${banchi}`);

    // 階層的検索戦略の実装
    let regulationData: any = null;
    let searchLevel = '';

    // Level 1: 完全一致検索（〇丁目〇番地）
    if (chome && banchi) {
      console.log(`[Level 1] 完全一致検索: ${prefecture} ${city} ${district} ${chome} 番地${banchi}`);
      
      const result = await c.env.DB.prepare(`
        SELECT 
          id, prefecture, city, district, chome, banchi_start, banchi_end,
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
        FROM building_regulations
        WHERE prefecture = ? 
          AND city = ? 
          AND (district = ? OR district IS NULL)
          AND (chome = ? OR chome IS NULL)
          AND (banchi_start IS NULL OR banchi_start <= ?)
          AND (banchi_end IS NULL OR banchi_end >= ?)
        LIMIT 1
      `).bind(prefecture, city, district || '', chome, banchi, banchi).first();

      if (result) {
        regulationData = result;
        searchLevel = 'Level 1: 完全一致（〇丁目〇番地）';
        console.log(`[Level 1] 完全一致検索成功: ${result.normalized_address}`);
      }
    }

    // Level 2: 丁目一致検索（〇丁目）
    if (!regulationData && chome) {
      console.log(`[Level 2] 丁目一致検索: ${prefecture} ${city} ${district} ${chome}`);
      
      const result = await c.env.DB.prepare(`
        SELECT 
          id, prefecture, city, district, chome, banchi_start, banchi_end,
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
        FROM building_regulations
        WHERE prefecture = ? 
          AND city = ? 
          AND (district = ? OR district IS NULL)
          AND (chome = ? OR chome IS NULL)
        LIMIT 1
      `).bind(prefecture, city, district || '', chome).first();

      if (result) {
        regulationData = result;
        searchLevel = 'Level 2: 丁目一致（〇丁目）';
        console.log(`[Level 2] 丁目一致検索成功: ${result.normalized_address}`);
      }
    }

    // Level 3: 地区一致検索（地区名）
    if (!regulationData && district) {
      console.log(`[Level 3] 地区一致検索: ${prefecture} ${city} ${district}`);
      
      const result = await c.env.DB.prepare(`
        SELECT 
          id, prefecture, city, district, chome, banchi_start, banchi_end,
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
        FROM building_regulations
        WHERE prefecture = ? 
          AND city = ? 
          AND (district = ? OR district IS NULL)
        LIMIT 1
      `).bind(prefecture, city, district).first();

      if (result) {
        regulationData = result;
        searchLevel = 'Level 3: 地区一致（地区名）';
        console.log(`[Level 3] 地区一致検索成功: ${result.district}`);
      }
    }

    // Level 4: 市区町村レベル（フォールバック）
    if (!regulationData) {
      console.log(`[Level 4] 市区町村レベル検索: ${prefecture} ${city}`);
      
      const result = await c.env.DB.prepare(`
        SELECT 
          id, prefecture, city, district, chome, banchi_start, banchi_end,
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
        FROM building_regulations
        WHERE prefecture = ? 
          AND city = ?
        LIMIT 1
      `).bind(prefecture, city).first();

      if (result) {
        regulationData = result;
        searchLevel = 'Level 4: 市区町村レベル';
        console.log(`[Level 4] 市区町村レベル検索成功`);
      } else {
        // データが見つからない場合
        searchLevel = 'Level 4: データなし';
        
        return c.json({
          success: true,
          data: {
            search_level: searchLevel,
            location: {
              prefecture,
              city,
              district: district || '',
              chome: chome || '',
              address: address,
            },
            regulation_details: null,
            note: '建築規制情報が見つかりませんでした。該当エリアのデータが未登録の可能性があります。',
            precision: 'no_data',
          },
        });
      }
    }

    // 拡張テーブルからデータ取得
    const building_regulation_id = regulationData.id;
    const [urbanPlanning, siteRoad, buildingDesign, developmentGround, constructionEnv, localSpecific] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM urban_planning_regulations WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
      c.env.DB.prepare(`SELECT * FROM site_road_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
      c.env.DB.prepare(`SELECT * FROM building_design_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
      c.env.DB.prepare(`SELECT * FROM development_ground_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
      c.env.DB.prepare(`SELECT * FROM construction_environmental_regulations WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
      c.env.DB.prepare(`SELECT * FROM local_specific_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
    ]);

    // データが見つかった場合のレスポンス（拡張テーブル対応）
    const response = {
      success: true,
      data: {
        search_level: searchLevel,
        location: {
          prefecture: regulationData.prefecture,
          city: regulationData.city,
          district: regulationData.district || '',
          chome: regulationData.chome || '',
          address: address,
          matched_address: regulationData.normalized_address || `${regulationData.prefecture}${regulationData.city}${regulationData.district || ''}`,
        },
        regulation_details: {
          zoning: {
            type: regulationData.zoning_type,
            note: regulationData.zoning_note,
            building_coverage_ratio: regulationData.building_coverage_ratio,
            floor_area_ratio: regulationData.floor_area_ratio,
          },
          height_restriction: {
            limit: regulationData.height_limit,
            type: regulationData.height_limit_type,
          },
          shadow_regulation: {
            applicable: Boolean(regulationData.shadow_regulation),
            note: regulationData.shadow_regulation_note,
          },
          fire_prevention: {
            area: regulationData.fire_prevention_area,
          },
          district_plan: {
            name: regulationData.district_plan,
            note: regulationData.district_plan_note,
          },
          local_ordinance: {
            name: regulationData.local_ordinance,
            note: regulationData.local_ordinance_note,
          },
          building_restrictions: {
            type: regulationData.building_restrictions,
            note: regulationData.building_restrictions_note,
          },
          apartment_restrictions: {
            type: regulationData.apartment_restrictions,
            note: regulationData.apartment_restrictions_note,
            parking_ratio: regulationData.apartment_parking_ratio,
            parking_area_per_space: regulationData.apartment_parking_area_per_space,
            parking_note: regulationData.apartment_parking_note,
            bicycle_ratio: regulationData.apartment_bicycle_ratio,
            bicycle_area_per_space: regulationData.apartment_bicycle_area_per_space,
            bicycle_note: regulationData.apartment_bicycle_note,
            construction_feasible: regulationData.apartment_construction_feasible,
            infeasibility_reason: regulationData.apartment_infeasibility_reason,
          },
          development_guideline: {
            name: regulationData.development_guideline,
            url: regulationData.development_guideline_url,
          },
          
          // 拡張情報（urban_planning_regulations）
          urban_planning: urbanPlanning ? {
            height_district: urbanPlanning.height_district,
            max_height_m: urbanPlanning.max_height_m,
            max_floors: urbanPlanning.max_floors,
            shadow_regulation_area: urbanPlanning.shadow_regulation_area,
            shadow_measurement_height: urbanPlanning.shadow_measurement_height,
            shadow_time_requirement: urbanPlanning.shadow_time_requirement,
            district_plan_detail: urbanPlanning.district_plan_detail,
            min_site_area: urbanPlanning.min_site_area,
            wall_setback: urbanPlanning.wall_setback,
            building_color_restriction: urbanPlanning.building_color_restriction,
            landscape_plan_area: urbanPlanning.landscape_plan_area,
            landscape_notification_required: Boolean(urbanPlanning.landscape_notification_required),
            landscape_restrictions: urbanPlanning.landscape_restrictions,
            scenic_district: urbanPlanning.scenic_district,
            green_coverage_ratio: urbanPlanning.green_coverage_ratio,
            tree_preservation_required: Boolean(urbanPlanning.tree_preservation_required),
            aviation_height_limit: urbanPlanning.aviation_height_limit,
            cultural_property_area: Boolean(urbanPlanning.cultural_property_area),
          } : null,
          
          // 拡張情報（site_road_requirements）
          site_road: siteRoad ? {
            road_frontage_requirement: siteRoad.road_frontage_requirement,
            road_type: siteRoad.road_type,
            setback_requirement: siteRoad.setback_requirement,
            road_widening_required: Boolean(siteRoad.road_widening_required),
            fire_access_space_required: Boolean(siteRoad.fire_access_space_required),
            fire_access_space_area: siteRoad.fire_access_space_area,
            water_supply_condition: siteRoad.water_supply_condition,
            sewerage_condition: siteRoad.sewerage_condition,
            rainwater_infiltration_required: Boolean(siteRoad.rainwater_infiltration_required),
            rainwater_storage_required: Boolean(siteRoad.rainwater_storage_required),
            rainwater_storage_volume: siteRoad.rainwater_storage_volume,
          } : null,
          
          // 拡張情報（building_design_requirements）
          building_design: buildingDesign ? {
            staircase_requirement: buildingDesign.staircase_requirement,
            staircase_count_min: buildingDesign.staircase_count_min,
            outdoor_staircase_allowed: Boolean(buildingDesign.outdoor_staircase_allowed),
            lighting_requirement: buildingDesign.lighting_requirement,
            ventilation_requirement: buildingDesign.ventilation_requirement,
            ceiling_height_min: buildingDesign.ceiling_height_min,
            sound_insulation_requirement: buildingDesign.sound_insulation_requirement,
            partition_wall_requirement: buildingDesign.partition_wall_requirement,
            waste_storage_required: Boolean(buildingDesign.waste_storage_required),
            waste_storage_area_per_unit: buildingDesign.waste_storage_area_per_unit,
            waste_storage_location: buildingDesign.waste_storage_location,
            waste_separation_required: Boolean(buildingDesign.waste_separation_required),
            manager_room_required: Boolean(buildingDesign.manager_room_required),
            manager_room_threshold: buildingDesign.manager_room_threshold,
            management_system_required: buildingDesign.management_system_required,
            neighbor_explanation_required: Boolean(buildingDesign.neighbor_explanation_required),
            pre_consultation_required: Boolean(buildingDesign.pre_consultation_required),
            signboard_required: Boolean(buildingDesign.signboard_required),
            signboard_period_days: buildingDesign.signboard_period_days,
            privacy_consideration_required: Boolean(buildingDesign.privacy_consideration_required),
            privacy_measure_detail: buildingDesign.privacy_measure_detail,
            emergency_contact_board_required: Boolean(buildingDesign.emergency_contact_board_required),
            community_participation_guidance: Boolean(buildingDesign.community_participation_guidance),
            min_unit_area: buildingDesign.min_unit_area,
            delivery_box_required: Boolean(buildingDesign.delivery_box_required),
            delivery_box_ratio: buildingDesign.delivery_box_ratio,
            security_equipment_required: Boolean(buildingDesign.security_equipment_required),
            auto_lock_required: Boolean(buildingDesign.auto_lock_required),
            security_camera_required: Boolean(buildingDesign.security_camera_required),
            studio_definition: buildingDesign.studio_definition,
            studio_ratio_threshold: buildingDesign.studio_ratio_threshold,
          } : null,
          
          // 拡張情報（development_ground_requirements）
          development_ground: developmentGround ? {
            development_permit_required: Boolean(developmentGround.development_permit_required),
            development_permit_threshold: developmentGround.development_permit_threshold,
            embankment_regulation_area: Boolean(developmentGround.embankment_regulation_area),
            embankment_permit_required: Boolean(developmentGround.embankment_permit_required),
            retaining_wall_standard: developmentGround.retaining_wall_standard,
            cliff_ordinance_applicable: Boolean(developmentGround.cliff_ordinance_applicable),
            cliff_setback_distance: developmentGround.cliff_setback_distance,
            sediment_disaster_area: Boolean(developmentGround.sediment_disaster_area),
            sediment_disaster_countermeasure: developmentGround.sediment_disaster_countermeasure,
            liquefaction_risk_area: Boolean(developmentGround.liquefaction_risk_area),
            flood_countermeasure_required: Boolean(developmentGround.flood_countermeasure_required),
          } : null,
          
          // 拡張情報（construction_environmental_regulations）
          construction_env: constructionEnv ? {
            construction_vehicle_route_designation: Boolean(constructionEnv.construction_vehicle_route_designation),
            construction_time_restriction: constructionEnv.construction_time_restriction,
            noise_regulation: constructionEnv.noise_regulation,
            vibration_regulation: constructionEnv.vibration_regulation,
            construction_waste_management_required: Boolean(constructionEnv.construction_waste_management_required),
            muddy_water_countermeasure_required: Boolean(constructionEnv.muddy_water_countermeasure_required),
          } : null,
          
          // 拡張情報（local_specific_requirements）
          local_specific: localSpecific ? {
            pet_restriction: localSpecific.pet_restriction,
            minpaku_restriction: localSpecific.minpaku_restriction,
            outdoor_ad_regulation: localSpecific.outdoor_ad_regulation,
            regulation_start_date: localSpecific.regulation_start_date,
            has_building_standards_act: Boolean(localSpecific.has_building_standards_act),
            has_prefecture_ordinance: Boolean(localSpecific.has_prefecture_ordinance),
            has_municipal_ordinance: Boolean(localSpecific.has_municipal_ordinance),
            has_development_guideline: Boolean(localSpecific.has_development_guideline),
            regulation_version: localSpecific.regulation_version,
            notes: localSpecific.notes,
          } : null,
        },
        loan_impact: {
          level: regulationData.affects_loan, // 0: なし、1: 注意、2: 制限あり
          note: regulationData.loan_impact_note,
        },
        metadata: {
          data_source: regulationData.data_source,
          confidence_level: regulationData.confidence_level,
          verification_status: regulationData.verification_status,
        },
        precision: searchLevel.includes('Level 1') ? 'pinpoint' : 
                   searchLevel.includes('Level 2') ? 'chome_level' : 
                   searchLevel.includes('Level 3') ? 'district_level' : 'city_level',
      },
    };

    console.log(`[Building Regs Search] 検索成功: ${searchLevel}, precision=${response.data.precision}`);

    return c.json(response);
  } catch (error: any) {
    console.error('[Building Regs Search Error]', error);
    return c.json({
      success: false,
      error: '建築規制情報の取得に失敗しました',
      details: error.message,
    }, 500);
  }
});

export default app;
