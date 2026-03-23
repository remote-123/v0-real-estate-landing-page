/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * Uses a sliding window per IP address. Works in serverless environments
 * because each instance maintains its own window — prevents obvious abuse
 * (multiple rapid-fire submissions from the same client) without requiring
 * Redis or any additional infrastructure.
 *
 * Usage:
 *   const result = checkRateLimit(ip, { limit: 5, windowMs: 60_000 })
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimitConfig {
  /** Max requests allowed within windowMs */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

// In-memory store: ip → array of timestamps
const store = new Map<string, number[]>()

// Cleanup old entries every 5 minutes to prevent unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, timestamps] of store.entries()) {
      // Remove keys where all timestamps are older than 10 minutes
      const recent = timestamps.filter((t) => now - t < 10 * 60_000)
      if (recent.length === 0) {
        store.delete(key)
      } else {
        store.set(key, recent)
      }
    }
  }, 5 * 60_000)
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 5, windowMs: 60_000 }
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  const timestamps = (store.get(identifier) ?? []).filter((t) => t > windowStart)
  timestamps.push(now)
  store.set(identifier, timestamps)

  const ok = timestamps.length <= config.limit
  const remaining = Math.max(0, config.limit - timestamps.length)
  const resetAt = timestamps[0] + config.windowMs

  return { ok, remaining, resetAt }
}

/**
 * Extract the best available IP from a Next.js Request object.
 * Respects Vercel's x-forwarded-for header.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
