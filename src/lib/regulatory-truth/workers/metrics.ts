// src/lib/regulatory-truth/workers/metrics.ts
import { Counter, Histogram, Gauge, Registry } from "prom-client"

export const registry = new Registry()

// Job metrics
export const jobsProcessed = new Counter({
  name: "worker_jobs_processed_total",
  help: "Total jobs processed by worker",
  labelNames: ["worker", "status", "queue"],
  registers: [registry],
})

export const jobDuration = new Histogram({
  name: "worker_job_duration_seconds",
  help: "Job processing duration",
  labelNames: ["worker", "queue"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [registry],
})

export const queueDepth = new Gauge({
  name: "worker_queue_depth",
  help: "Number of jobs waiting in queue",
  labelNames: ["queue"],
  registers: [registry],
})

export const activeJobs = new Gauge({
  name: "worker_active_jobs",
  help: "Number of jobs currently being processed",
  labelNames: ["worker"],
  registers: [registry],
})

// LLM metrics
export const llmCalls = new Counter({
  name: "worker_llm_calls_total",
  help: "Total LLM API calls",
  labelNames: ["worker", "status"],
  registers: [registry],
})

export const rateLimitHits = new Counter({
  name: "worker_rate_limit_hits_total",
  help: "Rate limit hits (429 responses)",
  labelNames: ["worker", "domain"],
  registers: [registry],
})

// Get metrics as string for /metrics endpoint
export async function getMetrics(): Promise<string> {
  return registry.metrics()
}
