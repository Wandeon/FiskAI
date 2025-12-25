import { db } from "../src/lib/db"

async function checkCounts() {
  console.log("=== REGULATORY RULE COUNTS BY STATUS ===")
  const rulesByStatus =
    await db.$queryRaw`SELECT status, COUNT(*)::int as count FROM "RegulatoryRule" GROUP BY status ORDER BY count DESC`
  console.log(JSON.stringify(rulesByStatus, null, 2))

  console.log("\n=== EVIDENCE COUNT ===")
  const evidenceCount = await db.evidence.count()
  console.log("Evidence records:", evidenceCount)

  console.log("\n=== SOURCE POINTER COUNT ===")
  const sourcePointerCount = await db.sourcePointer.count()
  console.log("SourcePointer records:", sourcePointerCount)

  console.log("\n=== CONCEPT COUNT ===")
  const conceptCount = await db.concept.count()
  console.log("Concept records:", conceptCount)

  console.log("\n=== SAMPLE PUBLISHED RULE WITH SOURCE POINTER ===")
  const sampleRule = await db.regulatoryRule.findFirst({
    where: { status: "PUBLISHED" },
    include: {
      sourcePointers: {
        include: {
          evidence: true,
        },
      },
      concept: true,
    },
  })
  if (sampleRule) {
    console.log("Rule ID:", sampleRule.id)
    console.log("Title:", sampleRule.titleHr)
    console.log("Concept:", sampleRule.concept?.slug)
    console.log("SourcePointers:", sampleRule.sourcePointers.length)
    if (sampleRule.sourcePointers[0]) {
      console.log("  - Quote:", sampleRule.sourcePointers[0].exactQuote?.substring(0, 100))
      console.log("  - Evidence URL:", sampleRule.sourcePointers[0].evidence?.url)
      console.log("  - Evidence ID:", sampleRule.sourcePointers[0].evidenceId)
      console.log("  - FetchedAt:", sampleRule.sourcePointers[0].evidence?.fetchedAt)
    }
  } else {
    console.log("NO PUBLISHED RULES FOUND")
  }

  await db.$disconnect()
}

checkCounts().catch(console.error)
