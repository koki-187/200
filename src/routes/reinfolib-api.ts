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
 * テストエンドポイント - 住所解析テスト
 */
app.get('/test-parse', async (c) => {
  try {
    const address = c.req.query('address') || '埼玉県さいたま市北区';
    console.log('[test-parse] Received address:', address);
    
    const result = parseAddress(address);
    console.log('[test-parse] Parse result:', result);
    
    if (!result) {
      console.log('[test-parse] Parse failed, returning 400');
      return c.json({
        success: false,
        error: '住所の解析に失敗しました',
        address: address,
        message: '市区町村が認識できません'
      }, 400);
    }
    
    console.log('[test-parse] Parse succeeded, returning 200');
    return c.json({
      success: true,
      address: address,
      result: result
    }, 200);
  } catch (error: any) {
    console.error('[test-parse] Exception:', error);
    return c.json({
      success: false,
      error: 'Exception in test-parse',
      message: error.message,
      stack: error.stack?.substring(0, 300)
    }, 500);
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
  try {
    const address = c.req.query('address');
    const year = c.req.query('year') || new Date().getFullYear().toString();
    const quarter = c.req.query('quarter') || '4';

    if (!address) {
      return c.json({ error: '住所が指定されていません' }, 400);
    }

    // MLIT API Key確認
    const apiKey = c.env.MLIT_API_KEY;
    if (!apiKey) {
      return c.json({ 
        error: 'MLIT API Keyが設定されていません',
        message: 'wrangler secret put MLIT_API_KEY でAPIキーを設定してください'
      }, 500);
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
    '13': { // 東京都
      '千代田区': '13101', '中央区': '13102', '港区': '13103', '新宿区': '13104',
      '文京区': '13105', '台東区': '13106', '墨田区': '13107', '江東区': '13108',
      '品川区': '13109', '目黒区': '13110', '大田区': '13111', '世田谷区': '13112',
      '渋谷区': '13113', '中野区': '13114', '杉並区': '13115', '豊島区': '13116',
      '北区': '13117', '荒川区': '13118', '板橋区': '13119', '練馬区': '13120',
      '足立区': '13121', '葛飾区': '13122', '江戸川区': '13123'
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
    console.warn(`市区町村が見つかりません: ${address}, 都道府県: ${prefectureName}`);
    return null;
  }

  return { prefectureCode, cityCode, prefectureName, cityName };
}

export default app;
