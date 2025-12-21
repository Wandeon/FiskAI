// src/lib/regulatory-truth/schemas/extractor.ts
import { z } from "zod"
import { DomainSchema, ValueTypeSchema, ConfidenceSchema } from "./common"

// =============================================================================
// EXTRACTOR INPUT
// =============================================================================

export const ExtractorInputSchema = z.object({
  evidenceId: z.string(),
  content: z.string(),
  contentType: z.enum(["html", "pdf", "xml"]),
  sourceUrl: z.string().url(),
})
export type ExtractorInput = z.infer<typeof ExtractorInputSchema>

// =============================================================================
// EXTRACTION ITEM
// =============================================================================

export const ExtractionItemSchema = z.object({
  id: z.string(),
  domain: DomainSchema,
  value_type: ValueTypeSchema,
  extracted_value: z.union([z.string(), z.number()]),
  display_value: z.string(),
  exact_quote: z.string().min(1),
  context_before: z.string(),
  context_after: z.string(),
  selector: z.string(),
  confidence: ConfidenceSchema,
  extraction_notes: z.string(),
})
export type ExtractionItem = z.infer<typeof ExtractionItemSchema>

// =============================================================================
// EXTRACTOR OUTPUT
// =============================================================================

export const ExtractorOutputSchema = z.object({
  evidence_id: z.string(),
  extractions: z.array(ExtractionItemSchema),
  extraction_metadata: z.object({
    total_extractions: z.number().int().min(0),
    by_domain: z.record(z.string(), z.number()),
    low_confidence_count: z.number().int().min(0),
    processing_notes: z.string(),
  }),
})
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateExtractorOutput(data: unknown): ExtractorOutput {
  return ExtractorOutputSchema.parse(data)
}

export function isExtractorOutputValid(data: unknown): data is ExtractorOutput {
  return ExtractorOutputSchema.safeParse(data).success
}
