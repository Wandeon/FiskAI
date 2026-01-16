// src/lib/regulatory-truth/workers/utils/feature-flags.ts

/**
 * Pipeline mode enumeration for RTL_PIPELINE_MODE environment variable
 */
export type PipelineMode = "PHASE_D" | "LEGACY" | "OFF"

/**
 * Feature flags evaluated at drainer level (single source of truth)
 *
 * Kill switch pattern: All feature flags are evaluated in one place (the drainer)
 * rather than in individual workers. This ensures:
 * 1. Single point of control for enabling/disabling features
 * 2. Consistent behavior across the pipeline
 * 3. Easy rollback in production emergencies
 */
export const FeatureFlags = {
  /**
   * Pipeline mode kill switch (RTL Phase-D Migration)
   *
   * Controls which pipeline path is active:
   * - "PHASE_D": CandidateFact-based pipeline (new)
   *   - Extractor queues compose directly
   *   - Drainer only handles orphaned CandidateFacts as backstop
   *   - continuous-pipeline is disabled
   *
   * - "LEGACY": SourcePointer-based pipeline (old)
   *   - Drainer controls all queue routing
   *   - continuous-pipeline is active
   *   - Extractor does not queue compose
   *
   * - "OFF": Pipeline halted (no LLM calls)
   *   - All processing stages skip
   *   - Discovery may still run but no extraction/compose/etc
   *   - Use during maintenance or emergencies
   *
   * Default: "OFF" (safe default - no spending until explicitly enabled)
   *
   * To enable Phase-D pipeline:
   *   RTL_PIPELINE_MODE=PHASE_D
   *
   * To enable legacy pipeline:
   *   RTL_PIPELINE_MODE=LEGACY
   */
  get pipelineMode(): PipelineMode {
    const mode = process.env.RTL_PIPELINE_MODE?.toUpperCase()
    if (mode === "PHASE_D") return "PHASE_D"
    if (mode === "LEGACY") return "LEGACY"
    return "OFF" // Default to OFF for safety
  },

  /**
   * Helper: Check if pipeline is actively processing
   */
  get pipelineEnabled(): boolean {
    return this.pipelineMode !== "OFF"
  },

  /**
   * Helper: Check if Phase-D path is active
   */
  get isPhaseD(): boolean {
    return this.pipelineMode === "PHASE_D"
  },

  /**
   * Helper: Check if Legacy path is active
   */
  get isLegacy(): boolean {
    return this.pipelineMode === "LEGACY"
  },

  /**
   * Classification kill switch (Task 11 - Docker Worker Infrastructure Hardening)
   *
   * When false: drainer queues directly to extraction (legacy behavior)
   * When true: drainer queues to classifier first (pre-extraction classification)
   *
   * Default: false (legacy mode - direct to extraction)
   * This ensures safe deployment - classification is opt-in until fully tested.
   *
   * To enable classification in production:
   *   CLASSIFICATION_ENABLED=true
   */
  get classificationEnabled(): boolean {
    return process.env.CLASSIFICATION_ENABLED === "true"
  },
} as const
