// src/lib/feature-flags/index.ts

// Types
export type {
  FeatureFlagCategory,
  FeatureFlagContext,
  FeatureFlagDefinition,
  FeatureFlagEvaluation,
  FeatureFlagKey,
} from "./types"

export { FEATURE_FLAG_CATEGORIES, FEATURE_FLAG_KEYS } from "./types"

// Server-side service
export {
  clearFlagCache,
  evaluateFlag,
  getAllFlags,
  getFlagsByCategory,
  invalidateFlag,
  isFeatureEnabled,
} from "./service"

// Server actions (for use in Server Components and API routes)
export {
  createFeatureFlag,
  createFlagOverride,
  deleteFeatureFlag,
  deleteFlagOverride,
  getFlagHistory,
  toggleFeatureFlag,
  updateFeatureFlag,
  updateRolloutPercentage,
} from "./actions"
