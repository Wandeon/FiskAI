#!/usr/bin/env npx tsx
/**
 * Regulatory Soft Ref Integrity Checker
 *
 * Checks for orphaned soft references between core and regulatory schemas.
 * Run daily or before deployments to catch integrity drift.
 *
 * Usage:
 *   npx tsx scripts/check-regulatory-integrity.ts                    # Check only (CI-safe)
 *   npx tsx scripts/check-regulatory-integrity.ts --dry-run          # Show what would be fixed
 *   npx tsx scripts/check-regulatory-integrity.ts --fix --confirm    # Actually fix (requires --confirm)
 *
 * Exit codes:
 *   0 - No issues found
 *   1 - Issues found (use in CI to fail builds)
 *   2 - Script error
 */

import { db } from "@/lib/db"
import { dbReg } from "@/lib/db/regulatory"

interface IntegrityIssue {
  model: string
  field: string
  orphanedId: string
  referencedId: string
  referencedModel: string
  isFixable: boolean // Whether this can be auto-fixed (optional fields only)
}

interface IntegrityReport {
  checkedAt: Date
  totalChecked: number
  orphansFound: number
  fixableOrphans: number
  issues: IntegrityIssue[]
}

const DRY_RUN = process.argv.includes("--dry-run")
const FIX_MODE = process.argv.includes("--fix")
const CONFIRMED = process.argv.includes("--confirm")

async function checkSoftRefs(): Promise<IntegrityReport> {
  const issues: IntegrityIssue[] = []
  let totalChecked = 0

  console.log("🔍 Checking regulatory soft ref integrity...\n")

  // Get all Evidence IDs from regulatory schema
  const allEvidenceIds = new Set(
    (await dbReg.evidence.findMany({ select: { id: true } })).map((e) => e.id)
  )
  console.log(`📊 Found ${allEvidenceIds.size} Evidence records in regulatory schema`)

  // Get all RegulatorySource IDs from regulatory schema
  const allSourceIds = new Set(
    (await dbReg.regulatorySource.findMany({ select: { id: true } })).map((s) => s.id)
  )
  console.log(`📊 Found ${allSourceIds.size} RegulatorySource records in regulatory schema\n`)

  // Check 1: SourcePointer.evidenceId (REQUIRED - not fixable)
  {
    const records = await db.sourcePointer.findMany({
      where: { evidenceId: { not: "" } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (!allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "SourcePointer",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: false, // Required field - cannot nullify
        })
      }
    }
    console.log(`✓ SourcePointer: checked ${records.length} refs`)
  }

  // Check 2: AtomicClaim.evidenceId (REQUIRED - not fixable)
  {
    const records = await db.atomicClaim.findMany({
      where: { evidenceId: { not: "" } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (!allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "AtomicClaim",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: false, // Required field - cannot nullify
        })
      }
    }
    console.log(`✓ AtomicClaim: checked ${records.length} refs`)
  }

  // Check 3: RegulatoryProcess.evidenceId (OPTIONAL - fixable)
  {
    const records = await db.regulatoryProcess.findMany({
      where: { evidenceId: { not: null } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (r.evidenceId && !allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "RegulatoryProcess",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: true, // Optional field - can nullify
        })
      }
    }
    console.log(`✓ RegulatoryProcess: checked ${records.length} refs`)
  }

  // Check 4: ReferenceTable.evidenceId (OPTIONAL - fixable)
  {
    const records = await db.referenceTable.findMany({
      where: { evidenceId: { not: null } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (r.evidenceId && !allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "ReferenceTable",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: true,
        })
      }
    }
    console.log(`✓ ReferenceTable: checked ${records.length} refs`)
  }

  // Check 5: RegulatoryAsset.evidenceId (OPTIONAL - fixable)
  {
    const records = await db.regulatoryAsset.findMany({
      where: { evidenceId: { not: null } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (r.evidenceId && !allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "RegulatoryAsset",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: true,
        })
      }
    }
    console.log(`✓ RegulatoryAsset: checked ${records.length} refs`)
  }

  // Check 6: TransitionalProvision.evidenceId (REQUIRED - not fixable)
  {
    const records = await db.transitionalProvision.findMany({
      where: { evidenceId: { not: "" } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (!allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "TransitionalProvision",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: false, // Required field - cannot nullify
        })
      }
    }
    console.log(`✓ TransitionalProvision: checked ${records.length} refs`)
  }

  // Check 7: AgentRun.evidenceId (OPTIONAL - fixable, audit-only)
  {
    const records = await db.agentRun.findMany({
      where: { evidenceId: { not: null } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (r.evidenceId && !allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "AgentRun",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: true,
        })
      }
    }
    console.log(`✓ AgentRun: checked ${records.length} refs`)
  }

  // Check 8: CoverageReport.evidenceId (REQUIRED - not fixable)
  {
    const records = await db.coverageReport.findMany({
      where: { evidenceId: { not: "" } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (!allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "CoverageReport",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: false, // Required field - cannot nullify
        })
      }
    }
    console.log(`✓ CoverageReport: checked ${records.length} refs`)
  }

  // Check 9: ComparisonMatrix.evidenceId (OPTIONAL - fixable)
  {
    const records = await db.comparisonMatrix.findMany({
      where: { evidenceId: { not: null } },
      select: { id: true, evidenceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (r.evidenceId && !allEvidenceIds.has(r.evidenceId)) {
        issues.push({
          model: "ComparisonMatrix",
          field: "evidenceId",
          orphanedId: r.id,
          referencedId: r.evidenceId,
          referencedModel: "Evidence",
          isFixable: true,
        })
      }
    }
    console.log(`✓ ComparisonMatrix: checked ${records.length} refs`)
  }

  // Check 10: WebhookSubscription.sourceId (OPTIONAL - fixable)
  // NOTE: Use scripts/cleanup-orphan-subscriptions.ts for dedicated cleanup
  {
    const records = await db.webhookSubscription.findMany({
      where: { sourceId: { not: null } },
      select: { id: true, sourceId: true },
    })
    totalChecked += records.length
    for (const r of records) {
      if (r.sourceId && !allSourceIds.has(r.sourceId)) {
        issues.push({
          model: "WebhookSubscription",
          field: "sourceId",
          orphanedId: r.id,
          referencedId: r.sourceId,
          referencedModel: "RegulatorySource",
          isFixable: true,
        })
      }
    }
    console.log(`✓ WebhookSubscription: checked ${records.length} refs`)
  }

  const fixableCount = issues.filter((i) => i.isFixable).length

  return {
    checkedAt: new Date(),
    totalChecked,
    orphansFound: issues.length,
    fixableOrphans: fixableCount,
    issues,
  }
}

async function fixOrphans(issues: IntegrityIssue[]): Promise<number> {
  let fixed = 0

  for (const issue of issues) {
    console.log(`🔧 Fixing ${issue.model}.${issue.field} = ${issue.referencedId}...`)

    try {
      // For optional fields, set to null. For required fields, we'd need to delete.
      // Currently all are optional except SourcePointer and TransitionalProvision.
      switch (issue.model) {
        case "SourcePointer":
          // Required field - cannot nullify, would need to delete or skip
          console.log(`  ⚠️  Skipped: SourcePointer.evidenceId is required`)
          break
        case "TransitionalProvision":
          // Required field - cannot nullify
          console.log(`  ⚠️  Skipped: TransitionalProvision.evidenceId is required`)
          break
        case "CoverageReport":
          // Required field - cannot nullify
          console.log(`  ⚠️  Skipped: CoverageReport.evidenceId is required`)
          break
        case "AtomicClaim":
          // Required field - cannot nullify
          console.log(`  ⚠️  Skipped: AtomicClaim.evidenceId is required`)
          break
        case "RegulatoryProcess":
          await db.regulatoryProcess.update({
            where: { id: issue.orphanedId },
            data: { evidenceId: null },
          })
          fixed++
          break
        case "ReferenceTable":
          await db.referenceTable.update({
            where: { id: issue.orphanedId },
            data: { evidenceId: null },
          })
          fixed++
          break
        case "RegulatoryAsset":
          await db.regulatoryAsset.update({
            where: { id: issue.orphanedId },
            data: { evidenceId: null },
          })
          fixed++
          break
        case "AgentRun":
          await db.agentRun.update({
            where: { id: issue.orphanedId },
            data: { evidenceId: null },
          })
          fixed++
          break
        case "ComparisonMatrix":
          await db.comparisonMatrix.update({
            where: { id: issue.orphanedId },
            data: { evidenceId: null },
          })
          fixed++
          break
        case "WebhookSubscription":
          await db.webhookSubscription.update({
            where: { id: issue.orphanedId },
            data: { sourceId: null },
          })
          fixed++
          break
      }
    } catch (error) {
      console.error(`  ❌ Failed to fix: ${error}`)
    }
  }

  return fixed
}

async function main() {
  console.log("🔍 Regulatory Soft Ref Integrity Checker")
  console.log("=".repeat(60))

  // Validate flags
  if (FIX_MODE && !CONFIRMED) {
    console.error("❌ ERROR: --fix requires --confirm flag for safety")
    console.error("")
    console.error("Usage:")
    console.error("  npx tsx scripts/check-regulatory-integrity.ts                    # Check only")
    console.error(
      "  npx tsx scripts/check-regulatory-integrity.ts --dry-run          # Show what would be fixed"
    )
    console.error(
      "  npx tsx scripts/check-regulatory-integrity.ts --fix --confirm    # Actually fix"
    )
    process.exit(2)
  }

  const mode = FIX_MODE
    ? "FIX MODE (will modify data)"
    : DRY_RUN
      ? "DRY RUN (show what would be fixed)"
      : "CHECK ONLY"
  console.log(`Mode: ${mode}\n`)

  try {
    const report = await checkSoftRefs()

    console.log("\n" + "=".repeat(60))
    console.log("📋 INTEGRITY REPORT")
    console.log("=".repeat(60))
    console.log(`Checked at:      ${report.checkedAt.toISOString()}`)
    console.log(`Total refs:      ${report.totalChecked}`)
    console.log(`Orphans found:   ${report.orphansFound}`)
    console.log(`  - Fixable:     ${report.fixableOrphans} (optional fields, can nullify)`)
    console.log(
      `  - Non-fixable: ${report.orphansFound - report.fixableOrphans} (required fields, need manual review)`
    )

    if (report.issues.length > 0) {
      // Group issues by fixability
      const fixable = report.issues.filter((i) => i.isFixable)
      const nonFixable = report.issues.filter((i) => !i.isFixable)

      if (nonFixable.length > 0) {
        console.log("\n🚨 NON-FIXABLE ORPHANS (required fields - need manual review):")
        for (const issue of nonFixable) {
          console.log(
            `  - ${issue.model}.${issue.field} = "${issue.referencedId.slice(0, 8)}..." (missing ${issue.referencedModel})`
          )
        }
      }

      if (fixable.length > 0) {
        console.log("\n⚠️  FIXABLE ORPHANS (optional fields - can be nullified):")
        for (const issue of fixable) {
          console.log(
            `  - ${issue.model}.${issue.field} = "${issue.referencedId.slice(0, 8)}..." (missing ${issue.referencedModel})`
          )
        }
      }

      if (DRY_RUN) {
        console.log("\n📝 DRY RUN - Would fix the following:")
        for (const issue of fixable) {
          console.log(
            `  UPDATE ${issue.model} SET ${issue.field} = NULL WHERE id = '${issue.orphanedId}'`
          )
        }
        console.log("\n💡 Run with --fix --confirm to apply these changes")
      } else if (FIX_MODE) {
        console.log("\n🔧 Fixing fixable orphans...")
        const fixed = await fixOrphans(fixable)
        console.log(`\n✅ Fixed ${fixed} of ${fixable.length} fixable orphans`)

        if (nonFixable.length > 0) {
          console.log(`\n⚠️  ${nonFixable.length} non-fixable orphans remain (required fields)`)
          console.log("   These require manual investigation or data restoration.")
        }
      } else {
        console.log("\n💡 Options:")
        console.log("   --dry-run    Show what would be fixed")
        console.log("   --fix --confirm  Actually fix fixable orphans")
      }

      // Exit with error if any orphans found (for CI)
      process.exit(1)
    } else {
      console.log("\n✅ No integrity issues found!")
      process.exit(0)
    }
  } catch (error) {
    console.error("❌ Integrity check failed:", error)
    process.exit(2)
  } finally {
    await db.$disconnect()
    await dbReg.$disconnect()
  }
}

void main()
