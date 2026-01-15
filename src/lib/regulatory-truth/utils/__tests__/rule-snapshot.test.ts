// src/lib/regulatory-truth/utils/__tests__/rule-snapshot.test.ts
//
// Unit tests for rule snapshot and regression detection
// Task 2.2: Automated Regression Testing
//
// Tests snapshot creation, diff detection, and TTL cleanup logic.
// All tests are unit tests - no database dependencies.

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  createSnapshotData,
  computeValueHash,
  detectRuleChanges,
  isChangeExplainedBySourceUpdate,
  getSnapshotRetentionCutoff,
  type RuleSnapshotData,
  type SourceVersion,
  type RuleChangeResult,
} from "../rule-snapshot"

describe("computeValueHash", () => {
  it("should compute deterministic hash for same value", () => {
    const hash1 = computeValueHash("1000000")
    const hash2 = computeValueHash("1000000")

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA256 hex length
  })

  it("should produce different hash for different values", () => {
    const hash1 = computeValueHash("1000000")
    const hash2 = computeValueHash("2000000")

    expect(hash1).not.toBe(hash2)
  })

  it("should handle empty string", () => {
    const hash = computeValueHash("")
    expect(hash).toHaveLength(64)
  })

  it("should be case sensitive", () => {
    const hash1 = computeValueHash("TRUE")
    const hash2 = computeValueHash("true")

    expect(hash1).not.toBe(hash2)
  })

  it("should handle whitespace consistently", () => {
    const hash1 = computeValueHash("some value")
    const hash2 = computeValueHash("some value")
    const hash3 = computeValueHash("some  value")

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3) // Different whitespace = different hash
  })
})

describe("createSnapshotData", () => {
  const baseRule = {
    id: "rule-123",
    conceptSlug: "pausalni-revenue-threshold",
    value: "1000000",
    confidence: 0.92,
  }

  const baseSourceVersions: SourceVersion[] = [
    { evidenceId: "ev-1", contentHash: "hash-abc123" },
    { evidenceId: "ev-2", contentHash: "hash-def456" },
  ]

  it("should create snapshot with correct fields", () => {
    const snapshot = createSnapshotData(baseRule, baseSourceVersions)

    expect(snapshot.ruleId).toBe("rule-123")
    expect(snapshot.conceptSlug).toBe("pausalni-revenue-threshold")
    expect(snapshot.valueHash).toHaveLength(64)
    expect(snapshot.confidence).toBe(0.92)
    expect(snapshot.sourceVersions).toEqual(baseSourceVersions)
    expect(snapshot.snapshotAt).toBeInstanceOf(Date)
  })

  it("should compute valueHash from rule value", () => {
    const snapshot = createSnapshotData(baseRule, baseSourceVersions)
    const expectedHash = computeValueHash("1000000")

    expect(snapshot.valueHash).toBe(expectedHash)
  })

  it("should handle empty source versions", () => {
    const snapshot = createSnapshotData(baseRule, [])

    expect(snapshot.sourceVersions).toEqual([])
  })

  it("should capture snapshotAt timestamp", () => {
    const before = new Date()
    const snapshot = createSnapshotData(baseRule, baseSourceVersions)
    const after = new Date()

    expect(snapshot.snapshotAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(snapshot.snapshotAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it("should handle special characters in value", () => {
    const ruleWithSpecialChars = {
      ...baseRule,
      value: "25% VAT <rate>",
    }
    const snapshot = createSnapshotData(ruleWithSpecialChars, baseSourceVersions)

    expect(snapshot.valueHash).toHaveLength(64)
    expect(snapshot.valueHash).toBe(computeValueHash("25% VAT <rate>"))
  })
})

describe("detectRuleChanges", () => {
  const createSnapshot = (overrides: Partial<RuleSnapshotData> = {}): RuleSnapshotData => ({
    ruleId: "rule-123",
    conceptSlug: "pausalni-threshold",
    valueHash: computeValueHash("1000000"),
    confidence: 0.92,
    sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-abc" }],
    snapshotAt: new Date("2024-01-01"),
    ...overrides,
  })

  it("should detect value changes between snapshots", () => {
    const previous = createSnapshot()
    const current = createSnapshot({
      valueHash: computeValueHash("2000000"), // Different value
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.hasChanged).toBe(true)
    expect(changes.ruleId).toBe("rule-123")
    expect(changes.oldValueHash).toBe(previous.valueHash)
    expect(changes.newValueHash).toBe(current.valueHash)
  })

  it("should detect no change when values are identical", () => {
    const previous = createSnapshot()
    const current = createSnapshot({
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.hasChanged).toBe(false)
    expect(changes.oldValueHash).toBe(changes.newValueHash)
  })

  it("should detect confidence changes", () => {
    const previous = createSnapshot({ confidence: 0.92 })
    const current = createSnapshot({
      confidence: 0.85, // Confidence dropped
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.confidenceChanged).toBe(true)
    expect(changes.oldConfidence).toBe(0.92)
    expect(changes.newConfidence).toBe(0.85)
  })

  it("should classify change as explained when sources also changed", () => {
    const previous = createSnapshot({
      sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-old" }],
    })
    const current = createSnapshot({
      valueHash: computeValueHash("2000000"),
      sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-new" }], // Source content changed
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.hasChanged).toBe(true)
    expect(changes.sourceExplanation).toBe("explained")
  })

  it("should classify change as unexplained when sources unchanged", () => {
    const previous = createSnapshot({
      sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-same" }],
    })
    const current = createSnapshot({
      valueHash: computeValueHash("2000000"), // Value changed
      sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-same" }], // But sources are same!
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.hasChanged).toBe(true)
    expect(changes.sourceExplanation).toBe("unexplained")
  })

  it("should handle new sources being added", () => {
    const previous = createSnapshot({
      sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-1" }],
    })
    const current = createSnapshot({
      valueHash: computeValueHash("2000000"),
      sourceVersions: [
        { evidenceId: "ev-1", contentHash: "hash-1" },
        { evidenceId: "ev-2", contentHash: "hash-2" }, // New source added
      ],
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.hasChanged).toBe(true)
    expect(changes.sourceExplanation).toBe("explained") // New source = explained
  })

  it("should handle sources being removed", () => {
    const previous = createSnapshot({
      sourceVersions: [
        { evidenceId: "ev-1", contentHash: "hash-1" },
        { evidenceId: "ev-2", contentHash: "hash-2" },
      ],
    })
    const current = createSnapshot({
      valueHash: computeValueHash("2000000"),
      sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-1" }], // One source removed
      snapshotAt: new Date("2024-01-02"),
    })

    const changes = detectRuleChanges(previous, current)

    expect(changes.hasChanged).toBe(true)
    expect(changes.sourceExplanation).toBe("explained") // Source removed = explained
  })
})

describe("isChangeExplainedBySourceUpdate", () => {
  it("should return true when source content hash changed", () => {
    const oldSources: SourceVersion[] = [{ evidenceId: "ev-1", contentHash: "old-hash" }]
    const newSources: SourceVersion[] = [{ evidenceId: "ev-1", contentHash: "new-hash" }]

    expect(isChangeExplainedBySourceUpdate(oldSources, newSources)).toBe(true)
  })

  it("should return false when source hashes are identical", () => {
    const oldSources: SourceVersion[] = [{ evidenceId: "ev-1", contentHash: "same-hash" }]
    const newSources: SourceVersion[] = [{ evidenceId: "ev-1", contentHash: "same-hash" }]

    expect(isChangeExplainedBySourceUpdate(oldSources, newSources)).toBe(false)
  })

  it("should return true when new source is added", () => {
    const oldSources: SourceVersion[] = [{ evidenceId: "ev-1", contentHash: "hash-1" }]
    const newSources: SourceVersion[] = [
      { evidenceId: "ev-1", contentHash: "hash-1" },
      { evidenceId: "ev-2", contentHash: "hash-2" },
    ]

    expect(isChangeExplainedBySourceUpdate(oldSources, newSources)).toBe(true)
  })

  it("should return true when source is removed", () => {
    const oldSources: SourceVersion[] = [
      { evidenceId: "ev-1", contentHash: "hash-1" },
      { evidenceId: "ev-2", contentHash: "hash-2" },
    ]
    const newSources: SourceVersion[] = [{ evidenceId: "ev-1", contentHash: "hash-1" }]

    expect(isChangeExplainedBySourceUpdate(oldSources, newSources)).toBe(true)
  })

  it("should handle empty arrays", () => {
    expect(isChangeExplainedBySourceUpdate([], [])).toBe(false)
    expect(isChangeExplainedBySourceUpdate([], [{ evidenceId: "ev-1", contentHash: "h" }])).toBe(
      true
    )
    expect(isChangeExplainedBySourceUpdate([{ evidenceId: "ev-1", contentHash: "h" }], [])).toBe(
      true
    )
  })

  it("should compare by evidenceId not by position", () => {
    // Same sources but in different order
    const oldSources: SourceVersion[] = [
      { evidenceId: "ev-1", contentHash: "hash-1" },
      { evidenceId: "ev-2", contentHash: "hash-2" },
    ]
    const newSources: SourceVersion[] = [
      { evidenceId: "ev-2", contentHash: "hash-2" },
      { evidenceId: "ev-1", contentHash: "hash-1" },
    ]

    // No actual change, just reordering
    expect(isChangeExplainedBySourceUpdate(oldSources, newSources)).toBe(false)
  })
})

describe("getSnapshotRetentionCutoff", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return date 90 days ago by default", () => {
    const now = new Date("2024-04-10T12:00:00Z")
    vi.setSystemTime(now)

    const cutoff = getSnapshotRetentionCutoff()

    // Verify it's approximately 90 days before now (within 1 day tolerance for DST)
    const diffMs = now.getTime() - cutoff.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(90, 0) // Within 1 day
  })

  it("should accept custom retention days", () => {
    const now = new Date("2024-04-10T12:00:00Z")
    vi.setSystemTime(now)

    const cutoff = getSnapshotRetentionCutoff(30)

    // Verify it's approximately 30 days before now (within 1 day tolerance for DST)
    const diffMs = now.getTime() - cutoff.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(30, 0) // Within 1 day
  })

  it("should handle year boundary", () => {
    vi.setSystemTime(new Date("2024-02-15T00:00:00Z"))

    const cutoff = getSnapshotRetentionCutoff(90)

    // 90 days before Feb 15 = Nov 17 of previous year
    expect(cutoff.getFullYear()).toBe(2023)
    expect(cutoff.getMonth()).toBe(10) // November (0-indexed)
  })

  it("should handle leap years", () => {
    vi.setSystemTime(new Date("2024-03-01T00:00:00Z")) // 2024 is a leap year

    const cutoff = getSnapshotRetentionCutoff(1)

    // 1 day before March 1, 2024 = Feb 29 (leap day)
    expect(cutoff.getDate()).toBe(29)
    expect(cutoff.getMonth()).toBe(1) // February
  })
})

describe("Regression detection scenarios", () => {
  // These tests document expected regression detection behavior

  describe("Silent value change detection", () => {
    it("should flag unexplained value changes for human review", () => {
      const previousSnapshot: RuleSnapshotData = {
        ruleId: "rule-vat-rate",
        conceptSlug: "vat-standard-rate",
        valueHash: computeValueHash("25"),
        confidence: 0.95,
        sourceVersions: [{ evidenceId: "ev-law", contentHash: "law-hash-v1" }],
        snapshotAt: new Date("2024-01-01"),
      }

      const currentSnapshot: RuleSnapshotData = {
        ruleId: "rule-vat-rate",
        conceptSlug: "vat-standard-rate",
        valueHash: computeValueHash("20"), // VAT rate changed!
        confidence: 0.95,
        sourceVersions: [{ evidenceId: "ev-law", contentHash: "law-hash-v1" }], // But source is same!
        snapshotAt: new Date("2024-01-02"),
      }

      const changes = detectRuleChanges(previousSnapshot, currentSnapshot)

      // This is a critical finding: value changed without source update
      expect(changes.hasChanged).toBe(true)
      expect(changes.sourceExplanation).toBe("unexplained")
      // This should be queued for human review
    })
  })

  describe("Legitimate source update", () => {
    it("should allow value changes when source is updated", () => {
      const previousSnapshot: RuleSnapshotData = {
        ruleId: "rule-threshold",
        conceptSlug: "pausalni-threshold",
        valueHash: computeValueHash("1000000"),
        confidence: 0.92,
        sourceVersions: [{ evidenceId: "ev-nn", contentHash: "nn-2023-hash" }],
        snapshotAt: new Date("2024-01-01"),
      }

      const currentSnapshot: RuleSnapshotData = {
        ruleId: "rule-threshold",
        conceptSlug: "pausalni-threshold",
        valueHash: computeValueHash("1200000"), // Threshold increased
        confidence: 0.92,
        sourceVersions: [{ evidenceId: "ev-nn", contentHash: "nn-2024-hash" }], // New NN published!
        snapshotAt: new Date("2024-01-02"),
      }

      const changes = detectRuleChanges(previousSnapshot, currentSnapshot)

      // Value changed, but source also updated - this is expected
      expect(changes.hasChanged).toBe(true)
      expect(changes.sourceExplanation).toBe("explained")
      // No human review needed
    })
  })

  describe("Confidence degradation", () => {
    it("should detect confidence drops even without value change", () => {
      const previousSnapshot: RuleSnapshotData = {
        ruleId: "rule-deadline",
        conceptSlug: "joppd-deadline",
        valueHash: computeValueHash("15"),
        confidence: 0.95,
        sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-1" }],
        snapshotAt: new Date("2024-01-01"),
      }

      const currentSnapshot: RuleSnapshotData = {
        ruleId: "rule-deadline",
        conceptSlug: "joppd-deadline",
        valueHash: computeValueHash("15"), // Same value
        confidence: 0.72, // But confidence dropped significantly
        sourceVersions: [{ evidenceId: "ev-1", contentHash: "hash-1" }],
        snapshotAt: new Date("2024-01-02"),
      }

      const changes = detectRuleChanges(previousSnapshot, currentSnapshot)

      expect(changes.hasChanged).toBe(false) // Value unchanged
      expect(changes.confidenceChanged).toBe(true)
      expect(changes.newConfidence).toBeLessThan(changes.oldConfidence!)
    })
  })
})

// Import afterEach for cleanup
import { afterEach } from "vitest"
