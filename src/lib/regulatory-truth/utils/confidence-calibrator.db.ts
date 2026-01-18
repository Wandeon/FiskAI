// src/lib/regulatory-truth/utils/confidence-calibrator.db.ts
//
// Task 4.3: Confidence Calibration - Database Operations
// Persists and loads Platt scaling parameters from the database.
// Collects review outcomes from multiple sources for calibration:
// - Human reviews (HumanReviewQueue)
// - Publication success/failure (RegulatoryRule status)
// - Provenance validation pass/fail (ExtractionRejected)
// - User feedback sentiment (RuleFeedback)
//
// RTL Self-Improvement: Confidence Auto-Calibration (Priority 2B)

// eslint-disable-next-line no-restricted-imports -- Need db for HumanReviewQueue (main schema)
import { db, dbReg } from "@/lib/db"
import { Prisma } from "@prisma/client"
import {
  type CalibrationParameters,
  type ReviewOutcome,
  collectCalibrationData,
  buildCalibrationCurve,
} from "./confidence-calibrator"

/**
 * Weight factors for different outcome sources.
 * More recent and direct signals get higher weight.
 */
const OUTCOME_WEIGHTS = {
  humanReview: 1.0, // Gold standard
  publication: 0.8, // Published = success, strong signal
  userFeedback: 0.9, // Direct user signal, very valuable
  provenanceValidation: 0.6, // Quote validation failures
} as const

/**
 * Extended outcome with source and weight
 */
interface WeightedOutcome extends ReviewOutcome {
  source: keyof typeof OUTCOME_WEIGHTS
  weight: number
  timestamp: Date
}

/**
 * Save calibration parameters to the database.
 *
 * @param params - Calibration parameters to save
 * @returns The saved record ID
 */
export async function saveCalibrationParameters(params: CalibrationParameters): Promise<string> {
  const record = await dbReg.confidenceCalibration.create({
    data: {
      paramA: params.paramA,
      paramB: params.paramB,
      sampleSize: params.sampleSize,
      computedAt: params.computedAt,
    },
  })

  return record.id
}

/**
 * Load the most recent calibration parameters from the database.
 *
 * @returns Calibration parameters, or null if none exist
 */
export async function loadLatestCalibrationParameters(): Promise<CalibrationParameters | null> {
  const record = await dbReg.confidenceCalibration.findFirst({
    orderBy: { computedAt: "desc" },
  })

  if (!record) {
    return null
  }

  return {
    paramA: record.paramA,
    paramB: record.paramB,
    sampleSize: record.sampleSize,
    computedAt: record.computedAt,
  }
}

/**
 * Collect review outcomes from the HumanReviewQueue for calibration.
 *
 * Looks for completed reviews of regulatory rules that have resolution data
 * containing confidence scores and approval status.
 *
 * @param since - Only collect reviews after this date (default: 6 months ago)
 * @returns Array of review outcomes
 */
export async function collectReviewOutcomesFromDB(since?: Date): Promise<ReviewOutcome[]> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 6) // 6 months of data

  // Note: HumanReviewQueue is in the main schema, not regulatory
  const reviews = await db.humanReviewQueue.findMany({
    where: {
      entityType: { in: ["RULE", "RULE_FACT"] },
      status: "COMPLETED",
      completedAt: { gte: since ?? defaultSince },
      resolution: { not: Prisma.JsonNull },
    },
    select: {
      resolution: true,
    },
  })

  const outcomes: ReviewOutcome[] = []

  for (const review of reviews) {
    // Resolution JSON structure: { approved: boolean, rawConfidence?: number }
    const resolution = review.resolution as Record<string, unknown> | null
    if (!resolution) continue

    const rawConfidence = resolution.rawConfidence as number | undefined
    const approved = resolution.approved as boolean | undefined

    // Skip if missing required fields
    if (typeof rawConfidence !== "number" || typeof approved !== "boolean") {
      continue
    }

    outcomes.push({
      rawConfidence,
      wasApproved: approved,
    })
  }

  return outcomes
}

/**
 * Collect publication outcomes from RegulatoryRule status transitions.
 * PUBLISHED = success, REJECTED = failure
 *
 * @param since - Only collect outcomes after this date
 * @returns Array of weighted outcomes
 */
export async function collectPublicationOutcomes(since?: Date): Promise<WeightedOutcome[]> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 6)

  const cutoff = since ?? defaultSince
  const outcomes: WeightedOutcome[] = []

  // Get published rules (success)
  const publishedRules = await db.regulatoryRule.findMany({
    where: {
      status: "PUBLISHED",
      updatedAt: { gte: cutoff },
      // Must have a confidence value
      confidence: { not: null },
    },
    select: {
      confidence: true,
      updatedAt: true,
    },
  })

  for (const rule of publishedRules) {
    outcomes.push({
      rawConfidence: rule.confidence ?? 0.5,
      wasApproved: true,
      source: "publication",
      weight: OUTCOME_WEIGHTS.publication,
      timestamp: rule.updatedAt,
    })
  }

  // Get rejected rules (failure)
  const rejectedRules = await db.regulatoryRule.findMany({
    where: {
      status: "REJECTED",
      updatedAt: { gte: cutoff },
      confidence: { not: null },
    },
    select: {
      confidence: true,
      updatedAt: true,
    },
  })

  for (const rule of rejectedRules) {
    outcomes.push({
      rawConfidence: rule.confidence ?? 0.5,
      wasApproved: false,
      source: "publication",
      weight: OUTCOME_WEIGHTS.publication,
      timestamp: rule.updatedAt,
    })
  }

  return outcomes
}

/**
 * Collect user feedback outcomes from RuleFeedback.
 * positive = success, negative = failure
 *
 * @param since - Only collect feedback after this date
 * @returns Array of weighted outcomes
 */
export async function collectUserFeedbackOutcomes(since?: Date): Promise<WeightedOutcome[]> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 6)

  const cutoff = since ?? defaultSince
  const outcomes: WeightedOutcome[] = []

  // Get feedback with associated rule confidence
  const feedbacks = await dbReg.ruleFeedback.findMany({
    where: {
      createdAt: { gte: cutoff },
      sentiment: { in: ["positive", "negative"] },
    },
    select: {
      ruleId: true,
      sentiment: true,
      createdAt: true,
    },
  })

  // Look up rule confidence for each feedback
  for (const feedback of feedbacks) {
    // Try to find the rule in RegulatoryRule (main schema)
    const rule = await db.regulatoryRule.findUnique({
      where: { id: feedback.ruleId },
      select: { confidence: true },
    })

    if (rule?.confidence != null) {
      outcomes.push({
        rawConfidence: rule.confidence,
        wasApproved: feedback.sentiment === "positive",
        source: "userFeedback",
        weight: OUTCOME_WEIGHTS.userFeedback,
        timestamp: feedback.createdAt,
      })
    }
  }

  return outcomes
}

/**
 * Collect provenance validation outcomes from ExtractionRejected.
 * Quote validation failures are negative outcomes.
 *
 * @param since - Only collect outcomes after this date
 * @returns Array of weighted outcomes
 */
export async function collectProvenanceValidationOutcomes(
  since?: Date
): Promise<WeightedOutcome[]> {
  const defaultSince = new Date()
  defaultSince.setMonth(defaultSince.getMonth() - 6)

  const cutoff = since ?? defaultSince
  const outcomes: WeightedOutcome[] = []

  // Get quote validation failures
  const rejections = await dbReg.extractionRejected.findMany({
    where: {
      rejectionType: { in: ["QUOTE_NOT_IN_EVIDENCE", "NO_QUOTE_MATCH"] },
      createdAt: { gte: cutoff },
    },
    select: {
      rawOutput: true,
      createdAt: true,
    },
  })

  for (const rejection of rejections) {
    // Extract confidence from rawOutput if available
    const rawOutput = rejection.rawOutput as Record<string, unknown> | null
    let confidence: number | null = null

    if (rawOutput) {
      // Try different confidence field locations
      if (typeof rawOutput.confidence === "number") {
        confidence = rawOutput.confidence
      } else if (
        Array.isArray(rawOutput.extractions) &&
        rawOutput.extractions[0] &&
        typeof (rawOutput.extractions[0] as Record<string, unknown>).confidence === "number"
      ) {
        confidence = (rawOutput.extractions[0] as Record<string, unknown>).confidence as number
      }
    }

    if (confidence != null) {
      outcomes.push({
        rawConfidence: confidence,
        wasApproved: false, // Failed validation = negative outcome
        source: "provenanceValidation",
        weight: OUTCOME_WEIGHTS.provenanceValidation,
        timestamp: rejection.createdAt,
      })
    }
  }

  return outcomes
}

/**
 * Collect outcomes from all sources with time-based weighting.
 * More recent outcomes get higher effective weight.
 *
 * @param since - Only collect outcomes after this date
 * @returns Combined array of review outcomes
 */
export async function collectAllOutcomes(since?: Date): Promise<ReviewOutcome[]> {
  const [humanReviews, publications, userFeedback, provenanceValidation] = await Promise.all([
    collectReviewOutcomesFromDB(since),
    collectPublicationOutcomes(since),
    collectUserFeedbackOutcomes(since),
    collectProvenanceValidationOutcomes(since),
  ])

  // Convert human reviews to weighted format
  const weightedHumanReviews: WeightedOutcome[] = humanReviews.map((r) => ({
    ...r,
    source: "humanReview" as const,
    weight: OUTCOME_WEIGHTS.humanReview,
    timestamp: new Date(), // Human reviews don't have timestamp in current implementation
  }))

  // Combine all outcomes
  const allOutcomes: WeightedOutcome[] = [
    ...weightedHumanReviews,
    ...publications,
    ...userFeedback,
    ...provenanceValidation,
  ]

  // Apply time-based decay: outcomes from last 30 days get full weight,
  // older outcomes get exponentially decayed weight
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  // For calibration, we return standard ReviewOutcome format
  // Weight is applied by duplicating samples (weighted sampling approximation)
  const weightedSamples: ReviewOutcome[] = []

  for (const outcome of allOutcomes) {
    const ageMs = now - outcome.timestamp.getTime()
    const timeFactor = Math.exp(-ageMs / (2 * thirtyDaysMs)) // Half-life of ~60 days

    // Effective weight combines source weight and time decay
    const effectiveWeight = outcome.weight * timeFactor

    // Add sample if weight is significant (>0.3)
    if (effectiveWeight > 0.3) {
      weightedSamples.push({
        rawConfidence: outcome.rawConfidence,
        wasApproved: outcome.wasApproved,
      })
    }

    // For high-weight samples, add a second copy (weighted sampling)
    if (effectiveWeight > 0.7) {
      weightedSamples.push({
        rawConfidence: outcome.rawConfidence,
        wasApproved: outcome.wasApproved,
      })
    }
  }

  return weightedSamples
}

/**
 * Refresh calibration parameters from recent review data.
 *
 * This function should be called periodically (e.g., weekly) to update
 * the calibration curve based on new human review outcomes.
 *
 * @param since - Only collect reviews after this date (default: 6 months ago)
 * @param useAllSources - Whether to use all outcome sources (default: true)
 * @returns The new calibration parameters, or null if insufficient data
 */
export async function refreshCalibrationParameters(
  since?: Date,
  useAllSources: boolean = true
): Promise<CalibrationParameters | null> {
  // Collect outcomes from all sources or just human reviews
  const outcomes = useAllSources
    ? await collectAllOutcomes(since)
    : await collectReviewOutcomesFromDB(since)

  if (outcomes.length === 0) {
    console.log("[confidence-calibrator] No outcomes found, skipping refresh")
    return null
  }

  // Build calibration data points
  const dataPoints = collectCalibrationData(outcomes)

  // Build calibration curve
  const params = buildCalibrationCurve(dataPoints)

  if (!params) {
    console.log(
      `[confidence-calibrator] Insufficient data for calibration (${outcomes.length} outcomes)`
    )
    return null
  }

  // Save to database
  await saveCalibrationParameters(params)

  const sourceLabel = useAllSources ? "outcomes (all sources)" : "human reviews"
  console.log(
    `[confidence-calibrator] Calibration refreshed with ${params.sampleSize} ${sourceLabel}: ` +
      `A=${params.paramA.toFixed(4)}, B=${params.paramB.toFixed(4)}`
  )

  return params
}

/**
 * Get statistics about outcome sources for monitoring.
 *
 * @param since - Only count outcomes after this date
 * @returns Breakdown of outcomes by source
 */
export async function getOutcomeSourceStatistics(since?: Date): Promise<{
  humanReviews: number
  publications: number
  userFeedback: number
  provenanceValidation: number
  total: number
}> {
  const [humanReviews, publications, userFeedback, provenanceValidation] = await Promise.all([
    collectReviewOutcomesFromDB(since),
    collectPublicationOutcomes(since),
    collectUserFeedbackOutcomes(since),
    collectProvenanceValidationOutcomes(since),
  ])

  return {
    humanReviews: humanReviews.length,
    publications: publications.length,
    userFeedback: userFeedback.length,
    provenanceValidation: provenanceValidation.length,
    total:
      humanReviews.length + publications.length + userFeedback.length + provenanceValidation.length,
  }
}

/**
 * Clean up old calibration records.
 *
 * Keeps only the most recent N records (default: 90 days worth).
 *
 * @param keepDays - Number of days to keep (default: 90)
 * @returns Number of records deleted
 */
export async function cleanupOldCalibrationRecords(keepDays: number = 90): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)

  const result = await dbReg.confidenceCalibration.deleteMany({
    where: {
      computedAt: { lt: cutoff },
    },
  })

  if (result.count > 0) {
    console.log(`[confidence-calibrator] Deleted ${result.count} old calibration records`)
  }

  return result.count
}
