import { Context } from 'hono'
import { Bindings } from '../types'

export const CURRENT_API_VERSION = 'v1'
export const SUPPORTED_VERSIONS = ['v1']
export const DEPRECATED_VERSIONS: string[] = []

/**
 * API version middleware
 * Extracts version from URL path or Accept-Version header
 */
export function apiVersionMiddleware() {
  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    // Extract version from URL path (/api/v1/...)
    const path = c.req.path
    const versionMatch = path.match(/\/api\/(v\d+)\//)
    const urlVersion = versionMatch ? versionMatch[1] : null

    // Extract version from Accept-Version header
    const headerVersion = c.req.header('Accept-Version')

    // Determine which version to use
    const requestedVersion = urlVersion || headerVersion || CURRENT_API_VERSION

    // Validate version
    if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
      return c.json({
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: SUPPORTED_VERSIONS,
        currentVersion: CURRENT_API_VERSION
      }, 400)
    }

    // Check if version is deprecated
    if (DEPRECATED_VERSIONS.includes(requestedVersion)) {
      c.header('Warning', `299 - "API version ${requestedVersion} is deprecated. Please upgrade to ${CURRENT_API_VERSION}"`)
      c.header('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()) // 90 days
    }

    // Set version in context
    c.set('apiVersion', requestedVersion)

    // Set API version headers
    c.header('X-API-Version', requestedVersion)
    c.header('X-API-Current-Version', CURRENT_API_VERSION)
    c.header('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '))

    await next()
  }
}

/**
 * Version-specific route helper
 * Returns true if the current API version matches
 */
export function isApiVersion(c: Context<{ Bindings: Bindings }>, version: string): boolean {
  const currentVersion = c.get('apiVersion') || CURRENT_API_VERSION
  return currentVersion === version
}

/**
 * Require specific API version
 */
export function requireApiVersion(version: string) {
  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    const currentVersion = c.get('apiVersion') || CURRENT_API_VERSION
    
    if (currentVersion !== version) {
      return c.json({
        error: `This endpoint requires API version ${version}`,
        currentVersion,
        requiredVersion: version
      }, 400)
    }

    await next()
  }
}

/**
 * Get API version info
 */
export function getApiVersionInfo() {
  return {
    current: CURRENT_API_VERSION,
    supported: SUPPORTED_VERSIONS,
    deprecated: DEPRECATED_VERSIONS,
    sunset: DEPRECATED_VERSIONS.length > 0 
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : null
  }
}
