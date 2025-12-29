/**
 * AI Pipeline Error Recovery
 *
 * Provides retry logic, attempt tracking, and dead-letter queue functionality
 * for the news AI pipeline to handle transient failures gracefully.
 */

import { drizzleDb } from "@/lib/db/drizzle"
import { newsItems, newsPosts } from "@/lib/db/schema"
import { eq, and, lt, lte, sql } from "drizzle-orm"

/**
 * Maximum number of processing attempts before moving to dead-letter queue
 */
export const MAX_PROCESSING_ATTEMPTS = 3

/**
 * Status for items that have exceeded max attempts
 */
export const DEAD_LETTER_STATUS = "failed"

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: MAX_PROCESSING_ATTEMPTS,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig = {}): number {
  const { baseDelayMs, maxDelayMs } = { ...DEFAULT_RETRY_CONFIG, ...config }
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = delay * Math.random() * 0.25
  return Math.floor(delay + jitter)
}

/**
 * Wrapper to execute an async operation with retry tracking
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_RETRY_CONFIG, ...config }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry on non-retryable errors
      if (isNonRetryableError(error)) {
        throw error
      }

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoffDelay(attempt, { baseDelayMs, maxDelayMs })
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw new PipelineRetryExhaustedError(
    `Operation failed after ${maxAttempts} attempts: ${lastError?.message}`,
    lastError
  )
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Authentication errors should not be retried
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      return true
    }
    // Invalid API key errors
    if (error.message.includes("API key") || error.message.includes("authentication")) {
      return true
    }
  }
  return false
}

/**
 * Custom error for retry exhaustion
 */
export class PipelineRetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error | null
  ) {
    super(message)
    this.name = "PipelineRetryExhaustedError"
  }
}

/**
 * Record a processing error for a news item
 */
export async function recordNewsItemError(
  itemId: string,
  error: Error | string
): Promise<{ shouldRetry: boolean; attempts: number }> {
  const errorMessage = error instanceof Error ? error.message : error

  // Get current item state
  const [item] = await drizzleDb
    .select({
      processingAttempts: newsItems.processingAttempts,
    })
    .from(newsItems)
    .where(eq(newsItems.id, itemId))
    .limit(1)

  const currentAttempts = item?.processingAttempts ?? 0
  const newAttempts = currentAttempts + 1
  const shouldRetry = newAttempts < MAX_PROCESSING_ATTEMPTS

  // Update item with error info
  await drizzleDb
    .update(newsItems)
    .set({
      processingAttempts: newAttempts,
      lastError: errorMessage,
      lastErrorAt: new Date(),
      status: shouldRetry ? "pending" : DEAD_LETTER_STATUS,
      updatedAt: new Date(),
    })
    .where(eq(newsItems.id, itemId))

  return { shouldRetry, attempts: newAttempts }
}

/**
 * Record a processing error for a news post
 */
export async function recordNewsPostError(
  postId: string,
  error: Error | string
): Promise<{ shouldRetry: boolean; attempts: number }> {
  const errorMessage = error instanceof Error ? error.message : error

  // Get current post state
  const [post] = await drizzleDb
    .select({
      processingAttempts: newsPosts.processingAttempts,
    })
    .from(newsPosts)
    .where(eq(newsPosts.id, postId))
    .limit(1)

  const currentAttempts = post?.processingAttempts ?? 0
  const newAttempts = currentAttempts + 1
  const shouldRetry = newAttempts < MAX_PROCESSING_ATTEMPTS

  // Update post with error info
  await drizzleDb
    .update(newsPosts)
    .set({
      processingAttempts: newAttempts,
      lastError: errorMessage,
      lastErrorAt: new Date(),
      status: shouldRetry ? "draft" : DEAD_LETTER_STATUS,
      updatedAt: new Date(),
    })
    .where(eq(newsPosts.id, postId))

  return { shouldRetry, attempts: newAttempts }
}

/**
 * Get failed news items (dead-letter queue)
 */
export async function getFailedNewsItems(limit = 100) {
  return drizzleDb
    .select()
    .from(newsItems)
    .where(eq(newsItems.status, DEAD_LETTER_STATUS))
    .orderBy(newsItems.lastErrorAt)
    .limit(limit)
}

/**
 * Get failed news posts (dead-letter queue)
 */
export async function getFailedNewsPosts(limit = 100) {
  return drizzleDb
    .select()
    .from(newsPosts)
    .where(eq(newsPosts.status, DEAD_LETTER_STATUS))
    .orderBy(newsPosts.lastErrorAt)
    .limit(limit)
}

/**
 * Reset a failed news item for reprocessing
 */
export async function resetNewsItemForReprocessing(itemId: string) {
  await drizzleDb
    .update(newsItems)
    .set({
      status: "pending",
      processingAttempts: 0,
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    })
    .where(eq(newsItems.id, itemId))
}

/**
 * Reset a failed news post for reprocessing
 */
export async function resetNewsPostForReprocessing(postId: string) {
  await drizzleDb
    .update(newsPosts)
    .set({
      status: "draft",
      processingAttempts: 0,
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    })
    .where(eq(newsPosts.id, postId))
}

/**
 * Get items that are eligible for retry (under max attempts, in pending/failed state)
 */
export async function getRetryableNewsItems(limit = 50) {
  return drizzleDb
    .select()
    .from(newsItems)
    .where(
      and(
        eq(newsItems.status, "pending"),
        lt(newsItems.processingAttempts, MAX_PROCESSING_ATTEMPTS)
      )
    )
    .orderBy(newsItems.processingAttempts, newsItems.createdAt)
    .limit(limit)
}

/**
 * Get summary statistics for pipeline health monitoring
 */
export async function getPipelineHealthStats() {
  const [itemStats] = await drizzleDb
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      processed: sql<number>`count(*) filter (where status = 'processed')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      withErrors: sql<number>`count(*) filter (where last_error is not null)::int`,
      avgAttempts: sql<number>`avg(processing_attempts)::float`,
    })
    .from(newsItems)

  const [postStats] = await drizzleDb
    .select({
      total: sql<number>`count(*)::int`,
      draft: sql<number>`count(*) filter (where status = 'draft')::int`,
      reviewing: sql<number>`count(*) filter (where status = 'reviewing')::int`,
      published: sql<number>`count(*) filter (where status = 'published')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      withErrors: sql<number>`count(*) filter (where last_error is not null)::int`,
      avgAttempts: sql<number>`avg(processing_attempts)::float`,
    })
    .from(newsPosts)

  return {
    newsItems: itemStats,
    newsPosts: postStats,
    timestamp: new Date().toISOString(),
  }
}
