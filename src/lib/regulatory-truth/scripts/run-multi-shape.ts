// src/lib/regulatory-truth/scripts/run-multi-shape.ts
import { runMultiShapeExtraction } from "../agents/multi-shape-extractor"

async function main() {
  const evidenceId = process.argv[2]

  if (!evidenceId) {
    console.error("Usage: npx tsx src/lib/regulatory-truth/scripts/run-multi-shape.ts <evidenceId>")
    process.exit(1)
  }

  console.log(`Running multi-shape extraction for evidence: ${evidenceId}`)

  const result = await runMultiShapeExtraction(evidenceId)

  console.log("\n=== Extraction Result ===")
  console.log(`Success: ${result.success}`)

  if (result.classification) {
    console.log(`\nClassification:`)
    console.log(`  Primary Type: ${result.classification.primaryType}`)
    console.log(`  Confidence: ${result.classification.confidence}`)
    console.log(`  Reasoning: ${result.classification.reasoning}`)
  }

  console.log(`\nExtracted Shapes:`)
  console.log(`  Claims: ${result.extractedShapes.claims.length}`)
  console.log(`  Processes: ${result.extractedShapes.processes.length}`)
  console.log(`  Reference Tables: ${result.extractedShapes.tables.length}`)
  console.log(`  Assets: ${result.extractedShapes.assets.length}`)
  console.log(`  Transitional Provisions: ${result.extractedShapes.provisions.length}`)

  if (result.errors.length > 0) {
    console.log(`\nErrors:`)
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`)
    })
  }

  process.exit(result.success ? 0 : 1)
}

main().catch(console.error)
