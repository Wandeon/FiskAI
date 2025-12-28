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
import { computeDrift, enforceRules, formatDriftMarkdown } from "../compute-drift"
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
  const harvestResult = await harvestAll(options.projectRoot)

  console.error(`   Found ${harvestResult.components.length} components`)
  for (const r of harvestResult.metadata.harvesterResults) {
    console.error(`   - ${r.name}: ${r.componentCount} components (${r.durationMs}ms)`)
  }
  console.error("")

  // Step 2: Compute drift
  console.error("📊 Computing drift...")
  const driftResult = computeDrift(harvestResult.components, DECLARED_COMPONENTS)

  console.error(`   Observed: ${driftResult.summary.totalObserved}`)
  console.error(`   Declared: ${driftResult.summary.totalDeclared}`)
  console.error(`   Observed Not Declared: ${driftResult.summary.observedNotDeclaredCount}`)
  console.error(`   Declared Not Observed: ${driftResult.summary.declaredNotObservedCount}`)
  console.error(`   Metadata Gaps: ${driftResult.summary.metadataGapCount}`)
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
          harvest: harvestResult,
          drift: driftResult,
          enforcement: enforcementResult,
          metadata: {
            executedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
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
      console.error("Failures:")
      for (const f of enforcementResult.failures) {
        console.error(`  - ${f.componentId}: ${f.message}`)
      }
    }
    process.exit(1)
  } else {
    console.error("")
    console.error("✅ Registry check PASSED")
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
