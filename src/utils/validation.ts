/**
 * 入力バリデーションユーティリティ
 * フロントエンド・バックエンド共通で使用可能
 */

import { z } from 'zod'
import { ValidationError } from '../types/api'

/**
 * Zodスキーマのバリデーション結果
 */
export interface ZodValidationResult<T> {
  success: boolean
  data?: T
  errors?: Array<{
    path: string
    message: string
  }>
}

/**
 * Zodスキーマを使ったバリデーション
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ZodValidationResult<T> {
  try {
    const result = schema.parse(data)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      }
    }
    return {
      success: false,
      errors: [{ path: '', message: 'バリデーションエラー' }],
    }
  }
}

/**
 * ログインスキーマ
 */
export const loginSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
  rememberMe: z.boolean().optional(),
})

/**
 * ユーザー登録スキーマ
 */
export const registerSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
  name: z.string().min(2, '名前は2文字以上である必要があります').max(100, '名前は100文字以下である必要があります'),
  role: z.enum(['ADMIN', 'AGENT']).optional(),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  position: z.string().optional(),
  mobile_phone: z.string().optional(),
  company_phone: z.string().optional(),
  company_fax: z.string().optional(),
})

/**
 * 物件作成スキーマ
 */
export const dealCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以下である必要があります'),
  buyer_id: z.string().optional(),
  seller_id: z.string().min(1, '売主を選択してください'),
  location: z.string().optional(),
  station: z.string().optional(),
  walk_minutes: z.union([z.string(), z.number()]).optional(),
  land_area: z.union([z.string(), z.number()]).optional(),
  building_area: z.union([z.string(), z.number()]).optional(),
  zoning: z.string().optional(),
  building_coverage: z.union([z.string(), z.number()]).optional(),
  floor_area_ratio: z.union([z.string(), z.number()]).optional(),
  height_district: z.string().optional(),
  fire_zone: z.string().optional(),
  road_info: z.string().optional(),
  frontage: z.union([z.string(), z.number()]).optional(),
  structure: z.string().optional(),
  built_year: z.union([z.string(), z.number()]).optional(),
  yield_rate: z.union([z.string(), z.number()]).optional(),
  occupancy_status: z.string().optional(),
  current_status: z.string().optional(),
  desired_price: z.union([z.string(), z.number()]).optional(),
  remarks: z.string().optional(),
  missing_fields: z.string().optional(),
  reply_deadline: z.string().optional(),
})

/**
 * 物件スキーマ（完全版）
 */
export const dealSchema = dealCreateSchema.extend({
  id: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED']),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

/**
 * 物件更新スキーマ
 */
export const dealUpdateSchema = dealCreateSchema.partial()

/**
 * メッセージスキーマ
 */
export const messageSchema = z.object({
  deal_id: z.string(),
  sender_id: z.string(),
  content: z.string().min(1, 'メッセージは必須です'),
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  file_size: z.number().optional(),
  file_type: z.string().optional(),
})

/**
 * HTMLエスケープ関数
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * バリデーション結果型
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * バリデーションルール型
 */
export type ValidationRule<T = unknown> = (value: T) => string | null

/**
 * 共通バリデーションルール
 */
export const ValidationRules = {
  /**
   * 必須チェック
   */
  required: (fieldName: string): ValidationRule<unknown> => {
    return (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return `${fieldName}は必須です`
      }
      return null
    }
  },
  
  /**
   * 最小文字数チェック
   */
  minLength: (fieldName: string, min: number): ValidationRule<string> => {
    return (value: string) => {
      if (value && value.length < min) {
        return `${fieldName}は${min}文字以上である必要があります`
      }
      return null
    }
  },
  
  /**
   * 最大文字数チェック
   */
  maxLength: (fieldName: string, max: number): ValidationRule<string> => {
    return (value: string) => {
      if (value && value.length > max) {
        return `${fieldName}は${max}文字以下である必要があります`
      }
      return null
    }
  },
  
  /**
   * メールアドレス形式チェック
   */
  email: (fieldName: string): ValidationRule<string> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return (value: string) => {
      if (value && !emailRegex.test(value)) {
        return `${fieldName}の形式が正しくありません`
      }
      return null
    }
  },
  
  /**
   * 数値範囲チェック
   */
  range: (fieldName: string, min: number, max: number): ValidationRule<number> => {
    return (value: number) => {
      if (value !== undefined && value !== null) {
        if (value < min || value > max) {
          return `${fieldName}は${min}から${max}の範囲である必要があります`
        }
      }
      return null
    }
  },
  
  /**
   * 正の数チェック
   */
  positive: (fieldName: string): ValidationRule<number> => {
    return (value: number) => {
      if (value !== undefined && value !== null && value <= 0) {
        return `${fieldName}は正の数である必要があります`
      }
      return null
    }
  },
  
  /**
   * URLフォーマットチェック
   */
  url: (fieldName: string): ValidationRule<string> => {
    return (value: string) => {
      if (value) {
        try {
          new URL(value)
        } catch {
          return `${fieldName}の形式が正しくありません`
        }
      }
      return null
    }
  },
  
  /**
   * パターンマッチチェック
   */
  pattern: (fieldName: string, pattern: RegExp, message?: string): ValidationRule<string> => {
    return (value: string) => {
      if (value && !pattern.test(value)) {
        return message || `${fieldName}の形式が正しくありません`
      }
      return null
    }
  },
  
  /**
   * カスタムバリデーション
   */
  custom: <T>(validator: (value: T) => string | null): ValidationRule<T> => {
    return validator
  },
}

/**
 * バリデーションスキーマ型
 */
export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[]
}

/**
 * オブジェクトをバリデーション
 */
export function validate<T extends Record<string, unknown>>(
  data: T,
  schema: ValidationSchema<T>
): ValidationResult {
  const errors: ValidationError[] = []
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    const fieldRules = rules as ValidationRule[]
    
    for (const rule of fieldRules) {
      const error = rule(value)
      if (error) {
        errors.push({
          field,
          message: error,
          code: 'VALIDATION_ERROR',
        })
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * フォームバリデーション用ヘルパー
 */
export class FormValidator<T extends Record<string, unknown>> {
  private schema: ValidationSchema<T>
  
  constructor(schema: ValidationSchema<T>) {
    this.schema = schema
  }
  
  /**
   * 全フィールドをバリデーション
   */
  validate(data: T): ValidationResult {
    return validate(data, this.schema)
  }
  
  /**
   * 単一フィールドをバリデーション
   */
  validateField(field: keyof T, value: T[keyof T]): string | null {
    const rules = this.schema[field]
    if (!rules) return null
    
    for (const rule of rules) {
      const error = rule(value)
      if (error) return error
    }
    
    return null
  }
  
  /**
   * エラーメッセージをフィールドごとに取得
   */
  getFieldErrors(result: ValidationResult): Record<string, string> {
    const fieldErrors: Record<string, string> = {}
    
    for (const error of result.errors) {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = error.message
      }
    }
    
    return fieldErrors
  }
}

/**
 * よく使うバリデーションスキーマ
 */
export const CommonSchemas = {
  /**
   * ログインフォーム
   */
  login: {
    email: [
      ValidationRules.required('メールアドレス'),
      ValidationRules.email('メールアドレス'),
    ],
    password: [
      ValidationRules.required('パスワード'),
      ValidationRules.minLength('パスワード', 6),
    ],
  },
  
  /**
   * ユーザー登録フォーム
   */
  register: {
    email: [
      ValidationRules.required('メールアドレス'),
      ValidationRules.email('メールアドレス'),
    ],
    password: [
      ValidationRules.required('パスワード'),
      ValidationRules.minLength('パスワード', 8),
    ],
    name: [
      ValidationRules.required('名前'),
      ValidationRules.minLength('名前', 2),
      ValidationRules.maxLength('名前', 100),
    ],
  },
  
  /**
   * 物件情報フォーム
   */
  deal: {
    property_name: [
      ValidationRules.required('物件名'),
      ValidationRules.maxLength('物件名', 200),
    ],
    location: [
      ValidationRules.required('所在地'),
      ValidationRules.maxLength('所在地', 500),
    ],
    land_area: [
      ValidationRules.required('土地面積'),
      ValidationRules.positive('土地面積'),
    ],
    price: [
      ValidationRules.required('価格'),
      ValidationRules.positive('価格'),
    ],
  },
}
