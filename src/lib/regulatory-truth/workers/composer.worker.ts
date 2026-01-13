// src/lib/regulatory-truth/workers/composer.worker.ts
import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { reviewQueue } from "./queues"
import { jobsProcessed, jobDuration } from "./metrics"
import { llmLimiter } from "./rate-limiter"
import { runComposerFromCandidates } from "../agents/composer"
import { updateRunOutcome } from "../agents/runner"

// PHASE-D: Composer now accepts candidateFactIds instead of pointerIds
interface ComposeJobData {
  candidateFactIds: string[]
  domain: string
  runId: string
  parentJobId?: string
  // Legacy field for backward compatibility during migration
  pointerIds?: string[]
}

async function processComposeJob(job: Job<ComposeJobData>): Promise<JobResult> {
  const start = Date.now()
  const { candidateFactIds, domain, runId } = job.data

  // PHASE-D: Require candidateFactIds
  if (!candidateFactIds || candidateFactIds.length === 0) {
    console.error(`[composer] No candidateFactIds provided for domain ${domain}`)
    return {
      success: false,
      duration: 0,
      error: "No candidateFactIds provided - PHASE-D requires CandidateFact input",
    }
  }

  try {
    // Rate limit LLM calls
    const result = await llmLimiter.schedule(() =>
      runComposerFromCandidates(candidateFactIds, {
        runId,
        jobId: String(job.id),
        parentJobId: job.data.parentJobId,
        queueName: "compose",
      })
    )

    // INVARIANT ENFORCEMENT: Update AgentRun with actual item count
    // itemsProduced = 1 if rule created, 0 otherwise
    const itemsProduced = result.success && result.ruleId ? 1 : 0
    if (result.agentRunId) {
      await updateRunOutcome(result.agentRunId, itemsProduced)
    }

    if (result.success && result.ruleId) {
      // Queue review job
      await reviewQueue.add(
        "review",
        {
          ruleId: result.ruleId,
          runId,
          parentJobId: job.id,
        },
        { jobId: `review-${result.ruleId}` }
      )
    } else if (result.error?.includes("Conflict detected")) {
      // Conflict was created - arbiter will pick it up
      console.log(`[composer] Conflict detected for domain ${domain}`)
    }

    const duration = Date.now() - start
    jobsProcessed.inc({ worker: "composer", status: "success", queue: "compose" })
    jobDuration.observe({ worker: "composer", queue: "compose" }, duration / 1000)

    return {
      success: result.success,
      duration,
      data: { ruleId: result.ruleId, domain, candidateFactsProcessed: candidateFactIds.length },
    }
  } catch (error) {
    jobsProcessed.inc({ worker: "composer", status: "failed", queue: "compose" })
    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Create and start worker
// Lock duration must exceed max job time (agent timeout is 5 min = 300000ms)
const worker = createWorker<ComposeJobData>("compose", processComposeJob, {
  name: "composer",
  concurrency: 1,
  lockDuration: 360000, // 6 minutes - exceeds 5 min agent timeout
  stalledInterval: 60000, // Check for stalled jobs every 60s
})

setupGracefulShutdown([worker])

console.log("[composer] Worker started")
