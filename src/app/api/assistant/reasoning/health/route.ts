// src/app/api/assistant/reasoning/health/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMetrics } from "@/lib/assistant/reasoning/metrics"
import { getReasoningMode } from "@/lib/assistant/reasoning/feature-flags"
import { getEmbeddingStats } from "@/lib/regulatory-truth/services/embedding-service"

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  mode: string
  checks: {
    database: boolean
    recentTraces: number
    errorRate: number
    avgDurationMs: number
  }
  embeddings?: {
    totalChunks: number
    rulesWithEmbeddings: number
    publishedRulesWithoutEmbeddings: number
  }
  metrics: ReturnType<ReturnType<typeof getMetrics>["getStats"]> | null
  timestamp: string
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const mode = getReasoningMode()
  const metrics = getMetrics()

  // Database check
  let databaseOk = false
  let recentTraces = 0
  let errorRate = 0
  let avgDurationMs = 0

  try {
    // Check recent traces (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const traces = await prisma.reasoningTrace.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      select: {
        outcome: true,
        durationMs: true,
      },
    })

    databaseOk = true
    recentTraces = traces.length

    if (traces.length > 0) {
      const errors = traces.filter((t) => t.outcome === "ERROR")
      errorRate = errors.length / traces.length

      avgDurationMs = traces.reduce((sum, t) => sum + (t.durationMs || 0), 0) / traces.length
    }
  } catch {
    databaseOk = false
  }

  // Get embedding stats
  let embeddingStats
  try {
    embeddingStats = await getEmbeddingStats()
  } catch {
    // Embeddings are non-critical, don't fail health check
    embeddingStats = undefined
  }

  // Determine status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy"
  if (!databaseOk) {
    status = "unhealthy"
  } else if (errorRate > 0.05 || avgDurationMs > 5000) {
    status = "degraded"
  }

  return NextResponse.json({
    status,
    mode,
    checks: {
      database: databaseOk,
      recentTraces,
      errorRate,
      avgDurationMs: Math.round(avgDurationMs),
    },
    embeddings: embeddingStats,
    metrics: mode !== "off" ? metrics.getStats() : null,
    timestamp: new Date().toISOString(),
  })
}
