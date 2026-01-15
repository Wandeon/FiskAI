// src/lib/regulatory-truth/utils/user-feedback.db.ts
//
// Task 4.1: RTL Autonomy - User Feedback Loop (Database Operations)
//
// Database operations for persisting and querying user feedback.
// Uses pure functions from user-feedback.ts for business logic.
//
// Critical Safeguards (Appendix A.4):
// - Retention: 12-month retention policy enforced by cleanupOldFeedback
// - Minimal Data: Only stores fields defined in FeedbackRecord
// - No PII: anonymousUserHash only present if user consented

import { dbReg } from "@/lib/db"
import {
  FeedbackRecord,
  RuleWithNegativeFeedback,
  getRetentionCutoffDate,
  calculateNegativeFeedbackPercentage,
  RETENTION_MONTHS,
  Sentiment,
} from "./user-feedback"

/**
 * Record a feedback entry in the database.
 *
 * This function stores the feedback record as-is.
 * Privacy safeguards are enforced by createFeedbackRecord() in user-feedback.ts.
 */
export async function recordFeedback(record: FeedbackRecord): Promise<void> {
  await dbReg.ruleFeedback.create({
    data: {
      ruleId: record.ruleId,
      sentiment: record.sentiment,
      reasonCode: record.reasonCode,
      appVersion: record.appVersion,
      anonymousUserHash: record.anonymousUserHash,
      createdAt: record.createdAt,
    },
  })
}

/**
 * Get all rules with their negative feedback percentages.
 *
 * Queries all feedback grouped by ruleId and calculates the negative
 * feedback percentage for each rule using the pure function from user-feedback.ts.
 *
 * Returns all rules with at least one feedback record, sorted by total feedback descending.
 */
export async function getRulesWithNegativeFeedback(): Promise<RuleWithNegativeFeedback[]> {
  // Group feedback by ruleId and sentiment
  const feedbackGroups = await dbReg.ruleFeedback.groupBy({
    by: ["ruleId", "sentiment"],
    _count: {
      id: true,
    },
  })

  // Aggregate counts per rule
  const ruleCounts = new Map<string, { positive: number; negative: number }>()

  for (const group of feedbackGroups) {
    const existing = ruleCounts.get(group.ruleId) || { positive: 0, negative: 0 }

    if (group.sentiment === Sentiment.POSITIVE) {
      existing.positive += group._count.id
    } else if (group.sentiment === Sentiment.NEGATIVE) {
      existing.negative += group._count.id
    }

    ruleCounts.set(group.ruleId, existing)
  }

  // Convert to RuleWithNegativeFeedback array
  const results: RuleWithNegativeFeedback[] = []

  for (const [ruleId, counts] of ruleCounts) {
    const totalFeedback = counts.positive + counts.negative
    const negativePercent = calculateNegativeFeedbackPercentage(counts)

    results.push({
      ruleId,
      negativePercent,
      totalFeedback,
    })
  }

  // Sort by total feedback descending (most feedback first)
  return results.sort((a, b) => b.totalFeedback - a.totalFeedback)
}

/**
 * Clean up feedback records older than the retention period.
 *
 * Returns the number of records deleted.
 *
 * This function should be called by a monthly scheduled job to enforce
 * the 12-month retention policy (Appendix A.4).
 */
export async function cleanupOldFeedback(
  retentionMonths: number = RETENTION_MONTHS
): Promise<number> {
  const cutoff = getRetentionCutoffDate(retentionMonths)

  const result = await dbReg.ruleFeedback.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  })

  return result.count
}

/**
 * Get feedback statistics for monitoring and debugging.
 *
 * Returns counts of feedback by sentiment and the total count.
 */
export async function getFeedbackStats(): Promise<{
  total: number
  positive: number
  negative: number
  oldestRecord: Date | null
}> {
  const [totalCount, positiveCount, negativeCount, oldestRecord] = await Promise.all([
    dbReg.ruleFeedback.count(),
    dbReg.ruleFeedback.count({ where: { sentiment: Sentiment.POSITIVE } }),
    dbReg.ruleFeedback.count({ where: { sentiment: Sentiment.NEGATIVE } }),
    dbReg.ruleFeedback.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ])

  return {
    total: totalCount,
    positive: positiveCount,
    negative: negativeCount,
    oldestRecord: oldestRecord?.createdAt || null,
  }
}
