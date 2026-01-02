// src/lib/outbox/index.ts
/**
 * Outbox Pattern Module
 *
 * Provides guaranteed event delivery through the transactional outbox pattern.
 * Events are stored in the database atomically with business operations,
 * then processed by a background worker.
 *
 * Key components:
 * - publishEvent: Store an event for later processing
 * - processEvent: Execute an event's handler
 * - outbox-worker: Background processor for pending events
 *
 * Usage:
 *   import { publishEvent, OutboxEventTypes } from "@/lib/outbox"
 *
 *   // Within a transaction (recommended)
 *   await db.$transaction(async (tx) => {
 *     await tx.someModel.create({ ... })
 *     await publishEvent(OutboxEventTypes.SOME_EVENT, { data }, tx)
 *   })
 */

// Core service
export {
  publishEvent,
  processEvent,
  getPendingEvents,
  getOutboxStats,
  cleanupCompletedEvents,
  resetStuckEvents,
  OutboxEventTypes,
  type OutboxEventType,
  type PublishEventOptions,
} from "./outbox-service"

// Handlers
export { getEventHandler, hasEventHandler, eventHandlers } from "./handlers"

// Worker
export { startOutboxWorker, schedulePolling, getOutboxHealth, outboxQueue } from "./outbox-worker"
