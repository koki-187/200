/**
 * Application Version Management
 */

export const APP_VERSION = 'v3.153.115';
export const BUILD_DATE = '2025-12-16';
export const BUILD_DESCRIPTION = 'CRITICAL FIX: Complete seller dropdown rewrite - simple, reliable, direct API call with fresh token';

export function logVersion() {
  console.log(`%c========== ${APP_VERSION} ==========`, 'color: #4CAF50; font-weight: bold;');
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`Description: ${BUILD_DESCRIPTION}`);
}

export function getVersionQuery(): string {
  return `?v=${APP_VERSION}`;
}
