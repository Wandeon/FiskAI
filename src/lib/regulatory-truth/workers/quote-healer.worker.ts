// src/lib/regulatory-truth/workers/quote-healer.worker.ts
//
// Quote Healer Worker - Self-Healing RTL Pipeline (Priority 1A)
//
// Purpose: Automatically repairs broken provenance quotes that failed validation
// due to Unicode drift, whitespace changes, or minor OCR errors.
//
// This addresses the "18 rules blocked: provenance failures (quote not found in evidence)"
// issue by processing ExtractionRejected entries and attempting fuzzy repair.

import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { quoteHealerQueue, extractQueue } from "./queues"
import { jobsProcessed, jobDuration } from "./metrics"
import { dbReg } from "@/lib/db/regulatory"
// Note: db import kept for CandidateFact (still in public schema)
import {
  attemptQuoteRepair,
  calculateRepairStatistics,
  analyzeRepairFailure,
  type QuoteRepairResult,
  type RepairStatistics,
} from "../utils/quote-repair"
import { getExtractableContent } from "../utils/content-provider"
import { FeatureFlags } from "./utils/feature-flags"

/**
 * Job data for quote healer
 */
interface QuoteHealerJobData {
  /** Specific ExtractionRejected ID to process (if targeting single entry) */
  rejectedId?: string
  /** Batch mode: process all QUOTE_NOT_IN_EVIDENCE rejections */
  batchMode?: boolean
  /** Maximum number of entries to process in batch mode */
  batchLimit?: number
  /** Correlation ID for tracking */
  runId?: string
}

/**
 * Result of processing a single rejected entry
 */
interface ProcessedEntry {
  rejectedId: string
  evidenceId: string
  repairResult: QuoteRepairResult
  action: "REPAIRED" | "FLAGGED_FOR_REVIEW" | "SKIPPED"
}

/**
 * Healing cycle result
 */
interface HealingCycleResult {
  processed: number
  repaired: number
  flaggedForReview: number
  skipped: number
  requeued: number
  statistics: RepairStatistics | null
  entries: ProcessedEntry[]
}

/**
 * Process a single ExtractionRejected entry
 */
async function processRejectedEntry(rejected: {
  id: string
  evidenceId: string
  rawOutput: unknown
  rejectionType: string
  errorDetails: string
}): Promise<ProcessedEntry> {
  // Extract the quote from rawOutput
  const rawOutput = rejected.rawOutput as Record<string, unknown>
  const quote = extractQuoteFromRawOutput(rawOutput)

  if (!quote) {
    return {
      rejectedId: rejected.id,
      evidenceId: rejected.evidenceId,
      repairResult: {
        success: false,
        originalQuote: "",
        failureReason: "No quote found in rawOutput",
      },
      action: "SKIPPED",
    }
  }

  // Get the evidence content
  const extractable = await getExtractableContent(rejected.evidenceId)
  const evidenceContent = extractable?.text

  if (!evidenceContent) {
    return {
      rejectedId: rejected.id,
      evidenceId: rejected.evidenceId,
      repairResult: {
        success: false,
        originalQuote: quote,
        failureReason: "Evidence content not found or empty",
      },
      action: "FLAGGED_FOR_REVIEW",
    }
  }

  // Attempt repair
  const repairResult = attemptQuoteRepair(quote, evidenceContent)

  if (repairResult.success) {
    // Update the rawOutput with repaired quote (stored but not used yet)
    updateQuoteInRawOutput(rawOutput, repairResult.repairedQuote!)

    // Mark as resolved and store the repair metadata
    await dbReg.extractionRejected.update({
      where: { id: rejected.id },
      data: {
        resolvedAt: new Date(),
        rawOutput: {
          ...(rejected.rawOutput as object),
          __repaired: true,
          __repairType: repairResult.repairType,
          __originalQuote: quote,
          __repairedQuote: repairResult.repairedQuote,
          __repairSimilarity: repairResult.similarity,
          __repairedAt: new Date().toISOString(),
        },
      },
    })

    console.log(
      `[quote-healer] Repaired quote for ${rejected.id} ` +
        `(type: ${repairResult.repairType}, similarity: ${repairResult.similarity?.toFixed(2)})`
    )

    return {
      rejectedId: rejected.id,
      evidenceId: rejected.evidenceId,
      repairResult,
      action: "REPAIRED",
    }
  } else {
    // Analyze failure for debugging
    const analysis = analyzeRepairFailure(quote, evidenceContent)

    // Update with failure analysis for manual review
    await dbReg.extractionRejected.update({
      where: { id: rejected.id },
      data: {
        rawOutput: {
          ...(rejected.rawOutput as object),
          __repairAttempted: true,
          __repairFailed: true,
          __failureReason: repairResult.failureReason,
          __bestMatchSimilarity: analysis.bestMatchSimilarity,
          __suggestedActions: analysis.suggestedActions,
          __lastAttemptAt: new Date().toISOString(),
        },
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    })

    console.log(
      `[quote-healer] Failed to repair quote for ${rejected.id}: ${repairResult.failureReason} ` +
        `(best similarity: ${analysis.bestMatchSimilarity.toFixed(2)})`
    )

    return {
      rejectedId: rejected.id,
      evidenceId: rejected.evidenceId,
      repairResult,
      action: "FLAGGED_FOR_REVIEW",
    }
  }
}

/**
 * Extract quote from LLM rawOutput
 */
function extractQuoteFromRawOutput(rawOutput: Record<string, unknown>): string | null {
  // The rawOutput structure varies based on extraction type
  // Common patterns:
  // 1. { exact_quote: "..." }
  // 2. { extractions: [{ exact_quote: "..." }] }
  // 3. { quote: "..." }

  if (typeof rawOutput.exact_quote === "string") {
    return rawOutput.exact_quote
  }

  if (typeof rawOutput.quote === "string") {
    return rawOutput.quote
  }

  if (Array.isArray(rawOutput.extractions) && rawOutput.extractions.length > 0) {
    const first = rawOutput.extractions[0]
    if (typeof first === "object" && first !== null && "exact_quote" in first) {
      return String((first as { exact_quote: unknown }).exact_quote)
    }
  }

  // Check if there's a groundingQuotes array
  if (Array.isArray(rawOutput.groundingQuotes) && rawOutput.groundingQuotes.length > 0) {
    const first = rawOutput.groundingQuotes[0]
    if (typeof first === "object" && first !== null && "text" in first) {
      return String((first as { text: unknown }).text)
    }
  }

  return null
}

/**
 * Update quote in rawOutput with repaired version
 */
function updateQuoteInRawOutput(
  rawOutput: Record<string, unknown>,
  repairedQuote: string
): Record<string, unknown> {
  const updated = { ...rawOutput }

  if ("exact_quote" in updated) {
    updated.exact_quote = repairedQuote
  }

  if ("quote" in updated) {
    updated.quote = repairedQuote
  }

  if (Array.isArray(updated.extractions) && updated.extractions.length > 0) {
    updated.extractions = (updated.extractions as Record<string, unknown>[]).map((ext) => ({
      ...ext,
      exact_quote: repairedQuote,
    }))
  }

  if (Array.isArray(updated.groundingQuotes) && updated.groundingQuotes.length > 0) {
    updated.groundingQuotes = (updated.groundingQuotes as Record<string, unknown>[]).map((gq) => ({
      ...gq,
      text: repairedQuote,
    }))
  }

  return updated
}

/**
 * Run a healing cycle for quote repairs
 */
async function runHealingCycle(
  limit: number = 50,
  specificId?: string
): Promise<HealingCycleResult> {
  const entries: ProcessedEntry[] = []
  let requeued = 0

  // Query rejected entries
  const whereClause = specificId
    ? { id: specificId }
    : {
        rejectionType: "QUOTE_NOT_IN_EVIDENCE",
        resolvedAt: null, // Only unresolved entries
        // Don't retry entries that have been attempted many times
        attemptCount: { lt: 5 },
      }

  const rejected = await dbReg.extractionRejected.findMany({
    where: whereClause,
    take: limit,
    orderBy: { createdAt: "asc" }, // Process oldest first
    select: {
      id: true,
      evidenceId: true,
      rawOutput: true,
      rejectionType: true,
      errorDetails: true,
      attemptCount: true,
    },
  })

  console.log(`[quote-healer] Found ${rejected.length} entries to process`)

  // Process each entry
  for (const entry of rejected) {
    try {
      const result = await processRejectedEntry(entry)
      entries.push(result)

      // If repaired, try to re-queue for extraction
      if (result.action === "REPAIRED") {
        try {
          await extractQueue.add(
            "extract",
            {
              evidenceId: entry.evidenceId,
              runId: `quote-healer-${Date.now()}`,
            },
            {
              jobId: `extract-repaired-${entry.evidenceId}-${Date.now()}`,
              delay: 5000, // Small delay to allow DB writes to propagate
            }
          )
          requeued++
        } catch (queueError) {
          console.warn(
            `[quote-healer] Failed to requeue extraction for ${entry.evidenceId}:`,
            queueError
          )
        }
      }
    } catch (error) {
      console.error(`[quote-healer] Error processing ${entry.id}:`, error)
      entries.push({
        rejectedId: entry.id,
        evidenceId: entry.evidenceId,
        repairResult: {
          success: false,
          originalQuote: "",
          failureReason: error instanceof Error ? error.message : String(error),
        },
        action: "SKIPPED",
      })
    }
  }

  // Calculate statistics
  const repairResults = entries.map((e) => e.repairResult)
  const statistics = repairResults.length > 0 ? calculateRepairStatistics(repairResults) : null

  return {
    processed: entries.length,
    repaired: entries.filter((e) => e.action === "REPAIRED").length,
    flaggedForReview: entries.filter((e) => e.action === "FLAGGED_FOR_REVIEW").length,
    skipped: entries.filter((e) => e.action === "SKIPPED").length,
    requeued,
    statistics,
    entries,
  }
}

/**
 * Process quote healer job
 */
async function processQuoteHealerJob(job: Job<QuoteHealerJobData>): Promise<JobResult> {
  const start = Date.now()
  const { rejectedId, batchMode, batchLimit } = job.data

  // Kill switch: Skip if pipeline is OFF
  if (!FeatureFlags.pipelineEnabled) {
    console.log(`[quote-healer] Pipeline is OFF - skipping`)
    return {
      success: true,
      duration: 0,
      data: { skipped: true, reason: "pipeline_off" },
    }
  }

  try {
    let result: HealingCycleResult

    if (rejectedId) {
      // Process specific entry
      result = await runHealingCycle(1, rejectedId)
    } else if (batchMode) {
      // Process batch
      result = await runHealingCycle(batchLimit || 50)
    } else {
      // Default: process up to 20 entries
      result = await runHealingCycle(20)
    }

    const duration = Date.now() - start
    jobsProcessed.inc({
      worker: "quote-healer",
      status: result.repaired > 0 ? "success" : "no_change",
      queue: "quote-healer",
    })
    jobDuration.observe({ worker: "quote-healer", queue: "quote-healer" }, duration / 1000)

    console.log(
      `[quote-healer] Cycle complete: ` +
        `processed=${result.processed}, repaired=${result.repaired}, ` +
        `flagged=${result.flaggedForReview}, skipped=${result.skipped}, requeued=${result.requeued}`
    )

    if (result.statistics) {
      console.log(
        `[quote-healer] Statistics: ` +
          `successRate=${(result.statistics.successRate * 100).toFixed(1)}%, ` +
          `avgSimilarity=${(result.statistics.averageSimilarity * 100).toFixed(1)}%, ` +
          `avgTime=${result.statistics.averageProcessingTimeMs.toFixed(1)}ms`
      )
    }

    return {
      success: true,
      duration,
      data: {
        processed: result.processed,
        repaired: result.repaired,
        flaggedForReview: result.flaggedForReview,
        skipped: result.skipped,
        requeued: result.requeued,
        statistics: result.statistics,
      },
    }
  } catch (error) {
    jobsProcessed.inc({ worker: "quote-healer", status: "failed", queue: "quote-healer" })
    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Schedule a healing cycle (can be called from scheduler)
 */
export async function scheduleHealingCycle(batchLimit: number = 50): Promise<void> {
  await quoteHealerQueue.add(
    "heal",
    { batchMode: true, batchLimit },
    { jobId: `heal-cycle-${Date.now()}` }
  )
}

/**
 * Get healing statistics (for monitoring dashboard)
 */
export async function getHealingStatistics(): Promise<{
  pendingCount: number
  repairedToday: number
  failedToday: number
  avgRepairRate: number
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [pending, repairedToday, failedToday] = await Promise.all([
    dbReg.extractionRejected.count({
      where: {
        rejectionType: "QUOTE_NOT_IN_EVIDENCE",
        resolvedAt: null,
      },
    }),
    dbReg.extractionRejected.count({
      where: {
        rejectionType: "QUOTE_NOT_IN_EVIDENCE",
        resolvedAt: { gte: today },
        rawOutput: { path: ["__repaired"], equals: true },
      },
    }),
    dbReg.extractionRejected.count({
      where: {
        rejectionType: "QUOTE_NOT_IN_EVIDENCE",
        lastAttemptAt: { gte: today },
        resolvedAt: null,
        rawOutput: { path: ["__repairFailed"], equals: true },
      },
    }),
  ])

  const total = repairedToday + failedToday
  const avgRepairRate = total > 0 ? repairedToday / total : 0

  return {
    pendingCount: pending,
    repairedToday,
    failedToday,
    avgRepairRate,
  }
}

// Create and start worker
const worker = createWorker<QuoteHealerJobData>("quote-healer", processQuoteHealerJob, {
  name: "quote-healer",
  concurrency: 1, // Single worker to avoid race conditions on evidence content
  lockDuration: 180000, // 3 minutes
  stalledInterval: 60000,
})

setupGracefulShutdown([worker])

console.log(`[quote-healer] Worker started (pipeline mode: ${FeatureFlags.pipelineMode})`)
