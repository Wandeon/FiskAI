// src/lib/regulatory-truth/schemas/atomic-claim.ts
import { z } from "zod"

export const SubjectTypeSchema = z.enum(["TAXPAYER", "EMPLOYER", "COMPANY", "INDIVIDUAL", "ALL"])

export const AssertionTypeSchema = z.enum(["OBLIGATION", "PROHIBITION", "PERMISSION", "DEFINITION"])

export const ClaimExceptionSchema = z.object({
  condition: z.string().min(1),
  overridesTo: z.string().min(1),
  sourceArticle: z.string().min(1),
})

export const AtomicClaimSchema = z.object({
  // WHO
  subjectType: SubjectTypeSchema,
  subjectQualifiers: z.array(z.string()).default([]),

  // WHEN
  triggerExpr: z.string().nullable().default(null),
  temporalExpr: z.string().nullable().default(null),
  jurisdiction: z.string().default("HR"),

  // WHAT
  assertionType: AssertionTypeSchema,
  logicExpr: z.string().min(1),
  value: z.string().nullable().default(null),
  valueType: z.string().nullable().default(null),

  // Extensibility
  parameters: z.record(z.string(), z.unknown()).nullable().default(null),

  // Provenance
  exactQuote: z.string().min(1),
  articleNumber: z.string().nullable().default(null),
  lawReference: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.8),

  // Exceptions
  exceptions: z.array(ClaimExceptionSchema).default([]),
})

export type AtomicClaim = z.infer<typeof AtomicClaimSchema>
export type ClaimException = z.infer<typeof ClaimExceptionSchema>
export type SubjectType = z.infer<typeof SubjectTypeSchema>
export type AssertionType = z.infer<typeof AssertionTypeSchema>
