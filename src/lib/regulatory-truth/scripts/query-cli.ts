// src/lib/regulatory-truth/scripts/query-cli.ts
/**
 * CLI for testing the query router and retrieval engines.
 *
 * Usage:
 *   npx tsx src/lib/regulatory-truth/scripts/query-cli.ts <query>
 *
 * Examples:
 *   npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "Koja je stopa PDV-a za sok?"
 *   npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "How do I register for OSS?"
 *   npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "IBAN za Split"
 *   npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "Gdje je obrazac PDV-P?"
 */

import { routeQuery, detectIntentFromPatterns } from "../retrieval/query-router"

function printUsage() {
  console.log(`
Query CLI - Test the retrieval router

Usage:
  npx tsx src/lib/regulatory-truth/scripts/query-cli.ts <query>

Examples:
  npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "Koja je stopa PDV-a za sok?"
  npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "How do I register for OSS?"
  npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "IBAN za Split"
  npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "Gdje je obrazac PDV-P?"
  npx tsx src/lib/regulatory-truth/scripts/query-cli.ts "Prijelazne odredbe za PDV stopu"

Intent Types:
  LOGIC     - Questions about rules, thresholds, rates, obligations
  PROCESS   - Questions about procedures, steps, workflows
  REFERENCE - Requests for specific lookup values (IBANs, codes)
  DOCUMENT  - Requests for forms, templates, documents
  TEMPORAL  - Questions about transitional provisions, date-based rules
  GENERAL   - Other questions that don't fit above

Options:
  --pattern-only   Only test pattern-based detection (no LLM, no DB)
  --verbose        Show extra debug information
`)
}

async function main() {
  const args = process.argv.slice(2)

  // Parse options
  const patternOnly = args.includes("--pattern-only")
  const verbose = args.includes("--verbose")

  // Remove options from args
  const queryArgs = args.filter((arg) => !arg.startsWith("--"))
  const query = queryArgs.join(" ")

  if (!query) {
    printUsage()
    process.exit(0)
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`Query: "${query}"`)
  console.log(`${"=".repeat(60)}\n`)

  // Always show pattern-based detection first (fast, no dependencies)
  console.log("[1] Pattern-Based Detection (fast)")
  console.log("-".repeat(40))
  const patternIntent = detectIntentFromPatterns(query)
  if (patternIntent) {
    console.log(`  Intent: ${patternIntent}`)
    console.log(`  Confidence: 0.85 (pattern match)`)
  } else {
    console.log(`  No pattern matched - would fall back to LLM classification`)
  }
  console.log()

  if (patternOnly) {
    console.log("[Skipping full routing - --pattern-only mode]")
    process.exit(patternIntent ? 0 : 1)
  }

  // Full routing with LLM and database
  console.log("[2] Full Query Routing")
  console.log("-".repeat(40))
  console.log("  Routing query...")

  try {
    const result = await routeQuery(query)

    console.log()
    console.log("=== Classification ===")
    if (result.classification) {
      console.log(`  Intent: ${result.classification.intent}`)
      console.log(`  Confidence: ${result.classification.confidence}`)
      console.log(`  Engines: ${result.classification.suggestedEngines.join(", ")}`)
      console.log(`  Reasoning: ${result.classification.reasoning}`)

      const entities = result.classification.extractedEntities
      const hasEntities = Object.values(entities).some((arr) => arr.length > 0)

      if (hasEntities) {
        console.log()
        console.log("  Extracted Entities:")
        if (entities.subjects.length) console.log(`    Subjects: ${entities.subjects.join(", ")}`)
        if (entities.conditions.length)
          console.log(`    Conditions: ${entities.conditions.join(", ")}`)
        if (entities.products.length) console.log(`    Products: ${entities.products.join(", ")}`)
        if (entities.locations.length)
          console.log(`    Locations: ${entities.locations.join(", ")}`)
        if (entities.dates.length) console.log(`    Dates: ${entities.dates.join(", ")}`)
        if (entities.formCodes.length)
          console.log(`    Form Codes: ${entities.formCodes.join(", ")}`)
      }
    }

    console.log()
    console.log("=== Engine Response ===")
    if (result.success) {
      if (verbose) {
        console.log(JSON.stringify(result.response, null, 2))
      } else {
        // Pretty print based on response type
        const response = result.response as Record<string, unknown>

        if (response.answer) {
          // Logic engine response
          console.log(`  Success: ${response.success}`)
          const answer = response.answer as Record<string, unknown>
          if (answer.value) console.log(`  Value: ${answer.value}`)
          if (answer.assertion) console.log(`  Assertion: ${answer.assertion}`)
          console.log(`  Reasoning: ${response.reasoning}`)
          if ((response.rules as unknown[])?.length) {
            console.log(`  Rules found: ${(response.rules as unknown[]).length}`)
          }
        } else if (response.process) {
          // Process engine response
          const proc = response.process as Record<string, unknown>
          console.log(`  Process: ${proc.titleHr}`)
          console.log(`  Type: ${proc.processType}`)
          console.log(`  Steps: ${(response.steps as unknown[])?.length ?? 0}`)
          console.log(`  Reasoning: ${response.reasoning}`)
        } else if (response.value !== undefined) {
          // Reference engine response
          console.log(`  Value: ${response.value}`)
          if (response.table) {
            const table = response.table as Record<string, unknown>
            console.log(`  Table: ${table.name}`)
          }
          console.log(`  Reasoning: ${response.reasoning}`)
        } else if (response.asset) {
          // Asset engine response
          const asset = response.asset as Record<string, unknown>
          console.log(`  Asset: ${asset.officialName}`)
          if (asset.formCode) console.log(`  Form Code: ${asset.formCode}`)
          console.log(`  Download URL: ${asset.downloadUrl}`)
          console.log(`  Reasoning: ${response.reasoning}`)
        } else if (response.provision) {
          // Temporal engine response
          const provision = response.provision as Record<string, unknown>
          console.log(`  From Rule: ${provision.fromRule}`)
          console.log(`  To Rule: ${provision.toRule}`)
          console.log(`  Cutoff Date: ${provision.cutoffDate}`)
          console.log(`  Applicable Rule: ${response.applicableRule}`)
          console.log(`  Reasoning: ${response.reasoning}`)
        } else {
          // Unknown response format
          console.log(JSON.stringify(response, null, 2))
        }
      }
    } else {
      console.log(`  Error: ${result.error}`)
    }

    console.log()
    process.exit(result.success ? 0 : 1)
  } catch (error) {
    console.error()
    console.error("Error:", error instanceof Error ? error.message : String(error))
    if (verbose && error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
