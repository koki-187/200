/**
 * 統合不動産情報検索API
 * v3.153.132 - ハザード情報 + 建築規制情報の統合ピンポイント判定
 * 
 * 1つのAPIコールでハザード情報と建築規制情報を同時に取得
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
 * 建築規制情報検索（階層的検索戦略）
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

  return {
    search_level: searchLevel,
    details: {
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
    },
    loan_impact: {
      level: regulationData.affects_loan, // 0: なし、1: 注意、2: 制限あり
      note: regulationData.loan_impact_note,
    },
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
