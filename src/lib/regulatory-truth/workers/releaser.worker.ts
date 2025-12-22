// src/lib/regulatory-truth/workers/releaser.worker.ts
import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { jobsProcessed, jobDuration } from "./metrics"
import { runReleaser } from "../agents/releaser"
import { buildKnowledgeGraph } from "../graph/knowledge-graph"

interface ReleaseJobData {
  ruleIds: string[]
  runId: string
  parentJobId?: string
}

async function processReleaseJob(job: Job<ReleaseJobData>): Promise<JobResult> {
  const start = Date.now()
  const { ruleIds } = job.data

  try {
    const result = await runReleaser(ruleIds)

    // Build knowledge graph after release
    if (result.success) {
      await buildKnowledgeGraph()
    }

    const duration = Date.now() - start
    jobsProcessed.inc({ worker: "releaser", status: "success", queue: "release" })
    jobDuration.observe({ worker: "releaser", queue: "release" }, duration / 1000)

    return {
      success: result.success,
      duration,
      data: {
        releaseId: result.releaseId,
        publishedCount: result.publishedRuleIds.length,
      },
    }
  } catch (error) {
    jobsProcessed.inc({ worker: "releaser", status: "failed", queue: "release" })
    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Create and start worker
const worker = createWorker<ReleaseJobData>("release", processReleaseJob, {
  name: "releaser",
  concurrency: 1,
})

setupGracefulShutdown([worker])

console.log("[releaser] Worker started")
