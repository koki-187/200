/**
 * 建築基準法・条例の自動補足調査機能
 * 用途地域や規模に応じて該当する建築基準法や条例の規定を自動表示
 */

export interface BuildingRegulation {
  id: string;
  title: string;
  description: string;
  applicable_conditions: string[];
  reference: string;
  category: 'BUILDING_CODE' | 'LOCAL_ORDINANCE' | 'PARKING' | 'ENVIRONMENT' | 'OTHER';
}

/**
 * 建築基準法関連の規定
 */
export const BUILDING_CODE_REGULATIONS: BuildingRegulation[] = [
  {
    id: 'three_story_wooden',
    title: '3階建て木造建築の構造基準（建築基準法第21条）',
    description: '3階建ての木造建築物は、延べ面積が500㎡を超える場合、または特殊建築物の場合は、主要構造部を準耐火構造とする必要があります。また、階数が3以上で延べ面積が500㎡超の場合、耐火建築物または準耐火建築物とする必要があります。',
    applicable_conditions: ['3階建て', '木造', '延べ面積500㎡超'],
    reference: '建築基準法第21条、第27条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'three_story_wooden_fire_prevention',
    title: '3階建て木造の防火地域・準防火地域制限',
    description: '防火地域では3階建て以上の建築物は耐火建築物とする必要があります。準防火地域では、地階を除く階数が3以上または延べ面積が1,500㎡超の場合、耐火建築物または準耐火建築物とする必要があります。',
    applicable_conditions: ['3階建て', '防火地域', '準防火地域'],
    reference: '建築基準法第61条、第62条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'three_story_wooden_structure_calculation',
    title: '3階建て木造の構造計算（建築基準法第20条）',
    description: '木造3階建ての場合、構造計算（許容応力度計算または限界耐力計算）が必要です。特に、準耐火構造とする場合、梁・柱の断面寸法、接合部の仕様などに厳しい基準が適用されます。',
    applicable_conditions: ['3階建て', '木造'],
    reference: '建築基準法第20条、令第46条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'three_story_wooden_evacuation',
    title: '3階建て木造の避難規定（建築基準法第35条）',
    description: '3階建ての共同住宅の場合、各戸から避難階または地上に通ずる2以上の直通階段を設ける必要があります。また、3階以上の階に居室を有する場合、非常用の照明装置の設置が必要です。',
    applicable_conditions: ['3階建て', '共同住宅', 'アパート'],
    reference: '建築基準法第35条、令第121条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'three_story_wooden_floor_area_ratio',
    title: '3階建て木造の容積率・建蔽率確認',
    description: '3階建て建築の場合、容積率・建蔽率の計算に注意が必要です。特に、防火地域・準防火地域内の耐火建築物・準耐火建築物の場合、建蔽率が緩和される場合があります。',
    applicable_conditions: ['3階建て', '防火地域', '準防火地域'],
    reference: '建築基準法第53条、第52条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'parking_apartment',
    title: '集合住宅の駐車場設置義務',
    description: '一定規模以上の共同住宅については、駐車場の設置が義務付けられています。',
    applicable_conditions: ['集合住宅', 'マンション', 'アパート', '共同住宅'],
    reference: '駐車場法第20条、各自治体の条例',
    category: 'PARKING'
  },
  {
    id: 'road_access',
    title: '接道義務（建築基準法第43条）',
    description: '建築物の敷地は、原則として幅員4m以上の道路に2m以上接しなければなりません。',
    applicable_conditions: ['全物件'],
    reference: '建築基準法第43条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'fire_prevention_quasi',
    title: '準防火地域の制限',
    description: '準防火地域では、一定規模以上の建築物について防火構造または準耐火構造とする必要があります。',
    applicable_conditions: ['準防火地域'],
    reference: '建築基準法第61条、第62条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'fire_prevention_strict',
    title: '防火地域の制限',
    description: '防火地域では、階数3以上または延べ面積100㎡超の建築物は耐火建築物とする必要があります。',
    applicable_conditions: ['防火地域'],
    reference: '建築基準法第61条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'height_restriction',
    title: '高度地区による高さ制限',
    description: '高度地区に指定されている場合、建築物の高さが制限されます。',
    applicable_conditions: ['高度地区'],
    reference: '建築基準法第58条、都市計画法',
    category: 'BUILDING_CODE'
  },
  {
    id: 'north_side_line',
    title: '北側斜線制限',
    description: '第一種・第二種低層住居専用地域、第一種・第二種中高層住居専用地域では、北側の隣地の日照を確保するため、北側斜線制限が適用されます。',
    applicable_conditions: ['第一種低層住居専用地域', '第二種低層住居専用地域', '第一種中高層住居専用地域', '第二種中高層住居専用地域'],
    reference: '建築基準法第56条',
    category: 'BUILDING_CODE'
  },
  {
    id: 'absolute_height',
    title: '絶対高さ制限（10m/12m）',
    description: '第一種・第二種低層住居専用地域では、建築物の高さが10mまたは12mに制限されます。',
    applicable_conditions: ['第一種低層住居専用地域', '第二種低層住居専用地域'],
    reference: '建築基準法第55条',
    category: 'BUILDING_CODE'
  }
];

/**
 * 駐車場設置義務の詳細（都道府県・市区町村別）
 */
export const PARKING_REQUIREMENTS: Record<string, { units_per_parking: number; min_area_sqm: number; description: string }> = {
  '東京都': {
    units_per_parking: 3,
    min_area_sqm: 500,
    description: '延べ面積500㎡以上の集合住宅：住戸3戸につき1台以上'
  },
  '埼玉県': {
    units_per_parking: 2,
    min_area_sqm: 500,
    description: '延べ面積500㎡以上の集合住宅：住戸2戸につき1台以上（地域により異なる）'
  },
  '千葉県': {
    units_per_parking: 2,
    min_area_sqm: 500,
    description: '延べ面積500㎡以上の集合住宅：住戸2戸につき1台以上（市区町村により異なる）'
  },
  '神奈川県': {
    units_per_parking: 2,
    min_area_sqm: 500,
    description: '延べ面積500㎡以上の集合住宅：住戸2戸につき1台以上（横浜市・川崎市等で異なる）'
  },
  '愛知県': {
    units_per_parking: 2,
    min_area_sqm: 500,
    description: '延べ面積500㎡以上の集合住宅：住戸2戸につき1台以上（名古屋市等で異なる）'
  }
};

/**
 * 所在地から都道府県を抽出
 */
export function extractPrefecture(location: string): string | null {
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];
  
  for (const pref of prefectures) {
    if (location.includes(pref)) {
      return pref;
    }
  }
  
  return null;
}

/**
 * 物件情報に基づいて該当する建築基準法・条例を取得
 */
export function getApplicableRegulations(dealData: {
  location?: string;
  zoning?: string;
  fire_zone?: string;
  height_district?: string;
  land_area?: string;
  building_area?: string;
  current_status?: string;
  structure?: string; // 構造（木造、RC造等）
  floors?: number;    // 階数
}): BuildingRegulation[] {
  const applicable: BuildingRegulation[] = [];
  
  // 3階建て木造建築の検出
  const isThreeStoryWooden = (dealData.structure?.includes('木造') || dealData.structure?.includes('W造')) && 
                              (dealData.floors === 3 || dealData.floors && dealData.floors >= 3);
  
  // 3階建て木造の建築基準法チェック
  if (isThreeStoryWooden) {
    // 3階建て木造の構造基準
    const threeStoryWoodenReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'three_story_wooden');
    if (threeStoryWoodenReg) applicable.push(threeStoryWoodenReg);
    
    // 3階建て木造の構造計算
    const structureCalcReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'three_story_wooden_structure_calculation');
    if (structureCalcReg) applicable.push(structureCalcReg);
    
    // 3階建て木造の避難規定（共同住宅の場合）
    if (dealData.current_status && ['集合住宅', 'マンション', 'アパート', '共同住宅'].some(kw => dealData.current_status?.includes(kw))) {
      const evacuationReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'three_story_wooden_evacuation');
      if (evacuationReg) applicable.push(evacuationReg);
    }
    
    // 防火地域・準防火地域の制限
    if (dealData.fire_zone && (dealData.fire_zone.includes('防火地域') || dealData.fire_zone.includes('準防火地域'))) {
      const firePreventionReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'three_story_wooden_fire_prevention');
      if (firePreventionReg) applicable.push(firePreventionReg);
      
      // 容積率・建蔽率確認
      const floorAreaReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'three_story_wooden_floor_area_ratio');
      if (floorAreaReg) applicable.push(floorAreaReg);
    }
  }
  
  // 全物件に適用される規定
  const roadAccessReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'road_access');
  if (roadAccessReg) {
    applicable.push(roadAccessReg);
  }
  
  // 防火地域による規定
  if (dealData.fire_zone) {
    const fireZone = dealData.fire_zone;
    
    if (fireZone.includes('防火地域') && !fireZone.includes('準')) {
      const fireReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'fire_prevention_strict');
      if (fireReg) applicable.push(fireReg);
    }
    
    if (fireZone.includes('準防火地域')) {
      const quasiFireReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'fire_prevention_quasi');
      if (quasiFireReg) applicable.push(quasiFireReg);
    }
  }
  
  // 高度地区による規定
  if (dealData.height_district && dealData.height_district.trim() !== '' && dealData.height_district !== '指定なし') {
    const heightReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'height_restriction');
    if (heightReg) applicable.push(heightReg);
  }
  
  // 用途地域による規定
  if (dealData.zoning) {
    const zoning = dealData.zoning;
    
    // 低層住居専用地域の絶対高さ制限
    if (zoning.includes('第一種低層住居専用地域') || zoning.includes('第二種低層住居専用地域')) {
      const absoluteHeightReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'absolute_height');
      if (absoluteHeightReg) applicable.push(absoluteHeightReg);
    }
    
    // 北側斜線制限
    if (zoning.includes('低層住居専用地域') || zoning.includes('中高層住居専用地域')) {
      const northLineReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'north_side_line');
      if (northLineReg) applicable.push(northLineReg);
    }
  }
  
  // 集合住宅の駐車場設置義務
  if (dealData.current_status) {
    const status = dealData.current_status;
    const isApartment = ['集合住宅', 'マンション', 'アパート', '共同住宅'].some(keyword => status.includes(keyword));
    
    if (isApartment) {
      const parkingReg = BUILDING_CODE_REGULATIONS.find(r => r.id === 'parking_apartment');
      if (parkingReg) applicable.push(parkingReg);
    }
  }
  
  return applicable;
}

/**
 * 駐車場設置義務の詳細を取得
 */
export function getParkingRequirement(location: string): { prefecture: string; requirement: typeof PARKING_REQUIREMENTS[string] } | null {
  const prefecture = extractPrefecture(location);
  
  if (!prefecture || !PARKING_REQUIREMENTS[prefecture]) {
    return null;
  }
  
  return {
    prefecture,
    requirement: PARKING_REQUIREMENTS[prefecture]
  };
}

/**
 * 建築基準法・条例情報の統合取得
 */
export function getComprehensiveBuildingInfo(dealData: {
  location?: string;
  zoning?: string;
  fire_zone?: string;
  height_district?: string;
  land_area?: string;
  building_area?: string;
  current_status?: string;
  structure?: string; // 構造（木造、RC造等）
  floors?: number;    // 階数
}) {
  const regulations = getApplicableRegulations(dealData);
  const parkingInfo = dealData.location ? getParkingRequirement(dealData.location) : null;
  
  // 3階建て木造かどうか判定
  const isThreeStoryWooden = (dealData.structure?.includes('木造') || dealData.structure?.includes('W造')) && 
                              (dealData.floors === 3 || dealData.floors && dealData.floors >= 3);
  
  // APIレスポンス用にフォーマット変換
  const formattedRegulations = regulations.map(reg => ({
    category: reg.category,
    title: reg.title,
    article: reg.reference,
    description: reg.description
  }));
  
  return {
    applicable_regulations: formattedRegulations,
    has_parking_requirement: !!parkingInfo,
    parking_info: parkingInfo,
    total_applicable: formattedRegulations.length,
    is_three_story_wooden: isThreeStoryWooden,
    structure: dealData.structure,
    floors: dealData.floors
  };
}
