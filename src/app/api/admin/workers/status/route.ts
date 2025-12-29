// src/app/api/admin/workers/status/route.ts
// API endpoint for worker/queue health status
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-utils"
import Redis from "ioredis"

// Queue configuration matching docker-compose.workers.yml
const WORKER_QUEUES = [
  { name: "sentinel", displayName: "Sentinel", description: "Discovers new regulatory content" },
  { name: "extract", displayName: "Extractor", description: "Extracts facts from evidence" },
  { name: "ocr", displayName: "OCR", description: "Processes scanned PDFs" },
  { name: "compose", displayName: "Composer", description: "Creates regulatory rules" },
  { name: "review", displayName: "Reviewer", description: "Reviews rule quality" },
  { name: "arbiter", displayName: "Arbiter", description: "Resolves conflicts" },
  { name: "release", displayName: "Releaser", description: "Publishes rules" },
  { name: "consolidator", displayName: "Consolidator", description: "Consolidates rules" },
  { name: "content-sync", displayName: "Content Sync", description: "Patches MDX content" },
  { name: "article", displayName: "Article", description: "Generates articles" },
  { name: "backup", displayName: "Backup", description: "Scheduled backups" },
  { name: "scheduled", displayName: "Scheduler", description: "Scheduled jobs" },
] as const

export interface QueueStats {
  name: string
  displayName: string
  description: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

export interface WorkerHealthResponse {
  status: "healthy" | "degraded" | "unhealthy"
  redisConnected: boolean
  timestamp: string
  queues: QueueStats[]
  summary: {
    totalWaiting: number
    totalActive: number
    totalFailed: number
    healthyQueues: number
    unhealthyQueues: number
  }
}

async function getQueueStats(
  redis: Redis,
  queue: (typeof WORKER_QUEUES)[number],
  prefix: string
): Promise<QueueStats> {
  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    redis.llen(`${prefix}:${queue.name}:wait`).catch(() => 0),
    redis.llen(`${prefix}:${queue.name}:active`).catch(() => 0),
    redis.zcard(`${prefix}:${queue.name}:completed`).catch(() => 0),
    redis.zcard(`${prefix}:${queue.name}:failed`).catch(() => 0),
    redis.zcard(`${prefix}:${queue.name}:delayed`).catch(() => 0),
    redis.hexists(`${prefix}:${queue.name}:meta`, "paused").catch(() => 0),
  ])

  return {
    name: queue.name,
    displayName: queue.displayName,
    description: queue.description,
    waiting: waiting as number,
    active: active as number,
    completed: completed as number,
    failed: failed as number,
    delayed: delayed as number,
    paused: isPaused === 1,
  }
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
  const PREFIX = process.env.BULLMQ_PREFIX || "fiskai"

  let redis: Redis | null = null
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    })

    await redis.connect()
    const pong = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 3000)),
    ])

    if (pong !== "PONG") {
      throw new Error("Redis ping failed")
    }

    // Get stats for all queues
    const queueStats = await Promise.all(WORKER_QUEUES.map((q) => getQueueStats(redis!, q, PREFIX)))

    // Calculate summary
    const summary = queueStats.reduce(
      (acc, q) => ({
        totalWaiting: acc.totalWaiting + q.waiting,
        totalActive: acc.totalActive + q.active,
        totalFailed: acc.totalFailed + q.failed,
        healthyQueues: acc.healthyQueues + (q.failed === 0 && !q.paused ? 1 : 0),
        unhealthyQueues: acc.unhealthyQueues + (q.failed > 0 || q.paused ? 1 : 0),
      }),
      {
        totalWaiting: 0,
        totalActive: 0,
        totalFailed: 0,
        healthyQueues: 0,
        unhealthyQueues: 0,
      }
    )

    // Determine overall status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy"
    if (summary.totalFailed > 10 || summary.unhealthyQueues > 3) {
      status = "unhealthy"
    } else if (summary.totalFailed > 0 || summary.unhealthyQueues > 0) {
      status = "degraded"
    }

    const response: WorkerHealthResponse = {
      status,
      redisConnected: true,
      timestamp: new Date().toISOString(),
      queues: queueStats,
      summary,
    }

    return NextResponse.json(response)
  } catch {
    // Redis connection failed
    const response: WorkerHealthResponse = {
      status: "unhealthy",
      redisConnected: false,
      timestamp: new Date().toISOString(),
      queues: [],
      summary: {
        totalWaiting: 0,
        totalActive: 0,
        totalFailed: 0,
        healthyQueues: 0,
        unhealthyQueues: WORKER_QUEUES.length,
      },
    }

    return NextResponse.json(response, { status: 503 })
  } finally {
    if (redis) {
      await redis.quit().catch(() => {})
    }
  }
}
