// src/lib/regulatory-truth/utils/confidence-calibrator.ts
//
// Task 4.3: Confidence Calibration
// Implements Platt scaling to calibrate LLM confidence scores based on
// historical human review outcomes.
//
// Problem: LLM confidence scores are uncalibrated (0.9 doesn't mean 90% accurate)
// Solution: Build calibration curves from human review outcomes, apply Platt scaling
//
// Platt Scaling: P(y=1|x) = 1 / (1 + exp(A*x + B))
// Where A and B are learned from historical data, x is raw confidence

/**
 * Minimum number of reviews required before calibration is applied.
 * Below this threshold, raw confidence is returned unchanged.
 */
export const MINIMUM_SAMPLE_SIZE = 50

/**
 * Bucket size for grouping confidence scores (10% buckets: 0-10%, 10-20%, etc.)
 */
const BUCKET_SIZE = 0.1

/**
 * A single human review outcome used for calibration.
 */
export interface ReviewOutcome {
  rawConfidence: number
  wasApproved: boolean
}

/**
 * Aggregated calibration data for a confidence bucket.
 */
export interface CalibrationDataPoint {
  /** Midpoint of the bucket (e.g., 0.85 for 80-90% bucket) */
  bucketMidpoint: number
  /** Actual approval rate (accuracy) for this bucket */
  actualAccuracy: number
  /** Total number of reviews in this bucket */
  totalCount: number
  /** Number of approved reviews in this bucket */
  approvedCount: number
}

/**
 * Learned Platt scaling parameters.
 */
export interface CalibrationParameters {
  /** Platt scaling parameter A (slope) */
  paramA: number
  /** Platt scaling parameter B (intercept) */
  paramB: number
  /** Number of reviews used to compute these parameters */
  sampleSize: number
  /** When these parameters were computed */
  computedAt: Date
}

/**
 * Result of confidence calibration.
 */
export interface CalibratedConfidence {
  /** Original raw confidence score */
  rawConfidence: number
  /** Calibrated confidence score */
  calibratedConfidence: number
  /** Whether calibration was applied (false if cold-start or insufficient data) */
  isCalibrated: boolean
  /** Number of reviews used for calibration */
  sampleSize: number
}

/**
 * Collect calibration data by grouping reviews into confidence buckets.
 *
 * Groups reviews into 10% buckets and calculates the actual accuracy
 * (approval rate) for each bucket.
 *
 * @param reviews - Array of human review outcomes
 * @returns Array of calibration data points, one per non-empty bucket
 */
export function collectCalibrationData(reviews: ReviewOutcome[]): CalibrationDataPoint[] {
  if (reviews.length === 0) {
    return []
  }

  // Group reviews by confidence bucket
  const buckets = new Map<
    number,
    {
      totalCount: number
      approvedCount: number
    }
  >()

  for (const review of reviews) {
    // Calculate bucket index (0-9 for 0-10%, 10-20%, ..., 90-100%)
    // Clamp to valid range
    const bucketIndex = Math.min(9, Math.floor(review.rawConfidence * 10))
    const bucketMidpoint = (bucketIndex * BUCKET_SIZE + (bucketIndex + 1) * BUCKET_SIZE) / 2

    const existing = buckets.get(bucketMidpoint) ?? { totalCount: 0, approvedCount: 0 }
    existing.totalCount++
    if (review.wasApproved) {
      existing.approvedCount++
    }
    buckets.set(bucketMidpoint, existing)
  }

  // Convert to CalibrationDataPoint array
  const result: CalibrationDataPoint[] = []
  buckets.forEach((data, bucketMidpoint) => {
    result.push({
      bucketMidpoint,
      actualAccuracy: data.approvedCount / data.totalCount,
      totalCount: data.totalCount,
      approvedCount: data.approvedCount,
    })
  })

  // Sort by bucket midpoint for consistency
  return result.sort((a, b) => a.bucketMidpoint - b.bucketMidpoint)
}

/**
 * Build calibration curve using Platt scaling.
 *
 * Fits a sigmoid function to the calibration data using weighted least squares.
 * The sigmoid maps raw confidence to calibrated confidence:
 * P(y=1|x) = 1 / (1 + exp(A*x + B))
 *
 * @param data - Aggregated calibration data from collectCalibrationData
 * @returns Calibration parameters, or null if insufficient data
 */
export function buildCalibrationCurve(data: CalibrationDataPoint[]): CalibrationParameters | null {
  // Calculate total sample size
  const sampleSize = data.reduce((sum, d) => sum + d.totalCount, 0)

  // Check minimum sample size
  if (sampleSize < MINIMUM_SAMPLE_SIZE) {
    return null
  }

  // Use Newton-Raphson or gradient descent to fit Platt scaling parameters
  // For simplicity, we use a closed-form approximation based on weighted least squares
  // on the log-odds transformation

  // Transform actual accuracy to log-odds: log(p/(1-p))
  // Fit linear regression: log(p/(1-p)) = A*x + B
  // This gives us the Platt parameters directly

  const validData = data.filter((d) => d.actualAccuracy > 0 && d.actualAccuracy < 1)

  if (validData.length < 2) {
    // Need at least 2 points for linear regression
    // Fall back to default parameters (identity-ish)
    return {
      paramA: -1.0,
      paramB: 0.0,
      sampleSize,
      computedAt: new Date(),
    }
  }

  // Weighted linear regression on log-odds
  // y = log(accuracy / (1 - accuracy))
  // x = bucketMidpoint
  // weight = totalCount

  let sumW = 0
  let sumWX = 0
  let sumWY = 0
  let sumWXX = 0
  let sumWXY = 0

  for (const d of validData) {
    // Clamp accuracy to avoid log(0) or log(inf)
    const accuracy = Math.max(0.01, Math.min(0.99, d.actualAccuracy))
    const logOdds = Math.log(accuracy / (1 - accuracy))

    const w = d.totalCount
    const x = d.bucketMidpoint

    sumW += w
    sumWX += w * x
    sumWY += w * logOdds
    sumWXX += w * x * x
    sumWXY += w * x * logOdds
  }

  // Solve weighted linear regression: y = slope * x + intercept
  // slope = (sumW * sumWXY - sumWX * sumWY) / (sumW * sumWXX - sumWX^2)
  // intercept = (sumWY - slope * sumWX) / sumW

  const denominator = sumW * sumWXX - sumWX * sumWX

  if (Math.abs(denominator) < 1e-10) {
    // Degenerate case - all points at same x
    return {
      paramA: -1.0,
      paramB: 0.0,
      sampleSize,
      computedAt: new Date(),
    }
  }

  const slope = (sumW * sumWXY - sumWX * sumWY) / denominator
  const intercept = (sumWY - slope * sumWX) / sumW

  // In Platt scaling: P = 1 / (1 + exp(A*x + B))
  // Taking log-odds: log(P/(1-P)) = -(A*x + B)
  // So if our regression gives: logOdds = slope*x + intercept
  // Then: A = -slope, B = -intercept

  return {
    paramA: -slope,
    paramB: -intercept,
    sampleSize,
    computedAt: new Date(),
  }
}

/**
 * Apply Platt scaling to a raw confidence score.
 *
 * Implements: P(y=1|x) = 1 / (1 + exp(A*x + B))
 *
 * @param rawConfidence - Raw confidence score (0 to 1)
 * @param params - Platt scaling parameters
 * @returns Calibrated confidence score (0 to 1)
 */
export function applyPlattScaling(rawConfidence: number, params: CalibrationParameters): number {
  // P(y=1|x) = 1 / (1 + exp(A*x + B))
  const exponent = params.paramA * rawConfidence + params.paramB

  // Prevent overflow for large exponents
  if (exponent > 700) {
    return 0
  }
  if (exponent < -700) {
    return 1
  }

  return 1 / (1 + Math.exp(exponent))
}

/**
 * Calibrate a confidence score using learned parameters.
 *
 * Handles cold-start gracefully: if parameters are null or sample size
 * is insufficient, returns raw confidence unchanged with isCalibrated=false.
 *
 * @param rawConfidence - Raw confidence score (0 to 1)
 * @param params - Calibration parameters (null for cold-start)
 * @returns Calibrated confidence result
 */
export function calibrateConfidence(
  rawConfidence: number,
  params: CalibrationParameters | null
): CalibratedConfidence {
  // Cold-start: no parameters available
  if (params === null) {
    return {
      rawConfidence,
      calibratedConfidence: rawConfidence,
      isCalibrated: false,
      sampleSize: 0,
    }
  }

  // Insufficient sample size: don't trust calibration
  if (params.sampleSize < MINIMUM_SAMPLE_SIZE) {
    return {
      rawConfidence,
      calibratedConfidence: rawConfidence,
      isCalibrated: false,
      sampleSize: params.sampleSize,
    }
  }

  // Apply Platt scaling
  const calibrated = applyPlattScaling(rawConfidence, params)

  // Clamp to valid range [0, 1]
  const clampedCalibrated = Math.max(0, Math.min(1, calibrated))

  return {
    rawConfidence,
    calibratedConfidence: clampedCalibrated,
    isCalibrated: true,
    sampleSize: params.sampleSize,
  }
}

/**
 * Get confidence bucket for a given raw confidence.
 *
 * @param rawConfidence - Raw confidence score (0 to 1)
 * @returns Bucket midpoint (e.g., 0.85 for 80-90% bucket)
 */
export function getConfidenceBucket(rawConfidence: number): number {
  const bucketIndex = Math.min(9, Math.floor(rawConfidence * 10))
  return (bucketIndex * BUCKET_SIZE + (bucketIndex + 1) * BUCKET_SIZE) / 2
}
