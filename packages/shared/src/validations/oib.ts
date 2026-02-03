import { z } from "zod"

/**
 * Validates Croatian OIB (Osobni identifikacijski broj)
 * Uses ISO 7064 MOD 11,10 checksum algorithm
 */
export function validateOib(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) {
    return false
  }

  let sum = 10
  for (let i = 0; i < 10; i++) {
    const digit = oib.charAt(i)
    sum = (sum + parseInt(digit, 10)) % 10
    if (sum === 0) sum = 10
    sum = (sum * 2) % 11
  }

  const checkDigit = (11 - sum) % 10
  return checkDigit === parseInt(oib.charAt(10), 10)
}

/**
 * Zod schema for required OIB
 */
export const oibSchema = z
  .string()
  .length(11, "OIB mora imati točno 11 znamenki")
  .regex(/^\d{11}$/, "OIB mora sadržavati samo znamenke")
  .refine(validateOib, "Neispravan OIB - kontrolna znamenka ne odgovara")

/**
 * Zod schema for optional OIB
 */
export const oibOptionalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (oib) => !oib || oib === "" || validateOib(oib),
    "Neispravan OIB format"
  )
