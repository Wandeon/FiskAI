// src/lib/regulatory-truth/__tests__/rtl2-guards.test.ts
// Unit tests for RTL2 lineage guards
import { describe, it } from "node:test"
import assert from "node:assert"
import {
  hasRTL2Lineage,
  assertRTL2Rule,
  isPostCutover,
  RTL2_CUTOVER_TIMESTAMP,
} from "../utils/rtl2-guards"

describe("rtl2-guards", () => {
  describe("hasRTL2Lineage", () => {
    it("returns true when rule has CandidateFact lineage", () => {
      const rule = {
        originatingCandidateFactIds: ["cf-123"],
        originatingAgentRunIds: [],
      }
      assert.strictEqual(hasRTL2Lineage(rule), true)
    })

    it("returns true when rule has AgentRun lineage", () => {
      const rule = {
        originatingCandidateFactIds: [],
        originatingAgentRunIds: ["ar-456"],
      }
      assert.strictEqual(hasRTL2Lineage(rule), true)
    })

    it("returns true when rule has both lineage types", () => {
      const rule = {
        originatingCandidateFactIds: ["cf-123"],
        originatingAgentRunIds: ["ar-456"],
      }
      assert.strictEqual(hasRTL2Lineage(rule), true)
    })

    it("returns false when rule has empty lineage arrays", () => {
      const rule = {
        originatingCandidateFactIds: [],
        originatingAgentRunIds: [],
      }
      assert.strictEqual(hasRTL2Lineage(rule), false)
    })

    it("returns false when rule has null lineage arrays", () => {
      const rule = {
        originatingCandidateFactIds: null,
        originatingAgentRunIds: null,
      }
      assert.strictEqual(hasRTL2Lineage(rule), false)
    })

    it("returns false when rule has undefined lineage arrays", () => {
      const rule = {
        originatingCandidateFactIds: undefined,
        originatingAgentRunIds: undefined,
      }
      assert.strictEqual(hasRTL2Lineage(rule), false)
    })

    it("returns false for legacy rule pattern (empty arrays)", () => {
      // This is the exact pattern that caused the collision
      const legacyRule = {
        originatingCandidateFactIds: [],
        originatingAgentRunIds: [],
      }
      assert.strictEqual(hasRTL2Lineage(legacyRule), false)
    })
  })

  describe("assertRTL2Rule", () => {
    it("does not throw for RTL2-valid rule", () => {
      const rule = {
        id: "rule-123",
        originatingCandidateFactIds: ["cf-123"],
        originatingAgentRunIds: ["ar-456"],
      }
      assert.doesNotThrow(() => assertRTL2Rule(rule, "test"))
    })

    it("throws for legacy rule without lineage", () => {
      const legacyRule = {
        id: "rule-legacy",
        originatingCandidateFactIds: [],
        originatingAgentRunIds: [],
      }
      assert.throws(
        () => assertRTL2Rule(legacyRule, "test-context"),
        /RTL2_GUARD.*lacks RTL2 lineage.*test-context/
      )
    })

    it("includes rule ID in error message", () => {
      const legacyRule = {
        id: "specific-rule-id",
        originatingCandidateFactIds: [],
        originatingAgentRunIds: [],
      }
      assert.throws(() => assertRTL2Rule(legacyRule, "test"), /specific-rule-id/)
    })
  })

  describe("isPostCutover", () => {
    it("returns true for dates after cutover", () => {
      const afterCutover = new Date("2026-01-21T00:00:00Z")
      assert.strictEqual(isPostCutover(afterCutover), true)
    })

    it("returns true for dates at exactly cutover timestamp", () => {
      assert.strictEqual(isPostCutover(RTL2_CUTOVER_TIMESTAMP), true)
    })

    it("returns false for dates before cutover", () => {
      const beforeCutover = new Date("2026-01-16T15:14:46Z")
      assert.strictEqual(isPostCutover(beforeCutover), false)
    })
  })

  describe("regression: legacy rule collision prevention", () => {
    it("legacy rule cmkh0ryba005101o70ycps642 pattern is detected", () => {
      // This is the actual pattern from the collision we found:
      // - Created 2026-01-16 (before cutover)
      // - Empty lineage arrays
      // - Was incorrectly merged with RTL2 data
      const collisionRule = {
        id: "cmkh0ryba005101o70ycps642",
        originatingCandidateFactIds: [],
        originatingAgentRunIds: [],
        createdAt: new Date("2026-01-16T15:14:46.004Z"),
      }

      // Must be detected as NOT having RTL2 lineage
      assert.strictEqual(hasRTL2Lineage(collisionRule), false)

      // Must be detected as created before cutover
      assert.strictEqual(isPostCutover(collisionRule.createdAt), false)

      // Must throw if asserted as RTL2
      assert.throws(() => assertRTL2Rule(collisionRule, "merge-target"), /RTL2_GUARD/)
    })
  })
})
