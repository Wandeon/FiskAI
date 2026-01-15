// src/lib/regulatory-truth/utils/confidence-calibrator.db.ts
//
// Task 4.3: Confidence Calibration - Database Operations
// Persists and loads Platt scaling parameters from the database.
// Collects review outcomes from HumanReviewQueue for calibration.

// eslint-disable-next-line no-restricted-imports -- Need db for HumanReviewQueue (main schema)
import { db, dbReg } from "@/lib/db"
import {
  type CalibrationParameters,
  type ReviewOutcome,
  collectCalibrationData,
  buildCalibrationCurve,
} from "./confidence-calibrator"

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
      resolution: { not: null },
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
 * Refresh calibration parameters from recent review data.
 *
 * This function should be called periodically (e.g., weekly) to update
 * the calibration curve based on new human review outcomes.
 *
 * @param since - Only collect reviews after this date (default: 6 months ago)
 * @returns The new calibration parameters, or null if insufficient data
 */
export async function refreshCalibrationParameters(
  since?: Date
): Promise<CalibrationParameters | null> {
  // Collect review outcomes from database
  const outcomes = await collectReviewOutcomesFromDB(since)

  if (outcomes.length === 0) {
    console.log("[confidence-calibrator] No review outcomes found, skipping refresh")
    return null
  }

  // Build calibration data points
  const dataPoints = collectCalibrationData(outcomes)

  // Build calibration curve
  const params = buildCalibrationCurve(dataPoints)

  if (!params) {
    console.log(
      `[confidence-calibrator] Insufficient data for calibration (${outcomes.length} reviews)`
    )
    return null
  }

  // Save to database
  await saveCalibrationParameters(params)

  console.log(
    `[confidence-calibrator] Calibration refreshed with ${params.sampleSize} reviews: ` +
      `A=${params.paramA.toFixed(4)}, B=${params.paramB.toFixed(4)}`
  )

  return params
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
