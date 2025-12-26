// src/lib/assistant/reasoning/feature-flags.ts

export type ReasoningMode = "off" | "shadow" | "live"

/**
 * Check if the Visible Reasoning UX is enabled.
 */
export function isReasoningEnabled(): boolean {
  return process.env.REASONING_UX_ENABLED === "true"
}

/**
 * Get the current reasoning mode.
 * - off: Use legacy pipeline only
 * - shadow: Run both pipelines, legacy serves response, new logs trace
 * - live: Use new reasoning pipeline
 */
export function getReasoningMode(): ReasoningMode {
  const mode = process.env.REASONING_MODE
  if (mode === "shadow" || mode === "live") {
    return mode
  }
  return "off"
}

/**
 * Check if user is in the reasoning beta cohort.
 * Uses percentage-based rollout.
 */
export function isInReasoningBeta(userId: string): boolean {
  const percentage = parseInt(process.env.REASONING_BETA_PERCENTAGE || "0", 10)
  if (percentage <= 0) return false
  if (percentage >= 100) return true

  // Simple hash-based rollout
  const hash = hashString(userId)
  return hash % 100 < percentage
}

/**
 * Get reasoning mode for a specific user.
 * Combines feature flags with per-user beta status.
 */
export function getReasoningModeForUser(userId?: string): ReasoningMode {
  const globalMode = getReasoningMode()

  // Shadow mode always applies globally
  if (globalMode === "shadow") {
    return "shadow"
  }

  // Live mode respects beta cohort
  if (globalMode === "live") {
    if (!userId) return "off"
    return isInReasoningBeta(userId) ? "live" : "off"
  }

  return "off"
}

/**
 * Simple string hash for consistent user bucketing.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
