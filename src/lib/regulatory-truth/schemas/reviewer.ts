// src/lib/regulatory-truth/schemas/reviewer.ts
import { z } from "zod"
import { ConfidenceSchema } from "./common"

// =============================================================================
// REVIEWER INPUT
// =============================================================================

export const ReviewerInputSchema = z.object({
  draftRuleId: z.string(),
  draftRule: z.object({
    conceptSlug: z.string(),
    titleHr: z.string(),
    riskTier: z.enum(["T0", "T1", "T2", "T3"]),
    appliesWhen: z.string(),
    value: z.union([z.string(), z.number()]),
    confidence: z.number(),
  }),
  sourcePointers: z.array(
    z.object({
      id: z.string(),
      exactQuote: z.string(),
      extractedValue: z.string(),
      confidence: z.number(),
    })
  ),
})
export type ReviewerInput = z.infer<typeof ReviewerInputSchema>

// =============================================================================
// VALIDATION CHECKS
// =============================================================================

export const ValidationChecksSchema = z.object({
  value_matches_source: z.boolean(),
  applies_when_correct: z.boolean(),
  risk_tier_appropriate: z.boolean(),
  dates_correct: z.boolean(),
  sources_complete: z.boolean(),
  no_conflicts: z.boolean(),
  translation_accurate: z.boolean(),
})
export type ValidationChecks = z.infer<typeof ValidationChecksSchema>

// =============================================================================
// ISSUE FOUND
// =============================================================================

export const IssueFoundSchema = z.object({
  severity: z.enum(["critical", "major", "minor"]),
  description: z.string(),
  recommendation: z.string(),
})
export type IssueFound = z.infer<typeof IssueFoundSchema>

// =============================================================================
// REVIEWER OUTPUT
// =============================================================================

export const ReviewerOutputSchema = z.object({
  review_result: z.object({
    draft_rule_id: z.string(),
    decision: z.enum(["APPROVE", "REJECT", "ESCALATE_HUMAN", "ESCALATE_ARBITER"]),
    validation_checks: ValidationChecksSchema,
    computed_confidence: ConfidenceSchema,
    issues_found: z.array(IssueFoundSchema),
    human_review_reason: z.string().nullable(),
    reviewer_notes: z.string(),
  }),
})
export type ReviewerOutput = z.infer<typeof ReviewerOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateReviewerOutput(data: unknown): ReviewerOutput {
  return ReviewerOutputSchema.parse(data)
}

export function isReviewerOutputValid(data: unknown): data is ReviewerOutput {
  return ReviewerOutputSchema.safeParse(data).success
}
