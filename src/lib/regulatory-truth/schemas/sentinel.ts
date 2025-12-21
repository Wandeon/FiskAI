// src/lib/regulatory-truth/schemas/sentinel.ts
import { z } from "zod"
import { ContentTypeSchema, URLSchema, ISOTimestampSchema } from "./common"

// =============================================================================
// SENTINEL INPUT
// =============================================================================

export const SentinelInputSchema = z.object({
  sourceUrl: URLSchema,
  previousHash: z.string().nullable(),
  sourceId: z.string(),
})
export type SentinelInput = z.infer<typeof SentinelInputSchema>

// =============================================================================
// SENTINEL OUTPUT
// =============================================================================

export const SentinelOutputSchema = z.object({
  source_url: URLSchema,
  fetch_timestamp: ISOTimestampSchema,
  content_hash: z.string().min(64).max(64), // SHA-256 hex
  has_changed: z.boolean(),
  previous_hash: z.string().nullable(),
  extracted_content: z.string(),
  content_type: ContentTypeSchema,
  change_summary: z.string().nullable(),
  sections_changed: z.array(z.string()),
  fetch_status: z.enum(["success", "error"]),
  error_message: z.string().nullable(),
})
export type SentinelOutput = z.infer<typeof SentinelOutputSchema>

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateSentinelOutput(data: unknown): SentinelOutput {
  return SentinelOutputSchema.parse(data)
}

export function isSentinelOutputValid(data: unknown): data is SentinelOutput {
  return SentinelOutputSchema.safeParse(data).success
}
