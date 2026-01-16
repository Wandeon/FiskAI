// scripts/analyze-orphaned-evidence.ts
// Analyze the impact of orphaned evidence on rules

import { db, dbReg } from "../src/lib/db"

async function analyzeImpactAndRecovery() {
  // Get all evidence IDs
  const allEvidence = await dbReg.evidence.findMany({ select: { id: true } })
  const validEvidenceIds = new Set(allEvidence.map((e) => e.id))

  // Get all source pointers
  const allPointers = await db.sourcePointer.findMany({
    select: {
      id: true,
      evidenceId: true,
      domain: true,
      lawReference: true,
    },
  })

  // Analyze by domain
  const domainStats: Record<string, { total: number; valid: number; orphaned: number }> = {}

  for (const p of allPointers) {
    const domain = p.domain || "unknown"
    if (!domainStats[domain]) {
      domainStats[domain] = { total: 0, valid: 0, orphaned: 0 }
    }
    domainStats[domain].total++
    if (validEvidenceIds.has(p.evidenceId)) {
      domainStats[domain].valid++
    } else {
      domainStats[domain].orphaned++
    }
  }

  console.log("=== Source Pointers by Domain ===")
  for (const [domain, stats] of Object.entries(domainStats).sort(
    (a, b) => b[1].total - a[1].total
  )) {
    const pctOrphaned = ((stats.orphaned / stats.total) * 100).toFixed(0)
    console.log(
      `${domain}: ${stats.total} total, ${stats.valid} valid, ${stats.orphaned} orphaned (${pctOrphaned}%)`
    )
  }

  // Get all rules
  const allRules = await db.regulatoryRule.findMany({
    select: { id: true, conceptSlug: true, status: true },
  })

  let fullyOrphaned = 0
  let partiallyOrphaned = 0
  let fullyValid = 0

  const statusCounts: Record<string, { valid: number; orphaned: number }> = {}

  for (const rule of allRules) {
    const rulePointers = await db.sourcePointer.findMany({
      where: { rules: { some: { id: rule.id } } },
      select: { evidenceId: true },
    })

    // Initialize status counts
    const status = rule.status
    if (!statusCounts[status]) {
      statusCounts[status] = { valid: 0, orphaned: 0 }
    }

    if (rulePointers.length === 0) {
      fullyOrphaned++
      statusCounts[status].orphaned++
      continue
    }

    const validCount = rulePointers.filter((p) => validEvidenceIds.has(p.evidenceId)).length
    const orphanedCount = rulePointers.length - validCount

    if (validCount === 0) {
      fullyOrphaned++
      statusCounts[status].orphaned++
    } else if (orphanedCount > 0) {
      partiallyOrphaned++
      statusCounts[status].valid++ // Has at least some valid evidence
    } else {
      fullyValid++
      statusCounts[status].valid++
    }
  }

  console.log("\n=== Rules by Evidence Status ===")
  console.log(`Fully valid (all pointers have evidence): ${fullyValid}`)
  console.log(`Partially orphaned (some pointers missing): ${partiallyOrphaned}`)
  console.log(`Fully orphaned (no valid pointers): ${fullyOrphaned}`)
  console.log(`Total rules: ${allRules.length}`)

  console.log("\n=== Rules by Status & Evidence ===")
  for (const [status, counts] of Object.entries(statusCounts)) {
    console.log(`${status}: ${counts.valid} valid, ${counts.orphaned} orphaned`)
  }

  await db.$disconnect()
}

analyzeImpactAndRecovery().catch(console.error)
