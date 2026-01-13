// src/lib/regulatory-truth/workers/router.worker.ts
//
// Router Worker: Decides pipeline path based on scout output + budget
// No LLM calls - pure routing logic based on scout results and budget state.
//

import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { extractQueue, ocrQueue } from "./queues"
import { jobsProcessed, jobDuration } from "./metrics"
import {
  checkBudget,
  estimateTokens,
  openCircuit,
  type BudgetCheckResult,
  type LLMProvider,
} from "./budget-governor"
import { recordProgressEvent, classifyError, shouldOpenCircuit } from "./progress-tracker"
import type { ScoutResult } from "./content-scout"
import { dbReg } from "@/lib/db"

// Routing decisions
export type RoutingDecision =
  | "SKIP" // Skip entirely, no value expected
  | "OCR" // Route to OCR worker first
  | "EXTRACT_LOCAL" // Extract using local Ollama
  | "EXTRACT_CLOUD" // Extract using cloud LLM (last resort)

// Router job input
export interface RouterJobData {
  evidenceId: string
  scoutResult: ScoutResult
  sourceSlug: string
  runId: string
  parentJobId?: string
}

// Router job output
export interface RouterJobResult extends JobResult {
  data?: {
    decision: RoutingDecision
    reason: string
    budgetCheck?: BudgetCheckResult
    recommendedProvider?: LLMProvider
  }
}

// Routing thresholds
const ROUTING_CONFIG = {
  worthItThreshold: 0.4, // Min score to proceed with extraction
  cloudThreshold: 0.7, // Min score for cloud LLM
  localPreferred: 0.5, // Score range where local is preferred
}

/**
 * Determine routing decision based on scout result and budget
 */
function determineRouting(
  scoutResult: ScoutResult,
  budgetCheck: BudgetCheckResult
): { decision: RoutingDecision; reason: string } {
  // Check for explicit skip from scout
  if (scoutResult.skipReason) {
    return {
      decision: "SKIP",
      reason: scoutResult.skipReason,
    }
  }

  // Check if score is below threshold
  if (scoutResult.worthItScore < ROUTING_CONFIG.worthItThreshold) {
    return {
      decision: "SKIP",
      reason: `Low worth-it score: ${(scoutResult.worthItScore * 100).toFixed(1)}% < ${ROUTING_CONFIG.worthItThreshold * 100}%`,
    }
  }

  // Check if OCR is needed first
  if (scoutResult.needsOCR) {
    return {
      decision: "OCR",
      reason: "PDF requires OCR before extraction",
    }
  }

  // Check budget constraints
  if (!budgetCheck.allowed) {
    return {
      decision: "SKIP",
      reason: `Budget denied: ${budgetCheck.denialReason}`,
    }
  }

  // Determine extract type based on score and recommended provider
  if (budgetCheck.recommendedProvider === "LOCAL_OLLAMA") {
    return {
      decision: "EXTRACT_LOCAL",
      reason: `Local extraction (score=${(scoutResult.worthItScore * 100).toFixed(1)}%, provider=${budgetCheck.recommendedProvider})`,
    }
  }

  // Cloud extraction only for high-value content
  if (
    scoutResult.worthItScore >= ROUTING_CONFIG.cloudThreshold &&
    (budgetCheck.recommendedProvider === "CLOUD_OLLAMA" ||
      budgetCheck.recommendedProvider === "CLOUD_OPENAI")
  ) {
    return {
      decision: "EXTRACT_CLOUD",
      reason: `Cloud extraction (score=${(scoutResult.worthItScore * 100).toFixed(1)}%, high-value content)`,
    }
  }

  // Default to local for medium-value content
  return {
    decision: "EXTRACT_LOCAL",
    reason: `Local extraction (score=${(scoutResult.worthItScore * 100).toFixed(1)}%, medium-value content)`,
  }
}

async function processRouterJob(job: Job<RouterJobData>): Promise<RouterJobResult> {
  const start = Date.now()
  const { evidenceId, scoutResult, sourceSlug, runId } = job.data

  try {
    // Check budget
    const budgetCheck = checkBudget(sourceSlug, evidenceId, scoutResult.estimatedTokens)

    // Determine routing
    const { decision, reason } = determineRouting(scoutResult, budgetCheck)

    // Record progress event
    await recordProgressEvent({
      stageName: "router",
      evidenceId,
      sourceSlug,
      runId,
      timestamp: new Date(),
      producedCount: decision === "SKIP" ? 0 : 1,
      downstreamQueuedCount: decision === "SKIP" ? 0 : 1,
      skipReason: decision === "SKIP" ? reason : undefined,
      metadata: {
        decision,
        reason,
        worthItScore: scoutResult.worthItScore,
        budgetAllowed: budgetCheck.allowed,
        budgetDenialReason: budgetCheck.denialReason,
        recommendedProvider: budgetCheck.recommendedProvider,
      },
    })

    // Route to appropriate queue
    switch (decision) {
      case "OCR":
        await ocrQueue.add(
          "ocr",
          {
            evidenceId,
            runId,
            parentJobId: job.id,
          },
          { jobId: `ocr-${evidenceId}` }
        )
        console.log(`[router] Evidence ${evidenceId} → OCR (${reason})`)
        break

      case "EXTRACT_LOCAL":
        await extractQueue.add(
          "extract",
          {
            evidenceId,
            runId,
            parentJobId: job.id,
            llmProvider: "LOCAL_OLLAMA",
          },
          { jobId: `extract-${evidenceId}` }
        )
        console.log(`[router] Evidence ${evidenceId} → EXTRACT_LOCAL (${reason})`)
        break

      case "EXTRACT_CLOUD":
        await extractQueue.add(
          "extract",
          {
            evidenceId,
            runId,
            parentJobId: job.id,
            llmProvider: "CLOUD_OLLAMA",
          },
          { jobId: `extract-${evidenceId}` }
        )
        console.log(`[router] Evidence ${evidenceId} → EXTRACT_CLOUD (${reason})`)
        break

      case "SKIP":
        console.log(`[router] Evidence ${evidenceId} → SKIP (${reason})`)
        break
    }

    const duration = Date.now() - start
    jobsProcessed.inc({ worker: "router", status: "success", queue: "router" })
    jobDuration.observe({ worker: "router", queue: "router" }, duration / 1000)

    return {
      success: true,
      duration,
      data: {
        decision,
        reason,
        budgetCheck,
        recommendedProvider: budgetCheck.recommendedProvider,
      },
    }
  } catch (error) {
    const errorClass = classifyError(error instanceof Error ? error : new Error(String(error)))

    // Open circuit for auth/quota errors
    if (shouldOpenCircuit(errorClass)) {
      openCircuit(errorClass as "AUTH_ERROR" | "QUOTA_ERROR")
    }

    jobsProcessed.inc({ worker: "router", status: "failed", queue: "router" })

    // Record error in progress
    await recordProgressEvent({
      stageName: "router",
      evidenceId,
      sourceSlug,
      runId,
      timestamp: new Date(),
      producedCount: 0,
      downstreamQueuedCount: 0,
      errorClass,
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Create and start worker
const worker = createWorker<RouterJobData>("router", processRouterJob, {
  name: "router",
  concurrency: 10, // High concurrency since no LLM calls
  lockDuration: 30000,
  stalledInterval: 15000,
})

setupGracefulShutdown([worker])

console.log("[router] Worker started")
