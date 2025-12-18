/**
 * Application Version Management
 */

export const APP_VERSION = 'v3.153.138';
export const BUILD_DATE = '2025-12-18';
export const BUILD_DESCRIPTION = 'Phase 2 Tokyo Wards Data: 11 VERIFIED municipalities with CSV import and E2E testing';

export function logVersion() {
  console.log(`%c========== ${APP_VERSION} ==========`, 'color: #4CAF50; font-weight: bold;');
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`Description: ${BUILD_DESCRIPTION}`);
}

export function getVersionQuery(): string {
  return `?v=${APP_VERSION}`;
}
