import { Hono } from 'hono';
import type { Bindings } from '../types';

const ocr = new Hono<{ Bindings: Bindings }>();

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

// 複数ファイル対応のOCR処理
ocr.post('/extract', async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    
    // 後方互換性: 'file' フィールドもサポート
    if (files.length === 0) {
      const singleFile = formData.get('file') as File;
      if (singleFile) {
        files.push(singleFile);
      }
    }
    
    if (files.length === 0) {
      return c.json({ error: 'ファイルが指定されていません' }, 400);
    }

    const openaiApiKey = c.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API keyが設定されていません' }, 500);
    }

    const results = [];

    // 各ファイルを処理
    for (const file of files) {
      try {
        // ファイルをBase64に変換
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = file.type || 'image/jpeg';

        // PDFと画像の両方に対応
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                      url: `data:${mimeType};base64,${base64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error:', errorText);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // JSONを抽出
        let extracted;
        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          extracted = JSON.parse(jsonString);
        } catch (e) {
          console.error('JSON parse error:', e);
          continue;
        }

        results.push({
          fileName: file.name,
          success: true,
          extracted: extracted
        });
      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
      }
    }

    if (results.length === 0) {
      return c.json({ 
        error: '物件情報を抽出できませんでした',
        details: '有効な情報が含まれているファイルを確認してください'
      }, 500);
    }

    return c.json({ 
      success: true,
      results: results,
      count: results.length,
      // 単一ファイルの場合は後方互換性のためextractedフィールドも返す
      extracted: results.length === 1 ? results[0].extracted : undefined
    });

  } catch (error) {
    console.error('OCR error:', error);
    return c.json({ 
      error: 'OCR処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default ocr;
