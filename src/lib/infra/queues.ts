// src/lib/infra/queues.ts
/**
 * Minimal Queue Producer for App
 *
 * Provides queue access for the app to enqueue jobs for workers.
 * Workers are in a separate repo but share the same Redis queues.
 */

import { Queue } from "bullmq"
import { buildRedisOptions } from "./redis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const BULLMQ_PREFIX = process.env.BULLMQ_PREFIX || "fiskai"

const redisOptions = buildRedisOptions(REDIS_URL)

// Lazy-initialized queues for job submission
let _scheduledQueue: Queue | null = null
let _articleQueue: Queue | null = null
let _backupQueue: Queue | null = null
let _evidenceEmbeddingQueue: Queue | null = null
let _contentSyncQueue: Queue | null = null

/**
 * Get the scheduled queue for triggering pipeline runs
 */
export function getScheduledQueue(): Queue {
  if (!_scheduledQueue) {
    _scheduledQueue = new Queue("scheduled", {
      connection: redisOptions,
      prefix: BULLMQ_PREFIX,
    })
  }
  return _scheduledQueue
}

/**
 * Get the article queue for generating articles
 */
export function getArticleQueue(): Queue {
  if (!_articleQueue) {
    _articleQueue = new Queue("article", {
      connection: redisOptions,
      prefix: BULLMQ_PREFIX,
    })
  }
  return _articleQueue
}

/**
 * Get the backup queue for backup jobs
 */
export function getBackupQueue(): Queue {
  if (!_backupQueue) {
    _backupQueue = new Queue("backup", {
      connection: redisOptions,
      prefix: BULLMQ_PREFIX,
    })
  }
  return _backupQueue
}

/**
 * Get the evidence embedding queue for embedding generation
 */
export function getEvidenceEmbeddingQueue(): Queue {
  if (!_evidenceEmbeddingQueue) {
    _evidenceEmbeddingQueue = new Queue("evidence-embedding", {
      connection: redisOptions,
      prefix: BULLMQ_PREFIX,
    })
  }
  return _evidenceEmbeddingQueue
}

/**
 * Get the content sync queue for syncing content changes
 */
export function getContentSyncQueue(): Queue {
  if (!_contentSyncQueue) {
    _contentSyncQueue = new Queue("content-sync", {
      connection: redisOptions,
      prefix: BULLMQ_PREFIX,
    })
  }
  return _contentSyncQueue
}

/**
 * Enqueue a content sync job by event ID
 */
export async function enqueueContentSyncJob(eventId: string): Promise<string | undefined> {
  const job = await getContentSyncQueue().add(
    "sync",
    { eventId },
    { jobId: `content-sync-${eventId}` }
  )
  return job.id
}

/**
 * Close all queue connections (for cleanup)
 */
export async function closeQueues(): Promise<void> {
  const queues = [
    _scheduledQueue,
    _articleQueue,
    _backupQueue,
    _evidenceEmbeddingQueue,
    _contentSyncQueue,
  ].filter(Boolean) as Queue[]
  await Promise.all(queues.map((q) => q.close()))
  _scheduledQueue = null
  _articleQueue = null
  _backupQueue = null
  _evidenceEmbeddingQueue = null
  _contentSyncQueue = null
}
