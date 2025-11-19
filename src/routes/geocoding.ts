import { Hono } from 'hono';
import { Bindings } from '../types';

const geocoding = new Hono<{ Bindings: Bindings }>();

/**
 * Geocoding API - 住所から緯度経度を取得
 * 
 * 使用API: OpenStreetMap Nominatim (無料、認証不要)
 * レート制限: 1秒に1リクエスト
 * 精度: 日本の住所に対応
 */

/**
 * 住所から緯度経度を取得
 * GET /api/geocoding/search?address=所在地
 */
geocoding.get('/search', async (c) => {
  try {
    const address = c.req.query('address');
    
    if (!address) {
      return c.json({ error: '住所パラメータが必要です' }, 400);
    }

    // OpenStreetMap Nominatim API を使用
    // 無料で認証不要、日本の住所にも対応
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', address);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '1');
    nominatimUrl.searchParams.set('countrycodes', 'jp'); // 日本に限定
    nominatimUrl.searchParams.set('addressdetails', '1');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': '200units-real-estate-app/1.0' // Nominatim requires User-Agent
      }
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText);
      return c.json({ 
        error: 'Geocoding APIエラー',
        details: `HTTP ${response.status}`
      }, 500);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return c.json({
        success: false,
        message: '指定された住所の位置情報が見つかりませんでした',
        address: address
      }, 404);
    }

    const result = data[0];

    return c.json({
      success: true,
      data: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
        address: result.address,
        importance: result.importance,
        // 住所コンポーネント
        prefecture: result.address?.state || null,
        city: result.address?.city || result.address?.town || result.address?.village || null,
        suburb: result.address?.suburb || null,
        road: result.address?.road || null,
        postcode: result.address?.postcode || null
      }
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return c.json({ 
      error: 'Geocoding処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 複数の住所を一括ジオコーディング
 * POST /api/geocoding/batch
 * Body: { addresses: string[] }
 */
geocoding.post('/batch', async (c) => {
  try {
    const body = await c.req.json();
    const addresses: string[] = body.addresses;

    if (!addresses || !Array.isArray(addresses)) {
      return c.json({ error: 'addressesパラメータが必要です（配列）' }, 400);
    }

    if (addresses.length > 10) {
      return c.json({ error: '一度に処理できる住所は最大10件です' }, 400);
    }

    const results = [];

    // レート制限対策: 1秒間隔で処理
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];

      if (i > 0) {
        // 1秒待機（Nominatim のレート制限対策）
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      try {
        const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
        nominatimUrl.searchParams.set('q', address);
        nominatimUrl.searchParams.set('format', 'json');
        nominatimUrl.searchParams.set('limit', '1');
        nominatimUrl.searchParams.set('countrycodes', 'jp');

        const response = await fetch(nominatimUrl.toString(), {
          headers: {
            'User-Agent': '200units-real-estate-app/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const result = data[0];
            results.push({
              address: address,
              success: true,
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              display_name: result.display_name
            });
          } else {
            results.push({
              address: address,
              success: false,
              error: '位置情報が見つかりませんでした'
            });
          }
        } else {
          results.push({
            address: address,
            success: false,
            error: `APIエラー: HTTP ${response.status}`
          });
        }
      } catch (error) {
        results.push({
          address: address,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return c.json({
      success: true,
      processed: addresses.length,
      successful: successCount,
      failed: addresses.length - successCount,
      results: results
    });

  } catch (error) {
    console.error('Batch geocoding error:', error);
    return c.json({ 
      error: 'Batch geocoding処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default geocoding;
