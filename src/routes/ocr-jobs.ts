import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Bindings, OCRExtractedData, OCRExtractedField, validateOCRExtractedData } from '../types';
import { verifyToken } from '../utils/crypto';
import { authMiddleware } from '../utils/auth';
import { retryOpenAI, RetryError } from '../utils/retry';

const ocrJobs = new Hono<{ Bindings: Bindings }>();

// CRITICAL FIX v3.153.95: Require authentication for all OCR endpoints
ocrJobs.use('*', authMiddleware);

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
 * OpenAI使用量追跡とコスト計算
 * v3.153.96 - $20/月コスト上限保護機能
 */
interface OpenAIUsageTracking {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
}

/**
 * OpenAI gpt-4o料金計算（2024年12月時点）
 * Input: $2.50/1M tokens
 * Output: $10.00/1M tokens
 */
function calculateOpenAICost(usage: { prompt_tokens: number; completion_tokens: number }): OpenAIUsageTracking {
  const INPUT_COST_PER_1M = 2.50;
  const OUTPUT_COST_PER_1M = 10.00;
  
  const inputCost = (usage.prompt_tokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (usage.completion_tokens / 1_000_000) * OUTPUT_COST_PER_1M;
  
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.prompt_tokens + usage.completion_tokens,
    estimatedCostUSD: inputCost + outputCost
  };
}

/**
 * 同期的にOCR処理を実行（Cloudflare Workers対応）
 * リクエスト内で完了し、結果を直接返す
 * v3.153.96: OpenAI使用量追跡を追加
 */
async function performOCRSync(
  files: File[], 
  apiKey: string, 
  db: D1Database, 
  userId: number, 
  jobId: string
): Promise<{ data: any; totalCost: number; totalTokens: number }> {
  console.log('[OCR Sync] Starting synchronous OCR for', files.length, 'files');
  
  const extractionResults: any[] = [];
  let totalCost = 0;
  let totalTokens = 0;
  
  // 各ファイルを順次処理（並列ではなく直列でタイムアウト回避）
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[OCR Sync] Processing file ${i + 1}/${files.length}:`, file.name);
    
    try {
      // ファイルをBase64に変換
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type;
      
      // OpenAI APIに送信（v3.153.97: リトライ機能追加）
      const openaiResponse = await retryOpenAI(
        async () => {
          console.log(`[OCR Sync] Calling OpenAI API for ${file.name}...`);
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
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
                      text: 'この日本の不動産資料から情報を抽出してください。小さな文字も含め、画像内のすべてのテキストを注意深く読み取ってください。完全なJSON形式で返してください（マークダウン記法不要）。'
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
              temperature: 0.05,
              response_format: { type: "json_object" }
            })
          });
          
          // リトライ判定のため、非OKレスポンスは例外をスロー
          if (!response.ok) {
            const error: any = new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            error.response = { status: response.status };
            throw error;
          }
          
          return response;
        },
        (attempt, error, delayMs) => {
          console.warn(`[OCR Sync] Retry ${attempt}/3 for ${file.name} after ${delayMs}ms due to:`, error.message);
        }
      );
      
      // v3.153.97: retryOpenAIが成功を保証するため、ここでは常にokと想定
      const result = await openaiResponse.json();
      
      // v3.153.96: 使用量を追跡
      if (result.usage) {
        const usage = calculateOpenAICost(result.usage);
        totalCost += usage.estimatedCostUSD;
        totalTokens += usage.totalTokens;
        
        console.log(`[OCR Sync] Usage for ${file.name}: ${usage.totalTokens} tokens, $${usage.estimatedCostUSD.toFixed(4)}`);
        
        // DB に使用量を記録
        await db.prepare(`
          INSERT INTO openai_usage (user_id, job_id, endpoint, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId, 
          jobId, 
          '/api/ocr-jobs', 
          'gpt-4o', 
          usage.promptTokens, 
          usage.completionTokens, 
          usage.totalTokens, 
          usage.estimatedCostUSD, 
          'success'
        ).run();
      }
      
      if (result.choices && result.choices.length > 0) {
        const content = result.choices[0].message.content;
        
        if (content) {
          try {
            const rawData = JSON.parse(content);
            const normalizedData = normalizePropertyData(rawData);
            extractionResults.push(normalizedData);
            console.log(`[OCR Sync] ✅ Successfully extracted data from ${file.name}`);
          } catch (parseError) {
            console.error(`[OCR Sync] JSON parse error for ${file.name}:`, parseError);
          }
        }
      }
    } catch (fileError) {
      console.error(`[OCR Sync] Error processing ${file.name}:`, fileError);
      
      // v3.153.97: リトライ失敗時のエラーハンドリング
      if (fileError instanceof RetryError) {
        console.error(`[OCR Sync] ❌ All retries failed for ${file.name} after ${fileError.attempts} attempts`);
        console.error(`[OCR Sync] Last error:`, fileError.lastError);
        
        // DBにリトライ失敗を記録
        await db.prepare(`
          INSERT INTO openai_usage (user_id, job_id, endpoint, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, status, error_message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId, 
          jobId, 
          '/api/ocr-jobs', 
          'gpt-4o', 
          0, 
          0, 
          0, 
          0, 
          'rate_limit', 
          `Retry failed after ${fileError.attempts} attempts: ${fileError.lastError.message}`.substring(0, 500)
        ).run();
      }
      
      // 続行（他のファイルの処理を継続）
    }
  }
  
  // 結果を統合
  if (extractionResults.length === 0) {
    console.error('[OCR Sync] No data extracted from any files');
    return {
      data: {
        property_name: { value: null, confidence: 0 },
        location: { value: null, confidence: 0 },
        overall_confidence: 0
      },
      totalCost,
      totalTokens
    };
  }
  
  const mergedData = mergePropertyData(extractionResults);
  console.log('[OCR Sync] ✅ Completed. Merged data:', JSON.stringify(mergedData).substring(0, 200));
  console.log(`[OCR Sync] 💰 Total cost: $${totalCost.toFixed(4)}, Total tokens: ${totalTokens}`);
  
  return {
    data: mergedData,
    totalCost,
    totalTokens
  };
}

/**
 * 新しいOCRジョブを作成（同期処理）
 * POST /api/ocr-jobs
 */
ocrJobs.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    let files: File[] = [];
    
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
    
    // ファイルバリデーションと選別
    // 注意: OpenAI Vision APIは画像形式のみをサポート
    // PDFファイルはフロントエンドで画像に変換されてから送信されます
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // OCR対象ファイルの選別
    const ocrTargetFiles: File[] = [];
    const skippedFiles: { name: string; reason: string }[] = [];
    
    for (const file of files) {
      // ファイル名からOCR不要なファイルを判定
      const fileName = file.name.toLowerCase();
      const isPhotoFile = 
        fileName.includes('photo') ||
        fileName.includes('写真') ||
        fileName.includes('画像') ||
        fileName.includes('image') ||
        fileName.includes('pic') ||
        fileName.includes('外観') ||
        fileName.includes('内観') ||
        fileName.includes('間取り') ||
        fileName.includes('map') ||
        fileName.includes('地図');
      
      if (isPhotoFile) {
        skippedFiles.push({
          name: file.name,
          reason: '物件写真・画像ファイルのためOCR処理をスキップしました'
        });
        console.log(`[OCR] Skipping photo file: ${file.name}`);
        continue;
      }
      
      // ファイル形式チェック
      if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
        return c.json({ 
          error: `ファイル "${file.name}" の形式が対応していません`,
          details: 'PNG, JPG, JPEG, WEBP, PDF形式のみ対応しています'
        }, 400);
      }
      
      // ファイルサイズチェック
      if (file.size > maxSize) {
        return c.json({ 
          error: `ファイル "${file.name}" のサイズが大きすぎます`,
          details: 'ファイルサイズは10MB以下にしてください'
        }, 400);
      }
      
      // OCR対象ファイルに追加
      ocrTargetFiles.push(file);
    }
    
    // OCR対象ファイルがない場合
    if (ocrTargetFiles.length === 0) {
      return c.json({
        error: 'OCR対象のファイルがありません',
        details: 'アップロードされたファイルはすべて物件写真・画像として判定されました',
        skipped_files: skippedFiles
      }, 400);
    }
    
    // スキップされたファイルがある場合は警告
    if (skippedFiles.length > 0) {
      console.log(`[OCR] ${skippedFiles.length} files skipped (photos/images)`);
    }
    
    // OCR対象ファイルで処理を続行（filesを上書き）
    files = ocrTargetFiles;
    
    // CRITICAL FIX v3.153.95: Get authenticated user (authMiddleware ensures this exists)
    const user = c.get('user');
    const userId = user?.id || 'unknown';
    
    console.log('[OCR API] Authenticated user:', userId);
    
    // v3.153.96: 月間コスト上限チェック（全ユーザー共通）
    const costLimitResult = await c.env.DB.prepare(`
      SELECT monthly_limit_usd, alert_threshold FROM cost_limits WHERE id = 1
    `).first();
    
    const monthlyLimit = costLimitResult?.monthly_limit_usd || 20.0;
    const alertThreshold = costLimitResult?.alert_threshold || 0.8;
    
    // 今月の使用量を取得
    const currentMonth = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    const monthlyUsageResult = await c.env.DB.prepare(`
      SELECT SUM(estimated_cost_usd) as total_cost 
      FROM openai_usage 
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(currentMonth).first();
    
    const currentCost = monthlyUsageResult?.total_cost || 0;
    const remainingBudget = monthlyLimit - currentCost;
    
    console.log(`[OCR API] 💰 Monthly budget: $${monthlyLimit}, Used: $${currentCost.toFixed(4)}, Remaining: $${remainingBudget.toFixed(4)}`);
    
    // コスト上限に達している場合はエラー
    if (remainingBudget <= 0) {
      return c.json({
        error: '月間コスト上限に達しています',
        details: `今月のOpenAI API使用料が上限額$${monthlyLimit}に達しました。来月まで待つか、管理者に上限引き上げを依頼してください。`,
        current_cost: currentCost,
        monthly_limit: monthlyLimit,
        remaining_budget: 0
      }, 429); // 429 Too Many Requests
    }
    
    // 警告閾値を超えている場合は警告
    if (currentCost >= monthlyLimit * alertThreshold) {
      console.warn(`[OCR API] ⚠️ Warning: ${(currentCost / monthlyLimit * 100).toFixed(1)}% of monthly budget used`);
    }
    
    // ジョブIDを生成
    const jobId = nanoid(16);
    
    // 🔥 CRITICAL FIX: Cloudflare Workersではバックグラウンド処理が継続しない
    // → 同期的にOCR処理を実行し、結果を直接返す
    
    console.log('[OCR API] Starting synchronous OCR processing for', files.length, 'files');
    
    // OpenAI API Keyチェック
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ 
        error: 'OpenAI API Keyが設定されていません',
        details: '管理者にAPI Keyの設定を依頼してください'
      }, 500);
    }
    
    // OCR処理を同期実行（v3.153.96: 使用量追跡を追加）
    const result = await performOCRSync(files, c.env.OPENAI_API_KEY, c.env.DB, userId, jobId);
    
    // 結果を直接返す（ポーリング不要）
    // v3.153.96: コスト情報を追加
    return c.json({
      success: true,
      job_id: jobId,
      status: 'completed',
      total_files: files.length,
      processed_files: files.length,
      file_names: files.map(f => f.name),
      extracted_data: result.data,
      message: 'OCR処理が完了しました',
      usage: {
        estimated_cost_usd: result.totalCost,
        total_tokens: result.totalTokens,
        monthly_used: currentCost + result.totalCost,
        monthly_limit: monthlyLimit,
        remaining_budget: remainingBudget - result.totalCost
      }
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
 * 🧪 OpenAI API接続テスト用エンドポイント
 * GET /api/ocr-jobs/test-openai
 * 
 * このエンドポイントは、OpenAI APIが正しく動作しているかをテストします。
 * シンプルなテキストプロンプトで応答を確認します。
 */
ocrJobs.get('/test-openai', async (c) => {
  try {
    const apiKey = c.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return c.json({
        success: false,
        error: 'OPENAI_API_KEY is not set in environment variables'
      }, 500);
    }
    
    console.log('[OpenAI Test] Sending test request to OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that responds in JSON format.'
          },
          {
            role: 'user',
            content: 'Return a JSON object with a single field "test" set to "success"'
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Test] API error:', errorText);
      return c.json({
        success: false,
        error: `OpenAI API returned ${response.status}: ${errorText}`,
        status: response.status
      }, response.status);
    }
    
    const result = await response.json();
    console.log('[OpenAI Test] ✅ API responded successfully');
    
    return c.json({
      success: true,
      model: 'gpt-4o',
      tokens_used: result.usage,
      response: result.choices[0]?.message?.content,
      full_response: result
    });
    
  } catch (error) {
    console.error('[OpenAI Test] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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
                    text: `⚠️ CRITICAL: You MUST return ALL 19 fields in your JSON response. Do NOT omit any fields.

Extract property information from this Japanese real estate document. Read all text carefully.

🔍 SPECIAL INSTRUCTIONS FOR TEXT EXTRACTION:
⚠️ CRITICAL: This document contains EMBEDDED TEXT. Use your OCR capabilities to READ ALL TEXT in the image.
- DO NOT say "text not found" - LOOK CAREFULLY at the image and extract ALL visible text
- Japanese text may appear in different fonts, sizes, and positions
- Scan EVERY part of the document: headers, body, tables, margins, footers
- Even if text is small or faint, extract it with appropriate confidence level

🔍 LOCATION EXTRACTION (MOST IMPORTANT):
- Look for "所在" (location), "所在地" (address), "住所" (address), "不動産の表示" labels
- Location MUST include prefecture (都道府県). Example: "埼玉県幸手市..." NOT just "幸手市..."
- ⚠️ CRITICAL: If prefecture is missing, INFER it from city name:
  * 幸手市 → 埼玉県幸手市 (Satte City is in Saitama Prefecture)
  * 川崎市 → 神奈川県川崎市 (Kawasaki City is in Kanagawa Prefecture)
  * 柏市 → 千葉県柏市 (Kashiwa City is in Chiba Prefecture)
  * 品川区 → 東京都品川区 (Shinagawa Ward is in Tokyo)
  * Set confidence to 0.7 for inferred prefecture
- If you see ANY address-like text (e.g., "〇〇市〇〇丁目〇-〇"), extract it
- Scan the ENTIRE document including headers, footers, and all text blocks
- If a field appears multiple times, choose the most complete and detailed value

MANDATORY: Your JSON response MUST include ALL of these 19 fields (even if value is null):
1. property_name
2. location (⚠️ MOST IMPORTANT - must include prefecture + city + address)
3. station
4. walk_minutes
5. land_area
6. building_area
7. zoning
8. building_coverage
9. floor_area_ratio
10. price
11. structure
12. built_year
13. road_info
14. height_district (高度地区) ⚠️ CRITICAL - MUST be included
15. fire_zone (防火地域) ⚠️ CRITICAL - MUST be included
16. frontage (間口) ⚠️ CRITICAL - MUST be included
17. current_status
18. yield
19. occupancy
20. overall_confidence

⚠️ SPECIAL ATTENTION: height_district, fire_zone, and frontage are CRITICAL fields.
These three fields MUST be extracted if present in the document. Do NOT omit them.

If a field is not found in the document, set its value to null and confidence to 0.0.
Return ONLY a valid JSON object. No markdown, no explanations.`
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
          
          // 🔍 CRITICAL DEBUG: OpenAI APIの完全なレスポンスをログ出力
          console.log(`[OCR] ========================================`);
          console.log(`[OCR] 🔍 FULL OpenAI response for ${file.name}:`);
          console.log(`[OCR] Content length: ${content.length} characters`);
          console.log(`[OCR] First 1000 chars:`, content.substring(0, 1000));
          console.log(`[OCR] ========================================`);
          
          // JSON抽出 (response_format: json_objectを使用しているため直接パース)
          try {
            let rawData = JSON.parse(content);
            console.log(`[OCR] Successfully parsed JSON for ${file.name}`);
            
            // 🔍 CRITICAL DEBUG: 各フィールドの詳細ログ
            console.log(`[OCR] ========================================`);
            console.log(`[OCR] 🔍 DETAILED FIELD ANALYSIS for ${file.name}:`);
            console.log(`[OCR]   property_name: ${JSON.stringify(rawData.property_name)}`);
            console.log(`[OCR]   location: ${JSON.stringify(rawData.location)}`);
            console.log(`[OCR]   station: ${JSON.stringify(rawData.station)}`);
            console.log(`[OCR]   height_district: ${JSON.stringify(rawData.height_district)}`);
            console.log(`[OCR]   fire_zone: ${JSON.stringify(rawData.fire_zone)}`);
            console.log(`[OCR]   frontage: ${JSON.stringify(rawData.frontage)}`);
            console.log(`[OCR]   overall_confidence: ${JSON.stringify(rawData.overall_confidence)}`);
            console.log(`[OCR] ========================================`);
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
 * 物件情報抽出用システムプロンプト（v3.126.0 - 精度向上版）
 */
const PROPERTY_EXTRACTION_PROMPT = `あなたは日本の不動産書類（登記簿謄本、物件概要書、重要事項説明書）から情報を抽出するエキスパートです。

【重要】以下のフィールドを必ず探して抽出してください：

1. property_name（物件名）
   - 探す場所: 表題部、物件の表示、建物名称
   - 例: 「〇〇マンション」「〇〇アパート」「〇〇ハイツ」
   - ない場合: 所在地から「川崎市幸区塚越物件」のように生成

2. location（所在地）⭐最重要⭐
   - 探す場所: 所在、不動産の表示、所在地、住所、物件所在地、不動産番号
   - 形式: 都道府県+市区町村+町名+番地
   - 例: 
     * 「神奈川県川崎市幸区塚越四丁目123番地」
     * 「埼玉県幸手市北二丁目1-8」
     * 「東京都品川区西中延2-15-12」
   - 重要: 都道府県を必ず含めてください。
   - ⚠️ 特殊ケース: 都道府県が記載されていない場合の対応
     * 市区町村名から都道府県を推測できます（例: 幸手市→埼玉県、川崎市→神奈川県）
     * 推測した場合でもconfidenceを0.7以上に設定してください
     * 例: 「幸手市北二丁目1-8」→「埼玉県幸手市北二丁目1-8」(confidence: 0.7)
   - 抽出方法: ページ内の「所在」「所在地」「住所」などのラベルの近くを探す

3. station（最寄駅）
   - 探す場所: 交通、アクセス、最寄駅
   - 形式: 駅名のみ（路線名不要）
   - 例: 「川崎駅」「矢向駅」

4. walk_minutes（徒歩分数）
   - 探す場所: 交通、徒歩X分
   - 形式: 数字のみ
   - 例: 「10」（「徒歩10分」→「10」）

5. land_area（土地面積）
   - 探す場所: 地積、土地面積
   - 形式: 数値+単位
   - 例: 「150.00㎡」「45.36坪」

6. building_area（建物面積）
   - 探す場所: 床面積、延床面積
   - 形式: 数値+単位
   - 例: 「80.00㎡」「24.20坪」

7. zoning（用途地域）
   - 探す場所: 用途地域、都市計画
   - 例: 「第一種低層住居専用地域」「準工業地域」

8. building_coverage（建蔽率）⭐重要⭐
   - 探す場所: 建蔽率、建ぺい率
   - 形式: 数値のみ（%記号不要）
   - 例: 「60」（「建蔽率60%」→「60」）

9. floor_area_ratio（容積率）⭐重要⭐
   - 探す場所: 容積率
   - 形式: 数値のみ（%記号不要）
   - 例: 「200」（「容積率200%」→「200」）

10. price（価格）
    - 探す場所: 売買価格、価格、販売価格
    - 形式: 数値+単位
    - 例: 「5,800万円」「58,000千円」

11. structure（構造）
    - 探す場所: 構造、建物の構造
    - 例: 「木造2階建」「鉄筋コンクリート造3階建」

12. built_year（築年月）
    - 探す場所: 建築年月日、竣工年月
    - 形式: 和暦または西暦
    - 例: 「令和2年3月」「2020年3月」

13. road_info（接道情報）
    - 探す場所: 接道状況、道路
    - 例: 「北側 幅員4.0m 公道」

14. height_district（高度地区）⭐重要⭐
    - 探す場所: 高度地区、高度制限、高度
    - 形式: 正式名称
    - 例: 「第一種高度地区」「第二種高度地区」「第三種高度地区」「第四種高度地区」
    - ない場合: nullを返す

15. fire_zone（防火地域）⭐重要⭐
    - 探す場所: 防火地域、防火指定、防火
    - 形式: 正式名称
    - 例: 「防火地域」「準防火地域」「22条区域」「指定なし」
    - ない場合: nullを返す

16. frontage（間口）⭐重要⭐
    - 探す場所: 間口、接道幅員、道路情報の中の数値
    - 形式: 数値+単位（mまたはメートル）
    - 抽出方法: 「東側 幅員4.14m」→「4.14m」（数値部分のみ抽出）
    - 例: 「4.14m」「7.5m」「10.2m」
    - ない場合: nullを返す

17. current_status（現況）
    - 探す場所: 現況、引渡条件
    - 例: 「空家」「居住中」「更地」

18. yield（利回り）
    - 探す場所: 表面利回り、想定利回り
    - 形式: 数値のみ
    - 例: 「5.2」（「利回り5.2%」→「5.2」）

19. occupancy（入居状況）
    - 探す場所: 稼働率、入居率
    - 例: 「満室」「8戸中7戸入居」

【出力形式】以下のJSON形式で出力してください（マークダウン不要、説明不要）：

{
  "property_name": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "location": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "station": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "walk_minutes": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "land_area": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "building_area": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "zoning": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "building_coverage": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "floor_area_ratio": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "price": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "structure": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "built_year": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "road_info": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "height_district": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "fire_zone": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "frontage": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "current_status": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "yield": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "occupancy": {"value": "テキストまたはnull", "confidence": 0.0-1.0},
  "overall_confidence": 0.0-1.0
}

【信頼度スコア（confidence）の基準】
- 0.9-1.0: 明瞭な印刷テキスト、完全な情報
- 0.75-0.89: 読めるが小さい/ぼやけている
- 0.5-0.74: 読みにくい、部分的な情報
- 0.0-0.49: 見つからない、読めない → valueをnullに

【必須ルール】
1. 有効なJSONのみ返す（マークダウン不要、説明不要）
2. {で始まり}で終わる
3. ⚠️ すべての19フィールドを必ず含める（省略厳禁）
4. 読めないフィールドはvalueをnullに、confidence: 0.0に設定
5. 推測禁止。見えるテキストのみ抽出
6. 元の単位とフォーマットを保持

【重要】以下の19フィールドすべてをレスポンスに含めてください：
property_name, location, station, walk_minutes, land_area, building_area, zoning, building_coverage, floor_area_ratio, price, structure, built_year, road_info, height_district, fire_zone, frontage, current_status, yield, occupancy, overall_confidence

⚠️ 特に height_district, fire_zone, frontage は必須フィールドです。欠落厳禁。

欠落したフィールドがあるとシステムエラーになります。すべてのフィールドを必ず出力してください。

【Few-Shot Examples】成功例:

Example 1: 物件概要書（完全な情報）
{
  "property_name": {"value": "川崎物件", "confidence": 0.9},
  "location": {"value": "神奈川県川崎市幸区塚越四丁目328番1", "confidence": 0.95},
  "station": {"value": "矢向", "confidence": 0.9},
  "walk_minutes": {"value": "13", "confidence": 0.9},
  "land_area": {"value": "218.14㎡", "confidence": 0.95},
  "building_area": {"value": "104.34㎡", "confidence": 0.95},
  "zoning": {"value": "第一種住居地域", "confidence": 0.9},
  "building_coverage": {"value": "60", "confidence": 0.9},
  "floor_area_ratio": {"value": "200", "confidence": 0.9},
  "price": {"value": "3,980万円", "confidence": 0.95},
  "structure": {"value": "木造3階建", "confidence": 0.9},
  "built_year": {"value": "平成28年3月", "confidence": 0.9},
  "road_info": {"value": "東側 幅員4.14m 公道", "confidence": 0.85},
  "height_district": {"value": "第二種高度地区", "confidence": 0.85},
  "fire_zone": {"value": "準防火地域", "confidence": 0.9},
  "frontage": {"value": "4.14m", "confidence": 0.85},
  "current_status": {"value": "空家", "confidence": 0.9},
  "yield": {"value": null, "confidence": 0.0},
  "occupancy": {"value": null, "confidence": 0.0},
  "overall_confidence": 0.88
}

Example 2: 不明瞭な資料（部分的な情報のみ）
{
  "property_name": {"value": "幸手市物件", "confidence": 0.7},
  "location": {"value": "埼玉県幸手市北二丁目1-8", "confidence": 0.85},
  "station": {"value": "幸手", "confidence": 0.8},
  "walk_minutes": {"value": "7", "confidence": 0.8},
  "land_area": {"value": "110.50㎡", "confidence": 0.75},
  "building_area": {"value": null, "confidence": 0.0},
  "zoning": {"value": "第一種低層住居専用地域", "confidence": 0.7},
  "building_coverage": {"value": "50", "confidence": 0.65},
  "floor_area_ratio": {"value": "100", "confidence": 0.65},
  "price": {"value": "1,580万円", "confidence": 0.8},
  "structure": {"value": null, "confidence": 0.0},
  "built_year": {"value": null, "confidence": 0.0},
  "road_info": {"value": "北側 幅員4.0m", "confidence": 0.6},
  "height_district": {"value": null, "confidence": 0.0},
  "fire_zone": {"value": null, "confidence": 0.0},
  "frontage": {"value": "4.0m", "confidence": 0.6},
  "current_status": {"value": "空家", "confidence": 0.7},
  "yield": {"value": null, "confidence": 0.0},
  "occupancy": {"value": null, "confidence": 0.0},
  "overall_confidence": 0.62
}

上記の例を参考に、同様の形式でJSONを返してください。`;

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
    'road_info', 'height_district', 'fire_zone', 'frontage',
    'current_status', 'yield', 'occupancy', 'overall_confidence'
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
      // ⚠️ CRITICAL FIX: フィールドが欠落している場合でも、空のオブジェクトを作成
      console.warn(`[OCR] Field "${field}" is missing or null in OpenAI response`);
      normalized[field] = {
        value: null,
        confidence: 0
      };
    }
  }
  
  // ⚠️ CRITICAL FIX: OpenAI APIが一部フィールドしか返さない場合のロギング
  const missingFields = fields.filter(f => !rawData[f] && f !== 'overall_confidence');
  if (missingFields.length > 0) {
    console.error(`[OCR] OpenAI API returned incomplete data. Missing ${missingFields.length} fields:`, missingFields.join(', '));
  }
  
  // overall_confidenceは数値として扱う
  if (normalized.overall_confidence && typeof normalized.overall_confidence.value === 'string') {
    normalized.overall_confidence = Number(normalized.overall_confidence.value) || 0.5;
  } else if (typeof rawData.overall_confidence === 'number') {
    normalized.overall_confidence = rawData.overall_confidence;
  } else {
    normalized.overall_confidence = 0.5;
  }
  
  // 物件名が空の場合、所在地から生成
  if ((!normalized.property_name.value || normalized.property_name.value === null) && 
      normalized.location.value && normalized.location.value !== null) {
    const location = String(normalized.location.value);
    // 「川崎市幸区塚越四丁目」→「川崎市幸区塚越物件」
    const simplified = location.replace(/[一二三四五六七八九十]+丁目.*/, '').replace(/[0-9]+番地.*/, '').replace(/[０-９]+.*/, '');
    normalized.property_name = {
      value: simplified + '物件',
      confidence: 0.6  // 自動生成なので信頼度は中程度
    };
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
    'road_info', 'height_district', 'fire_zone', 'frontage',
    'current_status', 'yield', 'occupancy'
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
  
  // 物件名が空の場合、所在地から生成（マージ後の最終チェック）
  if ((!merged.property_name || !merged.property_name.value || merged.property_name.value === null) && 
      merged.location && merged.location.value && merged.location.value !== null) {
    const location = String(merged.location.value);
    // 「川崎市幸区塚越四丁目123番地」→「川崎市幸区塚越物件」
    const simplified = location
      .replace(/[一二三四五六七八九十]+丁目.*/, '')
      .replace(/[0-9]+番地.*/, '')
      .replace(/[０-９]+.*/, '')
      .replace(/\s+/g, '');
    merged.property_name = {
      value: simplified + '物件',
      confidence: 0.6  // 自動生成なので信頼度は中程度
    };
  }
  
  return merged;
}

/**
 * 月間OpenAI使用量取得API
 * GET /api/ocr-jobs/monthly-cost
 * v3.153.96 - フロントエンドでコスト確認ダイアログ表示用
 */
ocrJobs.get('/monthly-cost', async (c) => {
  try {
    // 認証済みユーザー（authMiddleware適用済み）
    const user = c.get('user');
    const userId = user?.id || 'unknown';
    
    // コスト上限を取得
    const costLimitResult = await c.env.DB.prepare(`
      SELECT monthly_limit_usd, alert_threshold FROM cost_limits WHERE id = 1
    `).first();
    
    const monthlyLimit = costLimitResult?.monthly_limit_usd || 20.0;
    const alertThreshold = costLimitResult?.alert_threshold || 0.8;
    
    // 今月の使用量を取得
    const currentMonth = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    const monthlyUsageResult = await c.env.DB.prepare(`
      SELECT SUM(estimated_cost_usd) as total_cost, COUNT(*) as total_requests
      FROM openai_usage 
      WHERE strftime('%Y-%m', created_at) = ?
    `).bind(currentMonth).first();
    
    const monthlyUsed = monthlyUsageResult?.total_cost || 0;
    const totalRequests = monthlyUsageResult?.total_requests || 0;
    const remainingBudget = monthlyLimit - monthlyUsed;
    const usagePercentage = (monthlyUsed / monthlyLimit) * 100;
    
    return c.json({
      success: true,
      month: currentMonth,
      monthly_limit: monthlyLimit,
      monthly_used: monthlyUsed,
      remaining_budget: remainingBudget,
      usage_percentage: usagePercentage,
      total_requests: totalRequests,
      alert_threshold: alertThreshold,
      is_over_threshold: usagePercentage >= (alertThreshold * 100)
    });
    
  } catch (error) {
    console.error('[Monthly Cost API] Error:', error);
    return c.json({
      error: '月間コスト情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default ocrJobs;
