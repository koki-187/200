import type { D1Database } from '@cloudflare/workers-types';

/**
 * 買取条件のインターフェース
 */
export interface PurchaseCriteria {
  id: number;
  criteria_type: 'TARGET_AREA' | 'EXCLUDED_AREA' | 'CONDITION';
  prefecture?: string;
  city?: string;
  criteria_key: string;
  criteria_value?: string;
  operator?: string;
  unit?: string;
  is_required: boolean;
  is_active: boolean;
  priority: number;
  description?: string;
}

/**
 * 案件データのインターフェース
 */
export interface DealData {
  id: string;
  location: string;
  station?: string;
  walk_minutes?: string | number;
  land_area?: string | number;
  frontage?: string | number;
  building_coverage?: string | number;
  floor_area_ratio?: string | number;
  zoning?: string;
}

/**
 * チェック結果のインターフェース
 */
export interface CheckResult {
  overall_result: 'PASS' | 'FAIL' | 'SPECIAL_REVIEW';
  check_score: number;
  passed_conditions: string[];
  failed_conditions: string[];
  special_flags: string[];
  recommendations: string[];
  details: {
    area_check: {
      result: 'PASS' | 'FAIL';
      message: string;
    };
    condition_checks: {
      key: string;
      result: 'PASS' | 'FAIL' | 'UNKNOWN';
      message: string;
      actual_value?: string;
      required_value?: string;
    }[];
    excluded_area_check: {
      result: 'PASS' | 'FAIL';
      message: string;
    };
  };
}

/**
 * 都道府県を抽出する関数
 */
function extractPrefecture(location: string): string | null {
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
    '岐阜県', '静岡県', '愛知県', '三重県',
    '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
    '沖縄県'
  ];
  
  for (const pref of prefectures) {
    if (location.includes(pref)) {
      return pref;
    }
  }
  
  return null;
}

/**
 * 千葉県西部かどうかを判定する関数
 */
function isChibaWestArea(location: string): boolean {
  const westCities = [
    '千葉市', '市川市', '船橋市', '松戸市', '野田市', '習志野市',
    '柏市', '流山市', '八千代市', '我孫子市', '鎌ケ谷市', '浦安市'
  ];
  
  return westCities.some(city => location.includes(city));
}

/**
 * 数値を抽出してパースする関数
 */
function parseNumericValue(value: string | number | undefined): number | null {
  if (!value && value !== 0) return null;
  
  // 数値型の場合はそのまま返す
  if (typeof value === 'number') return value;
  
  // 文字列型の場合は処理を続行
  const numStr = value.replace(/,/g, '').match(/[\d.]+/);
  if (!numStr) return null;
  
  return parseFloat(numStr[0]);
}

/**
 * m2を坪に変換
 */
function m2ToTsubo(m2: number): number {
  return m2 / 3.30579;
}

/**
 * 買取条件チェック実行
 */
export async function checkPurchaseCriteria(
  db: D1Database,
  dealData: DealData
): Promise<CheckResult> {
  const criteriaResult = await db
    .prepare('SELECT * FROM purchase_criteria WHERE is_active = 1 ORDER BY priority, id')
    .all<PurchaseCriteria>();
  
  const allCriteria = criteriaResult.results || [];
  
  const result: CheckResult = {
    overall_result: 'PASS',
    check_score: 100,
    passed_conditions: [],
    failed_conditions: [],
    special_flags: [],
    recommendations: [],
    details: {
      area_check: { result: 'FAIL', message: '' },
      condition_checks: [],
      excluded_area_check: { result: 'PASS', message: '' }
    }
  };
  
  let totalChecks = 0;
  let passedChecks = 0;
  
  // 1. 対象エリアチェック
  const prefecture = extractPrefecture(dealData.location);
  const targetAreaCriteria = allCriteria.filter(c => c.criteria_type === 'TARGET_AREA');
  
  if (!prefecture) {
    result.details.area_check = {
      result: 'FAIL',
      message: '都道府県が特定できません'
    };
    result.failed_conditions.push('都道府県不明');
    result.overall_result = 'FAIL';
    result.check_score = 0;
    return result;
  }
  
  const isTargetArea = targetAreaCriteria.some(c => {
    if (c.prefecture === prefecture) {
      if (prefecture === '千葉県') {
        return isChibaWestArea(dealData.location);
      }
      return true;
    }
    return false;
  });
  
  if (!isTargetArea) {
    result.details.area_check = {
      result: 'FAIL',
      message: `${prefecture}は対象エリア外です（対象：埼玉県、東京都、千葉県西部、神奈川県、愛知県）`
    };
    result.failed_conditions.push(`エリア外: ${prefecture}`);
    result.overall_result = 'SPECIAL_REVIEW';
    result.special_flags.push('ニッチエリア候補');
    result.recommendations.push('特殊案件として個別検討を推奨');
    totalChecks++;  // エリア外もチェック数に含める
  } else {
    result.details.area_check = {
      result: 'PASS',
      message: `${prefecture}は対象エリアです`
    };
    result.passed_conditions.push(`対象エリア: ${prefecture}`);
    totalChecks++;
    passedChecks++;
  }
  
  // 2. 検討外エリアチェック
  const excludedAreaCriteria = allCriteria.filter(c => c.criteria_type === 'EXCLUDED_AREA');
  
  for (const criteria of excludedAreaCriteria) {
    const fieldValue = dealData.zoning || '';
    
    if (criteria.operator === 'CONTAINS' && fieldValue.includes(criteria.criteria_value || '')) {
      result.details.excluded_area_check = {
        result: 'FAIL',
        message: `${criteria.description}: ${fieldValue}`
      };
      result.failed_conditions.push(criteria.description || '');
      result.overall_result = 'FAIL';
      result.check_score = Math.min(result.check_score, 20);
      result.recommendations.push(`${criteria.criteria_value}は原則検討外です`);
    }
  }
  
  if (result.details.excluded_area_check.result === 'PASS') {
    result.details.excluded_area_check.message = '検討外エリアに該当しません';
    result.passed_conditions.push('検討外エリア非該当');
    totalChecks++;
    passedChecks++;
  } else {
    totalChecks++;
  }
  
  // 3. 買取条件チェック
  const conditionCriteria = allCriteria.filter(c => c.criteria_type === 'CONDITION');
  
  for (const criteria of conditionCriteria) {
    totalChecks++;
    
    let actualValue: number | null = null;
    let requiredValue: number | null = parseNumericValue(criteria.criteria_value);
    let checkResult: 'PASS' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';
    let message = '';
    
    switch (criteria.criteria_key) {
      case 'walk_minutes':
        actualValue = parseNumericValue(dealData.walk_minutes);
        break;
      case 'land_area_tsubo':
        const m2Value = parseNumericValue(dealData.land_area);
        if (m2Value !== null) {
          actualValue = m2ToTsubo(m2Value);
        }
        break;
      case 'frontage':
        actualValue = parseNumericValue(dealData.frontage);
        break;
      case 'building_coverage':
        actualValue = parseNumericValue(dealData.building_coverage);
        break;
      case 'floor_area_ratio':
        actualValue = parseNumericValue(dealData.floor_area_ratio);
        break;
    }
    
    if (actualValue === null) {
      checkResult = 'UNKNOWN';
      message = `${criteria.description}: データ不足`;
      result.recommendations.push(`${criteria.description}の情報を追加してください`);
    } else if (requiredValue === null) {
      checkResult = 'UNKNOWN';
      message = `${criteria.description}: 判定条件エラー`;
    } else {
      let passed = false;
      switch (criteria.operator) {
        case '>=':
          passed = actualValue >= requiredValue;
          break;
        case '<=':
          passed = actualValue <= requiredValue;
          break;
        case '=':
          passed = actualValue === requiredValue;
          break;
        case '>':
          passed = actualValue > requiredValue;
          break;
        case '<':
          passed = actualValue < requiredValue;
          break;
      }
      
      checkResult = passed ? 'PASS' : 'FAIL';
      message = passed 
        ? `${criteria.description}: 合格 (${actualValue.toFixed(1)}${criteria.unit || ''})`
        : `${criteria.description}: 不合格 (実際: ${actualValue.toFixed(1)}${criteria.unit || ''}, 必要: ${criteria.operator}${requiredValue}${criteria.unit || ''})`;
      
      if (passed) {
        result.passed_conditions.push(message);
        passedChecks++;
      } else {
        result.failed_conditions.push(message);
        if (criteria.is_required) {
          result.overall_result = 'SPECIAL_REVIEW';
          result.special_flags.push(`条件不足: ${criteria.description}`);
        }
      }
    }
    
    result.details.condition_checks.push({
      key: criteria.criteria_key,
      result: checkResult,
      message,
      actual_value: actualValue?.toFixed(2) || 'N/A',
      required_value: `${criteria.operator || ''}${requiredValue?.toFixed(2) || 'N/A'}${criteria.unit || ''}`
    });
  }
  
  // スコア計算
  if (totalChecks > 0) {
    result.check_score = Math.round((passedChecks / totalChecks) * 100);
  }
  
  // 最終判定
  // 検討外エリア(FAIL)の場合は最優先
  if (result.overall_result === 'FAIL') {
    // FAILのまま（検討外エリアなど）
  }
  // 特殊フラグ（エリア外、条件不足など）がある場合はSPECIAL_REVIEW
  else if (result.special_flags.length > 0) {
    result.overall_result = 'SPECIAL_REVIEW';
    if (!result.special_flags.includes('特殊案件として個別検討推奨')) {
      result.special_flags.push('特殊案件として個別検討推奨');
    }
  }
  // スコアが80以上でFAILでもspecial_flagsもない場合はPASS
  else if (result.check_score >= 80) {
    result.overall_result = 'PASS';
  }
  // スコアが50-79の場合はSPECIAL_REVIEW
  else if (result.check_score >= 50) {
    result.overall_result = 'SPECIAL_REVIEW';
    result.special_flags.push('特殊案件として個別検討推奨');
  }
  // スコアが50未満の場合はFAIL
  else {
    result.overall_result = 'FAIL';
  }
  
  return result;
}

/**
 * チェック結果をデータベースに保存
 */
export async function savePurchaseCheckResult(
  db: D1Database,
  dealId: string,
  checkResult: CheckResult
): Promise<void> {
  // deal_purchase_checkテーブルに保存
  await db
    .prepare(`
      INSERT INTO deal_purchase_check 
      (deal_id, overall_result, check_score, passed_conditions, failed_conditions, special_flags, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      dealId,
      checkResult.overall_result,
      checkResult.check_score,
      JSON.stringify(checkResult.passed_conditions),
      JSON.stringify(checkResult.failed_conditions),
      JSON.stringify(checkResult.special_flags),
      JSON.stringify(checkResult.recommendations)
    )
    .run();
  
  // dealsテーブルを更新
  const isSpecialCase = checkResult.overall_result === 'SPECIAL_REVIEW' ? 1 : 0;
  await db
    .prepare(`
      UPDATE deals 
      SET purchase_check_result = ?, 
          purchase_check_score = ?,
          is_special_case = ?
      WHERE id = ?
    `)
    .bind(
      checkResult.overall_result,
      checkResult.check_score,
      isSpecialCase,
      dealId
    )
    .run();
}
