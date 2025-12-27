// src/lib/regulatory-truth/scripts/verify-classification.ts

/**
 * Verify classification distribution after backfill.
 *
 * Usage:
 *   npx tsx src/lib/regulatory-truth/scripts/verify-classification.ts
 */

import { db } from "@/lib/db"

async function verifyClassification(): Promise<void> {
  console.log("[verify] Checking classification distribution...\n")

  // Count by nodeType
  const nodeTypeCounts = await db.discoveredItem.groupBy({
    by: ["nodeType"],
    _count: { id: true },
  })

  console.log("=== Node Types ===")
  for (const row of nodeTypeCounts) {
    console.log(`  ${row.nodeType}: ${row._count.id}`)
  }

  // Count by nodeRole
  const nodeRoleCounts = await db.discoveredItem.groupBy({
    by: ["nodeRole"],
    _count: { id: true },
  })

  console.log("\n=== Node Roles ===")
  for (const row of nodeRoleCounts) {
    console.log(`  ${row.nodeRole || "(none)"}: ${row._count.id}`)
  }

  // Count by freshnessRisk
  const riskCounts = await db.discoveredItem.groupBy({
    by: ["freshnessRisk"],
    _count: { id: true },
  })

  console.log("\n=== Freshness Risk ===")
  for (const row of riskCounts) {
    console.log(`  ${row.freshnessRisk}: ${row._count.id}`)
  }

  // Count items due now
  const dueNow = await db.discoveredItem.count({
    where: { nextScanDue: { lte: new Date() } },
  })

  console.log(`\n=== Scheduling ===`)
  console.log(`  Due now: ${dueNow}`)

  // Sample some CRITICAL items
  const criticalItems = await db.discoveredItem.findMany({
    where: { freshnessRisk: "CRITICAL" },
    take: 5,
    select: { url: true, nodeType: true, nodeRole: true },
  })

  console.log("\n=== Sample CRITICAL Items ===")
  for (const item of criticalItems) {
    console.log(`  ${item.nodeType}/${item.nodeRole}: ${item.url}`)
  }

  console.log("\n[verify] Done")
}

verifyClassification()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[verify] Error:", error)
    process.exit(1)
  })
