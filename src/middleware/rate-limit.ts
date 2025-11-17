import { Context } from 'hono'
import { Bindings } from '../types'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  keyGenerator?: (c: Context<{ Bindings: Bindings }>) => string
  skip?: (c: Context<{ Bindings: Bindings }>) => boolean
  message?: string
}

// In-memory store for rate limiting (for development)
// In production, use Cloudflare KV or Durable Objects
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiting middleware using sliding window algorithm
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyGenerator = (c) => {
      // Default: use IP address + user ID if authenticated
      const userId = c.get('userId') || 'anonymous'
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      return `${ip}:${userId}`
    },
    skip = () => false,
    message = 'Too many requests, please try again later'
  } = config

  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    // Skip rate limiting if configured
    if (skip(c)) {
      return await next()
    }

    const key = keyGenerator(c)
    const now = Date.now()

    // Get or create request count
    let record = requestCounts.get(key)

    // Reset if window has expired
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      }
    }

    // Increment count
    record.count++
    requestCounts.set(key, record)

    // Clean up expired entries periodically (every 1000 requests)
    if (requestCounts.size % 1000 === 0) {
      cleanupExpiredEntries()
    }

    // Check if rate limit exceeded
    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000)
      
      c.header('X-RateLimit-Limit', max.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', record.resetTime.toString())
      c.header('Retry-After', retryAfter.toString())

      return c.json({
        error: message,
        retryAfter: retryAfter
      }, 429)
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', (max - record.count).toString())
    c.header('X-RateLimit-Reset', record.resetTime.toString())

    await next()
  }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key)
    }
  }
}

/**
 * Preset rate limit configurations
 */
export const rateLimitPresets = {
  // Strict: 10 requests per minute
  strict: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: '厳格なレート制限: 1分あたり10リクエストまでです'
  }),

  // Standard: 100 requests per 15 minutes
  standard: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'レート制限: 15分あたり100リクエストまでです'
  }),

  // Generous: 1000 requests per hour
  generous: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1000,
    message: 'レート制限: 1時間あたり1000リクエストまでです'
  }),

  // Authentication: 5 login attempts per 15 minutes
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (c) => {
      const email = c.req.header('X-Login-Email') || 'unknown'
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      return `auth:${ip}:${email}`
    },
    message: 'ログイン試行回数が上限に達しました。15分後に再試行してください'
  }),

  // File upload: 20 uploads per hour
  upload: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'アップロード制限: 1時間あたり20ファイルまでです'
  }),

  // API calls: 500 requests per hour per user
  api: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 500,
    keyGenerator: (c) => {
      const userId = c.get('userId') || 'anonymous'
      return `api:${userId}`
    },
    message: 'API制限: 1時間あたり500リクエストまでです'
  })
}

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string) {
  const record = requestCounts.get(key)
  if (!record) {
    return null
  }

  const now = Date.now()
  if (now > record.resetTime) {
    return null
  }

  return {
    count: record.count,
    resetTime: record.resetTime,
    remainingTime: record.resetTime - now
  }
}

/**
 * Reset rate limit for a key (useful for testing or admin actions)
 */
export function resetRateLimit(key: string) {
  requestCounts.delete(key)
}

/**
 * Get all rate limit keys (for monitoring)
 */
export function getAllRateLimitKeys(): string[] {
  return Array.from(requestCounts.keys())
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  const now = Date.now()
  let activeKeys = 0
  let expiredKeys = 0

  for (const [, record] of requestCounts.entries()) {
    if (now <= record.resetTime) {
      activeKeys++
    } else {
      expiredKeys++
    }
  }

  return {
    totalKeys: requestCounts.size,
    activeKeys,
    expiredKeys
  }
}
