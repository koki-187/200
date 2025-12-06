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
    
    const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?from=${year}${quarter}&to=${year}${quarter}&area=${locationCodes.prefCode}`;
    console.log('[DEBUG] Calling MLIT API:', url);
    
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
          message: '指定された条件に一致するデータがMLIT APIに存在しません。',
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
      return c.json({ error: '住所または座標が必要です' }, 400);
    }

    // 住所から都道府県・市区町村を抽出
    const locationCodes = address ? parseAddress(address) : null;
    
    // ハザード情報の簡易判定（実際のAPIが利用可能になるまでの代替実装）
    // 現時点では、住所ベースの一般的なハザード情報を返す
    const hazardInfo = {
      address: address || `緯度${lat}, 経度${lon}`,
      prefecture: locationCodes?.prefectureName || '不明',
      city: locationCodes?.cityName || '不明',
      hazards: [
        {
          type: 'flood_risk',
          name: '洪水浸水想定区域',
          risk_level: '調査中',
          description: 'ハザードマップポータルサイトで詳細をご確認ください',
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          type: 'landslide_risk',
          name: '土砂災害警戒区域',
          risk_level: '調査中',
          description: 'ハザードマップポータルサイトで詳細をご確認ください',
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          type: 'tsunami_risk',
          name: '津波浸水想定区域',
          risk_level: '調査中',
          description: 'ハザードマップポータルサイトで詳細をご確認ください',
          url: 'https://disaportal.gsi.go.jp/'
        },
        {
          type: 'liquefaction_risk',
          name: '液状化リスク',
          risk_level: '調査中',
          description: 'ハザードマップポータルサイトで詳細をご確認ください',
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
          url: `https://disaportal.gsi.go.jp/maps/?ll=${lat || '35.6812'},${lon || '139.7671'}&z=15&base=pale&vs=c1j0l0u0`
        }
      ],
      timestamp: new Date().toISOString()
    };

    return c.json({
      success: true,
      data: hazardInfo,
      metadata: {
        address,
        latitude: lat,
        longitude: lon,
        locationCodes
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching hazard info:', error);
    return c.json({ 
      error: 'ハザード情報の取得に失敗しました',
      message: error.message 
    }, 500);
  }
});

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
      return c.json({ error: '住所または座標が必要です' }, 400);
    }

    // 住所から都道府県・市区町村を抽出
    const locationCodes = address ? parseAddress(address) : null;
    
    // 融資制限条件のチェック結果
    // 実際のハザードマップAPIが利用可能になるまでは、ユーザーに手動確認を促す
    const restrictions = [
      {
        type: 'flood_depth',
        name: '水害による想定浸水深度',
        threshold: '10m以上',
        status: 'manual_check_required',
        result: null,
        warning: '市区町村作成のハザードマップで確認が必要です',
        check_url: 'https://disaportal.gsi.go.jp/',
        severity: 'high'
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
        status: 'manual_check_required',
        result: null,
        warning: '市区町村作成のハザードマップで確認が必要です',
        check_url: 'https://disaportal.gsi.go.jp/',
        severity: 'high'
      }
    ];

    // 総合判定
    const hasRestrictions = false; // 自動判定は現時点では不可
    const requiresManualCheck = true;

    return c.json({
      success: true,
      financing_available: null, // 自動判定不可のためnull
      requires_manual_check: requiresManualCheck,
      restrictions: restrictions,
      summary: {
        address: address || `緯度${lat}, 経度${lon}`,
        prefecture: locationCodes?.prefectureName || '不明',
        city: locationCodes?.cityName || '不明',
        warning_message: '⚠️ 融資制限条件の確認が必要です',
        action_required: '市区町村作成の水害・土砂災害ハザードマップで以下の項目を確認してください：\n1. 水害による想定浸水深度が10m以上でないこと\n2. 家屋倒壊等氾濫想定区域に該当しないこと\n3. 土砂災害特別警戒区域(レッドゾーン)に該当しないこと',
        check_urls: [
          {
            name: '国土交通省ハザードマップポータルサイト',
            url: 'https://disaportal.gsi.go.jp/'
          },
          {
            name: '重ねるハザードマップ（該当地点）',
            url: `https://disaportal.gsi.go.jp/maps/?ll=${lat || '35.6812'},${lon || '139.7671'}&z=15&base=pale&vs=c1j0l0u0`
          }
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error checking financing restrictions:', error);
    return c.json({ 
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
      return c.json({ error: '住所または座標が必要です' }, 400);
    }

    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        error: 'MLIT API Keyが設定されていません'
      }, 500);
    }

    // 座標が指定されていない場合は住所から座標を取得
    let latitude = lat;
    let longitude = lon;
    
    if (!latitude || !longitude) {
      // TODO: ジオコーディングAPIを使用して住所→座標変換
      // 現時点では簡易実装としてエラーを返す
      return c.json({ 
        error: '座標情報が必要です',
        message: '住所から座標への変換は今後実装予定です'
      }, 400);
    }

    // タイル座標に変換（簡易実装: ズームレベル18を使用）
    const zoom = 18;
    const tileX = Math.floor((parseFloat(longitude) + 180) / 360 * Math.pow(2, zoom));
    const tileY = Math.floor((1 - Math.log(Math.tan(parseFloat(latitude) * Math.PI / 180) + 1 / Math.cos(parseFloat(latitude) * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

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
        error: 'データ取得に失敗しました',
        status: response.status
      }, response.status);
    }

    const data = await response.json();

    return c.json({
      success: true,
      data: data,
      metadata: {
        latitude,
        longitude,
        zoom,
        tileX,
        tileY
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching zoning info:', error);
    return c.json({ error: error.message }, 500);
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
app.get('/comprehensive-check', (c) => {
  const startTime = Date.now();
  
  try {
    const address = c.req.query('address');
    
    if (!address) {
      return c.json({ 
        success: false,
        error: '住所が指定されていません',
        version: 'v3.152.1-sync'
      }, 200);
    }
    
    // 住所解析
    const locationCodes = parseAddress(address);
    if (!locationCodes) {
      return c.json({
        success: false,
        error: '住所の解析に失敗しました',
        address: address,
        version: 'v3.152.1-sync'
      }, 200);
    }
    
    const { prefectureName, cityName } = locationCodes;
    
    // ① 不動産価格情報（簡易版）
    const propertyInfo = {
      prefecture: prefectureName,
      city: cityName,
      address: address,
      note: 'v3.152.1: 住所解析のみ。詳細情報はv3.153で実装予定'
    };
    
    // ② リスク判定（v3.153で実装予定）
    const riskAssessment = {
      sedimentDisaster: {
        status: 'pending',
        message: 'v3.153で実装予定'
      },
      floodRisk: {
        status: 'pending',
        message: 'v3.153で実装予定'
      },
      urbanPlan: {
        status: 'pending',
        message: 'v3.153で実装予定'
      }
    };
    
    // ③ 総合判定
    const financingJudgment = {
      judgment: 'PENDING',
      message: '住所解析完了。詳細リスク評価はv3.153で実装予定。',
      timestamp: new Date().toISOString()
    };
    
    const result = {
      success: true,
      version: 'v3.152.1-sync',
      address: address,
      timestamp: new Date().toISOString(),
      propertyInfo: propertyInfo,
      risks: riskAssessment,
      financingJudgment: financingJudgment,
      processingTime: `${Date.now() - startTime}ms`
    };
    
    return c.json(result, 200);
    
  } catch (error: any) {
    console.error('[COMPREHENSIVE CHECK] ❌ Exception:', error.message);
    return c.json({
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error.message
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
