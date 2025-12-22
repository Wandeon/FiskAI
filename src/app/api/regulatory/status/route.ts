// src/app/api/regulatory/status/route.ts
import { NextResponse } from "next/server"
import { allQueues, checkRedisHealth } from "@/lib/regulatory-truth/workers"
import { getCircuitBreakerStatus } from "@/lib/regulatory-truth/workers/circuit-breaker"

export async function GET() {
  try {
    const redisHealthy = await checkRedisHealth()

    // Get queue depths
    const queueStatus: Record<string, { waiting: number; active: number; failed: number }> = {}
    for (const [name, queue] of Object.entries(allQueues)) {
      const counts = await queue.getJobCounts("waiting", "active", "failed")
      queueStatus[name] = {
        waiting: counts.waiting,
        active: counts.active,
        failed: counts.failed,
      }
    }

    return NextResponse.json({
      status: redisHealthy ? "healthy" : "degraded",
      redis: redisHealthy ? "connected" : "disconnected",
      queues: queueStatus,
      circuitBreakers: getCircuitBreakerStatus(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 })
  }
}
