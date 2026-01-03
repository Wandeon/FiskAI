#!/usr/bin/env npx tsx
/**
 * Regulatory Soft Ref Integrity Checker
 *
 * Checks for orphaned soft references between core and regulatory schemas.
 * Run daily or before deployments to catch integrity drift.
 *
 * Usage:
 *   npx tsx scripts/check-regulatory-integrity.ts
 *   npx tsx scripts/check-regulatory-integrity.ts --fix  # Clean up orphans
 */

import { db } from "@/lib/db"
import { dbReg } from "@/lib/db/regulatory"

interface IntegrityIssue {
  model: string
  field: string
  orphanedId: string
  referencedId: string
  referencedModel: string
}

interface IntegrityReport {
  checkedAt: Date
  totalChecked: number
  orphansFound: number
  issues: IntegrityIssue[]
}

const FIX_MODE = process.argv.includes("--fix")

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

  // Check 1: SourcePointer.evidenceId
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
        })
      }
    }
    console.log(`✓ SourcePointer: checked ${records.length} refs`)
  }

  // Check 2: AtomicClaim.evidenceId
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
        })
      }
    }
    console.log(`✓ AtomicClaim: checked ${records.length} refs`)
  }

  // Check 3: RegulatoryProcess.evidenceId
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
        })
      }
    }
    console.log(`✓ RegulatoryProcess: checked ${records.length} refs`)
  }

  // Check 4: ReferenceTable.evidenceId
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
        })
      }
    }
    console.log(`✓ ReferenceTable: checked ${records.length} refs`)
  }

  // Check 5: RegulatoryAsset.evidenceId
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
        })
      }
    }
    console.log(`✓ RegulatoryAsset: checked ${records.length} refs`)
  }

  // Check 6: TransitionalProvision.evidenceId
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
        })
      }
    }
    console.log(`✓ TransitionalProvision: checked ${records.length} refs`)
  }

  // Check 7: AgentRun.evidenceId (audit-only, lower priority)
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
        })
      }
    }
    console.log(`✓ AgentRun: checked ${records.length} refs`)
  }

  // Check 8: CoverageReport.evidenceId
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
        })
      }
    }
    console.log(`✓ CoverageReport: checked ${records.length} refs`)
  }

  // Check 9: ComparisonMatrix.evidenceId
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
        })
      }
    }
    console.log(`✓ ComparisonMatrix: checked ${records.length} refs`)
  }

  // Check 10: WebhookSubscription.sourceId
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
        })
      }
    }
    console.log(`✓ WebhookSubscription: checked ${records.length} refs`)
  }

  return {
    checkedAt: new Date(),
    totalChecked,
    orphansFound: issues.length,
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
  try {
    const report = await checkSoftRefs()

    console.log("\n" + "=".repeat(60))
    console.log("📋 INTEGRITY REPORT")
    console.log("=".repeat(60))
    console.log(`Checked at: ${report.checkedAt.toISOString()}`)
    console.log(`Total refs checked: ${report.totalChecked}`)
    console.log(`Orphans found: ${report.orphansFound}`)

    if (report.issues.length > 0) {
      console.log("\n⚠️  ORPHANED REFERENCES:")
      for (const issue of report.issues) {
        console.log(
          `  - ${issue.model}.${issue.field} = "${issue.referencedId}" (missing ${issue.referencedModel})`
        )
      }

      if (FIX_MODE) {
        console.log("\n🔧 Attempting to fix orphans...")
        const fixed = await fixOrphans(report.issues)
        console.log(`✅ Fixed ${fixed} of ${report.issues.length} orphans`)
      } else {
        console.log("\n💡 Run with --fix to clean up optional orphan references")
      }

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
