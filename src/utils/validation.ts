import { z } from 'zod';

/**
 * Zodバリデーションスキーマ定義
 */

// ユーザー認証スキーマ
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください')
    .regex(/[A-Z]/, 'パスワードには大文字を含めてください')
    .regex(/[a-z]/, 'パスワードには小文字を含めてください')
    .regex(/[0-9]/, 'パスワードには数字を含めてください'),
  name: z.string().min(1, '名前を入力してください').max(100, '名前は100文字以内で入力してください'),
  role: z.enum(['ADMIN', 'AGENT'], { errorMap: () => ({ message: '有効な役割を選択してください' }) }),
  company_name: z.string().max(200, '会社名は200文字以内で入力してください').optional(),
  company_address: z.string().max(500, '会社住所は500文字以内で入力してください').optional(),
  position: z.string().max(100, '役職は100文字以内で入力してください').optional(),
  mobile_phone: z.string().max(20, '携帯電話番号は20文字以内で入力してください').optional(),
  company_phone: z.string().max(20, '会社電話番号は20文字以内で入力してください').optional(),
  company_fax: z.string().max(20, 'FAX番号は20文字以内で入力してください').optional()
});

// 案件関連スキーマ
export const dealSchema = z.object({
  title: z.string().min(1, '案件名を入力してください').max(200, '案件名は200文字以内で入力してください'),
  seller_id: z.string().min(1, '売主担当者を選択してください'),
  status: z.enum(['NEW', 'IN_REVIEW', 'REVIEWING', 'REPLIED', 'NEGOTIATING', 'CONTRACTED', 'REJECTED', 'CLOSED'], { 
    errorMap: () => ({ message: '有効なステータスを選択してください' }) 
  }).optional(),
  location: z.string().max(500, '所在地は500文字以内で入力してください').optional(),
  land_area: z.string().max(100, '面積は100文字以内で入力してください').optional(),
  zoning: z.string().max(100, '用途地域は100文字以内で入力してください').optional(),
  building_coverage: z.string().max(50, '建蔽率は50文字以内で入力してください').optional(),
  floor_area_ratio: z.string().max(50, '容積率は50文字以内で入力してください').optional(),
  height_district: z.string().max(100, '高度地区は100文字以内で入力してください').optional(),
  fire_zone: z.string().max(100, '防火地域は100文字以内で入力してください').optional(),
  road_info: z.string().max(500, '接道状況は500文字以内で入力してください').optional(),
  frontage: z.string().max(50, '間口は50文字以内で入力してください').optional(),
  building_area: z.string().max(100, '建物面積は100文字以内で入力してください').optional(),
  structure: z.string().max(100, '構造は100文字以内で入力してください').optional(),
  built_year: z.string().max(50, '築年月は50文字以内で入力してください').optional(),
  yield_rate: z.string().max(50, '利回りは50文字以内で入力してください').optional(),
  occupancy_status: z.string().max(100, '賃貸状況は100文字以内で入力してください').optional(),
  current_status: z.string().max(200, '現況は200文字以内で入力してください').optional(),
  current_use: z.string().max(200, '現況は200文字以内で入力してください').optional(),
  station: z.string().max(200, '最寄駅は200文字以内で入力してください').optional(),
  walk_minutes: z.union([z.number().int().min(0).max(999), z.string()]).optional().transform(val => {
    if (typeof val === 'string') {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }
    return val;
  }),
  desired_price: z.string().max(100, '希望価格は100文字以内で入力してください').optional(),
  remarks: z.string().max(2000, '備考は2000文字以内で入力してください').optional()
});

// 初回6情報の必須チェック用スキーマ
// 1. 所在地（住居表示／地番）・最寄駅
// 2. 面積（実測／公簿）
// 3. 用途・建蔽・容積・高度・防火
// 4. 接道（方位・幅員・間口）
// 5. 現況
// 6. 希望価格
export const requiredInitialInfoSchema = z.object({
  // 1. 所在地・最寄駅
  location: z.string().min(1, '【必須】所在地を入力してください').max(500, '所在地は500文字以内で入力してください'),
  station: z.string().min(1, '【必須】最寄駅を入力してください').max(200, '最寄駅は200文字以内で入力してください'),
  
  // 2. 面積（実測／公簿）
  land_area: z.string().min(1, '【必須】土地面積を入力してください').max(100, '面積は100文字以内で入力してください'),
  
  // 3. 用途・建蔽・容積・高度・防火
  zoning: z.string().min(1, '【必須】用途地域を入力してください').max(100, '用途地域は100文字以内で入力してください'),
  building_coverage: z.string().min(1, '【必須】建蔽率を入力してください').max(50, '建蔽率は50文字以内で入力してください'),
  floor_area_ratio: z.string().min(1, '【必須】容積率を入力してください').max(50, '容積率は50文字以内で入力してください'),
  height_district: z.string().max(100, '高度地区は100文字以内で入力してください').optional(),
  fire_zone: z.string().min(1, '【必須】防火地域区分を入力してください').max(100, '防火地域は100文字以内で入力してください'),
  
  // 4. 接道（方位・幅員・間口）
  road_info: z.string().min(1, '【必須】接道状況（方位・幅員）を入力してください').max(500, '接道状況は500文字以内で入力してください'),
  frontage: z.string().min(1, '【必須】間口を入力してください').max(50, '間口は50文字以内で入力してください'),
  
  // 5. 現況
  current_status: z.string().min(1, '【必須】現況を入力してください').max(200, '現況は200文字以内で入力してください'),
  
  // 6. 希望価格
  desired_price: z.string().min(1, '【必須】希望価格を入力してください').max(100, '希望価格は100文字以内で入力してください')
});

// 通常の案件作成スキーマに初回6情報の必須チェックを統合
export const dealCreateSchema = dealSchema.merge(requiredInitialInfoSchema);

export const dealUpdateSchema = dealSchema.partial().extend({
  id: z.string().min(1, '案件IDが必要です')
});

// メッセージスキーマ
export const messageSchema = z.object({
  deal_id: z.string().min(1, '案件IDが必要です'),
  content: z.string().min(1, 'メッセージを入力してください').max(5000, 'メッセージは5000文字以内で入力してください')
});

// ファイルアップロードスキーマ（メタデータ検証）
export const fileMetadataSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(10 * 1024 * 1024), // 10MB
  type: z.string().regex(/^(application\/pdf|image\/(jpeg|jpg|png|gif)|application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|application\/zip|text\/plain)$/, 
    '許可されていないファイル形式です')
});

// 設定スキーマ
export const businessDaysSchema = z.object({
  business_days: z.array(z.number().int().min(0).max(6)).min(1, '最低1つの営業日を選択してください')
});

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '有効な日付形式（YYYY-MM-DD）で入力してください'),
  description: z.string().min(1, '説明を入力してください').max(200, '説明は200文字以内で入力してください')
});

export const storageLimitSchema = z.object({
  storage_limit_mb: z.number().int().min(10).max(1000)
});

// Proposal スキーマ
export const proposalSchema = z.object({
  deal_id: z.string().min(1, '案件IDが必要です'),
  buyer_profile: z.object({
    budget: z.string().optional(),
    preferences: z.string().optional(),
    timeline: z.string().optional()
  }).optional()
});

// OCR スキーマ
export const ocrSchema = z.object({
  file_type: z.enum(['image', 'pdf']),
  file_size: z.number().int().positive().max(10 * 1024 * 1024)
});

// 通知スキーマ
export const notificationFilterSchema = z.object({
  type: z.enum(['ALL', 'NEW_DEAL', 'NEW_MESSAGE', 'DEADLINE', 'MISSING_INFO']).optional(),
  is_read: z.boolean().optional()
});

/**
 * バリデーションヘルパー関数
 */

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: string[] 
} {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['バリデーションエラーが発生しました'] };
  }
}

/**
 * XSS対策: HTMLエスケープ
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * SQLインジェクション対策: パラメータ化クエリを強制
 * （注意: D1では自動的にパラメータ化されますが、明示的にチェック）
 */
export function sanitizeSqlInput(input: string): string {
  // D1はパラメータ化クエリを使用するため、ここではログ用のサニタイズのみ
  return input.replace(/[';\-\-]/g, '');
}

/**
 * ファイル名のサニタイズ
 */
export function sanitizeFilename(filename: string): string {
  // 危険な文字を削除
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

/**
 * パス・トラバーサル対策
 */
export function isValidPath(path: string): boolean {
  // ../ や .\ を含まないことを確認
  return !/\.\.[/\\]/.test(path);
}
