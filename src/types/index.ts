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
