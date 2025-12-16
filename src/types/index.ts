export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'ADMIN' | 'AGENT';
  company_name?: string;
  company_address?: string;
  position?: string;
  mobile_phone?: string;
  company_phone?: string;
  company_fax?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Deal {
  id: string;
  title: string;
  status: 'NEW' | 'IN_REVIEW' | 'REPLIED' | 'CLOSED';
  buyer_id: string;
  seller_id: string;
  location?: string;
  station?: string;
  walk_minutes?: number;
  land_area?: string;
  building_area?: string;
  frontage?: string;
  zoning?: string;
  building_coverage?: string;
  floor_area_ratio?: string;
  height_district?: string;
  fire_zone?: string;
  road_info?: string;
  structure?: string;
  built_year?: string;
  yield_rate?: string;
  occupancy_status?: string;
  current_status?: string;
  desired_price?: string;
  remarks?: string;
  missing_fields: string;
  reply_deadline?: string;
  purchase_check_result?: 'PASS' | 'FAIL' | 'SPECIAL_REVIEW';
  purchase_check_score?: number;
  is_special_case?: number;
  created_at: string;
  updated_at: string;
}

/**
 * OCR抽出データの標準フォーマット
 * @version v3.153.104 - Pattern 2実装
 */
export interface OCRExtractedField {
  value: string | null;
  confidence: number; // 0.0 - 1.0
}

export interface OCRExtractedData {
  property_name: OCRExtractedField;
  location: OCRExtractedField;
  station: OCRExtractedField;
  walk_minutes: OCRExtractedField;
  land_area: OCRExtractedField;
  building_area: OCRExtractedField;
  zoning: OCRExtractedField;
  building_coverage: OCRExtractedField;
  floor_area_ratio: OCRExtractedField;
  price: OCRExtractedField;
  structure: OCRExtractedField;
  built_year: OCRExtractedField;
  road_info: OCRExtractedField;
  height_district: OCRExtractedField;
  fire_zone: OCRExtractedField;
  frontage: OCRExtractedField;
  current_status: OCRExtractedField;
  yield: OCRExtractedField;
  occupancy: OCRExtractedField;
  overall_confidence: number; // 全体の信頼度スコア（数値）
}

/**
 * OCRバリデーション結果
 */
export interface OCRValidationResult {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
  errors: string[];
}

/**
 * OCRレスポンスの型ガード
 */
export function isOCRExtractedField(value: any): value is OCRExtractedField {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    'confidence' in value &&
    (value.value === null || typeof value.value === 'string') &&
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1
  );
}

/**
 * OCRデータの完全性検証
 */
export function validateOCRExtractedData(data: any): OCRValidationResult {
  const requiredFields = [
    'property_name', 'location', 'station', 'walk_minutes',
    'land_area', 'building_area', 'zoning', 'building_coverage',
    'floor_area_ratio', 'price', 'structure', 'built_year',
    'road_info', 'height_district', 'fire_zone', 'frontage',
    'current_status', 'yield', 'occupancy', 'overall_confidence'
  ];

  const missingFields: string[] = [];
  const invalidFields: string[] = [];
  const errors: string[] = [];

  // フィールド存在チェック
  for (const field of requiredFields) {
    if (!(field in data)) {
      missingFields.push(field);
      errors.push(`Missing field: ${field}`);
    } else if (field === 'overall_confidence') {
      // overall_confidenceは数値であるべき
      if (typeof data[field] !== 'number') {
        invalidFields.push(field);
        errors.push(`Invalid field: ${field} (expected number, got ${typeof data[field]})`);
      }
    } else {
      // その他のフィールドはOCRExtractedField形式であるべき
      if (!isOCRExtractedField(data[field])) {
        invalidFields.push(field);
        errors.push(`Invalid field: ${field} (expected {value, confidence} format)`);
      }
    }
  }

  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields,
    errors
  };
}

export interface Message {
  id: string;
  deal_id: string;
  sender_id: string;
  content: string;
  has_attachments: number;
  is_read_by_buyer: number;
  is_read_by_seller: number;
  created_at: string;
}

export interface FileRecord {
  id: string;
  deal_id: string;
  uploader_id: string;
  filename: string;
  file_type: 'OVERVIEW' | 'REGISTRY' | 'MAP' | 'REPORT' | 'OTHER';
  size_bytes: number;
  storage_path: string;
  is_archived: number;
  created_at: string;
}

export interface OCRJob {
  id: string;
  file_id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  raw_text?: string;
  mapped_json?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  deal_id?: string;
  type: 'NEW_DEAL' | 'NEW_MESSAGE' | 'DEADLINE' | 'MISSING_INFO';
  channel: 'EMAIL' | 'LINE';
  payload?: string;
  sent_at: string;
}

export interface Settings {
  id: number;
  openai_api_key?: string;
  workdays: string;
  holidays: string;
  max_storage_per_deal: number;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  deal_id: string;
  buyer_profile?: string;
  cf_data?: string;
  summary?: string;
  strengths?: string;
  risks?: string;
  cf_summary?: string;
  proposal_text?: string;
  meeting_points?: string;
  email_draft?: string;
  created_at: string;
  updated_at: string;
}

export type Bindings = {
  DB: D1Database;
  FILES_BUCKET: R2Bucket;
  FILES_BUCKET_BACKUP: R2Bucket;
  OPENAI_API_KEY: string;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
  MLIT_API_KEY?: string;
  SENTRY_DSN?: string;
};

export interface JWTPayload {
  userId: string;
  role: 'ADMIN' | 'AGENT';
  exp: number;
}
