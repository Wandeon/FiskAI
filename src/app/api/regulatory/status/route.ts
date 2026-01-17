// src/app/api/regulatory/status/route.ts
import { NextResponse } from "next/server"
import { redis } from "@/lib/infra/redis"
import { checkHealthGates } from "@/lib/regulatory-truth/utils/health-gates"

/**
 * Check Redis health with timeout
 */
async function checkRedisHealth(timeoutMs: number = 2000): Promise<boolean> {
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), timeoutMs)
      ),
    ])
    return result === "PONG"
  } catch {
    return false
  }
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
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          note: "Queue monitoring moved to workers repo",
        },
        { status: 503 }
      )
    }

    // Run health gates to check system improvements
    const healthGateResult = await checkHealthGates()

    // Determine overall status from health gates
    const overallStatus =
      healthGateResult.overallHealth === "critical"
        ? "critical"
        : healthGateResult.overallHealth === "degraded"
          ? "degraded"
          : "healthy"

    return NextResponse.json({
      status: overallStatus,
      redis: "connected",
      healthGates: healthGateResult,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      note: "Queue and circuit breaker monitoring moved to workers repo",
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
