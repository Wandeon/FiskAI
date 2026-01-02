"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { createArticleJob } from "@/lib/article-agent/orchestrator"
import { publishArticle } from "@/lib/article-agent/steps/publish"
import { requireAuth } from "@/lib/auth-utils"
import { publishEvent, OutboxEventTypes } from "@/lib/outbox"

interface ActionResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

// Zod schemas for validation
const uuidSchema = z.string().uuid()

const createJobSchema = z.object({
  type: z.enum(["NEWS", "GUIDE", "COMPARISON"]),
  sourceUrls: z.array(z.string().url()).min(1, "At least one source URL is required"),
  topic: z.string().optional(),
  maxIterations: z.number().int().positive().optional(),
})

const getJobsSchema = z.object({
  status: z.string().optional(),
  type: z.enum(["NEWS", "GUIDE", "COMPARISON"]).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

const paragraphActionSchema = z.object({
  jobId: z.string().uuid(),
  paragraphIndex: z.number().int().min(0),
})

/**
 * Create a new article generation job
 */
export async function createJob(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  try {
    const validated = createJobSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid input" }
    }
    const data = validated.data

    await requireAuth()

    const job = await createArticleJob({
      type: data.type,
      sourceUrls: data.sourceUrls,
      topic: data.topic,
      maxIterations: data.maxIterations,
    })

    revalidatePath("/article-agent")

    return { success: true, data: { jobId: job.id } }
  } catch (error) {
    console.error("Failed to create article job:", error)
    return { success: false, error: "Failed to create article job" }
  }
}

/**
 * Start processing an article job
 */
export async function startJob(jobId: unknown): Promise<ActionResult> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({ where: { id: validatedJobId } })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    // Publish event for guaranteed delivery via outbox pattern
    // The outbox worker will process this event and run the job
    await publishEvent(OutboxEventTypes.ARTICLE_JOB_STARTED, { jobId: validatedJobId })

    revalidatePath("/article-agent")
    revalidatePath(`/article-agent/${validatedJobId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to start job:", error)
    return { success: false, error: "Failed to start job" }
  }
}

/**
 * Get job status and basic info
 */
export async function getJobStatus(jobId: unknown): Promise<ActionResult> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
      include: {
        drafts: {
          orderBy: { iteration: "desc" },
          take: 1,
          include: { paragraphs: true },
        },
      },
    })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    return { success: true, data: job }
  } catch (error) {
    console.error("Failed to get job status:", error)
    return { success: false, error: "Failed to get job status" }
  }
}

/**
 * Get job with full verification data
 */
export async function getJobWithVerification(jobId: unknown) {
  const validated = uuidSchema.safeParse(jobId)
  if (!validated.success) {
    throw new Error("Invalid job ID")
  }
  const validatedJobId = validated.data

  await requireAuth()

  const job = await db.articleJob.findUnique({
    where: { id: validatedJobId },
    include: {
      factSheet: {
        include: { claims: true },
      },
      drafts: {
        orderBy: { iteration: "desc" },
        take: 1,
        include: {
          paragraphs: {
            orderBy: { index: "asc" },
            include: {
              verifications: {
                include: {
                  claim: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!job) {
    throw new Error("Job not found")
  }

  return { job, draft: job.drafts[0], factSheet: job.factSheet }
}

/**
 * Get list of all article jobs
 */
export async function getJobs(options?: unknown): Promise<ActionResult> {
  try {
    const validated = getJobsSchema.safeParse(options ?? {})
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid options" }
    }
    const opts = validated.data

    await requireAuth()

    const limit = Math.min(opts.limit ?? 20, 100)

    const jobs = await db.articleJob.findMany({
      where: {
        ...(opts.status && {
          status: opts.status as
            | "PENDING"
            | "DRAFTING"
            | "NEEDS_REVIEW"
            | "APPROVED"
            | "PUBLISHED"
            | "REJECTED",
        }),
        ...(opts.type && { type: opts.type }),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts.cursor && { cursor: { id: opts.cursor }, skip: 1 }),
    })

    const hasMore = jobs.length > limit
    const items = hasMore ? jobs.slice(0, -1) : jobs
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined

    return { success: true, data: { items, nextCursor, hasMore } }
  } catch (error) {
    console.error("Failed to get jobs:", error)
    return { success: false, error: "Failed to get jobs" }
  }
}

/**
 * Approve a job and mark it ready for publishing
 */
export async function approveJob(jobId: unknown): Promise<ActionResult> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
    })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    if (job.status !== "NEEDS_REVIEW" && job.status !== "APPROVED") {
      return { success: false, error: "Job must be in review state to approve" }
    }

    await db.articleJob.update({
      where: { id: validatedJobId },
      data: { status: "APPROVED" },
    })

    revalidatePath("/article-agent")
    revalidatePath(`/article-agent/${validatedJobId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to approve job:", error)
    return { success: false, error: "Failed to approve job" }
  }
}

/**
 * Publish an approved job
 *
 * For NEWS type: Creates entry in news_posts table
 * For other types: Creates MDX file in appropriate content directory
 */
export async function publishJob(jobId: unknown): Promise<
  ActionResult<{
    slug: string
    publishedAt: string
    destination: string
  }>
> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
    })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    if (job.status !== "APPROVED") {
      return { success: false, error: "Job must be approved before publishing" }
    }

    const result = await publishArticle(job)

    revalidatePath("/article-agent")
    revalidatePath(`/article-agent/${validatedJobId}`)
    revalidatePath("/vijesti")

    return {
      success: true,
      data: {
        slug: result.slug,
        publishedAt: result.publishedAt.toISOString(),
        destination: result.destination,
      },
    }
  } catch (error) {
    console.error("Failed to publish job:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish job",
    }
  }
}

/**
 * Reject a job
 */
export async function rejectJob(jobId: unknown, reason?: unknown): Promise<ActionResult> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    // Validate reason if provided
    if (reason !== undefined) {
      const reasonResult = z.string().optional().safeParse(reason)
      if (!reasonResult.success) {
        return { success: false, error: "Invalid reason" }
      }
    }

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
    })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    await db.articleJob.update({
      where: { id: validatedJobId },
      data: { status: "REJECTED" },
    })

    revalidatePath("/article-agent")
    revalidatePath(`/article-agent/${validatedJobId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to reject job:", error)
    return { success: false, error: "Failed to reject job" }
  }
}

/**
 * Lock a specific paragraph to prevent rewriting
 */
export async function lockParagraph(
  jobId: unknown,
  paragraphIndex: unknown
): Promise<ActionResult> {
  try {
    const validated = paragraphActionSchema.safeParse({ jobId, paragraphIndex })
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid input" }
    }
    const { jobId: validatedJobId, paragraphIndex: validatedIndex } = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
      include: {
        drafts: {
          orderBy: { iteration: "desc" },
          take: 1,
        },
      },
    })

    if (!job?.drafts[0]) {
      return { success: false, error: "No draft found" }
    }

    await db.draftParagraph.update({
      where: {
        draftId_index: {
          draftId: job.drafts[0].id,
          index: validatedIndex,
        },
      },
      data: { isLocked: true },
    })

    revalidatePath(`/article-agent/${validatedJobId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to lock paragraph:", error)
    return { success: false, error: "Failed to lock paragraph" }
  }
}

/**
 * Unlock a specific paragraph to allow rewriting
 */
export async function unlockParagraph(
  jobId: unknown,
  paragraphIndex: unknown
): Promise<ActionResult> {
  try {
    const validated = paragraphActionSchema.safeParse({ jobId, paragraphIndex })
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid input" }
    }
    const { jobId: validatedJobId, paragraphIndex: validatedIndex } = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
      include: {
        drafts: {
          orderBy: { iteration: "desc" },
          take: 1,
        },
      },
    })

    if (!job?.drafts[0]) {
      return { success: false, error: "No draft found" }
    }

    await db.draftParagraph.update({
      where: {
        draftId_index: {
          draftId: job.drafts[0].id,
          index: validatedIndex,
        },
      },
      data: { isLocked: false },
    })

    revalidatePath(`/article-agent/${validatedJobId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to unlock paragraph:", error)
    return { success: false, error: "Failed to unlock paragraph" }
  }
}

/**
 * Trigger a rewrite iteration for a job
 */
export async function triggerRewrite(jobId: unknown): Promise<ActionResult> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({ where: { id: validatedJobId } })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    if (job.currentIteration >= job.maxIterations) {
      return { success: false, error: "Max iterations reached" }
    }

    // Update status to trigger rewrite and publish event for guaranteed delivery
    await db.articleJob.update({
      where: { id: validatedJobId },
      data: { status: "DRAFTING" },
    })

    // Publish event for guaranteed delivery via outbox pattern
    await publishEvent(OutboxEventTypes.ARTICLE_JOB_REWRITE, { jobId: validatedJobId })

    revalidatePath(`/article-agent/${validatedJobId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to trigger rewrite:", error)
    return { success: false, error: "Failed to trigger rewrite" }
  }
}

/**
 * Delete a job and all related data
 */
export async function deleteJob(jobId: unknown): Promise<ActionResult> {
  try {
    const validated = uuidSchema.safeParse(jobId)
    if (!validated.success) {
      return { success: false, error: "Invalid job ID" }
    }
    const validatedJobId = validated.data

    await requireAuth()

    const job = await db.articleJob.findUnique({
      where: { id: validatedJobId },
    })

    if (!job) {
      return { success: false, error: "Job not found" }
    }

    // Only allow deleting jobs that are not published
    if (job.status === "PUBLISHED") {
      return { success: false, error: "Cannot delete published jobs" }
    }

    await db.articleJob.delete({
      where: { id: validatedJobId },
    })

    revalidatePath("/article-agent")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete job:", error)
    return { success: false, error: "Failed to delete job" }
  }
}
