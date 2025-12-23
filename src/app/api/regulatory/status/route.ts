// src/app/api/regulatory/status/route.ts
import { NextResponse } from "next/server"
import { allQueues, checkRedisHealth } from "@/lib/regulatory-truth/workers"
import { getCircuitBreakerStatus } from "@/lib/regulatory-truth/workers/circuit-breaker"

async function getQueueStatusWithTimeout(
  timeoutMs: number = 3000
): Promise<
  Record<string, { waiting: number; active: number; failed: number } | { error: string }>
> {
  const queueStatus: Record<
    string,
    { waiting: number; active: number; failed: number } | { error: string }
  > = {}

  for (const [name, queue] of Object.entries(allQueues)) {
    try {
      const counts = await Promise.race([
        queue.getJobCounts("waiting", "active", "failed"),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Queue timeout")), timeoutMs)
        ),
      ])
      queueStatus[name] = {
        waiting: counts.waiting,
        active: counts.active,
        failed: counts.failed,
      }
    } catch (error) {
      queueStatus[name] = { error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  return queueStatus
}

export async function GET() {
  const startTime = Date.now()

  try {
    // Quick health check with timeout
    const redisHealthy = await checkRedisHealth(2000)

    if (!redisHealthy) {
      return NextResponse.json(
        {
          status: "degraded",
          redis: "disconnected",
          error: "Redis connection failed or timed out",
          queues: {},
          circuitBreakers: getCircuitBreakerStatus(),
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    // Get queue stats with timeout protection
    const queueStatus = await getQueueStatusWithTimeout(3000)

    return NextResponse.json({
      status: "healthy",
      redis: "connected",
      queues: queueStatus,
      circuitBreakers: getCircuitBreakerStatus(),
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
