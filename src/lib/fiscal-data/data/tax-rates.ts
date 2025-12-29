// src/lib/fiscal-data/data/tax-rates.ts

import type { TaxRatesData, TaxBracket, PausalTaxBracket } from "../types"

/**
 * Tax Rates for Croatia 2025
 *
 * Sources:
 * - Porezna uprava: https://www.porezna-uprava.hr/HR_porezni_sustav/
 * - Narodne novine: https://narodne-novine.nn.hr/
 */
export const TAX_RATES: TaxRatesData = {
  // ===========================================================================
  // INCOME TAX (Porez na dohodak) - for Obrt na dohodak
  // ===========================================================================
  income: {
    year: 2025,
    lastVerified: "2025-01-15",
    source: "https://www.porezna-uprava.hr/HR_porezni_sustav/Stranice/porez_na_dohodak.aspx",

    brackets: [
      {
        min: 0,
        max: 50400, // EUR godišnje (4200 EUR mjesečno)
        rate: 0.2, // 20%
        rateWithSurtax: 0.236, // ~23.6% s prosječnim prirezom
        description: "Niža stopa poreza na dohodak",
      },
      {
        min: 50400.01,
        max: Infinity,
        rate: 0.3, // 30%
        rateWithSurtax: 0.354, // ~35.4% s prosječnim prirezom
        description: "Viša stopa poreza na dohodak",
      },
    ],

    personalAllowance: 560, // EUR mjesečno - osnovni osobni odbitak
    averageSurtax: 0.18, // 18% - prosječni prirez u RH
  },

  // ===========================================================================
  // CORPORATE TAX (Porez na dobit) - for D.O.O.
  // ===========================================================================
  corporate: {
    year: 2025,
    lastVerified: "2025-01-15",
    source: "https://www.porezna-uprava.hr/HR_porezni_sustav/Stranice/porez_na_dobit.aspx",

    small: {
      maxRevenue: 1000000, // EUR - do 1 mil EUR prihoda
      rate: 0.1, // 10%
    },
    large: {
      minRevenue: 1000000, // EUR - iznad 1 mil EUR prihoda
      rate: 0.18, // 18%
    },
  },

  // ===========================================================================
  // PAUŠALNI OBRT TAX
  // ===========================================================================
  pausal: {
    year: 2025,
    lastVerified: "2025-01-15",
    source: "https://www.porezna-uprava.hr/HR_porezni_sustav/Stranice/pausalno_oporezivanje.aspx",

    rate: 0.12, // 12% - osnovna stopa bez prireza
    maxRevenue: 60000, // EUR - maksimalni godišnji prihod
    normativeExpenseRate: 0.3, // 30% normativni rashodi

    brackets: [
      { min: 0, max: 11300, base: 1695, annualTax: 203.4, quarterlyTax: 50.85 },
      { min: 11300.01, max: 15300, base: 2295, annualTax: 275.4, quarterlyTax: 68.85 },
      { min: 15300.01, max: 19900, base: 2985, annualTax: 358.2, quarterlyTax: 89.55 },
      { min: 19900.01, max: 30600, base: 4590, annualTax: 550.8, quarterlyTax: 137.7 },
      { min: 30600.01, max: 40000, base: 6000, annualTax: 720.0, quarterlyTax: 180.0 },
      { min: 40000.01, max: 50000, base: 7500, annualTax: 900.0, quarterlyTax: 225.0 },
      { min: 50000.01, max: 60000, base: 9000, annualTax: 1080.0, quarterlyTax: 270.0 },
    ],
  },

  // ===========================================================================
  // VAT (PDV) RATES
  // ===========================================================================
  vat: {
    year: 2025,
    lastVerified: "2025-01-15",
    source: "https://www.porezna-uprava.hr/HR_porezni_sustav/Stranice/pdv.aspx",
    standard: {
      rate: 0.25,
      label: "Standardna stopa",
      description: "Opća stopa PDV-a u Hrvatskoj",
    },
    reduced: [
      {
        rate: 0.13,
        label: "Snižena stopa",
        description: "Usluge smještaja, ugostiteljstvo, novine i odabrani proizvodi",
      },
      {
        rate: 0.05,
        label: "Snižena stopa II",
        description: "Osnovne namirnice, knjige, lijekovi i medicinski proizvodi",
      },
    ],
  },
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get income tax bracket for a given annual income
 */
export function getIncomeTaxBracket(annualIncome: number): TaxBracket {
  const bracket = TAX_RATES.income.brackets.find(
    (b) => annualIncome >= b.min && annualIncome <= b.max
  )
  return bracket || TAX_RATES.income.brackets[TAX_RATES.income.brackets.length - 1]
}

/**
 * Calculate income tax for a given annual income
 * Uses progressive taxation (split between brackets)
 */
export function calculateIncomeTax(annualIncome: number, includeSurtax: boolean = true): number {
  const brackets = TAX_RATES.income.brackets
  let remainingIncome = annualIncome
  let totalTax = 0

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break

    const taxableInBracket = Math.min(
      remainingIncome,
      bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min
    )

    const rate = includeSurtax ? bracket.rateWithSurtax || bracket.rate : bracket.rate
    totalTax += taxableInBracket * rate
    remainingIncome -= taxableInBracket
  }

  return Math.round(totalTax * 100) / 100
}

/**
 * Get paušalni tax bracket for a given annual revenue
 */
export function getPausalTaxBracket(annualRevenue: number): PausalTaxBracket {
  const bracket = TAX_RATES.pausal.brackets.find(
    (b) => annualRevenue >= b.min && annualRevenue <= b.max
  )
  return bracket || TAX_RATES.pausal.brackets[TAX_RATES.pausal.brackets.length - 1]
}

/**
 * Calculate corporate tax rate based on revenue
 */
export function getCorporateTaxRate(annualRevenue: number): number {
  return annualRevenue <= TAX_RATES.corporate.small.maxRevenue
    ? TAX_RATES.corporate.small.rate
    : TAX_RATES.corporate.large.rate
}

/**
 * Check if revenue exceeds paušalni limit
 */
export function exceedsPausalLimit(annualRevenue: number): boolean {
  return annualRevenue > TAX_RATES.pausal.maxRevenue
}

/**
 * Result of prirez-adjusted pausal tax calculation
 */
export interface PausalTaxWithPrirezResult {
  /** Annual tax including prirez */
  annual: number
  /** Quarterly tax including prirez */
  quarterly: number
  /** Base annual tax (without prirez) */
  baseAnnual: number
  /** Base quarterly tax (without prirez) */
  baseQuarterly: number
  /** Prirez amount (annual) */
  prirezAnnual: number
  /** Prirez amount (quarterly) */
  prirezQuarterly: number
}

/**
 * Calculate pausal tax with prirez (municipal surtax) adjustment
 *
 * The tax brackets in TAX_RATES.pausal.brackets contain BASE tax values.
 * Actual tax payable = baseTax * (1 + prirezRate)
 *
 * @param annualRevenue - Annual revenue to determine bracket
 * @param prirezRate - Municipal surtax rate (e.g., 0.18 for Zagreb 18%)
 * @returns Object with annual and quarterly tax amounts including prirez
 *
 * @example
 * // Zagreb has 18% prirez
 * const tax = calculatePausalTaxWithPrirez(25000, 0.18)
 * console.log(tax.quarterly) // 162.49 (137.7 * 1.18)
 */
export function calculatePausalTaxWithPrirez(
  annualRevenue: number,
  prirezRate: number = 0
): PausalTaxWithPrirezResult {
  const bracket = getPausalTaxBracket(annualRevenue)
  const multiplier = 1 + prirezRate

  const baseAnnual = bracket.annualTax
  const baseQuarterly = bracket.quarterlyTax
  const annual = Math.round(baseAnnual * multiplier * 100) / 100
  const quarterly = Math.round(baseQuarterly * multiplier * 100) / 100

  return {
    annual,
    quarterly,
    baseAnnual,
    baseQuarterly,
    prirezAnnual: Math.round((annual - baseAnnual) * 100) / 100,
    prirezQuarterly: Math.round((quarterly - baseQuarterly) * 100) / 100,
  }
}
