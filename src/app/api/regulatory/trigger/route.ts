// src/app/api/regulatory/trigger/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { scheduledQueue } from "@/lib/regulatory-truth/workers/queues"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()

  if (!user || user.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const phases = body.phases || ["sentinel", "extract", "compose", "review", "release"]

    const job = await scheduledQueue.add("scheduled", {
      type: "pipeline-run",
      runId: `api-${Date.now()}`,
      triggeredBy: "api",
      phases,
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "queued",
      message: `Pipeline triggered for phases: ${phases.join(", ")}`,
    })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to queue pipeline run",
    })
  }
}
