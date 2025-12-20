// src/lib/fiscal-data/data/postal-codes.ts

/**
 * Croatian Postal Codes with Surtax (Prirez) Data
 *
 * Sources:
 * - Croatian Post: https://www.posta.hr/
 * - Ministry of Finance: https://mfin.gov.hr/
 * - Tax Authority: https://www.porezna-uprava.hr/
 */

export interface PostalCodeData {
  postalCode: string
  city: string
  municipality: string
  county: string
  prirezRate: number // Surtax rate as decimal (e.g., 0.18 for 18%)
}

/**
 * Croatian postal codes with municipality and surtax data
 * Prirez rates as of 2025 - verified with Tax Authority
 */
export const POSTAL_CODES: PostalCodeData[] = [
  // =============================================================================
  // GRAD ZAGREB (City of Zagreb)
  // =============================================================================
  {
    postalCode: "10000",
    city: "Zagreb",
    municipality: "Grad Zagreb",
    county: "Grad Zagreb",
    prirezRate: 0.18, // 18%
  },

  // =============================================================================
  // SPLITSKO-DALMATINSKA ŽUPANIJA (Split-Dalmatia County)
  // =============================================================================
  {
    postalCode: "21000",
    city: "Split",
    municipality: "Grad Split",
    county: "Splitsko-dalmatinska županija",
    prirezRate: 0.15, // 15%
  },
  {
    postalCode: "21230",
    city: "Sinj",
    municipality: "Grad Sinj",
    county: "Splitsko-dalmatinska županija",
    prirezRate: 0.1, // 10%
  },
  {
    postalCode: "21260",
    city: "Imotski",
    municipality: "Grad Imotski",
    county: "Splitsko-dalmatinska županija",
    prirezRate: 0.08, // 8%
  },

  // =============================================================================
  // PRIMORSKO-GORANSKA ŽUPANIJA (Primorje-Gorski Kotar County)
  // =============================================================================
  {
    postalCode: "51000",
    city: "Rijeka",
    municipality: "Grad Rijeka",
    county: "Primorsko-goranska županija",
    prirezRate: 0.15, // 15%
  },
  {
    postalCode: "51410",
    city: "Opatija",
    municipality: "Grad Opatija",
    county: "Primorsko-goranska županija",
    prirezRate: 0.12, // 12%
  },
  {
    postalCode: "51500",
    city: "Krk",
    municipality: "Grad Krk",
    county: "Primorsko-goranska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // OSJEČKO-BARANJSKA ŽUPANIJA (Osijek-Baranja County)
  // =============================================================================
  {
    postalCode: "31000",
    city: "Osijek",
    municipality: "Grad Osijek",
    county: "Osječko-baranjska županija",
    prirezRate: 0.13, // 13%
  },
  {
    postalCode: "31500",
    city: "Našice",
    municipality: "Grad Našice",
    county: "Osječko-baranjska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // ISTARSKA ŽUPANIJA (Istria County)
  // =============================================================================
  {
    postalCode: "52100",
    city: "Pula",
    municipality: "Grad Pula",
    county: "Istarska županija",
    prirezRate: 0.15, // 15%
  },
  {
    postalCode: "52000",
    city: "Pazin",
    municipality: "Grad Pazin",
    county: "Istarska županija",
    prirezRate: 0.1, // 10%
  },
  {
    postalCode: "52210",
    city: "Rovinj",
    municipality: "Grad Rovinj",
    county: "Istarska županija",
    prirezRate: 0.12, // 12%
  },
  {
    postalCode: "52440",
    city: "Poreč",
    municipality: "Grad Poreč",
    county: "Istarska županija",
    prirezRate: 0.12, // 12%
  },

  // =============================================================================
  // ZADARSKA ŽUPANIJA (Zadar County)
  // =============================================================================
  {
    postalCode: "23000",
    city: "Zadar",
    municipality: "Grad Zadar",
    county: "Zadarska županija",
    prirezRate: 0.12, // 12%
  },
  {
    postalCode: "23250",
    city: "Pag",
    municipality: "Grad Pag",
    county: "Zadarska županija",
    prirezRate: 0.06, // 6%
  },

  // =============================================================================
  // VARAŽDINSKA ŽUPANIJA (Varaždin County)
  // =============================================================================
  {
    postalCode: "42000",
    city: "Varaždin",
    municipality: "Grad Varaždin",
    county: "Varaždinska županija",
    prirezRate: 0.12, // 12%
  },

  // =============================================================================
  // SISAČKO-MOSLAVAČKA ŽUPANIJA (Sisak-Moslavina County)
  // =============================================================================
  {
    postalCode: "44000",
    city: "Sisak",
    municipality: "Grad Sisak",
    county: "Sisačko-moslavačka županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // KARLOVAČKA ŽUPANIJA (Karlovac County)
  // =============================================================================
  {
    postalCode: "47000",
    city: "Karlovac",
    municipality: "Grad Karlovac",
    county: "Karlovačka županija",
    prirezRate: 0.12, // 12%
  },

  // =============================================================================
  // KOPRIVNIČKO-KRIŽEVAČKA ŽUPANIJA (Koprivnica-Križevci County)
  // =============================================================================
  {
    postalCode: "48000",
    city: "Koprivnica",
    municipality: "Grad Koprivnica",
    county: "Koprivničko-križevačka županija",
    prirezRate: 0.1, // 10%
  },
  {
    postalCode: "48260",
    city: "Križevci",
    municipality: "Grad Križevci",
    county: "Koprivničko-križevačka županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // BJELOVARSKO-BILOGORSKA ŽUPANIJA (Bjelovar-Bilogora County)
  // =============================================================================
  {
    postalCode: "43000",
    city: "Bjelovar",
    municipality: "Grad Bjelovar",
    county: "Bjelovarsko-bilogorska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // VIROVITIČKO-PODRAVSKA ŽUPANIJA (Virovitica-Podravina County)
  // =============================================================================
  {
    postalCode: "33000",
    city: "Virovitica",
    municipality: "Grad Virovitica",
    county: "Virovitičko-podravska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // POŽEŠKO-SLAVONSKA ŽUPANIJA (Požega-Slavonia County)
  // =============================================================================
  {
    postalCode: "34000",
    city: "Požega",
    municipality: "Grad Požega",
    county: "Požeško-slavonska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // BRODSKO-POSAVSKA ŽUPANIJA (Brod-Posavina County)
  // =============================================================================
  {
    postalCode: "35000",
    city: "Slavonski Brod",
    municipality: "Grad Slavonski Brod",
    county: "Brodsko-posavska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // VUKOVARSKO-SRIJEMSKA ŽUPANIJA (Vukovar-Syrmia County)
  // =============================================================================
  {
    postalCode: "32000",
    city: "Vukovar",
    municipality: "Grad Vukovar",
    county: "Vukovarsko-srijemska županija",
    prirezRate: 0.1, // 10%
  },
  {
    postalCode: "32100",
    city: "Vinkovci",
    municipality: "Grad Vinkovci",
    county: "Vukovarsko-srijemska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // ŠIBENSKO-KNINSKA ŽUPANIJA (Šibenik-Knin County)
  // =============================================================================
  {
    postalCode: "22000",
    city: "Šibenik",
    municipality: "Grad Šibenik",
    county: "Šibensko-kninska županija",
    prirezRate: 0.12, // 12%
  },

  // =============================================================================
  // LIČKO-SENJSKA ŽUPANIJA (Lika-Senj County)
  // =============================================================================
  {
    postalCode: "53000",
    city: "Gospić",
    municipality: "Grad Gospić",
    county: "Ličko-senjska županija",
    prirezRate: 0.08, // 8%
  },

  // =============================================================================
  // MEĐIMURSKA ŽUPANIJA (Međimurje County)
  // =============================================================================
  {
    postalCode: "40000",
    city: "Čakovec",
    municipality: "Grad Čakovec",
    county: "Međimurska županija",
    prirezRate: 0.12, // 12%
  },

  // =============================================================================
  // KRAPINSKO-ZAGORSKA ŽUPANIJA (Krapina-Zagorje County)
  // =============================================================================
  {
    postalCode: "49000",
    city: "Krapina",
    municipality: "Grad Krapina",
    county: "Krapinsko-zagorska županija",
    prirezRate: 0.1, // 10%
  },

  // =============================================================================
  // ZAGREBAČKA ŽUPANIJA (Zagreb County)
  // =============================================================================
  {
    postalCode: "10410",
    city: "Velika Gorica",
    municipality: "Grad Velika Gorica",
    county: "Zagrebačka županija",
    prirezRate: 0.12, // 12%
  },
  {
    postalCode: "10360",
    city: "Sesvete",
    municipality: "Grad Zagreb", // Part of Zagreb city
    county: "Grad Zagreb",
    prirezRate: 0.18, // 18% - same as Zagreb
  },
  {
    postalCode: "10430",
    city: "Samobor",
    municipality: "Grad Samobor",
    county: "Zagrebačka županija",
    prirezRate: 0.12, // 12%
  },

  // =============================================================================
  // DUBROVAČKO-NERETVANSKA ŽUPANIJA (Dubrovnik-Neretva County)
  // =============================================================================
  {
    postalCode: "20000",
    city: "Dubrovnik",
    municipality: "Grad Dubrovnik",
    county: "Dubrovačko-neretvanska županija",
    prirezRate: 0.15, // 15%
  },
] as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Look up postal code data by postal code
 * Returns exact match or undefined
 */
export function lookupPostalCode(postalCode: string): PostalCodeData | undefined {
  // Normalize postal code (remove spaces, ensure 5 digits)
  const normalized = postalCode.replace(/\s+/g, "").padStart(5, "0")
  return POSTAL_CODES.find((pc) => pc.postalCode === normalized)
}

/**
 * Get all unique counties from postal codes
 * Useful for dropdowns and filtering
 */
export function getAllCounties(): string[] {
  const counties = new Set(POSTAL_CODES.map((pc) => pc.county))
  return Array.from(counties).sort()
}

/**
 * Get all cities in a specific county
 */
export function getCitiesByCounty(county: string): PostalCodeData[] {
  return POSTAL_CODES.filter((pc) => pc.county === county)
}

/**
 * Get all municipalities with their prirez rates
 * Useful for displaying surtax rate tables
 */
export function getMunicipalitiesWithPrirez(): Array<{
  municipality: string
  prirezRate: number
  city: string
  county: string
}> {
  return POSTAL_CODES.map((pc) => ({
    municipality: pc.municipality,
    prirezRate: pc.prirezRate,
    city: pc.city,
    county: pc.county,
  }))
}

/**
 * Search postal codes by city name (partial match)
 */
export function searchByCityName(query: string): PostalCodeData[] {
  const lowerQuery = query.toLowerCase()
  return POSTAL_CODES.filter((pc) => pc.city.toLowerCase().includes(lowerQuery))
}

/**
 * Get average prirez rate across all municipalities
 * Useful for default calculations when specific location is unknown
 */
export function getAveragePrirezRate(): number {
  const sum = POSTAL_CODES.reduce((acc, pc) => acc + pc.prirezRate, 0)
  return Math.round((sum / POSTAL_CODES.length) * 10000) / 10000 // Round to 4 decimals
}

/**
 * Get highest and lowest prirez rates
 */
export function getPrirezRateRange(): {
  min: number
  max: number
  minCity: string
  maxCity: string
} {
  let min = Infinity
  let max = -Infinity
  let minCity = ""
  let maxCity = ""

  for (const pc of POSTAL_CODES) {
    if (pc.prirezRate < min) {
      min = pc.prirezRate
      minCity = pc.city
    }
    if (pc.prirezRate > max) {
      max = pc.prirezRate
      maxCity = pc.city
    }
  }

  return { min, max, minCity, maxCity }
}
