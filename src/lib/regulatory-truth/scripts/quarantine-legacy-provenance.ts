// src/lib/regulatory-truth/scripts/quarantine-legacy-provenance.ts
// Quarantine script for legacy rules with broken or unverified provenance.
//
// Usage:
//   npx tsx src/lib/regulatory-truth/scripts/quarantine-legacy-provenance.ts [--report-only] [--downgrade]
//
// This script:
// 1. Finds SourcePointers with matchType=NOT_FOUND/PENDING_VERIFICATION or missing offsets
// 2. Finds rules linked to those pointers that are APPROVED/PUBLISHED
// 3. Reports them (--report-only: just report, no changes)
// 4. Optionally downgrades to PENDING_REVIEW (--downgrade)
//
// CRITICAL: This is how you clean historical contamination from the truth layer.

import { db, runWithRegulatoryContext } from "@/lib/db"
import { logAuditEvent } from "../utils/audit-log"

interface QuarantineReport {
  /** Pointers with broken/unverified provenance */
  brokenPointers: BrokenPointerInfo[]
  /** Rules affected by broken pointers */
  affectedRules: AffectedRuleInfo[]
  /** Summary counts */
  summary: {
    totalBrokenPointers: number
    pointersMissingOffsets: number
    pointersNotVerified: number
    pointersNotFound: number
    rulesApproved: number
    rulesPublished: number
    rulesDowngraded: number
  }
}

interface BrokenPointerInfo {
  pointerId: string
  evidenceId: string
  matchType: string | null
  hasOffsets: boolean
  quotePreview: string
  linkedRuleIds: string[]
}

interface AffectedRuleInfo {
  ruleId: string
  conceptSlug: string
  riskTier: string
  status: string
  pointerIds: string[]
  wasDowngraded: boolean
}

async function scanBrokenPointers(): Promise<BrokenPointerInfo[]> {
  // Find pointers with issues:
  // 1. matchType is NOT_FOUND, PENDING_VERIFICATION, or null
  // 2. OR startOffset/endOffset is null
  const brokenPointers = await db.sourcePointer.findMany({
    where: {
      OR: [
        { matchType: "NOT_FOUND" },
        { matchType: "PENDING_VERIFICATION" },
        { matchType: null },
        { startOffset: null },
        { endOffset: null },
      ],
    },
    include: {
      rules: {
        where: {
          status: { in: ["APPROVED", "PUBLISHED"] },
        },
        select: {
          id: true,
        },
      },
    },
  })

  return brokenPointers.map((p) => ({
    pointerId: p.id,
    evidenceId: p.evidenceId,
    matchType: p.matchType,
    hasOffsets: p.startOffset !== null && p.endOffset !== null,
    quotePreview: p.exactQuote.slice(0, 60) + (p.exactQuote.length > 60 ? "..." : ""),
    linkedRuleIds: p.rules.map((r) => r.id),
  }))
}

async function findAffectedRules(brokenPointers: BrokenPointerInfo[]): Promise<AffectedRuleInfo[]> {
  // Collect all affected rule IDs
  const affectedRuleIds = new Set<string>()
  for (const pointer of brokenPointers) {
    for (const ruleId of pointer.linkedRuleIds) {
      affectedRuleIds.add(ruleId)
    }
  }

  if (affectedRuleIds.size === 0) {
    return []
  }

  const rules = await db.regulatoryRule.findMany({
    where: {
      id: { in: Array.from(affectedRuleIds) },
      status: { in: ["APPROVED", "PUBLISHED"] },
    },
    include: {
      sourcePointers: {
        select: { id: true },
      },
    },
  })

  return rules.map((r) => ({
    ruleId: r.id,
    conceptSlug: r.conceptSlug,
    riskTier: r.riskTier,
    status: r.status,
    pointerIds: r.sourcePointers.map((p) => p.id),
    wasDowngraded: false,
  }))
}

async function downgradeRules(rules: AffectedRuleInfo[], source: string): Promise<number> {
  let downgradedCount = 0

  // Use regulatory context for proper audit trail
  await runWithRegulatoryContext({ source, bypassApproval: true }, async () => {
    for (const rule of rules) {
      try {
        await db.regulatoryRule.update({
          where: { id: rule.ruleId },
          data: { status: "PENDING_REVIEW" },
        })

        await logAuditEvent({
          action: "RULE_STATUS_CHANGED",
          entityType: "RULE",
          entityId: rule.ruleId,
          metadata: {
            previousStatus: rule.status,
            newStatus: "PENDING_REVIEW",
            source,
            reason: "Legacy provenance quarantine - broken/unverified pointers",
            isQuarantine: true,
          },
        })

        rule.wasDowngraded = true
        downgradedCount++
      } catch (error) {
        console.error(`Failed to downgrade ${rule.ruleId}:`, error)
      }
    }
  })

  return downgradedCount
}

function printReport(report: QuarantineReport): void {
  console.log("\n" + "=".repeat(80))
  console.log("LEGACY PROVENANCE QUARANTINE REPORT")
  console.log("=".repeat(80))

  console.log("\n## Summary")
  console.log(`  Total broken pointers: ${report.summary.totalBrokenPointers}`)
  console.log(`    - Missing offsets:   ${report.summary.pointersMissingOffsets}`)
  console.log(`    - Unverified/NotFound: ${report.summary.pointersNotVerified}`)
  console.log(`  Rules APPROVED:        ${report.summary.rulesApproved}`)
  console.log(`  Rules PUBLISHED:       ${report.summary.rulesPublished}`)
  console.log(`  Rules downgraded:      ${report.summary.rulesDowngraded}`)

  if (report.affectedRules.length > 0) {
    console.log("\n## Affected Rules (APPROVED/PUBLISHED with broken provenance)")
    console.log("-".repeat(80))

    for (const rule of report.affectedRules) {
      const status = rule.wasDowngraded ? `${rule.status} → PENDING_REVIEW` : rule.status
      console.log(`  ${rule.ruleId}`)
      console.log(`    Concept:    ${rule.conceptSlug}`)
      console.log(`    Risk Tier:  ${rule.riskTier}`)
      console.log(`    Status:     ${status}`)
      console.log(`    Pointers:   ${rule.pointerIds.length} (broken provenance)`)
    }
  }

  if (report.brokenPointers.length > 0 && report.brokenPointers.length <= 20) {
    console.log("\n## Broken Pointers (first 20)")
    console.log("-".repeat(80))

    for (const pointer of report.brokenPointers.slice(0, 20)) {
      console.log(`  ${pointer.pointerId}`)
      console.log(`    matchType:  ${pointer.matchType || "null"}`)
      console.log(`    hasOffsets: ${pointer.hasOffsets}`)
      console.log(`    quote:      "${pointer.quotePreview}"`)
      console.log(`    rules:      ${pointer.linkedRuleIds.length}`)
    }

    if (report.brokenPointers.length > 20) {
      console.log(`  ... and ${report.brokenPointers.length - 20} more`)
    }
  }

  console.log("\n" + "=".repeat(80))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const reportOnly = args.includes("--report-only")
  const shouldDowngrade = args.includes("--downgrade")

  if (!reportOnly && !shouldDowngrade) {
    console.log("Usage: npx tsx quarantine-legacy-provenance.ts [--report-only] [--downgrade]")
    console.log("  --report-only  Just report, no changes")
    console.log("  --downgrade    Downgrade affected rules to PENDING_REVIEW")
    process.exit(1)
  }

  console.log(
    `[quarantine] Starting${reportOnly ? " (REPORT ONLY)" : shouldDowngrade ? " (WILL DOWNGRADE)" : ""}...`
  )

  // Scan for broken pointers
  const brokenPointers = await scanBrokenPointers()
  console.log(`[quarantine] Found ${brokenPointers.length} broken pointers`)

  // Find affected rules
  const affectedRules = await findAffectedRules(brokenPointers)
  console.log(`[quarantine] Found ${affectedRules.length} affected rules (APPROVED/PUBLISHED)`)

  // Build summary
  const summary = {
    totalBrokenPointers: brokenPointers.length,
    pointersMissingOffsets: brokenPointers.filter((p) => !p.hasOffsets).length,
    pointersNotVerified: brokenPointers.filter(
      (p) =>
        p.matchType === "NOT_FOUND" ||
        p.matchType === "PENDING_VERIFICATION" ||
        p.matchType === null
    ).length,
    pointersNotFound: brokenPointers.filter((p) => p.matchType === "NOT_FOUND").length,
    rulesApproved: affectedRules.filter((r) => r.status === "APPROVED").length,
    rulesPublished: affectedRules.filter((r) => r.status === "PUBLISHED").length,
    rulesDowngraded: 0,
  }

  // Downgrade if requested
  if (shouldDowngrade && affectedRules.length > 0) {
    console.log(`[quarantine] Downgrading ${affectedRules.length} rules to PENDING_REVIEW...`)
    summary.rulesDowngraded = await downgradeRules(affectedRules, "quarantine-legacy-provenance")
    console.log(`[quarantine] Downgraded ${summary.rulesDowngraded} rules`)
  }

  // Print report
  const report: QuarantineReport = {
    brokenPointers,
    affectedRules,
    summary,
  }

  printReport(report)

  // Exit with error if there are affected published rules
  if (summary.rulesPublished > 0 && !shouldDowngrade) {
    console.log("\n⚠️  WARNING: There are PUBLISHED rules with broken provenance!")
    console.log("   Run with --downgrade to quarantine them.")
    process.exit(1)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error("[quarantine] Fatal error:", error)
  process.exit(1)
})

export { scanBrokenPointers, findAffectedRules, downgradeRules, type QuarantineReport }
