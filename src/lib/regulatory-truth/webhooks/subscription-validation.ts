// src/lib/regulatory-truth/webhooks/subscription-validation.ts
/**
 * WebhookSubscription Validation
 *
 * Since WebhookSubscription.sourceId is a soft ref to RegulatorySource in regulatory.prisma,
 * we must validate at creation time that the referenced source exists.
 *
 * This replaces the FK constraint that was removed during the schema split.
 */

import { db } from "@/lib/db" // For WebhookSubscription (in core)
import { dbReg } from "@/lib/db/regulatory" // For RegulatorySource (in regulatory)

export interface CreateWebhookSubscriptionInput {
  sourceId?: string | null
  provider: string
  webhookType: string
  endpointUrl?: string | null
  isActive?: boolean
  config?: Record<string, unknown> | null
  filterPatterns?: string[]
  secretKey?: string | null
  authToken?: string | null
  verifySSL?: boolean
}

/**
 * Validate that a RegulatorySource exists before creating a WebhookSubscription.
 *
 * IMPORTANT: Always use this function instead of db.webhookSubscription.create directly
 * when providing a sourceId. This replaces the FK integrity check.
 *
 * @throws Error if sourceId is provided but the source doesn't exist
 */
export async function validateAndCreateWebhookSubscription(
  input: CreateWebhookSubscriptionInput
): Promise<{ id: string }> {
  // Validate sourceId if provided
  if (input.sourceId) {
    const source = await dbReg.regulatorySource.findUnique({
      where: { id: input.sourceId },
      select: { id: true, isActive: true },
    })

    if (!source) {
      throw new Error(
        `Cannot create WebhookSubscription: RegulatorySource "${input.sourceId}" does not exist`
      )
    }

    if (!source.isActive) {
      console.warn(
        `[webhook-subscription] Creating subscription for inactive source: ${input.sourceId}`
      )
    }
  }

  // Create the subscription
  const subscription = await db.webhookSubscription.create({
    data: {
      sourceId: input.sourceId,
      provider: input.provider,
      webhookType: input.webhookType,
      endpointUrl: input.endpointUrl,
      isActive: input.isActive ?? true,
      config: input.config ?? undefined,
      filterPatterns: input.filterPatterns ?? [],
      secretKey: input.secretKey,
      authToken: input.authToken,
      verifySSL: input.verifySSL ?? true,
    },
    select: { id: true },
  })

  console.log(
    `[webhook-subscription] Created subscription ${subscription.id}` +
      (input.sourceId ? ` for source ${input.sourceId}` : "")
  )

  return subscription
}

/**
 * Validate that a RegulatorySource exists before updating a WebhookSubscription.
 *
 * @throws Error if sourceId is provided but the source doesn't exist
 */
export async function validateAndUpdateWebhookSubscription(
  subscriptionId: string,
  update: Partial<CreateWebhookSubscriptionInput>
): Promise<{ id: string }> {
  // Validate sourceId if being updated
  if (update.sourceId !== undefined && update.sourceId !== null) {
    const source = await dbReg.regulatorySource.findUnique({
      where: { id: update.sourceId },
      select: { id: true },
    })

    if (!source) {
      throw new Error(
        `Cannot update WebhookSubscription: RegulatorySource "${update.sourceId}" does not exist`
      )
    }
  }

  // Update the subscription
  const subscription = await db.webhookSubscription.update({
    where: { id: subscriptionId },
    data: {
      sourceId: update.sourceId,
      provider: update.provider,
      webhookType: update.webhookType,
      endpointUrl: update.endpointUrl,
      isActive: update.isActive,
      config: update.config ?? undefined,
      filterPatterns: update.filterPatterns,
      secretKey: update.secretKey,
      authToken: update.authToken,
      verifySSL: update.verifySSL,
    },
    select: { id: true },
  })

  return subscription
}
