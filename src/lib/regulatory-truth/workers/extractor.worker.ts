// src/lib/regulatory-truth/workers/extractor.worker.ts
import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { extractQueue } from "./queues"
import { jobsProcessed, jobDuration } from "./metrics"
import { llmLimiter } from "./rate-limiter"
import { runExtractor } from "../agents/extractor"
import { updateRunOutcome } from "../agents/runner"
import { dbReg } from "@/lib/db/regulatory"
import { isReadyForExtraction } from "../utils/content-provider"
import { FeatureFlags } from "./utils/feature-flags"

// PHASE-D: Compose queueing enabled with CandidateFact grouping
import { composeQueue } from "./queues"
import { db } from "@/lib/db"

interface ExtractJobData {
  evidenceId: string
  runId: string
  parentJobId?: string
}

interface CandidateFactGroup {
  key: string
  domain: string
  candidateFactIds: string[]
}

/**
 * Group CandidateFacts by suggestedConceptSlug (preferred) or domain+valueType fallback.
 * Returns groups ready for compose job queueing.
 */
async function groupCandidateFactsForCompose(
  candidateFactIds: string[]
): Promise<CandidateFactGroup[]> {
  if (candidateFactIds.length === 0) return []

  // Fetch the CandidateFacts with grouping fields
  const facts = await db.candidateFact.findMany({
    where: { id: { in: candidateFactIds } },
    select: {
      id: true,
      suggestedConceptSlug: true,
      suggestedDomain: true,
      suggestedValueType: true,
    },
  })

  // Group by conceptSlug (preferred) or domain+valueType (fallback)
  const groups = new Map<string, { domain: string; ids: string[] }>()

  for (const fact of facts) {
    // Primary: use suggestedConceptSlug
    // Fallback: use domain-valueType
    // Last resort: use domain only
    const key =
      fact.suggestedConceptSlug ||
      (fact.suggestedDomain && fact.suggestedValueType
        ? `${fact.suggestedDomain}-${fact.suggestedValueType}`.toLowerCase()
        : fact.suggestedDomain?.toLowerCase() || "unknown")

    const domain = fact.suggestedDomain || "unknown"

    if (!groups.has(key)) {
      groups.set(key, { domain, ids: [] })
    }
    groups.get(key)!.ids.push(fact.id)
  }

  return Array.from(groups.entries()).map(([key, { domain, ids }]) => ({
    key,
    domain,
    candidateFactIds: ids,
  }))
}

async function processExtractJob(job: Job<ExtractJobData>): Promise<JobResult> {
  const start = Date.now()
  const { evidenceId, runId } = job.data

  // Kill switch: Skip all extraction if pipeline is OFF
  if (!FeatureFlags.pipelineEnabled) {
    console.log(`[extractor] Pipeline is OFF - skipping extraction for ${evidenceId}`)
    return {
      success: true,
      duration: 0,
      data: { skipped: true, reason: "pipeline_off" },
    }
  }

  try {
    // Check if evidence is ready for extraction (has required artifacts)
    const ready = await isReadyForExtraction(evidenceId)
    if (!ready) {
      // Re-queue with delay - OCR might still be processing
      console.log(`[extractor] Evidence ${evidenceId} not ready, requeueing...`)
      await extractQueue.add(
        "extract",
        { evidenceId, runId },
        { delay: 30000, jobId: `extract-${evidenceId}` }
      )
      return {
        success: true,
        duration: 0,
        data: { requeued: true, reason: "awaiting_artifact" },
      }
    }

    // Get evidence with source info for rate limiting
    const evidence = await dbReg.evidence.findUnique({
      where: { id: evidenceId },
      include: { source: true },
    })

    if (!evidence) {
      return { success: false, duration: 0, error: `Evidence not found: ${evidenceId}` }
    }

    // Rate limit LLM calls
    const result = await llmLimiter.schedule(() =>
      runExtractor(evidenceId, {
        runId,
        jobId: String(job.id),
        parentJobId: job.data.parentJobId,
        sourceSlug: evidence.source?.slug,
        queueName: "extract",
      })
    )

    // PHASE-D: Update AgentRun.itemsProduced with the count of CandidateFacts created
    // This ensures SUCCESS_APPLIED/SUCCESS_NO_CHANGE is set correctly based on actual items
    if (result.success && result.agentRunId) {
      await updateRunOutcome(result.agentRunId, result.candidateFactIds.length)
    }

    // PHASE-D: Queue compose jobs for CandidateFact groups
    if (FeatureFlags.isPhaseD && result.success && result.candidateFactIds.length > 0) {
      try {
        const groups = await groupCandidateFactsForCompose(result.candidateFactIds)

        for (const group of groups) {
          // Use sorted IDs for stable, idempotent jobId
          const sortedIds = [...group.candidateFactIds].sort().join(",")
          const jobId = `compose-${group.key}-${sortedIds}`

          await composeQueue.add(
            "compose",
            {
              candidateFactIds: group.candidateFactIds,
              domain: group.domain,
              runId,
              parentJobId: job.id,
            },
            { jobId }
          )

          console.log(
            `[extractor] Queued compose job for ${group.key} with ${group.candidateFactIds.length} facts`
          )
        }
      } catch (composeError) {
        // Non-blocking: facts are saved even if compose queueing fails
        console.error(`[extractor] Failed to queue compose jobs:`, composeError)
      }
    }

    const duration = Date.now() - start
    jobsProcessed.inc({ worker: "extractor", status: "success", queue: "extract" })
    jobDuration.observe({ worker: "extractor", queue: "extract" }, duration / 1000)

    return {
      success: true,
      duration,
      // PHASE-D: Report candidateFactsCreated instead of pointersCreated
      data: { candidateFactsCreated: result.candidateFactIds.length },
    }
  } catch (error) {
    jobsProcessed.inc({ worker: "extractor", status: "failed", queue: "extract" })
    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Create and start worker
// Lock duration must exceed max job time (agent timeout is 5 min = 300000ms)
const worker = createWorker<ExtractJobData>("extract", processExtractJob, {
  name: "extractor",
  concurrency: 2,
  lockDuration: 360000, // 6 minutes - exceeds 5 min agent timeout
  stalledInterval: 60000, // Check for stalled jobs every 60s
})

setupGracefulShutdown([worker])

console.log(`[extractor] Worker started (pipeline mode: ${FeatureFlags.pipelineMode})`)
