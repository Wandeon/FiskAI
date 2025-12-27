// src/lib/assistant/reasoning/__tests__/metrics.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { ReasoningMetrics, createMetricsCollector, getMetrics } from "../metrics"

describe("ReasoningMetrics", () => {
  let metrics: ReasoningMetrics

  beforeEach(() => {
    metrics = createMetricsCollector()
  })

  describe("recordRequest", () => {
    it("increments request count", () => {
      metrics.recordRequest("req_1", "APP", "T1")
      metrics.recordRequest("req_2", "APP", "T1")

      const stats = metrics.getStats()
      expect(stats.totalRequests).toBe(2)
    })

    it("tracks by risk tier", () => {
      metrics.recordRequest("req_1", "APP", "T0")
      metrics.recordRequest("req_2", "APP", "T1")
      metrics.recordRequest("req_3", "APP", "T1")

      const stats = metrics.getStats()
      expect(stats.byRiskTier.T0).toBe(1)
      expect(stats.byRiskTier.T1).toBe(2)
    })

    it("tracks by surface", () => {
      metrics.recordRequest("req_1", "APP", "T0")
      metrics.recordRequest("req_2", "MARKETING", "T1")
      metrics.recordRequest("req_3", "APP", "T1")

      const stats = metrics.getStats()
      expect(stats.bySurface.APP).toBe(2)
      expect(stats.bySurface.MARKETING).toBe(1)
    })
  })

  describe("recordOutcome", () => {
    it("tracks outcome distribution", () => {
      metrics.recordOutcome("req_1", "ANSWER", 1500)
      metrics.recordOutcome("req_2", "REFUSAL", 500)
      metrics.recordOutcome("req_3", "ANSWER", 2000)

      const stats = metrics.getStats()
      expect(stats.outcomes.ANSWER).toBe(2)
      expect(stats.outcomes.REFUSAL).toBe(1)
    })

    it("tracks average duration", () => {
      metrics.recordOutcome("req_1", "ANSWER", 1000)
      metrics.recordOutcome("req_2", "ANSWER", 2000)

      const stats = metrics.getStats()
      expect(stats.avgDurationMs).toBe(1500)
    })

    it("returns zero average duration when no outcomes recorded", () => {
      const stats = metrics.getStats()
      expect(stats.avgDurationMs).toBe(0)
    })
  })

  describe("recordSafetyViolation", () => {
    it("increments violation count", () => {
      metrics.recordSafetyViolation("req_1", "MISSING_CITATIONS")
      metrics.recordSafetyViolation("req_2", "MISSING_AS_OF_DATE")

      const stats = metrics.getStats()
      expect(stats.safetyViolations).toBe(2)
    })

    it("tracks violation types", () => {
      metrics.recordSafetyViolation("req_1", "MISSING_CITATIONS")
      metrics.recordSafetyViolation("req_2", "MISSING_CITATIONS")
      metrics.recordSafetyViolation("req_3", "MISSING_AS_OF_DATE")

      const stats = metrics.getStats()
      expect(stats.violationsByType?.MISSING_CITATIONS).toBe(2)
      expect(stats.violationsByType?.MISSING_AS_OF_DATE).toBe(1)
    })
  })

  describe("recordClarification", () => {
    it("increments clarification count", () => {
      metrics.recordRequest("req_1", "APP", "T1")
      metrics.recordRequest("req_2", "APP", "T1")
      metrics.recordClarification("req_1")

      const stats = metrics.getStats()
      expect(stats.clarificationRate).toBe(0.5)
    })

    it("returns zero rate when no requests", () => {
      metrics.recordClarification("req_1")

      const stats = metrics.getStats()
      expect(stats.clarificationRate).toBe(0)
    })
  })

  describe("recordDispute", () => {
    it("tracks disputes", () => {
      metrics.recordOutcome("req_1", "ANSWER", 1000)
      metrics.recordOutcome("req_2", "ANSWER", 1000)
      metrics.recordDispute("req_1", 0.95)

      const stats = metrics.getStats()
      expect(stats.disputeRate).toBe(0.5)
    })

    it("tracks high confidence disputes separately", () => {
      metrics.recordOutcome("req_1", "ANSWER", 1000)
      metrics.recordOutcome("req_2", "ANSWER", 1000)
      metrics.recordOutcome("req_3", "CONDITIONAL_ANSWER", 1000)
      metrics.recordDispute("req_1", 0.95) // High confidence
      metrics.recordDispute("req_2", 0.7) // Low confidence

      const stats = metrics.getStats()
      // High confidence disputes / answers = 1/3
      expect(stats.highConfidenceDisputeRate).toBeCloseTo(1 / 3, 5)
    })

    it("returns zero rate when no outcomes", () => {
      metrics.recordDispute("req_1", 0.95)

      const stats = metrics.getStats()
      expect(stats.disputeRate).toBe(0)
    })
  })

  describe("getStats", () => {
    it("returns all metrics", () => {
      const stats = metrics.getStats()

      expect(stats).toHaveProperty("totalRequests")
      expect(stats).toHaveProperty("outcomes")
      expect(stats).toHaveProperty("byRiskTier")
      expect(stats).toHaveProperty("bySurface")
      expect(stats).toHaveProperty("avgDurationMs")
      expect(stats).toHaveProperty("safetyViolations")
      expect(stats).toHaveProperty("clarificationRate")
      expect(stats).toHaveProperty("disputeRate")
      expect(stats).toHaveProperty("highConfidenceDisputeRate")
    })

    it("initializes all outcomes to zero", () => {
      const stats = metrics.getStats()

      expect(stats.outcomes.ANSWER).toBe(0)
      expect(stats.outcomes.CONDITIONAL_ANSWER).toBe(0)
      expect(stats.outcomes.REFUSAL).toBe(0)
      expect(stats.outcomes.ERROR).toBe(0)
    })

    it("initializes all risk tiers to zero", () => {
      const stats = metrics.getStats()

      expect(stats.byRiskTier.T0).toBe(0)
      expect(stats.byRiskTier.T1).toBe(0)
      expect(stats.byRiskTier.T2).toBe(0)
      expect(stats.byRiskTier.T3).toBe(0)
    })
  })

  describe("reset", () => {
    it("clears all metrics", () => {
      metrics.recordRequest("req_1", "APP", "T1")
      metrics.recordOutcome("req_1", "ANSWER", 1000)
      metrics.recordSafetyViolation("req_1", "MISSING_CITATIONS")
      metrics.recordClarification("req_1")
      metrics.recordDispute("req_1", 0.95)

      metrics.reset()

      const stats = metrics.getStats()
      expect(stats.totalRequests).toBe(0)
      expect(stats.safetyViolations).toBe(0)
      expect(stats.avgDurationMs).toBe(0)
    })
  })
})

describe("getMetrics singleton", () => {
  it("returns the same instance on multiple calls", () => {
    const instance1 = getMetrics()
    const instance2 = getMetrics()

    expect(instance1).toBe(instance2)
  })
})
