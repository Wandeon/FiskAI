// src/lib/outbox/handlers/index.ts
/**
 * Event Handler Registry
 *
 * Maps event types to their handler functions. Each handler receives
 * the event payload and performs the actual processing.
 */

import { OutboxEventTypes } from "../outbox-service"
import { handleArticleJobStarted, handleArticleJobRewrite } from "./article-job-handler"
import { handleWebhookReceived } from "./webhook-handler"
import { handleSystemStatusRefresh } from "./system-status-handler"

export type EventHandler = (payload: unknown) => Promise<void>

/**
 * Registry of event handlers by event type.
 * Add new handlers here as the system grows.
 */
export const eventHandlers: Record<string, EventHandler> = {
  [OutboxEventTypes.ARTICLE_JOB_STARTED]: handleArticleJobStarted,
  [OutboxEventTypes.ARTICLE_JOB_REWRITE]: handleArticleJobRewrite,
  [OutboxEventTypes.WEBHOOK_RECEIVED]: handleWebhookReceived,
  [OutboxEventTypes.SYSTEM_STATUS_REFRESH]: handleSystemStatusRefresh,
}

/**
 * Get the handler for an event type.
 * Returns undefined if no handler is registered.
 */
export function getEventHandler(eventType: string): EventHandler | undefined {
  return eventHandlers[eventType]
}

/**
 * Check if an event type has a registered handler.
 */
export function hasEventHandler(eventType: string): boolean {
  return eventType in eventHandlers
}
