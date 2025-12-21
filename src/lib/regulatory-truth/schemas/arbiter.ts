// src/lib/regulatory-truth/schemas/arbiter.ts
import { z } from "zod"
import { ConflictTypeSchema, ConfidenceSchema } from "./common"

// =============================================================================
// ARBITER INPUT
// =============================================================================

export const ConflictingItemSchema = z.object({
  item_id: z.string(),
  item_type: z.enum(["source", "rule"]),
  claim: z.string(),
})
export type ConflictingItem = z.infer<typeof ConflictingItemSchema>

export const ArbiterInputSchema = z.object({
  conflictId: z.string(),
  conflictType: ConflictTypeSchema,
  conflictingItems: z.array(ConflictingItemSchema).min(2),
})
export type ArbiterInput = z.infer<typeof ArbiterInputSchema>

// =============================================================================
// RESOLUTION
// =============================================================================

export const ResolutionStrategySchema = z.enum([
  "hierarchy",
  "temporal",
  "specificity",
  "conservative",
])
export type ResolutionStrategy = z.infer<typeof ResolutionStrategySchema>

export const ResolutionSchema = z.object({
  winning_item_id: z.string(),
  resolution_strategy: ResolutionStrategySchema,
  rationale_hr: z.string(),
  rationale_en: z.string(),
})
export type Resolution = z.infer<typeof ResolutionSchema>

// =============================================================================
// ARBITER OUTPUT
// =============================================================================

export const ArbiterOutputSchema = z.object({
  arbitration: z.object({
    conflict_id: z.string(),
    conflict_type: ConflictTypeSchema,
    conflicting_items: z.array(ConflictingItemSchema),
    resolution: ResolutionSchema,
    confidence: ConfidenceSchema,
    requires_human_review: z.boolean(),
    human_review_reason: z.string().nullable(),
  }),
})
export type ArbiterOutput = z.infer<typeof ArbiterOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateArbiterOutput(data: unknown): ArbiterOutput {
  return ArbiterOutputSchema.parse(data)
}

export function isArbiterOutputValid(data: unknown): data is ArbiterOutput {
  return ArbiterOutputSchema.safeParse(data).success
}
