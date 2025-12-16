/**
 * Application Version Management
 * 
 * バージョン情報の一元管理
 */

export const APP_VERSION = 'v3.153.111';
export const BUILD_DATE = '2025-12-16';
export const BUILD_DESCRIPTION = 'CRITICAL FIX: CSP allow external APIs (Nominatim, OpenAI, MLIT), Seller dropdown failsafe mechanism';

export function logVersion() {
  console.log(`%c========== ${APP_VERSION} ==========`, 'color: #4CAF50; font-weight: bold;');
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`Description: ${BUILD_DESCRIPTION}`);
}

export function getVersionQuery(): string {
  return `?v=${APP_VERSION}`;
}
