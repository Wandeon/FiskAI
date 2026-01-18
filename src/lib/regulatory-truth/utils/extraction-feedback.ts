// src/lib/regulatory-truth/utils/extraction-feedback.ts
//
// Extraction Feedback Collector - RTL Self-Improvement (Priority 2A)
//
// Purpose: Track extraction outcomes to identify patterns and improve extraction quality.
// Records every extraction outcome (published, rejected, quote mismatch, etc.) with
// confidence scores and metadata for analysis.
//
// Usage:
// - Call recordOutcome() after each extraction/publication decision
// - Call analyzeFailurePatterns() to identify problematic sources/domains
// - Feed insights back to prompt engineering and source configuration

import { dbReg } from "@/lib/db/regulatory"
import type { ExtractionOutcome } from "@/generated/regulatory-client"

/**
 * Input for recording extraction feedback
 */
export interface ExtractionFeedbackInput {
  evidenceId: string
  sourceSlug?: string
  domain: string
  outcomeType: ExtractionOutcome
  confidenceAt: number
  extractedValue?: string
  errorDetails?: string
  metadata?: Record<string, unknown>
}

/**
 * Domain analysis result
 */
export interface DomainAnalysis {
  domain: string
  totalExtractions: number
  successCount: number
  failureCount: number
  successRate: number
  avgConfidenceOnSuccess: number
  avgConfidenceOnFailure: number
  topFailureReasons: Array<{
    reason: ExtractionOutcome
    count: number
    percentage: number
  }>
}

/**
 * Source analysis result
 */
export interface SourceAnalysis {
  sourceSlug: string
  totalExtractions: number
  successRate: number
  failureRate: number
  avgConfidence: number
  domains: string[]
  recentFailures: number // Last 7 days
  trend: "IMPROVING" | "STABLE" | "DEGRADING"
}

/**
 * Weekly analysis report
 */
export interface WeeklyAnalysisReport {
  periodStart: Date
  periodEnd: Date
  totalExtractions: number
  overallSuccessRate: number
  topFailingDomains: DomainAnalysis[]
  topFailingSources: SourceAnalysis[]
  confidenceCalibrationSuggestion?: {
    currentThreshold: number
    suggestedThreshold: number
    reason: string
  }
}

/**
 * Record an extraction outcome
 */
export async function recordOutcome(input: ExtractionFeedbackInput): Promise<string> {
  const feedback = await dbReg.extractionFeedback.create({
    data: {
      evidenceId: input.evidenceId,
      sourceSlug: input.sourceSlug,
      domain: input.domain,
      outcomeType: input.outcomeType,
      confidenceAt: input.confidenceAt,
      extractedValue: input.extractedValue,
      errorDetails: input.errorDetails,
      metadata: input.metadata ?? null,
    },
  })

  return feedback.id
}

/**
 * Record multiple outcomes in a batch
 */
export async function recordOutcomeBatch(inputs: ExtractionFeedbackInput[]): Promise<number> {
  if (inputs.length === 0) return 0

  const result = await dbReg.extractionFeedback.createMany({
    data: inputs.map((input) => ({
      evidenceId: input.evidenceId,
      sourceSlug: input.sourceSlug,
      domain: input.domain,
      outcomeType: input.outcomeType,
      confidenceAt: input.confidenceAt,
      extractedValue: input.extractedValue,
      errorDetails: input.errorDetails,
      metadata: input.metadata ?? null,
    })),
  })

  return result.count
}

/**
 * Analyze failure patterns by domain
 */
export async function analyzeByDomain(
  since?: Date,
  minSamples: number = 10
): Promise<DomainAnalysis[]> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 1) // Last month

  const cutoff = since ?? defaultSince

  // Get all feedback grouped by domain
  const domainStats = await dbReg.extractionFeedback.groupBy({
    by: ["domain", "outcomeType"],
    where: { createdAt: { gte: cutoff } },
    _count: { id: true },
    _avg: { confidenceAt: true },
  })

  // Aggregate by domain
  const domainMap = new Map<
    string,
    {
      total: number
      successes: number
      failures: number
      avgConfSuccess: number[]
      avgConfFailure: number[]
      failureReasons: Map<ExtractionOutcome, number>
    }
  >()

  const successOutcomes: ExtractionOutcome[] = ["PUBLISHED", "APPROVED", "USER_POSITIVE"]
  const failureOutcomes: ExtractionOutcome[] = [
    "REJECTED",
    "QUOTE_MISMATCH",
    "VALIDATION_FAIL",
    "USER_NEGATIVE",
  ]

  for (const stat of domainStats) {
    if (!domainMap.has(stat.domain)) {
      domainMap.set(stat.domain, {
        total: 0,
        successes: 0,
        failures: 0,
        avgConfSuccess: [],
        avgConfFailure: [],
        failureReasons: new Map(),
      })
    }

    const domain = domainMap.get(stat.domain)!
    domain.total += stat._count.id

    if (successOutcomes.includes(stat.outcomeType)) {
      domain.successes += stat._count.id
      if (stat._avg.confidenceAt) {
        domain.avgConfSuccess.push(stat._avg.confidenceAt)
      }
    } else if (failureOutcomes.includes(stat.outcomeType)) {
      domain.failures += stat._count.id
      domain.failureReasons.set(
        stat.outcomeType,
        (domain.failureReasons.get(stat.outcomeType) || 0) + stat._count.id
      )
      if (stat._avg.confidenceAt) {
        domain.avgConfFailure.push(stat._avg.confidenceAt)
      }
    }
  }

  // Convert to analysis results
  const results: DomainAnalysis[] = []

  for (const [domain, stats] of domainMap) {
    if (stats.total < minSamples) continue

    const topFailureReasons = Array.from(stats.failureReasons.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: stats.failures > 0 ? count / stats.failures : 0,
      }))

    results.push({
      domain,
      totalExtractions: stats.total,
      successCount: stats.successes,
      failureCount: stats.failures,
      successRate: stats.total > 0 ? stats.successes / stats.total : 0,
      avgConfidenceOnSuccess:
        stats.avgConfSuccess.length > 0
          ? stats.avgConfSuccess.reduce((a, b) => a + b) / stats.avgConfSuccess.length
          : 0,
      avgConfidenceOnFailure:
        stats.avgConfFailure.length > 0
          ? stats.avgConfFailure.reduce((a, b) => a + b) / stats.avgConfFailure.length
          : 0,
      topFailureReasons,
    })
  }

  // Sort by failure rate descending
  return results.sort((a, b) => 1 - a.successRate - (1 - b.successRate))
}

/**
 * Analyze failure patterns by source
 */
export async function analyzeBySource(
  since?: Date,
  minSamples: number = 5
): Promise<SourceAnalysis[]> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 1)

  const cutoff = since ?? defaultSince
  const recentCutoff = new Date()
  recentCutoff.setDate(recentCutoff.getDate() - 7)

  // Get stats for each source
  const sources = await dbReg.extractionFeedback.groupBy({
    by: ["sourceSlug"],
    where: {
      createdAt: { gte: cutoff },
      sourceSlug: { not: null },
    },
    _count: { id: true },
    _avg: { confidenceAt: true },
  })

  const results: SourceAnalysis[] = []

  for (const source of sources) {
    if (!source.sourceSlug || source._count.id < minSamples) continue

    // Get success/failure counts
    const successCount = await dbReg.extractionFeedback.count({
      where: {
        sourceSlug: source.sourceSlug,
        createdAt: { gte: cutoff },
        outcomeType: { in: ["PUBLISHED", "APPROVED", "USER_POSITIVE"] },
      },
    })

    const failureCount = await dbReg.extractionFeedback.count({
      where: {
        sourceSlug: source.sourceSlug,
        createdAt: { gte: cutoff },
        outcomeType: {
          in: ["REJECTED", "QUOTE_MISMATCH", "VALIDATION_FAIL", "USER_NEGATIVE"],
        },
      },
    })

    // Get recent failures
    const recentFailures = await dbReg.extractionFeedback.count({
      where: {
        sourceSlug: source.sourceSlug,
        createdAt: { gte: recentCutoff },
        outcomeType: {
          in: ["REJECTED", "QUOTE_MISMATCH", "VALIDATION_FAIL", "USER_NEGATIVE"],
        },
      },
    })

    // Get domains for this source
    const domains = await dbReg.extractionFeedback.findMany({
      where: {
        sourceSlug: source.sourceSlug,
        createdAt: { gte: cutoff },
      },
      select: { domain: true },
      distinct: ["domain"],
    })

    // Calculate trend (compare last 7 days to previous 7 days)
    const previousWeekStart = new Date(recentCutoff)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)

    const previousWeekFailures = await dbReg.extractionFeedback.count({
      where: {
        sourceSlug: source.sourceSlug,
        createdAt: { gte: previousWeekStart, lt: recentCutoff },
        outcomeType: {
          in: ["REJECTED", "QUOTE_MISMATCH", "VALIDATION_FAIL", "USER_NEGATIVE"],
        },
      },
    })

    let trend: "IMPROVING" | "STABLE" | "DEGRADING" = "STABLE"
    if (recentFailures > previousWeekFailures * 1.5) {
      trend = "DEGRADING"
    } else if (recentFailures < previousWeekFailures * 0.5) {
      trend = "IMPROVING"
    }

    const total = successCount + failureCount

    results.push({
      sourceSlug: source.sourceSlug,
      totalExtractions: source._count.id,
      successRate: total > 0 ? successCount / total : 0,
      failureRate: total > 0 ? failureCount / total : 0,
      avgConfidence: source._avg.confidenceAt ?? 0,
      domains: domains.map((d) => d.domain),
      recentFailures,
      trend,
    })
  }

  // Sort by failure rate descending
  return results.sort((a, b) => b.failureRate - a.failureRate)
}

/**
 * Generate weekly analysis report
 */
export async function generateWeeklyReport(): Promise<WeeklyAnalysisReport> {
  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - 7)

  // Get overall stats
  const totalExtractions = await dbReg.extractionFeedback.count({
    where: { createdAt: { gte: periodStart } },
  })

  const successCount = await dbReg.extractionFeedback.count({
    where: {
      createdAt: { gte: periodStart },
      outcomeType: { in: ["PUBLISHED", "APPROVED", "USER_POSITIVE"] },
    },
  })

  const overallSuccessRate = totalExtractions > 0 ? successCount / totalExtractions : 0

  // Get top failing domains and sources
  const topFailingDomains = (await analyzeByDomain(periodStart, 5))
    .filter((d) => d.successRate < 0.8)
    .slice(0, 5)

  const topFailingSources = (await analyzeBySource(periodStart, 3))
    .filter((s) => s.failureRate > 0.2)
    .slice(0, 5)

  // Check if confidence threshold needs adjustment
  let confidenceCalibrationSuggestion:
    | { currentThreshold: number; suggestedThreshold: number; reason: string }
    | undefined

  // Find the confidence level where success rate drops significantly
  const confidenceBuckets = await dbReg.extractionFeedback.groupBy({
    by: ["outcomeType"],
    where: {
      createdAt: { gte: periodStart },
      confidenceAt: { lt: 0.7 }, // Below current typical threshold
    },
    _count: { id: true },
  })

  const lowConfSuccesses = confidenceBuckets
    .filter((b) => ["PUBLISHED", "APPROVED"].includes(b.outcomeType))
    .reduce((sum, b) => sum + b._count.id, 0)

  const lowConfTotal = confidenceBuckets.reduce((sum, b) => sum + b._count.id, 0)
  const lowConfSuccessRate = lowConfTotal > 0 ? lowConfSuccesses / lowConfTotal : 0

  if (lowConfTotal > 50 && lowConfSuccessRate > 0.6) {
    confidenceCalibrationSuggestion = {
      currentThreshold: 0.7,
      suggestedThreshold: 0.6,
      reason: `Low-confidence extractions (< 0.7) have ${(lowConfSuccessRate * 100).toFixed(1)}% success rate. Consider lowering threshold.`,
    }
  }

  return {
    periodStart,
    periodEnd,
    totalExtractions,
    overallSuccessRate,
    topFailingDomains,
    topFailingSources,
    confidenceCalibrationSuggestion,
  }
}

/**
 * Get confidence-outcome correlation data for calibration
 */
export async function getConfidenceOutcomeCorrelation(since?: Date): Promise<
  Array<{
    confidenceBucket: string
    successCount: number
    failureCount: number
    successRate: number
  }>
> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 3)

  const cutoff = since ?? defaultSince

  // Bucket confidence into 10% ranges
  const buckets: Record<string, { successes: number; failures: number }> = {
    "0.0-0.1": { successes: 0, failures: 0 },
    "0.1-0.2": { successes: 0, failures: 0 },
    "0.2-0.3": { successes: 0, failures: 0 },
    "0.3-0.4": { successes: 0, failures: 0 },
    "0.4-0.5": { successes: 0, failures: 0 },
    "0.5-0.6": { successes: 0, failures: 0 },
    "0.6-0.7": { successes: 0, failures: 0 },
    "0.7-0.8": { successes: 0, failures: 0 },
    "0.8-0.9": { successes: 0, failures: 0 },
    "0.9-1.0": { successes: 0, failures: 0 },
  }

  const feedbacks = await dbReg.extractionFeedback.findMany({
    where: { createdAt: { gte: cutoff } },
    select: {
      confidenceAt: true,
      outcomeType: true,
    },
  })

  const successOutcomes: ExtractionOutcome[] = ["PUBLISHED", "APPROVED", "USER_POSITIVE"]

  for (const fb of feedbacks) {
    const bucketIndex = Math.min(Math.floor(fb.confidenceAt * 10), 9)
    const bucketKey = Object.keys(buckets)[bucketIndex]

    if (successOutcomes.includes(fb.outcomeType)) {
      buckets[bucketKey].successes++
    } else {
      buckets[bucketKey].failures++
    }
  }

  return Object.entries(buckets).map(([bucket, stats]) => ({
    confidenceBucket: bucket,
    successCount: stats.successes,
    failureCount: stats.failures,
    successRate:
      stats.successes + stats.failures > 0
        ? stats.successes / (stats.successes + stats.failures)
        : 0,
  }))
}

/**
 * Cleanup old feedback records (retention policy)
 */
export async function cleanupOldFeedback(retentionMonths: number = 6): Promise<number> {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - retentionMonths)

  const result = await dbReg.extractionFeedback.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  if (result.count > 0) {
    console.log(`[extraction-feedback] Cleaned up ${result.count} old feedback records`)
  }

  return result.count
}
