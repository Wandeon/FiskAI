// src/lib/outbox/outbox-service.ts
/**
 * Outbox Service - Guaranteed Event Delivery
 *
 * Implements the transactional outbox pattern to ensure events are never lost,
 * even if the process crashes after a database transaction commits.
 *
 * Usage:
 *   // Within a transaction (recommended)
 *   await db.$transaction(async (tx) => {
 *     await tx.articleJob.create({ ... })
 *     await publishEvent("article_job.created", { jobId }, tx)
 *   })
 *
 *   // Outside a transaction (still safe - separate transaction)
 *   await publishEvent("webhook.received", { webhookId })
 */

import { db, type TransactionClient } from "@/lib/db"
import { OutboxEventStatus } from "@prisma/client"

// Event type constants for type safety
export const OutboxEventTypes = {
  // Article Agent events
  ARTICLE_JOB_STARTED: "article_job.started",
  ARTICLE_JOB_REWRITE: "article_job.rewrite",

  // Webhook events
  WEBHOOK_RECEIVED: "webhook.received",

  // System status events
  SYSTEM_STATUS_REFRESH: "system_status.refresh",
} as const

export type OutboxEventType = (typeof OutboxEventTypes)[keyof typeof OutboxEventTypes]

export interface PublishEventOptions {
  /** Delay processing by this many milliseconds */
  delayMs?: number
  /** Maximum retry attempts (default: 5) */
  maxAttempts?: number
}

/**
 * Publish an event to the outbox for guaranteed delivery.
 *
 * If called within a transaction, the event is created atomically with the
 * business operation. If called outside a transaction, creates a new transaction.
 *
 * @param eventType - The type of event (use OutboxEventTypes constants)
 * @param payload - The event payload (must be JSON-serializable)
 * @param txOrOptions - Either a Prisma transaction client or options
 * @returns The created event ID
 */
export async function publishEvent(
  eventType: string,
  payload: unknown,
  txOrOptions?: TransactionClient | PublishEventOptions
): Promise<string> {
  // Determine if we received a transaction client or options
  const isTransaction =
    txOrOptions && typeof txOrOptions === "object" && "outboxEvent" in txOrOptions
  const tx = isTransaction ? (txOrOptions as TransactionClient) : undefined
  const options = isTransaction ? undefined : (txOrOptions as PublishEventOptions | undefined)

  const client = tx ?? db

  const scheduledAt = options?.delayMs ? new Date(Date.now() + options.delayMs) : new Date()

  const event = await client.outboxEvent.create({
    data: {
      eventType,
      payload: payload as object,
      scheduledAt,
      maxAttempts: options?.maxAttempts ?? 5,
    },
  })

  return event.id
}

/**
 * Process a single outbox event.
 *
 * Called by the outbox worker. Marks the event as PROCESSING,
 * executes the handler, then marks as COMPLETED or FAILED.
 *
 * @param eventId - The event ID to process
 * @param handler - The function to execute for this event
 */
export async function processEvent(
  eventId: string,
  handler: (payload: unknown) => Promise<void>
): Promise<void> {
  // Atomically claim the event (prevents double-processing)
  const event = await db.outboxEvent.updateMany({
    where: {
      id: eventId,
      status: OutboxEventStatus.PENDING,
    },
    data: {
      status: OutboxEventStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  })

  if (event.count === 0) {
    // Event was already claimed or doesn't exist
    console.log(`[outbox] Event ${eventId} already claimed or not found`)
    return
  }

  try {
    // Fetch the full event data
    const fullEvent = await db.outboxEvent.findUnique({
      where: { id: eventId },
    })

    if (!fullEvent) {
      console.error(`[outbox] Event ${eventId} not found after claiming`)
      return
    }

    // Execute the handler
    await handler(fullEvent.payload)

    // Mark as completed
    await db.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxEventStatus.COMPLETED,
        processedAt: new Date(),
        lastError: null,
      },
    })

    console.log(`[outbox] Event ${eventId} (${fullEvent.eventType}) completed`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check if we've exceeded max attempts
    const currentEvent = await db.outboxEvent.findUnique({
      where: { id: eventId },
      select: { attempts: true, maxAttempts: true },
    })

    const shouldFail = currentEvent && currentEvent.attempts >= currentEvent.maxAttempts

    await db.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: shouldFail ? OutboxEventStatus.FAILED : OutboxEventStatus.PENDING,
        lastError: errorMessage,
        // If not failed, schedule retry with exponential backoff
        scheduledAt: shouldFail
          ? undefined
          : new Date(Date.now() + calculateBackoff(currentEvent?.attempts ?? 1)),
      },
    })

    if (shouldFail) {
      console.error(
        `[outbox] Event ${eventId} permanently failed after ${currentEvent?.attempts} attempts: ${errorMessage}`
      )
    } else {
      console.warn(
        `[outbox] Event ${eventId} failed (attempt ${currentEvent?.attempts}), will retry: ${errorMessage}`
      )
    }
  }
}

/**
 * Get pending events ready for processing.
 *
 * @param limit - Maximum number of events to fetch
 * @returns Array of pending events
 */
export async function getPendingEvents(limit: number = 100) {
  return db.outboxEvent.findMany({
    where: {
      status: OutboxEventStatus.PENDING,
      scheduledAt: { lte: new Date() },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  })
}

/**
 * Get statistics about the outbox.
 */
export async function getOutboxStats() {
  const [pending, processing, completed, failed] = await Promise.all([
    db.outboxEvent.count({ where: { status: OutboxEventStatus.PENDING } }),
    db.outboxEvent.count({ where: { status: OutboxEventStatus.PROCESSING } }),
    db.outboxEvent.count({ where: { status: OutboxEventStatus.COMPLETED } }),
    db.outboxEvent.count({ where: { status: OutboxEventStatus.FAILED } }),
  ])

  return {
    pending,
    processing,
    completed,
    failed,
    total: pending + processing + completed + failed,
  }
}

/**
 * Clean up old completed events (retention policy).
 *
 * @param olderThanDays - Delete completed events older than this many days
 * @returns Number of deleted events
 */
export async function cleanupCompletedEvents(olderThanDays: number = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

  const result = await db.outboxEvent.deleteMany({
    where: {
      status: OutboxEventStatus.COMPLETED,
      processedAt: { lt: cutoff },
    },
  })

  return result.count
}

/**
 * Reset stuck PROCESSING events back to PENDING.
 *
 * Events stuck in PROCESSING for too long (e.g., worker crashed) need to be reset.
 *
 * @param stuckForMinutes - Consider events stuck if processing for longer than this
 * @returns Number of reset events
 */
export async function resetStuckEvents(stuckForMinutes: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - stuckForMinutes * 60 * 1000)

  const result = await db.outboxEvent.updateMany({
    where: {
      status: OutboxEventStatus.PROCESSING,
      updatedAt: { lt: cutoff },
    },
    data: {
      status: OutboxEventStatus.PENDING,
      lastError: `Reset: stuck in PROCESSING state for >${stuckForMinutes} minutes`,
    },
  })

  if (result.count > 0) {
    console.warn(`[outbox] Reset ${result.count} stuck events`)
  }

  return result.count
}

/**
 * Calculate exponential backoff delay for retries.
 */
function calculateBackoff(attempt: number): number {
  // Base delay: 10s, 20s, 40s, 80s, 160s (max ~2.7 minutes)
  const baseDelay = 10_000
  const maxDelay = 300_000 // 5 minutes max
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
  // Add jitter (0-10% of delay)
  return delay + Math.random() * delay * 0.1
}
