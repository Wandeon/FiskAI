// src/lib/outbox/handlers/article-job-handler.ts
/**
 * Article Job Event Handlers
 *
 * Handles article generation job events with proper error handling
 * and status tracking.
 */

import { z } from "zod"
import { db } from "@/lib/db"
import { runArticleJob } from "@/lib/article-agent/orchestrator"

// Payload schemas for type safety
const articleJobStartedSchema = z.object({
  jobId: z.string(),
})

const articleJobRewriteSchema = z.object({
  jobId: z.string(),
})

/**
 * Handle article_job.started event.
 *
 * Runs the article generation pipeline for a newly created job.
 */
export async function handleArticleJobStarted(payload: unknown): Promise<void> {
  const parsed = articleJobStartedSchema.parse(payload)
  const { jobId } = parsed

  console.log(`[outbox:article_job.started] Processing job ${jobId}`)

  try {
    await runArticleJob(jobId)
    console.log(`[outbox:article_job.started] Job ${jobId} completed`)
  } catch (error) {
    console.error(`[outbox:article_job.started] Job ${jobId} failed:`, error)

    // Update job status to REJECTED on failure
    await db.articleJob
      .update({
        where: { id: jobId },
        data: { status: "REJECTED" },
      })
      .catch((updateError) => {
        console.error(`[outbox:article_job.started] Failed to update job status:`, updateError)
      })

    // Re-throw to mark the outbox event as failed
    throw error
  }
}

/**
 * Handle article_job.rewrite event.
 *
 * Triggers a rewrite iteration for an existing job.
 */
export async function handleArticleJobRewrite(payload: unknown): Promise<void> {
  const parsed = articleJobRewriteSchema.parse(payload)
  const { jobId } = parsed

  console.log(`[outbox:article_job.rewrite] Processing rewrite for job ${jobId}`)

  try {
    await runArticleJob(jobId)
    console.log(`[outbox:article_job.rewrite] Job ${jobId} rewrite completed`)
  } catch (error) {
    console.error(`[outbox:article_job.rewrite] Job ${jobId} rewrite failed:`, error)

    // On rewrite failure, mark for review instead of reject
    await db.articleJob
      .update({
        where: { id: jobId },
        data: { status: "NEEDS_REVIEW" },
      })
      .catch((updateError) => {
        console.error(`[outbox:article_job.rewrite] Failed to update job status:`, updateError)
      })

    // Re-throw to mark the outbox event as failed
    throw error
  }
}
