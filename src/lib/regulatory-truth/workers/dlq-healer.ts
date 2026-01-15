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
 * Check if a DLQ entry should be auto-replayed.
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

  // Check cooldown period with exponential backoff
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
}

/**
 * Run a single healing cycle.
 * Scans DLQ jobs, auto-replays eligible ones, escalates permanent failures.
 */
export async function runHealingCycle(): Promise<HealingCycleResult> {
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

  try {
    // Get all waiting/active DLQ jobs
    const jobs = await deadletterQueue.getJobs(["waiting", "active"], 0, 1000)
    result.scanned = jobs.length

    for (const job of jobs) {
      const dlqData = job.data as DeadLetterJobData
      const entry = classifyDLQJob(dlqData)

      // Track by category
      result.byCategory[entry.errorCategory]++

      // Check if eligible for auto-replay
      if (shouldAutoReplay(entry)) {
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
          console.log(
            `[dlq-healer] Replayed job ${job.id} (${entry.errorCategory}, retry ${entry.retryCount + 1})`
          )
        } catch (error) {
          result.errors.push(
            `Failed to replay job ${job.id}: ${error instanceof Error ? error.message : String(error)}`
          )
          result.skipped++
        }
      } else if (!isTransientError(entry.errorCategory)) {
        // Permanent failure - escalate (keep in DLQ for human review)
        result.escalated++
      } else {
        // Transient but not ready for replay (cooldown or max retries)
        result.skipped++
      }
    }
  } catch (error) {
    result.errors.push(
      `Healing cycle failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Log summary
  console.log(
    `[dlq-healer] Cycle complete: scanned=${result.scanned} replayed=${result.replayed} ` +
      `skipped=${result.skipped} escalated=${result.escalated} errors=${result.errors.length}`
  )

  return result
}
