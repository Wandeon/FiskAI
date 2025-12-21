// src/lib/regulatory-truth/schemas/composer.ts
import { z } from "zod"
import { RiskTierSchema, ValueTypeSchema, ConfidenceSchema, ISODateSchema } from "./common"

// =============================================================================
// COMPOSER INPUT
// =============================================================================

export const ComposerInputSchema = z.object({
  sourcePointerIds: z.array(z.string()).min(1),
  sourcePointers: z.array(
    z.object({
      id: z.string(),
      domain: z.string(),
      extractedValue: z.string(),
      exactQuote: z.string(),
      confidence: z.number(),
    })
  ),
})
export type ComposerInput = z.infer<typeof ComposerInputSchema>

// =============================================================================
// DRAFT RULE
// =============================================================================

export const DraftRuleSchema = z.object({
  concept_slug: z.string().regex(/^[a-z0-9-]+$/, "Must be kebab-case"),
  title_hr: z.string().min(1),
  title_en: z.string().min(1),
  risk_tier: RiskTierSchema,
  applies_when: z.string().min(1), // AppliesWhen DSL expression
  value: z.union([z.string(), z.number()]),
  value_type: ValueTypeSchema,
  explanation_hr: z.string(),
  explanation_en: z.string(),
  source_pointer_ids: z.array(z.string()).min(1),
  effective_from: ISODateSchema,
  effective_until: ISODateSchema.nullable(),
  supersedes: z.string().nullable(),
  confidence: ConfidenceSchema,
  composer_notes: z.string(),
})
export type DraftRule = z.infer<typeof DraftRuleSchema>

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

export const ConflictDetectedSchema = z.object({
  description: z.string(),
  conflicting_sources: z.array(z.string()),
  escalate_to_arbiter: z.literal(true),
})
export type ConflictDetected = z.infer<typeof ConflictDetectedSchema>

// =============================================================================
// COMPOSER OUTPUT
// =============================================================================

export const ComposerOutputSchema = z.object({
  draft_rule: DraftRuleSchema,
  conflicts_detected: ConflictDetectedSchema.optional(),
})
export type ComposerOutput = z.infer<typeof ComposerOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateComposerOutput(data: unknown): ComposerOutput {
  return ComposerOutputSchema.parse(data)
}

export function isComposerOutputValid(data: unknown): data is ComposerOutput {
  return ComposerOutputSchema.safeParse(data).success
}
