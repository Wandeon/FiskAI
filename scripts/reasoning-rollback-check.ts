// scripts/reasoning-rollback-check.ts
/**
 * Reasoning Rollback Check Script
 *
 * Run this script to check if the reasoning pipeline should be rolled back.
 * Exit code 0 = safe, exit code 1 = rollback recommended, exit code 2 = error
 *
 * Usage: npx tsx scripts/reasoning-rollback-check.ts
 */

import { prisma } from "@/lib/prisma"

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
}

interface RollbackCheck {
  name: string
  threshold: number
  currentValue: number
  passed: boolean
  unit?: string
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + "%"
}

function formatValue(check: RollbackCheck): string {
  if (check.unit === "ms") {
    return `${check.currentValue.toFixed(0)}ms`
  }
  if (check.unit === "%") {
    return formatPercent(check.currentValue)
  }
  return check.currentValue.toFixed(4)
}

function formatThreshold(check: RollbackCheck): string {
  if (check.unit === "ms") {
    return `${check.threshold}ms`
  }
  if (check.unit === "%") {
    return formatPercent(check.threshold)
  }
  return check.threshold.toString()
}

async function runRollbackChecks(): Promise<{
  shouldRollback: boolean
  checks: RollbackCheck[]
  traceCount: number
}> {
  const checks: RollbackCheck[] = []

  // Get recent traces (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const traces = await prisma.reasoningTrace.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
    },
  })

  if (traces.length === 0) {
    return { shouldRollback: false, checks: [], traceCount: 0 }
  }

  // Check 1: Validation failure rate < 0.5%
  const errors = traces.filter((t) => t.outcome === "ERROR")
  const validationFailures = errors.filter((t) => t.refusalReason === "VALIDATION_FAILED")
  const validationFailureRate = validationFailures.length / traces.length

  checks.push({
    name: "Validation Failure Rate",
    threshold: 0.005, // 0.5%
    currentValue: validationFailureRate,
    passed: validationFailureRate < 0.005,
    unit: "%",
  })

  // Check 2: Error rate < 2%
  const errorRate = errors.length / traces.length

  checks.push({
    name: "Error Rate",
    threshold: 0.02, // 2%
    currentValue: errorRate,
    passed: errorRate < 0.02,
    unit: "%",
  })

  // Check 3: Average duration < 5000ms
  const avgDuration = traces.reduce((sum, t) => sum + (t.durationMs || 0), 0) / traces.length

  checks.push({
    name: "Average Duration",
    threshold: 5000,
    currentValue: avgDuration,
    passed: avgDuration < 5000,
    unit: "ms",
  })

  // Check 4: High confidence disputes < 1%
  // For now, we check if there's a high rate of high-confidence answers that end up as errors
  // (This is a proxy for disputes until we have actual dispute tracking)
  const highConfidenceTraces = traces.filter((t) => (t.confidence ?? 0) >= 0.9)
  const highConfidenceErrors = highConfidenceTraces.filter((t) => t.outcome === "ERROR")
  const highConfidenceDisputeRate =
    highConfidenceTraces.length > 0 ? highConfidenceErrors.length / highConfidenceTraces.length : 0

  checks.push({
    name: "High-Confidence Dispute Rate",
    threshold: 0.01, // 1%
    currentValue: highConfidenceDisputeRate,
    passed: highConfidenceDisputeRate < 0.01,
    unit: "%",
  })

  // Determine overall rollback recommendation
  const failedChecks = checks.filter((c) => !c.passed)
  const shouldRollback = failedChecks.length > 0

  return { shouldRollback, checks, traceCount: traces.length }
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}=== Reasoning Rollback Check ===${colors.reset}\n`)
  console.log(`${colors.dim}Timestamp: ${new Date().toISOString()}${colors.reset}`)
  console.log(`${colors.dim}Checking traces from the last hour...${colors.reset}\n`)

  try {
    const { shouldRollback, checks, traceCount } = await runRollbackChecks()

    if (traceCount === 0) {
      console.log(
        `${colors.yellow}[!]${colors.reset} No traces found in the last hour. Skipping checks.`
      )
      console.log(
        `\n${colors.green}[OK]${colors.reset} RECOMMENDATION: ${colors.bold}CONTINUE${colors.reset}`
      )
      console.log(`${colors.dim}No data to analyze - assume safe.${colors.reset}`)
      process.exit(0)
    }

    console.log(
      `${colors.blue}[i]${colors.reset} Analyzed ${colors.bold}${traceCount}${colors.reset} traces\n`
    )

    // Print results
    console.log(`${colors.bold}Checks:${colors.reset}`)
    for (const check of checks) {
      const statusIcon = check.passed
        ? `${colors.green}[PASS]${colors.reset}`
        : `${colors.red}[FAIL]${colors.reset}`
      const valueColor = check.passed ? colors.green : colors.red
      console.log(
        `  ${statusIcon} ${check.name}: ${valueColor}${formatValue(check)}${colors.reset} (threshold: ${formatThreshold(check)})`
      )
    }

    console.log(`\n${colors.dim}---${colors.reset}`)

    if (shouldRollback) {
      const failedCount = checks.filter((c) => !c.passed).length
      console.log(`\n${colors.red}${colors.bold}[!] RECOMMENDATION: ROLLBACK${colors.reset}`)
      console.log(
        `${colors.yellow}${failedCount} check(s) failed. Consider rolling back to legacy pipeline.${colors.reset}`
      )
      console.log(
        `\n${colors.dim}To rollback, set REASONING_MODE=off in environment variables.${colors.reset}`
      )
      process.exit(1)
    } else {
      console.log(`\n${colors.green}${colors.bold}[OK] RECOMMENDATION: CONTINUE${colors.reset}`)
      console.log(`${colors.dim}All checks passed. Pipeline is healthy.${colors.reset}`)
      process.exit(0)
    }
  } catch (error) {
    console.error(`${colors.red}[ERROR]${colors.reset} Error running checks:`, error)
    process.exit(2)
  } finally {
    await prisma.$disconnect()
  }
}

main()
