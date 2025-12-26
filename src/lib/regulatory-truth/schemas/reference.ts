// src/lib/regulatory-truth/schemas/reference.ts
import { z } from "zod"

export const ReferenceCategorySchema = z.enum([
  "IBAN",
  "CN_CODE",
  "TAX_OFFICE",
  "INTEREST_RATE",
  "EXCHANGE_RATE",
  "FORM_CODE",
  "DEADLINE_CALENDAR",
])

export const ReferenceEntrySchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).nullable().default(null),
})

export const ReferenceTableSchema = z.object({
  category: ReferenceCategorySchema,
  name: z.string().min(1),
  jurisdiction: z.string().default("HR"),
  keyColumn: z.string().min(1),
  valueColumn: z.string().min(1),
  entries: z.array(ReferenceEntrySchema).min(1),
  sourceUrl: z.string().url().nullable().default(null),
})

export type ReferenceTable = z.infer<typeof ReferenceTableSchema>
export type ReferenceEntry = z.infer<typeof ReferenceEntrySchema>
export type ReferenceCategory = z.infer<typeof ReferenceCategorySchema>
