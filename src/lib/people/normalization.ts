import { validateIban } from "@/lib/barcode"

const WHITESPACE_REGEX = /\s+/g

function normalizeWhitespace(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().replace(WHITESPACE_REGEX, " ")
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeName(value: string): { display: string; normalized: string } {
  const display = normalizeWhitespace(value) ?? ""
  const normalized = display
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
  return { display, normalized }
}

export function normalizeOptionalName(value?: string | null): string | null {
  if (!value) return null
  return normalizeWhitespace(value)
}

export function normalizeAddress(value?: string | null): string | null {
  return normalizeWhitespace(value)
}

export function normalizeIban(value?: string | null): string | null {
  if (!value) return null
  return value.replace(WHITESPACE_REGEX, "").toUpperCase()
}

export function validateIbanOrThrow(iban?: string | null): void {
  if (!iban) return
  const result = validateIban(iban)
  if (!result.valid) {
    throw new Error(result.error ?? "Invalid IBAN")
  }
}
