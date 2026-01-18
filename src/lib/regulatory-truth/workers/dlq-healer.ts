// src/lib/regulatory-truth/workers/dlq-healer.ts
//
// DLQ Auto-Classification and Self-Healing Replay
// Automatically replays transient failures (NETWORK, TIMEOUT) after cooldown.
// Escalates permanent failures (AUTH, VALIDATION) for human review.

import { createHash } from "crypto"
import {
  ErrorCategory,
  classifyError,
  isTransientError,
  getCooldownMs,
} from "../utils/error-classifier"
import { deadletterQueue, allQueues, type DeadLetterJobData } from "./queues"

// Lazy import for retry-learning to avoid DB dependency in unit tests
// This module is only loaded when adaptive cooldowns are actually used
let retryLearningModule: typeof import("../utils/retry-learning") | null = null

async function getRetryLearning() {
  if (!retryLearningModule) {
    retryLearningModule = await import("../utils/retry-learning")
  }
  return retryLearningModule
}

/** Maximum auto-retry attempts per DLQ entry */
export const MAX_AUTO_RETRIES = 3

/**
 * DLQ entry with error classification and retry tracking.
 */
export interface DLQEntryWithClassification {
  originalJobId: string | undefined
  originalQueue: string
  originalJobName?: string
  originalJobData: unknown
  error: string
  errorCategory: ErrorCategory
  failedAt: string
  retryCount: number
  idempotencyKey: string
  firstFailedAt?: string
  stackTrace?: string
}

/**
 * State tracking for auto-replayed jobs.
 * Maps idempotencyKey -> replay metadata.
 */
interface AutoReplayState {
  replayed: boolean
  replayedAt?: string
}

// In-memory state for tracking replayed jobs (per-process)
// In production, this should be stored in Redis for cross-process consistency
const replayedJobs = new Map<string, AutoReplayState>()

/**
 * Generate an idempotency key for a DLQ entry.
 * Key = jobId + hash(payload) to prevent duplicate processing.
 */
export function createIdempotencyKey(jobId: string | undefined, payload: unknown): string {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .substring(0, 16)

  return `${jobId ?? "unknown"}-${payloadHash}`
}

/**
 * Check if a DLQ entry should be auto-replayed (sync version using fixed cooldowns).
 * Returns true only if:
 * 1. Error category is transient (NETWORK, TIMEOUT, QUOTA, PARSE)
 * 2. Retry count < MAX_AUTO_RETRIES (3)
 * 3. Cooldown period has elapsed
 * 4. Job hasn't already been replayed (idempotency check)
 */
export function shouldAutoReplay(entry: DLQEntryWithClassification): boolean {
  // Check if error is retryable
  if (!isTransientError(entry.errorCategory)) {
    return false
  }

  // Check retry cap
  if (entry.retryCount >= MAX_AUTO_RETRIES) {
    return false
  }

  // Check if already replayed (idempotency)
  if (replayedJobs.has(entry.idempotencyKey)) {
    return false
  }

  // Check cooldown period with exponential backoff (fixed cooldowns)
  const cooldownMs = getCooldownMs(entry.errorCategory)
  const backoffMultiplier = Math.pow(2, entry.retryCount)
  const totalCooldownMs = cooldownMs * backoffMultiplier
  const failedAt = new Date(entry.failedAt).getTime()
  const now = Date.now()

  if (now - failedAt < totalCooldownMs) {
    return false
  }

  return true
}

/**
 * Check if a DLQ entry should be auto-replayed using adaptive cooldowns.
 * Uses learned optimal wait times per error category when available.
 * Returns the actual wait time used for learning feedback.
 */
export async function shouldAutoReplayAdaptive(
  entry: DLQEntryWithClassification
): Promise<{ canReplay: boolean; actualWaitMs: number }> {
  // Check if error is retryable
  if (!isTransientError(entry.errorCategory)) {
    return { canReplay: false, actualWaitMs: 0 }
  }

  // Check retry cap
  if (entry.retryCount >= MAX_AUTO_RETRIES) {
    return { canReplay: false, actualWaitMs: 0 }
  }

  // Check if already replayed (idempotency)
  if (replayedJobs.has(entry.idempotencyKey)) {
    return { canReplay: false, actualWaitMs: 0 }
  }

  // Get adaptive cooldown (learned from historical data)
  const retryLearning = await getRetryLearning()
  const baseCooldownMs = await retryLearning.getAdaptiveCooldownMs(entry.errorCategory)
  const backoffMultiplier = Math.pow(2, entry.retryCount)
  const totalCooldownMs = baseCooldownMs * backoffMultiplier

  const failedAt = new Date(entry.failedAt).getTime()
  const now = Date.now()
  const actualWaitMs = now - failedAt

  if (actualWaitMs < totalCooldownMs) {
    return { canReplay: false, actualWaitMs }
  }

  return { canReplay: true, actualWaitMs }
}

/**
 * Record that a job has been auto-replayed.
 * Prevents duplicate replays via idempotency key.
 */
export function recordAutoReplay(idempotencyKey: string): void {
  replayedJobs.set(idempotencyKey, {
    replayed: true,
    replayedAt: new Date().toISOString(),
  })
}

/**
 * Get the auto-replay state for a DLQ entry.
 * Returns calculated cooldown timing information.
 */
export function getAutoReplayState(entry: DLQEntryWithClassification): {
  canReplay: boolean
  nextReplayAfterMs: number
  retryCount: number
  alreadyReplayed: boolean
} {
  const cooldownMs = getCooldownMs(entry.errorCategory)
  const backoffMultiplier = Math.pow(2, entry.retryCount)
  const nextReplayAfterMs = cooldownMs * backoffMultiplier

  return {
    canReplay: shouldAutoReplay(entry),
    nextReplayAfterMs,
    retryCount: entry.retryCount,
    alreadyReplayed: replayedJobs.has(entry.idempotencyKey),
  }
}

/**
 * Clear all auto-replay state.
 * Used for testing and daily resets.
 */
export function clearAutoReplayState(): void {
  replayedJobs.clear()
}

/**
 * Convert a DLQ job to a classified entry with idempotency key.
 */
export function classifyDLQJob(dlqData: DeadLetterJobData): DLQEntryWithClassification {
  const classified = classifyError(dlqData.error)

  return {
    originalJobId: dlqData.originalJobId,
    originalQueue: dlqData.originalQueue,
    originalJobName: dlqData.originalJobName,
    originalJobData: dlqData.originalJobData,
    error: dlqData.error,
    errorCategory: classified.category,
    failedAt: dlqData.failedAt,
    retryCount: dlqData.attemptsMade ?? 0,
    idempotencyKey: createIdempotencyKey(dlqData.originalJobId, dlqData.originalJobData),
    firstFailedAt: dlqData.firstFailedAt,
    stackTrace: dlqData.stackTrace,
  }
}

/**
 * Healing cycle result for monitoring and logging.
 */
export interface HealingCycleResult {
  scanned: number
  replayed: number
  skipped: number
  escalated: number
  errors: string[]
  byCategory: Record<ErrorCategory, number>
  adaptiveLearning?: {
    outcomesRecorded: number
    avgWaitTimeMs: number
  }
}

/**
 * Healing cycle options
 */
export interface HealingCycleOptions {
  /** Use adaptive cooldowns learned from historical data */
  useAdaptiveCooldowns?: boolean
  /** Record outcomes for adaptive learning */
  recordLearningData?: boolean
}

/**
 * Run a single healing cycle.
 * Scans DLQ jobs, auto-replays eligible ones, escalates permanent failures.
 *
 * @param options - Configuration for adaptive learning
 */
export async function runHealingCycle(
  options: HealingCycleOptions = {}
): Promise<HealingCycleResult> {
  const { useAdaptiveCooldowns = true, recordLearningData = true } = options

  const result: HealingCycleResult = {
    scanned: 0,
    replayed: 0,
    skipped: 0,
    escalated: 0,
    errors: [],
    byCategory: {
      [ErrorCategory.AUTH]: 0,
      [ErrorCategory.QUOTA]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.PARSE]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.EMPTY]: 0,
      [ErrorCategory.TIMEOUT]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    },
  }

  // Track wait times for learning feedback
  const waitTimesForLearning: Array<{
    errorCategory: ErrorCategory
    waitTimeMs: number
    success: boolean
  }> = []

  try {
    // Get all waiting/active DLQ jobs
    const jobs = await deadletterQueue.getJobs(["waiting", "active"], 0, 1000)
    result.scanned = jobs.length

    for (const job of jobs) {
      const dlqData = job.data as DeadLetterJobData
      const entry = classifyDLQJob(dlqData)

      // Track by category
      result.byCategory[entry.errorCategory]++

      // Check if eligible for auto-replay (using adaptive or fixed cooldowns)
      let canReplay: boolean
      let actualWaitMs = 0

      if (useAdaptiveCooldowns) {
        const adaptiveResult = await shouldAutoReplayAdaptive(entry)
        canReplay = adaptiveResult.canReplay
        actualWaitMs = adaptiveResult.actualWaitMs
      } else {
        canReplay = shouldAutoReplay(entry)
        // Calculate wait time for fixed cooldowns
        const failedAt = new Date(entry.failedAt).getTime()
        actualWaitMs = Date.now() - failedAt
      }

      if (canReplay) {
        const targetQueue = allQueues[entry.originalQueue as keyof typeof allQueues]

        if (!targetQueue) {
          result.errors.push(`Queue ${entry.originalQueue} not found for job ${job.id}`)
          result.skipped++
          continue
        }

        try {
          // Add job back to original queue with incremented retry count
          // Safely merge retry count into job data (handle non-object data gracefully)
          const baseData = entry.originalJobData
          const newJobData =
            typeof baseData === "object" && baseData !== null
              ? { ...baseData, _dlqRetryCount: entry.retryCount + 1 }
              : { _originalData: baseData, _dlqRetryCount: entry.retryCount + 1 }

          await targetQueue.add(entry.originalJobName ?? "replay", newJobData, {
            jobId: `replay-${entry.originalJobId}-${Date.now()}`,
          })

          // Mark as replayed
          recordAutoReplay(entry.idempotencyKey)

          // Remove from DLQ
          await job.remove()

          result.replayed++

          // Record successful replay for learning
          if (recordLearningData && isTransientError(entry.errorCategory)) {
            waitTimesForLearning.push({
              errorCategory: entry.errorCategory,
              waitTimeMs: actualWaitMs,
              success: true, // Replay was initiated (actual success tracked on next cycle)
            })
          }

          console.log(
            `[dlq-healer] Replayed job ${job.id} (${entry.errorCategory}, retry ${entry.retryCount + 1}, ` +
              `wait ${Math.round(actualWaitMs / 1000)}s${useAdaptiveCooldowns ? ", adaptive" : ""})`
          )
        } catch (error) {
          result.errors.push(
            `Failed to replay job ${job.id}: ${error instanceof Error ? error.message : String(error)}`
          )
          result.skipped++

          // Record failed replay for learning
          if (recordLearningData && isTransientError(entry.errorCategory)) {
            waitTimesForLearning.push({
              errorCategory: entry.errorCategory,
              waitTimeMs: actualWaitMs,
              success: false,
            })
          }
        }
      } else if (!isTransientError(entry.errorCategory)) {
        // Permanent failure - escalate (keep in DLQ for human review)
        result.escalated++
      } else {
        // Transient but not ready for replay (cooldown or max retries)
        result.skipped++
      }
    }

    // Record learning data
    if (recordLearningData && waitTimesForLearning.length > 0) {
      try {
        const retryLearning = await getRetryLearning()
        for (const outcome of waitTimesForLearning) {
          await retryLearning.recordRetryOutcome(outcome)
        }

        const avgWaitMs =
          waitTimesForLearning.reduce((sum, o) => sum + o.waitTimeMs, 0) /
          waitTimesForLearning.length

        result.adaptiveLearning = {
          outcomesRecorded: waitTimesForLearning.length,
          avgWaitTimeMs: avgWaitMs,
        }
      } catch (learningError) {
        console.warn(
          `[dlq-healer] Failed to record learning data: ${learningError instanceof Error ? learningError.message : String(learningError)}`
        )
      }
    }
  } catch (error) {
    result.errors.push(
      `Healing cycle failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Log summary
  const adaptiveInfo = result.adaptiveLearning
    ? ` learning=${result.adaptiveLearning.outcomesRecorded}`
    : ""
  console.log(
    `[dlq-healer] Cycle complete: scanned=${result.scanned} replayed=${result.replayed} ` +
      `skipped=${result.skipped} escalated=${result.escalated} errors=${result.errors.length}${adaptiveInfo}`
  )

  return result
}
