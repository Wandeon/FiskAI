import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withApiLogging } from "@/lib/api-logging"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

interface HealthCheck {
  status: "ok" | "degraded" | "failed"
  latency?: number
  message?: string
}

export const GET = withApiLogging(async () => {
  const checks: Record<string, HealthCheck> = {}
  let overallStatus: "ready" | "degraded" | "not_ready" = "ready"

  // Database check
  const dbStart = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = {
      status: "ok",
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    logger.error({ error }, "Database health check failed")
    checks.database = {
      status: "failed",
      latency: Date.now() - dbStart,
      message: error instanceof Error ? error.message : "Unknown error",
    }
    overallStatus = "not_ready"
  }

  // Memory check
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
  const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

  checks.memory = {
    status: heapPercent > 90 ? "degraded" : "ok",
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`,
  }

  if (heapPercent > 90 && overallStatus === "ready") {
    overallStatus = "degraded"
  }

  // Uptime
  const uptimeSeconds = Math.round(process.uptime())

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: uptimeSeconds,
    checks,
  }

  const statusCode = overallStatus === "not_ready" ? 503 : 200

  return NextResponse.json(response, { status: statusCode })
})
