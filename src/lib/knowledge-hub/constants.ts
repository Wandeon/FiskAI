// src/lib/knowledge-hub/constants.ts

/**
 * Knowledge Hub Constants
 *
 * This file provides backward-compatible exports for the knowledge-hub module.
 * All values are now imported from @/lib/fiscal-data to ensure consistency
 * and single source of truth for fiscal values.
 *
 * @deprecated Components should import directly from @/lib/fiscal-data
 */

import {
  CONTRIBUTIONS,
  TAX_RATES,
  THRESHOLDS as FISCAL_THRESHOLDS,
  ADDITIONAL_THRESHOLDS,
  CHAMBER_FEES,
  PAYMENT_DETAILS,
  getPausalTaxBracket as getFiscalPausalTaxBracket,
} from "@/lib/fiscal-data"

// ============================================================================
// PAUŠALNI OBRT TAX BRACKETS 2025
// Source: @/lib/fiscal-data/data/tax-rates.ts
// ============================================================================

export interface TaxBracket {
  min: number
  max: number
  base: number
  annualTax: number
  quarterlyTax: number
}

export const PAUSAL_TAX_BRACKETS: TaxBracket[] = TAX_RATES.pausal.brackets

export const PAUSAL_TAX_RATE = TAX_RATES.pausal.rate

export function getPausalTaxBracket(annualRevenue: number): TaxBracket {
  return getFiscalPausalTaxBracket(annualRevenue)
}

// ============================================================================
// MONTHLY CONTRIBUTIONS 2025
// Source: @/lib/fiscal-data/data/contributions.ts
// ============================================================================

export const CONTRIBUTION_BASE_2025 = CONTRIBUTIONS.base.minimum

export const MONTHLY_CONTRIBUTIONS = {
  MIO_I: {
    rate: CONTRIBUTIONS.rates.MIO_I.rate,
    amount: CONTRIBUTIONS.monthly.mioI,
    name: CONTRIBUTIONS.rates.MIO_I.name,
  },
  MIO_II: {
    rate: CONTRIBUTIONS.rates.MIO_II.rate,
    amount: CONTRIBUTIONS.monthly.mioII,
    name: CONTRIBUTIONS.rates.MIO_II.name,
  },
  HZZO: {
    rate: CONTRIBUTIONS.rates.HZZO.rate,
    amount: CONTRIBUTIONS.monthly.hzzo,
    name: CONTRIBUTIONS.rates.HZZO.name,
  },
  TOTAL: CONTRIBUTIONS.monthly.total,
  BASE: CONTRIBUTIONS.base.minimum,
} as const

// ============================================================================
// KEY THRESHOLDS 2025
// Source: @/lib/fiscal-data/data/thresholds.ts
// ============================================================================

export const THRESHOLDS = {
  VAT_REGISTRATION: FISCAL_THRESHOLDS.pdv.value,
  PAUSAL_MAX: FISCAL_THRESHOLDS.pausalni.value,
  CASH_B2B_LIMIT: FISCAL_THRESHOLDS.cashB2B.value,
  ASSET_CAPITALIZATION: FISCAL_THRESHOLDS.assetCapitalization.value,
  CORPORATE_TAX_SMALL: ADDITIONAL_THRESHOLDS.smallBusinessRevenue.value,
} as const

// ============================================================================
// HOK (HRVATSKA OBRTNIČKA KOMORA) 2025
// Source: @/lib/fiscal-data/data/chamber-fees.ts
// ============================================================================

export const HOK = {
  MONTHLY: CHAMBER_FEES.hok.monthly,
  QUARTERLY: CHAMBER_FEES.hok.quarterly,
  ANNUAL: CHAMBER_FEES.hok.annual,
  DEADLINES: CHAMBER_FEES.hok.deadlines.map((d) => {
    // Convert from "DD.MM" format to "DD.M." format for backward compatibility
    const [day, month] = d.split(".")
    return `${day}.${parseInt(month)}.`
  }),
} as const

// ============================================================================
// TURISTIČKA ZAJEDNICA RATES 2025
// Source: @/lib/fiscal-data/data/chamber-fees.ts
// ============================================================================

export const TZ_RATES = {
  GROUP_1: {
    rate: CHAMBER_FEES.tz.groups[0].rate,
    description: CHAMBER_FEES.tz.groups[0].description,
  },
  GROUP_2: {
    rate: CHAMBER_FEES.tz.groups[1].rate,
    description: CHAMBER_FEES.tz.groups[1].description,
  },
  GROUP_3: {
    rate: CHAMBER_FEES.tz.groups[2].rate,
    description: CHAMBER_FEES.tz.groups[2].description,
  },
  GROUP_4: {
    rate: CHAMBER_FEES.tz.groups[3].rate,
    description: CHAMBER_FEES.tz.groups[3].description,
  },
  GROUP_5: {
    rate: CHAMBER_FEES.tz.groups[4].rate,
    description: CHAMBER_FEES.tz.groups[4].description,
  },
} as const

// ============================================================================
// INCOME TAX RATES 2025 (for obrt na dohodak)
// Source: @/lib/fiscal-data/data/tax-rates.ts
// ============================================================================

export const INCOME_TAX_BRACKETS = [
  {
    min: TAX_RATES.income.brackets[0].min,
    max: TAX_RATES.income.brackets[0].max,
    rate: TAX_RATES.income.brackets[0].rateWithSurtax,
  },
  {
    min: TAX_RATES.income.brackets[1].min,
    max: TAX_RATES.income.brackets[1].max,
    rate: TAX_RATES.income.brackets[1].rateWithSurtax,
  },
] as const

// ============================================================================
// CORPORATE TAX 2025 (for d.o.o.)
// Source: @/lib/fiscal-data/data/tax-rates.ts
// ============================================================================

export const CORPORATE_TAX = {
  SMALL: {
    maxRevenue: TAX_RATES.corporate.small.maxRevenue,
    rate: TAX_RATES.corporate.small.rate,
  },
  LARGE: {
    minRevenue: TAX_RATES.corporate.large.minRevenue,
    rate: TAX_RATES.corporate.large.rate,
  },
} as const

// ============================================================================
// PAYMENT IBANs
// Source: @/lib/fiscal-data/data/payment-details.ts
// ============================================================================

export const PAYMENT_IBANS = {
  STATE_BUDGET: PAYMENT_DETAILS.accounts.stateBudget.iban,
  MIO_II: PAYMENT_DETAILS.accounts.mioII.iban,
  HZZO: PAYMENT_DETAILS.accounts.hzzo.iban,
  HOK: PAYMENT_DETAILS.accounts.hok.iban,
} as const

export const PAYMENT_MODEL = PAYMENT_DETAILS.accounts.stateBudget.model

// ============================================================================
// CONTRIBUTION PAYMENT DEADLINES
// Source: @/lib/fiscal-data/data/deadlines.ts
// ============================================================================

export const CONTRIBUTION_DEADLINES = {
  MONTHLY: "Do 15. u mjesecu za prethodni mjesec",
  MIO_II_DEADLINE: "Do 15. u mjesecu",
  HOK_QUARTERLY: HOK.DEADLINES,
  PAUSAL_TAX_QUARTERLY: ["31.1.", "30.4.", "31.7.", "31.10."],
} as const
