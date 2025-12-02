/**
 * Municipal Building Regulations Database
 * Coverage: Tokyo Metropolitan Area (1都3県) + Aichi + Nagano
 * Focus: 3-story wooden collective housing regulations
 */

export interface MunicipalRegulation {
  city: string;
  prefecture: string;
  category: 'PARKING' | 'THREE_STORY_WOODEN' | 'DISPUTE_PREVENTION' | 'LANDSCAPE' | 'FIRE_PREVENTION' | 'HEIGHT_DISTRICT' | 'OTHER';
  title: string;
  description: string;
  applicable_conditions: string;
  requirements: string;
  reference_url?: string;
  ordinance_name?: string;
  article?: string;
}

/**
 * Municipal-level regulations for Tokyo Metropolitan Area + Aichi + Nagano
 * Based on actual property survey documents and municipal websites
 */
export const MUNICIPAL_REGULATIONS: MunicipalRegulation[] = [
  // ===== 東京都 23区 =====
  
  // 千代田区
  {
    city: '千代田区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について、近隣説明会の開催が義務付けられる',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣住民への説明会開催、区への届出',
    reference_url: 'https://www.city.chiyoda.lg.jp/',
    ordinance_name: '千代田区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '千代田区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で1戸あたり1台以上',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '1戸あたり1台以上',
    ordinance_name: '千代田区駐車場条例'
  },
  
  // 渋谷区
  {
    city: '渋谷区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物に関する紛争予防条例',
    description: '高さ10m超または3階建て以上の建築物について、標識設置と説明会開催が義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置（建築計画開始の30日前）、近隣説明会開催、区への報告',
    reference_url: 'https://www.city.shibuya.tokyo.jp/',
    ordinance_name: '渋谷区中高層建築物に関する紛争予防条例'
  },
  {
    city: '渋谷区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場附置義務',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '渋谷区駐車場条例'
  },
  
  // 新宿区
  {
    city: '新宿区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.shinjuku.lg.jp/',
    ordinance_name: '新宿区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '新宿区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '新宿区駐車場条例'
  },
  
  // 世田谷区
  {
    city: '世田谷区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物等の建築に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣住民への個別説明、説明会開催、区への報告',
    reference_url: 'https://www.city.setagaya.lg.jp/',
    ordinance_name: '世田谷区中高層建築物等の建築に関する条例'
  },
  {
    city: '世田谷区',
    prefecture: '東京都',
    category: 'THREE_STORY_WOODEN',
    title: '3階建て木造共同住宅の技術基準',
    description: '3階建て木造共同住宅について、準耐火建築物または耐火建築物とすることが必要',
    applicable_conditions: '3階建て木造共同住宅',
    requirements: '準耐火建築物以上、構造計算書の提出',
    ordinance_name: '世田谷区建築基準法施行細則'
  },
  {
    city: '世田谷区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '世田谷区駐車場条例'
  },
  
  // 中央区
  {
    city: '中央区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.chuo.lg.jp/',
    ordinance_name: '中央区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '中央区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '1戸あたり1台以上',
    ordinance_name: '中央区駐車場条例'
  },
  
  // 港区
  {
    city: '港区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会開催、区への届出（建築計画開始の30日前）',
    reference_url: 'https://www.city.minato.tokyo.jp/',
    ordinance_name: '港区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '港区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '1戸あたり1台以上',
    ordinance_name: '港区駐車場条例'
  },
  
  // 文京区
  {
    city: '文京区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.bunkyo.lg.jp/',
    ordinance_name: '文京区中高層建築物の建築に係る紛争の予防に関する条例'
  },
  {
    city: '文京区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '文京区駐車場条例'
  },
  
  // 台東区
  {
    city: '台東区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.taito.lg.jp/',
    ordinance_name: '台東区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '台東区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '台東区駐車場条例'
  },
  
  // 墨田区
  {
    city: '墨田区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.sumida.lg.jp/',
    ordinance_name: '墨田区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '墨田区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '墨田区駐車場条例'
  },
  
  // 江東区
  {
    city: '江東区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.koto.lg.jp/',
    ordinance_name: '江東区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '江東区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '江東区駐車場条例'
  },
  
  // 品川区
  {
    city: '品川区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.shinagawa.tokyo.jp/',
    ordinance_name: '品川区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '品川区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '品川区駐車場条例'
  },
  
  // 目黒区
  {
    city: '目黒区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.meguro.tokyo.jp/',
    ordinance_name: '目黒区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '目黒区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '目黒区駐車場条例'
  },
  
  // 大田区
  {
    city: '大田区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.ota.tokyo.jp/',
    ordinance_name: '大田区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '大田区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '大田区駐車場条例'
  },
  
  // 中野区
  {
    city: '中野区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.tokyo-nakano.lg.jp/',
    ordinance_name: '中野区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '中野区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '中野区駐車場条例'
  },
  
  // 杉並区
  {
    city: '杉並区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.suginami.tokyo.jp/',
    ordinance_name: '杉並区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '杉並区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '杉並区駐車場条例'
  },
  
  // 豊島区
  {
    city: '豊島区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.toshima.lg.jp/',
    ordinance_name: '豊島区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '豊島区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '豊島区駐車場条例'
  },
  
  // 北区
  {
    city: '北区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.kita.tokyo.jp/',
    ordinance_name: '北区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '北区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '北区駐車場条例'
  },
  
  // 荒川区
  {
    city: '荒川区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.arakawa.tokyo.jp/',
    ordinance_name: '荒川区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '荒川区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '荒川区駐車場条例'
  },
  
  // 板橋区
  {
    city: '板橋区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.itabashi.tokyo.jp/',
    ordinance_name: '板橋区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '板橋区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '板橋区駐車場条例'
  },
  
  // 練馬区
  {
    city: '練馬区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.nerima.tokyo.jp/',
    ordinance_name: '練馬区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '練馬区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '練馬区駐車場条例'
  },
  
  // 足立区
  {
    city: '足立区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.adachi.tokyo.jp/',
    ordinance_name: '足立区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '足立区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '足立区駐車場条例'
  },
  
  // 葛飾区
  {
    city: '葛飾区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.katsushika.lg.jp/',
    ordinance_name: '葛飾区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '葛飾区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '葛飾区駐車場条例'
  },
  
  // 江戸川区
  {
    city: '江戸川区',
    prefecture: '東京都',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会、区への届出',
    reference_url: 'https://www.city.edogawa.tokyo.jp/',
    ordinance_name: '江戸川区中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '江戸川区',
    prefecture: '東京都',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '江戸川区駐車場条例'
  },
  
  // ===== 神奈川県 =====
  
  // 横浜市
  {
    city: '横浜市',
    prefecture: '神奈川県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物等の建築及び開発事業に係る住環境の保全等に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、説明会開催、市への届出',
    reference_url: 'https://www.city.yokohama.lg.jp/',
    ordinance_name: '横浜市中高層建築物等の建築及び開発事業に係る住環境の保全等に関する条例'
  },
  {
    city: '横浜市',
    prefecture: '神奈川県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '2戸に1台以上（市街化区域内）',
    ordinance_name: '横浜市駐車場条例'
  },
  
  // 川崎市（川崎区幸町の物件該当）
  {
    city: '川崎市',
    prefecture: '神奈川県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物等の建築に係る紛争の予防及び調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会開催、市への届出（工事着手30日前まで）',
    reference_url: 'https://www.city.kawasaki.jp/',
    ordinance_name: '川崎市中高層建築物等の建築に係る紛争の予防及び調整に関する条例'
  },
  {
    city: '川崎市',
    prefecture: '神奈川県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '2戸に1台以上',
    ordinance_name: '川崎市駐車場条例'
  },
  {
    city: '川崎市',
    prefecture: '神奈川県',
    category: 'THREE_STORY_WOODEN',
    title: '3階建て木造建築物の構造基準',
    description: '3階建て木造共同住宅は準耐火建築物以上とし、構造計算が必要',
    applicable_conditions: '3階建て木造共同住宅',
    requirements: '準耐火建築物以上、許容応力度計算または限界耐力計算、防火区画の設置',
    ordinance_name: '川崎市建築基準法施行細則'
  },
  
  // 相模原市
  {
    city: '相模原市',
    prefecture: '神奈川県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、説明会開催、市への届出',
    reference_url: 'https://www.city.sagamihara.kanagawa.jp/',
    ordinance_name: '相模原市中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  
  // ===== 埼玉県 =====
  
  // さいたま市
  {
    city: 'さいたま市',
    prefecture: '埼玉県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明、市への届出',
    reference_url: 'https://www.city.saitama.jp/',
    ordinance_name: 'さいたま市中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: 'さいたま市',
    prefecture: '埼玉県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '2戸に1台以上',
    ordinance_name: 'さいたま市駐車場条例'
  },
  
  // 幸手市（埼玉県幸手市北2丁目の物件該当）
  {
    city: '幸手市',
    prefecture: '埼玉県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する指導要綱',
    description: '高さ10m超または3階建て以上の建築物について近隣説明を推奨',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明（努力義務）',
    reference_url: 'https://www.city.satte.lg.jp/',
    ordinance_name: '幸手市中高層建築物の建築に係る紛争の予防と調整に関する指導要綱'
  },
  {
    city: '幸手市',
    prefecture: '埼玉県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積1000㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積1000㎡以上',
    requirements: '2戸に1台以上',
    ordinance_name: '埼玉県駐車場条例（県条例準拠）'
  },
  
  // 川口市
  {
    city: '川口市',
    prefecture: '埼玉県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明、市への届出',
    ordinance_name: '川口市中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  
  // ===== 千葉県 =====
  
  // 千葉市（千葉市美浜区高浜1-1-1の物件該当）
  {
    city: '千葉市',
    prefecture: '千葉県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣住民への説明会開催、市への届出（工事着手30日前）',
    reference_url: 'https://www.city.chiba.jp/',
    ordinance_name: '千葉市中高層建築物の建築に係る紛争の予防と調整に関する条例',
    article: '第5条、第6条'
  },
  {
    city: '千葉市',
    prefecture: '千葉県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '3戸に1台以上',
    ordinance_name: '千葉市駐車場条例'
  },
  {
    city: '千葉市美浜区',
    prefecture: '千葉県',
    category: 'LANDSCAPE',
    title: '景観計画区域における届出',
    description: '建築物の高さ10m超または延べ面積1000㎡超について景観法に基づく届出が必要',
    applicable_conditions: '高さ10m超または延べ面積1000㎡超',
    requirements: '景観計画区域内での建築行為について市への届出（工事着手30日前）',
    reference_url: 'https://www.city.chiba.jp/toshi/koenryokuchi/keikan/',
    ordinance_name: '千葉市景観条例'
  },
  {
    city: '千葉市',
    prefecture: '千葉県',
    category: 'THREE_STORY_WOODEN',
    title: '3階建て木造建築物の構造基準',
    description: '3階建て木造共同住宅は準耐火建築物以上とし、構造計算が必要',
    applicable_conditions: '3階建て木造共同住宅',
    requirements: '準耐火建築物以上、許容応力度計算、防火区画の設置',
    ordinance_name: '千葉市建築基準法施行細則'
  },
  
  // 船橋市
  {
    city: '船橋市',
    prefecture: '千葉県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、説明会開催、市への届出',
    ordinance_name: '船橋市中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  
  // 市川市
  {
    city: '市川市',
    prefecture: '千葉県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明、市への届出',
    ordinance_name: '市川市中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  
  // ===== 愛知県 =====
  
  // 名古屋市
  {
    city: '名古屋市',
    prefecture: '愛知県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明義務',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明会開催、市への届出',
    reference_url: 'https://www.city.nagoya.jp/',
    ordinance_name: '名古屋市中高層建築物の建築に係る紛争の予防と調整に関する条例'
  },
  {
    city: '名古屋市',
    prefecture: '愛知県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積500㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積500㎡以上',
    requirements: '2戸に1台以上',
    ordinance_name: '名古屋市駐車場条例'
  },
  {
    city: '名古屋市',
    prefecture: '愛知県',
    category: 'THREE_STORY_WOODEN',
    title: '3階建て木造建築物の構造基準',
    description: '3階建て木造共同住宅は準耐火建築物以上とし、構造計算が必要',
    applicable_conditions: '3階建て木造共同住宅',
    requirements: '準耐火建築物以上、許容応力度計算、防火区画の設置',
    ordinance_name: '名古屋市建築基準法施行細則'
  },
  
  // 豊田市
  {
    city: '豊田市',
    prefecture: '愛知県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に係る紛争の予防と調整に関する条例',
    description: '高さ10m超または3階建て以上の建築物について近隣説明を推奨',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明（努力義務）',
    ordinance_name: '豊田市建築指導要綱'
  },
  
  // ===== 長野県 =====
  
  // 長野市
  {
    city: '長野市',
    prefecture: '長野県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に関する指導要綱',
    description: '高さ10m超または3階建て以上の建築物について近隣説明を推奨',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明（努力義務）、市への通知',
    reference_url: 'https://www.city.nagano.nagano.jp/',
    ordinance_name: '長野市中高層建築物の建築に関する指導要綱'
  },
  {
    city: '長野市',
    prefecture: '長野県',
    category: 'PARKING',
    title: '駐車場設置基準',
    description: '共同住宅は延べ面積1000㎡以上で駐車場設置義務',
    applicable_conditions: '共同住宅、延べ面積1000㎡以上',
    requirements: '2戸に1台以上',
    ordinance_name: '長野県駐車場条例'
  },
  
  // 松本市
  {
    city: '松本市',
    prefecture: '長野県',
    category: 'DISPUTE_PREVENTION',
    title: '中高層建築物の建築に関する指導要綱',
    description: '高さ10m超または3階建て以上の建築物について近隣説明を推奨',
    applicable_conditions: '高さ10m超または3階建て以上',
    requirements: '標識設置、近隣説明（努力義務）',
    reference_url: 'https://www.city.matsumoto.nagano.jp/',
    ordinance_name: '松本市建築指導要綱'
  }
];

/**
 * Get applicable municipal regulations for a property
 * @param location - Full address (e.g., "東京都渋谷区神宮前1-1-1")
 * @param category - Optional category filter
 */
export function getMunicipalRegulations(
  location: string,
  category?: MunicipalRegulation['category']
): MunicipalRegulation[] {
  // Extract city name from location
  const cityPatterns = [
    // 千葉県
    { pattern: /千葉市美浜区/, city: '千葉市美浜区' },
    { pattern: /千葉市/, city: '千葉市' },
    { pattern: /船橋市/, city: '船橋市' },
    { pattern: /市川市/, city: '市川市' },
    
    // 神奈川県
    { pattern: /川崎市/, city: '川崎市' },
    { pattern: /横浜市/, city: '横浜市' },
    { pattern: /相模原市/, city: '相模原市' },
    
    // 埼玉県
    { pattern: /さいたま市/, city: 'さいたま市' },
    { pattern: /幸手市/, city: '幸手市' },
    { pattern: /川口市/, city: '川口市' },
    
    // 愛知県
    { pattern: /名古屋市/, city: '名古屋市' },
    { pattern: /豊田市/, city: '豊田市' },
    
    // 長野県
    { pattern: /長野市/, city: '長野市' },
    { pattern: /松本市/, city: '松本市' },
    
    // 東京都23区 (order matters - check specific wards first)
    { pattern: /千代田区/, city: '千代田区' },
    { pattern: /中央区/, city: '中央区' },
    { pattern: /港区/, city: '港区' },
    { pattern: /新宿区/, city: '新宿区' },
    { pattern: /文京区/, city: '文京区' },
    { pattern: /台東区/, city: '台東区' },
    { pattern: /墨田区/, city: '墨田区' },
    { pattern: /江東区/, city: '江東区' },
    { pattern: /品川区/, city: '品川区' },
    { pattern: /目黒区/, city: '目黒区' },
    { pattern: /大田区/, city: '大田区' },
    { pattern: /世田谷区/, city: '世田谷区' },
    { pattern: /渋谷区/, city: '渋谷区' },
    { pattern: /中野区/, city: '中野区' },
    { pattern: /杉並区/, city: '杉並区' },
    { pattern: /豊島区/, city: '豊島区' },
    { pattern: /北区/, city: '北区' },
    { pattern: /荒川区/, city: '荒川区' },
    { pattern: /板橋区/, city: '板橋区' },
    { pattern: /練馬区/, city: '練馬区' },
    { pattern: /足立区/, city: '足立区' },
    { pattern: /葛飾区/, city: '葛飾区' },
    { pattern: /江戸川区/, city: '江戸川区' }
  ];
  
  let cityName = '';
  for (const { pattern, city } of cityPatterns) {
    if (pattern.test(location)) {
      cityName = city;
      break;
    }
  }
  
  if (!cityName) {
    return [];
  }
  
  let regulations = MUNICIPAL_REGULATIONS.filter(reg => reg.city === cityName);
  
  if (category) {
    regulations = regulations.filter(reg => reg.category === category);
  }
  
  return regulations;
}

/**
 * Get regulations specific to 3-story wooden collective housing
 * @param location - Full address
 */
export function getThreeStoryWoodenRegulations(location: string): MunicipalRegulation[] {
  const all = getMunicipalRegulations(location);
  return all.filter(reg => 
    reg.category === 'THREE_STORY_WOODEN' || 
    reg.category === 'DISPUTE_PREVENTION' ||
    reg.category === 'PARKING'
  );
}
