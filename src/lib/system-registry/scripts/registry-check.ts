#!/usr/bin/env npx tsx
/**
 * Registry Check Script
 *
 * Runs harvesters, computes drift, and enforces rules.
 * This is the CI entry point.
 *
 * Usage:
 *   npx tsx src/lib/system-registry/scripts/registry-check.ts
 *
 * Options:
 *   --json         Output JSON instead of markdown
 *   --fail-on-warn Treat warnings as failures
 *   --write-report Write drift-report.md to docs/system-registry/
 */

import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { harvestAll } from "../harvesters"
import {
  computeDrift,
  enforceRules,
  formatDriftMarkdown,
  HARVESTED_TYPES,
  UNHARVESTED_TYPES,
} from "../compute-drift"
import { ALL_COMPONENTS as DECLARED_COMPONENTS } from "../declarations"

interface Options {
  json: boolean
  failOnWarn: boolean
  writeReport: boolean
  projectRoot: string
}

function parseArgs(): Options {
  const args = process.argv.slice(2)
  return {
    json: args.includes("--json"),
    failOnWarn: args.includes("--fail-on-warn"),
    writeReport: args.includes("--write-report"),
    projectRoot: args.find((a) => !a.startsWith("--")) || process.cwd(),
  }
}

async function main() {
  const options = parseArgs()
  const startTime = Date.now()

  console.error("🔍 Running System Registry Check...")
  console.error("")

  // Step 1: Harvest all components
  console.error("📥 Harvesting observed components...")
  console.error(`   Harvested types: ${HARVESTED_TYPES.join(", ")}`)
  console.error(`   Unharvested types (codeRef verified): ${UNHARVESTED_TYPES.join(", ")}`)
  console.error("")

  const harvestResult = await harvestAll(options.projectRoot)

  console.error(`   Found ${harvestResult.components.length} components (harvested types only)`)
  for (const r of harvestResult.metadata.harvesterResults) {
    console.error(`   - ${r.name}: ${r.componentCount} (${r.durationMs}ms)`)
  }
  console.error("")

  // Step 2: Compute drift (with codeRef verification for unharvested types)
  console.error("📊 Computing drift (+ codeRef verification for unharvested types)...")
  const driftResult = computeDrift(
    harvestResult.components,
    DECLARED_COMPONENTS,
    options.projectRoot
  )

  console.error("")
  console.error("   Type Coverage Matrix:")
  console.error("   ┌──────────────┬───────────┬──────────┬──────────┬────────────┐")
  console.error("   │ Type         │ Harvested │ Declared │ Observed │ CodeRef OK │")
  console.error("   ├──────────────┼───────────┼──────────┼──────────┼────────────┤")
  for (const tc of driftResult.typeCoverage) {
    const harvested = tc.harvested ? "Yes" : "No"
    const observed = tc.harvested ? String(tc.observed).padStart(8) : "   -    "
    const codeRefOk = tc.harvested ? "   -    " : String(tc.codeRefVerified).padStart(8)
    console.error(
      `   │ ${tc.type.padEnd(12)} │ ${harvested.padStart(9)} │ ${String(tc.declared).padStart(8)} │ ${observed} │ ${codeRefOk}   │`
    )
  }
  console.error("   └──────────────┴───────────┴──────────┴──────────┴────────────┘")
  console.error("")

  console.error("   Summary:")
  console.error(`   - Observed (Harvested):     ${driftResult.summary.observedHarvested}`)
  console.error(`   - Declared (Total):         ${driftResult.summary.declaredTotal}`)
  console.error(`   - Declared (Unharvested):   ${driftResult.summary.declaredUnharvested}`)
  console.error(`   - Observed Not Declared:    ${driftResult.summary.observedNotDeclaredCount}`)
  console.error(`   - Declared Not Observed:    ${driftResult.summary.declaredNotObservedCount}`)
  console.error(`   - CodeRef Missing:          ${driftResult.summary.codeRefMissingCount}`)
  console.error(`   - Metadata Gaps:            ${driftResult.summary.metadataGapCount}`)
  console.error("")

  // Step 3: Enforce rules
  console.error("⚖️  Enforcing rules...")
  const enforcementResult = enforceRules(driftResult)

  console.error(`   Failures: ${enforcementResult.failures.length}`)
  console.error(`   Warnings: ${enforcementResult.warnings.length}`)
  console.error("")

  // Step 4: Output results
  if (options.writeReport) {
    const reportPath = join(options.projectRoot, "docs/system-registry/drift-report-ci.md")
    mkdirSync(dirname(reportPath), { recursive: true })
    const markdown = formatDriftMarkdown(driftResult, enforcementResult)
    writeFileSync(reportPath, markdown)
    console.error(`📝 Report written to: ${reportPath}`)
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: "1.0.0",
          harvest: harvestResult,
          drift: driftResult,
          enforcement: enforcementResult,
          metadata: {
            executedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            harvestedTypes: HARVESTED_TYPES,
            unharvestedTypes: UNHARVESTED_TYPES,
          },
        },
        null,
        2
      )
    )
  } else {
    console.log(formatDriftMarkdown(driftResult, enforcementResult))
  }

  // Step 5: Exit with appropriate code
  const failed = options.failOnWarn
    ? !enforcementResult.passed || enforcementResult.warnings.length > 0
    : !enforcementResult.passed

  if (failed) {
    console.error("")
    console.error("❌ Registry check FAILED")
    console.error("")
    if (enforcementResult.failures.length > 0) {
      console.error("Failures (must fix before merge):")
      for (const f of enforcementResult.failures) {
        console.error(`  ❌ ${f.componentId} (${f.type}): ${f.message}`)
      }
    }
    process.exit(1)
  } else {
    console.error("")
    console.error("✅ Registry check PASSED")
    if (enforcementResult.warnings.length > 0) {
      console.error("")
      console.error("Warnings (should address soon):")
      for (const w of enforcementResult.warnings) {
        console.error(`  ⚠️  ${w.componentId} (${w.type}): ${w.message}`)
      }
    }
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
