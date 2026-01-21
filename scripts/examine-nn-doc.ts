#!/usr/bin/env npx tsx
/**
 * Examine a specific NN document for coverage report
 */

import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const { dbReg } = await import("../src/lib/db")

  // Get the document - the tax info exchange one
  const evidenceId = "cmkivgiit001801rtfn33iza3"

  const evidence = await dbReg.evidence.findUnique({
    where: { id: evidenceId },
    select: {
      id: true,
      url: true,
      rawContent: true,
      fetchedAt: true,
      source: { select: { name: true, slug: true } },
    },
  })

  if (!evidence) {
    console.log("Document not found")
    return
  }

  console.log("=== Document Details ===")
  console.log("ID:", evidence.id)
  console.log("URL:", evidence.url)
  console.log("Source:", evidence.source?.name)
  console.log("Content length:", evidence.rawContent?.length, "chars")
  console.log()

  // Show first 5000 chars of content
  console.log("=== Content Preview (first 5000 chars) ===")
  console.log(evidence.rawContent?.slice(0, 5000))
  console.log("\n... [truncated] ...\n")

  // Count section markers (članak = article)
  const content = evidence.rawContent || ""
  const articleMatches = content.match(/Članak\s+\d+/gi) || []
  const stavcaMatches = content.match(/Stavak\s+\d+/gi) || []
  const tockaMatches = content.match(/Točka\s+\d+/gi) || []

  console.log("=== Document Structure Analysis ===")
  console.log("Total articles (Članak):", articleMatches.length)
  console.log("Total paragraphs (Stavak):", stavcaMatches.length)
  console.log("Total points (Točka):", tockaMatches.length)

  // TODO: CandidateFact doesn't have evidenceId directly - need to join through AgentRun
  // The model uses suggestedValueType and overallConfidence, not valueType and confidence
  // Commenting out until properly fixed
  /*
  const candidateFacts = await db.candidateFact.findMany({
    where: { evidenceId: evidenceId },
    select: {
      id: true,
      extractedValue: true,
      suggestedValueType: true,
      overallConfidence: true,
      status: true,
    }
  })

  console.log("\n=== Existing Extractions ===")
  console.log("CandidateFacts found:", candidateFacts.length)

  // Group by valueType
  const byType = new Map<string, number>()
  for (const cf of candidateFacts) {
    const t = cf.suggestedValueType || "unknown"
    byType.set(t, (byType.get(t) || 0) + 1)
  }

  console.log("\nBy value type:")
  for (const [type, count] of byType) {
    console.log(`  ${type}: ${count}`)
  }
  */

  console.log("\n=== Existing Extractions ===")
  console.log("(CandidateFact query disabled - needs AgentRun join)")

  await dbReg.$disconnect()
}

main().catch(console.error)
