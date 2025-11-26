import { Hono } from 'hono';
import { Bindings } from '../types';
import { extractJsonContentFromMessage, mergePropertyData, normalizePropertyExtraction } from '../utils/ocr';

const propertyOCR = new Hono<{ Bindings: Bindings }>();

/**
 * ArrayBufferをBase64文字列に変換（大容量ファイル対応）
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
 * 物件情報抽出用の改良版システムプロンプト
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
 * 複数ファイルから物件情報を抽出
 * POST /api/property-ocr/extract-multiple
 */
propertyOCR.post('/extract-multiple', async (c) => {
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
    
    // 各ファイルのバリデーション
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
    
    // OpenAI API Keyチェック
    const openaiApiKey = c.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return c.json({ 
        error: 'OpenAI API Keyが設定されていません',
        details: '管理者に連絡して、OpenAI API keyを設定してもらってください。環境変数 OPENAI_API_KEY が必要です'
      }, 500);
    }
    
    // 各ファイルをOCR処理
    const extractionResults: any[] = [];
    const processedFiles: string[] = [];
    
    for (const file of files) {
      try {
        // ファイルをBase64に変換
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = arrayBufferToBase64(arrayBuffer);
        const mimeType = file.type;
        
        // PDFとイメージの両方に対応
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
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
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });
        
        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error(`OpenAI API error for ${file.name}:`, errorText);
          continue;
        }
        
        let result: any;
        try {
          result = await openaiResponse.json();
        } catch (parseError) {
          console.error(`Failed to parse OpenAI response for ${file.name}:`, parseError);
          continue;
        }

        const message = result?.choices?.[0]?.message;

        if (message) {
          try {
            const parsed = extractJsonContentFromMessage(message.content);
            const normalized = normalizePropertyExtraction(parsed);
            extractionResults.push(normalized);
            processedFiles.push(file.name);
          } catch (parseError) {
            console.error(`JSON parse error for ${file.name}:`, parseError);
          }
        } else {
          console.error(`OpenAI response missing message content for ${file.name}:`, result);
        }
        
      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
      }
    }
    
    if (extractionResults.length === 0) {
      const failedFiles = files.map(f => f.name).filter(name => !processedFiles.includes(name));
      return c.json({ 
        error: '物件情報を抽出できませんでした',
        details: '有効な情報が含まれているファイルを確認してください。処理に失敗したファイル: ' + (failedFiles.length > 0 ? failedFiles.join(', ') : 'すべてのファイル')
      }, 500);
    }
    
    // 複数ファイルの結果を統合
    const mergedData = mergePropertyData(extractionResults);
    
    return c.json({
      success: true,
      data: mergedData,
      processed_files: processedFiles,
      total_files: files.length,
      message: `${processedFiles.length}個のファイルから物件情報を抽出しました`
    });
    
  } catch (error) {
    console.error('Property OCR error:', error);
    
    return c.json({ 
      error: '物件情報の抽出に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 単一ファイルから物件情報を抽出（互換性のため）
 * POST /api/property-ocr/extract
 */
propertyOCR.post('/extract', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'ファイルが必要です' }, 400);
    }
    
    // 単一ファイルを extract-multiple に転送
    const newFormData = new FormData();
    newFormData.append('file', file);
    
    // 内部的に extract-multiple を呼び出す
    const multipleResult = await propertyOCR.request('/extract-multiple', {
      method: 'POST',
      body: newFormData
    }, c.env);
    
    return multipleResult;
    
  } catch (error) {
    console.error('Property OCR error:', error);
    
    return c.json({ 
      error: '物件情報の抽出に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default propertyOCR;
