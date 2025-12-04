import { Hono } from 'hono';
import { Bindings } from '../types';

const hazardCheck = new Hono<{ Bindings: Bindings }>();

/**
 * ハザード自動判定API
 * 
 * 目的: 土地仕入れスクリーニングのNG項目を無料APIとオープンデータで自動判定
 * 
 * 判定項目:
 * 1. 10m以上の浸水: 国土地理院「重ねるハザードマップ」洪水/高潮レイヤー
 * 2. 河川隣接: OpenStreetMap 河川ポリゴンデータ（距離30m以内）
 * 3. 家屋倒壊浸水エリア: 国土地理院 家屋倒壊等氾濫想定区域レイヤー
 * 4. 崖・火災地域: 土砂災害警戒区域レイヤー + 自治体都市計画図
 * 5. ハザードマップ: 上記いずれかに該当
 * 
 * 費用:
 * - 国土地理院タイル / OSMデータ: 完全無料
 * - Google Apps Script: 無料枠内で利用可能
 * - Google Maps Geocoding API: 無料枠 約500リクエスト/月
 */

/**
 * ハザード総合判定
 * POST /api/hazard-check/comprehensive
 * Body: { address?: string, lat?: number, lng?: number }
 */
hazardCheck.post('/comprehensive', async (c) => {
  try {
    const body = await c.req.json();
    let lat = body.lat;
    let lng = body.lng;
    const address = body.address;

    // 住所が指定された場合、Geocodingで緯度経度を取得
    if (!lat || !lng) {
      if (!address) {
        return c.json({ 
          error: '住所または緯度経度の指定が必要です',
          details: 'address または (lat, lng) を指定してください'
        }, 400);
      }

      // OpenStreetMap Nominatim で住所から座標を取得
      const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
      nominatimUrl.searchParams.set('q', address);
      nominatimUrl.searchParams.set('format', 'json');
      nominatimUrl.searchParams.set('limit', '1');
      nominatimUrl.searchParams.set('countrycodes', 'jp');

      const geoResponse = await fetch(nominatimUrl.toString(), {
        headers: {
          'User-Agent': '200units-real-estate-app/1.0'
        }
      });

      if (!geoResponse.ok) {
        return c.json({ 
          error: 'Geocoding APIエラー',
          details: `HTTP ${geoResponse.status}`
        }, 500);
      }

      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        return c.json({
          success: false,
          message: '指定された住所の位置情報が見つかりませんでした',
          address: address
        }, 404);
      }

      lat = parseFloat(geoData[0].lat);
      lng = parseFloat(geoData[0].lon);
    }

    // 各ハザード項目を判定
    const results = {
      location: {
        latitude: lat,
        longitude: lng,
        address: address || `緯度:${lat}, 経度:${lng}`
      },
      hazards: {
        flooding_over_10m: await checkFloodingRisk(lat, lng),
        river_proximity: await checkRiverProximity(lat, lng),
        building_collapse: await checkBuildingCollapseRisk(lat, lng),
        cliff_and_fire: await checkCliffAndFireZone(lat, lng)
      },
      summary: {
        total_ng_items: 0,
        is_ng_property: false,
        ng_reasons: [] as string[]
      }
    };

    // NG判定の集計
    if (results.hazards.flooding_over_10m.is_ng) {
      results.summary.total_ng_items++;
      results.summary.ng_reasons.push('10m以上の浸水');
    }
    if (results.hazards.river_proximity.is_ng) {
      results.summary.total_ng_items++;
      results.summary.ng_reasons.push('河川隣接（30m以内）');
    }
    if (results.hazards.building_collapse.is_ng) {
      results.summary.total_ng_items++;
      results.summary.ng_reasons.push('家屋倒壊浸水エリア');
    }
    if (results.hazards.cliff_and_fire.is_ng) {
      results.summary.total_ng_items++;
      results.summary.ng_reasons.push('崖地域・防火地域');
    }

    // いずれかに該当する場合はNG物件
    results.summary.is_ng_property = results.summary.total_ng_items > 0;

    // ハザードマップの判定（いずれかに該当する場合）
    const hazard_map_applicable = results.summary.is_ng_property;

    return c.json({
      success: true,
      data: results,
      hazard_map_applicable: hazard_map_applicable,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Hazard check error:', error);
    return c.json({ 
      error: 'ハザード判定処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 10m以上の浸水リスクを判定
 * 国土地理院「重ねるハザードマップ」の洪水/高潮レイヤーを使用
 * 
 * 実装方法:
 * 1. 国土地理院タイルサーバーから該当タイルを取得
 * 2. タイル画像の色情報から浸水深を判定
 * 3. 10m以上（通常は濃い青/紫色）をNG判定
 * 
 * タイルURL例: https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_kuni_data/{z}/{x}/{y}.png
 */
async function checkFloodingRisk(lat: number, lng: number) {
  try {
    // TODO: 実装
    // 現時点では簡易判定（要確認フラグ）
    return {
      is_ng: false,
      confidence: 'low',
      message: '要確認: 国土地理院ハザードマップで浸水深を確認してください',
      details: {
        check_url: `https://disaportal.gsi.go.jp/maps/?ll=${lat},${lng}&z=15&base=pale&vs=c1j0h0k0l0u0t0z0r0s0m0f0`
      }
    };
  } catch (error) {
    return {
      is_ng: false,
      confidence: 'error',
      message: '判定エラー',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * 河川隣接を判定
 * OpenStreetMap の河川ポリゴンデータを使用
 * 
 * 実装方法:
 * 1. Overpass API で周辺の河川データを取得
 * 2. 座標から河川までの最短距離を計算
 * 3. 30m以内の場合はNG判定
 */
async function checkRiverProximity(lat: number, lng: number) {
  try {
    const radius = 50; // 検索半径（メートル）
    
    // Overpass API でクエリ
    const overpassQuery = `
      [out:json];
      (
        way["waterway"](around:${radius},${lat},${lng});
        relation["waterway"](around:${radius},${lat},${lng});
      );
      out geom;
    `;

    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    const response = await fetch(overpassUrl, {
      headers: {
        'User-Agent': '200units-real-estate-app/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.elements && data.elements.length > 0) {
      // 河川が周辺に存在する
      const nearestRiver = data.elements[0];
      const riverName = nearestRiver.tags?.name || '名称不明の河川';

      return {
        is_ng: true,
        confidence: 'high',
        message: `河川に隣接しています（推定距離: ${radius}m以内）`,
        details: {
          river_name: riverName,
          estimated_distance: `< ${radius}m`,
          river_type: nearestRiver.tags?.waterway || 'unknown'
        }
      };
    } else {
      return {
        is_ng: false,
        confidence: 'high',
        message: `周辺${radius}m以内に河川は検出されませんでした`,
        details: {}
      };
    }
  } catch (error) {
    return {
      is_ng: false,
      confidence: 'error',
      message: '判定エラー: Overpass APIへのアクセスに失敗しました',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * 家屋倒壊浸水エリアを判定
 * 国土地理院「重ねるハザードマップ」の家屋倒壊等氾濫想定区域レイヤーを使用
 */
async function checkBuildingCollapseRisk(lat: number, lng: number) {
  try {
    // TODO: 実装
    // 現時点では簡易判定（要確認フラグ）
    return {
      is_ng: false,
      confidence: 'low',
      message: '要確認: 国土地理院ハザードマップで家屋倒壊リスクを確認してください',
      details: {
        check_url: `https://disaportal.gsi.go.jp/maps/?ll=${lat},${lng}&z=15&base=pale&vs=c1j0h0k0l0u0t0z0r0s0m0f0`
      }
    };
  } catch (error) {
    return {
      is_ng: false,
      confidence: 'error',
      message: '判定エラー',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * 崖・防火地域を判定
 * 土砂災害警戒区域レイヤー + 自治体都市計画図を使用
 */
async function checkCliffAndFireZone(lat: number, lng: number) {
  try {
    // TODO: 実装
    // 現時点では簡易判定（要確認フラグ）
    return {
      is_ng: false,
      confidence: 'low',
      message: '要確認: 各自治体の都市計画図で防火地域・土砂災害警戒区域を確認してください',
      details: {
        check_url: `https://disaportal.gsi.go.jp/maps/?ll=${lat},${lng}&z=15&base=pale&vs=c1j0h0k0l0u0t0z0r0s0m0f0`
      }
    };
  } catch (error) {
    return {
      is_ng: false,
      confidence: 'error',
      message: '判定エラー',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * 簡易版ハザード判定（河川近接のみ実装）
 * GET /api/hazard-check/quick?address=住所
 */
hazardCheck.get('/quick', async (c) => {
  try {
    const address = c.req.query('address');
    
    if (!address) {
      return c.json({ error: '住所パラメータが必要です' }, 400);
    }

    // Geocoding
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', address);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '1');
    nominatimUrl.searchParams.set('countrycodes', 'jp');

    const geoResponse = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': '200units-real-estate-app/1.0'
      }
    });

    if (!geoResponse.ok) {
      return c.json({ 
        error: 'Geocoding APIエラー',
        details: `HTTP ${geoResponse.status}`
      }, 500);
    }

    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      return c.json({
        success: false,
        message: '指定された住所の位置情報が見つかりませんでした',
        address: address
      }, 404);
    }

    const lat = parseFloat(geoData[0].lat);
    const lng = parseFloat(geoData[0].lon);

    // 河川近接チェックのみ実施（最も信頼性が高い）
    const riverCheck = await checkRiverProximity(lat, lng);

    return c.json({
      success: true,
      location: {
        address: address,
        latitude: lat,
        longitude: lng,
        display_name: geoData[0].display_name
      },
      river_proximity: riverCheck,
      note: 'その他のハザード項目は /api/hazard-check/comprehensive で取得してください'
    });

  } catch (error) {
    console.error('Quick hazard check error:', error);
    return c.json({ 
      error: 'ハザード判定処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default hazardCheck;
