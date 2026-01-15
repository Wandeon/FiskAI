// src/lib/regulatory-truth/workers/regression-detector.worker.ts
//
// Regression Detector Worker: Daily snapshot and diff detection
// Task 2.2: RTL Autonomy - Automated Regression Testing
//
// This worker:
// 1. Creates daily snapshots of all PUBLISHED RuleFacts
// 2. Compares against previous snapshots to detect changes
// 3. Flags unexplained changes (value changed but sources unchanged) for human review
// 4. Runs TTL cleanup to purge snapshots older than 90 days
//
// Runs once daily via scheduler (recommended: 01:00 after midnight)

import { Job } from "bullmq"
import { dbReg } from "@/lib/db"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { jobsProcessed, jobDuration } from "./metrics"
import {
  createSnapshotData,
  detectRuleChanges,
  getSnapshotRetentionCutoff,
  DEFAULT_RETENTION_DAYS,
  type RuleSnapshotData,
  type SourceVersion,
  type RuleChangeResult,
} from "../utils/rule-snapshot"

// =============================================================================
// TYPES
// =============================================================================

interface RegressionDetectorJobData {
  runId: string
  parentJobId?: string
  skipTtlCleanup?: boolean
}

interface RegressionDetectorResult {
  snapshotsCreated: number
  changesDetected: number
  unexplainedChanges: number
  explainedChanges: number
  confidenceChanges: number
  snapshotsDeleted: number
  errors: string[]
}

// =============================================================================
// SNAPSHOT FUNCTIONS
// =============================================================================

/**
 * Fetch all PUBLISHED RuleFacts for snapshotting.
 */
async function fetchPublishedRuleFacts(): Promise<
  Array<{
    id: string
    conceptSlug: string
    value: string
    confidence: number
  }>
> {
  const rules = await dbReg.ruleFact.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      conceptSlug: true,
      value: true,
      confidence: true,
    },
  })

  return rules
}

/**
 * Fetch source versions (Evidence content hashes) for a RuleFact.
 *
 * Note: RuleFact uses groundingQuotes which contain evidence references.
 * We extract evidenceIds from groundingQuotes and fetch their contentHashes.
 */
async function fetchSourceVersionsForRule(ruleId: string): Promise<SourceVersion[]> {
  // Get the rule's grounding quotes which contain evidence references
  const ruleFact = await dbReg.ruleFact.findUnique({
    where: { id: ruleId },
    select: { groundingQuotes: true },
  })

  if (!ruleFact || !ruleFact.groundingQuotes) {
    return []
  }

  // groundingQuotes is a JSON array of objects with evidenceId
  type GroundingQuote = { evidenceId?: string; [key: string]: unknown }
  const groundingQuotes = ruleFact.groundingQuotes as GroundingQuote[]

  if (!Array.isArray(groundingQuotes)) {
    return []
  }

  // Extract unique evidence IDs
  const evidenceIdSet = new Set(
    groundingQuotes
      .filter((q): q is GroundingQuote & { evidenceId: string } => typeof q.evidenceId === "string")
      .map((q) => q.evidenceId)
  )
  const evidenceIds = Array.from(evidenceIdSet)

  if (evidenceIds.length === 0) {
    return []
  }

  // Fetch evidence records to get their content hashes
  const evidence = await dbReg.evidence.findMany({
    where: { id: { in: evidenceIds } },
    select: { id: true, contentHash: true },
  })

  return evidence.map((e) => ({
    evidenceId: e.id,
    contentHash: e.contentHash,
  }))
}

/**
 * Get the most recent snapshot for a rule.
 */
async function getLatestSnapshot(ruleId: string): Promise<RuleSnapshotData | null> {
  const snapshot = await dbReg.ruleFactSnapshot.findFirst({
    where: { ruleId },
    orderBy: { snapshotAt: "desc" },
  })

  if (!snapshot) {
    return null
  }

  return {
    ruleId: snapshot.ruleId,
    conceptSlug: snapshot.conceptSlug,
    valueHash: snapshot.valueHash,
    confidence: snapshot.confidence,
    sourceVersions: snapshot.sourceVersions as unknown as SourceVersion[],
    snapshotAt: snapshot.snapshotAt,
  }
}

/**
 * Save a new snapshot to the database.
 */
async function saveSnapshot(data: RuleSnapshotData): Promise<void> {
  await dbReg.ruleFactSnapshot.create({
    data: {
      ruleId: data.ruleId,
      conceptSlug: data.conceptSlug,
      valueHash: data.valueHash,
      confidence: data.confidence,
      sourceVersions: data.sourceVersions,
      snapshotAt: data.snapshotAt,
    },
  })
}

/**
 * Queue an unexplained change for human review.
 *
 * Creates a MonitoringAlert with type CONFLICT_DETECTED (closest match for regression).
 * In the future, we could add a specific REGRESSION_DETECTED alert type.
 */
async function queueForHumanReview(change: RuleChangeResult, conceptSlug: string): Promise<void> {
  await dbReg.monitoringAlert.create({
    data: {
      severity: "HIGH",
      type: "CONFLICT_DETECTED", // Using existing type; regression is a form of conflict
      affectedRuleIds: [change.ruleId],
      description:
        `Regression detected: Rule "${conceptSlug}" (${change.ruleId}) changed value ` +
        `from hash ${change.oldValueHash.slice(0, 8)}... to ${change.newValueHash.slice(0, 8)}... ` +
        `but underlying sources did not change. This may indicate a silent re-extraction ` +
        `or LLM inconsistency. Manual review required.`,
      humanActionRequired: true,
    },
  })
}

// =============================================================================
// TTL CLEANUP
// =============================================================================

/**
 * Delete snapshots older than the retention period.
 *
 * Per Appendix A.6: Keep 90 days of snapshots, then archive.
 * Currently we delete rather than archive; archival can be added later.
 *
 * @returns Number of snapshots deleted
 */
async function cleanupOldSnapshots(): Promise<number> {
  const cutoff = getSnapshotRetentionCutoff(DEFAULT_RETENTION_DAYS)

  const result = await dbReg.ruleFactSnapshot.deleteMany({
    where: {
      snapshotAt: { lt: cutoff },
    },
  })

  return result.count
}

// =============================================================================
// MAIN PROCESSING
// =============================================================================

/**
 * Process the regression detection job.
 *
 * 1. Fetch all PUBLISHED RuleFacts
 * 2. For each rule:
 *    a. Get source versions (evidence content hashes)
 *    b. Create snapshot data
 *    c. Compare against previous snapshot
 *    d. If unexplained change detected, queue for human review
 *    e. Save new snapshot
 * 3. Run TTL cleanup
 */
async function processRegressionDetectorJob(
  job: Job<RegressionDetectorJobData>
): Promise<JobResult> {
  const start = Date.now()
  const { runId, skipTtlCleanup = false } = job.data

  const result: RegressionDetectorResult = {
    snapshotsCreated: 0,
    changesDetected: 0,
    unexplainedChanges: 0,
    explainedChanges: 0,
    confidenceChanges: 0,
    snapshotsDeleted: 0,
    errors: [],
  }

  try {
    console.log(`[regression-detector] Starting run ${runId}`)

    // Step 1: Fetch all PUBLISHED rules
    const publishedRules = await fetchPublishedRuleFacts()
    console.log(`[regression-detector] Found ${publishedRules.length} PUBLISHED rules`)

    // Step 2: Process each rule
    for (const rule of publishedRules) {
      try {
        // Get source versions
        const sourceVersions = await fetchSourceVersionsForRule(rule.id)

        // Create new snapshot
        const newSnapshot = createSnapshotData(
          {
            id: rule.id,
            conceptSlug: rule.conceptSlug,
            value: rule.value,
            confidence: rule.confidence,
          },
          sourceVersions
        )

        // Get previous snapshot for comparison
        const previousSnapshot = await getLatestSnapshot(rule.id)

        if (previousSnapshot) {
          // Compare snapshots
          const change = detectRuleChanges(previousSnapshot, newSnapshot)

          if (change.hasChanged) {
            result.changesDetected++

            if (change.sourceExplanation === "unexplained") {
              result.unexplainedChanges++
              console.log(
                `[regression-detector] UNEXPLAINED change detected for rule ${rule.id} (${rule.conceptSlug})`
              )
              // Queue for human review
              await queueForHumanReview(change, rule.conceptSlug)
            } else {
              result.explainedChanges++
              console.log(
                `[regression-detector] Explained change detected for rule ${rule.id} (${rule.conceptSlug})`
              )
            }
          }

          if (change.confidenceChanged) {
            result.confidenceChanges++
          }
        }

        // Save new snapshot
        await saveSnapshot(newSnapshot)
        result.snapshotsCreated++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push(`Rule ${rule.id}: ${errorMessage}`)
        console.error(`[regression-detector] Error processing rule ${rule.id}:`, errorMessage)
      }
    }

    // Step 3: TTL cleanup
    if (!skipTtlCleanup) {
      try {
        result.snapshotsDeleted = await cleanupOldSnapshots()
        console.log(
          `[regression-detector] TTL cleanup: deleted ${result.snapshotsDeleted} old snapshots`
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push(`TTL cleanup: ${errorMessage}`)
        console.error(`[regression-detector] TTL cleanup error:`, errorMessage)
      }
    }

    const duration = Date.now() - start
    const hasErrors = result.errors.length > 0
    const status = hasErrors ? "partial" : "success"

    jobsProcessed.inc({
      worker: "regression-detector",
      status,
      queue: "regression-detector",
    })
    jobDuration.observe(
      { worker: "regression-detector", queue: "regression-detector" },
      duration / 1000
    )

    console.log(`[regression-detector] Run ${runId} completed:`, {
      snapshotsCreated: result.snapshotsCreated,
      changesDetected: result.changesDetected,
      unexplainedChanges: result.unexplainedChanges,
      explainedChanges: result.explainedChanges,
      confidenceChanges: result.confidenceChanges,
      snapshotsDeleted: result.snapshotsDeleted,
      errors: result.errors.length,
      duration: `${duration}ms`,
    })

    return {
      success: !hasErrors,
      duration,
      data: result,
    }
  } catch (error) {
    jobsProcessed.inc({
      worker: "regression-detector",
      status: "failed",
      queue: "regression-detector",
    })

    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// =============================================================================
// WORKER SETUP
// =============================================================================

// Create and start worker
const worker = createWorker<RegressionDetectorJobData>(
  "regression-detector",
  processRegressionDetectorJob,
  {
    name: "regression-detector",
    concurrency: 1, // Only one regression detector at a time
    lockDuration: 300000, // 5 minutes - may take a while for many rules
    stalledInterval: 60000, // Check for stalled jobs every 1 min
  }
)

setupGracefulShutdown([worker])

console.log("[regression-detector] Worker started")
