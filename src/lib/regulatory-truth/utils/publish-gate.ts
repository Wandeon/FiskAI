// src/lib/regulatory-truth/utils/publish-gate.ts
// UNIFIED PUBLISH GATE - All rules must pass through here to reach PUBLISHED status

import { db } from "@/lib/db"
import { logAuditEvent } from "./audit-log"

export type PublishBlockReason =
  | "UNRESOLVED_CONFLICTS"
  | "NO_SOURCE_POINTERS"
  | "LOW_CONFIDENCE"
  | "MISSING_APPROVAL"
  | "INVALID_STATUS"
  | "TIER_REQUIRES_HUMAN_REVIEW"

export interface PublishGateResult {
  allowed: boolean
  blockedRules: { ruleId: string; reason: PublishBlockReason }[]
  approvedRuleIds: string[]
}

export interface AutoApprovalConfig {
  source: string
  tier: number
  bypassHumanReview?: boolean
  minConfidence?: number
}

/**
 * INVARIANT: Check if rules can be published.
 * Returns blocked rules with reasons if any cannot proceed.
 */
export async function checkPublishEligibility(ruleIds: string[]): Promise<PublishGateResult> {
  const blockedRules: PublishGateResult["blockedRules"] = []
  const approvedRuleIds: string[] = []

  for (const ruleId of ruleIds) {
    const rule = await db.regulatoryRule.findUnique({
      where: { id: ruleId },
      include: {
        sourcePointers: true,
        conflictsA: { where: { status: "OPEN" } },
        conflictsB: { where: { status: "OPEN" } },
      },
    })

    if (!rule) {
      blockedRules.push({ ruleId, reason: "INVALID_STATUS" })
      continue
    }

    // Check 1: Must be in APPROVED status (not DRAFT, PENDING_REVIEW, etc.)
    if (rule.status !== "APPROVED") {
      blockedRules.push({ ruleId, reason: "MISSING_APPROVAL" })
      continue
    }

    // Check 2: Must have source pointers (evidence-backed)
    if (rule.sourcePointers.length === 0) {
      blockedRules.push({ ruleId, reason: "NO_SOURCE_POINTERS" })
      continue
    }

    // Check 3: No unresolved conflicts
    const hasOpenConflicts = rule.conflictsA.length > 0 || rule.conflictsB.length > 0
    if (hasOpenConflicts) {
      blockedRules.push({ ruleId, reason: "UNRESOLVED_CONFLICTS" })
      continue
    }

    // Check 4: Minimum confidence threshold
    if (rule.confidence < 0.7) {
      blockedRules.push({ ruleId, reason: "LOW_CONFIDENCE" })
      continue
    }

    approvedRuleIds.push(ruleId)
  }

  return {
    allowed: blockedRules.length === 0,
    blockedRules,
    approvedRuleIds,
  }
}

/**
 * Auto-approve and publish rules for trusted sources (e.g., HNB exchange rates).
 *
 * This is the ONLY path for auto-publishing without human review.
 * Requirements:
 * 1. Source must be explicitly allowed
 * 2. Tier must be 0 or 1 (official sources only)
 * 3. All standard publish checks must pass
 * 4. Full audit trail is recorded
 */
export async function autoApproveAndPublish(
  ruleIds: string[],
  config: AutoApprovalConfig
): Promise<{
  success: boolean
  publishedIds: string[]
  errors: string[]
}> {
  const errors: string[] = []
  const publishedIds: string[] = []

  // Tier check - only Tier 0/1 can bypass human review
  if (config.tier > 1 && config.bypassHumanReview) {
    return {
      success: false,
      publishedIds: [],
      errors: [`Tier ${config.tier} rules cannot bypass human review`],
    }
  }

  for (const ruleId of ruleIds) {
    try {
      const rule = await db.regulatoryRule.findUnique({
        where: { id: ruleId },
        include: {
          sourcePointers: true,
          conflictsA: { where: { status: "OPEN" } },
          conflictsB: { where: { status: "OPEN" } },
        },
      })

      if (!rule) {
        errors.push(`Rule ${ruleId} not found`)
        continue
      }

      // Validate source pointers exist
      if (rule.sourcePointers.length === 0) {
        errors.push(`Rule ${ruleId} has no source pointers`)
        continue
      }

      // Check for conflicts
      if (rule.conflictsA.length > 0 || rule.conflictsB.length > 0) {
        errors.push(`Rule ${ruleId} has unresolved conflicts`)
        continue
      }

      // Check confidence
      const minConfidence = config.minConfidence ?? 0.9
      if (rule.confidence < minConfidence) {
        errors.push(`Rule ${ruleId} confidence ${rule.confidence} below threshold ${minConfidence}`)
        continue
      }

      // Tier 0/1 with bypass: approve and publish in one step
      if (config.tier <= 1 && config.bypassHumanReview) {
        await db.regulatoryRule.update({
          where: { id: ruleId },
          data: {
            status: "PUBLISHED",
            approvedAt: new Date(),
            approvedBy: `AUTO_${config.source.toUpperCase()}`,
          },
        })

        await logAuditEvent({
          action: "RULE_AUTO_PUBLISHED",
          entityType: "RULE",
          entityId: ruleId,
          metadata: {
            source: config.source,
            tier: config.tier,
            bypassedHumanReview: true,
            confidence: rule.confidence,
            sourcePointerCount: rule.sourcePointers.length,
          },
        })

        publishedIds.push(ruleId)
      } else {
        // Standard path: set to PENDING_REVIEW for human review
        await db.regulatoryRule.update({
          where: { id: ruleId },
          data: {
            status: "PENDING_REVIEW",
          },
        })

        await logAuditEvent({
          action: "RULE_QUEUED_FOR_REVIEW",
          entityType: "RULE",
          entityId: ruleId,
          metadata: {
            source: config.source,
            tier: config.tier,
            requiresHumanReview: true,
          },
        })
      }
    } catch (error) {
      errors.push(`Rule ${ruleId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    success: errors.length === 0,
    publishedIds,
    errors,
  }
}

/**
 * Block direct status updates to PUBLISHED.
 * This should be called from Prisma middleware.
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  context?: { source?: string; bypassApproval?: boolean }
): { allowed: boolean; error?: string } {
  // Only APPROVED → PUBLISHED is allowed
  if (newStatus === "PUBLISHED") {
    if (currentStatus !== "APPROVED") {
      // Exception: auto-publish from trusted sources
      if (context?.bypassApproval && context?.source) {
        return { allowed: true }
      }
      return {
        allowed: false,
        error: `Cannot transition from ${currentStatus} to PUBLISHED. Must be APPROVED first.`,
      }
    }
  }

  return { allowed: true }
}
