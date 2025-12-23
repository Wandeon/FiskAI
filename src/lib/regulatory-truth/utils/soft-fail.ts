// src/lib/regulatory-truth/utils/soft-fail.ts

import { db } from "@/lib/db"

export interface SoftFailContext {
  operation: string
  entityType?: "evidence" | "rule" | "source"
  entityId?: string
  metadata?: Record<string, unknown>
}

export interface SoftFailResult<T> {
  success: boolean
  data: T | null
  error?: string
  usedFallback: boolean
}

/**
 * Wraps an async operation with soft-fail logic.
 * When the operation fails:
 * - Logs the error with full context
 * - Records the failure in database for monitoring
 * - Returns the fallback value instead of throwing
 * - Allows the pipeline to continue processing other items
 *
 * @param fn - The async function to execute
 * @param fallback - Value to return on failure
 * @param context - Context for logging and monitoring
 * @returns SoftFailResult with data or fallback
 *
 * @example
 * const result = await withSoftFail(
 *   () => runAgent({ ... }),
 *   null,
 *   { operation: 'extractor', entityId: evidenceId }
 * )
 * if (result.success) {
 *   // Process result.data
 * } else {
 *   // Log and continue with other items
 *   console.warn(`Skipped ${entityId}: ${result.error}`)
 * }
 */
export async function withSoftFail<T>(
  fn: () => Promise<T>,
  fallback: T | null,
  context: SoftFailContext
): Promise<SoftFailResult<T>> {
  const startTime = Date.now()

  try {
    const data = await fn()
    return {
      success: true,
      data,
      usedFallback: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const durationMs = Date.now() - startTime

    // Log error with full context
    console.error(
      `[soft-fail] ${context.operation} failed:`,
      errorMessage,
      context.entityType && context.entityId ? `(${context.entityType}: ${context.entityId})` : "",
      `after ${durationMs}ms`
    )

    // Record failure in database for monitoring and analysis
    try {
      await db.softFailLog.create({
        data: {
          operation: context.operation,
          entityType: context.entityType,
          entityId: context.entityId,
          errorMessage,
          metadata: {
            ...context.metadata,
            durationMs,
            timestamp: new Date().toISOString(),
          },
        },
      })
    } catch (logError) {
      // Don't fail if logging fails - just log to console
      console.error(`[soft-fail] Failed to record soft-fail log:`, logError)
    }

    return {
      success: false,
      data: fallback,
      error: errorMessage,
      usedFallback: true,
    }
  }
}

/**
 * Batch version of withSoftFail that processes multiple items.
 * Each item is wrapped in soft-fail logic independently.
 * Failed items don't block the entire batch.
 *
 * @param items - Array of items to process
 * @param fn - Function to process each item (takes item and index)
 * @param context - Base context (will be extended with item index)
 * @returns Results array with successes and failures
 *
 * @example
 * const results = await withSoftFailBatch(
 *   evidenceRecords,
 *   (evidence) => runExtractor(evidence.id),
 *   { operation: 'extractor_batch' }
 * )
 * console.log(`Processed: ${results.succeeded}/${results.total}`)
 */
export async function withSoftFailBatch<TItem, TResult>(
  items: TItem[],
  fn: (item: TItem, index: number) => Promise<TResult>,
  context: SoftFailContext
): Promise<{
  results: Array<SoftFailResult<TResult>>
  succeeded: number
  failed: number
  total: number
}> {
  const results: Array<SoftFailResult<TResult>> = []
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemContext = {
      ...context,
      metadata: {
        ...context.metadata,
        index: i,
        total: items.length,
      },
    }

    const result = await withSoftFail(() => fn(item, i), null, itemContext)

    results.push(result)
    if (result.success) {
      succeeded++
    } else {
      failed++
    }
  }

  return {
    results,
    succeeded,
    failed,
    total: items.length,
  }
}
