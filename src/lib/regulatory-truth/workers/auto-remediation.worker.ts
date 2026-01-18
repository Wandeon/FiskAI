// src/lib/regulatory-truth/workers/auto-remediation.worker.ts
//
// Auto-Remediation Worker - RTL Self-Improvement (Priority 4B)
//
// Purpose: Automatically remediate common failure patterns without human intervention.
// Runs pattern-matched rules against the current system state and takes corrective actions.
//
// Remediation Rules:
// - Quote not found → queue for quote repair
// - Source unavailable → retry after 24h
// - Confidence below threshold → queue for revalidation
// - 5+ failures same source → disable source, alert operator

import { Job } from "bullmq"
import { createWorker, setupGracefulShutdown, type JobResult } from "./base"
import { autoRemediationQueue, quoteHealerQueue, extractQueue } from "./queues"
import { jobsProcessed, jobDuration } from "./metrics"
import { db, dbReg } from "@/lib/db"
import { raiseAlert } from "../watchdog/alerting"
import { FeatureFlags } from "./utils/feature-flags"

/**
 * Job data for auto-remediation worker
 */
interface AutoRemediationJobData {
  /** Run all remediation rules */
  runAllRules?: boolean
  /** Specific rule to run */
  specificRule?: keyof typeof REMEDIATION_RULES
  /** Correlation ID for tracking */
  runId?: string
}

/**
 * Remediation action result
 */
interface RemediationAction {
  rule: string
  matched: number
  remediated: number
  failed: number
  details: string[]
}

/**
 * Overall remediation cycle result
 */
interface RemediationCycleResult {
  actions: RemediationAction[]
  totalMatched: number
  totalRemediated: number
  totalFailed: number
}

/**
 * Remediation rule definition
 */
interface RemediationRule {
  name: string
  description: string
  matcher: () => Promise<number> // Returns count of matching items
  action: () => Promise<RemediationAction>
}

/**
 * Remediation rules configuration
 */
const REMEDIATION_RULES: Record<string, RemediationRule> = {
  quoteNotFound: {
    name: "Quote Not Found",
    description: "Queue extractions with quote validation failures for quote repair",
    matcher: async () => {
      return await dbReg.extractionRejected.count({
        where: {
          rejectionType: "QUOTE_NOT_IN_EVIDENCE",
          resolvedAt: null,
          attemptCount: { lt: 5 },
        },
      })
    },
    action: async () => {
      const action: RemediationAction = {
        rule: "quoteNotFound",
        matched: 0,
        remediated: 0,
        failed: 0,
        details: [],
      }

      // Find unresolved quote failures
      const failures = await dbReg.extractionRejected.findMany({
        where: {
          rejectionType: "QUOTE_NOT_IN_EVIDENCE",
          resolvedAt: null,
          attemptCount: { lt: 5 },
        },
        take: 50,
        select: { id: true, evidenceId: true },
      })

      action.matched = failures.length

      if (failures.length > 0) {
        // Queue for quote repair
        try {
          await quoteHealerQueue.add(
            "heal",
            { batchMode: true, batchLimit: failures.length },
            { jobId: `auto-heal-quotes-${Date.now()}` }
          )
          action.remediated = failures.length
          action.details.push(`Queued ${failures.length} quote failures for repair`)
        } catch (error) {
          action.failed = failures.length
          action.details.push(
            `Failed to queue quote repairs: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      return action
    },
  },

  sourceUnavailable: {
    name: "Source Unavailable",
    description: "Mark stale sources for retry after 24 hours",
    matcher: async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 1) // 24 hours ago

      return await dbReg.extractionRejected.count({
        where: {
          rejectionType: { in: ["SOURCE_UNAVAILABLE", "FETCH_ERROR"] },
          resolvedAt: null,
          lastAttemptAt: { lt: cutoff },
        },
      })
    },
    action: async () => {
      const action: RemediationAction = {
        rule: "sourceUnavailable",
        matched: 0,
        remediated: 0,
        failed: 0,
        details: [],
      }

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 1)

      // Find source errors that are old enough to retry
      const failures = await dbReg.extractionRejected.findMany({
        where: {
          rejectionType: { in: ["SOURCE_UNAVAILABLE", "FETCH_ERROR"] },
          resolvedAt: null,
          lastAttemptAt: { lt: cutoff },
          attemptCount: { lt: 3 },
        },
        take: 20,
        select: { id: true, evidenceId: true, attemptCount: true },
      })

      action.matched = failures.length

      for (const failure of failures) {
        try {
          // Queue for re-extraction
          await extractQueue.add(
            "extract",
            { evidenceId: failure.evidenceId, runId: `auto-retry-${Date.now()}` },
            {
              jobId: `auto-retry-${failure.evidenceId}-${Date.now()}`,
              delay: 5000,
            }
          )

          // Update attempt tracking
          await dbReg.extractionRejected.update({
            where: { id: failure.id },
            data: {
              attemptCount: { increment: 1 },
              lastAttemptAt: new Date(),
            },
          })

          action.remediated++
        } catch (error) {
          action.failed++
          action.details.push(
            `Failed to retry ${failure.evidenceId}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      if (action.remediated > 0) {
        action.details.push(`Queued ${action.remediated} source errors for retry`)
      }

      return action
    },
  },

  lowConfidenceRules: {
    name: "Low Confidence Rules",
    description: "Queue approved rules with low confidence for revalidation",
    matcher: async () => {
      return await db.regulatoryRule.count({
        where: {
          status: "APPROVED",
          confidence: { lt: 0.6 },
          updatedAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Older than 7 days
          },
        },
      })
    },
    action: async () => {
      const action: RemediationAction = {
        rule: "lowConfidenceRules",
        matched: 0,
        remediated: 0,
        failed: 0,
        details: [],
      }

      // Find low-confidence approved rules
      const rules = await db.regulatoryRule.findMany({
        where: {
          status: "APPROVED",
          confidence: { lt: 0.6 },
          updatedAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        take: 10,
        select: { id: true, conceptSlug: true, confidence: true },
      })

      action.matched = rules.length

      // Queue rules for revalidation (re-extract from evidence)
      for (const rule of rules) {
        try {
          // Find the source pointer for this rule
          const pointer = await dbReg.sourcePointer.findFirst({
            where: { ruleFactId: rule.id },
            select: { evidenceId: true },
          })

          if (pointer?.evidenceId) {
            await extractQueue.add(
              "extract",
              {
                evidenceId: pointer.evidenceId,
                runId: `revalidate-${rule.id}`,
                forceRevalidation: true,
              },
              {
                jobId: `revalidate-${rule.id}-${Date.now()}`,
                delay: 10000,
              }
            )
            action.remediated++
          } else {
            action.failed++
            action.details.push(`No source pointer for rule ${rule.conceptSlug}`)
          }
        } catch (error) {
          action.failed++
          action.details.push(
            `Failed to queue ${rule.conceptSlug}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      if (action.remediated > 0) {
        action.details.push(`Queued ${action.remediated} low-confidence rules for revalidation`)
      }

      return action
    },
  },

  repeatedSourceFailures: {
    name: "Repeated Source Failures",
    description: "Disable sources with 5+ consecutive failures and alert operator",
    matcher: async () => {
      // Count sources with 5+ recent failures
      const recentCutoff = new Date()
      recentCutoff.setDate(recentCutoff.getDate() - 7)

      const failureCounts = await dbReg.extractionRejected.groupBy({
        by: ["evidenceId"],
        where: {
          createdAt: { gte: recentCutoff },
          resolvedAt: null,
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: 5 } },
        },
      })

      return failureCounts.length
    },
    action: async () => {
      const action: RemediationAction = {
        rule: "repeatedSourceFailures",
        matched: 0,
        remediated: 0,
        failed: 0,
        details: [],
      }

      const recentCutoff = new Date()
      recentCutoff.setDate(recentCutoff.getDate() - 7)

      // Find sources with repeated failures
      const failureCounts = await dbReg.extractionRejected.groupBy({
        by: ["evidenceId"],
        where: {
          createdAt: { gte: recentCutoff },
          resolvedAt: null,
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: 5 } },
        },
      })

      action.matched = failureCounts.length

      // Get source information for each problematic evidence
      const problematicSources = new Set<string>()

      for (const failure of failureCounts) {
        try {
          const evidence = await dbReg.evidence.findUnique({
            where: { id: failure.evidenceId },
            select: { sourceId: true },
          })

          if (evidence?.sourceId) {
            problematicSources.add(evidence.sourceId)
          }
        } catch {
          // Continue processing other failures
        }
      }

      // Alert and optionally disable sources
      for (const sourceId of problematicSources) {
        try {
          const source = await dbReg.regulatorySource.findUnique({
            where: { id: sourceId },
            select: { name: true, isActive: true },
          })

          if (source?.isActive) {
            // Raise alert for operator
            await raiseAlert({
              severity: "WARNING",
              type: "HIGH_REJECTION_RATE",
              entityId: sourceId,
              message: `Source "${source.name}" has 5+ consecutive failures. Consider disabling.`,
              details: {
                sourceId,
                sourceName: source.name,
                failureCount: failureCounts.filter((f) => f.evidenceId === sourceId).length,
                autoRemediation: true,
              },
            })

            action.remediated++
            action.details.push(`Alerted operator about failing source: ${source.name}`)

            // Note: Not auto-disabling to avoid data loss without explicit approval
            // This can be enabled with a flag if desired
          }
        } catch (error) {
          action.failed++
          action.details.push(
            `Failed to process source ${sourceId}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      return action
    },
  },

  staleApprovedRules: {
    name: "Stale Approved Rules",
    description: "Alert about rules stuck in APPROVED status for too long",
    matcher: async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 14) // 2 weeks

      return await db.regulatoryRule.count({
        where: {
          status: "APPROVED",
          updatedAt: { lt: cutoff },
        },
      })
    },
    action: async () => {
      const action: RemediationAction = {
        rule: "staleApprovedRules",
        matched: 0,
        remediated: 0,
        failed: 0,
        details: [],
      }

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 14)

      const staleRules = await db.regulatoryRule.count({
        where: {
          status: "APPROVED",
          updatedAt: { lt: cutoff },
        },
      })

      action.matched = staleRules

      if (staleRules > 10) {
        // Alert operator about backlog
        await raiseAlert({
          severity: "WARNING",
          type: "HIGH_REJECTION_RATE", // Using existing alert type
          entityId: "stale-approved-rules",
          message: `${staleRules} rules stuck in APPROVED status for 14+ days. Review publication pipeline.`,
          details: {
            staleCount: staleRules,
            threshold: 10,
            ageThresholdDays: 14,
            autoRemediation: true,
          },
        })

        action.remediated = 1
        action.details.push(`Alerted operator about ${staleRules} stale approved rules`)
      }

      return action
    },
  },
}

/**
 * Run all remediation rules
 */
async function runRemediationCycle(
  specificRule?: keyof typeof REMEDIATION_RULES
): Promise<RemediationCycleResult> {
  const result: RemediationCycleResult = {
    actions: [],
    totalMatched: 0,
    totalRemediated: 0,
    totalFailed: 0,
  }

  const rulesToRun = specificRule
    ? { [specificRule]: REMEDIATION_RULES[specificRule] }
    : REMEDIATION_RULES

  for (const [key, rule] of Object.entries(rulesToRun)) {
    if (!rule) continue

    try {
      console.log(`[auto-remediation] Running rule: ${rule.name}`)

      const matchCount = await rule.matcher()
      if (matchCount === 0) {
        console.log(`[auto-remediation] ${rule.name}: No items matched`)
        continue
      }

      console.log(`[auto-remediation] ${rule.name}: ${matchCount} items matched, taking action...`)

      const action = await rule.action()
      result.actions.push(action)
      result.totalMatched += action.matched
      result.totalRemediated += action.remediated
      result.totalFailed += action.failed

      console.log(
        `[auto-remediation] ${rule.name}: remediated=${action.remediated}, failed=${action.failed}`
      )

      for (const detail of action.details) {
        console.log(`[auto-remediation]   - ${detail}`)
      }
    } catch (error) {
      console.error(`[auto-remediation] Error running rule ${key}:`, error)
      result.actions.push({
        rule: key,
        matched: 0,
        remediated: 0,
        failed: 1,
        details: [`Rule failed: ${error instanceof Error ? error.message : String(error)}`],
      })
      result.totalFailed++
    }
  }

  return result
}

/**
 * Process auto-remediation job
 */
async function processAutoRemediationJob(job: Job<AutoRemediationJobData>): Promise<JobResult> {
  const start = Date.now()
  const { specificRule } = job.data

  // Kill switch: Skip if pipeline is OFF
  if (!FeatureFlags.pipelineEnabled) {
    console.log(`[auto-remediation] Pipeline is OFF - skipping`)
    return {
      success: true,
      duration: 0,
      data: { skipped: true, reason: "pipeline_off" },
    }
  }

  try {
    const result = await runRemediationCycle(specificRule as keyof typeof REMEDIATION_RULES)

    const duration = Date.now() - start
    jobsProcessed.inc({
      worker: "auto-remediation",
      status: result.totalFailed === 0 ? "success" : "partial",
      queue: "auto-remediation",
    })
    jobDuration.observe({ worker: "auto-remediation", queue: "auto-remediation" }, duration / 1000)

    console.log(
      `[auto-remediation] Cycle complete: ` +
        `matched=${result.totalMatched}, remediated=${result.totalRemediated}, failed=${result.totalFailed}`
    )

    return {
      success: true,
      duration,
      data: result,
    }
  } catch (error) {
    jobsProcessed.inc({ worker: "auto-remediation", status: "failed", queue: "auto-remediation" })
    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Schedule a remediation cycle (can be called from scheduler)
 */
export async function scheduleRemediationCycle(): Promise<void> {
  await autoRemediationQueue.add(
    "remediate",
    { runAllRules: true },
    { jobId: `remediate-cycle-${Date.now()}` }
  )
}

/**
 * Get remediation statistics (for monitoring dashboard)
 */
export async function getRemediationStatistics(): Promise<{
  rules: Array<{
    name: string
    description: string
    pendingCount: number
  }>
  totalPending: number
}> {
  const stats = await Promise.all(
    Object.entries(REMEDIATION_RULES).map(async ([, rule]) => ({
      name: rule.name,
      description: rule.description,
      pendingCount: await rule.matcher(),
    }))
  )

  return {
    rules: stats,
    totalPending: stats.reduce((sum, r) => sum + r.pendingCount, 0),
  }
}

// Create and start worker
const worker = createWorker<AutoRemediationJobData>("auto-remediation", processAutoRemediationJob, {
  name: "auto-remediation",
  concurrency: 1, // Single worker to avoid race conditions
  lockDuration: 300000, // 5 minutes
  stalledInterval: 120000,
})

setupGracefulShutdown([worker])

console.log(`[auto-remediation] Worker started (pipeline mode: ${FeatureFlags.pipelineMode})`)
