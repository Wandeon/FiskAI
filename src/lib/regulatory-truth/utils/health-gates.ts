// src/lib/regulatory-truth/utils/health-gates.ts
import { db } from "@/lib/db"

export interface HealthGate {
  name: string
  status: "healthy" | "degraded" | "critical"
  value: number
  threshold: number
  message: string
  recommendation?: string
}

export interface HealthGateResult {
  overallHealth: "healthy" | "degraded" | "critical"
  gates: HealthGate[]
  timestamp: string
}

/**
 * Gate 1: Extraction rejection rate
 * Alert if > 20% of extractions are rejected by deterministic validators
 */
async function checkExtractionRejectionRate(): Promise<HealthGate> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

  const rejections = await db.extractionRejected.count({
    where: { createdAt: { gte: cutoff } },
  })

  const successfulExtractions = await db.sourcePointer.count({
    where: { createdAt: { gte: cutoff } },
  })

  const total = rejections + successfulExtractions
  const rejectionRate = total > 0 ? (rejections / total) * 100 : 0

  let status: "healthy" | "degraded" | "critical" = "healthy"
  let recommendation: string | undefined

  if (rejectionRate > 20) {
    status = "critical"
    recommendation =
      "High rejection rate indicates prompts may need refinement or deterministic validators are too strict. Review ExtractionRejected records by rejectionType to identify patterns."
  }

  return {
    name: "extraction_rejection_rate",
    status,
    value: Math.round(rejectionRate * 10) / 10,
    threshold: 20,
    message: `${rejections} rejected / ${total} total extractions (${rejectionRate.toFixed(1)}%)`,
    recommendation,
  }
}

/**
 * Gate 2: Quote validation rate
 * Alert if > 10% of quotes fail the "in evidence" check
 */
async function checkQuoteValidationRate(): Promise<HealthGate> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Check for rejections specifically due to quote not being in evidence
  const quoteFailures = await db.extractionRejected.count({
    where: {
      createdAt: { gte: cutoff },
      rejectionType: { in: ["NO_QUOTE_MATCH", "QUOTE_NOT_IN_EVIDENCE"] },
    },
  })

  const totalExtractions = await db.sourcePointer.count({
    where: { createdAt: { gte: cutoff } },
  })

  const totalRejections = await db.extractionRejected.count({
    where: { createdAt: { gte: cutoff } },
  })

  const total = totalExtractions + totalRejections
  const quoteFailureRate = total > 0 ? (quoteFailures / total) * 100 : 0

  let status: "healthy" | "degraded" | "critical" = "healthy"
  let recommendation: string | undefined

  if (quoteFailureRate > 10) {
    status = "critical"
    recommendation =
      "Quotes not found in evidence suggest LLM hallucination or quote extraction issues. Review extractor prompts and evidence preprocessing."
  }

  return {
    name: "quote_validation_rate",
    status,
    value: Math.round(quoteFailureRate * 10) / 10,
    threshold: 10,
    message: `${quoteFailures} quote failures / ${total} total extractions (${quoteFailureRate.toFixed(1)}%)`,
    recommendation,
  }
}

/**
 * Gate 3: T0/T1 approval compliance
 * Alert if any T0/T1 rules reach PUBLISHED without approvedBy
 */
async function checkT0T1ApprovalCompliance(): Promise<HealthGate> {
  const unapprovedCritical = await db.regulatoryRule.count({
    where: {
      riskTier: { in: ["T0", "T1"] },
      status: "PUBLISHED",
      approvedBy: null,
    },
  })

  const totalCriticalPublished = await db.regulatoryRule.count({
    where: {
      riskTier: { in: ["T0", "T1"] },
      status: "PUBLISHED",
    },
  })

  let status: "healthy" | "degraded" | "critical" = "healthy"
  let recommendation: string | undefined

  if (unapprovedCritical > 0) {
    status = "critical"
    recommendation =
      "T0/T1 rules MUST have human approval before publishing. This indicates a gate failure in the releaser. Investigate and fix immediately."
  }

  return {
    name: "t0_t1_approval_compliance",
    status,
    value: unapprovedCritical,
    threshold: 0,
    message: `${unapprovedCritical} unapproved T0/T1 rules / ${totalCriticalPublished} total critical published`,
    recommendation,
  }
}

/**
 * Gate 4: Source pointer coverage
 * Alert if > 5% of rules have no source pointers
 */
async function checkSourcePointerCoverage(): Promise<HealthGate> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days

  // Count rules without source pointers
  const rulesWithoutPointers = await db.regulatoryRule.count({
    where: {
      createdAt: { gte: cutoff },
      sourcePointers: {
        none: {},
      },
    },
  })

  const totalRules = await db.regulatoryRule.count({
    where: { createdAt: { gte: cutoff } },
  })

  const missingPointerRate = totalRules > 0 ? (rulesWithoutPointers / totalRules) * 100 : 0

  let status: "healthy" | "degraded" | "critical" = "healthy"
  let recommendation: string | undefined

  if (missingPointerRate > 5) {
    status = "critical"
    recommendation =
      "Rules without source pointers lack traceability. Check composer validation logic to ensure source pointers are required."
  }

  return {
    name: "source_pointer_coverage",
    status,
    value: Math.round(missingPointerRate * 10) / 10,
    threshold: 5,
    message: `${rulesWithoutPointers} rules without pointers / ${totalRules} total rules (${missingPointerRate.toFixed(1)}%)`,
    recommendation,
  }
}

/**
 * Gate 5: Conflict resolution rate
 * Alert if > 50% of conflicts are unresolved after 7 days
 */
async function checkConflictResolutionRate(): Promise<HealthGate> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const unresolvedOldConflicts = await db.regulatoryConflict.count({
    where: {
      status: "OPEN",
      createdAt: { lte: cutoff },
    },
  })

  const totalOldConflicts = await db.regulatoryConflict.count({
    where: {
      createdAt: { lte: cutoff },
    },
  })

  const unresolvedRate =
    totalOldConflicts > 0 ? (unresolvedOldConflicts / totalOldConflicts) * 100 : 0

  let status: "healthy" | "degraded" | "critical" = "healthy"
  let recommendation: string | undefined

  if (unresolvedRate > 50) {
    status = "critical"
    recommendation =
      "High unresolved conflict rate indicates conflict resolution agent is not running or failing. Check arbiter agent logs and queue health."
  } else if (unresolvedRate > 30) {
    status = "degraded"
    recommendation =
      "Conflicts are accumulating. Consider reviewing arbiter confidence thresholds or increasing human review capacity."
  }

  return {
    name: "conflict_resolution_rate",
    status,
    value: Math.round(unresolvedRate * 10) / 10,
    threshold: 50,
    message: `${unresolvedOldConflicts} unresolved / ${totalOldConflicts} total conflicts >7 days (${unresolvedRate.toFixed(1)}%)`,
    recommendation,
  }
}

/**
 * Run all health gate checks
 */
export async function checkHealthGates(): Promise<HealthGateResult> {
  const gates: HealthGate[] = []

  try {
    gates.push(await checkExtractionRejectionRate())
  } catch (error) {
    gates.push({
      name: "extraction_rejection_rate",
      status: "critical",
      value: -1,
      threshold: 20,
      message: `Error checking: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  try {
    gates.push(await checkQuoteValidationRate())
  } catch (error) {
    gates.push({
      name: "quote_validation_rate",
      status: "critical",
      value: -1,
      threshold: 10,
      message: `Error checking: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  try {
    gates.push(await checkT0T1ApprovalCompliance())
  } catch (error) {
    gates.push({
      name: "t0_t1_approval_compliance",
      status: "critical",
      value: -1,
      threshold: 0,
      message: `Error checking: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  try {
    gates.push(await checkSourcePointerCoverage())
  } catch (error) {
    gates.push({
      name: "source_pointer_coverage",
      status: "critical",
      value: -1,
      threshold: 5,
      message: `Error checking: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  try {
    gates.push(await checkConflictResolutionRate())
  } catch (error) {
    gates.push({
      name: "conflict_resolution_rate",
      status: "critical",
      value: -1,
      threshold: 50,
      message: `Error checking: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // Determine overall health
  const overallHealth = getOverallHealth(gates)

  return {
    overallHealth,
    gates,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Determine overall health status from gates
 */
export function getOverallHealth(gates: HealthGate[]): "healthy" | "degraded" | "critical" {
  if (gates.some((g) => g.status === "critical")) return "critical"
  if (gates.some((g) => g.status === "degraded")) return "degraded"
  return "healthy"
}
