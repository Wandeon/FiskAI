// src/lib/assistant/query-engine/conflict-detector.ts
import type { RuleCandidate } from "./rule-selector"

const AUTHORITY_RANK: Record<string, number> = {
  LAW: 1,
  REGULATION: 2,
  GUIDANCE: 3,
  PRACTICE: 4,
}

export interface ConflictResult {
  hasConflict: boolean
  canResolve: boolean
  winningRuleId?: string
  conflictingRules: RuleCandidate[]
  description?: string
}

export function detectConflicts(rules: RuleCandidate[]): ConflictResult {
  if (rules.length <= 1) {
    return { hasConflict: false, canResolve: true, conflictingRules: [] }
  }

  // Group by concept
  const byConceptAndType = new Map<string, RuleCandidate[]>()

  for (const rule of rules) {
    const key = `${rule.conceptSlug}:${rule.valueType}`
    const group = byConceptAndType.get(key) || []
    group.push(rule)
    byConceptAndType.set(key, group)
  }

  // Find conflicts (same concept+type, different values)
  const allConflicts: RuleCandidate[] = []
  let canResolveAll = true
  let winningRuleId: string | undefined

  for (const [key, group] of byConceptAndType) {
    if (group.length <= 1) continue

    const uniqueValues = new Set(group.map((r) => r.value))
    if (uniqueValues.size <= 1) continue // No conflict, same value

    // We have a conflict
    allConflicts.push(...group)

    // Try to resolve by authority level
    const sorted = [...group].sort((a, b) => {
      const rankA = AUTHORITY_RANK[a.authorityLevel] ?? 99
      const rankB = AUTHORITY_RANK[b.authorityLevel] ?? 99
      return rankA - rankB
    })

    const topRank = AUTHORITY_RANK[sorted[0].authorityLevel] ?? 99
    const sameRankCount = sorted.filter(
      (r) => (AUTHORITY_RANK[r.authorityLevel] ?? 99) === topRank
    ).length

    if (sameRankCount > 1) {
      // Multiple rules at same authority = unresolvable
      canResolveAll = false
    } else {
      winningRuleId = sorted[0].id
    }
  }

  if (allConflicts.length === 0) {
    return { hasConflict: false, canResolve: true, conflictingRules: [] }
  }

  return {
    hasConflict: true,
    canResolve: canResolveAll,
    winningRuleId: canResolveAll ? winningRuleId : undefined,
    conflictingRules: allConflicts,
    description: canResolveAll
      ? "Conflict resolved by authority hierarchy"
      : "Multiple sources at same authority level disagree",
  }
}
