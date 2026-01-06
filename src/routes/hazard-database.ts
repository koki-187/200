/**
 * ハザード情報データベースAPI
 * v3.153.120 - 一都三県ハザード情報ローカルDB検索
 * 
 * 住所から市区町村を抽出し、ローカルD1データベースから
 * ハザード情報を即座に取得（API不要）
 */

import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * 住所から都道府県・市区町村を抽出
 * v3.153.124 - 政令指定都市の区まで対応
 */
function parseAddress(address: string): { prefecture: string; city: string; multipleDistricts?: boolean } | null {
  // v3.161.1: 政令指定都市の区なし住所への対応
  // 一都三県のパターン（優先度順）
  const patterns = [
    // 東京都23区
    /^(東京都)(.+?区)/,
    // 東京都市部
    /^(東京都)(.+?市)/,
    
    // 神奈川県の政令指定都市（横浜市・川崎市・相模原市の区）
    /^(神奈川県)(横浜市[^区]+区)/,
    /^(神奈川県)(川崎市[^区]+区)/,
    /^(神奈川県)(相模原市[^区]+区)/,
    // 神奈川県の市
    /^(神奈川県)(.+?市)/,
    /^(神奈川県)([^郡]+郡[^町]+町)/,
    
    // 埼玉県の政令指定都市（さいたま市の区）
    /^(埼玉県)(さいたま市[^区]+区)/,
    // 埼玉県の市
    /^(埼玉県)(.+?市)/,
    /^(埼玉県)([^郡]+郡[^町]+町)/,
    
    // 千葉県の政令指定都市（千葉市の区）
    /^(千葉県)(千葉市[^区]+区)/,
    // 千葉県の市
    /^(千葉県)(.+?市)/,
    /^(千葉県)([^郡]+郡[^町]+町)/,
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      const city = match[2];
      
      // v3.161.1: 政令指定都市で区が指定されていない場合
      const designatedCities = ['横浜市', '川崎市', '相模原市', 'さいたま市', '千葉市'];
      if (designatedCities.includes(city)) {
        return {
          prefecture: match[1],
          city: city,
          multipleDistricts: true, // 複数区のデータを取得する必要あり
        };
      }
      
      return {
        prefecture: match[1],
        city: match[2],
      };
    }
  }

  return null;
}

/**
 * ハザード情報取得API（住所ベース）
 * GET /api/hazard-db/info?address=東京都渋谷区...
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
    const location = parseAddress(address);
    if (!location) {
      return c.json({
        success: false,
        error: '住所の解析に失敗しました（一都三県の住所を入力してください）',
        address,
      }, 400);
    }

    const { prefecture, city, multipleDistricts } = location;

    // v3.161.1: 政令指定都市の場合、全区のデータを取得
    let hazardResults;
    if (multipleDistricts) {
      hazardResults = await c.env.DB.prepare(`
        SELECT 
          hazard_type,
          risk_level,
          description,
          affected_area,
          data_source
        FROM hazard_info
        WHERE prefecture = ? AND city LIKE ?
        ORDER BY 
          CASE hazard_type
            WHEN 'flood' THEN 1
            WHEN 'landslide' THEN 2
            WHEN 'tsunami' THEN 3
            WHEN 'liquefaction' THEN 4
            ELSE 5
          END
      `).bind(prefecture, `${city}%`).all();
    } else {
      hazardResults = await c.env.DB.prepare(`
        SELECT 
          hazard_type,
          risk_level,
          description,
          affected_area,
          data_source
        FROM hazard_info
        WHERE prefecture = ? AND city = ?
        ORDER BY 
          CASE hazard_type
            WHEN 'flood' THEN 1
            WHEN 'landslide' THEN 2
            WHEN 'tsunami' THEN 3
            WHEN 'liquefaction' THEN 4
            ELSE 5
          END
      `).bind(prefecture, city).all();
    }

    // v3.161.1: ローン制限情報を取得（政令指定都市対応）
    let loanResults;
    if (multipleDistricts) {
      loanResults = await c.env.DB.prepare(`
        SELECT 
          restriction_type,
          is_restricted,
          restriction_details
        FROM loan_restrictions
        WHERE prefecture = ? AND city LIKE ?
      `).bind(prefecture, `${city}%`).all();
    } else {
      loanResults = await c.env.DB.prepare(`
        SELECT 
          restriction_type,
          is_restricted,
          restriction_details
        FROM loan_restrictions
        WHERE prefecture = ? AND city = ?
      `).bind(prefecture, city).all();
    }

    // v3.161.1: 用途地域制限を取得（政令指定都市対応）
    let zoningResults;
    if (multipleDistricts) {
      zoningResults = await c.env.DB.prepare(`
        SELECT 
          is_urbanization_control_area,
          urbanization_note,
          is_fire_prevention_area,
          fire_prevention_note,
          loan_decision,
          loan_reason
        FROM zoning_restrictions
        WHERE prefecture = ? AND city LIKE ?
      `).bind(prefecture, `${city}%`).all();
    } else {
      zoningResults = await c.env.DB.prepare(`
        SELECT 
          is_urbanization_control_area,
          urbanization_note,
          is_fire_prevention_area,
          fire_prevention_note,
          loan_decision,
          loan_reason
        FROM zoning_restrictions
        WHERE prefecture = ? AND city = ?
      `).bind(prefecture, city).all();
    }

    // v3.161.1: 地理的リスクを取得（政令指定都市対応）
    let geographyResults;
    if (multipleDistricts) {
      geographyResults = await c.env.DB.prepare(`
        SELECT 
          district,
          is_cliff_area,
          cliff_height,
          cliff_note,
          is_river_adjacent,
          river_name,
          river_distance,
          is_building_collapse_area,
          collapse_type,
          max_flood_depth,
          is_over_10m_flood,
          loan_decision,
          loan_reason,
          confidence_level,
          verification_status
        FROM geography_risks
        WHERE prefecture = ? AND city LIKE ?
        ORDER BY 
          is_over_10m_flood DESC,
          is_cliff_area DESC,
          is_building_collapse_area DESC,
          is_river_adjacent DESC
        LIMIT 10
      `).bind(prefecture, `${city}%`).all();
    } else {
      geographyResults = await c.env.DB.prepare(`
        SELECT 
          district,
          is_cliff_area,
          cliff_height,
          cliff_note,
          is_river_adjacent,
          river_name,
          river_distance,
          is_building_collapse_area,
          collapse_type,
          max_flood_depth,
          is_over_10m_flood,
          loan_decision,
          loan_reason,
          confidence_level,
          verification_status
        FROM geography_risks
        WHERE prefecture = ? AND city = ?
        ORDER BY 
          is_over_10m_flood DESC,
          is_cliff_area DESC,
          is_building_collapse_area DESC,
          is_river_adjacent DESC
        LIMIT 10
      `).bind(prefecture, city).all();
    }

    // データが見つからない場合
    if (!hazardResults.results || hazardResults.results.length === 0) {
      return c.json({
        success: false,
        error: 'ハザード情報が見つかりません',
        message: `${prefecture}${city}のハザード情報はデータベースに未登録です`,
        prefecture,
        city,
      }, 404);
    }

    // レスポンス整形 - v3.161.0: 重複削除
    // ハザードタイプごとに最も高いリスクレベルの情報のみを保持
    const uniqueHazardsMap = new Map();
    hazardResults.results?.forEach((row: any) => {
      const key = row.hazard_type;
      const existing = uniqueHazardsMap.get(key);
      
      // リスクレベルの優先度: high > medium > low > none
      const getRiskPriority = (level: string): number => {
        const priority: Record<string, number> = {
          high: 3,
          medium: 2,
          low: 1,
          none: 0,
        };
        return priority[level] || 0;
      };
      
      // より高いリスクレベルを優先、または既存がない場合は追加
      if (!existing || getRiskPriority(row.risk_level) > getRiskPriority(existing.risk_level)) {
        uniqueHazardsMap.set(key, row);
      }
    });

    const hazards = Array.from(uniqueHazardsMap.values()).map((row: any) => ({
      type: row.hazard_type,
      type_name: getHazardTypeName(row.hazard_type),
      risk_level: row.risk_level,
      risk_level_text: getRiskLevelText(row.risk_level),
      description: row.description,
      affected_area: row.affected_area,
      data_source: row.data_source,
    }));

    const loanRestrictions = loanResults.results?.map((row: any) => ({
      type: row.restriction_type,
      is_restricted: row.is_restricted === 1,
      details: row.restriction_details,
    })) || [];

    // v3.153.120: 用途地域制限情報
    const zoningRestrictions: any[] = [];
    if (zoningResults.results && zoningResults.results.length > 0) {
      const zoning = zoningResults.results[0] as any;
      if (zoning.is_urbanization_control_area === 1) {
        zoningRestrictions.push({
          type: 'urbanization_control',
          name: '市街化調整区域',
          is_restricted: true,
          details: zoning.urbanization_note || '市街化を抑制すべき区域のため、原則として建築分制限されます',
        });
      }
      if (zoning.is_fire_prevention_area > 0) {
        zoningRestrictions.push({
          type: 'fire_prevention',
          name: zoning.is_fire_prevention_area === 1 ? '防火地域' : '準防火地域',
          is_restricted: true,
          details: zoning.fire_prevention_note || '建築コストが高くなるため、対象外としています',
        });
      }
    }

    // v3.153.120: 地理的リスク情報 - v3.161.0: 重複削除
    const geographyRestrictions: any[] = [];
    const geographyTypesAdded = new Set<string>();
    
    if (geographyResults.results && geographyResults.results.length > 0) {
      geographyResults.results.forEach((geo: any) => {
        if (geo.is_cliff_area === 1 && !geographyTypesAdded.has('cliff_area')) {
          geographyRestrictions.push({
            type: 'cliff_area',
            name: '崖地域',
            is_restricted: true,
            details: `${geo.cliff_note || '地盤の安定性や擁壁工事費用の問題から、対象外としています'}（崖の高さ: ${geo.cliff_height}m）`,
          });
          geographyTypesAdded.add('cliff_area');
        }
        if (geo.is_river_adjacent === 1 && !geographyTypesAdded.has('river_adjacent')) {
          geographyRestrictions.push({
            type: 'river_adjacent',
            name: '河川隣接',
            is_restricted: true,
            details: `${geo.river_name}に隣接（距離: ${geo.river_distance}m）。洪水リスクが高く、対象外としています`,
          });
          geographyTypesAdded.add('river_adjacent');
        }
        if (geo.is_building_collapse_area === 1 && !geographyTypesAdded.has('building_collapse')) {
          geographyRestrictions.push({
            type: 'building_collapse',
            name: '家屋倒壊エリア',
            is_restricted: true,
            details: `家屋倒壊等氾濫想定区域（${geo.collapse_type}）。の融資限定対象`,
          });
          geographyTypesAdded.add('building_collapse');
        }
        if (geo.is_over_10m_flood === 1 && !geographyTypesAdded.has('over_10m_flood')) {
          geographyRestrictions.push({
            type: 'over_10m_flood',
            name: '10m以上の浸水',
            is_restricted: true,
            details: `浸水想定区域（${geo.max_flood_depth}m）は融資制限の対象となります`,
          });
          geographyTypesAdded.add('over_10m_flood');
        }
      });
    }

    // v3.153.123: ローン判定（厳格化）
    // NG条件に該当する場合は完全NG扱い
    const hasFloodRestriction = loanRestrictions.some(
      (r: any) => r.type === 'flood_restricted' && r.is_restricted
    );
    const hasLandslideRestriction = loanRestrictions.some(
      (r: any) => r.type === 'landslide_restricted' && r.is_restricted
    );
    const hasZoningRestriction = zoningRestrictions.some((r: any) => r.is_restricted);
    const hasGeographyRestriction = geographyRestrictions.some((r: any) => r.is_restricted);

    // NG条件説明文マップ（金融機関基準）
    const ngConditionDescriptions: Record<string, string> = {
      'urbanization_control': '市街化を抑制すべき区域のため、原則として建築が制限されます',
      'fire_prevention': '建築コストが高くなるため、対象外としています',
      'cliff_area': '地盤の安定性や擁壁工事費用の問題から、対象外としています',
      'over_10m_flood': '浸水想定区域（10m以上）は融資制限の対象となります',
      'landslide': '土砂災害警戒区域・特別警戒区域は金融機関融資NGとなります',
      'river_adjacent': '河川に隣接する土地は洪水リスクが高く、対象外としています',
      'building_collapse': '家屋倒壊等氾濫想定区域は融資制限の対象となります'
    };

    // 該当条件を詳細リスト化
    const ngConditions: Array<{type: string; name: string; description: string}> = [];
    
    if (hasLandslideRestriction) {
      ngConditions.push({
        type: 'landslide',
        name: 'ハザードマップ',
        description: ngConditionDescriptions['landslide']
      });
    }
    
    if (zoningRestrictions.length > 0) {
      zoningRestrictions.forEach((z: any) => {
        if (z.type === 'urbanization_control') {
          ngConditions.push({
            type: z.type,
            name: '市街化調整区域',
            description: ngConditionDescriptions['urbanization_control']
          });
        } else if (z.type === 'fire_prevention') {
          ngConditions.push({
            type: z.type,
            name: '防火地域',
            description: ngConditionDescriptions['fire_prevention']
          });
        }
      });
    }
    
    if (geographyRestrictions.length > 0) {
      geographyRestrictions.forEach((g: any) => {
        if (g.type === 'cliff_area') {
          ngConditions.push({
            type: g.type,
            name: '崖地域',
            description: ngConditionDescriptions['cliff_area']
          });
        }
        if (g.type === 'river_adjacent') {
          ngConditions.push({
            type: g.type,
            name: '河川隣接',
            description: ngConditionDescriptions['river_adjacent']
          });
        }
        if (g.type === 'building_collapse') {
          ngConditions.push({
            type: g.type,
            name: '家屋倒壊エリア',
            description: ngConditionDescriptions['building_collapse']
          });
        }
        if (g.type === 'over_10m_flood') {
          ngConditions.push({
            type: g.type,
            name: '10m以上の浸水',
            description: ngConditionDescriptions['over_10m_flood']
          });
        }
      });
    }

    let loanJudgment = 'OK';
    let loanJudgmentText = '融資制限なし';
    
    // v3.153.123: NG条件に該当する場合は完全NG
    if (ngConditions.length > 0) {
      loanJudgment = 'NG';
      loanJudgmentText = '融資不可（金融機関基準）';
    }

    // v3.153.129: geography_risksをトップレベルにも追加（E2Eテスト用）
    // Production logging removed - use error tracking middleware instead
    const geographyRisksDetail = geographyResults.results && geographyResults.results.length > 0
      ? geographyResults.results.filter((geo: any) => 
          // null値を除外し、有効なリスクデータのみを含める
          geo.is_cliff_area || geo.is_river_adjacent || geo.is_building_collapse_area || geo.is_over_10m_flood
        ).map((geo: any) => ({
          district: geo.district,
          is_cliff_area: geo.is_cliff_area === 1,
          cliff_height: geo.cliff_height,
          is_river_adjacent: geo.is_river_adjacent === 1,
          river_name: geo.river_name,
          river_distance: geo.river_distance,
          is_building_collapse_area: geo.is_building_collapse_area === 1,
          collapse_type: geo.collapse_type,
          max_flood_depth: geo.max_flood_depth,
          is_over_10m_flood: geo.is_over_10m_flood === 1,
          loan_decision: geo.loan_decision,
          loan_reason: geo.loan_reason,
          confidence_level: geo.confidence_level,
          verification_status: geo.verification_status,
        }))
      : [];

    return c.json({
      success: true,
      data: {
        location: {
          prefecture,
          city,
          address,
        },
        hazards,
        geography_risks: geographyRisksDetail,  // v3.153.129: E2Eテスト用
        loan: {
          judgment: loanJudgment,
          judgment_text: loanJudgmentText,
          ng_conditions: ngConditions,  // v3.153.123: NG条件詳細リスト（type, name, description）
          restrictions: {
            basic: loanRestrictions,            // 基本ローン制限（洪水・土砂）
            zoning: zoningRestrictions,         // 用途地域制限
            geography: geographyRestrictions,   // 地理的リスク
          },
        },
        external_links: [
          {
            name: '国土交通省ハザードマップポータルサイト',
            url: 'https://disaportal.gsi.go.jp/',
          },
        ],
        note: loanJudgment === 'NG'
          ? '⚠️ この物件は融資NG条件に該当するため、案件作成はできません。'
          : '詳細な情報は国土交通省ハザードマップポータルサイトをご確認ください',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Hazard DB API] Error:', error);
    return c.json({
      success: false,
      error: 'ハザード情報の取得に失敗しました',
      message: error.message,
    }, 500);
  }
});

/**
 * 登録済み市区町村一覧取得API
 * GET /api/hazard-db/cities
 */
app.get('/cities', async (c) => {
  try {
    const results = await c.env.DB.prepare(`
      SELECT DISTINCT prefecture, city
      FROM hazard_info
      ORDER BY prefecture, city
    `).all();

    const cities = results.results?.map((row: any) => ({
      prefecture: row.prefecture,
      city: row.city,
    })) || [];

    return c.json({
      success: true,
      data: {
        cities,
        count: cities.length,
      },
    });
  } catch (error: any) {
    console.error('[Hazard DB API] Error:', error);
    return c.json({
      success: false,
      error: '市区町村一覧の取得に失敗しました',
      message: error.message,
    }, 500);
  }
});

/**
 * ヘルパー関数
 */
function getHazardTypeName(type: string): string {
  const names: Record<string, string> = {
    flood: '洪水浸水想定',
    landslide: '土砂災害警戒',
    tsunami: '津波浸水想定',
    liquefaction: '液状化リスク',
  };
  return names[type] || type;
}

function getRiskLevelText(level: string): string {
  const texts: Record<string, string> = {
    high: '高リスク',
    medium: '中リスク',
    low: '低リスク',
    none: 'リスクなし',
  };
  return texts[level] || level;
}

export default app;
