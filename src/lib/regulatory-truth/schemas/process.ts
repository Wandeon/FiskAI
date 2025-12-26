// src/lib/regulatory-truth/schemas/process.ts
import { z } from "zod"

export const ProcessTypeSchema = z.enum([
  "REGISTRATION",
  "FILING",
  "APPEAL",
  "CLOSURE",
  "AMENDMENT",
  "INQUIRY",
])

export const ProcessStepSchema = z.object({
  orderNum: z.number().int().min(1),
  actionHr: z.string().min(1),
  actionEn: z.string().nullable().default(null),
  requiresStepIds: z.array(z.string()).default([]),
  requiresAssets: z.array(z.string()).default([]),
  onSuccessStepId: z.string().nullable().default(null),
  onFailureStepId: z.string().nullable().default(null),
  failureAction: z.string().nullable().default(null),
})

export const RegulatoryProcessSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  titleHr: z.string().min(1),
  titleEn: z.string().nullable().default(null),
  jurisdiction: z.string().default("HR"),
  processType: ProcessTypeSchema,
  estimatedTime: z.string().nullable().default(null),
  prerequisites: z.record(z.string(), z.unknown()).nullable().default(null),
  steps: z.array(ProcessStepSchema).min(1),
})

export type RegulatoryProcess = z.infer<typeof RegulatoryProcessSchema>
export type ProcessStep = z.infer<typeof ProcessStepSchema>
export type ProcessType = z.infer<typeof ProcessTypeSchema>
