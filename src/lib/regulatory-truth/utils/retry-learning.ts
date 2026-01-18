// src/lib/regulatory-truth/utils/retry-learning.ts
//
// Adaptive Retry Learning - RTL Self-Improvement (Priority 4A)
//
// Purpose: Learn optimal retry wait times per error type based on historical outcomes.
// Instead of fixed cooldowns, this module tracks (errorType, waitTime, retrySuccess)
// tuples and learns the optimal wait time for each error category.
//
// Example learned outcomes:
// - NETWORK errors: Learned optimal wait = 2 min (not fixed 5 min)
// - QUOTA errors: Learned optimal wait = 45 min (not fixed 1 hr)

import { dbReg } from "@/lib/db/regulatory"
import { ErrorCategory } from "./error-classifier"

/**
 * Retry outcome for learning
 */
export interface RetryOutcome {
  errorCategory: ErrorCategory
  waitTimeMs: number
  success: boolean
  timestamp?: Date
}

/**
 * Learned optimal parameters for an error category
 */
export interface LearnedRetryParams {
  errorCategory: ErrorCategory
  optimalWaitMs: number
  successRate: number
  sampleSize: number
  confidence: number // 0-1 based on sample size
  lastUpdated: Date
}

/**
 * In-memory cache for learned parameters (refreshed periodically)
 */
const learnedParamsCache = new Map<ErrorCategory, LearnedRetryParams>()
let cacheLastRefreshed = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Time buckets for grouping wait times (in ms)
 */
const WAIT_TIME_BUCKETS = [
  1 * 60 * 1000, // 1 minute
  2 * 60 * 1000, // 2 minutes
  5 * 60 * 1000, // 5 minutes
  10 * 60 * 1000, // 10 minutes
  15 * 60 * 1000, // 15 minutes
  30 * 60 * 1000, // 30 minutes
  45 * 60 * 1000, // 45 minutes
  60 * 60 * 1000, // 1 hour
  120 * 60 * 1000, // 2 hours
] as const

/**
 * Default cooldowns (fallback when no learned data)
 */
const DEFAULT_COOLDOWNS: Record<ErrorCategory, number> = {
  [ErrorCategory.NETWORK]: 5 * 60 * 1000, // 5 minutes
  [ErrorCategory.TIMEOUT]: 5 * 60 * 1000, // 5 minutes
  [ErrorCategory.QUOTA]: 60 * 60 * 1000, // 1 hour
  [ErrorCategory.PARSE]: 5 * 60 * 1000, // 5 minutes
  [ErrorCategory.AUTH]: Infinity, // Never auto-retry
  [ErrorCategory.VALIDATION]: Infinity, // Never auto-retry
  [ErrorCategory.EMPTY]: Infinity, // Never auto-retry
  [ErrorCategory.UNKNOWN]: Infinity, // Never auto-retry
}

/**
 * Minimum samples required before trusting learned parameters
 */
const MIN_SAMPLES_FOR_LEARNING = 5

/**
 * Find the nearest bucket for a wait time
 */
function toBucket(waitTimeMs: number): number {
  for (const bucket of WAIT_TIME_BUCKETS) {
    if (waitTimeMs <= bucket * 1.5) {
      return bucket
    }
  }
  return WAIT_TIME_BUCKETS[WAIT_TIME_BUCKETS.length - 1]
}

/**
 * Record a retry outcome for learning.
 * Stores the outcome in the database for aggregation.
 */
export async function recordRetryOutcome(outcome: RetryOutcome): Promise<void> {
  const timestamp = outcome.timestamp ?? new Date()
  const bucketedWaitTime = toBucket(outcome.waitTimeMs)

  // Store in ExtractionFeedback table (repurposing for retry learning)
  // We use domain to store the error category and confidenceAt to store wait time bucket
  await dbReg.extractionFeedback.create({
    data: {
      evidenceId: `retry-learning-${outcome.errorCategory}`,
      domain: outcome.errorCategory,
      sourceSlug: "dlq-healer",
      outcomeType: outcome.success ? "APPROVED" : "REJECTED",
      confidenceAt: bucketedWaitTime / 1000 / 60, // Store as minutes for readability
      extractedValue: `wait_${bucketedWaitTime}ms`,
      metadata: {
        waitTimeMs: outcome.waitTimeMs,
        bucketedWaitTimeMs: bucketedWaitTime,
        originalCategory: outcome.errorCategory,
      },
      createdAt: timestamp,
    },
  })

  // Invalidate cache
  cacheLastRefreshed = 0
}

/**
 * Record multiple retry outcomes in batch.
 */
export async function recordRetryOutcomeBatch(outcomes: RetryOutcome[]): Promise<void> {
  for (const outcome of outcomes) {
    await recordRetryOutcome(outcome)
  }
}

/**
 * Learn optimal wait time for an error category from historical data.
 */
async function learnOptimalWaitTime(
  errorCategory: ErrorCategory
): Promise<LearnedRetryParams | null> {
  const since = new Date()
  since.setMonth(since.getMonth() - 3) // Use last 3 months of data

  // Get all retry outcomes for this category
  const outcomes = await dbReg.extractionFeedback.findMany({
    where: {
      domain: errorCategory,
      sourceSlug: "dlq-healer",
      createdAt: { gte: since },
    },
    select: {
      confidenceAt: true, // Wait time in minutes
      outcomeType: true,
      createdAt: true,
    },
  })

  if (outcomes.length < MIN_SAMPLES_FOR_LEARNING) {
    return null
  }

  // Group by wait time bucket and calculate success rates
  const bucketStats = new Map<number, { successes: number; failures: number; totalWait: number }>()

  for (const outcome of outcomes) {
    const waitMinutes = outcome.confidenceAt
    const waitMs = waitMinutes * 60 * 1000
    const bucket = toBucket(waitMs)

    if (!bucketStats.has(bucket)) {
      bucketStats.set(bucket, { successes: 0, failures: 0, totalWait: 0 })
    }

    const stats = bucketStats.get(bucket)!
    if (outcome.outcomeType === "APPROVED") {
      stats.successes++
    } else {
      stats.failures++
    }
    stats.totalWait += waitMs
  }

  // Find the bucket with best success rate (must have at least 2 samples)
  let bestBucket: number | null = null
  let bestSuccessRate = 0
  let bestSampleSize = 0

  for (const [bucket, stats] of bucketStats) {
    const total = stats.successes + stats.failures
    if (total < 2) continue

    const successRate = stats.successes / total

    // Prefer higher success rate, but also favor shorter wait times if rates are similar
    // A bucket is "better" if it has significantly higher success rate OR
    // similar success rate with shorter wait time
    const isBetter =
      successRate > bestSuccessRate + 0.1 || // Significantly better
      (successRate >= bestSuccessRate - 0.05 && bucket < (bestBucket ?? Infinity)) // Similar but faster

    if (isBetter) {
      bestBucket = bucket
      bestSuccessRate = successRate
      bestSampleSize = total
    }
  }

  if (bestBucket === null) {
    return null
  }

  // Calculate confidence based on sample size
  const confidence = Math.min(1, bestSampleSize / 20) // Full confidence at 20+ samples

  return {
    errorCategory,
    optimalWaitMs: bestBucket,
    successRate: bestSuccessRate,
    sampleSize: bestSampleSize,
    confidence,
    lastUpdated: new Date(),
  }
}

/**
 * Refresh the learned parameters cache for all error categories.
 */
async function refreshCache(): Promise<void> {
  const now = Date.now()
  if (now - cacheLastRefreshed < CACHE_TTL_MS) {
    return // Cache is still fresh
  }

  for (const category of Object.values(ErrorCategory)) {
    const learned = await learnOptimalWaitTime(category)
    if (learned) {
      learnedParamsCache.set(category, learned)
    }
  }

  cacheLastRefreshed = now
  console.log(`[retry-learning] Refreshed cache with ${learnedParamsCache.size} learned categories`)
}

/**
 * Get the adaptive cooldown for an error category.
 * Uses learned parameters if available with sufficient confidence,
 * otherwise falls back to default.
 */
export async function getAdaptiveCooldownMs(errorCategory: ErrorCategory): Promise<number> {
  // Non-retryable errors always return Infinity
  if (DEFAULT_COOLDOWNS[errorCategory] === Infinity) {
    return Infinity
  }

  // Refresh cache if needed
  await refreshCache()

  const learned = learnedParamsCache.get(errorCategory)

  // Use learned value if confident enough
  if (learned && learned.confidence >= 0.5) {
    console.log(
      `[retry-learning] Using learned cooldown for ${errorCategory}: ` +
        `${learned.optimalWaitMs / 1000 / 60}min (confidence: ${(learned.confidence * 100).toFixed(0)}%)`
    )
    return learned.optimalWaitMs
  }

  // Fall back to default
  return DEFAULT_COOLDOWNS[errorCategory]
}

/**
 * Get learned parameters for all categories (for monitoring dashboard).
 */
export async function getAllLearnedParams(): Promise<Map<ErrorCategory, LearnedRetryParams>> {
  await refreshCache()
  return new Map(learnedParamsCache)
}

/**
 * Get a summary of retry learning status.
 */
export async function getRetryLearningSummary(): Promise<{
  categories: Array<{
    category: ErrorCategory
    defaultCooldownMs: number
    learnedCooldownMs: number | null
    successRate: number | null
    sampleSize: number
    confidence: number
    improvement: string
  }>
  totalSamples: number
  categoriesWithLearning: number
}> {
  await refreshCache()

  const categories: Array<{
    category: ErrorCategory
    defaultCooldownMs: number
    learnedCooldownMs: number | null
    successRate: number | null
    sampleSize: number
    confidence: number
    improvement: string
  }> = []

  let totalSamples = 0
  let categoriesWithLearning = 0

  for (const category of Object.values(ErrorCategory)) {
    const defaultCooldown = DEFAULT_COOLDOWNS[category]
    const learned = learnedParamsCache.get(category)

    let improvement = "No data"
    if (learned && defaultCooldown !== Infinity) {
      const diff = defaultCooldown - learned.optimalWaitMs
      const percentChange = (diff / defaultCooldown) * 100

      if (percentChange > 10) {
        improvement = `${Math.abs(percentChange).toFixed(0)}% faster`
      } else if (percentChange < -10) {
        improvement = `${Math.abs(percentChange).toFixed(0)}% slower (safer)`
      } else {
        improvement = "Similar to default"
      }

      categoriesWithLearning++
    }

    categories.push({
      category,
      defaultCooldownMs: defaultCooldown === Infinity ? -1 : defaultCooldown,
      learnedCooldownMs: learned?.optimalWaitMs ?? null,
      successRate: learned?.successRate ?? null,
      sampleSize: learned?.sampleSize ?? 0,
      confidence: learned?.confidence ?? 0,
      improvement,
    })

    totalSamples += learned?.sampleSize ?? 0
  }

  return {
    categories,
    totalSamples,
    categoriesWithLearning,
  }
}

/**
 * Clear all learned data (for testing).
 */
export function clearLearnedParams(): void {
  learnedParamsCache.clear()
  cacheLastRefreshed = 0
}
