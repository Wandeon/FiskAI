// src/lib/infra/redis.ts
/**
 * Shared Redis Infrastructure Module
 *
 * Provides Redis connectivity for the entire application including:
 * - App code (rate limiting, email sync, outbox)
 * - Background workers (BullMQ queues)
 * - Regulatory Truth Layer
 *
 * This module is the canonical source for Redis connections.
 * All other modules should import from here.
 */

import Redis, { RedisOptions } from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

/**
 * Parse a Redis URL into ioredis connection options.
 * Supports: redis://host:port/db, redis://:pass@host, redis://user:pass@host, rediss:// (TLS)
 */
export function buildRedisOptions(redisUrl: string): RedisOptions {
  const u = new URL(redisUrl)

  const port = u.port ? Number(u.port) : 6379
  const db = u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0

  // ioredis uses `username` + `password` for ACL auth (Redis 6+)
  const username = u.username ? decodeURIComponent(u.username) : undefined
  const password = u.password ? decodeURIComponent(u.password) : undefined

  const opts: RedisOptions = {
    host: u.hostname,
    port,
    db,
    username,
    password,

    // Required by BullMQ
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }

  // TLS if using rediss://
  if (u.protocol === "rediss:") {
    opts.tls = {}
  }

  return opts
}

/**
 * Redis connection options (NOT a live instance)
 * Pass these to BullMQ Queue/Worker constructors
 */
export const redisConnectionOptions: RedisOptions = buildRedisOptions(REDIS_URL)

/**
 * BullMQ prefix for all queues/workers
 */
export const BULLMQ_PREFIX = process.env.BULLMQ_PREFIX || "fiskai"

/**
 * Get BullMQ connection options (for Queue and Worker constructors)
 */
export function getBullMqOptions() {
  return {
    connection: redisConnectionOptions,
    prefix: BULLMQ_PREFIX,
  }
}

// Lazy-loaded Redis instance to avoid Next.js build issues with worker threads
let _redis: Redis | null = null

/**
 * Get the shared Redis instance (lazy-loaded)
 * Use this for non-BullMQ operations (heartbeats, version tracking, rate limiting)
 */
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      ...redisConnectionOptions,
      lazyConnect: true, // Don't connect until first command
    })
  }
  return _redis
}

/**
 * Shared Redis instance - uses lazy loading via Proxy
 * This is the backwards-compatible export that can be used like the old redis instance
 */
export const redis: Redis = new Proxy({} as Redis, {
  get(_, prop: string | symbol) {
    const instance = getRedis()
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === "function") {
      return value.bind(instance)
    }
    return value
  },
})

/**
 * Create a separate Redis connection for workers (BullMQ requirement)
 * Each BullMQ worker needs its own connection
 */
export function createWorkerConnection(): Redis {
  return new Redis(redisConnectionOptions)
}

/**
 * Health check with timeout protection
 */
export async function checkRedisHealth(timeoutMs: number = 2000): Promise<boolean> {
  try {
    const pong = await Promise.race([
      getRedis().ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Redis ping timeout")), timeoutMs)
      ),
    ])
    return pong === "PONG"
  } catch {
    return false
  }
}

/**
 * Graceful shutdown - close the shared Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit()
    _redis = null
  }
}
