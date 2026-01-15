// src/lib/regulatory-truth/workers/selector-adaptation.worker.ts
//
// Selector Adaptation Worker: LLM-Based CSS Selector Suggestions
// Task 3.2: RTL Autonomy - LLM-Based Selector Adaptation
//
// This worker:
// 1. Triggers when fingerprint drift detected + 0 items extracted
// 2. Queries LLM to suggest new CSS selectors
// 3. Validates selectors against sample HTML
// 4. Enforces 90% precision gate (content vs nav/footer)
// 5. Creates PR for human approval (never auto-merges)
//
// Triggered by: Sentinel/Scout when drift > threshold and yield = 0

import { Job } from "bullmq"
import { Prisma } from "@prisma/client"
import { dbReg } from "@/lib/db"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { jobsProcessed, jobDuration } from "./metrics"
import {
  runSelectorAdaptation,
  validateSelector,
  type SelectorAdaptationInput,
  type SelectorValidation,
} from "../agents/selector-adapter"

// =============================================================================
// TYPES
// =============================================================================

export interface SelectorAdaptationJobData {
  /** Unique run ID for tracking */
  runId: string
  /** ID of the endpoint that needs adaptation */
  endpointId: string
  /** URL of the endpoint */
  endpointUrl: string
  /** Current HTML content where selectors are failing */
  currentHtml: string
  /** Current selectors that are no longer working */
  currentSelectors: string[]
  /** Drift percentage that triggered this job */
  driftPercent: number
  /** Parent job ID (if queued from another worker) */
  parentJobId?: string
}

interface SelectorAdaptationResult {
  /** Whether valid selectors were found */
  foundValidSelectors: boolean
  /** Number of selectors suggested by LLM */
  selectorsAttempted: number
  /** Number of selectors that passed validation */
  selectorsValid: number
  /** Validation results for all selectors */
  validationResults: SelectorValidation[]
  /** PR ID if created (mock for now) */
  prId?: string
  /** Error messages if any */
  errors: string[]
}

// =============================================================================
// HISTORICAL EXAMPLES FETCHING
// =============================================================================

/**
 * Fetch historical extraction examples for an endpoint.
 *
 * Queries Evidence records that:
 * 1. Are from the same endpoint
 * 2. Have successfully extracted items (via SourcePointer)
 * 3. Have raw content available
 *
 * Limited to recent examples to keep context relevant.
 */
async function fetchHistoricalExamples(
  endpointId: string,
  limit: number = 3
): Promise<Array<{ html: string; extractedItems: string[] }>> {
  try {
    // Find Evidence records that were successfully processed
    // (have SourcePointers pointing to them)
    // Note: endpointId maps to sourceId in the Evidence model
    const successfulEvidence = await dbReg.evidence.findMany({
      where: {
        sourceId: endpointId,
        rawContent: { not: "" },
      },
      select: {
        id: true,
        rawContent: true,
      },
      orderBy: { fetchedAt: "desc" },
      take: limit * 2, // Fetch more to filter
    })

    if (successfulEvidence.length === 0) {
      return []
    }

    const examples: Array<{ html: string; extractedItems: string[] }> = []

    for (const evidence of successfulEvidence) {
      if (!evidence.rawContent || examples.length >= limit) break

      // Find RuleFacts that reference this evidence (via groundingQuotes)
      // Note: groundingQuotes is JSON that may contain evidenceId
      const ruleFacts = await dbReg.ruleFact.findMany({
        where: {
          status: "PUBLISHED",
        },
        select: {
          value: true,
          groundingQuotes: true,
        },
        take: 10,
      })

      // Filter to those referencing this evidence
      const relevantFacts = ruleFacts.filter((rf) => {
        if (!rf.groundingQuotes || !Array.isArray(rf.groundingQuotes)) return false
        return (rf.groundingQuotes as Array<{ evidenceId?: string }>).some(
          (q) => q.evidenceId === evidence.id
        )
      })

      if (relevantFacts.length > 0) {
        examples.push({
          html: evidence.rawContent,
          extractedItems: relevantFacts.map((rf) => rf.value),
        })
      }
    }

    return examples
  } catch (error) {
    console.warn(
      `[selector-adaptation] Failed to fetch historical examples for ${endpointId}:`,
      error
    )
    return []
  }
}

// =============================================================================
// PR PERSISTENCE (MOCK)
// =============================================================================

/**
 * Store selector suggestion PR in the database.
 *
 * Creates a MonitoringAlert record with type SELECTOR_ADAPTATION
 * to trigger human review workflow.
 *
 * In the future, this could create an actual GitHub PR.
 */
async function storeSelectorSuggestionPR(
  endpointId: string,
  endpointUrl: string,
  suggestedSelectors: string[],
  validationResults: SelectorValidation[],
  driftPercent: number
): Promise<string> {
  // Create MonitoringAlert for human review
  const alert = await dbReg.monitoringAlert.create({
    data: {
      severity: "HIGH",
      type: "STRUCTURAL_DRIFT", // Alert type for format/selector changes
      affectedRuleIds: [], // No rules affected yet - this is about selectors
      description:
        `Selector adaptation needed for endpoint ${endpointUrl}.\n\n` +
        `Drift: ${driftPercent.toFixed(1)}%\n` +
        `Suggested selectors:\n` +
        suggestedSelectors
          .map((s, i) => {
            const v = validationResults[i]
            const status = v?.isValid ? "[VALID]" : "[INVALID]"
            const reason = v?.rejectionReason ? ` - ${v.rejectionReason}` : ""
            return `  ${status} ${s}${reason}`
          })
          .join("\n") +
        `\n\nValid selectors: ${validationResults.filter((v) => v.isValid).length}/${validationResults.length}`,
      humanActionRequired: true,
      metadata: {
        endpointId,
        endpointUrl,
        suggestedSelectors,
        validationResults,
        driftPercent,
        type: "SELECTOR_ADAPTATION",
      },
    },
  })

  return alert.id
}

// =============================================================================
// MAIN PROCESSING
// =============================================================================

/**
 * Process selector adaptation job.
 *
 * 1. Fetch historical examples for the endpoint
 * 2. Call LLM to suggest new selectors
 * 3. Validate each selector
 * 4. Create PR for human review
 */
async function processSelectorAdaptationJob(
  job: Job<SelectorAdaptationJobData>
): Promise<JobResult> {
  const start = Date.now()
  const { runId, endpointId, endpointUrl, currentHtml, currentSelectors, driftPercent } = job.data

  const result: SelectorAdaptationResult = {
    foundValidSelectors: false,
    selectorsAttempted: 0,
    selectorsValid: 0,
    validationResults: [],
    errors: [],
  }

  try {
    console.log(
      `[selector-adaptation] Starting adaptation for ${endpointUrl} (drift: ${driftPercent.toFixed(1)}%)`
    )

    // Step 1: Fetch historical examples
    const historicalExamples = await fetchHistoricalExamples(endpointId)
    console.log(`[selector-adaptation] Found ${historicalExamples.length} historical examples`)

    // Step 2: Build input for selector adapter
    const input: SelectorAdaptationInput = {
      endpointUrl,
      currentHtml,
      historicalExamples,
      currentSelectors,
    }

    // Step 3: Run selector adaptation (LLM + validation)
    const pr = await runSelectorAdaptation(input)

    if (!pr) {
      console.log(
        `[selector-adaptation] No PR created for ${endpointUrl} - LLM returned no suggestions`
      )
      result.errors.push("LLM returned no selector suggestions")
    } else {
      result.selectorsAttempted = pr.suggestedSelectors.length
      result.validationResults = pr.validationResults
      result.selectorsValid = pr.validationResults.filter((v) => v.isValid).length
      result.foundValidSelectors = result.selectorsValid > 0

      // Step 4: Store PR for human review
      const prId = await storeSelectorSuggestionPR(
        endpointId,
        endpointUrl,
        pr.suggestedSelectors,
        pr.validationResults,
        driftPercent
      )
      result.prId = prId

      console.log(
        `[selector-adaptation] Created PR ${prId} for ${endpointUrl}: ` +
          `${result.selectorsValid}/${result.selectorsAttempted} valid selectors`
      )
    }

    const duration = Date.now() - start
    const hasErrors = result.errors.length > 0
    const status = hasErrors ? "partial" : "success"

    jobsProcessed.inc({
      worker: "selector-adaptation",
      status,
      queue: "selector-adaptation",
    })
    jobDuration.observe(
      { worker: "selector-adaptation", queue: "selector-adaptation" },
      duration / 1000
    )

    console.log(`[selector-adaptation] Run ${runId} completed:`, {
      foundValidSelectors: result.foundValidSelectors,
      selectorsAttempted: result.selectorsAttempted,
      selectorsValid: result.selectorsValid,
      prId: result.prId,
      errors: result.errors.length,
      duration: `${duration}ms`,
    })

    return {
      success: !hasErrors && result.foundValidSelectors,
      duration,
      data: result,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    result.errors.push(errorMessage)

    console.error(`[selector-adaptation] Run ${runId} failed:`, errorMessage)

    jobsProcessed.inc({
      worker: "selector-adaptation",
      status: "failed",
      queue: "selector-adaptation",
    })

    return {
      success: false,
      duration: Date.now() - start,
      error: errorMessage,
    }
  }
}

// =============================================================================
// WORKER SETUP
// =============================================================================

// Create and start worker
const worker = createWorker<SelectorAdaptationJobData>(
  "selector-adaptation",
  processSelectorAdaptationJob,
  {
    name: "selector-adaptation",
    concurrency: 1, // Only one at a time to avoid LLM rate limits
    lockDuration: 300000, // 5 minutes - LLM calls can be slow
    stalledInterval: 60000, // Check for stalled jobs every 1 min
  }
)

setupGracefulShutdown([worker])

console.log("[selector-adaptation] Worker started")
