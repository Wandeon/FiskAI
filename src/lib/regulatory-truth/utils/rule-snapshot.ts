// src/lib/regulatory-truth/utils/rule-snapshot.ts
//
// Rule snapshot utilities for regression detection
// Task 2.2: Automated Regression Testing
//
// Creates daily snapshots of PUBLISHED rules to detect silent value changes.
// Compares snapshots to identify changes not explained by source updates.
// Unexplained changes are flagged for human review.

import { createHash } from "crypto"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Source version tracking for diff explanation.
 * When a rule changes, we check if the underlying evidence also changed.
 */
export interface SourceVersion {
  evidenceId: string
  contentHash: string
}

/**
 * Snapshot data for a published rule.
 * Captures the rule state at a point in time for regression detection.
 */
export interface RuleSnapshotData {
  ruleId: string
  conceptSlug: string
  valueHash: string // SHA-256 of the rule value
  confidence: number
  sourceVersions: SourceVersion[]
  snapshotAt: Date
}

/**
 * Result of comparing two snapshots.
 */
export interface RuleChangeResult {
  ruleId: string
  hasChanged: boolean
  oldValueHash: string
  newValueHash: string
  sourceExplanation: "explained" | "unexplained"
  confidenceChanged: boolean
  oldConfidence?: number
  newConfidence?: number
}

/**
 * Input for creating a snapshot from a rule.
 */
export interface RuleInput {
  id: string
  conceptSlug: string
  value: string
  confidence: number
}

// =============================================================================
// HASH FUNCTIONS
// =============================================================================

/**
 * Default retention period for snapshots in days.
 * Per Appendix A.6: Keep 90 days of snapshots, then archive.
 */
export const DEFAULT_RETENTION_DAYS = 90

/**
 * Compute SHA-256 hash of a rule value.
 * Used for deterministic value comparison across snapshots.
 *
 * @param value - The rule value to hash
 * @returns SHA-256 hex string (64 characters)
 */
export function computeValueHash(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

// =============================================================================
// SNAPSHOT CREATION
// =============================================================================

/**
 * Create snapshot data from a rule and its source versions.
 *
 * @param rule - The rule to snapshot
 * @param sourceVersions - Current evidence versions backing this rule
 * @returns Snapshot data ready for persistence
 */
export function createSnapshotData(
  rule: RuleInput,
  sourceVersions: SourceVersion[]
): RuleSnapshotData {
  return {
    ruleId: rule.id,
    conceptSlug: rule.conceptSlug,
    valueHash: computeValueHash(rule.value),
    confidence: rule.confidence,
    sourceVersions: sourceVersions,
    snapshotAt: new Date(),
  }
}

// =============================================================================
// DIFF DETECTION
// =============================================================================

/**
 * Check if a value change is explained by source updates.
 *
 * Returns true if any of:
 * - Source content hashes differ
 * - New sources were added
 * - Sources were removed
 *
 * @param oldSources - Previous snapshot's source versions
 * @param newSources - Current snapshot's source versions
 * @returns true if sources changed (explains value change)
 */
export function isChangeExplainedBySourceUpdate(
  oldSources: SourceVersion[],
  newSources: SourceVersion[]
): boolean {
  // Build maps for efficient lookup by evidenceId
  const oldMap = new Map(oldSources.map((s) => [s.evidenceId, s.contentHash]))
  const newMap = new Map(newSources.map((s) => [s.evidenceId, s.contentHash]))

  // Check if source sets are different (additions or removals)
  if (oldMap.size !== newMap.size) {
    return true
  }

  // Check for new sources or removed sources
  const newKeys = Array.from(newMap.keys())
  const oldKeys = Array.from(oldMap.keys())

  for (const evidenceId of newKeys) {
    if (!oldMap.has(evidenceId)) {
      return true // New source added
    }
  }

  for (const evidenceId of oldKeys) {
    if (!newMap.has(evidenceId)) {
      return true // Source removed
    }
  }

  // Check if any content hashes changed
  const newEntries = Array.from(newMap.entries())
  for (const [evidenceId, newHash] of newEntries) {
    const oldHash = oldMap.get(evidenceId)
    if (oldHash !== newHash) {
      return true // Content changed
    }
  }

  return false
}

/**
 * Detect changes between two snapshots of the same rule.
 *
 * @param previous - The previous snapshot
 * @param current - The current snapshot
 * @returns Detailed change result with explanation classification
 */
export function detectRuleChanges(
  previous: RuleSnapshotData,
  current: RuleSnapshotData
): RuleChangeResult {
  const hasValueChanged = previous.valueHash !== current.valueHash
  const hasConfidenceChanged = previous.confidence !== current.confidence

  // Determine if value change is explained by source updates
  let sourceExplanation: "explained" | "unexplained" = "unexplained"

  if (hasValueChanged) {
    const sourcesChanged = isChangeExplainedBySourceUpdate(
      previous.sourceVersions,
      current.sourceVersions
    )
    sourceExplanation = sourcesChanged ? "explained" : "unexplained"
  }

  return {
    ruleId: current.ruleId,
    hasChanged: hasValueChanged,
    oldValueHash: previous.valueHash,
    newValueHash: current.valueHash,
    sourceExplanation,
    confidenceChanged: hasConfidenceChanged,
    oldConfidence: previous.confidence,
    newConfidence: current.confidence,
  }
}

// =============================================================================
// TTL CLEANUP
// =============================================================================

/**
 * Get the cutoff date for snapshot retention.
 *
 * Per Appendix A.6: Keep 90 days of snapshots, then archive.
 *
 * @param retentionDays - Number of days to retain (default: 90)
 * @returns Date before which snapshots should be archived/deleted
 */
export function getSnapshotRetentionCutoff(retentionDays: number = DEFAULT_RETENTION_DAYS): Date {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  return cutoff
}
