// lib/redis.ts

import { Redis } from "@upstash/redis"

// Singleton Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Get cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return (data as T) ?? null
  } catch (error) {
    console.error("Redis cacheGet error:", error)
    return null
  }
}

/**
 * Set cached value with TTL (seconds)
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (error) {
    console.error("Redis cacheSet error:", error)
  }
}

/**
 * Sliding window rate limiter
 */
export async function rateLimitCheck(
  key: string,
  maxPerWindow: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const redisKey = `ratelimit:${key}`

  try {
    // Remove old requests
    await redis.zremrangebyscore(redisKey, 0, windowStart)

    // Count current requests
    const current = await redis.zcard(redisKey)

    if (current >= maxPerWindow) {
      return { allowed: false, remaining: 0 }
    }

    // Add current request
    await redis.zadd(redisKey, {
      score: now,
      member: `${now}-${Math.random()}`,
    })

    // Ensure key expires
    await redis.expire(redisKey, windowSeconds)

    return {
      allowed: true,
      remaining: maxPerWindow - current - 1,
    }
  } catch (error) {
    console.error("Redis rateLimit error:", error)

    // Fail open
    return { allowed: true, remaining: maxPerWindow }
  }
}
