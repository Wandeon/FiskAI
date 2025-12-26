// src/lib/regulatory-truth/schemas/content-classifier.ts
import { z } from "zod"

export const ClassificationContentTypeSchema = z.enum([
  "LOGIC", // Claims, thresholds, conditions → AtomicClaim
  "PROCESS", // Procedures, numbered steps → RegulatoryProcess
  "REFERENCE", // Tables, lookup data → ReferenceTable
  "DOCUMENT", // Forms, templates, downloads → RegulatoryAsset
  "TRANSITIONAL", // Prijelazne odredbe → TransitionalProvision
  "MIXED", // Contains multiple types
  "UNKNOWN", // Cannot classify
])

export const ContentClassificationSchema = z.object({
  primaryType: ClassificationContentTypeSchema,
  secondaryTypes: z.array(ClassificationContentTypeSchema).default([]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedExtractors: z.array(z.string()).min(1),
})

export type ClassificationContentType = z.infer<typeof ClassificationContentTypeSchema>
export type ContentClassification = z.infer<typeof ContentClassificationSchema>
