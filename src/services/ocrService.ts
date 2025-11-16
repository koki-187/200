import type { Env, OCRMappedFields } from '../types';

/**
 * OCRサービス - OpenAI Vision APIを使用してテキスト抽出と項目マッピング
 */
export class OCRService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 画像からテキストを抽出
   */
  async extractText(imageBase64: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'この不動産物件資料の画像から、すべてのテキストを抽出してください。特に以下の情報に注目してください：所在地、最寄駅、徒歩分数、土地面積、用途地域、建蔽率、容積率、高度地区、防火地域、接道状況、現況、価格。'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw error;
    }
  }

  /**
   * 抽出したテキストから項目をマッピング
   */
  async mapToFields(rawText: string): Promise<OCRMappedFields> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `あなたは不動産物件情報の構造化エキスパートです。
与えられたテキストから以下のフィールドを抽出し、JSON形式で返してください。
抽出できない項目は省略してください。

出力形式：
{
  "location": "所在地（住所）",
  "station": "最寄駅名",
  "walk_minutes": 徒歩分数（数値のみ）,
  "land_area": "土地面積（単位含む）",
  "zoning": "用途地域",
  "building_coverage": "建蔽率",
  "floor_area_ratio": "容積率",
  "height_district": "高度地区",
  "fire_zone": "防火・準防火地域",
  "road_info": "接道状況（方位・幅員・間口など）",
  "current_status": "現況（更地・古家ありなど）",
  "desired_price": "希望価格"
}`
            },
            {
              role: 'user',
              content: rawText
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0].message.content;
      
      return JSON.parse(content) as OCRMappedFields;
    } catch (error) {
      console.error('OCR mapping error:', error);
      throw error;
    }
  }

  /**
   * 画像から直接フィールドマッピングを実行
   */
  async processImage(imageBase64: string): Promise<{ rawText: string; mappedFields: OCRMappedFields }> {
    const rawText = await this.extractText(imageBase64);
    const mappedFields = await this.mapToFields(rawText);
    
    return { rawText, mappedFields };
  }
}

/**
 * OCRサービスのインスタンスを取得
 */
export function getOCRService(env: Env): OCRService {
  return new OCRService(env.OPENAI_API_KEY);
}
