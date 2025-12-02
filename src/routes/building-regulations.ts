import { Hono } from 'hono';
import { getComprehensiveBuildingInfo, getApplicableRegulations, getParkingRequirement } from '../utils/buildingRegulations';
import { getMunicipalRegulations, getThreeStoryWoodenRegulations } from '../data/municipalRegulations';

const app = new Hono();

/**
 * GET /api/building-regulations/check
 * 物件情報から該当する建築基準法・条例を取得（クエリパラメータ版）
 */
app.get('/check', async (c) => {
  try {
    const location = c.req.query('location') || '';
    const zoning = c.req.query('zoning') || '';
    const fire_zone = c.req.query('fire_zone') || '';
    const height_district = c.req.query('height_district') || '';
    const current_status = c.req.query('current_status') || '';
    const structure = c.req.query('structure') || '';
    const floors = c.req.query('floors') ? parseInt(c.req.query('floors') || '0') : undefined;
    
    const dealData = {
      location,
      zoning,
      fire_zone,
      height_district,
      current_status,
      structure,
      floors
    };
    
    const result = getComprehensiveBuildingInfo(dealData);
    
    // 自治体条例情報を追加
    const municipalRegs = location ? getMunicipalRegulations(location) : [];
    
    let message = `${result.applicable_regulations.length}件の建築基準法規定を検出しました`;
    if (result.is_three_story_wooden) {
      message += ' - 3階建て木造建築の特別規定が適用されます';
    }
    if (municipalRegs.length > 0) {
      message += ` / ${municipalRegs.length}件の自治体条例が該当します`;
    }
    
    return c.json({
      success: true,
      data: {
        ...result,
        municipal_regulations: municipalRegs
      },
      message
    });
  } catch (error) {
    console.error('建築基準法チェックエラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '建築基準法チェックに失敗しました'
    }, 500);
  }
});

/**
 * POST /api/building-regulations/check
 * 物件情報から該当する建築基準法・条例を取得（JSONボディ版）
 */
app.post('/check', async (c) => {
  try {
    const dealData = await c.req.json();
    
    const result = getComprehensiveBuildingInfo(dealData);
    
    // 自治体条例情報を追加
    const municipalRegs = dealData.location ? getMunicipalRegulations(dealData.location) : [];
    
    return c.json({
      success: true,
      data: {
        ...result,
        municipal_regulations: municipalRegs
      }
    });
  } catch (error) {
    console.error('建築基準法チェックエラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '建築基準法チェックに失敗しました'
    }, 500);
  }
});

/**
 * GET /api/building-regulations/parking/:prefecture
 * 都道府県別の駐車場設置基準を取得
 */
app.get('/parking/:prefecture', async (c) => {
  try {
    const prefecture = c.req.param('prefecture');
    
    const parkingInfo = getParkingRequirement(prefecture);
    
    if (!parkingInfo) {
      return c.json({
        success: false,
        error: '該当する駐車場基準が見つかりません'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: parkingInfo
    });
  } catch (error) {
    console.error('駐車場基準取得エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '駐車場基準の取得に失敗しました'
    }, 500);
  }
});

/**
 * GET /api/building-regulations/municipal
 * 自治体条例を取得
 */
app.get('/municipal', async (c) => {
  try {
    const location = c.req.query('location') || '';
    const category = c.req.query('category') as any;
    
    if (!location) {
      return c.json({
        success: false,
        error: '所在地(location)パラメータが必要です'
      }, 400);
    }
    
    const regulations = getMunicipalRegulations(location, category);
    
    return c.json({
      success: true,
      data: {
        location,
        regulations,
        count: regulations.length
      }
    });
  } catch (error) {
    console.error('自治体条例取得エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '自治体条例の取得に失敗しました'
    }, 500);
  }
});

/**
 * GET /api/building-regulations/three-story-wooden
 * 3階建て木造集合住宅に特化した条例・規則を取得
 */
app.get('/three-story-wooden', async (c) => {
  try {
    const location = c.req.query('location') || '';
    
    if (!location) {
      return c.json({
        success: false,
        error: '所在地(location)パラメータが必要です'
      }, 400);
    }
    
    const regulations = getThreeStoryWoodenRegulations(location);
    
    return c.json({
      success: true,
      data: {
        location,
        regulations,
        count: regulations.length,
        message: '3階建て木造集合住宅に関連する条例・規則を抽出しました'
      }
    });
  } catch (error) {
    console.error('3階建て木造条例取得エラー:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '3階建て木造条例の取得に失敗しました'
    }, 500);
  }
});

export default app;
