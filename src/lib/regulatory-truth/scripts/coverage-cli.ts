#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/coverage-cli.ts
//
// CLI for managing knowledge shape coverage reports
//
// Usage:
//   npx tsx src/lib/regulatory-truth/scripts/coverage-cli.ts report <evidenceId>
//   npx tsx src/lib/regulatory-truth/scripts/coverage-cli.ts gate <evidenceId>
//   npx tsx src/lib/regulatory-truth/scripts/coverage-cli.ts summary
//   npx tsx src/lib/regulatory-truth/scripts/coverage-cli.ts approve <evidenceId> [reviewerId] [notes]

import {
  generateCoverageReport,
  saveCoverageReport,
  getCoverageSummary,
} from "../quality/coverage-report"
import { runCoverageGate, approveForPublication } from "../quality/coverage-gate"
import { closeCliDb } from "../cli-db"

async function main() {
  const command = process.argv[2]
  const args = process.argv.slice(3)

  switch (command) {
    case "report": {
      const evidenceId = args[0]
      if (!evidenceId) {
        console.error("Usage: coverage-cli report <evidenceId>")
        process.exit(1)
      }

      console.log(`Generating coverage report for: ${evidenceId}\n`)
      const report = await generateCoverageReport(evidenceId)

      console.log("=== Coverage Report ===")
      console.log(`Evidence ID: ${report.evidenceId}`)
      console.log(`Content Type: ${report.primaryContentType ?? "UNKNOWN"}`)
      console.log(
        `Classification Confidence: ${(report.classificationConfidence * 100).toFixed(0)}%`
      )
      console.log(`\nExtractions:`)
      console.log(`  Claims: ${report.claimsCount}`)
      console.log(`  Processes: ${report.processesCount}`)
      console.log(`  Reference Tables: ${report.referenceTablesCount}`)
      console.log(`  Assets: ${report.assetsCount}`)
      console.log(`  Provisions: ${report.provisionsCount}`)
      console.log(`  Legacy Source Pointers: ${report.sourcePointersCount}`)
      console.log(`\nScore: ${(report.coverageScore * 100).toFixed(0)}%`)
      console.log(`Complete: ${report.isComplete ? "Yes" : "No"}`)

      if (report.missingShapes.length > 0) {
        console.log(`Missing Shapes: ${report.missingShapes.join(", ")}`)
      }

      if (report.warnings.length > 0) {
        console.log(`\nWarnings:`)
        report.warnings.forEach((w) => console.log(`  - ${w}`))
      }

      // Save report
      const reportId = await saveCoverageReport(report)
      console.log(`\nReport saved with ID: ${reportId}`)
      break
    }

    case "gate": {
      const evidenceId = args[0]
      if (!evidenceId) {
        console.error("Usage: coverage-cli gate <evidenceId>")
        process.exit(1)
      }

      console.log(`Running coverage gate for: ${evidenceId}\n`)
      const result = await runCoverageGate(evidenceId)

      console.log(`Gate: ${result.passed ? "PASSED" : "BLOCKED"}`)
      console.log(`Coverage: ${(result.coverageReport.coverageScore * 100).toFixed(0)}%`)
      console.log(`Content Type: ${result.coverageReport.primaryContentType ?? "UNKNOWN"}`)

      if (result.blockers.length > 0) {
        console.log(`\nBlockers:`)
        result.blockers.forEach((b) => console.log(`  [X] ${b}`))
      }

      if (result.recommendations.length > 0) {
        console.log(`\nRecommendations:`)
        result.recommendations.forEach((r) => console.log(`  -> ${r}`))
      }

      await closeCliDb()
      process.exit(result.passed ? 0 : 1)
    }

    case "summary": {
      console.log("Fetching coverage summary...\n")
      const summary = await getCoverageSummary()

      console.log("=== Coverage Summary ===")
      console.log(`Total: ${summary.total}`)
      console.log(`Complete: ${summary.complete}`)
      console.log(`Incomplete: ${summary.incomplete}`)
      console.log(`Average Score: ${(summary.avgScore * 100).toFixed(0)}%`)

      if (Object.keys(summary.byContentType).length > 0) {
        console.log(`\nBy Content Type:`)
        for (const [type, stats] of Object.entries(summary.byContentType)) {
          console.log(
            `  ${type}: ${stats.count} records, ${(stats.avgScore * 100).toFixed(0)}% avg`
          )
        }
      } else {
        console.log(`\nNo content type data available.`)
      }
      break
    }

    case "approve": {
      const evidenceId = args[0]
      const reviewerId = args[1] || "cli-user"
      const notes = args.slice(2).join(" ") || "Approved via CLI"

      if (!evidenceId) {
        console.error("Usage: coverage-cli approve <evidenceId> [reviewerId] [notes]")
        process.exit(1)
      }

      console.log(`Approving evidence for publication: ${evidenceId}`)
      console.log(`Reviewer: ${reviewerId}`)
      console.log(`Notes: ${notes}`)

      await approveForPublication(evidenceId, reviewerId, notes)
      console.log(`\nEvidence ${evidenceId} approved for publication.`)
      break
    }

    default:
      console.log(`
Coverage CLI - Knowledge Shape Coverage Management

Commands:
  report <evidenceId>             Generate and save coverage report
  gate <evidenceId>               Run coverage gate (exit 0=pass, 1=fail)
  summary                         Show overall coverage summary
  approve <id> [reviewer] [notes] Approve evidence for publication

Examples:
  npx tsx coverage-cli.ts report clXXXXXXXX
  npx tsx coverage-cli.ts gate clXXXXXXXX
  npx tsx coverage-cli.ts summary
  npx tsx coverage-cli.ts approve clXXXXXXXX admin "Reviewed manually"
      `)
      break
  }

  await closeCliDb()
  process.exit(0)
}

main().catch((error) => {
  console.error("Error:", error)
  closeCliDb().finally(() => process.exit(1))
})
