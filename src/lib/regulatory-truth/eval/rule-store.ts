// src/lib/regulatory-truth/eval/rule-store.ts
/**
 * Rule Store - DB-backed rule selection with conflict detection
 *
 * Replaces the static RULE_REGISTRY with proper KG integration.
 * Uses the existing RegulatoryRule table and temporal-filter utilities.
 */

import { db } from "@/lib/db"
import type { RegulatoryRule } from "@prisma/client"
import {
  isTemporallyEffective,
  buildTemporalWhereClause,
  type TemporalFilterReason,
} from "../utils/temporal-filter"

// =============================================================================
// Types
// =============================================================================

/**
 * Topic key format: domain/area/subarea
 * Maps to conceptSlug in the database.
 */
export type TopicKey = string

/**
 * Mapping from topic keys to conceptSlug patterns.
 * This allows the eval module to use semantic topic keys
 * while the DB uses conceptSlugs.
 */
const TOPIC_TO_CONCEPT_SLUG: Record<TopicKey, string> = {
  "TAX/VAT/REGISTRATION": "pdv-prag-obveznog-upisa",
  // Add more mappings as needed
}

export type RuleSelectionReason =
  | "EFFECTIVE"
  | "FUTURE"
  | "EXPIRED"
  | "NO_RULE_FOUND"
  | "CONFLICT_MULTIPLE_EFFECTIVE"

export interface RuleSelectionResult {
  success: boolean
  rule: RegulatoryRule | null
  reason: RuleSelectionReason
  /** If conflict, lists the conflicting rule IDs */
  conflictingRuleIds?: string[]
  /** Effective period of selected rule */
  effectivePeriod?: {
    from: string
    until: string | null
  }
}

// =============================================================================
// Rule Selection
// =============================================================================

/**
 * Select the correct rule for a topic at a given date.
 *
 * Selection algorithm:
 * 1. Map topicKey to conceptSlug
 * 2. Query RegulatoryRule by conceptSlug with status=PUBLISHED
 * 3. Filter to those temporally effective at asOfDate
 * 4. Check for conflicts:
 *    - If multiple effective rules exist WITHOUT supersession edges, return CONFLICT
 *    - If supersession exists, pick the superseding rule
 * 5. If single rule, return it
 * 6. If none, return appropriate reason (FUTURE, EXPIRED, NO_RULE_FOUND)
 */
export async function selectRuleFromDb(
  topicKey: TopicKey,
  asOfDate: Date
): Promise<RuleSelectionResult> {
  // Map topic key to concept slug
  const conceptSlug = TOPIC_TO_CONCEPT_SLUG[topicKey]
  if (!conceptSlug) {
    return {
      success: false,
      rule: null,
      reason: "NO_RULE_FOUND",
    }
  }

  // Query all PUBLISHED rules for this concept
  const rules = await db.regulatoryRule.findMany({
    where: {
      conceptSlug,
      status: "PUBLISHED",
      revokedAt: null, // Not revoked
    },
    orderBy: {
      effectiveFrom: "desc",
    },
  })

  if (rules.length === 0) {
    return {
      success: false,
      rule: null,
      reason: "NO_RULE_FOUND",
    }
  }

  // Filter to temporally effective rules
  const effectiveRules: RegulatoryRule[] = []
  const reasons: TemporalFilterReason[] = []

  for (const rule of rules) {
    const result = isTemporallyEffective(
      {
        effectiveFrom: rule.effectiveFrom,
        effectiveUntil: rule.effectiveUntil,
      },
      asOfDate
    )
    reasons.push(result.reason)
    if (result.isEffective) {
      effectiveRules.push(rule)
    }
  }

  // No effective rules
  if (effectiveRules.length === 0) {
    const hasFuture = reasons.includes("FUTURE")
    const hasExpired = reasons.includes("EXPIRED")
    return {
      success: false,
      rule: null,
      reason: hasFuture ? "FUTURE" : hasExpired ? "EXPIRED" : "NO_RULE_FOUND",
    }
  }

  // Single effective rule - success
  if (effectiveRules.length === 1) {
    const rule = effectiveRules[0]
    return {
      success: true,
      rule,
      reason: "EFFECTIVE",
      effectivePeriod: {
        from: rule.effectiveFrom.toISOString().split("T")[0],
        until: rule.effectiveUntil?.toISOString().split("T")[0] ?? null,
      },
    }
  }

  // Multiple effective rules - check for supersession
  // Sort by effectiveFrom desc (most recent first)
  effectiveRules.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())

  // Check if the most recent rule supersedes all others
  const mostRecent = effectiveRules[0]
  const supersededIds = new Set<string>()

  // Walk the supersession chain
  let current: RegulatoryRule | null = mostRecent
  while (current?.supersedesId) {
    supersededIds.add(current.supersedesId)
    current = effectiveRules.find((r) => r.id === current!.supersedesId) ?? null
  }

  // Check if all other effective rules are superseded
  const unsuperseded = effectiveRules.filter(
    (r) => r.id !== mostRecent.id && !supersededIds.has(r.id)
  )

  if (unsuperseded.length > 0) {
    // Conflict: multiple effective rules without supersession chain
    return {
      success: false,
      rule: null,
      reason: "CONFLICT_MULTIPLE_EFFECTIVE",
      conflictingRuleIds: effectiveRules.map((r) => r.id),
    }
  }

  // All other rules are superseded, use most recent
  return {
    success: true,
    rule: mostRecent,
    reason: "EFFECTIVE",
    effectivePeriod: {
      from: mostRecent.effectiveFrom.toISOString().split("T")[0],
      until: mostRecent.effectiveUntil?.toISOString().split("T")[0] ?? null,
    },
  }
}

/**
 * Check if a rule exists for a topic (without temporal filtering).
 * Useful for coverage checks.
 */
export async function hasRuleForTopic(topicKey: TopicKey): Promise<boolean> {
  const conceptSlug = TOPIC_TO_CONCEPT_SLUG[topicKey]
  if (!conceptSlug) return false

  const count = await db.regulatoryRule.count({
    where: {
      conceptSlug,
      status: "PUBLISHED",
      revokedAt: null,
    },
  })

  return count > 0
}

/**
 * Get all effective date ranges for a topic.
 * Useful for UI to show coverage periods.
 */
export async function getRuleCoverage(
  topicKey: TopicKey
): Promise<Array<{ from: string; until: string | null; ruleId: string }>> {
  const conceptSlug = TOPIC_TO_CONCEPT_SLUG[topicKey]
  if (!conceptSlug) return []

  const rules = await db.regulatoryRule.findMany({
    where: {
      conceptSlug,
      status: "PUBLISHED",
      revokedAt: null,
    },
    select: {
      id: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
    orderBy: {
      effectiveFrom: "asc",
    },
  })

  return rules.map((r) => ({
    from: r.effectiveFrom.toISOString().split("T")[0],
    until: r.effectiveUntil?.toISOString().split("T")[0] ?? null,
    ruleId: r.id,
  }))
}
