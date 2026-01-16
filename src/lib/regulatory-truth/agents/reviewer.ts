// src/lib/regulatory-truth/agents/reviewer.ts

import { db, runWithRegulatoryContext } from "@/lib/db"
import { RiskTier } from "@prisma/client"
import {
  ReviewerInputSchema,
  ReviewerOutputSchema,
  type ReviewerInput,
  type ReviewerOutput,
} from "../schemas"
import { runAgent } from "./runner"
import { logAuditEvent } from "../utils/audit-log"
import { approveRule } from "../services/rule-status-service"
import { requestRuleReview } from "../services/human-review-service"

// =============================================================================
// REVIEWER AGENT
// =============================================================================

export interface ReviewerResult {
  success: boolean
  output: ReviewerOutput | null
  updatedRuleId: string | null
  error: string | null
}

/** Correlation options for tracking agent runs across the pipeline */
export interface CorrelationOptions {
  runId?: string
  jobId?: string
  parentJobId?: string
  sourceSlug?: string
  queueName?: string
}

/**
 * Find existing rules that might conflict with this one
 */
async function findConflictingRules(rule: {
  id: string
  conceptSlug: string
  effectiveFrom: Date
}): Promise<Array<{ id: string; conceptSlug: string }>> {
  return db.regulatoryRule.findMany({
    where: {
      id: { not: rule.id },
      conceptSlug: rule.conceptSlug,
      status: { in: ["PUBLISHED", "APPROVED"] },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: rule.effectiveFrom } }],
    },
    select: { id: true, conceptSlug: true },
  })
}

/**
 * Check if a rule can be auto-approved.
 *
 * TIERED GATE: T0/T1 rules require explicit opt-in AND higher confidence threshold.
 * This is the single point of enforcement for tier-based auto-approval policy.
 *
 * Configuration (per Appendix A: Safe Human-Removal Policy):
 * - AUTO_APPROVE_ALL_TIERS=true enables T0/T1 auto-approval
 * - T0/T1 requires confidence >= 0.98 (AUTO_APPROVE_T0T1_CONFIDENCE)
 * - T2/T3 requires confidence >= 0.90 (AUTO_APPROVE_MIN_CONFIDENCE)
 *
 * @param rule - Rule to check for auto-approval eligibility
 * @returns Whether auto-approval is allowed for this rule
 */
export async function canAutoApprove(rule: {
  id: string
  riskTier: string
  status: string
  confidence: number
}): Promise<boolean> {
  // Environment configuration
  const autoApproveAllTiers = process.env.AUTO_APPROVE_ALL_TIERS === "true"
  const gracePeriodHours = parseInt(process.env.AUTO_APPROVE_GRACE_HOURS || "24")

  // Tiered confidence thresholds per Appendix A
  const T0_T1_MIN_CONFIDENCE = parseFloat(process.env.AUTO_APPROVE_T0T1_CONFIDENCE || "0.98")
  const T2_T3_MIN_CONFIDENCE = parseFloat(process.env.AUTO_APPROVE_MIN_CONFIDENCE || "0.90")

  // ========================================
  // TIERED GATE: T0/T1 require explicit opt-in AND higher confidence
  // ========================================
  if (rule.riskTier === "T0" || rule.riskTier === "T1") {
    if (!autoApproveAllTiers) {
      return false // T0/T1 blocked unless explicitly enabled
    }
    // T0/T1 requires higher confidence threshold (0.98)
    if (rule.confidence < T0_T1_MIN_CONFIDENCE) {
      return false
    }
  } else {
    // T2/T3 use standard confidence threshold (0.90)
    if (rule.confidence < T2_T3_MIN_CONFIDENCE) {
      return false
    }
  }

  // Only PENDING_REVIEW rules can be auto-approved
  if (rule.status !== "PENDING_REVIEW") {
    return false
  }

  // Check grace period via updatedAt
  const cutoffDate = new Date(Date.now() - gracePeriodHours * 60 * 60 * 1000)
  const ruleData = await db.regulatoryRule.findUnique({
    where: { id: rule.id },
    select: { updatedAt: true },
  })
  if (!ruleData || ruleData.updatedAt >= cutoffDate) {
    return false
  }

  // Check for open conflicts
  const openConflicts = await db.regulatoryConflict.count({
    where: {
      status: "OPEN",
      OR: [{ itemAId: rule.id }, { itemBId: rule.id }],
    },
  })
  if (openConflicts > 0) {
    return false
  }

  return true
}

/**
 * Auto-approve PENDING_REVIEW rules that meet criteria:
 * - Have been pending for at least 24 hours (grace period)
 * - T0/T1: confidence >= 0.98 AND AUTO_APPROVE_ALL_TIERS=true
 * - T2/T3: confidence >= 0.90 (existing behavior)
 * - No open conflicts
 *
 * This provides a grace period for rules while applying tiered confidence
 * thresholds per Appendix A: Safe Human-Removal Policy.
 *
 * POLICY NOTE: This is DIFFERENT from structured-source auto-approval:
 * - Structured sources (HNB, etc.) → require allowlist match via isAutoApprovalAllowed()
 * - Grace period auto-approval → does NOT require allowlist because rules already
 *   passed the PENDING_REVIEW queue gate and weren't rejected by humans
 *
 * We set autoApprove=true in context for audit purposes, but don't pass sourceSlug
 * because this isn't a structured source flow.
 */
export async function autoApproveEligibleRules(): Promise<{
  approved: number
  skipped: number
  errors: string[]
}> {
  const gracePeriodHours = parseInt(process.env.AUTO_APPROVE_GRACE_HOURS || "24")
  const autoApproveAllTiers = process.env.AUTO_APPROVE_ALL_TIERS === "true"
  const T0_T1_MIN_CONFIDENCE = parseFloat(process.env.AUTO_APPROVE_T0T1_CONFIDENCE || "0.98")
  const T2_T3_MIN_CONFIDENCE = parseFloat(process.env.AUTO_APPROVE_MIN_CONFIDENCE || "0.90")
  const cutoffDate = new Date(Date.now() - gracePeriodHours * 60 * 60 * 1000)

  console.log(
    `[auto-approve] Config: grace=${gracePeriodHours}h, allTiers=${autoApproveAllTiers}, ` +
      `T0/T1 min=${T0_T1_MIN_CONFIDENCE}, T2/T3 min=${T2_T3_MIN_CONFIDENCE}`
  )

  // Find eligible rules with base criteria
  // Query differs based on whether all tiers are enabled
  const eligibleRules = await db.regulatoryRule.findMany({
    where: autoApproveAllTiers
      ? {
          status: "PENDING_REVIEW",
          updatedAt: { lt: cutoffDate },
          // All tiers if enabled - don't filter by confidence here, apply tiered thresholds per-rule
          conflictsA: { none: { status: "OPEN" } },
          conflictsB: { none: { status: "OPEN" } },
        }
      : {
          status: "PENDING_REVIEW",
          updatedAt: { lt: cutoffDate },
          // Only T2/T3 by default
          riskTier: { in: [RiskTier.T2, RiskTier.T3] },
          conflictsA: { none: { status: "OPEN" } },
          conflictsB: { none: { status: "OPEN" } },
        },
    select: {
      id: true,
      conceptSlug: true,
      riskTier: true,
      confidence: true,
      updatedAt: true,
      status: true,
    },
  })

  // Log count of T0/T1 rules status
  if (!autoApproveAllTiers) {
    const skippedCritical = await db.regulatoryRule.count({
      where: {
        status: "PENDING_REVIEW",
        riskTier: { in: [RiskTier.T0, RiskTier.T1] },
      },
    })
    if (skippedCritical > 0) {
      console.log(
        `[auto-approve] ${skippedCritical} T0/T1 rules awaiting human approval (AUTO_APPROVE_ALL_TIERS=false)`
      )
    }
  }

  const results = { approved: 0, skipped: 0, errors: [] as string[] }

  for (const rule of eligibleRules) {
    try {
      // Apply tiered confidence threshold
      const minConfidence =
        rule.riskTier === "T0" || rule.riskTier === "T1"
          ? T0_T1_MIN_CONFIDENCE
          : T2_T3_MIN_CONFIDENCE

      if (rule.confidence < minConfidence) {
        console.log(
          `[auto-approve] SKIPPED: ${rule.conceptSlug} confidence ${rule.confidence} < ` +
            `required ${minConfidence} for ${rule.riskTier}`
        )
        results.skipped++
        continue
      }

      // Defense-in-depth: verify via canAutoApprove()
      if (!(await canAutoApprove(rule))) {
        console.log(
          `[auto-approve] BLOCKED: ${rule.conceptSlug} (tier: ${rule.riskTier}) failed canAutoApprove gate`
        )
        results.skipped++
        continue
      }

      // INVARIANT: NEVER approve rules without source pointers
      const pointerCount = await db.sourcePointer.count({
        where: { rules: { some: { id: rule.id } } },
      })

      if (pointerCount === 0) {
        console.log(
          `[auto-approve] BLOCKED: ${rule.conceptSlug} has 0 source pointers - cannot approve without evidence`
        )
        results.skipped++
        continue
      }

      console.log(
        `[auto-approve] Attempting: ${rule.conceptSlug} (tier: ${rule.riskTier}, confidence: ${rule.confidence})`
      )

      // Use approveRule service with proper context
      const approveResult = await runWithRegulatoryContext(
        { source: "grace-period-auto-approve", autoApprove: true },
        () => approveRule(rule.id, "AUTO_APPROVE_SYSTEM", "grace-period-auto-approve")
      )
      if (!approveResult.success) {
        console.log(`[auto-approve] FAILED: ${rule.conceptSlug} - ${approveResult.error}`)
        results.errors.push(`${rule.id}: ${approveResult.error}`)
        continue
      }

      // Update reviewer notes
      await db.regulatoryRule.update({
        where: { id: rule.id },
        data: {
          reviewerNotes: JSON.stringify({
            auto_approved: true,
            reason: `Grace period (${gracePeriodHours}h) elapsed with confidence ${rule.confidence} >= ${minConfidence} threshold for ${rule.riskTier}`,
            approved_at: new Date().toISOString(),
            tier: rule.riskTier,
            threshold_applied: minConfidence,
          }),
        },
      })

      console.log(
        `[auto-approve] Approved: ${rule.conceptSlug} (tier: ${rule.riskTier}, confidence: ${rule.confidence})`
      )
      results.approved++
    } catch (error) {
      results.errors.push(`${rule.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(
    `[auto-approve] Complete: ${results.approved} approved, ${results.skipped} skipped, ${results.errors.length} errors`
  )
  return results
}

/**
 * Run the Reviewer agent to validate a Draft Rule
 */
export async function runReviewer(
  ruleId: string,
  correlationOpts?: CorrelationOptions
): Promise<ReviewerResult> {
  // Get rule from database
  const rule = await db.regulatoryRule.findUnique({
    where: { id: ruleId },
  })

  if (!rule) {
    return {
      success: false,
      output: null,
      updatedRuleId: null,
      error: `Rule not found: ${ruleId}`,
    }
  }

  // Query source pointers separately (many-to-many relation, no evidence include)
  const sourcePointers = await db.sourcePointer.findMany({
    where: { rules: { some: { id: ruleId } } },
  })

  // Build input for agent
  const input: ReviewerInput = {
    draftRuleId: rule.id,
    draftRule: {
      conceptSlug: rule.conceptSlug,
      titleHr: rule.titleHr,
      riskTier: rule.riskTier,
      appliesWhen: rule.appliesWhen,
      value: rule.value,
      confidence: rule.confidence,
    },
    sourcePointers: sourcePointers.map((sp) => ({
      id: sp.id,
      exactQuote: sp.exactQuote,
      extractedValue: sp.extractedValue,
      confidence: sp.confidence,
    })),
  }

  // Run the agent
  const result = await runAgent<ReviewerInput, ReviewerOutput>({
    agentType: "REVIEWER",
    input,
    inputSchema: ReviewerInputSchema,
    outputSchema: ReviewerOutputSchema,
    temperature: 0.1,
    ruleId: rule.id,
    // Pass correlation options from worker
    runId: correlationOpts?.runId,
    jobId: correlationOpts?.jobId,
    parentJobId: correlationOpts?.parentJobId,
    sourceSlug: correlationOpts?.sourceSlug,
    queueName: correlationOpts?.queueName ?? "review",
  })

  if (!result.success || !result.output) {
    return {
      success: false,
      output: null,
      updatedRuleId: null,
      error: result.error,
    }
  }

  // Process review decision
  const reviewOutput = result.output.review_result
  let newStatus = rule.status

  switch (reviewOutput.decision) {
    case "APPROVE":
      // ========================================
      // ABSOLUTE GATE: T0/T1 check FIRST (Issue #845)
      // ========================================
      // This check MUST come before any other approval logic.
      // T0/T1 rules require human review regardless of confidence or other factors.
      if (rule.riskTier === "T0" || rule.riskTier === "T1") {
        newStatus = "PENDING_REVIEW"
        // Create centralized human review request (Issue #884)
        await requestRuleReview(rule.id, {
          riskTier: rule.riskTier,
          confidence: reviewOutput.computed_confidence,
          reviewerNotes: reviewOutput.reviewer_notes,
        })
        console.log(
          `[reviewer] ${rule.riskTier} rule ${rule.conceptSlug} requires human approval (never auto-approved)`
        )
        break
      }

      // INVARIANT: NEVER approve rules without source pointers
      const pointerCount = await db.sourcePointer.count({
        where: { rules: { some: { id: rule.id } } },
      })

      if (pointerCount === 0) {
        newStatus = "PENDING_REVIEW"
        console.log(
          `[reviewer] BLOCKED: Rule ${rule.conceptSlug} has 0 source pointers - cannot approve without evidence`
        )
        break
      }

      // Only T2/T3 can reach here - auto-approve with high confidence
      if (
        (rule.riskTier === "T2" || rule.riskTier === "T3") &&
        reviewOutput.computed_confidence >= 0.95
      ) {
        // Auto-approve for T2/T3 rules with high confidence
        newStatus = "APPROVED"
      } else {
        newStatus = "PENDING_REVIEW"
      }
      break

    case "REJECT":
      newStatus = "REJECTED"
      break

    case "ESCALATE_HUMAN":
      newStatus = "PENDING_REVIEW"
      // Create centralized human review request (Issue #884)
      await requestRuleReview(rule.id, {
        riskTier: rule.riskTier,
        confidence: reviewOutput.computed_confidence,
        reviewerNotes: reviewOutput.human_review_reason || reviewOutput.reviewer_notes,
      })
      break

    case "ESCALATE_ARBITER":
      // Find potentially conflicting rules
      const conflictingRules = await findConflictingRules(rule)

      if (conflictingRules.length > 0) {
        // Create conflict for Arbiter
        const conflict = await db.regulatoryConflict.create({
          data: {
            conflictType: "SCOPE_CONFLICT",
            status: "OPEN",
            itemAId: rule.id,
            itemBId: conflictingRules[0].id,
            description:
              reviewOutput.human_review_reason || "Potential conflict detected during review",
            metadata: {
              detectedBy: "REVIEWER",
              allConflictingRuleIds: conflictingRules.map((r) => r.id),
            },
          },
        })
        console.log(`[reviewer] Created conflict ${conflict.id} for Arbiter`)
      }

      newStatus = "PENDING_REVIEW"
      break
  }

  // Update rule with review results
  const updatedRule = await db.regulatoryRule.update({
    where: { id: rule.id },
    data: {
      status: newStatus,
      reviewerNotes: JSON.stringify({
        decision: reviewOutput.decision,
        validation_checks: reviewOutput.validation_checks,
        computed_confidence: reviewOutput.computed_confidence,
        issues_found: reviewOutput.issues_found,
        human_review_reason: reviewOutput.human_review_reason,
        reviewer_notes: reviewOutput.reviewer_notes,
        reviewed_at: new Date().toISOString(),
        tier: rule.riskTier,
      }),
      confidence: reviewOutput.computed_confidence,
      ...(newStatus === "APPROVED" && {
        approvedAt: new Date(),
      }),
    },
  })

  // Log audit event for review decision (includes tier for Issue #845)
  await logAuditEvent({
    action:
      newStatus === "APPROVED"
        ? "RULE_APPROVED"
        : newStatus === "REJECTED"
          ? "RULE_REJECTED"
          : "RULE_CREATED",
    entityType: "RULE",
    entityId: rule.id,
    metadata: {
      decision: reviewOutput.decision,
      newStatus,
      confidence: reviewOutput.computed_confidence,
      tier: rule.riskTier,
    },
  })

  return {
    success: true,
    output: result.output,
    updatedRuleId: updatedRule.id,
    error: null,
  }
}
