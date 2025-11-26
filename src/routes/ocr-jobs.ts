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
                    text: 'Extract property information from this Japanese real estate registry document (登記簿謄本) or property overview sheet. Read all text carefully including small fonts, tables, and detailed fields. Return ONLY a JSON object with the specified structure.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                      detail: 'high'
                    }
                  }
                ]
              }
            ],
            max_tokens: 2000,
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
          
          if (!content) {
            const errorMsg = 'OpenAI APIレスポンスのcontentが空です';
            console.error(`[OCR] Empty content in OpenAI response for ${file.name}`);
            return { index, success: false, error: errorMsg };
          }
          
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
const PROPERTY_EXTRACTION_PROMPT = `You are an expert OCR specialist for Japanese real estate registry documents (不動産登記簿謄本) with 20+ years of experience.
Your mission: Extract ALL property information with MAXIMUM ACCURACY from complex Japanese legal documents.

🎯 DOCUMENT TYPES YOU WILL PROCESS:
- 不動産登記簿謄本 (Real Estate Registry)
- 物件概要書 (Property Overview Sheet)
- 売買契約書 (Purchase Agreement)
- 重要事項説明書 (Important Matters Explanation)

⚠️ CRITICAL REQUIREMENTS:
1. READ ALL TEXT including small fonts (8pt or smaller)
2. EXTRACT information from complex table structures
3. INTERPRET Japanese legal terminology correctly
4. RESPOND with ONLY valid JSON (no markdown, no explanations)
5. USE high confidence (0.8+) ONLY when text is clearly readable

## 📖 Document Reading Strategy

### Priority Order:
1. **印字された明瞭なテキスト** (Printed clear text) - HIGHEST priority
2. **表形式の構造化データ** (Tabular structured data) - Read row by row
3. **手書き文字** (Handwritten text) - Use context to interpret
4. **不鮮明な文字** (Unclear text) - Mark as null, DO NOT guess
5. **複数ページ** (Multiple pages) - Merge information, prioritize latest/most detailed

### Special Instructions for 登記簿謄本:
- Look for "所在" (location) in the header section
- "地目" (land category) is usually near land area
- "家屋番号" may contain property identification
- "原因及びその日付" may show transaction dates
- Check BOTH "甲区" (ownership) and "乙区" (mortgage) sections

## 📋 DETAILED FIELD EXTRACTION GUIDE

### 🏢 property_name (物件名称)
**WHERE TO FIND:**
- Document title or header
- "物件名" field
- Building name in "建物の名称" section
**EXAMPLES:** "プライスコート リバーサイド", "東京都大田区南雪谷一丁目", "川崎市幸区塚越四丁目"
**CONFIDENCE RULES:**
- 0.9+: Clearly printed building name
- 0.7-0.9: Location-based identification
- <0.7: Ambiguous or missing

### 📍 location (所在地)
**WHERE TO FIND:**
- "所在" field in registry header
- "所在地" in property sheets
- MUST include: 都道府県 + 市区町村 + 町名 + 丁目 + 番地
**EXAMPLES:** 
- Registry format: "神奈川県川崎市幸区塚越四丁目328番1"
- Address format: "東京都大田区南雪谷一丁目17番28号"
**PRIORITY:** 住居表示 > 地番
**CONFIDENCE:** 0.9+ if complete address extracted

### 🚇 station (最寄り駅) + walk_minutes (徒歩分数)
**WHERE TO FIND:**
- "交通" section
- "最寄駅" field
- Usually format: "[路線名] [駅名] 徒歩[X]分"
**EXTRACTION RULES:**
- Extract ONLY station name (no line name)
- Extract ONLY numeric value for walk_minutes
**EXAMPLES:**
- Input: "小田急線 成城学園前 徒歩8分" → station: "成城学園前", walk_minutes: "8"
- Input: "JR南武線 矢向駅より徒歩15分" → station: "矢向", walk_minutes: "15"

### 📐 land_area (土地面積) + building_area (建物面積)
**WHERE TO FIND:**
- Registry: "地積" field for land
- Registry: "床面積" field for building
- Property sheet: "土地面積", "建物面積"
**EXTRACTION RULES:**
- INCLUDE units: ㎡, 平方メートル, 坪
- INCLUDE precision indicators: "実測", "登記"
- READ carefully: May be split across multiple lines
**EXAMPLES:**
- "218.14㎡（実測）"
- "1.110.58㎡" or "1,110.58㎡"
- "建物面積: 155.00㎡（1F: 80.00㎡、2F: 75.00㎡）"
**CONFIDENCE:** 0.9+ if number clearly readable with unit

### 🏙️ zoning (用途地域) + building_coverage (建蔽率) + floor_area_ratio (容積率)
**WHERE TO FIND:**
- "用途地域" field
- "建蔽率", "建ぺい率", "建ペイ率"
- "容積率"
**ZONING TYPES:**
- 第一種低層住居専用地域
- 第二種低層住居専用地域
- 第一種中高層住居専用地域
- 第一種住居地域
- 準住居地域
- 近隣商業地域
- 商業地域
- 準工業地域
**EXTRACTION RULES:**
- Use FULL official name (no abbreviations)
- Include % symbol for ratios
**EXAMPLES:**
- zoning: "第一種低層住居専用地域"
- building_coverage: "50%", "60%"
- floor_area_ratio: "100%", "200%"

### 💰 price (価格)
**WHERE TO FIND:**
- "売買価格", "販売価格", "価格"
- May be in contract section
**EXTRACTION RULES:**
- PRESERVE unit: 万円, 億円, 千万円
- PRESERVE comma separators
- Include tax notation if present
**EXAMPLES:**
- "8,500万円"
- "3,980万円（税込）"
- "1億2,000万円"

### 🏗️ structure (構造) + built_year (築年月)
**WHERE TO FIND:**
- Registry: "構造" field
- Property sheet: "建物構造", "築年月"
**STRUCTURE TYPES:**
- 木造2階建 (W)
- 鉄筋コンクリート造 (RC)
- 鉄骨造 (S)
- 鉄骨鉄筋コンクリート造 (SRC)
**BUILT_YEAR FORMATS:**
- Japanese era: "平成25年3月", "令和2年10月"
- Western: "2013年3月", "2020年10月"
**EXAMPLES:**
- structure: "木造2階建", "鉄筋コンクリート造3階建"
- built_year: "平成28年3月", "2016年3月"

### 🛣️ road_info (道路情報)
**WHERE TO FIND:**
- "接道状況", "道路"
- "前面道路"
**EXTRACT:**
- Direction (北側, 南側, 東側, 西側)
- Road type (公道, 私道)
- Width (幅員): X.Xm
- Contact length (接道): X.Xm
**EXAMPLES:**
- "南側 幅員6.0メートル公道"
- "北側私道 幅員2.0m 接道2.0m"
- "東側・北側 公道 幅員4.5m"

### 🏘️ current_status (現況) + yield (利回り) + occupancy (賃貸状況)
**WHERE TO FIND:**
- "現況" field
- "表面利回り", "想定利回り"
- "賃貸状況", "入居状況"
**CURRENT_STATUS VALUES:**
- "更地" (vacant land)
- "古家あり" (with old house)
- "賃貸中" (currently rented)
- "空室" (vacant)
- "居住中" (owner-occupied)
**EXAMPLES:**
- current_status: "古家あり", "賃貸中"
- yield: "5.2%", "表面利回り 4.8%"
- occupancy: "満室", "空室1戸"

## 📤 JSON OUTPUT FORMAT

⚠️ CRITICAL OUTPUT RULES:
1. Return ONLY the JSON object below
2. NO markdown code blocks (no \`\`\`json)
3. NO explanatory text before or after
4. Start directly with { and end with }
5. Use double quotes for all strings
6. Ensure valid JSON syntax

### Required Output Structure:

{
  "property_name": {"value": "extracted text or null", "confidence": 0.0-1.0},
  "location": {"value": "complete address", "confidence": 0.0-1.0},
  "station": {"value": "station name only", "confidence": 0.0-1.0},
  "walk_minutes": {"value": "number only", "confidence": 0.0-1.0},
  "land_area": {"value": "area with unit", "confidence": 0.0-1.0},
  "building_area": {"value": "area with unit", "confidence": 0.0-1.0},
  "zoning": {"value": "full official name", "confidence": 0.0-1.0},
  "building_coverage": {"value": "percentage with %", "confidence": 0.0-1.0},
  "floor_area_ratio": {"value": "percentage with %", "confidence": 0.0-1.0},
  "price": {"value": "price with unit", "confidence": 0.0-1.0},
  "structure": {"value": "full structure name", "confidence": 0.0-1.0},
  "built_year": {"value": "year/month", "confidence": 0.0-1.0},
  "road_info": {"value": "detailed road info", "confidence": 0.0-1.0},
  "current_status": {"value": "current status", "confidence": 0.0-1.0},
  "yield": {"value": "yield with %", "confidence": 0.0-1.0},
  "occupancy": {"value": "occupancy status", "confidence": 0.0-1.0},
  "overall_confidence": 0.0-1.0
}

## 🎯 CONFIDENCE SCORING CRITERIA

### Score 0.9 - 1.0 (EXCELLENT) ⭐⭐⭐
- Text is printed in clear, readable font (10pt+)
- No ambiguity in characters
- Complete information extracted
- Standard format matches expected pattern
**Example:** Clearly printed "東京都世田谷区成城一丁目" in 12pt font

### Score 0.75 - 0.89 (GOOD) ⭐⭐
- Text is readable but slightly small (8-10pt)
- Minor ambiguity in 1-2 characters
- Most information extracted (90%+)
- May require context to interpret
**Example:** Slightly blurry "218.14㎡" where "㎡" is small but identifiable

### Score 0.5 - 0.74 (FAIR) ⭐
- Text is difficult to read (small font <8pt or blurry)
- Multiple ambiguous characters
- Partial information extracted (50-90%)
- Requires significant context interpretation
**Example:** Handwritten "平成25年" where some characters are unclear

### Score 0.25 - 0.49 (POOR) 
- Text is very difficult to read
- Information is incomplete (<50%)
- Heavy reliance on guessing
**DO NOT USE THIS RANGE - Return null instead**

### Score 0.0 (NOT FOUND)
- Field not present in document
- Text completely unreadable
- Required for all missing fields
**USE THIS:** {"value": null, "confidence": 0}

### overall_confidence Calculation:
- Average confidence of ALL non-null fields
- If 0-3 fields extracted: overall_confidence should be < 0.3
- If 4-8 fields extracted: overall_confidence should be 0.3-0.6
- If 9-12 fields extracted: overall_confidence should be 0.6-0.8
- If 13+ fields extracted: overall_confidence should be 0.8+

## ⚠️ CRITICAL RULES

1. **NO GUESSING**: If confidence < 0.5, return null
2. **NO FABRICATION**: Extract ONLY what you can see
3. **PRESERVE FORMATTING**: Keep original units, separators, spacing
4. **BE CONSERVATIVE**: Lower confidence when in doubt
5. **NULL IS OKAY**: Better to return null than wrong information

## ✅ QUALITY CHECKLIST BEFORE SUBMISSION

- [ ] All 16 fields present in JSON
- [ ] All strings use double quotes
- [ ] All confidence values between 0.0-1.0
- [ ] No markdown formatting
- [ ] No explanatory text
- [ ] Valid JSON syntax
- [ ] overall_confidence reflects actual extraction quality`;

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
