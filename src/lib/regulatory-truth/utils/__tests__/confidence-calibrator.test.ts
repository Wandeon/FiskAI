// src/lib/regulatory-truth/utils/__tests__/confidence-calibrator.test.ts
//
// TDD tests for Task 4.3: Confidence Calibration
// Implements Platt scaling to calibrate LLM confidence scores based on
// historical human review outcomes.

import { describe, it, expect } from "vitest"
import {
  type CalibrationDataPoint,
  type CalibrationParameters,
  type CalibratedConfidence,
  collectCalibrationData,
  buildCalibrationCurve,
  applyPlattScaling,
  calibrateConfidence,
  MINIMUM_SAMPLE_SIZE,
} from "../confidence-calibrator"

describe("confidence-calibrator", () => {
  describe("collectCalibrationData", () => {
    it("should group reviews by confidence buckets", () => {
      // Given: Human review outcomes with various confidence scores
      // Buckets: floor(x*10) determines bucket index
      // 0.90-0.99 -> bucket 9 (midpoint 0.95)
      // 0.70-0.79 -> bucket 7 (midpoint 0.75)
      // 0.60-0.69 -> bucket 6 (midpoint 0.65)
      const reviews = [
        { rawConfidence: 0.95, wasApproved: true },
        { rawConfidence: 0.92, wasApproved: true },
        { rawConfidence: 0.91, wasApproved: false }, // In 90-100% bucket
        { rawConfidence: 0.75, wasApproved: true },
        { rawConfidence: 0.72, wasApproved: false },
        { rawConfidence: 0.65, wasApproved: false },
      ]

      const data = collectCalibrationData(reviews)

      // Expect: Data grouped into buckets (0.9-1.0, 0.7-0.8, 0.6-0.7)
      expect(data.length).toBeGreaterThan(0)

      // 90-100% bucket should have 2 approved, 1 rejected = 66.7% accuracy
      const bucket90 = data.find((d) => d.bucketMidpoint === 0.95)
      expect(bucket90).toBeDefined()
      expect(bucket90!.totalCount).toBe(3)
      expect(bucket90!.approvedCount).toBe(2)
      expect(bucket90!.actualAccuracy).toBeCloseTo(2 / 3, 2)

      // 70-80% bucket should have 1 approved, 1 rejected = 50% accuracy
      const bucket70 = data.find((d) => d.bucketMidpoint === 0.75)
      expect(bucket70).toBeDefined()
      expect(bucket70!.totalCount).toBe(2)
      expect(bucket70!.actualAccuracy).toBeCloseTo(0.5, 2)
    })

    it("should return empty array for empty reviews", () => {
      const data = collectCalibrationData([])
      expect(data).toEqual([])
    })

    it("should calculate accuracy correctly per bucket", () => {
      const reviews = [
        // All in 80-90% bucket (0.80-0.89 -> bucket index 8)
        { rawConfidence: 0.85, wasApproved: true },
        { rawConfidence: 0.82, wasApproved: true },
        { rawConfidence: 0.88, wasApproved: true },
        { rawConfidence: 0.81, wasApproved: false },
      ]

      const data = collectCalibrationData(reviews)

      // Find bucket 8 (80-90%), midpoint ~ 0.85 (allow for floating point)
      const bucket80 = data.find((d) => Math.abs(d.bucketMidpoint - 0.85) < 0.01)
      expect(bucket80).toBeDefined()
      expect(bucket80!.actualAccuracy).toBeCloseTo(0.75, 2) // 3/4
    })
  })

  describe("buildCalibrationCurve", () => {
    it("should return null when insufficient data", () => {
      // Given: Less than MINIMUM_SAMPLE_SIZE reviews
      const sparseData: CalibrationDataPoint[] = [
        { bucketMidpoint: 0.85, actualAccuracy: 0.75, totalCount: 10, approvedCount: 8 },
      ]

      // When: Total count < 50
      const result = buildCalibrationCurve(sparseData)

      // Then: Return null (insufficient data)
      expect(result).toBeNull()
    })

    it("should compute Platt scaling parameters A and B", () => {
      // Given: Well-distributed calibration data
      // This simulates a well-calibrated scenario where actual accuracy
      // is close to raw confidence (slightly overconfident)
      const data: CalibrationDataPoint[] = [
        { bucketMidpoint: 0.95, actualAccuracy: 0.85, totalCount: 20, approvedCount: 17 },
        { bucketMidpoint: 0.85, actualAccuracy: 0.78, totalCount: 25, approvedCount: 20 },
        { bucketMidpoint: 0.75, actualAccuracy: 0.7, totalCount: 30, approvedCount: 21 },
        { bucketMidpoint: 0.65, actualAccuracy: 0.58, totalCount: 20, approvedCount: 12 },
        { bucketMidpoint: 0.55, actualAccuracy: 0.48, totalCount: 15, approvedCount: 7 },
      ]

      const result = buildCalibrationCurve(data)

      // Then: Should return valid parameters
      expect(result).not.toBeNull()
      expect(result!.paramA).toBeDefined()
      expect(result!.paramB).toBeDefined()
      expect(result!.sampleSize).toBe(110) // Sum of all totalCounts
      expect(typeof result!.paramA).toBe("number")
      expect(typeof result!.paramB).toBe("number")
    })

    it("should handle perfect calibration (identity)", () => {
      // Given: Data where actual accuracy equals raw confidence
      const data: CalibrationDataPoint[] = [
        { bucketMidpoint: 0.95, actualAccuracy: 0.95, totalCount: 20, approvedCount: 19 },
        { bucketMidpoint: 0.85, actualAccuracy: 0.85, totalCount: 20, approvedCount: 17 },
        { bucketMidpoint: 0.75, actualAccuracy: 0.75, totalCount: 20, approvedCount: 15 },
        { bucketMidpoint: 0.65, actualAccuracy: 0.65, totalCount: 20, approvedCount: 13 },
      ]

      const result = buildCalibrationCurve(data)

      // Then: Parameters should approximate identity function
      // For identity: A should be close to -1, B close to 0
      // (sigmoid(-x) = 1/(1+e^x) which inverts to identity when A=-1, B=0)
      expect(result).not.toBeNull()
    })
  })

  describe("applyPlattScaling", () => {
    it("should apply sigmoid transformation with parameters", () => {
      // Given: Platt scaling parameters
      // P(y=1|x) = 1 / (1 + exp(A*x + B))
      const params: CalibrationParameters = {
        paramA: -2.0, // Negative A means higher x -> higher output
        paramB: 1.0,
        sampleSize: 100,
        computedAt: new Date(),
      }

      // When: Apply to raw confidence 0.8
      const calibrated = applyPlattScaling(0.8, params)

      // Then: Should return calibrated value between 0 and 1
      // With A=-2, B=1: sigmoid(-2*0.8 + 1) = sigmoid(-0.6) = 1/(1+e^0.6) ~ 0.65
      expect(calibrated).toBeGreaterThan(0)
      expect(calibrated).toBeLessThan(1)
      // Expected: 1/(1+exp(0.6)) ~ 0.6457
      expect(calibrated).toBeCloseTo(0.6457, 2)
    })

    it("should preserve monotonicity (higher raw -> higher calibrated)", () => {
      const params: CalibrationParameters = {
        paramA: -3.0,
        paramB: 1.5,
        sampleSize: 100,
        computedAt: new Date(),
      }

      const low = applyPlattScaling(0.3, params)
      const mid = applyPlattScaling(0.6, params)
      const high = applyPlattScaling(0.9, params)

      expect(low).toBeLessThan(mid)
      expect(mid).toBeLessThan(high)
    })

    it("should handle edge cases (0 and 1)", () => {
      const params: CalibrationParameters = {
        paramA: -2.0,
        paramB: 1.0,
        sampleSize: 100,
        computedAt: new Date(),
      }

      const calibrated0 = applyPlattScaling(0, params)
      const calibrated1 = applyPlattScaling(1, params)

      expect(calibrated0).toBeGreaterThan(0)
      expect(calibrated0).toBeLessThan(1)
      expect(calibrated1).toBeGreaterThan(0)
      expect(calibrated1).toBeLessThan(1)
    })
  })

  describe("calibrateConfidence", () => {
    it("should return calibrated confidence when parameters available", () => {
      const params: CalibrationParameters = {
        paramA: -2.5,
        paramB: 1.2,
        sampleSize: 150,
        computedAt: new Date(),
      }

      const result = calibrateConfidence(0.85, params)

      expect(result.rawConfidence).toBe(0.85)
      expect(result.calibratedConfidence).toBeDefined()
      expect(result.calibratedConfidence).not.toBe(0.85) // Should be different
      expect(result.isCalibrated).toBe(true)
      expect(result.sampleSize).toBe(150)
    })

    it("should handle cold-start (no parameters) gracefully", () => {
      // Given: No calibration parameters (cold start)
      const result = calibrateConfidence(0.85, null)

      // Then: Return raw confidence unchanged with isCalibrated=false
      expect(result.rawConfidence).toBe(0.85)
      expect(result.calibratedConfidence).toBe(0.85)
      expect(result.isCalibrated).toBe(false)
      expect(result.sampleSize).toBe(0)
    })

    it("should handle insufficient sample size", () => {
      // Given: Parameters with insufficient sample size
      const params: CalibrationParameters = {
        paramA: -2.0,
        paramB: 1.0,
        sampleSize: 30, // Below MINIMUM_SAMPLE_SIZE
        computedAt: new Date(),
      }

      const result = calibrateConfidence(0.85, params)

      // Then: Return raw confidence unchanged (not enough data to trust calibration)
      expect(result.calibratedConfidence).toBe(0.85)
      expect(result.isCalibrated).toBe(false)
    })

    it("should clamp calibrated values to [0, 1]", () => {
      // Given: Extreme parameters that could produce out-of-range values
      const params: CalibrationParameters = {
        paramA: -10.0,
        paramB: 5.0,
        sampleSize: 100,
        computedAt: new Date(),
      }

      const result = calibrateConfidence(0.99, params)

      expect(result.calibratedConfidence).toBeGreaterThanOrEqual(0)
      expect(result.calibratedConfidence).toBeLessThanOrEqual(1)
    })
  })

  describe("MINIMUM_SAMPLE_SIZE constant", () => {
    it("should be 50 as specified in requirements", () => {
      expect(MINIMUM_SAMPLE_SIZE).toBe(50)
    })
  })

  describe("integration scenarios", () => {
    it("should correct overconfident model", () => {
      // Scenario: Model is overconfident (says 90% but only 70% accurate)
      const reviews = generateReviewsWithBias(100, 0.2) // 20% overconfidence

      const data = collectCalibrationData(reviews)
      const params = buildCalibrationCurve(data)

      expect(params).not.toBeNull()

      // High raw confidence should be reduced
      const result = calibrateConfidence(0.9, params!)
      expect(result.calibratedConfidence).toBeLessThan(0.9)
    })

    it("should correct underconfident model", () => {
      // Scenario: Model is underconfident (says 70% but actually 85% accurate)
      const reviews = generateReviewsWithBias(100, -0.15) // 15% underconfidence

      const data = collectCalibrationData(reviews)
      const params = buildCalibrationCurve(data)

      expect(params).not.toBeNull()

      // Low raw confidence should be increased
      const result = calibrateConfidence(0.7, params!)
      expect(result.calibratedConfidence).toBeGreaterThan(0.7)
    })
  })
})

// Helper function to generate synthetic review data with a confidence bias
function generateReviewsWithBias(
  count: number,
  bias: number // positive = overconfident, negative = underconfident
): Array<{ rawConfidence: number; wasApproved: boolean }> {
  const reviews: Array<{ rawConfidence: number; wasApproved: boolean }> = []

  for (let i = 0; i < count; i++) {
    // Generate random confidence between 0.5 and 1.0
    const rawConfidence = 0.5 + Math.random() * 0.5

    // Actual accuracy is raw confidence minus bias
    const actualAccuracy = Math.max(0, Math.min(1, rawConfidence - bias))

    // Determine approval based on actual accuracy
    const wasApproved = Math.random() < actualAccuracy

    reviews.push({ rawConfidence, wasApproved })
  }

  return reviews
}
