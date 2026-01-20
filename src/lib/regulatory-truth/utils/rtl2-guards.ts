// src/lib/regulatory-truth/utils/rtl2-guards.ts
// RTL2 lineage guards to prevent legacy rule contamination

/**
 * RTL2 Cutover Timestamp
 *
 * Rules created before this timestamp are considered "legacy" and must not
 * be merged with, modified by, or processed by RTL2 agents.
 *
 * This timestamp marks when RTL2 lineage tracking became mandatory.
 */
export const RTL2_CUTOVER_TIMESTAMP = new Date("2026-01-20T15:20:00Z")

/**
 * Checks if a rule has valid RTL2 lineage.
 *
 * A rule is considered RTL2-valid if it has:
 * - At least one originating CandidateFact ID, OR
 * - At least one originating AgentRun ID
 *
 * Legacy rules (created without lineage tracking) will return false.
 */
export function hasRTL2Lineage(rule: {
  originatingCandidateFactIds?: string[] | null
  originatingAgentRunIds?: string[] | null
}): boolean {
  const hasCandidateFactLineage =
    Array.isArray(rule.originatingCandidateFactIds) && rule.originatingCandidateFactIds.length > 0
  const hasAgentRunLineage =
    Array.isArray(rule.originatingAgentRunIds) && rule.originatingAgentRunIds.length > 0

  return hasCandidateFactLineage || hasAgentRunLineage
}

/**
 * Asserts that a rule has RTL2 lineage.
 *
 * @throws Error if the rule lacks RTL2 lineage
 */
export function assertRTL2Rule(
  rule: {
    id: string
    originatingCandidateFactIds?: string[] | null
    originatingAgentRunIds?: string[] | null
  },
  context: string
): void {
  if (!hasRTL2Lineage(rule)) {
    throw new Error(
      `[RTL2_GUARD] Rule ${rule.id} lacks RTL2 lineage (context: ${context}). ` +
        `This is a legacy rule and must not be processed by RTL2 agents.`
    )
  }
}

/**
 * Logs a legacy skip event for telemetry and debugging.
 *
 * Call this when skipping a legacy rule to maintain an audit trail.
 */
export function logLegacySkip(ruleId: string, reason: string, context: string): void {
  console.log(`[LEGACY_SKIP] ruleId=${ruleId} reason="${reason}" context="${context}"`)
}

/**
 * Checks if a rule was created after the RTL2 cutover.
 *
 * This is a secondary check - rules created after cutover SHOULD have lineage,
 * but checking lineage directly is more reliable.
 */
export function isPostCutover(createdAt: Date): boolean {
  return createdAt >= RTL2_CUTOVER_TIMESTAMP
}
