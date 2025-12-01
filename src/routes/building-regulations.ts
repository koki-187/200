import { Hono } from 'hono';
import { getComprehensiveBuildingInfo, getApplicableRegulations, getParkingRequirement } from '../utils/buildingRegulations';

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
    
    const dealData = {
      location,
      zoning,
      fire_zone,
      height_district,
      current_status
    };
    
    const result = getComprehensiveBuildingInfo(dealData);
    
    return c.json({
      success: true,
      applicable_regulations: result.applicable_regulations,
      has_parking_requirement: result.has_parking_requirement,
      parking_info: result.parking_info,
      total_regulations: result.applicable_regulations.length
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
    
    return c.json({
      success: true,
      data: result
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

export default app;
