// src/lib/outbox/handlers/webhook-handler.ts
/**
 * Webhook Event Handler
 *
 * Processes webhook events via the outbox pattern for guaranteed delivery.
 */

import { z } from "zod"
import { processWebhookEvent } from "@/lib/regulatory-truth/webhooks/processor"

// Payload schema
const webhookReceivedSchema = z.object({
  webhookEventId: z.string(),
})

/**
 * Handle webhook.received event.
 *
 * Delegates to the existing processWebhookEvent function which handles
 * fetching content, creating evidence, and queuing for extraction.
 */
export async function handleWebhookReceived(payload: unknown): Promise<void> {
  const parsed = webhookReceivedSchema.parse(payload)
  const { webhookEventId } = parsed

  console.log(`[outbox:webhook.received] Processing webhook event ${webhookEventId}`)

  try {
    await processWebhookEvent(webhookEventId)
    console.log(`[outbox:webhook.received] Webhook event ${webhookEventId} completed`)
  } catch (error) {
    console.error(`[outbox:webhook.received] Webhook event ${webhookEventId} failed:`, error)
    // Re-throw to mark the outbox event as failed
    throw error
  }
}
