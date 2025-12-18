/**
 * ピンポイントハザード情報API
 * v3.153.131 - 詳細住所（〇丁目・〇番地・〇号）レベルのハザード判定
 * 
 * MLIT API不使用、データベース駆動型のピンポイント判定を実現
 * エラーリスクを最小化し、高速レスポンスを実現
 */

import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { parseDetailedAddress } from '../utils/address-parser';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * ピンポイントハザード情報取得API
 * GET /api/pinpoint-hazard/info?address=東京都江戸川区小岩1丁目1-10番地
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

    console.log(`[Pinpoint Search] 住所解析結果: prefecture=${prefecture}, city=${city}, district=${district}, chome=${chome}, banchi=${banchi}`);

    // 階層的検索戦略の実装
    let hazardData: any = null;
    let searchLevel = '';

    // Level 1: 完全一致検索（〇丁目〇番地）
    if (chome && banchi) {
      console.log(`[Level 1] 完全一致検索: ${prefecture} ${city} ${district} ${chome} 番地${banchi}`);
      
      const result = await c.env.DB.prepare(`
        SELECT 
          id, prefecture, city, district, chome, banchi_start, banchi_end,
          normalized_address,
          is_cliff_area, cliff_height, cliff_note,
          is_river_adjacent, river_name, river_distance,
          is_building_collapse_area, collapse_type,
          max_flood_depth, is_over_10m_flood,
          loan_decision, loan_reason,
          data_source, confidence_level, verification_status
        FROM detailed_address_hazards
        WHERE prefecture = ? 
          AND city = ? 
          AND district = ?
          AND chome = ?
          AND banchi_start <= ?
          AND banchi_end >= ?
        LIMIT 1
      `).bind(prefecture, city, district, chome, banchi, banchi).first();

      if (result) {
        hazardData = result;
        searchLevel = 'Level 1: 完全一致（〇丁目〇番地）';
        console.log(`[Level 1] 完全一致検索成功: ${result.normalized_address}`);
      }
    }

    // Level 2: 丁目一致検索（〇丁目）
    if (!hazardData && chome) {
      console.log(`[Level 2] 丁目一致検索: ${prefecture} ${city} ${district} ${chome}`);
      
      const result = await c.env.DB.prepare(`
        SELECT 
          id, prefecture, city, district, chome, banchi_start, banchi_end,
          normalized_address,
          is_cliff_area, cliff_height, cliff_note,
          is_river_adjacent, river_name, river_distance,
          is_building_collapse_area, collapse_type,
          max_flood_depth, is_over_10m_flood,
          loan_decision, loan_reason,
          data_source, confidence_level, verification_status
        FROM detailed_address_hazards
        WHERE prefecture = ? 
          AND city = ? 
          AND district = ?
          AND chome = ?
        LIMIT 1
      `).bind(prefecture, city, district, chome).first();

      if (result) {
        hazardData = result;
        searchLevel = 'Level 2: 丁目一致（〇丁目）';
        console.log(`[Level 2] 丁目一致検索成功: ${result.normalized_address}`);
      }
    }

    // Level 3: 地区一致検索（地区名）
    if (!hazardData && district) {
      console.log(`[Level 3] 地区一致検索: ${prefecture} ${city} ${district}`);
      
      // geography_risksテーブルからフォールバック
      const result = await c.env.DB.prepare(`
        SELECT 
          prefecture, city, district,
          is_cliff_area, cliff_height, cliff_note,
          is_river_adjacent, river_name, river_distance,
          is_building_collapse_area, collapse_type,
          max_flood_depth, is_over_10m_flood,
          loan_decision, loan_reason,
          data_source, confidence_level, verification_status
        FROM geography_risks
        WHERE prefecture = ? 
          AND city = ? 
          AND district = ?
        LIMIT 1
      `).bind(prefecture, city, district).first();

      if (result) {
        hazardData = result;
        searchLevel = 'Level 3: 地区一致（地区名）';
        console.log(`[Level 3] 地区一致検索成功: ${result.district}`);
      }
    }

    // Level 4: 市区町村レベル（フォールバック）
    if (!hazardData) {
      console.log(`[Level 4] 市区町村レベル検索: ${prefecture} ${city}`);
      
      // hazard_infoテーブルから基本情報を取得
      const hazardInfo = await c.env.DB.prepare(`
        SELECT 
          hazard_type,
          risk_level,
          description,
          affected_area
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

      searchLevel = 'Level 4: 市区町村レベル（基本情報のみ）';
      
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
          hazards: hazardInfo.results || [],
          note: '詳細住所データが見つかりませんでした。市区町村レベルの基本情報を表示しています。',
          precision: 'city_level',
        },
      });
    }

    // データが見つかった場合のレスポンス
    const response = {
      success: true,
      data: {
        search_level: searchLevel,
        location: {
          prefecture: hazardData.prefecture,
          city: hazardData.city,
          district: hazardData.district || '',
          chome: hazardData.chome || '',
          address: address,
          matched_address: hazardData.normalized_address || `${hazardData.prefecture}${hazardData.city}${hazardData.district || ''}`,
        },
        hazard_details: {
          is_cliff_area: Boolean(hazardData.is_cliff_area),
          cliff_height: hazardData.cliff_height,
          cliff_note: hazardData.cliff_note,
          is_river_adjacent: Boolean(hazardData.is_river_adjacent),
          river_name: hazardData.river_name,
          river_distance: hazardData.river_distance,
          is_building_collapse_area: Boolean(hazardData.is_building_collapse_area),
          collapse_type: hazardData.collapse_type,
          max_flood_depth: hazardData.max_flood_depth,
          is_over_10m_flood: Boolean(hazardData.is_over_10m_flood),
        },
        loan: {
          decision: hazardData.loan_decision || 'OK',
          reason: hazardData.loan_reason || '',
        },
        metadata: {
          data_source: hazardData.data_source,
          confidence_level: hazardData.confidence_level,
          verification_status: hazardData.verification_status,
        },
        precision: searchLevel.includes('Level 1') ? 'pinpoint' : 
                   searchLevel.includes('Level 2') ? 'chome_level' : 
                   searchLevel.includes('Level 3') ? 'district_level' : 'city_level',
      },
    };

    console.log(`[Pinpoint Search] 検索成功: ${searchLevel}, precision=${response.data.precision}`);

    return c.json(response);
  } catch (error: any) {
    console.error('[Pinpoint Search Error]', error);
    return c.json({
      success: false,
      error: 'ハザード情報の取得に失敗しました',
      details: error.message,
    }, 500);
  }
});

export default app;
