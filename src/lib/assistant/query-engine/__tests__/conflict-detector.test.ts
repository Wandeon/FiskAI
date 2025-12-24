// src/lib/assistant/query-engine/__tests__/conflict-detector.test.ts
import { describe, it, expect } from "vitest"
import { detectConflicts, type ConflictResult } from "../conflict-detector"
import type { RuleCandidate } from "../rule-selector"

const baseRule: Partial<RuleCandidate> = {
  conceptSlug: "test-concept",
  authorityLevel: "LAW",
  status: "PUBLISHED",
  effectiveFrom: new Date("2024-01-01"),
  effectiveUntil: null,
  confidence: 0.9,
  sourcePointers: [],
}

describe("detectConflicts", () => {
  it("returns no conflict for single rule", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(false)
    expect(result.conflictingRules).toEqual([])
  })

  it("returns no conflict when rules have same value", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage" },
      { ...baseRule, id: "r2", value: "25", valueType: "percentage" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(false)
  })

  it("detects conflict when rules have different values for same concept", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", conceptSlug: "pdv-stopa" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", conceptSlug: "pdv-stopa" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.conflictingRules).toHaveLength(2)
  })

  it("prefers higher authority when resolving conflicts", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", authorityLevel: "LAW" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", authorityLevel: "GUIDANCE" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.canResolve).toBe(true)
    expect(result.winningRuleId).toBe("r1")
  })

  it("cannot resolve conflict between same authority level", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", authorityLevel: "LAW" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", authorityLevel: "LAW" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.canResolve).toBe(false)
    expect(result.winningRuleId).toBeUndefined()
  })

  it("groups conflicts by concept", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", conceptSlug: "pdv-stopa" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", conceptSlug: "pdv-stopa" },
      { ...baseRule, id: "r3", value: "100", valueType: "currency", conceptSlug: "other-concept" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.conflictingRules.map((r) => r.id)).toContain("r1")
    expect(result.conflictingRules.map((r) => r.id)).toContain("r2")
    expect(result.conflictingRules.map((r) => r.id)).not.toContain("r3")
  })
})
