/**
 * Application Version Management
 */

export const APP_VERSION = 'v3.153.140';
export const BUILD_DATE = '2025-12-21';
export const BUILD_DESCRIPTION = 'Critical Bug Fixes: Duplicate data priority & address parser (市川市 support). E2E test success rate improved to 100%';

export function logVersion() {
  console.log(`%c========== ${APP_VERSION} ==========`, 'color: #4CAF50; font-weight: bold;');
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`Description: ${BUILD_DESCRIPTION}`);
}

export function getVersionQuery(): string {
  return `?v=${APP_VERSION}`;
}
