import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware } from '../utils/auth';

const dealValidation = new Hono<{ Bindings: Bindings }>();

// 全てのルートに認証必須
dealValidation.use('*', authMiddleware);

/**
 * 必須フィールド定義
 */
const REQUIRED_FIELDS_FOR_REVIEW = [
  { field: 'title', label: '物件タイトル' },
  { field: 'location', label: '所在地' },
  { field: 'land_area', label: '土地面積' },
  { field: 'zoning', label: '用途地域' },
  { field: 'building_coverage', label: '建蔽率' },
  { field: 'floor_area_ratio', label: '容積率' },
  { field: 'road_info', label: '道路情報' },
  { field: 'frontage', label: '間口' },
  { field: 'desired_price', label: '希望価格' }
];

/**
 * 必須ファイル定義
 */
const REQUIRED_FILES = [
  { type: 'ocr', min_count: 1, description: '物件概要書（OCR資料）' },
  { type: 'document', min_count: 1, description: '登記簿謄本' }
];

/**
 * 不足項目チェックAPI
 * GET /api/deals/:deal_id/missing-items
 */
dealValidation.get('/:deal_id/missing-items', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    const { DB } = c.env;

    // 案件取得
    const deal = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({ error: '案件が見つかりません' }, 404);
    }

    // 権限チェック（管理者または案件所有者）
    if (userRole !== 'ADMIN' && deal.seller_id !== userId) {
      return c.json({ error: 'アクセス権限がありません' }, 403);
    }

    // 不足フィールドチェック
    const missingFields = [];
    for (const { field, label } of REQUIRED_FIELDS_FOR_REVIEW) {
      const value = deal[field];
      if (!value || value === '' || value === null) {
        missingFields.push({ field, label });
      }
    }

    // ファイル数チェック
    const files = await DB.prepare(`
      SELECT file_type, COUNT(*) as count
      FROM deal_files
      WHERE deal_id = ?
      GROUP BY file_type
    `).bind(dealId).all();

    const fileCountMap: Record<string, number> = {};
    files.results.forEach((row: any) => {
      fileCountMap[row.file_type] = row.count;
    });

    const missingFiles = [];
    for (const { type, min_count, description } of REQUIRED_FILES) {
      const currentCount = fileCountMap[type] || 0;
      if (currentCount < min_count) {
        missingFiles.push({
          type,
          description,
          required_count: min_count,
          current_count: currentCount,
          missing_count: min_count - currentCount
        });
      }
    }

    // 審査準備完了判定
    const isReadyForReview = missingFields.length === 0 && missingFiles.length === 0;

    return c.json({
      success: true,
      deal_id: dealId,
      missing_fields: missingFields,
      missing_files: missingFiles,
      is_ready_for_review: isReadyForReview,
      total_missing: missingFields.length + missingFiles.length
    });
  } catch (error) {
    console.error('Get missing items error:', error);
    return c.json({
      error: '不足項目の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 案件完全性スコア取得
 * GET /api/deals/:deal_id/completeness
 */
dealValidation.get('/:deal_id/completeness', async (c) => {
  try {
    const dealId = c.req.param('deal_id');
    const { DB } = c.env;

    // 案件取得
    const deal = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({ error: '案件が見つかりません' }, 404);
    }

    // フィールド充填率計算
    let filledFieldsCount = 0;
    for (const { field } of REQUIRED_FIELDS_FOR_REVIEW) {
      const value = deal[field];
      if (value && value !== '' && value !== null) {
        filledFieldsCount++;
      }
    }
    const fieldScore = (filledFieldsCount / REQUIRED_FIELDS_FOR_REVIEW.length) * 100;

    // ファイル充填率計算
    const files = await DB.prepare(`
      SELECT file_type, COUNT(*) as count
      FROM deal_files
      WHERE deal_id = ?
      GROUP BY file_type
    `).bind(dealId).all();

    const fileCountMap: Record<string, number> = {};
    files.results.forEach((row: any) => {
      fileCountMap[row.file_type] = row.count;
    });

    let satisfiedFileTypesCount = 0;
    for (const { type, min_count } of REQUIRED_FILES) {
      const currentCount = fileCountMap[type] || 0;
      if (currentCount >= min_count) {
        satisfiedFileTypesCount++;
      }
    }
    const fileScore = (satisfiedFileTypesCount / REQUIRED_FILES.length) * 100;

    // 総合スコア
    const overallScore = Math.round((fieldScore + fileScore) / 2);

    // スコアレベル
    let scoreLevel = 'low';
    if (overallScore >= 80) {
      scoreLevel = 'high';
    } else if (overallScore >= 50) {
      scoreLevel = 'medium';
    }

    return c.json({
      success: true,
      deal_id: dealId,
      completeness: {
        overall_score: overallScore,
        score_level: scoreLevel,
        field_score: Math.round(fieldScore),
        file_score: Math.round(fileScore),
        filled_fields: filledFieldsCount,
        total_fields: REQUIRED_FIELDS_FOR_REVIEW.length,
        satisfied_file_types: satisfiedFileTypesCount,
        total_file_types: REQUIRED_FILES.length
      }
    });
  } catch (error) {
    console.error('Get completeness error:', error);
    return c.json({
      error: '完全性スコアの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default dealValidation;
