/**
 * Application Version Management - v3.149.0
 * 
 * バージョン情報の一元管理
 * 複数箇所での手動更新を避け、メンテナンス性を向上
 */

export const APP_VERSION = '3.149.1';
export const BUILD_DATE = '2025-12-05';
export const BUILD_DESCRIPTION = 'Debug log optimization, version management automation, error handling improvement';

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
