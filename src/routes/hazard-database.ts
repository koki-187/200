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
 */
function parseAddress(address: string): { prefecture: string; city: string } | null {
  // 一都三県のパターン
  const patterns = [
    // 東京都23区
    /^(東京都)([^市]+区)/,
    // 東京都市部
    /^(東京都)([^市]+市)/,
    // 神奈川県
    /^(神奈川県)([^市]+市)/,
    /^(神奈川県)([^郡]+郡[^町]+町)/,
    // 埼玉県
    /^(埼玉県)([^市]+市)/,
    /^(埼玉県)([^郡]+郡[^町]+町)/,
    // 千葉県
    /^(千葉県)([^市]+市)/,
    /^(千葉県)([^郡]+郡[^町]+町)/,
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
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

    const { prefecture, city } = location;

    // D1データベースからハザード情報を取得
    const hazardResults = await c.env.DB.prepare(`
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

    // ローン制限情報を取得
    const loanResults = await c.env.DB.prepare(`
      SELECT 
        restriction_type,
        is_restricted,
        restriction_details
      FROM loan_restrictions
      WHERE prefecture = ? AND city = ?
    `).bind(prefecture, city).all();

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

    // レスポンス整形
    const hazards = hazardResults.results.map((row: any) => ({
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

    // ローン判定
    const hasFloodRestriction = loanRestrictions.some(
      (r: any) => r.type === 'flood_restricted' && r.is_restricted
    );
    const hasLandslideRestriction = loanRestrictions.some(
      (r: any) => r.type === 'landslide_restricted' && r.is_restricted
    );

    let loanJudgment = 'OK';
    let loanJudgmentText = '融資制限なし';
    
    if (hasFloodRestriction || hasLandslideRestriction) {
      loanJudgment = 'RESTRICTED';
      loanJudgmentText = '融資制限の可能性あり';
    }

    return c.json({
      success: true,
      data: {
        location: {
          prefecture,
          city,
          address,
        },
        hazards,
        loan: {
          judgment: loanJudgment,
          judgment_text: loanJudgmentText,
          restrictions: loanRestrictions,
        },
        external_links: [
          {
            name: '国土交通省ハザードマップポータルサイト',
            url: 'https://disaportal.gsi.go.jp/',
          },
        ],
        note: '詳細な情報は国土交通省ハザードマップポータルサイトをご確認ください',
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
