import { nanoid } from 'nanoid';

/**
 * ユニークIDの生成
 */
export function generateId(prefix?: string): string {
  const id = nanoid(12);
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * 未入力フィールドの計算
 */
export function calculateMissingFields(deal: any): string[] {
  const requiredFields = [
    'location',
    'station',
    'walk_minutes',
    'land_area',
    'zoning',
    'building_coverage',
    'floor_area_ratio',
    'road_info',
    'current_status',
    'desired_price'
  ];
  
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (!deal[field] || deal[field] === '' || deal[field] === null) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * エラーレスポンスの生成
 */
export function errorResponse(message: string, status: number = 500) {
  return {
    error: message,
    status
  };
}

/**
 * 成功レスポンスの生成
 */
export function successResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message
  };
}

/**
 * 日時フォーマット
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * フィールド名の日本語表示
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    'location': '所在地',
    'station': '最寄駅',
    'walk_minutes': '徒歩分数',
    'land_area': '土地面積',
    'zoning': '用途地域',
    'building_coverage': '建蔽率',
    'floor_area_ratio': '容積率',
    'height_district': '高度地区',
    'fire_zone': '防火・準防火',
    'road_info': '接道状況',
    'current_status': '現況',
    'desired_price': '希望価格'
  };
  
  return labels[fieldName] || fieldName;
}

/**
 * JSON文字列の安全なパース
 */
export function safeJSONParse<T>(jsonString: string | null, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * ステータスバッジの色を取得
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'NEW': 'blue',
    'IN_REVIEW': 'yellow',
    'REPLIED': 'green',
    'CLOSED': 'gray'
  };
  
  return colors[status] || 'gray';
}

/**
 * 期限ステータスの色を取得
 */
export function getDeadlineColor(status: string): string {
  const colors: Record<string, string> = {
    'IN_TIME': 'green',
    'WARNING': 'yellow',
    'OVERDUE': 'red'
  };
  
  return colors[status] || 'gray';
}
