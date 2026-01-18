// src/lib/regulatory-truth/utils/quote-repair.ts
//
// Quote Repair Utility for Self-Healing RTL Pipeline
//
// Purpose: Attempts to repair broken quotes that failed provenance validation
// due to Unicode drift, whitespace changes, or minor OCR errors.
//
// This addresses the "18 rules blocked: provenance failures (quote not found in evidence)"
// issue by using fuzzy matching to find the closest match in the evidence content.

import {
  normalizeForComparison,
  calculateNormalizedSimilarity,
  levenshteinDistance,
  fuzzyContainsCroatian,
  normalizeWhitespace,
} from "./croatian-text"
import { normalizeQuotes } from "./quote-normalizer"

/**
 * Result of a quote repair attempt
 */
export interface QuoteRepairResult {
  /** Whether repair was successful */
  success: boolean
  /** The original quote that failed validation */
  originalQuote: string
  /** The repaired quote (if successful) */
  repairedQuote?: string
  /** The start offset of the match in content */
  startOffset?: number
  /** The end offset of the match in content */
  endOffset?: number
  /** Similarity score between original and repaired (0-1) */
  similarity?: number
  /** Type of repair that was applied */
  repairType?: QuoteRepairType
  /** Reason for failure (if unsuccessful) */
  failureReason?: string
  /** Diagnostic information for logging */
  diagnostics?: QuoteRepairDiagnostics
}

/**
 * Types of repairs that can be applied
 */
export type QuoteRepairType =
  | "EXACT_AFTER_NORMALIZATION" // Quote matched exactly after Unicode/whitespace normalization
  | "FUZZY_MATCH" // Quote found via fuzzy matching (small edits)
  | "SUBSTRING_MATCH" // A significant portion of the quote was found
  | "SMART_QUOTE_FIX" // Only smart quote characters were the issue
  | "WHITESPACE_FIX" // Only whitespace differences were the issue
  | "DIACRITIC_FIX" // Croatian diacritic normalization fixed it

/**
 * Diagnostic information for debugging and metrics
 */
export interface QuoteRepairDiagnostics {
  /** Length of original quote */
  originalLength: number
  /** Length of content searched */
  contentLength: number
  /** Levenshtein distance to best match */
  levenshteinDistance?: number
  /** Number of candidate matches considered */
  candidatesConsidered: number
  /** Time taken for repair attempt (ms) */
  processingTimeMs: number
  /** Specific characters that differed */
  characterDifferences?: string[]
}

/**
 * Configuration for quote repair
 */
export interface QuoteRepairConfig {
  /** Maximum Levenshtein distance ratio (distance / quote length) for a match. Default: 0.10 (10%) */
  maxDistanceRatio: number
  /** Minimum similarity score for fuzzy match. Default: 0.90 (90%) */
  minSimilarity: number
  /** Minimum quote length to attempt repair. Default: 10 */
  minQuoteLength: number
  /** Maximum quote length for sliding window search. Default: 500 */
  maxQuoteLengthForSlidingWindow: number
  /** Whether to try multiple repair strategies. Default: true */
  tryMultipleStrategies: boolean
  /** Window size variance for sliding window (±). Default: 20 */
  windowSizeVariance: number
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: QuoteRepairConfig = {
  maxDistanceRatio: 0.1, // 10% maximum edit distance
  minSimilarity: 0.9, // 90% minimum similarity
  minQuoteLength: 10,
  maxQuoteLengthForSlidingWindow: 500,
  tryMultipleStrategies: true,
  windowSizeVariance: 20,
}

/**
 * Attempt to repair a quote that failed provenance validation.
 *
 * Strategies (in order):
 * 1. Exact match after Unicode normalization (smart quotes, whitespace)
 * 2. Exact match after Croatian diacritic normalization
 * 3. Fuzzy sliding window match for small edits
 * 4. Substring match for truncated quotes
 *
 * @param quote - The original quote that failed validation
 * @param content - The evidence content to search in
 * @param config - Optional configuration overrides
 * @returns QuoteRepairResult with success status and repaired quote if found
 */
export function attemptQuoteRepair(
  quote: string,
  content: string,
  config: Partial<QuoteRepairConfig> = {}
): QuoteRepairResult {
  const startTime = performance.now()
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const diagnostics: QuoteRepairDiagnostics = {
    originalLength: quote.length,
    contentLength: content.length,
    candidatesConsidered: 0,
    processingTimeMs: 0,
  }

  // Guard: Quote too short
  if (quote.length < cfg.minQuoteLength) {
    diagnostics.processingTimeMs = performance.now() - startTime
    return {
      success: false,
      originalQuote: quote,
      failureReason: `Quote too short (${quote.length} < ${cfg.minQuoteLength})`,
      diagnostics,
    }
  }

  // Guard: Empty content
  if (!content || content.length === 0) {
    diagnostics.processingTimeMs = performance.now() - startTime
    return {
      success: false,
      originalQuote: quote,
      failureReason: "Content is empty",
      diagnostics,
    }
  }

  // Strategy 1: Smart quote normalization only
  const smartQuoteResult = trySmartQuoteFix(quote, content)
  if (smartQuoteResult.success) {
    diagnostics.processingTimeMs = performance.now() - startTime
    diagnostics.candidatesConsidered = 1
    return { ...smartQuoteResult, diagnostics }
  }

  // Strategy 2: Whitespace normalization only
  const whitespaceResult = tryWhitespaceFix(quote, content)
  if (whitespaceResult.success) {
    diagnostics.processingTimeMs = performance.now() - startTime
    diagnostics.candidatesConsidered = 2
    return { ...whitespaceResult, diagnostics }
  }

  // Strategy 3: Full normalization (Unicode + diacritics + whitespace)
  const normalizedResult = tryNormalizedMatch(quote, content)
  if (normalizedResult.success) {
    diagnostics.processingTimeMs = performance.now() - startTime
    diagnostics.candidatesConsidered = 3
    return { ...normalizedResult, diagnostics }
  }

  // Strategy 4: Fuzzy sliding window for longer quotes
  if (quote.length <= cfg.maxQuoteLengthForSlidingWindow) {
    const fuzzyResult = tryFuzzySlidingWindow(quote, content, cfg, diagnostics)
    if (fuzzyResult.success) {
      diagnostics.processingTimeMs = performance.now() - startTime
      return { ...fuzzyResult, diagnostics }
    }
  }

  // Strategy 5: Substring match (find longest matching substring)
  const substringResult = trySubstringMatch(quote, content, cfg)
  if (substringResult.success) {
    diagnostics.processingTimeMs = performance.now() - startTime
    diagnostics.candidatesConsidered++
    return { ...substringResult, diagnostics }
  }

  // All strategies failed
  diagnostics.processingTimeMs = performance.now() - startTime
  return {
    success: false,
    originalQuote: quote,
    failureReason: `No match found above similarity threshold (${cfg.minSimilarity})`,
    diagnostics,
  }
}

/**
 * Try to fix quote by only normalizing smart quotes
 */
function trySmartQuoteFix(quote: string, content: string): QuoteRepairResult {
  const normalizedQuote = normalizeQuotes(quote)
  const normalizedContent = normalizeQuotes(content)

  // Try to find the exact normalized quote in normalized content
  const index = normalizedContent.indexOf(normalizedQuote)
  if (index !== -1) {
    // Extract the actual text from original content at this position
    const repairedQuote = content.substring(index, index + normalizedQuote.length)
    return {
      success: true,
      originalQuote: quote,
      repairedQuote,
      startOffset: index,
      endOffset: index + normalizedQuote.length,
      similarity: 1,
      repairType: "SMART_QUOTE_FIX",
    }
  }

  return { success: false, originalQuote: quote }
}

/**
 * Try to fix quote by normalizing whitespace
 */
function tryWhitespaceFix(quote: string, content: string): QuoteRepairResult {
  const normalizedQuote = normalizeWhitespace(quote)
  const normalizedContent = normalizeWhitespace(content)

  const index = normalizedContent.indexOf(normalizedQuote)
  if (index !== -1) {
    // Map the index back to original content
    // This is approximate since whitespace was collapsed
    const mappedResult = mapNormalizedIndexToOriginal(
      content,
      normalizedContent,
      index,
      normalizedQuote.length
    )
    if (mappedResult) {
      return {
        success: true,
        originalQuote: quote,
        repairedQuote: mappedResult.text,
        startOffset: mappedResult.start,
        endOffset: mappedResult.end,
        similarity: 1,
        repairType: "WHITESPACE_FIX",
      }
    }
  }

  return { success: false, originalQuote: quote }
}

/**
 * Try to match after full normalization (Croatian diacritics, smart quotes, whitespace)
 */
function tryNormalizedMatch(quote: string, content: string): QuoteRepairResult {
  const normalizedQuote = normalizeForComparison(quote)
  const normalizedContent = normalizeForComparison(content)

  const index = normalizedContent.indexOf(normalizedQuote)
  if (index !== -1) {
    // Map back to original
    const mappedResult = mapNormalizedIndexToOriginal(
      content,
      normalizedContent,
      index,
      normalizedQuote.length
    )
    if (mappedResult) {
      // Determine repair type
      let repairType: QuoteRepairType = "EXACT_AFTER_NORMALIZATION"
      if (quote !== normalizeQuotes(quote)) {
        repairType = "SMART_QUOTE_FIX"
      } else if (quote !== normalizeWhitespace(quote)) {
        repairType = "WHITESPACE_FIX"
      } else {
        repairType = "DIACRITIC_FIX"
      }

      return {
        success: true,
        originalQuote: quote,
        repairedQuote: mappedResult.text,
        startOffset: mappedResult.start,
        endOffset: mappedResult.end,
        similarity: 1,
        repairType,
      }
    }
  }

  return { success: false, originalQuote: quote }
}

/**
 * Try fuzzy sliding window match for quotes with small edits
 */
function tryFuzzySlidingWindow(
  quote: string,
  content: string,
  cfg: QuoteRepairConfig,
  diagnostics: QuoteRepairDiagnostics
): QuoteRepairResult {
  const normalizedQuote = normalizeForComparison(quote)
  const normalizedContent = normalizeForComparison(content)
  const quoteLen = normalizedQuote.length

  let bestMatch: { index: number; similarity: number; distance: number } | null = null

  // Try windows of varying sizes around the quote length
  const windowSizes = [
    quoteLen,
    quoteLen - 1,
    quoteLen + 1,
    quoteLen - 2,
    quoteLen + 2,
    Math.max(cfg.minQuoteLength, quoteLen - cfg.windowSizeVariance),
    quoteLen + cfg.windowSizeVariance,
  ].filter(
    (size, idx, arr) => size > 0 && size <= normalizedContent.length && arr.indexOf(size) === idx
  )

  for (const windowSize of windowSizes) {
    // Slide window across content
    const step = Math.max(1, Math.floor(windowSize / 4)) // Adaptive step size
    for (let i = 0; i <= normalizedContent.length - windowSize; i += step) {
      diagnostics.candidatesConsidered++

      const window = normalizedContent.substring(i, i + windowSize)
      const similarity = calculateNormalizedSimilarity(normalizedQuote, window)

      // Check if this is a better match
      if (similarity >= cfg.minSimilarity) {
        const distance = levenshteinDistance(normalizedQuote, window)
        const distanceRatio = distance / quoteLen

        if (distanceRatio <= cfg.maxDistanceRatio) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { index: i, similarity, distance }
          }
        }
      }
    }

    // If we found a very good match, stop searching
    if (bestMatch && bestMatch.similarity >= 0.98) {
      break
    }
  }

  if (bestMatch) {
    // Map back to original content
    const mappedResult = mapNormalizedIndexToOriginal(
      content,
      normalizedContent,
      bestMatch.index,
      normalizedQuote.length
    )

    if (mappedResult) {
      diagnostics.levenshteinDistance = bestMatch.distance
      return {
        success: true,
        originalQuote: quote,
        repairedQuote: mappedResult.text,
        startOffset: mappedResult.start,
        endOffset: mappedResult.end,
        similarity: bestMatch.similarity,
        repairType: "FUZZY_MATCH",
      }
    }
  }

  return { success: false, originalQuote: quote }
}

/**
 * Try to find a significant substring match
 * Useful when quotes are truncated or have different boundaries
 */
function trySubstringMatch(
  quote: string,
  content: string,
  cfg: QuoteRepairConfig
): QuoteRepairResult {
  const normalizedQuote = normalizeForComparison(quote)
  const normalizedContent = normalizeForComparison(content)

  // Try to find the longest matching prefix/suffix
  const minMatchLength = Math.max(cfg.minQuoteLength, Math.floor(normalizedQuote.length * 0.7))

  // Try prefix match (quote might be truncated at the end)
  for (let len = normalizedQuote.length; len >= minMatchLength; len--) {
    const prefix = normalizedQuote.substring(0, len)
    const index = normalizedContent.indexOf(prefix)
    if (index !== -1) {
      const mappedResult = mapNormalizedIndexToOriginal(content, normalizedContent, index, len)
      if (mappedResult) {
        const similarity = len / normalizedQuote.length
        if (similarity >= cfg.minSimilarity) {
          return {
            success: true,
            originalQuote: quote,
            repairedQuote: mappedResult.text,
            startOffset: mappedResult.start,
            endOffset: mappedResult.end,
            similarity,
            repairType: "SUBSTRING_MATCH",
          }
        }
      }
    }
  }

  return { success: false, originalQuote: quote }
}

/**
 * Map an index from normalized content back to original content
 * Returns the actual text from original content at the approximate position
 */
function mapNormalizedIndexToOriginal(
  original: string,
  normalized: string,
  normalizedIndex: number,
  normalizedLength: number
): { start: number; end: number; text: string } | null {
  // Simple approach: build character position mapping
  // This is an approximation that works well for whitespace/case normalization

  let origIdx = 0
  let normIdx = 0
  const origToNorm: number[] = []

  // Build mapping
  while (origIdx < original.length && normIdx < normalized.length) {
    origToNorm[origIdx] = normIdx

    // Skip characters in original that were collapsed (extra whitespace)
    if (/\s/.test(original[origIdx]) && (origIdx === 0 || /\s/.test(original[origIdx - 1]))) {
      origIdx++
      continue
    }

    // Advance both if characters match (after normalization)
    if (normalizeForComparison(original[origIdx]) === normalized[normIdx]) {
      origIdx++
      normIdx++
    } else {
      // Character was removed in normalization
      origIdx++
    }
  }

  // Find original index that maps to normalizedIndex
  let startOrig = 0
  for (let i = 0; i < origToNorm.length; i++) {
    if (origToNorm[i] >= normalizedIndex) {
      startOrig = i
      break
    }
  }

  // Find end position
  let endOrig = startOrig + normalizedLength
  for (let i = startOrig; i < origToNorm.length; i++) {
    if (origToNorm[i] >= normalizedIndex + normalizedLength) {
      endOrig = i
      break
    }
  }

  // Ensure we don't go out of bounds
  endOrig = Math.min(endOrig, original.length)

  if (startOrig >= endOrig) {
    return null
  }

  return {
    start: startOrig,
    end: endOrig,
    text: original.substring(startOrig, endOrig),
  }
}

/**
 * Batch repair multiple quotes from the same evidence
 * More efficient than calling attemptQuoteRepair individually
 */
export function batchRepairQuotes(
  quotes: string[],
  content: string,
  config: Partial<QuoteRepairConfig> = {}
): Map<string, QuoteRepairResult> {
  const results = new Map<string, QuoteRepairResult>()

  for (const quote of quotes) {
    const result = attemptQuoteRepair(quote, content, config)
    results.set(quote, result)
  }

  return results
}

/**
 * Calculate repair statistics for a batch of results
 */
export interface RepairStatistics {
  total: number
  successful: number
  failed: number
  successRate: number
  byRepairType: Record<QuoteRepairType | "FAILED", number>
  averageSimilarity: number
  averageProcessingTimeMs: number
}

export function calculateRepairStatistics(results: QuoteRepairResult[]): RepairStatistics {
  const stats: RepairStatistics = {
    total: results.length,
    successful: 0,
    failed: 0,
    successRate: 0,
    byRepairType: {
      EXACT_AFTER_NORMALIZATION: 0,
      FUZZY_MATCH: 0,
      SUBSTRING_MATCH: 0,
      SMART_QUOTE_FIX: 0,
      WHITESPACE_FIX: 0,
      DIACRITIC_FIX: 0,
      FAILED: 0,
    },
    averageSimilarity: 0,
    averageProcessingTimeMs: 0,
  }

  let totalSimilarity = 0
  let totalProcessingTime = 0
  let similarityCount = 0

  for (const result of results) {
    if (result.success) {
      stats.successful++
      if (result.repairType) {
        stats.byRepairType[result.repairType]++
      }
      if (result.similarity !== undefined) {
        totalSimilarity += result.similarity
        similarityCount++
      }
    } else {
      stats.failed++
      stats.byRepairType.FAILED++
    }

    if (result.diagnostics?.processingTimeMs) {
      totalProcessingTime += result.diagnostics.processingTimeMs
    }
  }

  stats.successRate = results.length > 0 ? stats.successful / results.length : 0
  stats.averageSimilarity = similarityCount > 0 ? totalSimilarity / similarityCount : 0
  stats.averageProcessingTimeMs = results.length > 0 ? totalProcessingTime / results.length : 0

  return stats
}

/**
 * Analyze why a quote repair failed (for debugging/improvement)
 */
export interface RepairFailureAnalysis {
  quoteTooShort: boolean
  contentEmpty: boolean
  noSimilarityAboveThreshold: boolean
  bestMatchSimilarity: number
  bestMatchPreview: string
  suggestedActions: string[]
}

export function analyzeRepairFailure(
  quote: string,
  content: string,
  config: Partial<QuoteRepairConfig> = {}
): RepairFailureAnalysis {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const analysis: RepairFailureAnalysis = {
    quoteTooShort: false,
    contentEmpty: false,
    noSimilarityAboveThreshold: false,
    bestMatchSimilarity: 0,
    bestMatchPreview: "",
    suggestedActions: [],
  }

  if (quote.length < cfg.minQuoteLength) {
    analysis.quoteTooShort = true
    analysis.suggestedActions.push(
      `Quote is too short (${quote.length} chars). Minimum is ${cfg.minQuoteLength}.`
    )
    return analysis
  }

  if (!content || content.length === 0) {
    analysis.contentEmpty = true
    analysis.suggestedActions.push("Evidence content is empty. Check evidence fetching.")
    return analysis
  }

  // Find the best match even if below threshold
  const fuzzyResult = fuzzyContainsCroatian(content, quote, 0.5) // Use low threshold to find any match
  analysis.bestMatchSimilarity = fuzzyResult.similarity

  if (fuzzyResult.position >= 0) {
    const start = Math.max(0, fuzzyResult.position)
    const end = Math.min(content.length, fuzzyResult.position + quote.length + 20)
    analysis.bestMatchPreview = content.substring(start, end) + "..."
  }

  if (fuzzyResult.similarity < cfg.minSimilarity) {
    analysis.noSimilarityAboveThreshold = true
    const similarityPct = (fuzzyResult.similarity * 100).toFixed(1)
    const thresholdPct = (cfg.minSimilarity * 100).toFixed(1)
    analysis.suggestedActions.push(
      `Best match similarity (${similarityPct}%) is below threshold (${thresholdPct}%).`
    )

    if (fuzzyResult.similarity < 0.5) {
      analysis.suggestedActions.push("Quote may be from a different version of the document.")
      analysis.suggestedActions.push("Consider re-extracting from the current evidence content.")
    } else if (fuzzyResult.similarity < 0.8) {
      analysis.suggestedActions.push("Quote has significant differences. May need manual review.")
      analysis.suggestedActions.push("Consider lowering the similarity threshold for this source.")
    } else {
      analysis.suggestedActions.push(
        "Quote is close to threshold. Consider lowering minSimilarity to 0.85."
      )
    }
  }

  return analysis
}
