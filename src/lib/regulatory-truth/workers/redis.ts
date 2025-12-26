// src/lib/regulatory-truth/workers/redis.ts
import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

// Shared connection for all queues
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
})

// Separate connection for workers (BullMQ requirement)
export function createWorkerConnection(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

// Health check with timeout protection
export async function checkRedisHealth(timeoutMs: number = 2000): Promise<boolean> {
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Redis ping timeout")), timeoutMs)
      ),
    ])
    return pong === "PONG"
  } catch {
    return false
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  await redis.quit()
}

// ============================================================================
// DRAINER HEARTBEAT (PR #90 fix: stall detection)
// ============================================================================

const DRAINER_HEARTBEAT_KEY = "regulatory-truth:drainer:heartbeat"
const DRAINER_STATS_KEY = "regulatory-truth:drainer:stats"

export interface DrainerHeartbeat {
  lastActivity: string // ISO timestamp
  queueName: string // Which queue was last processed
  itemsProcessed: number // Total items processed this session
  cycleCount: number // Number of drain cycles
}

/**
 * Update drainer heartbeat in Redis (called after each successful operation)
 */
export async function updateDrainerHeartbeat(data: DrainerHeartbeat): Promise<void> {
  await redis.set(DRAINER_HEARTBEAT_KEY, JSON.stringify(data))
  // Also update individual stage timestamps
  await redis.hset(DRAINER_STATS_KEY, {
    lastActivity: data.lastActivity,
    lastQueue: data.queueName,
    itemsProcessed: String(data.itemsProcessed),
    cycleCount: String(data.cycleCount),
  })
}

/**
 * Get drainer heartbeat from Redis
 */
export async function getDrainerHeartbeat(): Promise<DrainerHeartbeat | null> {
  const data = await redis.get(DRAINER_HEARTBEAT_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as DrainerHeartbeat
  } catch {
    return null
  }
}

/**
 * Get time since last drainer activity in minutes
 */
export async function getDrainerIdleMinutes(): Promise<number> {
  const heartbeat = await getDrainerHeartbeat()
  if (!heartbeat) {
    // No heartbeat means drainer hasn't started or crashed before first heartbeat
    return Infinity
  }
  const lastActivity = new Date(heartbeat.lastActivity)
  const now = new Date()
  return (now.getTime() - lastActivity.getTime()) / (1000 * 60)
}
