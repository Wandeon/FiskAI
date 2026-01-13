// src/lib/regulatory-truth/workers/budget-governor.ts
//
// Budget Governor: Single authority for token spending decisions
// Enforces global daily caps, per-source limits, and concurrency bounds.
//

import { db } from "@/lib/db"

// Budget configuration (can be overridden via env vars)
export interface BudgetConfig {
  globalDailyTokenCap: number // Max tokens per day across all sources
  perSourceDailyTokenCap: number // Max tokens per sourceSlug per day
  perEvidenceMaxTokens: number // Max tokens for a single evidence item
  maxConcurrentCloudCalls: number // Max concurrent cloud LLM calls
  maxConcurrentLocalCalls: number // Max concurrent local Ollama calls
  cloudCallCooldownMs: number // Min time between cloud calls
  emptyOutputCooldownMs: number // Cooldown for source after EMPTY_OUTPUT
  emptyOutputThreshold: number // Consecutive empty outputs before cooldown
}

const DEFAULT_CONFIG: BudgetConfig = {
  globalDailyTokenCap: parseInt(process.env.RTL_GLOBAL_DAILY_TOKEN_CAP || "500000"),
  perSourceDailyTokenCap: parseInt(process.env.RTL_PER_SOURCE_DAILY_TOKEN_CAP || "50000"),
  perEvidenceMaxTokens: parseInt(process.env.RTL_PER_EVIDENCE_MAX_TOKENS || "8000"),
  maxConcurrentCloudCalls: parseInt(process.env.RTL_MAX_CONCURRENT_CLOUD || "3"),
  maxConcurrentLocalCalls: parseInt(process.env.RTL_MAX_CONCURRENT_LOCAL || "5"),
  cloudCallCooldownMs: parseInt(process.env.RTL_CLOUD_COOLDOWN_MS || "2000"),
  emptyOutputCooldownMs: parseInt(process.env.RTL_EMPTY_OUTPUT_COOLDOWN_MS || "3600000"), // 1 hour
  emptyOutputThreshold: parseInt(process.env.RTL_EMPTY_OUTPUT_THRESHOLD || "3"),
}

// LLM provider types for routing
export type LLMProvider = "LOCAL_OLLAMA" | "CLOUD_OLLAMA" | "CLOUD_OPENAI"

// Budget denial reasons
export type BudgetDenialReason =
  | "GLOBAL_DAILY_CAP_EXCEEDED"
  | "SOURCE_DAILY_CAP_EXCEEDED"
  | "EVIDENCE_TOO_LARGE"
  | "CONCURRENT_LIMIT_REACHED"
  | "SOURCE_IN_COOLDOWN"
  | "CIRCUIT_OPEN"
  | "AUTH_ERROR"
  | "QUOTA_ERROR"

// Budget check result
export interface BudgetCheckResult {
  allowed: boolean
  denialReason?: BudgetDenialReason
  remainingGlobalTokens: number
  remainingSourceTokens: number
  recommendedProvider: LLMProvider
  cooldownUntil?: Date
}

// Token spend record for tracking
export interface TokenSpendRecord {
  sourceSlug: string
  evidenceId: string
  provider: LLMProvider
  tokensUsed: number
  timestamp: Date
  outcome: "SUCCESS" | "EMPTY" | "ERROR"
}

// In-memory state (persisted to Redis in production)
interface BudgetState {
  globalTokensToday: number
  sourceTokensToday: Map<string, number>
  sourceCooldowns: Map<string, Date>
  sourceEmptyOutputCounts: Map<string, number>
  activeCloudCalls: number
  activeLocalCalls: number
  lastCloudCall: Date
  circuitOpen: boolean
  lastReset: Date
}

let state: BudgetState = {
  globalTokensToday: 0,
  sourceTokensToday: new Map(),
  sourceCooldowns: new Map(),
  sourceEmptyOutputCounts: new Map(),
  activeCloudCalls: 0,
  activeLocalCalls: 0,
  lastCloudCall: new Date(0),
  circuitOpen: false,
  lastReset: new Date(),
}

let config: BudgetConfig = { ...DEFAULT_CONFIG }

/**
 * Initialize or update budget configuration
 */
export function configureBudget(newConfig: Partial<BudgetConfig>): void {
  config = { ...config, ...newConfig }
  console.log("[budget-governor] Configuration updated:", config)
}

/**
 * Get current budget configuration (for testing/debugging)
 */
export function getBudgetConfig(): BudgetConfig {
  return { ...config }
}

/**
 * Reset daily counters (call at midnight or for testing)
 */
export function resetDailyBudget(): void {
  state.globalTokensToday = 0
  state.sourceTokensToday.clear()
  state.lastReset = new Date()
  console.log("[budget-governor] Daily budget reset")
}

/**
 * Check if a new day has started and reset if needed
 */
function maybeResetDaily(): void {
  const now = new Date()
  const lastResetDay = state.lastReset.toDateString()
  const currentDay = now.toDateString()

  if (lastResetDay !== currentDay) {
    resetDailyBudget()
  }
}

/**
 * Check if budget allows an LLM call for given evidence
 */
export function checkBudget(
  sourceSlug: string,
  evidenceId: string,
  estimatedTokens: number
): BudgetCheckResult {
  maybeResetDaily()

  // Check circuit breaker first
  if (state.circuitOpen) {
    return {
      allowed: false,
      denialReason: "CIRCUIT_OPEN",
      remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday,
      remainingSourceTokens:
        config.perSourceDailyTokenCap - (state.sourceTokensToday.get(sourceSlug) || 0),
      recommendedProvider: "LOCAL_OLLAMA",
    }
  }

  // Check source cooldown
  const cooldownUntil = state.sourceCooldowns.get(sourceSlug)
  if (cooldownUntil && cooldownUntil > new Date()) {
    return {
      allowed: false,
      denialReason: "SOURCE_IN_COOLDOWN",
      remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday,
      remainingSourceTokens:
        config.perSourceDailyTokenCap - (state.sourceTokensToday.get(sourceSlug) || 0),
      recommendedProvider: "LOCAL_OLLAMA",
      cooldownUntil,
    }
  }

  // Check evidence size
  if (estimatedTokens > config.perEvidenceMaxTokens) {
    return {
      allowed: false,
      denialReason: "EVIDENCE_TOO_LARGE",
      remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday,
      remainingSourceTokens:
        config.perSourceDailyTokenCap - (state.sourceTokensToday.get(sourceSlug) || 0),
      recommendedProvider: "LOCAL_OLLAMA",
    }
  }

  // Check global daily cap
  if (state.globalTokensToday + estimatedTokens > config.globalDailyTokenCap) {
    return {
      allowed: false,
      denialReason: "GLOBAL_DAILY_CAP_EXCEEDED",
      remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday,
      remainingSourceTokens:
        config.perSourceDailyTokenCap - (state.sourceTokensToday.get(sourceSlug) || 0),
      recommendedProvider: "LOCAL_OLLAMA",
    }
  }

  // Check per-source daily cap
  const sourceTokens = state.sourceTokensToday.get(sourceSlug) || 0
  if (sourceTokens + estimatedTokens > config.perSourceDailyTokenCap) {
    return {
      allowed: false,
      denialReason: "SOURCE_DAILY_CAP_EXCEEDED",
      remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday,
      remainingSourceTokens: config.perSourceDailyTokenCap - sourceTokens,
      recommendedProvider: "LOCAL_OLLAMA",
    }
  }

  // Determine recommended provider based on concurrency and cooldowns
  let recommendedProvider: LLMProvider = "LOCAL_OLLAMA"

  // Prefer local first (cheap-first strategy)
  if (state.activeLocalCalls < config.maxConcurrentLocalCalls) {
    recommendedProvider = "LOCAL_OLLAMA"
  } else if (
    state.activeCloudCalls < config.maxConcurrentCloudCalls &&
    Date.now() - state.lastCloudCall.getTime() >= config.cloudCallCooldownMs
  ) {
    // Cloud is available if local is saturated
    recommendedProvider = "CLOUD_OLLAMA"
  } else {
    // Both saturated - deny with concurrent limit
    return {
      allowed: false,
      denialReason: "CONCURRENT_LIMIT_REACHED",
      remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday,
      remainingSourceTokens: config.perSourceDailyTokenCap - sourceTokens,
      recommendedProvider: "LOCAL_OLLAMA",
    }
  }

  return {
    allowed: true,
    remainingGlobalTokens: config.globalDailyTokenCap - state.globalTokensToday - estimatedTokens,
    remainingSourceTokens: config.perSourceDailyTokenCap - sourceTokens - estimatedTokens,
    recommendedProvider,
  }
}

/**
 * Record token spend after an LLM call completes
 */
export function recordTokenSpend(record: TokenSpendRecord): void {
  maybeResetDaily()

  // Update global tokens
  state.globalTokensToday += record.tokensUsed

  // Update per-source tokens
  const currentSourceTokens = state.sourceTokensToday.get(record.sourceSlug) || 0
  state.sourceTokensToday.set(record.sourceSlug, currentSourceTokens + record.tokensUsed)

  // Track empty outputs for cooldown logic
  if (record.outcome === "EMPTY") {
    const currentEmptyCount = state.sourceEmptyOutputCounts.get(record.sourceSlug) || 0
    const newEmptyCount = currentEmptyCount + 1
    state.sourceEmptyOutputCounts.set(record.sourceSlug, newEmptyCount)

    // Apply cooldown if threshold exceeded
    if (newEmptyCount >= config.emptyOutputThreshold) {
      const cooldownUntil = new Date(Date.now() + config.emptyOutputCooldownMs)
      state.sourceCooldowns.set(record.sourceSlug, cooldownUntil)
      console.warn(
        `[budget-governor] Source ${record.sourceSlug} in cooldown until ${cooldownUntil.toISOString()} after ${newEmptyCount} empty outputs`
      )
    }
  } else if (record.outcome === "SUCCESS") {
    // Reset empty output count on success
    state.sourceEmptyOutputCounts.delete(record.sourceSlug)
  }

  // Update concurrent call tracking
  if (record.provider.startsWith("CLOUD")) {
    state.lastCloudCall = record.timestamp
  }

  console.log(
    `[budget-governor] Recorded ${record.tokensUsed} tokens for ${record.sourceSlug} via ${record.provider} (${record.outcome})`
  )
}

/**
 * Acquire a slot for an LLM call (increment concurrent count)
 */
export function acquireSlot(provider: LLMProvider): boolean {
  if (provider === "LOCAL_OLLAMA") {
    if (state.activeLocalCalls >= config.maxConcurrentLocalCalls) {
      return false
    }
    state.activeLocalCalls++
    return true
  } else {
    if (state.activeCloudCalls >= config.maxConcurrentCloudCalls) {
      return false
    }
    if (Date.now() - state.lastCloudCall.getTime() < config.cloudCallCooldownMs) {
      return false
    }
    state.activeCloudCalls++
    return true
  }
}

/**
 * Release a slot after an LLM call completes
 */
export function releaseSlot(provider: LLMProvider): void {
  if (provider === "LOCAL_OLLAMA") {
    state.activeLocalCalls = Math.max(0, state.activeLocalCalls - 1)
  } else {
    state.activeCloudCalls = Math.max(0, state.activeCloudCalls - 1)
  }
}

/**
 * Open the circuit breaker (stop all LLM calls)
 */
export function openCircuit(reason: "AUTH_ERROR" | "QUOTA_ERROR"): void {
  state.circuitOpen = true
  console.error(`[budget-governor] CIRCUIT OPENED: ${reason} - all LLM calls blocked`)
}

/**
 * Close the circuit breaker (resume LLM calls)
 */
export function closeCircuit(): void {
  state.circuitOpen = false
  console.log("[budget-governor] Circuit closed - LLM calls resumed")
}

/**
 * Get current budget status for monitoring
 */
export interface BudgetStatus {
  globalTokensUsedToday: number
  globalTokensRemainingToday: number
  globalDailyCapUtilization: number
  sourceTokensUsedToday: Record<string, number>
  sourcesInCooldown: Record<string, string>
  activeCloudCalls: number
  activeLocalCalls: number
  circuitOpen: boolean
  lastReset: string
}

export function getBudgetStatus(): BudgetStatus {
  maybeResetDaily()

  const sourcesInCooldown: Record<string, string> = {}
  const now = new Date()
  for (const [source, cooldownUntil] of state.sourceCooldowns) {
    if (cooldownUntil > now) {
      sourcesInCooldown[source] = cooldownUntil.toISOString()
    }
  }

  return {
    globalTokensUsedToday: state.globalTokensToday,
    globalTokensRemainingToday: config.globalDailyTokenCap - state.globalTokensToday,
    globalDailyCapUtilization: state.globalTokensToday / config.globalDailyTokenCap,
    sourceTokensUsedToday: Object.fromEntries(state.sourceTokensToday),
    sourcesInCooldown,
    activeCloudCalls: state.activeCloudCalls,
    activeLocalCalls: state.activeLocalCalls,
    circuitOpen: state.circuitOpen,
    lastReset: state.lastReset.toISOString(),
  }
}

/**
 * Estimate tokens for content (simple heuristic: ~4 chars per token)
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4)
}

/**
 * Clear source cooldown manually (for admin intervention)
 */
export function clearSourceCooldown(sourceSlug: string): boolean {
  if (state.sourceCooldowns.has(sourceSlug)) {
    state.sourceCooldowns.delete(sourceSlug)
    state.sourceEmptyOutputCounts.delete(sourceSlug)
    console.log(`[budget-governor] Cleared cooldown for ${sourceSlug}`)
    return true
  }
  return false
}

// For testing: reset all state
export function _resetForTesting(): void {
  state = {
    globalTokensToday: 0,
    sourceTokensToday: new Map(),
    sourceCooldowns: new Map(),
    sourceEmptyOutputCounts: new Map(),
    activeCloudCalls: 0,
    activeLocalCalls: 0,
    lastCloudCall: new Date(0),
    circuitOpen: false,
    lastReset: new Date(),
  }
  config = { ...DEFAULT_CONFIG }
}
