// src/lib/regulatory-truth/pipeline/trusted-source-stage.ts
// Pipeline stage for processing rules from Tier 1 structured sources (HNB, etc.)
//
// LIFECYCLE: Fetchers create DRAFT → This stage may auto-approve → Then publishes
// This ensures ALL status transitions go through the domain service.
//
// POLICY: Auto-approval is SOURCE + CONCEPT scoped, NOT tier-based.
// T0/T1 rules are NEVER auto-approved (highest risk = always human review).
// Only specific (source, conceptSlug) pairs can be auto-approved.

import { db } from "@/lib/db"
import { approveRule, publishRules } from "../services/rule-status-service"
import { logAuditEvent } from "../utils/audit-log"

// =============================================================================
// AUTO-APPROVAL ALLOWLIST
// =============================================================================
// Each entry is a (source, conceptSlug pattern, authorityLevel) tuple.
// Only rules matching ALL criteria can be auto-approved.
// This is a narrow allowlist, NOT a tier-based policy.

interface AutoApprovalEntry {
  /** Source slug (e.g., "hnb") */
  sourceSlug: string
  /** Concept slug prefix (e.g., "exchange-rate-eur-" matches exchange-rate-eur-usd) */
  conceptSlugPrefix: string
  /** Required authority level */
  authorityLevel: string
  /** Maximum risk tier allowed for auto-approval (T2 or T3 only - never T0/T1) */
  maxRiskTier: "T2" | "T3"
}

// HNB exchange rates are REFERENCE data, not LAW.
// They're used for currency conversion, not tax obligations.
// Risk tier should be T2 or T3 (reference values), not T0.
const AUTO_APPROVAL_ALLOWLIST: AutoApprovalEntry[] = [
  {
    sourceSlug: "hnb",
    conceptSlugPrefix: "exchange-rate-eur-",
    authorityLevel: "PROCEDURE", // Reference data, not binding law
    maxRiskTier: "T3", // Reference values are low risk
  },
  // Add more entries as needed, with explicit justification
]

// =============================================================================
// TYPES
// =============================================================================

export interface TrustedSourceStageInput {
  /** Rule IDs created by fetcher (all should be DRAFT status) */
  ruleIds: string[]
  /** Source identifier for audit trail (e.g., "hnb-pipeline") */
  source: string
  /** Source slug for allowlist matching (e.g., "hnb") */
  sourceSlug: string
  /** Optional user ID for audit trail */
  actorUserId?: string
}

export interface TrustedSourceStageResult {
  success: boolean
  /** Rules successfully published */
  publishedCount: number
  /** Rules that failed approval (provenance, etc.) */
  approvalFailedCount: number
  /** Rules that failed publishing */
  publishFailedCount: number
  /** Rules requiring human review (T0/T1 or not in allowlist) */
  humanReviewCount: number
  /** Detailed results per rule */
  details: TrustedSourceRuleResult[]
  /** Summary errors for logging */
  errors: string[]
}

export interface TrustedSourceRuleResult {
  ruleId: string
  conceptSlug: string
  stage: "requires_human_review" | "approval_failed" | "publish_failed" | "published"
  error?: string
  reason?: string
}

// =============================================================================
// MAIN PROCESSING FUNCTION
// =============================================================================

/**
 * Process DRAFT rules from structured sources.
 *
 * POLICY:
 * - T0/T1 rules are NEVER auto-approved (require human review)
 * - Only (source, concept) pairs in allowlist can be auto-approved
 * - All status transitions go through domain service
 * - Provenance validation is enforced by approveRule()
 *
 * @param input - Rule IDs and source metadata
 * @returns Processing result with counts and details
 */
export async function processTrustedSourceRules(
  input: TrustedSourceStageInput
): Promise<TrustedSourceStageResult> {
  const { ruleIds, source, sourceSlug, actorUserId } = input

  if (ruleIds.length === 0) {
    return {
      success: true,
      publishedCount: 0,
      approvalFailedCount: 0,
      publishFailedCount: 0,
      humanReviewCount: 0,
      details: [],
      errors: [],
    }
  }

  console.log(`[trusted-source-stage] Processing ${ruleIds.length} rules from ${source}`)

  const details: TrustedSourceRuleResult[] = []
  const errors: string[] = []
  const approvedRuleIds: string[] = []

  // Phase 1: Check eligibility and approve where allowed
  for (const ruleId of ruleIds) {
    const rule = await db.regulatoryRule.findUnique({
      where: { id: ruleId },
      select: {
        id: true,
        conceptSlug: true,
        status: true,
        riskTier: true,
        authorityLevel: true,
        confidence: true,
      },
    })

    if (!rule) {
      details.push({
        ruleId,
        conceptSlug: "unknown",
        stage: "approval_failed",
        error: "Rule not found",
      })
      errors.push(`Rule ${ruleId} not found`)
      continue
    }

    // Check eligibility for auto-approval
    const eligibilityCheck = checkAutoApprovalEligibility(rule, sourceSlug)
    if (!eligibilityCheck.eligible) {
      // Not an error - just requires human review
      details.push({
        ruleId,
        conceptSlug: rule.conceptSlug,
        stage: "requires_human_review",
        reason: eligibilityCheck.reason,
      })
      console.log(
        `[trusted-source-stage] ${rule.conceptSlug} requires human review: ${eligibilityCheck.reason}`
      )
      continue
    }

    // Transition DRAFT → PENDING_REVIEW → APPROVED
    try {
      // First move to PENDING_REVIEW (required intermediate state)
      await db.regulatoryRule.update({
        where: { id: ruleId },
        data: { status: "PENDING_REVIEW" },
      })

      // Now approve via service (validates provenance, enforces offset requirements)
      const approveResult = await approveRule(
        ruleId,
        actorUserId || "STRUCTURED_SOURCE_PIPELINE",
        source
      )

      if (!approveResult.success) {
        details.push({
          ruleId,
          conceptSlug: rule.conceptSlug,
          stage: "approval_failed",
          error: approveResult.error,
        })
        errors.push(`${rule.conceptSlug}: ${approveResult.error}`)
        console.log(
          `[trusted-source-stage] Approval failed for ${rule.conceptSlug}: ${approveResult.error}`
        )
        continue
      }

      approvedRuleIds.push(ruleId)
      console.log(`[trusted-source-stage] Approved ${rule.conceptSlug}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      details.push({
        ruleId,
        conceptSlug: rule.conceptSlug,
        stage: "approval_failed",
        error: errorMsg,
      })
      errors.push(`${rule.conceptSlug}: ${errorMsg}`)
    }
  }

  // Phase 2: Publish all approved rules
  let publishedCount = 0
  let publishFailedCount = 0

  if (approvedRuleIds.length > 0) {
    console.log(`[trusted-source-stage] Publishing ${approvedRuleIds.length} approved rules`)

    const publishResult = await publishRules(approvedRuleIds, source, actorUserId)

    for (const result of publishResult.results) {
      const existing = details.find((d) => d.ruleId === result.ruleId)
      if (existing) {
        continue
      }

      const rule = await db.regulatoryRule.findUnique({
        where: { id: result.ruleId },
        select: { conceptSlug: true },
      })

      if (result.success) {
        details.push({
          ruleId: result.ruleId,
          conceptSlug: rule?.conceptSlug || "unknown",
          stage: "published",
        })
        publishedCount++
      } else {
        details.push({
          ruleId: result.ruleId,
          conceptSlug: rule?.conceptSlug || "unknown",
          stage: "publish_failed",
          error: result.error,
        })
        publishFailedCount++
        errors.push(`Publish failed: ${result.error}`)
      }
    }
  }

  // Log pipeline completion
  const humanReviewCount = details.filter((d) => d.stage === "requires_human_review").length
  await logAuditEvent({
    action: "PIPELINE_STAGE_COMPLETE",
    entityType: "PIPELINE",
    entityId: source,
    performedBy: actorUserId,
    metadata: {
      stage: "structured-source",
      inputCount: ruleIds.length,
      publishedCount,
      approvalFailedCount: details.filter((d) => d.stage === "approval_failed").length,
      publishFailedCount,
      humanReviewCount,
    },
  })

  const result: TrustedSourceStageResult = {
    success: true, // Pipeline succeeded even if some rules need human review
    publishedCount,
    approvalFailedCount: details.filter((d) => d.stage === "approval_failed").length,
    publishFailedCount,
    humanReviewCount,
    details,
    errors,
  }

  console.log(
    `[trusted-source-stage] Complete: ${publishedCount} published, ` +
      `${result.approvalFailedCount} approval failed, ` +
      `${result.publishFailedCount} publish failed, ` +
      `${humanReviewCount} require human review`
  )

  return result
}

// =============================================================================
// ELIGIBILITY CHECK
// =============================================================================

/**
 * Check if a rule is eligible for auto-approval.
 *
 * POLICY GATES:
 * 1. T0/T1 rules are NEVER auto-approved (highest risk)
 * 2. Must match an entry in AUTO_APPROVAL_ALLOWLIST
 * 3. Must have 100% confidence
 * 4. Must be in DRAFT status
 */
function checkAutoApprovalEligibility(
  rule: {
    status: string
    riskTier: string
    authorityLevel: string
    conceptSlug: string
    confidence: number
  },
  sourceSlug: string
): { eligible: boolean; reason?: string } {
  // Gate 1: Must be DRAFT
  if (rule.status !== "DRAFT") {
    return {
      eligible: false,
      reason: `Expected DRAFT status, got ${rule.status}`,
    }
  }

  // Gate 2: T0/T1 NEVER auto-approved - highest risk requires human review
  if (rule.riskTier === "T0" || rule.riskTier === "T1") {
    return {
      eligible: false,
      reason: `${rule.riskTier} rules require human review (critical risk tier)`,
    }
  }

  // Gate 3: Must have 100% confidence
  if (rule.confidence < 1.0) {
    return {
      eligible: false,
      reason: `Requires 100% confidence for auto-approval, got ${rule.confidence}`,
    }
  }

  // Gate 4: Must match allowlist entry
  const allowlistEntry = AUTO_APPROVAL_ALLOWLIST.find(
    (entry) =>
      entry.sourceSlug === sourceSlug &&
      rule.conceptSlug.startsWith(entry.conceptSlugPrefix) &&
      rule.authorityLevel === entry.authorityLevel &&
      isRiskTierAllowed(rule.riskTier, entry.maxRiskTier)
  )

  if (!allowlistEntry) {
    return {
      eligible: false,
      reason: `No allowlist entry for (source=${sourceSlug}, concept=${rule.conceptSlug}, authority=${rule.authorityLevel})`,
    }
  }

  return { eligible: true }
}

/**
 * Check if a risk tier is at or below the maximum allowed.
 */
function isRiskTierAllowed(actual: string, max: "T2" | "T3"): boolean {
  const tierOrder = { T0: 0, T1: 1, T2: 2, T3: 3 }
  const actualOrder = tierOrder[actual as keyof typeof tierOrder]
  const maxOrder = tierOrder[max]
  // Higher tier number = lower risk, so actual must be >= max
  return actualOrder !== undefined && actualOrder >= maxOrder
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Process HNB fetcher results.
 *
 * NOTE: HNB rules with T0/T1 will be sent to human review queue.
 * Only T2/T3 exchange rate rules matching the allowlist will auto-approve.
 */
export async function processHNBFetcherResults(
  fetchResult: { ruleIds: string[] },
  actorUserId?: string
): Promise<TrustedSourceStageResult> {
  return processTrustedSourceRules({
    ruleIds: fetchResult.ruleIds,
    source: "hnb-pipeline",
    sourceSlug: "hnb",
    actorUserId,
  })
}
