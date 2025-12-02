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
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `あなたは不動産物件資料のOCR専門家です。画像から以下の情報を漏れなく抽出してください：

【必須情報】
- 所在地（住所）
- 最寄駅・徒歩分数
- 土地面積（㎡・坪・単位含む）
- 用途地域
- 建蔽率・容積率
- 接道状況（方位・幅員・間口）
- 現況（更地・古家あり等）
- 価格（希望価格・想定価格）

【追加情報】
- 高度地区
- 防火地域・準防火地域
- 都市計画区域
- 地目
- 構造・階数
- 建築年月
- 設備
- 備考・特記事項

【注意事項】
- 数値は単位と共に正確に記録
- 曖昧な情報は「不明」と明記
- 複数の価格がある場合は全て記録
- 略語は展開して記録（例：「準防」→「準防火地域」）`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '上記の不動産物件資料から情報を抽出してください。見つからない項目は省略してください。'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
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
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `あなたは不動産物件情報の構造化エキスパートです。
与えられたテキストから以下のフィールドを抽出し、JSON形式で返してください。

【抽出ルール】
1. 数値フィールドは数値のみ（単位除外）
2. テキストフィールドは正確に記録（単位含む）
3. 複数候補がある場合は最も信頼性の高い値を選択
4. 見つからない項目は省略（nullや空文字は不要）
5. 曖昧な情報は最も妥当な解釈を選択

【フィールド定義】
{
  "location": "所在地（完全な住所）",
  "station": "最寄駅名（駅名のみ）",
  "walk_minutes": 徒歩分数（数値のみ、例：5）,
  "land_area": "土地面積（単位含む、例：100.00㎡）",
  "zoning": "用途地域（正式名称、例：第一種低層住居専用地域）",
  "building_coverage": "建蔽率（%含む、例：50%）",
  "floor_area_ratio": "容積率（%含む、例：100%）",
  "height_district": "高度地区（例：第1種高度地区）",
  "fire_zone": "防火地域（防火地域・準防火地域・なし）",
  "road_info": "接道状況（詳細、例：南側公道 幅員4.0m 間口8.5m）",
  "current_status": "現況（例：古家あり・更地・空地）",
  "desired_price": "価格（単位含む、例：2,800万円）"
}

【例】
入力：「所在地：東京都渋谷区〇〇1-2-3、最寄駅：渋谷駅徒歩8分、土地面積：100.00㎡（約30.25坪）、用途地域：第一種住居、建蔽率：60%、容積率：200%、接道：南側公道4m、現況：古家あり、価格：5,000万円」

出力：
{
  "location": "東京都渋谷区〇〇1-2-3",
  "station": "渋谷駅",
  "walk_minutes": 8,
  "land_area": "100.00㎡",
  "zoning": "第一種住居地域",
  "building_coverage": "60%",
  "floor_area_ratio": "200%",
  "road_info": "南側公道 幅員4m",
  "current_status": "古家あり",
  "desired_price": "5,000万円"
}`
            },
            {
              role: 'user',
              content: `以下のテキストから不動産物件情報を抽出してください：\n\n${rawText}`
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1000,
          temperature: 0.1
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
