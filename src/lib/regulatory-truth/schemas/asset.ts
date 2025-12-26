// src/lib/regulatory-truth/schemas/asset.ts
import { z } from "zod"

export const AssetFormatSchema = z.enum(["PDF", "XML", "XLS", "XLSX", "DOC", "DOCX", "HTML"])

export const AssetTypeSchema = z.enum([
  "FORM",
  "TEMPLATE",
  "GUIDE",
  "INSTRUCTION",
  "REGULATION_TEXT",
])

export const RegulatoryAssetSchema = z.object({
  formCode: z.string().nullable().default(null),
  officialName: z.string().min(1),
  description: z.string().nullable().default(null),
  downloadUrl: z.string().url(),
  format: AssetFormatSchema,
  fileSize: z.number().int().positive().nullable().default(null),
  assetType: AssetTypeSchema,
  stepNumber: z.number().int().positive().nullable().default(null),
  validFrom: z.string().datetime().nullable().default(null),
  validUntil: z.string().datetime().nullable().default(null),
  version: z.string().nullable().default(null),
  sourceUrl: z.string().url(),
})

export type RegulatoryAsset = z.infer<typeof RegulatoryAssetSchema>
export type AssetFormat = z.infer<typeof AssetFormatSchema>
export type AssetType = z.infer<typeof AssetTypeSchema>
