import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { FeedbackStats } from "./feedback"

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || "#fiskai-alerts"

/**
 * Get weekly AI quality digest data
 */
export async function getWeeklyAIQualityDigest(): Promise<{
  weekStart: Date
  weekEnd: Date
  globalStats: FeedbackStats
  byOperation: Record<string, FeedbackStats>
  lowAccuracyCompanies: Array<{
    companyId: string
    companyName: string
    stats: FeedbackStats
  }>
  recentCorrections: Array<{
    id: string
    companyName: string
    operation: string
    feedback: string
    correction: Record<string, unknown> | null
    createdAt: Date
  }>
  improvementSuggestions: string[]
}> {
  const weekEnd = new Date()
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  const weekFeedback = await db.aIFeedback.findMany({
    where: { createdAt: { gte: weekStart } },
    orderBy: { createdAt: "desc" },
  })

  const total = weekFeedback.length
  const correct = weekFeedback.filter((f) => f.feedback === "correct").length
  const incorrect = weekFeedback.filter((f) => f.feedback === "incorrect").length
  const partial = weekFeedback.filter((f) => f.feedback === "partial").length
  const accuracy = total > 0 ? ((correct + partial * 0.5) / total) * 100 : 0

  const globalStats: FeedbackStats = {
    total,
    correct,
    incorrect,
    partial,
    accuracy: Math.round(accuracy * 100) / 100,
  }

  const improvementSuggestions: string[] = []

  if (accuracy < 80 && total > 10) {
    improvementSuggestions.push(
      `Globalna točnost pala na ${accuracy}% - razmotriti poboljšanje AI modela`
    )
  }

  return {
    weekStart,
    weekEnd,
    globalStats,
    byOperation: {} as Record<string, FeedbackStats>,
    lowAccuracyCompanies: [],
    recentCorrections: [],
    improvementSuggestions,
  }
}

/**
 * Send Slack alert when AI accuracy drops below threshold
 */
export async function sendSlackAccuracyAlert(
  companyName: string,
  stats: FeedbackStats
): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    logger.info("[ai-feedback] No Slack webhook configured")
    return false
  }

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "⚠️ AI Accuracy Alert", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Tvrtka:*\n${companyName}` },
              { type: "mrkdwn", text: `*Točnost:*\n${stats.accuracy}%` },
            ],
          },
        ],
      }),
    })
    return true
  } catch (error) {
    logger.error({ error }, "Slack alert failed")
    return false
  }
}
