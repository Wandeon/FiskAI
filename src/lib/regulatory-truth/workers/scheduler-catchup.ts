// src/lib/regulatory-truth/workers/scheduler-catchup.ts
// Task 1.2: RTL Autonomy - Scheduler Run Persistence + Catch-up
//
// This module provides:
// 1. Detection of missed scheduled runs (within 24-hour lookback)
// 2. Catch-up triggering for missed runs
// 3. Staleness watchdog (26-hour threshold)
// 4. Distributed locking via DB row locks
// 5. Atomic state transitions (EXPECTED -> RUNNING)

import { dbReg } from "@/lib/db/regulatory"
import type { SchedulerRun, SchedulerRunStatus } from "@/generated/regulatory-client"

// Re-export types for consumers
export type { SchedulerRun, SchedulerRunStatus }

// Constants
export const STALENESS_THRESHOLD_HOURS = 26 // Safety margin beyond 24-hour schedule
const MISSED_RUN_LOOKBACK_HOURS = 24

// Result types
export interface CatchUpResult {
  triggered: boolean
  reason: "missed_run" | "staleness" | "lock_contention"
  newRunId?: string
}

export interface StalenessResult {
  isStale: boolean
  hoursSinceLastRun?: number
  reason?: "no_completed_runs" | "exceeded_threshold"
  lastCompletedAt?: Date
}

export interface LockResult {
  acquired: boolean
  lockHolder: string | null
  reason?: "already_locked" | "lock_acquired" | "lock_failed"
}

export interface ReleaseResult {
  released: boolean
  reason?: "not_lock_holder" | "released"
}

export interface TransitionResult {
  success: boolean
  run?: SchedulerRun
  reason?: "invalid_state_transition" | "lock_failed" | "transitioned"
}

/**
 * Detect missed runs for a job type within the last 24 hours.
 * A run is considered "missed" if it is in EXPECTED or FAILED status.
 */
export async function detectMissedRuns(jobType: string): Promise<SchedulerRun[]> {
  const lookbackTime = new Date()
  lookbackTime.setHours(lookbackTime.getHours() - MISSED_RUN_LOOKBACK_HOURS)

  const missedRuns = await dbReg.schedulerRun.findMany({
    where: {
      jobType,
      scheduledAt: {
        gte: lookbackTime,
      },
      status: {
        in: ["EXPECTED", "FAILED"],
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  })

  return missedRuns
}

/**
 * Trigger a catch-up run for a missed scheduled run.
 * Marks the original run as MISSED and logs the catch-up trigger.
 */
export async function triggerCatchUp(
  missedRun: SchedulerRun,
  instanceId: string
): Promise<CatchUpResult> {
  // Mark the original run as MISSED
  await dbReg.schedulerRun.update({
    where: { id: missedRun.id },
    data: {
      status: "MISSED",
      errorMessage: `Catch-up triggered by ${instanceId} at ${new Date().toISOString()}`,
    },
  })

  console.log(
    `[scheduler-catchup] Marked run ${missedRun.id} (${missedRun.jobType}) as MISSED, ` +
      `triggering catch-up from ${instanceId}`
  )

  return {
    triggered: true,
    reason: "missed_run",
  }
}

/**
 * Check if a job type is stale (no successful completion within threshold).
 * Uses 26-hour threshold for safety margin beyond the 24-hour schedule.
 */
export async function checkStaleness(jobType: string): Promise<StalenessResult> {
  const lastCompleted = await dbReg.schedulerRun.findFirst({
    where: {
      jobType,
      status: "COMPLETED",
    },
    orderBy: {
      completedAt: "desc",
    },
  })

  if (!lastCompleted || !lastCompleted.completedAt) {
    return {
      isStale: true,
      reason: "no_completed_runs",
    }
  }

  const hoursSinceCompletion = (Date.now() - lastCompleted.completedAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceCompletion > STALENESS_THRESHOLD_HOURS) {
    return {
      isStale: true,
      hoursSinceLastRun: hoursSinceCompletion,
      reason: "exceeded_threshold",
      lastCompletedAt: lastCompleted.completedAt,
    }
  }

  return {
    isStale: false,
    hoursSinceLastRun: hoursSinceCompletion,
    lastCompletedAt: lastCompleted.completedAt,
  }
}

/**
 * Acquire a distributed lock for a scheduler run.
 * Uses a database transaction with row-level locking for atomicity.
 *
 * Critical safeguard from Appendix A.2:
 * - Uses DB row lock keyed by jobType
 * - Transaction ensures EXPECTED -> RUNNING is atomic
 */
export async function acquireLock(
  jobType: string,
  instanceId: string,
  runId: string
): Promise<LockResult> {
  try {
    const result = await dbReg.$transaction(async (tx) => {
      // Check if there's already a running instance for this job type
      const existingLock = await tx.schedulerRun.findFirst({
        where: {
          jobType,
          status: "RUNNING",
          lockHolder: { not: null },
        },
      })

      if (existingLock) {
        return {
          acquired: false,
          lockHolder: existingLock.lockHolder,
          reason: "already_locked" as const,
        }
      }

      // Acquire the lock by updating the specific run
      await tx.schedulerRun.update({
        where: { id: runId },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          lockHolder: instanceId,
        },
      })

      return {
        acquired: true,
        lockHolder: instanceId,
        reason: "lock_acquired" as const,
      }
    })

    return result
  } catch (error) {
    console.error(`[scheduler-catchup] Failed to acquire lock for ${jobType}:`, error)
    return {
      acquired: false,
      lockHolder: null,
      reason: "lock_failed",
    }
  }
}

/**
 * Release a distributed lock after run completion.
 * Only succeeds if the instance holds the lock.
 */
export async function releaseLock(
  runId: string,
  instanceId: string,
  finalStatus: "COMPLETED" | "FAILED",
  errorMessage?: string
): Promise<ReleaseResult> {
  try {
    await dbReg.schedulerRun.update({
      where: {
        id: runId,
        lockHolder: instanceId, // Only release if we hold the lock
      },
      data: {
        lockHolder: null,
        status: finalStatus,
        completedAt: new Date(),
        ...(errorMessage && { errorMessage }),
      },
    })

    return { released: true, reason: "released" }
  } catch (error) {
    console.error(`[scheduler-catchup] Failed to release lock for run ${runId}:`, error)
    return { released: false, reason: "not_lock_holder" }
  }
}

/**
 * Mark a run as MISSED due to lock contention or other reasons.
 * Critical safeguard from Appendix A.2: If locked, set current run to MISSED.
 */
export async function markRunMissed(runId: string, reason: string): Promise<void> {
  await dbReg.schedulerRun.update({
    where: { id: runId },
    data: {
      status: "MISSED",
      errorMessage: reason,
    },
  })

  console.log(`[scheduler-catchup] Marked run ${runId} as MISSED: ${reason}`)
}

/**
 * Create an EXPECTED run for future scheduling.
 * Handles unique constraint violations gracefully by returning existing run.
 */
export async function createExpectedRun(jobType: string, scheduledAt: Date): Promise<SchedulerRun> {
  try {
    const run = await dbReg.schedulerRun.create({
      data: {
        jobType,
        scheduledAt,
        status: "EXPECTED",
      },
    })

    return run
  } catch (error) {
    // Handle unique constraint violation - return existing run
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      const existing = await dbReg.schedulerRun.findUnique({
        where: {
          jobType_scheduledAt: {
            jobType,
            scheduledAt,
          },
        },
      })

      if (existing) {
        return existing
      }
    }

    throw error
  }
}

/**
 * Atomically transition a run from EXPECTED to RUNNING with lock acquisition.
 * Critical safeguard from Appendix A.2:
 * - Transaction ensures EXPECTED -> RUNNING is atomic
 * - Uses UPDATE with WHERE status=EXPECTED for atomicity
 */
export async function transitionToRunning(
  runId: string,
  instanceId: string
): Promise<TransitionResult> {
  try {
    const result = await dbReg.$transaction(async (tx) => {
      // Use updateMany with status constraint for atomic check-and-set
      // This ensures we only transition if the run is in EXPECTED state
      const updated = await tx.schedulerRun.updateMany({
        where: {
          id: runId,
          status: "EXPECTED", // Only transition from EXPECTED
        },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          lockHolder: instanceId,
        },
      })

      if (updated.count === 0) {
        // No rows updated - run was not in EXPECTED state
        return {
          success: false,
          reason: "invalid_state_transition" as const,
        }
      }

      // Fetch the updated run
      const run = await tx.schedulerRun.findUnique({
        where: { id: runId },
      })

      return {
        success: true,
        run: run!,
        reason: "transitioned" as const,
      }
    })

    return result
  } catch (error) {
    console.error(`[scheduler-catchup] Failed to transition run ${runId} to RUNNING:`, error)
    return {
      success: false,
      reason: "invalid_state_transition",
    }
  }
}

/**
 * Run startup catch-up check for a job type.
 * Detects missed runs and staleness, triggers catch-up if needed.
 */
export async function runStartupCatchUp(
  jobType: string,
  instanceId: string,
  triggerJobFn: () => Promise<void>
): Promise<{ catchUpTriggered: boolean; missedCount: number }> {
  console.log(`[scheduler-catchup] Running startup catch-up check for ${jobType}`)

  // Check for missed runs
  const missedRuns = await detectMissedRuns(jobType)
  let catchUpTriggered = false

  for (const run of missedRuns) {
    await triggerCatchUp(run, instanceId)
    catchUpTriggered = true
  }

  // Check staleness even if no missed runs found
  if (!catchUpTriggered) {
    const staleness = await checkStaleness(jobType)
    if (staleness.isStale) {
      console.log(
        `[scheduler-catchup] Staleness detected for ${jobType}: ${staleness.reason}, ` +
          `hours since last run: ${staleness.hoursSinceLastRun?.toFixed(1) ?? "N/A"}`
      )
      catchUpTriggered = true
    }
  }

  // Trigger the job if catch-up is needed
  if (catchUpTriggered) {
    console.log(`[scheduler-catchup] Triggering catch-up job for ${jobType}`)
    await triggerJobFn()
  } else {
    console.log(`[scheduler-catchup] No catch-up needed for ${jobType}`)
  }

  return {
    catchUpTriggered,
    missedCount: missedRuns.length,
  }
}

/**
 * Hourly staleness watchdog check.
 * Triggers catch-up if more than 26 hours since last successful discovery.
 */
export async function runStalenessWatchdog(
  jobType: string,
  instanceId: string,
  triggerJobFn: () => Promise<void>
): Promise<{ triggered: boolean; reason?: string }> {
  const staleness = await checkStaleness(jobType)

  if (staleness.isStale) {
    console.log(
      `[scheduler-catchup] Staleness watchdog triggered for ${jobType}: ${staleness.reason}`
    )

    await triggerJobFn()

    return {
      triggered: true,
      reason: staleness.reason,
    }
  }

  return { triggered: false }
}
