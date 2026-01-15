// src/lib/regulatory-truth/utils/derived-confidence.ts

/**
 * Evidence pointer with optional independence fields for corroboration bonus.
 *
 * Task 2.1: Evidence Aggregation for Confidence
 * Independence is defined by unique combination of:
 * - publisherDomain: The domain of the source publisher
 * - legalReference: The legal document reference (e.g., "NN 73/13")
 * - evidenceType: The type of evidence (e.g., "html", "pdf")
 */
export interface EvidencePointer {
  confidence: number
  publisherDomain?: string | null
  legalReference?: string | null
  evidenceType?: string | null
}

/**
 * Generate independence key from evidence pointer.
 * Unique combination of publisherDomain + legalReference + evidenceType
 * determines if two pieces of evidence are from independent sources.
 *
 * @param evidence - Evidence pointer with optional independence fields
 * @returns Independence key string
 */
export function getIndependenceKey(evidence: Partial<EvidencePointer>): string {
  const domain = evidence.publisherDomain ?? ""
  const ref = evidence.legalReference ?? ""
  const type = evidence.evidenceType ?? ""
  return `${domain}|${ref}|${type}`
}

/**
 * Count unique independent source clusters.
 * Same publisher with multiple articles = 1 source (no bonus).
 * Different publishers/references/types = independent sources.
 *
 * @param evidences - Array of evidence pointers
 * @returns Number of unique independence clusters
 */
export function countIndependentSources(evidences: Partial<EvidencePointer>[]): number {
  if (evidences.length === 0) return 0
  const uniqueKeys = new Set(evidences.map(getIndependenceKey))
  return uniqueKeys.size
}

/**
 * Calculate median of an array of numbers.
 *
 * @param values - Array of numbers
 * @returns Median value (average of middle two for even length)
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    // Even length: average of middle two
    return (sorted[mid - 1] + sorted[mid]) / 2
  } else {
    // Odd length: middle value
    return sorted[mid]
  }
}

/**
 * Compute derived confidence from source pointers.
 *
 * Task 2.1: Evidence Aggregation for Confidence (RTL Autonomy Improvements)
 *
 * CHANGES from previous implementation:
 * - Uses MEDIAN confidence instead of minimum-weighted average
 * - Applies corroboration bonus: +3% per independent source (max +10%)
 * - Independence based on unique combination of publisherDomain + legalReference + evidenceType
 * - Same publisher with multiple articles = 1 source (no double-counting)
 *
 * This fixes the problem where a single weak source pointer would drag down
 * entire rule confidence. Multi-source rules now get a confidence boost.
 *
 * @param pointers - Source pointers with confidence scores and optional independence fields
 * @param llmConfidence - LLM's self-assessed confidence
 * @returns Derived confidence score (0-1)
 */
export function computeDerivedConfidence(
  pointers: Array<Partial<EvidencePointer> & { confidence: number }>,
  llmConfidence: number
): number {
  if (pointers.length === 0) return 0

  // Step 1: Calculate MEDIAN confidence (replaces min-weighted average)
  const confidences = pointers.map((p) => p.confidence)
  const medianConfidence = calculateMedian(confidences)

  // Step 2: Count independent source clusters for corroboration bonus
  const independentCount = countIndependentSources(pointers)

  // Step 3: Calculate corroboration bonus (+3% per additional source, capped at +10%)
  // Bonus only applies when there are 2+ independent sources
  const corroborationBonus = Math.min((independentCount - 1) * 0.03, 0.1)

  // Step 4: Add bonus to median (cap at 1.0)
  const evidenceBasedConfidence = Math.min(medianConfidence + corroborationBonus, 1.0)

  // Step 5: Final confidence is capped at LLM confidence
  // This ensures a rule can't have high confidence if the LLM is uncertain
  return Math.min(evidenceBasedConfidence, llmConfidence)
}
