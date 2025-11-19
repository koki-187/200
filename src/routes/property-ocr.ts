import { Hono } from 'hono';
import { Bindings } from '../types';

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
 * 物件情報抽出用のシステムプロンプト
 */
const PROPERTY_EXTRACTION_PROMPT = `あなたは不動産物件資料の情報抽出専門家です。
画像またはPDFから物件情報を正確に抽出してください。

以下のJSON形式で情報を返してください：

{
  "property_name": "物件名称",
  "location": "所在地（都道府県市区町村から番地まで）",
  "station": "最寄り駅",
  "walk_minutes": "徒歩分数（数値のみ）",
  "land_area": "土地面積",
  "building_area": "建物面積",
  "zoning": "用途地域",
  "building_coverage": "建蔽率",
  "floor_area_ratio": "容積率",
  "price": "価格",
  "structure": "構造",
  "built_year": "築年月",
  "road_info": "道路情報",
  "current_status": "現況",
  "yield": "表面利回り",
  "occupancy": "賃貸状況"
}

重要なルール：
1. 抽出できない情報は null にしてください
2. 数値は文字列として返してください
3. 価格は「万円」「億円」などの単位も含めてください
4. 徒歩分数は数値のみ（例: "5"）
5. 複数の情報源がある場合は、最も詳細な情報を優先してください`;

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
            'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
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
    
    if (extractionResults.length === 0) {
      return c.json({ 
        error: '物件情報を抽出できませんでした',
        details: '有効な情報が含まれているファイルを確認してください'
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
 * 複数の抽出結果を統合
 * より詳細な情報を持つものを優先
 */
function mergePropertyData(results: any[]): any {
  const merged: any = {};
  
  // 各フィールドについて、最も詳細な情報を選択
  const fields = [
    'property_name', 'location', 'station', 'walk_minutes',
    'land_area', 'building_area', 'zoning', 'building_coverage',
    'floor_area_ratio', 'price', 'structure', 'built_year',
    'road_info', 'current_status', 'yield', 'occupancy'
  ];
  
  for (const field of fields) {
    let bestValue: any = null;
    let maxLength = 0;
    
    for (const result of results) {
      const value = result[field];
      if (value && value !== null) {
        const valueStr = String(value);
        if (valueStr.length > maxLength) {
          maxLength = valueStr.length;
          bestValue = value;
        }
      }
    }
    
    merged[field] = bestValue;
  }
  
  return merged;
}

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
