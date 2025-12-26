// src/lib/regulatory-truth/workers/index.ts

// Core
export {
  redis,
  createWorkerConnection,
  checkRedisHealth,
  closeRedis,
  // PR #90 fix: Drainer heartbeat for stall detection
  updateDrainerHeartbeat,
  getDrainerHeartbeat,
  getDrainerIdleMinutes,
  type DrainerHeartbeat,
} from "./redis"
export {
  sentinelQueue,
  extractQueue,
  composeQueue,
  reviewQueue,
  arbiterQueue,
  releaseQueue,
  scheduledQueue,
  deadletterQueue,
  allQueues,
  createQueueEvents,
} from "./queues"
export { createWorker, setupGracefulShutdown, type JobResult, type JobProcessor } from "./base"

// Utilities
export { getDomainDelay, getDomainLimiter, llmLimiter } from "./rate-limiter"
export { createCircuitBreaker, getCircuitBreakerStatus } from "./circuit-breaker"
export { registry, jobsProcessed, jobDuration, queueDepth, activeJobs, getMetrics } from "./metrics"
