// src/lib/regulatory-truth/fetchers/index.ts
// Tier 1 Structured Fetchers - Bypass AI entirely
// 100% reliable data from official APIs

export { createHNBRules, fetchHNBRates, fetchHNBHistoricalRates } from "./hnb-fetcher"
export type { HNBExchangeRate, HNBFetchResult } from "./hnb-fetcher"

export {
  fetchNNArticleMetadata,
  fetchNNIssue,
  fetchRecentNNIssues,
  createNNEvidence,
  getLatestIssueNumber,
} from "./nn-fetcher"
export type { NNArticleMetadata, NNFetchResult } from "./nn-fetcher"

export {
  fetchEURLexMetadata,
  fetchKeyEULegislation,
  createEURLexEvidence,
  KEY_EU_LEGISLATION,
} from "./eurlex-fetcher"
export type { EURLexMetadata } from "./eurlex-fetcher"

export {
  fetchMRMSContent,
  fetchMRMSNews,
  fetchMinimumWagePage,
  createMRMSEvidence,
  getMRMSStatus,
} from "./mrms-fetcher"
export type { MRMSNewsItem, MRMSFetchResult } from "./mrms-fetcher"

import { createHNBRules } from "./hnb-fetcher"
import { fetchRecentNNIssues, getLatestIssueNumber, fetchNNIssue } from "./nn-fetcher"
import { fetchKeyEULegislation, KEY_EU_LEGISLATION } from "./eurlex-fetcher"
import { fetchMRMSContent, getMRMSStatus } from "./mrms-fetcher"

export interface Tier1FetchResult {
  success: boolean
  hnb: { ratesCreated: number; error?: string }
  nn: { evidenceCreated: number; error?: string }
  eurlex: { evidenceCreated: number; error?: string }
  mrms: { evidenceCreated: number; error?: string }
  durationMs: number
}

/**
 * Run all Tier 1 structured fetchers
 * This should be run before AI-based extraction to get reliable baseline data
 */
export async function runTier1Fetchers(): Promise<Tier1FetchResult> {
  const startTime = Date.now()
  const result: Tier1FetchResult = {
    success: true,
    hnb: { ratesCreated: 0 },
    nn: { evidenceCreated: 0 },
    eurlex: { evidenceCreated: 0 },
    mrms: { evidenceCreated: 0 },
    durationMs: 0,
  }

  console.log("[tier1-fetchers] Starting Tier 1 structured data fetch...")

  // 1. HNB Exchange Rates (today's rates)
  try {
    console.log("[tier1-fetchers] Fetching HNB exchange rates...")
    const hnbResult = await createHNBRules()
    result.hnb.ratesCreated = hnbResult.rulesCreated
    if (hnbResult.error) result.hnb.error = hnbResult.error
    console.log(`[tier1-fetchers] HNB: ${hnbResult.rulesCreated} rules created`)
  } catch (error) {
    result.hnb.error = error instanceof Error ? error.message : String(error)
    console.error("[tier1-fetchers] HNB error:", result.hnb.error)
  }

  // 2. Narodne novine (latest issue)
  try {
    console.log("[tier1-fetchers] Fetching Narodne novine latest issue...")
    const year = new Date().getFullYear()
    const latestIssue = await getLatestIssueNumber(year)

    if (latestIssue) {
      console.log(`[tier1-fetchers] Found latest NN issue: ${year}/${latestIssue}`)
      const nnResult = await fetchNNIssue(year, latestIssue)
      result.nn.evidenceCreated = nnResult.evidenceCreated
      if (nnResult.error) result.nn.error = nnResult.error
    } else {
      result.nn.error = "Could not determine latest issue number"
    }
    console.log(`[tier1-fetchers] NN: ${result.nn.evidenceCreated} evidence records created`)
  } catch (error) {
    result.nn.error = error instanceof Error ? error.message : String(error)
    console.error("[tier1-fetchers] NN error:", result.nn.error)
  }

  // 3. EUR-Lex (key EU legislation)
  try {
    console.log("[tier1-fetchers] Fetching EUR-Lex key legislation...")
    const eurlexResult = await fetchKeyEULegislation()
    result.eurlex.evidenceCreated = eurlexResult.created
    if (eurlexResult.errors.length > 0) {
      result.eurlex.error = eurlexResult.errors.join("; ")
    }
    console.log(`[tier1-fetchers] EUR-Lex: ${eurlexResult.created} evidence records created`)
  } catch (error) {
    result.eurlex.error = error instanceof Error ? error.message : String(error)
    console.error("[tier1-fetchers] EUR-Lex error:", result.eurlex.error)
  }

  // 4. MRMS (Ministry of Labor - minimum wage and labor law)
  try {
    console.log("[tier1-fetchers] Fetching MRMS content...")
    const mrmsResult = await fetchMRMSContent()
    result.mrms.evidenceCreated = mrmsResult.evidenceCreated
    if (mrmsResult.error) {
      result.mrms.error = mrmsResult.error
    }
    console.log(`[tier1-fetchers] MRMS: ${mrmsResult.evidenceCreated} evidence records created`)
  } catch (error) {
    result.mrms.error = error instanceof Error ? error.message : String(error)
    console.error("[tier1-fetchers] MRMS error:", result.mrms.error)
  }

  result.durationMs = Date.now() - startTime
  result.success = !result.hnb.error && !result.nn.error && !result.eurlex.error && !result.mrms.error

  console.log(
    `[tier1-fetchers] Complete in ${result.durationMs}ms: HNB=${result.hnb.ratesCreated}, NN=${result.nn.evidenceCreated}, EUR-Lex=${result.eurlex.evidenceCreated}, MRMS=${result.mrms.evidenceCreated}`
  )

  return result
}

/**
 * Get summary of Tier 1 sources status
 */
export async function getTier1Status(): Promise<{
  hnb: { available: boolean; lastRate?: string }
  nn: { available: boolean; latestIssue?: number }
  eurlex: { available: boolean; legislationCount: number }
  mrms: { available: boolean; lastNewsDate?: string }
}> {
  const status = {
    hnb: { available: false, lastRate: undefined as string | undefined },
    nn: { available: false, latestIssue: undefined as number | undefined },
    eurlex: { available: false, legislationCount: KEY_EU_LEGISLATION.length },
    mrms: { available: false, lastNewsDate: undefined as string | undefined },
  }

  // Check HNB
  try {
    const response = await fetch("https://api.hnb.hr/tecajn-eur/v3?limit=1", {
      signal: AbortSignal.timeout(5000),
    })
    status.hnb.available = response.ok
    if (response.ok) {
      const rates = await response.json()
      if (rates.length > 0) {
        status.hnb.lastRate = rates[0].datum_primjene
      }
    }
  } catch {
    status.hnb.available = false
  }

  // Check NN
  try {
    const year = new Date().getFullYear()
    const latestIssue = await getLatestIssueNumber(year)
    status.nn.available = latestIssue !== null
    status.nn.latestIssue = latestIssue ?? undefined
  } catch {
    status.nn.available = false
  }

  // EUR-Lex is always "available" since we use known CELEX identifiers
  status.eurlex.available = true

  // Check MRMS
  try {
    const mrmsStatus = await getMRMSStatus()
    status.mrms.available = mrmsStatus.available
    status.mrms.lastNewsDate = mrmsStatus.lastNewsDate
  } catch {
    status.mrms.available = false
  }

  return status
}
