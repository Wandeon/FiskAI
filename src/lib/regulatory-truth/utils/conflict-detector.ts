// src/lib/regulatory-truth/utils/conflict-detector.ts

import { db } from "@/lib/db"

export interface ConflictSeed {
  type: "VALUE_MISMATCH" | "DATE_OVERLAP" | "AUTHORITY_SUPERSEDE"
  existingRuleId: string
  newRuleId: string
  reason: string
}

/**
 * Check for structural conflicts when a new rule is created.
 * These are deterministic checks, not AI-based.
 */
export async function detectStructuralConflicts(newRule: {
  id: string
  conceptSlug: string
  value: string
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  authorityLevel: string
  articleNumber?: string | null
}): Promise<ConflictSeed[]> {
  const conflicts: ConflictSeed[] = []

  // Find existing rules for same concept
  const existingRules = await db.regulatoryRule.findMany({
    where: {
      conceptSlug: newRule.conceptSlug,
      status: { in: ["PUBLISHED", "APPROVED", "PENDING_REVIEW"] },
      id: { not: newRule.id },
    },
    include: {
      sourcePointers: {
        select: {
          articleNumber: true,
        },
        take: 1,
      },
    },
  })

  for (const existing of existingRules) {
    // Check 1: Same concept, different value, overlapping dates
    if (existing.value !== newRule.value) {
      const datesOverlap = checkDateOverlap(
        existing.effectiveFrom,
        existing.effectiveUntil,
        newRule.effectiveFrom,
        newRule.effectiveUntil
      )

      if (datesOverlap) {
        conflicts.push({
          type: "VALUE_MISMATCH",
          existingRuleId: existing.id,
          newRuleId: newRule.id,
          reason: `Same concept "${newRule.conceptSlug}" with different values: "${existing.value}" vs "${newRule.value}" during overlapping period`,
        })
      }
    }

    // Check 2: Higher authority supersedes
    // Lower authority level number = higher authority (LAW=1, GUIDANCE=2, etc.)
    const existingAuthorityRank = getAuthorityRank(existing.authorityLevel)
    const newAuthorityRank = getAuthorityRank(newRule.authorityLevel)

    if (newAuthorityRank < existingAuthorityRank) {
      conflicts.push({
        type: "AUTHORITY_SUPERSEDE",
        existingRuleId: existing.id,
        newRuleId: newRule.id,
        reason: `New rule from higher authority (${newRule.authorityLevel}) may supersede existing (${existing.authorityLevel})`,
      })
    }
  }

  // Check 3: Same article reference, different value
  if (newRule.articleNumber) {
    const sameArticle = await db.regulatoryRule.findMany({
      where: {
        id: { not: newRule.id },
        status: { in: ["PUBLISHED", "APPROVED"] },
        sourcePointers: {
          some: { articleNumber: newRule.articleNumber },
        },
      },
    })

    for (const existing of sameArticle) {
      if (existing.value !== newRule.value) {
        conflicts.push({
          type: "VALUE_MISMATCH",
          existingRuleId: existing.id,
          newRuleId: newRule.id,
          reason: `Same article "${newRule.articleNumber}" with different values`,
        })
      }
    }
  }

  return conflicts
}

/**
 * Check if two date ranges overlap
 */
function checkDateOverlap(
  start1: Date | null,
  end1: Date | null,
  start2: Date | null,
  end2: Date | null
): boolean {
  const s1 = start1?.getTime() || 0
  const e1 = end1?.getTime() || Infinity
  const s2 = start2?.getTime() || 0
  const e2 = end2?.getTime() || Infinity

  return s1 <= e2 && s2 <= e1
}

/**
 * Convert authority level to numeric rank for comparison
 * Lower number = higher authority
 */
function getAuthorityRank(level: string): number {
  const ranks: Record<string, number> = {
    LAW: 1,
    REGULATION: 2,
    GUIDANCE: 3,
    PROCEDURE: 4,
    PRACTICE: 5,
  }
  return ranks[level] || 999
}

/**
 * Create conflict records for detected structural conflicts.
 */
export async function seedConflicts(conflicts: ConflictSeed[]): Promise<number> {
  let created = 0

  for (const conflict of conflicts) {
    // Check if conflict already exists
    const existing = await db.regulatoryConflict.findFirst({
      where: {
        OR: [
          { itemAId: conflict.existingRuleId, itemBId: conflict.newRuleId },
          { itemAId: conflict.newRuleId, itemBId: conflict.existingRuleId },
        ],
        status: "OPEN",
      },
    })

    if (!existing) {
      await db.regulatoryConflict.create({
        data: {
          conflictType:
            conflict.type === "AUTHORITY_SUPERSEDE" ? "TEMPORAL_CONFLICT" : "SOURCE_CONFLICT",
          itemAId: conflict.existingRuleId,
          itemBId: conflict.newRuleId,
          description: conflict.reason,
          status: "OPEN",
          metadata: {
            detectionMethod: "STRUCTURAL",
            conflictSubtype: conflict.type,
            detectedAt: new Date().toISOString(),
          },
        },
      })
      created++
      console.log(`[conflict] Created ${conflict.type}: ${conflict.reason}`)
    }
  }

  return created
}
