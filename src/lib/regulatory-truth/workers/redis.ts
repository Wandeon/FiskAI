// src/lib/regulatory-truth/workers/redis.ts
/**
 * Regulatory Truth Layer Redis Module
 *
 * Re-exports core Redis functionality from the shared infra module
 * and provides RTL-specific heartbeat tracking functionality.
 *
 * MIGRATION NOTE: Core Redis functionality has been moved to @/lib/infra/redis.
 * This file re-exports from there for backwards compatibility.
 * New code should import directly from @/lib/infra/redis.
 */

// Re-export all core Redis functionality from shared infra module
export {
  buildRedisOptions,
  redisConnectionOptions,
  BULLMQ_PREFIX,
  getBullMqOptions,
  getRedis,
  redis,
  createWorkerConnection,
  checkRedisHealth,
  closeRedis,
} from "@/lib/infra/redis"

// Import getRedis for use in RTL-specific functions below
import { getRedis } from "@/lib/infra/redis"

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
  await getRedis().set(DRAINER_HEARTBEAT_KEY, JSON.stringify(data))
  // Also update individual stage timestamps
  await getRedis().hset(DRAINER_STATS_KEY, {
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
  const data = await getRedis().get(DRAINER_HEARTBEAT_KEY)
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

// ============================================================================
// PER-STAGE HEARTBEAT TRACKING (Issue #807 fix)
// ============================================================================

const DRAINER_STAGES_KEY = "regulatory-truth:drainer:stages"

export interface StageHeartbeat {
  stage: string
  lastActivity: string // ISO timestamp
  itemsProcessed: number
  avgDurationMs: number
  lastError?: string
}

export async function updateStageHeartbeat(data: StageHeartbeat): Promise<void> {
  await getRedis().hset(DRAINER_STAGES_KEY, {
    [data.stage]: JSON.stringify(data),
  })
}

export async function getStageHeartbeat(stage: string): Promise<StageHeartbeat | null> {
  const data = await getRedis().hget(DRAINER_STAGES_KEY, stage)
  if (!data) return null
  try {
    return JSON.parse(data) as StageHeartbeat
  } catch {
    return null
  }
}

export async function getAllStageHeartbeats(): Promise<Record<string, StageHeartbeat>> {
  const data = await getRedis().hgetall(DRAINER_STAGES_KEY)
  const heartbeats: Record<string, StageHeartbeat> = {}
  for (const [stage, value] of Object.entries(data)) {
    try {
      heartbeats[stage] = JSON.parse(value) as StageHeartbeat
    } catch {
      // Skip malformed data
    }
  }
  return heartbeats
}

export async function getStageIdleMinutes(stage: string): Promise<number> {
  const heartbeat = await getStageHeartbeat(stage)
  if (!heartbeat) {
    return Infinity
  }
  const lastActivity = new Date(heartbeat.lastActivity)
  const now = new Date()
  return (now.getTime() - lastActivity.getTime()) / (1000 * 60)
}
