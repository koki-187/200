/**
 * 統合不動産情報検索API
 * v3.153.137 - ハザード情報 + 建築規制情報（拡張テーブル対応）の統合ピンポイント判定
 * 
 * 1つのAPIコールでハザード情報と建築規制情報（全論点）を同時に取得
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
 * 統合不動産情報検索API
 * GET /api/integrated-property-search/info?address=東京都江戸川区小岩1丁目1-10番地
 * 
 * レスポンス:
 * - ハザード情報（浸水、崖地、河川隣接等）
 * - 建築規制情報（用途地域、建ぺい率、容積率、高さ制限等）
 * - 総合融資判定
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

    // 住所解析
    const parsed = parseDetailedAddress(address);
    if (!parsed) {
      return c.json({
        success: false,
        error: '住所の解析に失敗しました（一都三県の住所を入力してください）',
        address,
      }, 400);
    }

    const { prefecture, city, district, chome, banchi } = parsed;

    console.log(`[Integrated Search] 住所解析結果: ${prefecture} ${city} ${district} ${chome} 番地${banchi}`);

    // 並列でハザード情報と建築規制情報を取得
    const [hazardData, regulationData] = await Promise.all([
      searchHazardData(c.env.DB, prefecture, city, district, chome, banchi),
      searchBuildingRegulations(c.env.DB, prefecture, city, district, chome, banchi),
    ]);

    // 総合融資判定の計算
    const integratedLoanDecision = calculateIntegratedLoanDecision(hazardData, regulationData);

    const response = {
      success: true,
      data: {
        location: {
          prefecture,
          city,
          district: district || '',
          chome: chome || '',
          address: address,
        },
        hazard_info: hazardData,
        building_regulations: regulationData,
        integrated_loan_decision: integratedLoanDecision,
      },
    };

    console.log(`[Integrated Search] 検索成功: 総合融資判定=${integratedLoanDecision.decision}`);

    return c.json(response);
  } catch (error: any) {
    console.error('[Integrated Search Error]', error);
    return c.json({
      success: false,
      error: '統合不動産情報の取得に失敗しました',
      details: error.message,
    }, 500);
  }
});

/**
 * ハザード情報検索（階層的検索戦略）
 */
async function searchHazardData(
  db: D1Database,
  prefecture: string,
  city: string,
  district: string | undefined,
  chome: string | undefined,
  banchi: number | undefined
) {
  let hazardData: any = null;
  let searchLevel = '';

  // Level 1: 完全一致（〇丁目〇番地）
  if (chome && banchi) {
    const result = await db.prepare(`
      SELECT * FROM detailed_address_hazards
      WHERE prefecture = ? AND city = ? 
        AND (district = ? OR district IS NULL)
        AND (chome = ? OR chome IS NULL)
        AND (banchi_start IS NULL OR banchi_start <= ?)
        AND (banchi_end IS NULL OR banchi_end >= ?)
      LIMIT 1
    `).bind(prefecture, city, district || '', chome, banchi, banchi).first();

    if (result) {
      hazardData = result;
      searchLevel = 'Level 1: 完全一致（〇丁目〇番地）';
    }
  }

  // Level 2: 丁目一致
  if (!hazardData && chome) {
    const result = await db.prepare(`
      SELECT * FROM detailed_address_hazards
      WHERE prefecture = ? AND city = ? 
        AND (district = ? OR district IS NULL)
        AND (chome = ? OR chome IS NULL)
      LIMIT 1
    `).bind(prefecture, city, district || '', chome).first();

    if (result) {
      hazardData = result;
      searchLevel = 'Level 2: 丁目一致（〇丁目）';
    }
  }

  // Level 3: 地区一致
  if (!hazardData && district) {
    const result = await db.prepare(`
      SELECT * FROM geography_risks
      WHERE prefecture = ? AND city = ? 
        AND (district = ? OR district IS NULL)
      LIMIT 1
    `).bind(prefecture, city, district).first();

    if (result) {
      hazardData = result;
      searchLevel = 'Level 3: 地区一致（地区名）';
    }
  }

  // Level 4: 市区町村レベル
  if (!hazardData) {
    const hazardInfo = await db.prepare(`
      SELECT hazard_type, risk_level, description, affected_area
      FROM hazard_info
      WHERE prefecture = ? AND city = ?
    `).bind(prefecture, city).all();

    searchLevel = 'Level 4: 市区町村レベル（基本情報のみ）';
    
    return {
      search_level: searchLevel,
      details: null,
      basic_info: hazardInfo.results || [],
      precision: 'city_level',
    };
  }

  return {
    search_level: searchLevel,
    details: {
      is_cliff_area: Boolean(hazardData.is_cliff_area),
      cliff_height: hazardData.cliff_height,
      is_river_adjacent: Boolean(hazardData.is_river_adjacent),
      river_name: hazardData.river_name,
      river_distance: hazardData.river_distance,
      is_building_collapse_area: Boolean(hazardData.is_building_collapse_area),
      collapse_type: hazardData.collapse_type,
      max_flood_depth: hazardData.max_flood_depth,
      is_over_10m_flood: Boolean(hazardData.is_over_10m_flood),
    },
    loan_decision: hazardData.loan_decision || 'OK',
    loan_reason: hazardData.loan_reason || '',
    precision: searchLevel.includes('Level 1') ? 'pinpoint' : 
               searchLevel.includes('Level 2') ? 'chome_level' : 
               searchLevel.includes('Level 3') ? 'district_level' : 'city_level',
  };
}

/**
 * 建築規制情報検索（階層的検索戦略 + 拡張テーブル対応）
 */
async function searchBuildingRegulations(
  db: D1Database,
  prefecture: string,
  city: string,
  district: string | undefined,
  chome: string | undefined,
  banchi: number | undefined
) {
  let regulationData: any = null;
  let searchLevel = '';

  // Level 1: 完全一致（〇丁目〇番地）
  if (chome && banchi) {
    const result = await db.prepare(`
      SELECT * FROM building_regulations
      WHERE prefecture = ? AND city = ? 
        AND (district = ? OR district IS NULL)
        AND (chome = ? OR chome IS NULL)
        AND (banchi_start IS NULL OR banchi_start <= ?)
        AND (banchi_end IS NULL OR banchi_end >= ?)
      ORDER BY 
        verification_status = 'VERIFIED' DESC,
        confidence_level = 'HIGH' DESC,
        chome IS NOT NULL DESC,
        district IS NOT NULL DESC
      LIMIT 1
    `).bind(prefecture, city, district || '', chome, banchi, banchi).first();

    if (result) {
      regulationData = result;
      searchLevel = 'Level 1: 完全一致（〇丁目〇番地）';
    }
  }

  // Level 2: 丁目一致
  if (!regulationData && chome) {
    const result = await db.prepare(`
      SELECT * FROM building_regulations
      WHERE prefecture = ? AND city = ? 
        AND (district = ? OR district IS NULL)
        AND (chome = ? OR chome IS NULL)
      ORDER BY 
        verification_status = 'VERIFIED' DESC,
        confidence_level = 'HIGH' DESC,
        chome IS NOT NULL DESC,
        district IS NOT NULL DESC
      LIMIT 1
    `).bind(prefecture, city, district || '', chome).first();

    if (result) {
      regulationData = result;
      searchLevel = 'Level 2: 丁目一致（〇丁目）';
    }
  }

  // Level 3: 地区一致
  if (!regulationData && district) {
    const result = await db.prepare(`
      SELECT * FROM building_regulations
      WHERE prefecture = ? AND city = ? 
        AND (district = ? OR district IS NULL)
      ORDER BY 
        verification_status = 'VERIFIED' DESC,
        confidence_level = 'HIGH' DESC,
        district IS NOT NULL DESC
      LIMIT 1
    `).bind(prefecture, city, district).first();

    if (result) {
      regulationData = result;
      searchLevel = 'Level 3: 地区一致（地区名）';
    }
  }

  // Level 4: 市区町村レベル
  if (!regulationData) {
    const result = await db.prepare(`
      SELECT * FROM building_regulations
      WHERE prefecture = ? AND city = ?
      ORDER BY 
        verification_status = 'VERIFIED' DESC,
        confidence_level = 'HIGH' DESC
      LIMIT 1
    `).bind(prefecture, city).first();

    if (result) {
      regulationData = result;
      searchLevel = 'Level 4: 市区町村レベル';
    } else {
      return {
        search_level: 'Level 4: データなし',
        details: null,
        precision: 'no_data',
      };
    }
  }

  // 拡張テーブルからデータ取得
  const building_regulation_id = regulationData.id;
  const [urbanPlanning, siteRoad, buildingDesign, developmentGround, constructionEnv, localSpecific] = await Promise.all([
    db.prepare(`SELECT * FROM urban_planning_regulations WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
    db.prepare(`SELECT * FROM site_road_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
    db.prepare(`SELECT * FROM building_design_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
    db.prepare(`SELECT * FROM development_ground_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
    db.prepare(`SELECT * FROM construction_environmental_regulations WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
    db.prepare(`SELECT * FROM local_specific_requirements WHERE building_regulation_id = ? LIMIT 1`).bind(building_regulation_id).first(),
  ]);

  return {
    search_level: searchLevel,
    details: {
      // 基本情報（building_regulations）
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
      building_restrictions: {
        type: regulationData.building_restrictions,
        note: regulationData.building_restrictions_note,
      },
      apartment_construction_feasible: regulationData.apartment_construction_feasible,
      apartment_infeasibility_reason: regulationData.apartment_infeasibility_reason,
      apartment_parking_ratio: regulationData.apartment_parking_ratio,
      apartment_parking_area_per_space: regulationData.apartment_parking_area_per_space,
      apartment_bicycle_ratio: regulationData.apartment_bicycle_ratio,
      apartment_bicycle_area_per_space: regulationData.apartment_bicycle_area_per_space,
      development_guideline: regulationData.development_guideline,
      development_guideline_url: regulationData.development_guideline_url,
      
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
    // メタデータ（検証ステータス、情報源、信頼度）
    data_source: regulationData.data_source,
    confidence_level: regulationData.confidence_level,
    verification_status: regulationData.verification_status,
    last_fact_checked: regulationData.last_fact_checked,
    precision: searchLevel.includes('Level 1') ? 'pinpoint' : 
               searchLevel.includes('Level 2') ? 'chome_level' : 
               searchLevel.includes('Level 3') ? 'district_level' : 'city_level',
  };
}

/**
 * 総合融資判定の計算
 */
function calculateIntegratedLoanDecision(hazardData: any, regulationData: any) {
  const ngReasons: string[] = [];
  const cautionReasons: string[] = [];

  // ハザード情報による判定
  if (hazardData.loan_decision === 'NG') {
    ngReasons.push(`ハザード情報: ${hazardData.loan_reason}`);
  }

  // 建築規制情報による判定
  if (regulationData.details && regulationData.loan_impact) {
    if (regulationData.loan_impact.level === 2) {
      ngReasons.push(`建築規制: ${regulationData.loan_impact.note}`);
    } else if (regulationData.loan_impact.level === 1) {
      cautionReasons.push(`建築規制: ${regulationData.loan_impact.note}`);
    }
  }

  // アパート建築可否判定
  if (regulationData.details && regulationData.details.apartment_construction_feasible === 0) {
    ngReasons.push(`アパート建築不可: ${regulationData.details.apartment_infeasibility_reason || '開発指導要綱により建築不可'}`);
  }

  // 総合判定
  if (ngReasons.length > 0) {
    return {
      decision: 'NG',
      reasons: ngReasons,
      cautions: cautionReasons,
      summary: `融資不可: ${ngReasons.length}件の重大な制限事項があります。`,
    };
  } else if (cautionReasons.length > 0) {
    return {
      decision: 'CAUTION',
      reasons: [],
      cautions: cautionReasons,
      summary: `要注意: ${cautionReasons.length}件の注意事項があります。融資審査で詳細確認が必要です。`,
    };
  } else {
    return {
      decision: 'OK',
      reasons: [],
      cautions: [],
      summary: '融資可: 重大な制限事項はありません。',
    };
  }
}

export default app;
