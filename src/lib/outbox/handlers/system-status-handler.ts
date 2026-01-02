// src/lib/outbox/handlers/system-status-handler.ts
/**
 * System Status Refresh Handler
 *
 * Processes system status refresh requests via the outbox pattern.
 */

import { z } from "zod"
import { computeSystemStatusSnapshot } from "@/lib/system-status/refresh"
import { diffSnapshots } from "@/lib/system-status/diff"
import {
  getCurrentSnapshot,
  saveSnapshot,
  saveEvents,
  updateRefreshJob,
  releaseRefreshLock,
} from "@/lib/system-status/store"

// Payload schema
const systemStatusRefreshSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  timeoutSeconds: z.number(),
  lockKey: z.string(),
})

/**
 * Handle system_status.refresh event.
 *
 * Computes a system status snapshot, generates diff events,
 * and updates the refresh job status.
 */
export async function handleSystemStatusRefresh(payload: unknown): Promise<void> {
  const parsed = systemStatusRefreshSchema.parse(payload)
  const { jobId, userId, timeoutSeconds, lockKey } = parsed

  console.log(`[outbox:system_status.refresh] Processing refresh job ${jobId}`)

  try {
    await updateRefreshJob(jobId, {
      status: "RUNNING",
      startedAt: new Date(),
    })

    const snapshot = await computeSystemStatusSnapshot({
      requestedByUserId: userId,
      timeoutSeconds,
    })

    const prevSnapshot = await getCurrentSnapshot()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = prevSnapshot ? diffSnapshots(prevSnapshot as any, snapshot) : []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedSnapshot = await saveSnapshot(snapshot as unknown as any)
    if (events.length > 0) {
      await saveEvents(
        events.map((e) => ({
          ...e,
          requestedByUserId: userId,
        }))
      )
    }

    await updateRefreshJob(jobId, {
      status: "SUCCEEDED",
      finishedAt: new Date(),
      snapshotId: savedSnapshot.id,
    })

    console.log(
      `[outbox:system_status.refresh] Job ${jobId} completed, ${events.length} events generated`
    )
  } catch (error) {
    console.error(`[outbox:system_status.refresh] Job ${jobId} failed:`, error)

    await updateRefreshJob(jobId, {
      status: "FAILED",
      finishedAt: new Date(),
      error: error instanceof Error ? error.message : String(error),
    })

    // Re-throw to mark the outbox event as failed
    throw error
  } finally {
    // Always release lock
    await releaseRefreshLock(lockKey)
  }
}
