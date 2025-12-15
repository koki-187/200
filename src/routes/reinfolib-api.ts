import { Hono } from 'hono';
import type { JWTPayload } from 'hono/utils/jwt/types';
import { handleAPIError, retryAsync, withTimeout, logError, createErrorResponse } from '../utils/error-handler';
import { authMiddleware } from '../utils/auth';

type Bindings = {
  DB: D1Database;
  FILES_BUCKET: R2Bucket;
  JWT_SECRET: string;
  MLIT_API_KEY?: string;
};

type Variables = {
  user: JWTPayload & { userId: number; role: string; };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 認証必須（テストエンドポイントを除く）
app.use('/property-info', authMiddleware);
app.use('/zoning-info', authMiddleware);
app.use('/hazard-info', authMiddleware);
app.use('/check-financing-restrictions', authMiddleware);
// テストエンドポイントは認証不要

/**
 * テストエンドポイント - デバッグ用
 */
app.get('/test', async (c) => {
  return c.json({
    success: true,
    message: 'REINFOLIB API is working',
    timestamp: new Date().toISOString()
  }, 200);
});

/**
 * 超シンプルテスト - 何も処理しない
 */
app.get('/test-simple', (c) => {
  return c.json({ test: 'simple', status: 'ok' }, 200);
});

/**
 * エラーレスポンステスト - 意図的に400を返す
 */
app.get('/test-error', (c) => {
  return c.json({ error: 'This is a test error', test: true }, 400);
});

/**
 * テストエンドポイント - 住所解析テスト（完全版）
 */
app.get('/test-parse', (c) => {
  try {
    const address = c.req.query('address') || '埼玉県さいたま市北区';
    
    // parseAddress関数を呼び出し
    const locationCodes = parseAddress(address);
    
    if (!locationCodes) {
      return c.json({
        success: false,
        address: address,
        error: '市区町村が認識できません',
        supportedCities: {
          '埼玉県': ['さいたま市北区', 'さいたま市', '幸手市', '川越市', '草加市'],
          '東京都': ['千代田区', '新宿区', '世田谷区', '板橋区']
        }
      }, 200);
    }
    
    return c.json({
      success: true,
      address: address,
      result: locationCodes,
      timestamp: Date.now()
    }, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'Exception occurred',
      message: error.message || 'Unknown error',
      timestamp: Date.now()
    }, 200);
  }
});

/**
 * 住所から緯度経度を取得（OpenStreetMap Nominatim API使用）
 * GET /api/reinfolib/geocode
 */
app.get('/geocode', async (c) => {
  try {
    const address = c.req.query('address');
    
    if (!address) {
      return c.json({ error: '住所が指定されていません' }, 400);
    }
    
    console.log('[GEOCODE] Address:', address);
    
    // OpenStreetMap Nominatim API（無料・認証不要）
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Real-Estate-200units-v2/1.0' // Nominatim要件
      }
    });
    
    if (!response.ok) {
      console.error('[GEOCODE] API Error:', response.status);
      return c.json({
        success: false,
        error: 'ジオコーディングAPIエラー',
        status: response.status
      }, 200);
    }
    
    const data = await response.json();
    console.log('[GEOCODE] API Response:', JSON.stringify(data).substring(0, 200));
    
    if (!data || data.length === 0) {
      return c.json({
        success: false,
        error: '住所が見つかりませんでした',
        address: address
      }, 200);
    }
    
    const result = data[0];
    
    return c.json({
      success: true,
      address: address,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      display_name: result.display_name,
      timestamp: new Date().toISOString()
    }, 200);
    
  } catch (error: any) {
    console.error('[GEOCODE] Exception:', error.message);
    return c.json({
      success: false,
      error: 'ジオコーディング処理エラー',
      details: error.message
    }, 500);
  }
});

/**
 * デバッグ用: 認証なしREINFOLIB APIテスト
 */
app.get('/test-property-info', async (c) => {
  const address = c.req.query('address') || '東京都千代田区';
  const year = c.req.query('year') || '2024';
  const quarter = c.req.query('quarter') || '3';
  
  try {
    const apiKey = c.env.MLIT_API_KEY;
    console.log('[DEBUG] MLIT_API_KEY exists:', !!apiKey);
    
    const locationCodes = parseAddress(address);
    console.log('[DEBUG] Parsed address:', locationCodes);
    
    if (!locationCodes) {
      return c.json({
        success: false,
        error: 'Address parsing failed',
        address: address
      }, 200);
    }
    
    // MLIT API正しいパラメータ形式: year=2024&quarter=3&area=13&city=13101
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?year=${year}&quarter=${quarter}&area=${locationCodes.prefectureCode}&city=${locationCodes.cityCode}&priceClassification=01&language=ja`;
    console.log('[DEBUG] Calling MLIT API:', url);
    console.log('[DEBUG] Parameters:', { year, quarter, area: locationCodes.prefectureCode, city: locationCodes.cityCode });
    
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });
    
    console.log('[DEBUG] MLIT API Status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      return c.json({
        success: false,
        error: 'MLIT API Error',
        status: response.status,
        body: text.substring(0, 500)
      }, 200);
    }
    
    const data = await response.json();
    return c.json({
      success: true,
      message: 'MLIT API call successful',
      dataCount: data?.data?.length || 0,
      sampleData: data?.data?.slice(0, 3) || []
    }, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 200);
  }
});

/**
 * 不動産情報ライブラリAPI - 住所から物件情報を取得
 * GET /api/reinfolib/property-info
 * 
 * クエリパラメータ:
 * - address: 住所（例: "東京都板橋区蓮根三丁目17-7"）
 * - year: 取得年（例: "2024"）デフォルトは現在年
 * - quarter: 四半期（1-4）デフォルトは最新
 */
app.get('/property-info', async (c) => {
  console.log('[REINFOLIB API] ========== /property-info CALLED ==========');
  console.log('[REINFOLIB API] Path:', c.req.path);
  console.log('[REINFOLIB API] Query params:', c.req.query());
  
  try {
    const address = c.req.query('address');
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const quarter = c.req.query('quarter') || '4';
    
    console.log('[REINFOLIB API] Parsed params:', { address, year, quarter });

    if (!address) {
      return c.json({ error: '住所が指定されていません' }, 400);
    }

    // MLIT API Key確認
    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      console.error('❌ MLIT_API_KEY is not configured');
      return c.json({ 
        error: 'MLIT_API_KEYが設定されていません',
        message: 'Cloudflare Pagesの環境変数でMLIT_API_KEYを設定してください。設定方法: wrangler secret put MLIT_API_KEY',
        configRequired: true
      }, 401);
    }

    // 住所から都道府県コード・市区町村コードを抽出
    const locationCodes = parseAddress(address);
    if (!locationCodes) {
      console.error('❌ Failed to parse address:', address);
      
      return c.json({
        success: false,
        error: '住所の解析に失敗しました',
        message: '市区町村が認識できません。対応している市区町村を入力してください。',
        address: address,
        supportedCities: {
          '埼玉県': [
            'さいたま市西区', 'さいたま市北区', 'さいたま市大宮区', 'さいたま市見沼区',
            'さいたま市中央区', 'さいたま市桜区', 'さいたま市浦和区', 'さいたま市南区',
            'さいたま市緑区', 'さいたま市岩槻区', '川越市', '熊谷市', '川口市', '行田市',
            '秩父市', '所沢市', '飯能市', '加須市', '本庄市', '東松山市', '春日部市',
            '狭山市', '羽生市', '鴻巣市', '深谷市', '上尾市', '草加市', '越谷市', '蕨市',
            '戸田市', '入間市', '朝霞市', '志木市', '和光市', '新座市', '桶川市', '久喜市',
            '北本市', '八潮市', '富士見市', '三郷市', '蓮田市', '坂戸市', '幸手市',
            '鶴ヶ島市', '日高市', 'ふじみ野市', '白岡市'
          ],
          '東京都': [
            '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区',
            '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区',
            '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'
          ]
        },
        example: '例: "東京都板橋区"、"埼玉県さいたま市北区"、"埼玉県幸手市"'
      }, 400);
    }

    const { prefectureCode, cityCode, prefectureName, cityName } = locationCodes;
    
    console.log('✅ Address parsed:', {
      address,
      prefectureName,
      cityName,
      prefectureCode,
      cityCode
    });

    // 不動産情報ライブラリAPIエンドポイント
    const baseUrl = 'https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001';
    const url = `${baseUrl}?year=${year}&quarter=${quarter}&area=${prefectureCode}&city=${cityCode}&priceClassification=01&language=ja`;

    console.log('🔍 Fetching REINFOLIB API:', url);

    // 不動産情報ライブラリAPIへリクエスト
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ REINFOLIB API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorBody: errorText
      });
      
      if (response.status === 401) {
        return c.json({
          success: false,
          error: 'API認証エラー',
          message: 'MLIT_API_KEYが無効です。正しいAPIキーを設定してください。'
        }, 401);
      }
      
      if (response.status === 400) {
        return c.json({
          success: false,
          error: 'リクエストエラー',
          message: 'リクエストパラメータに問題があります。住所、年、四半期を確認してください。',
          details: {
            address,
            year,
            quarter,
            prefectureCode,
            cityCode,
            prefectureName,
            cityName
          }
        }, 400);
      }
      
      if (response.status === 404) {
        return c.json({
          success: false,
          error: 'データが見つかりません',
          message: `指定された条件に一致するデータがMLIT APIに存在しません。\n\n住所: ${prefectureName}${cityName}\n年: ${year}\n四半期: ${quarter}\n\n別の年や四半期で再試行してください。`,
          suggestion: '最新の四半期（第4四半期）または前年のデータを試してください。',
          details: {
            address,
            year,
            quarter,
            prefectureName,
            cityName
          }
        }, 404);
      }
      
      return c.json({
        success: false,
        error: 'データ取得に失敗しました',
        status: response.status,
        message: response.statusText,
        details: errorText
      }, response.status);
    }

    const data = await response.json();
    console.log('✅ REINFOLIB API Response received');

    // データが空の場合
    if (!data.data || data.data.length === 0) {
      return c.json({
        success: true,
        message: '指定された条件に一致するデータが見つかりませんでした',
        data: [],
        metadata: {
          address,
          prefectureName,
          cityName,
          year,
          quarter,
          count: 0
        }
      });
    }

    // データを整形して返す
    const properties = data.data.map((item: any) => ({
      // 基本情報
      transaction_period: item.Period || item.取引時点,
      location: item.Location || item.所在地,
      
      // 土地情報
      land_area: item.Area || item.面積,
      land_shape: item.LandShape || item.土地の形状,
      frontage: item.Frontage || item.間口,
      
      // 建物情報
      building_area: item.TotalFloorArea || item.延床面積,
      building_structure: item.Structure || item.建物の構造,
      building_year: item.BuildingYear || item.建築年,
      
      // 用途・都市計画
      use: item.Use || item.用途,
      city_planning: item.CityPlanning || item.都市計画,
      
      // 建蔽率・容積率（用途地域API XKT002から取得される項目）
      building_coverage_ratio: item.CoverageRatio || item.建蔽率 || item.u_building_coverage_ratio_ja,
      floor_area_ratio: item.FloorAreaRatio || item.容積率 || item.u_floor_area_ratio_ja,
      
      // 道路情報
      front_road_direction: item.Direction || item.前面道路方位,
      front_road_type: item.Classification || item.前面道路種類,
      front_road_width: item.Breadth || item.前面道路幅員,
      
      // 取引価格
      trade_price: item.TradePrice || item.取引価格,
      unit_price: item.UnitPrice || item.単価,
      price_per_tsubo: item.PricePerUnit || item.坪単価,
      
      // その他
      remarks: item.Remarks || item.取引の事情等,
      future_use: item.Purpose || item.今後の利用目的,
      
      // 座標情報
      latitude: item.Latitude || item.緯度,
      longitude: item.Longitude || item.経度
    }));

    return c.json({
      success: true,
      message: `${properties.length}件のデータを取得しました`,
      data: properties,
      metadata: {
        address,
        prefectureName,
        cityName,
        prefectureCode,
        cityCode,
        year,
        quarter,
        count: properties.length
      }
    });

  } catch (error: any) {
    logError('REINFOLIB property-info', error, { address });
    
    // タイムアウトエラー
    if (error.message && error.message.includes('タイムアウト')) {
      return c.json(
        createErrorResponse(
          'タイムアウトエラー',
          'APIからの応答に時間がかかっています。しばらく待ってから再試行してください。'
        ),
        504
      );
    }
    
    // ネットワークエラー
    if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
      return c.json(
        createErrorResponse(
          'ネットワークエラー',
          'API接続に失敗しました。ネットワーク接続を確認してください。'
        ),
        503
      );
    }
    
    return handleAPIError(c, error, 'REINFOLIB API');
  }
});

/**
 * ハザード情報取得API
 * GET /api/reinfolib/hazard-info
 * 
 * クエリパラメータ:
 * - address: 住所
 * - latitude: 緯度（オプション）
 * - longitude: 経度（オプション）
 * 
 * ハザード情報:
 * - 洪水浸水想定区域
 * - 土砂災害警戒区域
 * - 津波浸水想定区域
 * - 液状化リスク
 */
app.get('/hazard-info', async (c) => {
  try {
    const address = c.req.query('address');
    const lat = c.req.query('latitude');
    const lon = c.req.query('longitude');

    if (!address && (!lat || !lon)) {
      return c.json({ 
        success: false,
        error: '住所または座標が必要です' 
      }, 400);
    }

    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        success: false,
        error: 'MLIT API Keyが設定されていません'
      }, 500);
    }

    // 座標が指定されていない場合は住所から座標を取得
    let latitude = lat;
    let longitude = lon;
    
    if (!latitude || !longitude) {
      console.log('[HAZARD] Geocoding address:', address);
      
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
      
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Real-Estate-200units-v2/1.0'
        }
      });
      
      if (!geocodeResponse.ok) {
        return c.json({ 
          success: false,
          error: 'ジオコーディングに失敗しました',
          status: geocodeResponse.status
        }, 200);
      }
      
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData || geocodeData.length === 0) {
        return c.json({
          success: false,
          error: '住所が見つかりませんでした',
          address: address
        }, 200);
      }
      
      latitude = geocodeData[0].lat;
      longitude = geocodeData[0].lon;
    }

    // 住所から都道府県・市区町村を抽出
    const locationCodes = address ? parseAddress(address) : null;
    
    // 洪水浸水想定区域チェック
    const floodData = await getFloodDepth(latitude, longitude, apiKey);
    
    // 土砂災害警戒区域チェック
    const landslideData = await getLandslideZone(latitude, longitude, apiKey);
    
    // ハザード情報の統合
    const hazardInfo = {
      address: address || `緯度${latitude}, 経度${longitude}`,
      prefecture: locationCodes?.prefectureName || '不明',
      city: locationCodes?.cityName || '不明',
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      hazards: [
        {
          type: 'flood_risk',
          name: '洪水浸水想定区域',
          risk_level: floodData.depth !== null ? (floodData.depth >= 10 ? '高' : floodData.depth > 0 ? '中' : '低') : '不明',
          depth: floodData.depth,
          description: floodData.description,
          financing_restriction: floodData.depth !== null && floodData.depth >= 10,
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          type: 'landslide_risk',
          name: '土砂災害警戒区域',
          risk_level: landslideData.isRedZone ? '高（レッドゾーン）' : '低',
          description: landslideData.description,
          financing_restriction: landslideData.isRedZone,
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          type: 'tsunami_risk',
          name: '津波浸水想定区域',
          risk_level: '調査中',
          description: 'API実装予定（XKT033）',
          financing_restriction: false,
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          type: 'storm_surge_risk',
          name: '高潮浸水想定区域',
          risk_level: '調査中',
          description: 'API実装予定（XKT032）',
          financing_restriction: false,
          url: 'https://disaportal.gsi.go.jp/'
        }
      ],
      note: '詳細な情報は国土交通省ハザードマップポータルサイトをご確認ください',
      external_links: [
        {
          name: '国土交通省ハザードマップポータルサイト',
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          name: '重ねるハザードマップ',
          url: `https://disaportal.gsi.go.jp/maps/?ll=${latitude},${longitude}&z=15&base=pale&vs=c1j0l0u0`
        }
      ],
      timestamp: new Date().toISOString()
    };

    return c.json({
      success: true,
      data: hazardInfo
    });

  } catch (error: any) {
    console.error('❌ Error fetching hazard info:', error);
    return c.json({ 
      success: false,
      error: 'ハザード情報の取得に失敗しました',
      message: error.message 
    }, 500);
  }
});

/**
 * 洪水浸水想定区域API (REINFOLIB #34)
 * 内部ヘルパー関数 - GeoJSON APIから洪水深度を取得
 */
async function getFloodDepth(lat: string, lon: string, apiKey: string): Promise<{ depth: number | null, description: string }> {
  try {
    const zoom = 11;  // MLIT API supports zoom level 11, not 18
    const latRad = parseFloat(lat) * Math.PI / 180;
    const tileX = Math.floor((parseFloat(lon) + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

    // API #34: 洪水浸水想定区域（XKT034は2024年11月公開、現在Resource not found）
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT034?response_format=geojson&z=${zoom}&x=${tileX}&y=${tileY}`;
    
    console.log('[FLOOD] API URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[FLOOD] API Error:', response.status);
      if (response.status === 404) {
        return { depth: null, description: '洪水浸水想定データは現在準備中です（国土交通省APIデータ整備待ち）' };
      }
      return { depth: null, description: `データ取得エラー（HTTPステータス: ${response.status}）` };
    }

    const geoJsonData = await response.json();
    
    // GeoJSONから浸水深度情報を抽出
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      for (const feature of geoJsonData.features) {
        if (feature.properties) {
          // 深度情報を取得 (単位: m)
          const depth = feature.properties.浸水深 || feature.properties.depth || feature.properties.A31_004;
          if (depth !== undefined && depth !== null) {
            return {
              depth: parseFloat(depth),
              description: `浸水深: ${depth}m`
            };
          }
        }
      }
    }

    return { depth: 0, description: '洪水浸水想定区域外' };

  } catch (error: any) {
    console.error('[FLOOD] Exception:', error);
    return { depth: null, description: 'エラー: ' + error.message };
  }
}

/**
 * 土砂災害警戒区域API (REINFOLIB #31)
 * 内部ヘルパー関数 - GeoJSON APIから土砂災害区域を取得
 */
async function getLandslideZone(lat: string, lon: string, apiKey: string): Promise<{ isRedZone: boolean, description: string }> {
  try {
    const zoom = 11;  // MLIT API supports zoom level 11, not 18
    const latRad = parseFloat(lat) * Math.PI / 180;
    const tileX = Math.floor((parseFloat(lon) + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

    // API #31: 土砂災害警戒区域（XKT031、動作確認済み）
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT031?response_format=geojson&z=${zoom}&x=${tileX}&y=${tileY}`;
    
    console.log('[LANDSLIDE] API URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[LANDSLIDE] API Error:', response.status);
      if (response.status === 404) {
        return { isRedZone: false, description: '土砂災害警戒区域データは現在準備中です（国土交通省APIデータ整備待ち）' };
      }
      return { isRedZone: false, description: `データ取得エラー（HTTPステータス: ${response.status}）` };
    }

    const geoJsonData = await response.json();
    
    // GeoJSONから区域種別を取得
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      for (const feature of geoJsonData.features) {
        if (feature.properties) {
          // レッドゾーン判定
          const zoneType = feature.properties.区域区分 || feature.properties.A33_004 || '';
          const isRedZone = zoneType.includes('特別警戒') || zoneType.includes('レッド') || zoneType === '2';
          
          return {
            isRedZone: isRedZone,
            description: isRedZone ? '土砂災害特別警戒区域（レッドゾーン）' : '土砂災害警戒区域（イエローゾーン）'
          };
        }
      }
    }

    return { isRedZone: false, description: '土砂災害警戒区域外' };

  } catch (error: any) {
    console.error('[LANDSLIDE] Exception:', error);
    return { isRedZone: false, description: 'エラー: ' + error.message };
  }
}

/**
 * 津波浸水想定区域API (REINFOLIB #33)
 * 内部ヘルパー関数 - GeoJSON APIから津波浸水想定区域を取得
 */
async function getTsunamiZone(lat: string, lon: string, apiKey: string): Promise<{ inTsunamiZone: boolean, depth: number | null, description: string }> {
  try {
    const zoom = 11;  // MLIT API supports zoom level 11
    const latRad = parseFloat(lat) * Math.PI / 180;
    const tileX = Math.floor((parseFloat(lon) + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

    // API #33: 津波浸水想定区域（XKT033）
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT033?response_format=geojson&z=${zoom}&x=${tileX}&y=${tileY}`;
    
    console.log('[TSUNAMI] API URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[TSUNAMI] API Error:', response.status);
      if (response.status === 404) {
        return { inTsunamiZone: false, depth: null, description: '津波浸水想定データは現在準備中です（国土交通省APIデータ整備待ち）' };
      }
      return { inTsunamiZone: false, depth: null, description: `データ取得エラー（HTTPステータス: ${response.status}）` };
    }

    const geoJsonData = await response.json();
    
    // GeoJSONから津波浸水深度情報を抽出
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      for (const feature of geoJsonData.features) {
        if (feature.properties) {
          // 深度情報を取得 (単位: m)
          const depth = feature.properties.浸水深 || feature.properties.depth || feature.properties.A24_005;
          const ranking = feature.properties.ランク || feature.properties.rank || feature.properties.A24_006;
          
          if (depth !== undefined && depth !== null) {
            return {
              inTsunamiZone: true,
              depth: parseFloat(depth),
              description: `津波浸水想定区域: 浸水深 ${depth}m${ranking ? ` (ランク: ${ranking})` : ''}`
            };
          }
          
          // 深度情報がなくても区域内であれば該当とする
          return {
            inTsunamiZone: true,
            depth: null,
            description: '津波浸水想定区域内'
          };
        }
      }
    }

    return { inTsunamiZone: false, depth: null, description: '津波浸水想定区域外' };

  } catch (error: any) {
    console.error('[TSUNAMI] Exception:', error);
    return { inTsunamiZone: false, depth: null, description: 'エラー: ' + error.message };
  }
}

/**
 * 高潮浸水想定区域API (REINFOLIB #32)
 * 内部ヘルパー関数 - GeoJSON APIから高潮浸水想定区域を取得
 */
async function getStormSurgeZone(lat: string, lon: string, apiKey: string): Promise<{ inStormSurgeZone: boolean, depth: number | null, description: string }> {
  try {
    const zoom = 11;  // MLIT API supports zoom level 11
    const latRad = parseFloat(lat) * Math.PI / 180;
    const tileX = Math.floor((parseFloat(lon) + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

    // API #32: 高潮浸水想定区域（XKT032）
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT032?response_format=geojson&z=${zoom}&x=${tileX}&y=${tileY}`;
    
    console.log('[STORM_SURGE] API URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[STORM_SURGE] API Error:', response.status);
      if (response.status === 404) {
        return { inStormSurgeZone: false, depth: null, description: '高潮浸水想定データは現在準備中です（国土交通省APIデータ整備待ち）' };
      }
      return { inStormSurgeZone: false, depth: null, description: `データ取得エラー（HTTPステータス: ${response.status}）` };
    }

    const geoJsonData = await response.json();
    
    // GeoJSONから高潮浸水深度情報を抽出
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      for (const feature of geoJsonData.features) {
        if (feature.properties) {
          // 深度情報を取得 (単位: m)
          const depth = feature.properties.浸水深 || feature.properties.depth || feature.properties.A31_004;
          const ranking = feature.properties.ランク || feature.properties.rank;
          
          if (depth !== undefined && depth !== null) {
            return {
              inStormSurgeZone: true,
              depth: parseFloat(depth),
              description: `高潮浸水想定区域: 浸水深 ${depth}m${ranking ? ` (ランク: ${ranking})` : ''}`
            };
          }
          
          // 深度情報がなくても区域内であれば該当とする
          return {
            inStormSurgeZone: true,
            depth: null,
            description: '高潮浸水想定区域内'
          };
        }
      }
    }

    return { inStormSurgeZone: false, depth: null, description: '高潮浸水想定区域外' };

  } catch (error: any) {
    console.error('[STORM_SURGE] Exception:', error);
    return { inStormSurgeZone: false, depth: null, description: 'エラー: ' + error.message };
  }
}

/**
 * 融資制限条件チェックAPI
 * GET /api/reinfolib/check-financing-restrictions
 * 
 * クエリパラメータ:
 * - address: 住所
 * - latitude: 緯度（オプション）
 * - longitude: 経度（オプション）
 * 
 * 融資制限条件:
 * 1. 水害による想定浸水深度が10m以上
 * 2. 家屋倒壊等氾濫想定区域
 * 3. 土砂災害特別警戒区域(レッドゾーン)
 * 
 * これらの条件に該当する場合、提携金融機関での融資が困難
 */
app.get('/check-financing-restrictions', async (c) => {
  try {
    const address = c.req.query('address');
    const lat = c.req.query('latitude');
    const lon = c.req.query('longitude');

    if (!address && (!lat || !lon)) {
      return c.json({ 
        success: false,
        error: '住所または座標が必要です' 
      }, 400);
    }

    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        success: false,
        error: 'MLIT API Keyが設定されていません'
      }, 500);
    }

    // 座標が指定されていない場合は住所から座標を取得
    let latitude = lat;
    let longitude = lon;
    
    if (!latitude || !longitude) {
      console.log('[FINANCING_CHECK] Geocoding address:', address);
      
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
      
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Real-Estate-200units-v2/1.0'
        }
      });
      
      if (!geocodeResponse.ok) {
        return c.json({ 
          success: false,
          error: 'ジオコーディングに失敗しました',
          status: geocodeResponse.status
        }, 200);
      }
      
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData || geocodeData.length === 0) {
        return c.json({
          success: false,
          error: '住所が見つかりませんでした',
          address: address
        }, 200);
      }
      
      latitude = geocodeData[0].lat;
      longitude = geocodeData[0].lon;
    }

    // 住所から都道府県・市区町村を抽出
    const locationCodes = address ? parseAddress(address) : null;
    
    // 洪水深度チェック
    const floodData = await getFloodDepth(latitude, longitude, apiKey);
    const hasFloodRestriction = floodData.depth !== null && floodData.depth >= 10;
    
    // 土砂災害レッドゾーンチェック
    const landslideData = await getLandslideZone(latitude, longitude, apiKey);
    const hasLandslideRestriction = landslideData.isRedZone;
    
    // 融資制限条件のチェック結果
    const restrictions = [
      {
        type: 'flood_depth',
        name: '水害による想定浸水深度',
        threshold: '10m以上',
        status: floodData.depth !== null ? 'checked' : 'check_failed',
        result: hasFloodRestriction ? 'NG' : 'OK',
        depth: floodData.depth,
        description: floodData.description,
        warning: hasFloodRestriction ? '⚠️ 融資制限対象: 浸水深10m以上' : null,
        check_url: 'https://disaportal.gsi.go.jp/',
        severity: hasFloodRestriction ? 'critical' : 'low'
      },
      {
        type: 'house_collapse_zone',
        name: '家屋倒壊等氾濫想定区域',
        threshold: '該当区域内',
        status: 'manual_check_required',
        result: null,
        warning: '市区町村作成のハザードマップで確認が必要です',
        check_url: 'https://disaportal.gsi.go.jp/',
        severity: 'high'
      },
      {
        type: 'landslide_red_zone',
        name: '土砂災害特別警戒区域（レッドゾーン）',
        threshold: '該当区域内',
        status: 'checked',
        result: hasLandslideRestriction ? 'NG' : 'OK',
        description: landslideData.description,
        warning: hasLandslideRestriction ? '⚠️ 融資制限対象: レッドゾーン該当' : null,
        check_url: 'https://disaportal.gsi.go.jp/',
        severity: hasLandslideRestriction ? 'critical' : 'low'
      }
    ];

    // 総合判定
    const hasRestrictions = hasFloodRestriction || hasLandslideRestriction;
    const requiresManualCheck = floodData.depth === null; // 家屋倒壊区域は手動確認が必要

    return c.json({
      success: true,
      financing_available: hasRestrictions ? false : (requiresManualCheck ? null : true),
      requires_manual_check: requiresManualCheck,
      restrictions: restrictions,
      summary: {
        address: address || `緯度${latitude}, 経度${longitude}`,
        prefecture: locationCodes?.prefectureName || '不明',
        city: locationCodes?.cityName || '不明',
        warning_message: hasRestrictions ? '❌ 融資制限条件に該当します' : (requiresManualCheck ? '⚠️ 手動確認が必要です' : '✅ 融資制限条件に該当しません'),
        action_required: hasRestrictions ? '該当物件は提携金融機関での融資が困難です。' : (requiresManualCheck ? '家屋倒壊等氾濫想定区域について市区町村のハザードマップで確認してください。' : null),
        check_urls: [
          {
            name: '国土交通省ハザードマップポータルサイト',
            url: 'https://disaportal.gsi.go.jp/'
          },
          {
            name: '重ねるハザードマップ（該当地点）',
            url: `https://disaportal.gsi.go.jp/maps/?ll=${latitude},${longitude}&z=15&base=pale&vs=c1j0l0u0`
          }
        ]
      },
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error checking financing restrictions:', error);
    return c.json({ 
      success: false,
      error: '融資制限条件のチェックに失敗しました',
      message: error.message 
    }, 500);
  }
});

/**
 * 不動産情報ライブラリAPI - 用途地域情報を取得（GIS API）
 * GET /api/reinfolib/zoning-info
 * 
 * クエリパラメータ:
 * - address: 住所
 * - latitude: 緯度（オプション）
 * - longitude: 経度（オプション）
 */
app.get('/zoning-info', async (c) => {
  try {
    const address = c.req.query('address');
    const lat = c.req.query('latitude');
    const lon = c.req.query('longitude');

    if (!address && (!lat || !lon)) {
      return c.json({ 
        success: false,
        error: '住所または座標が必要です' 
      }, 400);
    }

    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        success: false,
        error: 'MLIT API Keyが設定されていません'
      }, 500);
    }

    // 座標が指定されていない場合は住所から座標を取得
    let latitude = lat;
    let longitude = lon;
    
    if (!latitude || !longitude) {
      console.log('[ZONING] Geocoding address:', address);
      
      // OpenStreetMap Nominatim APIで住所→座標変換
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
      
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Real-Estate-200units-v2/1.0'
        }
      });
      
      if (!geocodeResponse.ok) {
        return c.json({ 
          success: false,
          error: 'ジオコーディングに失敗しました',
          status: geocodeResponse.status
        }, 200);
      }
      
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData || geocodeData.length === 0) {
        return c.json({
          success: false,
          error: '住所が見つかりませんでした',
          address: address
        }, 200);
      }
      
      latitude = geocodeData[0].lat;
      longitude = geocodeData[0].lon;
      console.log('[ZONING] Geocoded:', latitude, longitude);
    }

    // タイル座標に変換（ズームレベル11を使用 - MLIT API制約）
    const zoom = 11;
    const latRad = parseFloat(latitude) * Math.PI / 180;
    const tileX = Math.floor((parseFloat(longitude) + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

    console.log('[ZONING] Tile coordinates:', { zoom, tileX, tileY });

    // 用途地域API（XKT002）
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XKT002?response_format=geojson&z=${zoom}&x=${tileX}&y=${tileY}`;
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return c.json({ 
        success: false,
        error: 'XKT002 APIデータ取得に失敗しました',
        status: response.status
      }, 200);
    }

    const geoJsonData = await response.json();

    // GeoJSONから用途地域情報を抽出
    let zoningInfo = null;
    if (geoJsonData.features && geoJsonData.features.length > 0) {
      // 座標に最も近いフィーチャーを検索
      const targetLat = parseFloat(latitude);
      const targetLon = parseFloat(longitude);
      
      for (const feature of geoJsonData.features) {
        if (feature.properties) {
          // プロパティから用途地域情報を取得
          // XKT002 APIの正しいキー名: use_area_ja, u_building_coverage_ratio_ja, u_floor_area_ratio_ja
          const props = feature.properties;
          zoningInfo = {
            用途地域: props.use_area_ja || props.用途地域 || '不明',
            建蔽率: props.u_building_coverage_ratio_ja || props.建蔽率 || null,
            容積率: props.u_floor_area_ratio_ja || props.容積率 || null,
            都道府県: props.prefecture || null,
            市区町村: props.city_name || null,
            決定日: props.decision_date || null
          };
          
          // 建蔽率・容積率がある場合のみ使用（空文字列を除外）
          if (!zoningInfo.建蔽率 || zoningInfo.建蔽率 === '') {
            continue; // 次のフィーチャーを探す
          }
          break; // 有効なデータが見つかったら終了
        }
      }
    }

    return c.json({
      success: true,
      address: address,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      zoning: zoningInfo,
      raw_data: geoJsonData,
      metadata: {
        zoom,
        tileX,
        tileY,
        features_count: geoJsonData.features?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching zoning info:', error);
    return c.json({ 
      success: false,
      error: error.message 
    }, 500);
  }
});

/**
 * 住所を解析して都道府県コード・市区町村コードを取得
 */
function parseAddress(address: string): { 
  prefectureCode: string; 
  cityCode: string; 
  prefectureName: string;
  cityName: string;
} | null {
  try {
    if (!address || typeof address !== 'string') {
      console.error('[parseAddress] Invalid address input:', address);
      return null;
    }
  // 都道府県コードマッピング
  const prefectures: Record<string, string> = {
    '北海道': '01', '青森県': '02', '岩手県': '03', '宮城県': '04', '秋田県': '05',
    '山形県': '06', '福島県': '07', '茨城県': '08', '栃木県': '09', '群馬県': '10',
    '埼玉県': '11', '千葉県': '12', '東京都': '13', '神奈川県': '14', '新潟県': '15',
    '富山県': '16', '石川県': '17', '福井県': '18', '山梨県': '19', '長野県': '20',
    '岐阜県': '21', '静岡県': '22', '愛知県': '23', '三重県': '24', '滋賀県': '25',
    '京都府': '26', '大阪府': '27', '兵庫県': '28', '奈良県': '29', '和歌山県': '30',
    '鳥取県': '31', '島根県': '32', '岡山県': '33', '広島県': '34', '山口県': '35',
    '徳島県': '36', '香川県': '37', '愛媛県': '38', '高知県': '39', '福岡県': '40',
    '佐賀県': '41', '長崎県': '42', '熊本県': '43', '大分県': '44', '宮崎県': '45',
    '鹿児島県': '46', '沖縄県': '47'
  };

  // 市区町村コードマッピング（主要都市のみ）
  const cities: Record<string, Record<string, string>> = {
    '11': { // 埼玉県
      'さいたま市': '11100', 
      'さいたま市西区': '11101', 'さいたま市北区': '11102', 'さいたま市大宮区': '11103',
      'さいたま市見沼区': '11104', 'さいたま市中央区': '11105', 'さいたま市桜区': '11106',
      'さいたま市浦和区': '11107', 'さいたま市南区': '11108', 'さいたま市緑区': '11109',
      'さいたま市岩槻区': '11110',
      '川越市': '11201', '熊谷市': '11202', '川口市': '11203', '行田市': '11204', 
      '秩父市': '11205', '所沢市': '11208', '飯能市': '11209', '加須市': '11210',
      '本庄市': '11211', '東松山市': '11212', '春日部市': '11214', '狭山市': '11215',
      '羽生市': '11216', '鴻巣市': '11217', '深谷市': '11218', '上尾市': '11219',
      '草加市': '11221', '越谷市': '11222', '蕨市': '11223', '戸田市': '11224',
      '入間市': '11225', '朝霞市': '11227', '志木市': '11228', '和光市': '11229',
      '新座市': '11230', '桶川市': '11231', '久喜市': '11232', '北本市': '11233',
      '八潮市': '11234', '富士見市': '11237', '三郷市': '11238', '蓮田市': '11239',
      '坂戸市': '11240', '幸手市': '11241', '鶴ヶ島市': '11242', '日高市': '11243',
      'ふじみ野市': '11246', '白岡市': '11464'
    },
    '12': { // 千葉県
      '千葉市': '12100',
      '千葉市中央区': '12101', '千葉市花見川区': '12102', '千葉市稲毛区': '12103',
      '千葉市若葉区': '12104', '千葉市緑区': '12105', '千葉市美浜区': '12106',
      '銚子市': '12202', '市川市': '12203', '船橋市': '12204', '館山市': '12205',
      '木更津市': '12206', '松戸市': '12207', '野田市': '12208', '茂原市': '12210',
      '成田市': '12211', '佐倉市': '12212', '東金市': '12213', '旭市': '12215',
      '習志野市': '12216', '柏市': '12217', '勝浦市': '12218', '市原市': '12219',
      '流山市': '12220', '八千代市': '12221', '我孫子市': '12222', '鴨川市': '12223',
      '鎌ケ谷市': '12224', '君津市': '12225', '富津市': '12226', '浦安市': '12227',
      '四街道市': '12228', '袖ケ浦市': '12229', '八街市': '12230', '印西市': '12231',
      '白井市': '12232', '富里市': '12234', '南房総市': '12235', '匝瑳市': '12236',
      '香取市': '12237', '山武市': '12238', 'いすみ市': '12239', '大網白里市': '12240'
    },
    '13': { // 東京都
      '千代田区': '13101', '中央区': '13102', '港区': '13103', '新宿区': '13104',
      '文京区': '13105', '台東区': '13106', '墨田区': '13107', '江東区': '13108',
      '品川区': '13109', '目黒区': '13110', '大田区': '13111', '世田谷区': '13112',
      '渋谷区': '13113', '中野区': '13114', '杉並区': '13115', '豊島区': '13116',
      '北区': '13117', '荒川区': '13118', '板橋区': '13119', '練馬区': '13120',
      '足立区': '13121', '葛飾区': '13122', '江戸川区': '13123',
      '八王子市': '13201', '立川市': '13202', '武蔵野市': '13203', '三鷹市': '13204',
      '青梅市': '13205', '府中市': '13206', '昭島市': '13207', '調布市': '13208',
      '町田市': '13209', '小金井市': '13210', '小平市': '13211', '日野市': '13212',
      '東村山市': '13213', '国分寺市': '13214', '国立市': '13215', '福生市': '13218',
      '狛江市': '13219', '東大和市': '13220', '清瀬市': '13221', '東久留米市': '13222',
      '武蔵村山市': '13223', '多摩市': '13224', '稲城市': '13225', '羽村市': '13227',
      'あきる野市': '13228', '西東京市': '13229'
    },
    '14': { // 神奈川県
      '横浜市': '14100',
      '横浜市鶴見区': '14101', '横浜市神奈川区': '14102', '横浜市西区': '14103',
      '横浜市中区': '14104', '横浜市南区': '14105', '横浜市保土ケ谷区': '14106',
      '横浜市磯子区': '14107', '横浜市金沢区': '14108', '横浜市港北区': '14109',
      '横浜市戸塚区': '14110', '横浜市港南区': '14111', '横浜市旭区': '14112',
      '横浜市緑区': '14113', '横浜市瀬谷区': '14114', '横浜市栄区': '14115',
      '横浜市泉区': '14116', '横浜市青葉区': '14117', '横浜市都筑区': '14118',
      '川崎市': '14130',
      '川崎市川崎区': '14131', '川崎市幸区': '14132', '川崎市中原区': '14133',
      '川崎市高津区': '14134', '川崎市多摩区': '14135', '川崎市宮前区': '14136',
      '川崎市麻生区': '14137',
      '相模原市': '14150',
      '相模原市緑区': '14151', '相模原市中央区': '14152', '相模原市南区': '14153',
      '横須賀市': '14201', '平塚市': '14203', '鎌倉市': '14204', '藤沢市': '14205',
      '小田原市': '14206', '茅ヶ崎市': '14207', '逗子市': '14208', '三浦市': '14210',
      '秦野市': '14211', '厚木市': '14212', '大和市': '14213', '伊勢原市': '14214',
      '海老名市': '14215', '座間市': '14216', '南足柄市': '14217', '綾瀬市': '14218'
    }
  };

  // 都道府県を検出
  let prefectureCode = '';
  let prefectureName = '';
  
  for (const [name, code] of Object.entries(prefectures)) {
    if (address.includes(name)) {
      prefectureCode = code;
      prefectureName = name;
      break;
    }
  }

  if (!prefectureCode) {
    return null;
  }

  // 市区町村を検出（長いマッチを優先）
  let cityCode = '';
  let cityName = '';

  if (cities[prefectureCode]) {
    // 市区町村名を長い順にソートして、最も長いマッチを見つける
    const sortedCities = Object.entries(cities[prefectureCode]).sort((a, b) => b[0].length - a[0].length);
    
    for (const [name, code] of sortedCities) {
      if (address.includes(name)) {
        cityCode = code;
        cityName = name;
        break;
      }
    }
  }

  // 市区町村名が見つからない場合はエラーとして null を返す
  // MLIT API は都道府県全体のコード（11000など）をサポートしていないため
  if (!cityCode) {
    console.warn(`[parseAddress] 市区町村が見つかりません: ${address}, 都道府県: ${prefectureName}`);
    return null;
  }

  return { prefectureCode, cityCode, prefectureName, cityName };
  
  } catch (error: any) {
    console.error('[parseAddress] Exception during address parsing:', error);
    console.error('[parseAddress] Address:', address);
    console.error('[parseAddress] Stack:', error.stack);
    return null;
  }
}

/**
 * 包括的不動産リスクチェックAPI（簡易版）
 * GET /api/reinfolib/comprehensive-check
 * 
 * クエリパラメータ:
 * - address: 住所（必須）
 * - year: 取得年（オプション、デフォルト: 現在年）
 * - quarter: 四半期（オプション、デフォルト: 現在四半期）
 * 
 * NOTE: 認証を一時的に無効化（デバッグ用）
 */
app.get('/comprehensive-check', async (c) => {
  const startTime = Date.now();
  
  try {
    const address = c.req.query('address');
    
    if (!address) {
      return c.json({ 
        success: false,
        error: '住所が指定されていません',
        version: 'v3.153.38 - Improved Geocoding with Fallback'
      }, 200);
    }

    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        success: false,
        error: 'MLIT API Keyが設定されていません',
        version: 'v3.153.38 - Improved Geocoding with Fallback'
      }, 500);
    }
    
    // CRITICAL FIX v3.153.92: 住所解析 - Improved error messages
    const locationCodes = parseAddress(address);
    if (!locationCodes) {
      return c.json({
        success: false,
        error: '住所を認識できませんでした',
        address: address,
        suggestion: '都道府県と市区町村を入力してください',
        examples: [
          '東京都渋谷区',
          '埼玉県さいたま市',
          '神奈川県横浜市',
          '千葉県千葉市'
        ],
        supported_prefectures: ['東京都', '埼玉県', '千葉県', '神奈川県'],
        version: 'v3.153.92 - Enhanced Error Messages'
      }, 400);
    }
    
    const { prefectureName, cityName } = locationCodes;
    
    // ジオコーディング (複数の方法を試す)
    console.log('[COMPREHENSIVE] Geocoding address:', address);
    
    let latitude, longitude;
    let geocodeData = [];
    
    // 方法1: Nominatim API (詳細住所)
    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
      
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Real-Estate-200units-v2/1.0'
        }
      });
      
      if (geocodeResponse.ok) {
        geocodeData = await geocodeResponse.json();
      }
    } catch (err) {
      console.warn('[COMPREHENSIVE] Nominatim error:', err);
    }
    
    // 方法2: 番地を除いた住所で再試行
    if (!geocodeData || geocodeData.length === 0) {
      console.log('[COMPREHENSIVE] Retrying without detailed address');
      const simplifiedAddress = address.replace(/\d+-?\d*-?\d*$/, '').trim(); // 番地を削除
      console.log('[COMPREHENSIVE] Simplified address:', simplifiedAddress);
      
      try {
        const geocodeUrl2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(simplifiedAddress)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
        
        const geocodeResponse2 = await fetch(geocodeUrl2, {
          headers: {
            'User-Agent': 'Real-Estate-200units-v2/1.0'
          }
        });
        
        if (geocodeResponse2.ok) {
          geocodeData = await geocodeResponse2.json();
        }
      } catch (err) {
        console.warn('[COMPREHENSIVE] Simplified geocoding error:', err);
      }
    }
    
    // 方法3: 市区町村レベルで再試行
    if (!geocodeData || geocodeData.length === 0) {
      console.log('[COMPREHENSIVE] Retrying with city-level address');
      const cityAddress = `${prefectureName}${cityName}`;
      console.log('[COMPREHENSIVE] City address:', cityAddress);
      
      try {
        const geocodeUrl3 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityAddress)}&format=json&limit=1&addressdetails=1&accept-language=ja`;
        
        const geocodeResponse3 = await fetch(geocodeUrl3, {
          headers: {
            'User-Agent': 'Real-Estate-200units-v2/1.0'
          }
        });
        
        if (geocodeResponse3.ok) {
          geocodeData = await geocodeResponse3.json();
        }
      } catch (err) {
        console.warn('[COMPREHENSIVE] City-level geocoding error:', err);
      }
    }
    
    if (!geocodeData || geocodeData.length === 0) {
      return c.json({
        success: false,
        error: '住所が見つかりませんでした。都道府県、市区町村までの住所を入力してください。',
        address: address,
        version: 'v3.153.38 - Improved Geocoding with Fallback'
      }, 200);
    }
    
    latitude = geocodeData[0].lat;
    longitude = geocodeData[0].lon;
    
    console.log('[COMPREHENSIVE] Geocoding success - Lat:', latitude, 'Lon:', longitude);
    
    // ① 洪水浸水想定区域チェック
    const floodData = await getFloodDepth(latitude, longitude, apiKey);
    
    // ② 土砂災害警戒区域チェック
    const landslideData = await getLandslideZone(latitude, longitude, apiKey);
    
    // ③ 津波浸水想定区域チェック（NEW: v3.154.3）
    const tsunamiData = await getTsunamiZone(latitude, longitude, apiKey);
    
    // ④ 高潮浸水想定区域チェック（NEW: v3.154.3）
    const stormSurgeData = await getStormSurgeZone(latitude, longitude, apiKey);
    
    // ⑤ リスク判定
    const hasFloodRestriction = floodData.depth !== null && floodData.depth >= 10;
    const hasLandslideRestriction = landslideData.isRedZone;
    const hasFinancingRestriction = hasFloodRestriction || hasLandslideRestriction;
    
    const riskAssessment = {
      sedimentDisaster: {
        status: 'checked',
        isRedZone: landslideData.isRedZone,
        description: landslideData.description,
        financingRestriction: landslideData.isRedZone
      },
      floodRisk: {
        status: floodData.depth !== null ? 'checked' : 'check_failed',
        depth: floodData.depth,
        description: floodData.description,
        financingRestriction: hasFloodRestriction
      },
      tsunamiRisk: {
        status: 'checked',
        inTsunamiZone: tsunamiData.inTsunamiZone,
        depth: tsunamiData.depth,
        description: tsunamiData.description,
        warning: tsunamiData.inTsunamiZone ? '⚠️ 津波浸水想定区域内です' : null
      },
      stormSurgeRisk: {
        status: 'checked',
        inStormSurgeZone: stormSurgeData.inStormSurgeZone,
        depth: stormSurgeData.depth,
        description: stormSurgeData.description,
        warning: stormSurgeData.inStormSurgeZone ? '⚠️ 高潮浸水想定区域内です' : null
      },
      houseCollapseZone: {
        status: 'manual_check_required',
        message: '家屋倒壊等氾濫想定区域は市区町村のハザードマップで確認が必要です'
      }
    };
    
    // ④ 総合判定
    const financingJudgment = {
      judgment: hasFinancingRestriction ? 'NG' : (floodData.depth === null ? 'MANUAL_CHECK_REQUIRED' : 'OK'),
      message: hasFinancingRestriction 
        ? '⚠️ 融資制限条件に該当します。提携金融機関での融資が困難です。'
        : (floodData.depth === null ? '一部項目について手動確認が必要です。' : '✅ 融資制限条件に該当しません。'),
      details: {
        flood_restriction: hasFloodRestriction ? '浸水深10m以上のため融資制限対象' : null,
        landslide_restriction: hasLandslideRestriction ? 'レッドゾーン該当のため融資制限対象' : null
      },
      timestamp: new Date().toISOString()
    };
    
    // フロントエンド互換性のため、簡易形式でレスポンスを返す
    const result = {
      success: true,
      version: 'v3.153.38 - Improved Geocoding with Fallback',
      address: address,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      location: {
        prefecture: prefectureName,
        city: cityName
      },
      timestamp: new Date().toISOString(),
      risks: {
        // 簡易形式（文字列）でレスポンスを返す
        floodRisk: floodData.description || 'N/A',
        sedimentDisaster: landslideData.description || 'N/A',
        tsunamiRisk: tsunamiData.description || 'N/A',
        stormSurgeRisk: stormSurgeData.description || 'N/A',
        houseCollapseZone: 'manual_check_required'
      },
      // 詳細情報は別フィールドで提供
      riskDetails: riskAssessment,
      financingJudgment: financingJudgment.judgment,
      financingMessage: financingJudgment.message,
      processingTime: `${Date.now() - startTime}ms`,
      hazardMapUrl: `https://disaportal.gsi.go.jp/maps/?ll=${latitude},${longitude}&z=15&base=pale&vs=c1j0l0u0`
    };
    
    return c.json(result, 200);
    
  } catch (error: any) {
    console.error('[COMPREHENSIVE CHECK] ❌ Exception:', error.message);
    return c.json({
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error.message,
      version: 'v3.154.3 - Full Hazard Integration'
    }, 500);
  }
});

/**
 * 不動産価格基本情報取得ヘルパー
 */
async function fetchPropertyBasicInfo(
  apiKey: string,
  prefectureCode: string,
  cityCode: string,
  year: string,
  quarter: string
): Promise<any> {
  try {
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?year=${year}&quarter=${quarter}&area=${prefectureCode}&city=${cityCode}&priceClassification=01&language=ja`;
    
    console.log('[fetchPropertyBasicInfo] URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('[fetchPropertyBasicInfo] API Error:', response.status);
      return {
        error: `MLIT API Error: ${response.status}`,
        CoverageRatio: null,
        FloorAreaRatio: null
      };
    }
    
    const data = await response.json();
    
    if (!data || !data.data || data.data.length === 0) {
      return {
        message: '該当データなし',
        CoverageRatio: null,
        FloorAreaRatio: null
      };
    }
    
    // 最初のデータから容積率・建蔽率を取得
    const firstRecord = data.data[0];
    
    return {
      CoverageRatio: firstRecord.CoverageRatio || null,
      FloorAreaRatio: firstRecord.FloorAreaRatio || null,
      Use: firstRecord.Use || null,
      LandShape: firstRecord.LandShape || null,
      Frontage: firstRecord.Frontage || null,
      Breadth: firstRecord.Breadth || null,
      CityPlanning: firstRecord.CityPlanning || null,
      dataCount: data.data.length
    };
    
  } catch (error: any) {
    console.error('[fetchPropertyBasicInfo] Exception:', error.message);
    return {
      error: error.message,
      CoverageRatio: null,
      FloorAreaRatio: null
    };
  }
}

export default app;
