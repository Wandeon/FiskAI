// src/lib/regulatory-truth/schemas/releaser.ts
import { z } from "zod"
import { ISODateSchema, ISOTimestampSchema } from "./common"

// =============================================================================
// RELEASER INPUT
// =============================================================================

export const ReleaserInputSchema = z.object({
  approvedRuleIds: z.array(z.string()).min(1),
  previousVersion: z.string().nullable(), // e.g., "1.0.0"
})
export type ReleaserInput = z.infer<typeof ReleaserInputSchema>

// =============================================================================
// RULE INCLUSION
// =============================================================================

export const RuleInclusionSchema = z.object({
  rule_id: z.string(),
  concept_slug: z.string(),
  action: z.enum(["add", "update", "deprecate"]),
  supersedes: z.string().nullable(),
})
export type RuleInclusion = z.infer<typeof RuleInclusionSchema>

// =============================================================================
// AUDIT TRAIL
// =============================================================================

export const AuditTrailSchema = z.object({
  source_evidence_count: z.number().int().min(0),
  source_pointer_count: z.number().int().min(0),
  review_count: z.number().int().min(0),
  human_approvals: z.number().int().min(0),
})
export type AuditTrail = z.infer<typeof AuditTrailSchema>

// =============================================================================
// RELEASER OUTPUT
// =============================================================================

export const ReleaserOutputSchema = z.object({
  release: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver format"),
    release_type: z.enum(["major", "minor", "patch"]),
    released_at: ISOTimestampSchema,
    effective_from: ISODateSchema,
    rules_included: z.array(RuleInclusionSchema),
    content_hash: z.string().min(64).max(64), // SHA-256 hex
    changelog_hr: z.string(),
    changelog_en: z.string(),
    approved_by: z.array(z.string()),
    audit_trail: AuditTrailSchema,
  }),
})
export type ReleaserOutput = z.infer<typeof ReleaserOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateReleaserOutput(data: unknown): ReleaserOutput {
  return ReleaserOutputSchema.parse(data)
}

export function isReleaserOutputValid(data: unknown): data is ReleaserOutput {
  return ReleaserOutputSchema.safeParse(data).success
}
