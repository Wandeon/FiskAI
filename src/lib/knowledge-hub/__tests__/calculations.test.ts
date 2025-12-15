// src/lib/knowledge-hub/__tests__/calculations.test.ts
import { describe, it } from "node:test"
import assert from "node:assert"
import {
  calculatePausalMonthlyCosts,
  calculatePausalAnnualCosts,
  calculateContributions,
  calculateTZContribution,
} from "../calculations"

describe("Knowledge Hub Calculations", () => {
  describe("calculatePausalMonthlyCosts", () => {
    it("should calculate monthly costs for 25000 EUR annual revenue", () => {
      const result = calculatePausalMonthlyCosts(25000)
      assert.strictEqual(result.contributions, 262.51)
      assert.strictEqual(result.hok, 11.4)
      // quarterlyTax / 3 = 137.70 / 3 = 45.90
      assert.strictEqual(result.tax, 45.9)
    })
  })

  describe("calculatePausalAnnualCosts", () => {
    it("should calculate annual costs for 25000 EUR revenue", () => {
      const result = calculatePausalAnnualCosts(25000)
      assert.strictEqual(result.contributions, 3150.12) // 262.51 * 12
      assert.strictEqual(result.hok, 136.8) // 34.20 * 4
      assert.strictEqual(result.tax, 550.8) // bracket 4
      assert.strictEqual(result.total, 3837.72)
    })
  })

  describe("calculateContributions", () => {
    it("should break down monthly contributions", () => {
      const result = calculateContributions()
      assert.strictEqual(result.mioI, 107.88)
      assert.strictEqual(result.mioII, 35.96)
      assert.strictEqual(result.hzzo, 118.67)
      assert.strictEqual(result.total, 262.51)
    })
  })

  describe("calculateTZContribution", () => {
    it("should calculate TZ for group 3 (services) at 50000 EUR", () => {
      const result = calculateTZContribution(50000, "GROUP_3")
      // 50000 * 0.0008527 = 42.635
      assert.ok(result >= 42 && result <= 43)
    })
  })
})
