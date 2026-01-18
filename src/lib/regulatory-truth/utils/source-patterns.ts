// src/lib/regulatory-truth/utils/source-patterns.ts
//
// Source-Specific Pattern Learning - RTL Self-Improvement (Priority 3B)
//
// Purpose: Track and learn failure patterns per source/time to predict
// when scraping is likely to fail. For example: "Source X always fails on Mondays"
//
// Usage:
// - Call recordOutcome() after each scrape attempt
// - Call getOptimalScrapeTiming() before scraping to check if delay is advisable
// - Call analyzePatterns() to generate reports on source reliability

import { dbReg } from "@/lib/db/regulatory"

/**
 * Outcome of a scrape attempt
 */
export interface ScrapeOutcome {
  sourceSlug: string
  success: boolean
  latencyMs?: number
  timestamp?: Date
}

/**
 * Timing recommendation for scraping
 */
export interface TimingRecommendation {
  shouldProceed: boolean
  reason: string
  historicalFailureRate: number
  optimalHour?: number
  suggestedDelayMinutes?: number
}

/**
 * Source pattern analysis result
 */
export interface SourcePatternAnalysis {
  sourceSlug: string
  overallFailureRate: number
  overallSuccessRate: number
  totalSamples: number
  avgLatencyMs: number | null
  worstDayOfWeek: { day: number; failureRate: number } | null
  worstHourOfDay: { hour: number; failureRate: number } | null
  bestTimeSlot: { dayOfWeek: number | null; hourOfDay: number | null; successRate: number } | null
  patterns: Array<{
    dayOfWeek: number | null
    hourOfDay: number | null
    failureRate: number
    sampleSize: number
  }>
}

/**
 * Threshold for considering a time slot "high risk"
 */
const HIGH_FAILURE_RATE_THRESHOLD = 0.5 // 50%

/**
 * Minimum samples before trusting a pattern
 */
const MIN_SAMPLES_FOR_PATTERN = 3

/**
 * Record the outcome of a scrape attempt.
 * Updates historical pattern data for the source.
 */
export async function recordOutcome(outcome: ScrapeOutcome): Promise<void> {
  const timestamp = outcome.timestamp ?? new Date()
  const dayOfWeek = timestamp.getDay() // 0-6 (Sunday-Saturday)
  const hourOfDay = timestamp.getHours() // 0-23

  // Update specific time slot pattern
  await updatePattern(outcome.sourceSlug, dayOfWeek, hourOfDay, outcome.success, outcome.latencyMs)

  // Also update day-only pattern (null hour)
  await updatePattern(outcome.sourceSlug, dayOfWeek, null, outcome.success, outcome.latencyMs)

  // Also update hour-only pattern (null day)
  await updatePattern(outcome.sourceSlug, null, hourOfDay, outcome.success, outcome.latencyMs)

  // Update overall pattern (null day and hour)
  await updatePattern(outcome.sourceSlug, null, null, outcome.success, outcome.latencyMs)
}

/**
 * Record multiple outcomes in batch.
 */
export async function recordOutcomeBatch(outcomes: ScrapeOutcome[]): Promise<void> {
  // Process sequentially to avoid race conditions on pattern updates
  for (const outcome of outcomes) {
    await recordOutcome(outcome)
  }
}

/**
 * Update a specific pattern record with new outcome data.
 */
async function updatePattern(
  sourceSlug: string,
  dayOfWeek: number | null,
  hourOfDay: number | null,
  success: boolean,
  latencyMs?: number
): Promise<void> {
  const existing = await dbReg.sourceHealthPattern.findUnique({
    where: {
      sourceSlug_dayOfWeek_hourOfDay: {
        sourceSlug,
        dayOfWeek,
        hourOfDay,
      },
    },
  })

  if (existing) {
    // Update existing pattern with exponential moving average
    const alpha = 0.2 // Weight for new data (20% new, 80% historical)

    const newFailureRate = existing.failureRate * (1 - alpha) + (success ? 0 : 1) * alpha
    const newSuccessRate = existing.successRate * (1 - alpha) + (success ? 1 : 0) * alpha

    // Update latency with EMA if provided
    const newLatency = latencyMs
      ? existing.avgLatencyMs
        ? existing.avgLatencyMs * (1 - alpha) + latencyMs * alpha
        : latencyMs
      : existing.avgLatencyMs

    await dbReg.sourceHealthPattern.update({
      where: { id: existing.id },
      data: {
        failureRate: newFailureRate,
        successRate: newSuccessRate,
        sampleSize: existing.sampleSize + 1,
        avgLatencyMs: newLatency,
        lastUpdated: new Date(),
      },
    })
  } else {
    // Create new pattern
    await dbReg.sourceHealthPattern.create({
      data: {
        sourceSlug,
        dayOfWeek,
        hourOfDay,
        failureRate: success ? 0 : 1,
        successRate: success ? 1 : 0,
        sampleSize: 1,
        avgLatencyMs: latencyMs ?? null,
      },
    })
  }
}

/**
 * Get timing recommendation for scraping a source.
 * Checks historical patterns and recommends whether to proceed or delay.
 */
export async function getOptimalScrapeTiming(
  sourceSlug: string,
  proposedTime?: Date
): Promise<TimingRecommendation> {
  const now = proposedTime ?? new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  // Get patterns for this source
  const patterns = await dbReg.sourceHealthPattern.findMany({
    where: { sourceSlug },
    orderBy: { sampleSize: "desc" },
  })

  if (patterns.length === 0) {
    return {
      shouldProceed: true,
      reason: "No historical data available for this source",
      historicalFailureRate: 0,
    }
  }

  // Find specific pattern for current time slot
  const specificPattern = patterns.find(
    (p) => p.dayOfWeek === currentDay && p.hourOfDay === currentHour
  )

  // Find day-only pattern
  const dayPattern = patterns.find((p) => p.dayOfWeek === currentDay && p.hourOfDay === null)

  // Find hour-only pattern
  const hourPattern = patterns.find((p) => p.dayOfWeek === null && p.hourOfDay === currentHour)

  // Find overall pattern
  const overallPattern = patterns.find((p) => p.dayOfWeek === null && p.hourOfDay === null)

  // Calculate weighted failure rate
  // More specific patterns get higher weight if they have enough samples
  let weightedFailureRate = 0
  let totalWeight = 0

  if (specificPattern && specificPattern.sampleSize >= MIN_SAMPLES_FOR_PATTERN) {
    weightedFailureRate += specificPattern.failureRate * 4
    totalWeight += 4
  }

  if (dayPattern && dayPattern.sampleSize >= MIN_SAMPLES_FOR_PATTERN) {
    weightedFailureRate += dayPattern.failureRate * 2
    totalWeight += 2
  }

  if (hourPattern && hourPattern.sampleSize >= MIN_SAMPLES_FOR_PATTERN) {
    weightedFailureRate += hourPattern.failureRate * 2
    totalWeight += 2
  }

  if (overallPattern && overallPattern.sampleSize >= MIN_SAMPLES_FOR_PATTERN) {
    weightedFailureRate += overallPattern.failureRate * 1
    totalWeight += 1
  }

  const historicalFailureRate = totalWeight > 0 ? weightedFailureRate / totalWeight : 0

  // If failure rate is high, recommend delay
  if (historicalFailureRate >= HIGH_FAILURE_RATE_THRESHOLD) {
    // Find a better time slot
    const optimalSlot = findOptimalTimeSlot(patterns)

    if (optimalSlot) {
      // Calculate delay in minutes until optimal slot
      const delayMinutes = calculateDelayToSlot(now, optimalSlot.dayOfWeek, optimalSlot.hourOfDay)

      return {
        shouldProceed: false,
        reason:
          `High historical failure rate (${(historicalFailureRate * 100).toFixed(1)}%) at this time. ` +
          `Better time: ${formatTimeSlot(optimalSlot.dayOfWeek, optimalSlot.hourOfDay)}`,
        historicalFailureRate,
        optimalHour: optimalSlot.hourOfDay ?? undefined,
        suggestedDelayMinutes: delayMinutes,
      }
    }

    return {
      shouldProceed: false,
      reason: `High historical failure rate (${(historicalFailureRate * 100).toFixed(1)}%) - no better alternative found`,
      historicalFailureRate,
      suggestedDelayMinutes: 60, // Default: wait an hour
    }
  }

  return {
    shouldProceed: true,
    reason: `Historical failure rate is acceptable (${(historicalFailureRate * 100).toFixed(1)}%)`,
    historicalFailureRate,
  }
}

/**
 * Find the optimal time slot with lowest failure rate.
 */
function findOptimalTimeSlot(
  patterns: Array<{
    dayOfWeek: number | null
    hourOfDay: number | null
    failureRate: number
    successRate: number
    sampleSize: number
  }>
): { dayOfWeek: number | null; hourOfDay: number | null } | null {
  const validPatterns = patterns.filter(
    (p) => p.sampleSize >= MIN_SAMPLES_FOR_PATTERN && (p.dayOfWeek !== null || p.hourOfDay !== null)
  )

  if (validPatterns.length === 0) {
    return null
  }

  // Sort by success rate (descending)
  const sorted = [...validPatterns].sort((a, b) => b.successRate - a.successRate)

  return {
    dayOfWeek: sorted[0].dayOfWeek,
    hourOfDay: sorted[0].hourOfDay,
  }
}

/**
 * Calculate minutes until the specified time slot.
 */
function calculateDelayToSlot(
  from: Date,
  targetDay: number | null,
  targetHour: number | null
): number {
  const now = from.getTime()
  const target = new Date(from)

  // Set target hour (default to next occurrence of this hour)
  if (targetHour !== null) {
    target.setHours(targetHour, 0, 0, 0)
    if (target.getTime() <= now) {
      target.setDate(target.getDate() + 1)
    }
  }

  // Adjust for target day if specified
  if (targetDay !== null) {
    const currentDay = target.getDay()
    let daysToAdd = targetDay - currentDay
    if (daysToAdd <= 0) {
      daysToAdd += 7 // Next week
    }
    target.setDate(target.getDate() + daysToAdd)
  }

  return Math.ceil((target.getTime() - now) / (1000 * 60))
}

/**
 * Format time slot for human-readable display.
 */
function formatTimeSlot(dayOfWeek: number | null, hourOfDay: number | null): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  if (dayOfWeek !== null && hourOfDay !== null) {
    return `${days[dayOfWeek]} at ${hourOfDay}:00`
  }

  if (dayOfWeek !== null) {
    return days[dayOfWeek]
  }

  if (hourOfDay !== null) {
    return `${hourOfDay}:00`
  }

  return "any time"
}

/**
 * Analyze patterns for a specific source.
 */
export async function analyzeSourcePatterns(sourceSlug: string): Promise<SourcePatternAnalysis> {
  const patterns = await dbReg.sourceHealthPattern.findMany({
    where: { sourceSlug },
    orderBy: [{ sampleSize: "desc" }],
  })

  // Get overall stats
  const overall = patterns.find((p) => p.dayOfWeek === null && p.hourOfDay === null)

  // Find worst day
  const dayPatterns = patterns.filter(
    (p) => p.dayOfWeek !== null && p.hourOfDay === null && p.sampleSize >= MIN_SAMPLES_FOR_PATTERN
  )
  const worstDay = dayPatterns.reduce<{ day: number; failureRate: number } | null>(
    (worst, p) =>
      !worst || p.failureRate > worst.failureRate
        ? { day: p.dayOfWeek!, failureRate: p.failureRate }
        : worst,
    null
  )

  // Find worst hour
  const hourPatterns = patterns.filter(
    (p) => p.dayOfWeek === null && p.hourOfDay !== null && p.sampleSize >= MIN_SAMPLES_FOR_PATTERN
  )
  const worstHour = hourPatterns.reduce<{ hour: number; failureRate: number } | null>(
    (worst, p) =>
      !worst || p.failureRate > worst.failureRate
        ? { hour: p.hourOfDay!, failureRate: p.failureRate }
        : worst,
    null
  )

  // Find best time slot
  const validPatterns = patterns.filter(
    (p) => p.sampleSize >= MIN_SAMPLES_FOR_PATTERN && (p.dayOfWeek !== null || p.hourOfDay !== null)
  )
  const bestSlot = validPatterns.reduce<{
    dayOfWeek: number | null
    hourOfDay: number | null
    successRate: number
  } | null>(
    (best, p) =>
      !best || p.successRate > best.successRate
        ? { dayOfWeek: p.dayOfWeek, hourOfDay: p.hourOfDay, successRate: p.successRate }
        : best,
    null
  )

  return {
    sourceSlug,
    overallFailureRate: overall?.failureRate ?? 0,
    overallSuccessRate: overall?.successRate ?? 1,
    totalSamples: overall?.sampleSize ?? 0,
    avgLatencyMs: overall?.avgLatencyMs ?? null,
    worstDayOfWeek: worstDay,
    worstHourOfDay: worstHour,
    bestTimeSlot: bestSlot,
    patterns: patterns.map((p) => ({
      dayOfWeek: p.dayOfWeek,
      hourOfDay: p.hourOfDay,
      failureRate: p.failureRate,
      sampleSize: p.sampleSize,
    })),
  }
}

/**
 * Get patterns for all sources.
 */
export async function getAllSourcePatterns(): Promise<SourcePatternAnalysis[]> {
  // Get distinct source slugs
  const sources = await dbReg.sourceHealthPattern.groupBy({
    by: ["sourceSlug"],
  })

  const analyses: SourcePatternAnalysis[] = []
  for (const source of sources) {
    const analysis = await analyzeSourcePatterns(source.sourceSlug)
    analyses.push(analysis)
  }

  // Sort by failure rate (highest first)
  return analyses.sort((a, b) => b.overallFailureRate - a.overallFailureRate)
}

/**
 * Clean up old pattern data with low sample counts.
 * Keeps only patterns with meaningful data.
 */
export async function cleanupWeakPatterns(minSamples: number = 2): Promise<number> {
  const result = await dbReg.sourceHealthPattern.deleteMany({
    where: {
      sampleSize: { lt: minSamples },
      lastUpdated: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Older than 30 days
      },
    },
  })

  if (result.count > 0) {
    console.log(`[source-patterns] Cleaned up ${result.count} weak pattern records`)
  }

  return result.count
}

/**
 * Get sources with concerning failure patterns.
 */
export async function getProblematicSources(): Promise<SourcePatternAnalysis[]> {
  const allPatterns = await getAllSourcePatterns()

  return allPatterns.filter(
    (p) =>
      p.totalSamples >= MIN_SAMPLES_FOR_PATTERN * 3 && // Enough data
      p.overallFailureRate >= HIGH_FAILURE_RATE_THRESHOLD
  )
}

/**
 * Calculate optimal retry delay based on historical latency.
 */
export async function getAdaptiveRetryDelay(
  sourceSlug: string,
  baseDelayMs: number
): Promise<number> {
  const overall = await dbReg.sourceHealthPattern.findUnique({
    where: {
      sourceSlug_dayOfWeek_hourOfDay: {
        sourceSlug,
        dayOfWeek: null,
        hourOfDay: null,
      },
    },
  })

  if (!overall || !overall.avgLatencyMs) {
    return baseDelayMs
  }

  // Scale retry delay based on typical latency
  // If source is typically slow, wait longer before retrying
  const latencyMultiplier = Math.max(1, overall.avgLatencyMs / 1000) // Scale from 1s baseline

  // Also consider failure rate - higher failure means longer waits
  const failureMultiplier = 1 + overall.failureRate // 1.0 to 2.0

  return Math.min(
    baseDelayMs * latencyMultiplier * failureMultiplier,
    baseDelayMs * 5 // Cap at 5x base delay
  )
}
