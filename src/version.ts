/**
 * Application Version Management
 */

export const APP_VERSION = 'v3.153.116';
export const BUILD_DATE = '2025-12-16';
export const BUILD_DESCRIPTION = 'EMERGENCY FIX: All 4 critical issues - Seller dropdown fallback, Risk check messages, OCR recall with force reset, Property info 30s timeout';

export function logVersion() {
  console.log(`%c========== ${APP_VERSION} ==========`, 'color: #4CAF50; font-weight: bold;');
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`Description: ${BUILD_DESCRIPTION}`);
}

export function getVersionQuery(): string {
  return `?v=${APP_VERSION}`;
}
