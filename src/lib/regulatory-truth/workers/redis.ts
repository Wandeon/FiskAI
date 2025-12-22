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

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping()
    return pong === "PONG"
  } catch {
    return false
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  await redis.quit()
}
