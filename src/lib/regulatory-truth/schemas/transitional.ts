// src/lib/regulatory-truth/schemas/transitional.ts
import { z } from "zod"

export const TransitionPatternSchema = z.enum([
  "INVOICE_DATE",
  "DELIVERY_DATE",
  "PAYMENT_DATE",
  "EARLIER_EVENT",
  "LATER_EVENT",
  "TAXPAYER_CHOICE",
])

export const TransitionalProvisionSchema = z.object({
  fromRule: z.string().min(1),
  toRule: z.string().min(1),
  cutoffDate: z.string().datetime(),
  logicExpr: z.string().min(1),
  appliesRule: z.string().min(1),
  explanationHr: z.string().min(1),
  explanationEn: z.string().nullable().default(null),
  pattern: TransitionPatternSchema,
  sourceArticle: z.string().min(1),
})

export type TransitionalProvision = z.infer<typeof TransitionalProvisionSchema>
export type TransitionPattern = z.infer<typeof TransitionPatternSchema>
