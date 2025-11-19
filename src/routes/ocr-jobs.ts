import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Bindings } from '../types';

const ocrJobs = new Hono<{ Bindings: Bindings }>();

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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
      if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
        return c.json({ 
          error: `ファイル "${file.name}" の形式が対応していません`,
          details: 'PNG, JPG, JPEG, WEBP, PDF形式のみ対応しています'
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
        const decoded = await c.env.jwt.verify(token);
        userId = decoded.user_id || decoded.sub || 'anonymous';
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
        const decoded = await c.env.jwt.verify(token);
        userId = decoded.user_id || decoded.sub || 'anonymous';
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
 * OCRジョブを削除
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
    
    // 削除実行
    await DB.prepare(`
      DELETE FROM ocr_jobs WHERE id = ?
    `).bind(jobId).run();
    
    return c.json({
      success: true,
      message: 'ジョブを削除しました'
    });
    
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
    
    // 各ファイルをOCR処理
    const extractionResults: any[] = [];
    const processedFiles: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // 進捗を更新
        await DB.prepare(`
          UPDATE ocr_jobs 
          SET processed_files = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(i, jobId).run();
        
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
                    text: 'この不動産物件資料から情報を抽出してください。'
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
            temperature: 0.1
          })
        });
        
        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error(`OpenAI API error for ${file.name}:`, errorText);
          continue;
        }
        
        const result = await openaiResponse.json();
        
        if (result.choices && result.choices.length > 0) {
          const content = result.choices[0].message.content;
          
          // JSON抽出
          try {
            const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/\{[\s\S]+\}/);
            
            if (jsonMatch) {
              const jsonStr = jsonMatch[1] || jsonMatch[0];
              const extractedData = JSON.parse(jsonStr);
              extractionResults.push(extractedData);
              processedFiles.push(file.name);
            }
          } catch (parseError) {
            console.error(`JSON parse error for ${file.name}:`, parseError);
          }
        }
        
      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
      }
    }
    
    // 最終進捗を更新
    await DB.prepare(`
      UPDATE ocr_jobs 
      SET processed_files = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(files.length, jobId).run();
    
    if (extractionResults.length === 0) {
      throw new Error('物件情報を抽出できませんでした');
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
const PROPERTY_EXTRACTION_PROMPT = `あなたは20年以上の経験を持つ不動産物件資料の情報抽出専門家です。
登記簿謄本、物件概要書、仲介資料などから、物件情報を高精度で抽出してください。

# 重要な抽出ルール

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

## 出力フォーマット

必ず以下のJSON形式で返してください。説明文やコメントは不要です。

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
    let bestValue: any = null;
    let maxScore = 0;
    
    for (const result of results) {
      const value = result[field];
      if (value && value !== null) {
        // 新形式の場合
        if (typeof value === 'object' && value.value !== null) {
          const confidence = value.confidence || 0.5;
          const length = String(value.value).length;
          const score = confidence * length;
          
          if (score > maxScore) {
            maxScore = score;
            bestValue = value;
          }
        } else {
          // 旧形式の場合
          const valueStr = String(value);
          if (valueStr.length > maxScore) {
            maxScore = valueStr.length;
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
