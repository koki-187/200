/**
 * Application Version Management - v3.149.0
 * 
 * バージョン情報の一元管理
 * 複数箇所での手動更新を避け、メンテナンス性を向上
 */

export const APP_VERSION = 'v3.153.45';
export const BUILD_DATE = '2025-12-10';
export const BUILD_DESCRIPTION = 'CRITICAL OCR DEBUG - Enhanced text extraction instructions and comprehensive API response logging';

/**
 * バージョン情報をコンソールに出力
 */
export function logVersion() {
  console.log(`%c========== ${APP_VERSION} ==========`, 'color: #4CAF50; font-weight: bold;');
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`Description: ${BUILD_DESCRIPTION}`);
}

/**
 * バージョンクエリパラメータを生成（キャッシュバスティング用）
 */
export function getVersionQuery(): string {
  return `?v=${APP_VERSION}`;
}
