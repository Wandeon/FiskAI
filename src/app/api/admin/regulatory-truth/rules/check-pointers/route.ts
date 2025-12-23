// src/app/api/admin/regulatory-truth/rules/check-pointers/route.ts

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * GET /api/admin/regulatory-truth/rules/check-pointers
 *
 * Identify rules without source pointers (violates RTL-009).
 * These rules cannot be verified and should not exist.
 */
export async function GET(req: NextRequest) {
  try {
    // Find all rules
    const allRules = await db.regulatoryRule.findMany({
      select: {
        id: true,
        conceptSlug: true,
        status: true,
        riskTier: true,
        confidence: true,
        createdAt: true,
        sourcePointers: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Identify rules without source pointers
    const rulesWithoutPointers = allRules.filter((r) => r.sourcePointers.length === 0)

    // Group by status for reporting
    const byStatus = rulesWithoutPointers.reduce(
      (acc, rule) => {
        acc[rule.status] = (acc[rule.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Group by risk tier
    const byRiskTier = rulesWithoutPointers.reduce(
      (acc, rule) => {
        acc[rule.riskTier] = (acc[rule.riskTier] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      total: allRules.length,
      withoutPointers: rulesWithoutPointers.length,
      percentageWithoutPointers: ((rulesWithoutPointers.length / allRules.length) * 100).toFixed(2),
      byStatus,
      byRiskTier,
      rules: rulesWithoutPointers.map((r) => ({
        id: r.id,
        conceptSlug: r.conceptSlug,
        status: r.status,
        riskTier: r.riskTier,
        confidence: r.confidence,
        createdAt: r.createdAt,
        pointerCount: r.sourcePointers.length,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/regulatory-truth/rules/check-pointers
 *
 * Flag rules without source pointers by updating their status.
 *
 * Body: { action: "flag" | "delete", dryRun: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { action = "flag", dryRun = true } = await req.json()

    if (!["flag", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use 'flag' or 'delete'" }, { status: 400 })
    }

    // Find rules without source pointers
    const rulesWithoutPointers = await db.regulatoryRule.findMany({
      where: {
        sourcePointers: {
          none: {},
        },
      },
      select: {
        id: true,
        conceptSlug: true,
        status: true,
        riskTier: true,
        confidence: true,
        composerNotes: true,
      },
    })

    if (rulesWithoutPointers.length === 0) {
      return NextResponse.json({
        message: "No rules without source pointers found",
        affected: 0,
        dryRun,
      })
    }

    const affected: Array<{
      id: string
      conceptSlug: string
      oldStatus: string
      newStatus?: string
      action: string
    }> = []

    if (!dryRun) {
      for (const rule of rulesWithoutPointers) {
        if (action === "flag") {
          // Flag by moving to REJECTED status and adding a note
          await db.regulatoryRule.update({
            where: { id: rule.id },
            data: {
              status: "REJECTED",
              reviewerNotes: `[SYSTEM] Rejected: Rule has no source pointers. Rules must be traceable to evidence (RTL-009).`,
              composerNotes: `${rule.composerNotes || ""}\n[FLAGGED] No source pointers - cannot verify`,
            },
          })

          affected.push({
            id: rule.id,
            conceptSlug: rule.conceptSlug,
            oldStatus: rule.status,
            newStatus: "REJECTED",
            action: "flagged",
          })
        } else if (action === "delete") {
          // Delete the rule entirely
          await db.regulatoryRule.delete({
            where: { id: rule.id },
          })

          affected.push({
            id: rule.id,
            conceptSlug: rule.conceptSlug,
            oldStatus: rule.status,
            action: "deleted",
          })
        }
      }
    } else {
      // Dry run - just report what would happen
      for (const rule of rulesWithoutPointers) {
        affected.push({
          id: rule.id,
          conceptSlug: rule.conceptSlug,
          oldStatus: rule.status,
          newStatus: action === "flag" ? "REJECTED" : undefined,
          action: action === "flag" ? "would-flag" : "would-delete",
        })
      }
    }

    return NextResponse.json({
      dryRun,
      action,
      totalRulesWithoutPointers: rulesWithoutPointers.length,
      affected: affected.length,
      changes: affected,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
