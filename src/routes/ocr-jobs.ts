import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Bindings } from '../types';
import { verifyToken } from '../utils/crypto';

const ocrJobs = new Hono<{ Bindings: Bindings }>();

/**
 * セマフォクラス - 並列実行数を制限
 * OpenAI APIのレート制限対策として使用
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      if (resolve) {
        this.permits--;
        resolve();
      }
    }
  }
}

/**
 * 新しいOCRジョブを作成（非同期処理開始）
 * POST /api/ocr-jobs
 */
ocrJobs.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const files: File[] = [];
    
    // FormDataから全ファイルを取得
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }
    
    if (files.length === 0) {
      return c.json({ error: '少なくとも1つのファイルが必要です' }, 400);
    }
    
    // ファイル数制限（最大10ファイル）
    if (files.length > 10) {
      return c.json({ 
        error: 'ファイル数が多すぎます',
        details: '一度に処理できるファイルは10個までです'
      }, 400);
    }
    
    // ファイルバリデーション
    // 注意: OpenAI Vision APIは画像形式のみをサポート
    // PDFファイルはフロントエンドで画像に変換されてから送信されます
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
      if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
        return c.json({ 
          error: `ファイル "${file.name}" の形式が対応していません`,
          details: 'PNG, JPG, JPEG, WEBP形式のみ対応しています'
        }, 400);
      }
      
      if (file.size > maxSize) {
        return c.json({ 
          error: `ファイル "${file.name}" のサイズが大きすぎます`,
          details: 'ファイルサイズは10MB以下にしてください'
        }, 400);
      }
    }
    
    // ユーザーIDを取得（認証ヘッダーから）
    const authHeader = c.req.header('Authorization');
    let userId = 'anonymous';
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = c.env.JWT_SECRET;
        const payload = await verifyToken(token, secret);
        if (payload && payload.userId) {
          userId = payload.userId;
        }
      } catch (err) {
        // トークン検証失敗でも続行（匿名として処理）
        console.warn('JWT verification failed:', err);
      }
    }
    
    // ジョブIDを生成
    const jobId = nanoid(16);
    
    // ジョブをDBに保存
    const fileNames = files.map(f => f.name);
    const { DB } = c.env;
    
    await DB.prepare(`
      INSERT INTO ocr_jobs (id, user_id, status, total_files, file_names, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(jobId, userId, files.length, JSON.stringify(fileNames)).run();
    
    // バックグラウンドで非同期処理を開始
    // Cloudflare Workersの制約により、c.executionCtx.waitUntil()を使用
    c.executionCtx.waitUntil(
      processOCRJob(jobId, files, c.env)
    );
    
    // すぐにジョブIDを返す
    return c.json({
      success: true,
      job_id: jobId,
      total_files: files.length,
      file_names: fileNames,
      message: 'OCR処理を開始しました。ジョブIDを使用して進捗を確認できます。'
    });
    
  } catch (error) {
    console.error('OCR job creation error:', error);
    return c.json({ 
      error: 'OCRジョブの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * OCRジョブのステータスを取得
 * GET /api/ocr-jobs/:jobId
 */
ocrJobs.get('/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const { DB } = c.env;
    
    const result = await DB.prepare(`
      SELECT * FROM ocr_jobs WHERE id = ?
    `).bind(jobId).first();
    
    if (!result) {
      return c.json({ error: 'ジョブが見つかりません' }, 404);
    }
    
    // JSON文字列をパース
    const job = {
      ...result,
      file_names: result.file_names ? JSON.parse(result.file_names as string) : [],
      extracted_data: result.extracted_data ? JSON.parse(result.extracted_data as string) : null
    };
    
    return c.json({
      success: true,
      job
    });
    
  } catch (error) {
    console.error('Get OCR job error:', error);
    return c.json({ 
      error: 'ジョブ情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ユーザーの全OCRジョブを取得
 * GET /api/ocr-jobs
 */
ocrJobs.get('/', async (c) => {
  try {
    // ユーザーIDを取得
    const authHeader = c.req.header('Authorization');
    let userId = 'anonymous';
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = c.env.JWT_SECRET;
        const payload = await verifyToken(token, secret);
        if (payload && payload.userId) {
          userId = payload.userId;
        }
      } catch (err) {
        console.warn('JWT verification failed:', err);
      }
    }
    
    const { DB } = c.env;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const result = await DB.prepare(`
      SELECT * FROM ocr_jobs 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();
    
    const jobs = result.results.map(job => ({
      ...job,
      file_names: job.file_names ? JSON.parse(job.file_names as string) : [],
      extracted_data: null // 詳細は個別取得で
    }));
    
    return c.json({
      success: true,
      jobs,
      total: jobs.length
    });
    
  } catch (error) {
    console.error('List OCR jobs error:', error);
    return c.json({ 
      error: 'ジョブ一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * OCRジョブをキャンセル
 * DELETE /api/ocr-jobs/:jobId
 */
ocrJobs.delete('/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const { DB } = c.env;
    
    // ジョブの存在確認
    const job = await DB.prepare(`
      SELECT * FROM ocr_jobs WHERE id = ?
    `).bind(jobId).first();
    
    if (!job) {
      return c.json({ error: 'ジョブが見つかりません' }, 404);
    }
    
    // 進行中のジョブの場合はキャンセル、完了済みの場合は削除
    if (job.status === 'processing' || job.status === 'pending') {
      // キャンセル（ステータスを更新）
      await DB.prepare(`
        UPDATE ocr_jobs 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(jobId).run();
      
      return c.json({
        success: true,
        message: 'ジョブをキャンセルしました'
      });
    } else {
      // 完了済み/失敗/キャンセル済みの場合は削除
      await DB.prepare(`
        DELETE FROM ocr_jobs WHERE id = ?
      `).bind(jobId).run();
      
      return c.json({
        success: true,
        message: 'ジョブを削除しました'
      });
    }
    
  } catch (error) {
    console.error('Delete OCR job error:', error);
    return c.json({ 
      error: 'ジョブの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * OCRジョブを実際に処理する非同期関数
 * バックグラウンドで実行される
 */
async function processOCRJob(jobId: string, files: File[], env: Bindings): Promise<void> {
  const startTime = Date.now();
  const { DB, OPENAI_API_KEY } = env;
  
  try {
    // ステータスを処理中に更新
    await DB.prepare(`
      UPDATE ocr_jobs 
      SET status = 'processing', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(jobId).run();
    
    // OpenAI API Keyチェック
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API Keyが設定されていません');
    }
    
    // 各ファイルをOCR処理（並列処理 + セマフォ）
    const extractionResults: any[] = [];
    const processedFiles: string[] = [];
    
    // セマフォ実装: 同時実行数を制限（OpenAI APIレート制限対策）
    // 無料プラン: 60リクエスト/分 = 1リクエスト/秒
    // 安全のため、最大3並列に制限
    const maxConcurrent = 3;
    const semaphore = new Semaphore(maxConcurrent);
    
    // 進捗カウンター
    let processedCount = 0;
    
    // 各ファイル処理用のプロミス関数
    const processFile = async (file: File, index: number) => {
      await semaphore.acquire();
      
      try {
        // キャンセルチェック
        const currentJob = await DB.prepare(`
          SELECT status FROM ocr_jobs WHERE id = ?
        `).bind(jobId).first();
        
        if (currentJob && currentJob.status === 'cancelled') {
          console.log(`Job ${jobId} was cancelled, stopping file processing`);
          return { index, success: false, cancelled: true, error: 'ジョブがキャンセルされました' };
        }
        
        // ファイルをBase64に変換
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = arrayBufferToBase64(arrayBuffer);
        const mimeType = file.type;
        
        // OpenAI APIに送信
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: PROPERTY_EXTRACTION_PROMPT
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract property information from this real estate document. Return ONLY a JSON object, no other text.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.1,
            response_format: { type: "json_object" }
          })
        });
        
        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          const errorMsg = `OpenAI API error (${openaiResponse.status}): ${errorText}`;
          console.error(`[OCR] ${errorMsg} for ${file.name}`);
          return { 
            index, 
            success: false, 
            error: errorMsg 
          };
        }
        
        const result = await openaiResponse.json();
        
        if (result.choices && result.choices.length > 0) {
          const content = result.choices[0].message.content;
          console.log(`[OCR] OpenAI response for ${file.name}:`, content.substring(0, 500));
          
          // JSON抽出 (response_format: json_objectを使用しているため直接パース)
          try {
            let rawData = JSON.parse(content);
            console.log(`[OCR] Successfully parsed JSON for ${file.name}`);
            console.log(`[OCR] Raw data sample:`, JSON.stringify(rawData).substring(0, 300));
            
            // データ正規化: OpenAI APIのレスポンスを期待する形式に変換
            const normalizedData = normalizePropertyData(rawData);
            console.log(`[OCR] Normalized data sample:`, JSON.stringify(normalizedData).substring(0, 300));
            
            return { index, success: true, data: normalizedData, fileName: file.name };
          } catch (parseError) {
            const errorMsg = `JSON解析エラー: ${parseError instanceof Error ? parseError.message : 'Unknown'}`;
            console.error(`[OCR] JSON parse error for ${file.name}:`, parseError);
            console.error(`[OCR] Content that failed to parse:`, content);
            return { index, success: false, error: errorMsg };
          }
        } else {
          const errorMsg = 'OpenAI APIレスポンスが空です';
          console.error(`[OCR] No choices in OpenAI response for ${file.name}`);
          return { index, success: false, error: errorMsg };
        }
        
      } catch (fileError) {
        console.error(`[OCR] Error processing ${file.name}:`, fileError);
        return { 
          index, 
          success: false, 
          error: fileError instanceof Error ? fileError.message : 'Unknown error' 
        };
      } finally {
        semaphore.release();
        
        // 進捗を更新
        processedCount++;
        await DB.prepare(`
          UPDATE ocr_jobs 
          SET processed_files = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(processedCount, jobId).run();
      }
    };
    
    // 全ファイルを並列処理（セマフォで同時実行数制限）
    const results = await Promise.all(
      files.map((file, index) => processFile(file, index))
    );
    
    // 成功した結果のみ収集
    const errors: string[] = [];
    for (const result of results) {
      if (result.success && result.data) {
        extractionResults.push(result.data);
        processedFiles.push(result.fileName!);
      } else if (result.error) {
        errors.push(`${files[result.index]?.name || 'unknown'}: ${result.error}`);
      }
    }
    
    // 最終進捗を更新
    await DB.prepare(`
      UPDATE ocr_jobs 
      SET processed_files = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(files.length, jobId).run();
    
    if (extractionResults.length === 0) {
      const errorMsg = errors.length > 0 
        ? `物件情報を抽出できませんでした。詳細: ${errors.join('; ')}`
        : '物件情報を抽出できませんでした';
      console.error(`[OCR] Job ${jobId} failed:`, errorMsg);
      throw new Error(errorMsg);
    }
    
    // 複数ファイルの結果を統合
    const mergedData = mergePropertyData(extractionResults);
    const processingTime = Date.now() - startTime;
    const confidenceScore = mergedData.overall_confidence || mergedData.confidence || 0.5;
    
    // ステータスを完了に更新
    await DB.prepare(`
      UPDATE ocr_jobs 
      SET status = 'completed', 
          extracted_data = ?, 
          confidence_score = ?,
          processing_time_ms = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(
      JSON.stringify(mergedData),
      confidenceScore,
      processingTime,
      jobId
    ).run();
    
  } catch (error) {
    console.error(`OCR job ${jobId} processing error:`, error);
    
    // ステータスを失敗に更新
    await DB.prepare(`
      UPDATE ocr_jobs 
      SET status = 'failed', 
          error_message = ?,
          processing_time_ms = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(
      error instanceof Error ? error.message : 'Unknown error',
      Date.now() - startTime,
      jobId
    ).run();
  }
}

/**
 * ArrayBufferをBase64文字列に変換
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * 物件情報抽出用システムプロンプト
 */
const PROPERTY_EXTRACTION_PROMPT = `You are an expert in extracting property information from Japanese real estate documents with over 20 years of experience.
Extract property information from registry documents, property overview sheets, and brokerage materials with high accuracy.

CRITICAL: You MUST respond with ONLY a valid JSON object. Do not include any explanatory text, comments, or markdown formatting.

# Important Extraction Rules

## 文字認識の優先順位
1. **明瞭な印字テキスト**を最優先で読み取る
2. 手書き文字は文脈から推測して補完する
3. 不鮮明な部分は null とし、確実な情報のみ抽出する
4. 複数ページに情報が分散している場合は、最新または最も詳細な情報を採用する

## フィールド別の抽出ガイド

### 所在地（location）
- 都道府県から番地まで完全な住所を抽出
- 「地番」と「住居表示」の両方がある場合は住居表示を優先
- 例: "神奈川県川崎市幸区塚越四丁目328番1"

### 最寄り駅・アクセス（station, walk_minutes）
- 駅名のみを抽出（路線名は不要）
- 徒歩分数は数値のみ（単位不要）
- 「徒歩5分」→ station: "矢向", walk_minutes: "5"

### 面積（land_area, building_area）
- 単位を含めて抽出（㎡、坪など）
- 「実測」「登記」の記載があれば含める
- 例: "218.14㎡（実測）"

### 用途地域・建蔽率・容積率（zoning, building_coverage, floor_area_ratio）
- 正式名称で抽出（略称不可）
- 建蔽率・容積率はパーセント記号を含める
- 例: zoning: "第一種住居地域", building_coverage: "60%", floor_area_ratio: "200%"

### 価格（price）
- 単位を含めて正確に抽出（万円、億円、千万円など）
- カンマ区切りを保持
- 例: "3,980万円"

### 構造・築年（structure, built_year）
- 構造は正式名称（木造、鉄筋コンクリート造、鉄骨造など）
- 築年月は和暦・西暦どちらでも可
- 例: structure: "木造3階建", built_year: "平成28年3月" または "2016年3月"

### 道路情報（road_info）
- 接道状況を詳細に抽出
- 幅員、接道長さ、方位を含める
- 例: "北側私道 幅員2.0m 接道2.0m"

### 現況・利回り（current_status, yield, occupancy）
- 現況: "更地", "古家あり", "賃貸中" など
- 利回り: パーセント記号を含める
- 賃貸状況: 空室率や入居状況

## Output Format

CRITICAL: Return ONLY the JSON object below. Do NOT include markdown code blocks, explanations, or any other text.
Start your response directly with { and end with }

{
  "property_name": {"value": "物件名称", "confidence": 0.95},
  "location": {"value": "完全な所在地", "confidence": 0.90},
  "station": {"value": "最寄り駅名", "confidence": 0.92},
  "walk_minutes": {"value": "徒歩分数（数値のみ）", "confidence": 0.88},
  "land_area": {"value": "土地面積（単位込み）", "confidence": 0.91},
  "building_area": {"value": "建物面積（単位込み）", "confidence": 0.87},
  "zoning": {"value": "用途地域（正式名称）", "confidence": 0.93},
  "building_coverage": {"value": "建蔽率（%込み）", "confidence": 0.90},
  "floor_area_ratio": {"value": "容積率（%込み）", "confidence": 0.91},
  "price": {"value": "価格（単位込み）", "confidence": 0.85},
  "structure": {"value": "構造（正式名称）", "confidence": 0.80},
  "built_year": {"value": "築年月", "confidence": 0.75},
  "road_info": {"value": "道路情報（詳細）", "confidence": 0.70},
  "current_status": {"value": "現況", "confidence": 0.88},
  "yield": {"value": "表面利回り（%込み）", "confidence": 0.65},
  "occupancy": {"value": "賃貸状況", "confidence": 0.60},
  "overall_confidence": 0.85
}

**各フィールドの confidence**: 各項目の抽出精度を0.0〜1.0で自己評価してください。
- 0.9以上: 情報が明瞭に読み取れた
- 0.7〜0.9: 情報は読み取れたが、一部不明瞭
- 0.5〜0.7: 情報の一部しか読み取れなかった
- 0.5未満: 情報が不明瞭または読み取り困難

**overall_confidence**: 全体の抽出精度（全フィールドの平均）

抽出できない情報は必ず {"value": null, "confidence": 0} にしてください。推測や創作は厳禁です。`;

/**
 * OpenAI APIレスポンスを正規化
 * 期待する {value, confidence} 形式に変換
 */
function normalizePropertyData(rawData: any): any {
  const normalized: any = {};
  
  const fields = [
    'property_name', 'location', 'station', 'walk_minutes',
    'land_area', 'building_area', 'zoning', 'building_coverage',
    'floor_area_ratio', 'price', 'structure', 'built_year',
    'road_info', 'current_status', 'yield', 'occupancy', 'overall_confidence'
  ];
  
  for (const field of fields) {
    const value = rawData[field];
    
    // 既に正しい形式の場合
    if (value && typeof value === 'object' && 'value' in value && 'confidence' in value) {
      normalized[field] = value;
    }
    // 文字列または数値の場合
    else if (value !== null && value !== undefined && typeof value !== 'object') {
      normalized[field] = {
        value: String(value),
        confidence: field === 'overall_confidence' ? (Number(value) || 0.5) : 0.5
      };
    }
    // その他のオブジェクトまたはnullの場合
    else {
      normalized[field] = {
        value: null,
        confidence: 0
      };
    }
  }
  
  // overall_confidenceは数値として扱う
  if (normalized.overall_confidence && typeof normalized.overall_confidence.value === 'string') {
    normalized.overall_confidence = Number(normalized.overall_confidence.value) || 0.5;
  } else if (typeof rawData.overall_confidence === 'number') {
    normalized.overall_confidence = rawData.overall_confidence;
  } else {
    normalized.overall_confidence = 0.5;
  }
  
  return normalized;
}

/**
 * 複数の抽出結果を統合
 * より詳細な情報を持つものを優先
 */
function mergePropertyData(results: any[]): any {
  const merged: any = {};
  
  // 各フィールドについて、最も信頼度が高く詳細な情報を選択
  const fields = [
    'property_name', 'location', 'station', 'walk_minutes',
    'land_area', 'building_area', 'zoning', 'building_coverage',
    'floor_area_ratio', 'price', 'structure', 'built_year',
    'road_info', 'current_status', 'yield', 'occupancy'
  ];
  
  for (const field of fields) {
    let bestValue: any = { value: null, confidence: 0 };
    let maxScore = 0;
    
    for (const result of results) {
      const value = result[field];
      if (value && value !== null) {
        // 新形式の場合 (object with value and confidence)
        if (typeof value === 'object' && 'value' in value && 'confidence' in value) {
          const confidence = value.confidence || 0.5;
          const valueStr = value.value !== null ? String(value.value) : '';
          const length = valueStr.length;
          const score = confidence * (length + 1); // +1 to avoid zero score for empty strings
          
          if (score > maxScore) {
            maxScore = score;
            bestValue = value;
          }
        } else if (typeof value === 'object' && !('value' in value)) {
          // オブジェクトだが期待する形式ではない場合 (単なるオブジェクト)
          console.warn(`[OCR] Unexpected object format for ${field}:`, JSON.stringify(value).substring(0, 100));
          bestValue = { value: null, confidence: 0 };
        } else {
          // 旧形式の場合 (直接文字列や数値)
          const valueStr = String(value);
          const score = valueStr.length;
          if (score > maxScore) {
            maxScore = score;
            bestValue = { value: valueStr, confidence: 0.5 };
          }
        }
      }
    }
    
    merged[field] = bestValue;
  }
  
  // overall_confidenceの計算
  let totalConfidence = 0;
  let count = 0;
  
  for (const field of fields) {
    if (merged[field] && typeof merged[field] === 'object' && merged[field].confidence) {
      totalConfidence += merged[field].confidence;
      count++;
    }
  }
  
  merged.overall_confidence = count > 0 ? totalConfidence / count : 0.5;
  
  return merged;
}

export default ocrJobs;
