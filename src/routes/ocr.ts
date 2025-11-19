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
  "property_name": "物件名称",
  "location": "完全な所在地",
  "station": "最寄り駅名",
  "walk_minutes": "徒歩分数（数値のみ）",
  "land_area": "土地面積（単位込み）",
  "building_area": "建物面積（単位込み）",
  "zoning": "用途地域（正式名称）",
  "building_coverage": "建蔽率（%込み）",
  "floor_area_ratio": "容積率（%込み）",
  "price": "価格（単位込み）",
  "structure": "構造（正式名称）",
  "built_year": "築年月",
  "road_info": "道路情報（詳細）",
  "current_status": "現況",
  "yield": "表面利回り（%込み）",
  "occupancy": "賃貸状況",
  "confidence": 0.85
}

**confidence フィールド**: 全体の抽出精度を0.0〜1.0で自己評価してください。
- 0.9以上: ほぼ全ての情報が明瞭に読み取れた
- 0.7〜0.9: 大部分の情報が読み取れたが、一部不明瞭
- 0.5〜0.7: 半分程度の情報しか読み取れなかった
- 0.5未満: 大部分が不明瞭または読み取り困難

抽出できない情報は必ず null にしてください。推測や創作は厳禁です。`;

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
