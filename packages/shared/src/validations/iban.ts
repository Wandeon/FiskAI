import { z } from "zod"

/**
 * Validates Croatian IBAN format
 * Format: HR + 19 digits = 21 characters total
 */
export function validateCroatianIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "").toUpperCase()
  return /^HR\d{19}$/.test(cleaned)
}

/**
 * Formats IBAN with spaces for display
 * HR1234567890123456789 → HR12 3456 7890 1234 5678 9
 */
export function formatIban(iban: string): string {
  const cleaned = iban.replace(/\s/g, "").toUpperCase()
  return cleaned.replace(/(.{4})/g, "$1 ").trim()
}

/**
 * Zod schema for Croatian IBAN
 */
export const ibanSchema = z
  .string()
  .transform((val) => val.replace(/\s/g, "").toUpperCase())
  .refine(validateCroatianIban, "Neispravan IBAN format (HR + 19 znamenki)")

export const ibanOptionalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((val) => val?.replace(/\s/g, "").toUpperCase() || "")
  .refine(
    (iban) => !iban || iban === "" || validateCroatianIban(iban),
    "Neispravan IBAN format"
  )
