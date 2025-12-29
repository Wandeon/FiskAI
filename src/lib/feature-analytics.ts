/**
 * Feature Analytics - Correlation between features and user behavior
 *
 * This module extends the base analytics to automatically tag events with:
 * - Active feature flags
 * - Module entitlements
 * - A/B test variants
 *
 * Enables measuring feature flag impact on key metrics and calculating ROI.
 *
 * @see https://github.com/Wandeon/FiskAI/issues/297
 */

import posthog from "posthog-js"
import { trackEvent } from "@/lib/analytics"
import type { ModuleKey } from "@/lib/modules/definitions"
import type { TenantFeatureFlags } from "@/lib/config/features"

// =============================================================================
// Types
// =============================================================================

export interface FeatureContext {
  /** Active feature flags from Company.featureFlags */
  featureFlags: TenantFeatureFlags
  /** Enabled module entitlements */
  entitlements: ModuleKey[]
  /** Current subscription plan */
  plan?: string
  /** A/B test variants user is enrolled in */
  experiments?: Record<string, string>
}

export interface FeatureUsageEvent {
  /** The feature being used */
  feature: ModuleKey | string
  /** Specific action within the feature */
  action: string
  /** Optional properties */
  properties?: Record<string, unknown>
}

export interface FeatureAdoptionMetrics {
  /** Feature identifier */
  feature: string
  /** First time user used this feature */
  firstUsed?: Date
  /** Last time user used this feature */
  lastUsed?: Date
  /** Total usage count in this session */
  sessionUsageCount: number
  /** Total time spent (if tracked) */
  totalTimeMs?: number
}

// =============================================================================
// Feature Context Management
// =============================================================================

let _currentFeatureContext: FeatureContext | null = null
const _featureAdoption: Map<string, FeatureAdoptionMetrics> = new Map()
const _featureTimers: Map<string, number> = new Map()

/**
 * Set the current feature context for analytics enrichment.
 * Call this after user authentication with company data.
 */
export function setFeatureContext(context: FeatureContext): void {
  _currentFeatureContext = context

  // Register feature context with PostHog for automatic enrichment
  if (typeof window !== "undefined") {
    posthog.register({
      $feature_flags: context.featureFlags,
      $entitlements: context.entitlements,
      $plan: context.plan,
      $experiments: context.experiments,
    })

    // Also set as person properties for cohort analysis
    posthog.setPersonProperties({
      entitlements: context.entitlements,
      plan: context.plan,
      entitlement_count: context.entitlements.length,
    })
  }
}

/**
 * Get the current feature context.
 */
export function getFeatureContext(): FeatureContext | null {
  return _currentFeatureContext
}

/**
 * Clear the feature context (e.g., on logout).
 */
export function clearFeatureContext(): void {
  _currentFeatureContext = null
  _featureAdoption.clear()
  _featureTimers.clear()

  if (typeof window !== "undefined") {
    posthog.unregister("$feature_flags")
    posthog.unregister("$entitlements")
    posthog.unregister("$plan")
    posthog.unregister("$experiments")
  }
}

// =============================================================================
// Feature Usage Tracking
// =============================================================================

/**
 * Track feature usage with automatic feature flag context.
 * This is the primary method for tracking feature-correlated events.
 */
export function trackFeatureUsage(event: FeatureUsageEvent): void {
  const context = _currentFeatureContext

  // Build enriched properties
  const enrichedProperties: Record<string, unknown> = {
    ...event.properties,
    feature: event.feature,
    action: event.action,
    timestamp: new Date().toISOString(),
  }

  // Add feature context if available
  if (context) {
    enrichedProperties.$feature_flags = context.featureFlags
    enrichedProperties.$entitlements = context.entitlements
    enrichedProperties.$plan = context.plan
    enrichedProperties.$experiments = context.experiments

    // Add computed properties for easier filtering
    enrichedProperties.has_feature_flag = Object.keys(context.featureFlags).length > 0
    enrichedProperties.entitlement_count = context.entitlements.length
    enrichedProperties.is_entitled_to_feature =
      typeof event.feature === "string" && context.entitlements.includes(event.feature as ModuleKey)
  }

  // Track the event
  trackEvent(`feature_${event.feature}_${event.action}`, enrichedProperties)

  // Update adoption metrics
  updateFeatureAdoption(event.feature, event.action)
}

/**
 * Track when a user starts using a feature (for time tracking).
 */
export function startFeatureSession(feature: string): void {
  _featureTimers.set(feature, Date.now())

  trackFeatureUsage({
    feature,
    action: "session_started",
  })
}

/**
 * Track when a user stops using a feature (for time tracking).
 */
export function endFeatureSession(feature: string): void {
  const startTime = _featureTimers.get(feature)
  const duration = startTime ? Date.now() - startTime : undefined

  trackFeatureUsage({
    feature,
    action: "session_ended",
    properties: {
      duration_ms: duration,
      duration_seconds: duration ? Math.round(duration / 1000) : undefined,
    },
  })

  // Update total time in adoption metrics
  if (duration) {
    const metrics = _featureAdoption.get(feature)
    if (metrics) {
      metrics.totalTimeMs = (metrics.totalTimeMs || 0) + duration
    }
  }

  _featureTimers.delete(feature)
}

// =============================================================================
// Feature Adoption Tracking
// =============================================================================

/**
 * Update feature adoption metrics.
 */
function updateFeatureAdoption(feature: string, action: string): void {
  const now = new Date()
  let metrics = _featureAdoption.get(feature)

  if (!metrics) {
    metrics = {
      feature,
      firstUsed: now,
      lastUsed: now,
      sessionUsageCount: 1,
    }
    _featureAdoption.set(feature, metrics)

    // Track first-time feature adoption
    trackEvent("feature_first_adoption", {
      feature,
      action,
      adopted_at: now.toISOString(),
      ..._currentFeatureContext,
    })
  } else {
    metrics.lastUsed = now
    metrics.sessionUsageCount++
  }
}

/**
 * Get adoption metrics for all features used in this session.
 */
export function getFeatureAdoptionMetrics(): FeatureAdoptionMetrics[] {
  return Array.from(_featureAdoption.values())
}

/**
 * Track feature adoption summary (call before session ends).
 */
export function trackFeatureAdoptionSummary(): void {
  const metrics = getFeatureAdoptionMetrics()

  if (metrics.length === 0) return

  trackEvent("feature_adoption_summary", {
    features_used: metrics.map((m) => m.feature),
    feature_count: metrics.length,
    total_interactions: metrics.reduce((sum, m) => sum + m.sessionUsageCount, 0),
    metrics: metrics.map((m) => ({
      feature: m.feature,
      usage_count: m.sessionUsageCount,
      time_spent_ms: m.totalTimeMs,
    })),
    ..._currentFeatureContext,
  })
}

// =============================================================================
// Conversion Tracking
// =============================================================================

/**
 * Track a conversion event with feature flag attribution.
 * Use this for key business metrics (signup, purchase, etc.)
 */
export function trackFeatureConversion(
  conversionType: string,
  value?: number,
  properties?: Record<string, unknown>
): void {
  const context = _currentFeatureContext

  const enrichedProperties: Record<string, unknown> = {
    ...properties,
    conversion_type: conversionType,
    value,
    timestamp: new Date().toISOString(),
  }

  // Add feature context for attribution
  if (context) {
    enrichedProperties.$feature_flags = context.featureFlags
    enrichedProperties.$entitlements = context.entitlements
    enrichedProperties.$plan = context.plan
    enrichedProperties.$experiments = context.experiments

    // Add attribution flags for easier analysis
    enrichedProperties.active_flags = Object.entries(context.featureFlags)
      .filter(([, v]) => v)
      .map(([k]) => k)
    enrichedProperties.active_experiments = context.experiments
      ? Object.entries(context.experiments).map(([k, v]) => `${k}:${v}`)
      : []
  }

  trackEvent(`conversion_${conversionType}`, enrichedProperties)
}

// =============================================================================
// A/B Test Tracking
// =============================================================================

/**
 * Track when a user is enrolled in an experiment variant.
 */
export function trackExperimentEnrollment(experimentName: string, variant: string): void {
  // Update context
  if (_currentFeatureContext) {
    _currentFeatureContext.experiments = {
      ..._currentFeatureContext.experiments,
      [experimentName]: variant,
    }
  }

  trackEvent("experiment_enrolled", {
    experiment: experimentName,
    variant,
    timestamp: new Date().toISOString(),
  })

  // Register for automatic enrichment
  if (typeof window !== "undefined") {
    posthog.register({
      [`$experiment_${experimentName}`]: variant,
    })
  }
}

/**
 * Track experiment exposure (when user sees the variant).
 */
export function trackExperimentExposure(
  experimentName: string,
  variant: string,
  properties?: Record<string, unknown>
): void {
  trackEvent("experiment_exposure", {
    experiment: experimentName,
    variant,
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

// =============================================================================
// Module-Specific Tracking
// =============================================================================

/**
 * Pre-defined feature events for consistency.
 */
export const FeatureEvents = {
  // Invoicing module
  INVOICE_VIEWED: { feature: "invoicing" as ModuleKey, action: "viewed" },
  INVOICE_CREATED: { feature: "invoicing" as ModuleKey, action: "created" },
  INVOICE_EDITED: { feature: "invoicing" as ModuleKey, action: "edited" },
  INVOICE_SENT: { feature: "invoicing" as ModuleKey, action: "sent" },
  INVOICE_DELETED: { feature: "invoicing" as ModuleKey, action: "deleted" },

  // E-Invoicing module
  EINVOICE_CREATED: { feature: "e-invoicing" as ModuleKey, action: "created" },
  EINVOICE_VALIDATED: { feature: "e-invoicing" as ModuleKey, action: "validated" },
  EINVOICE_SENT: { feature: "e-invoicing" as ModuleKey, action: "sent" },

  // Fiscalization module
  FISCAL_RECEIPT_CREATED: { feature: "fiscalization" as ModuleKey, action: "receipt_created" },
  FISCAL_RECEIPT_SENT: { feature: "fiscalization" as ModuleKey, action: "receipt_sent" },

  // Contacts module
  CONTACT_VIEWED: { feature: "contacts" as ModuleKey, action: "viewed" },
  CONTACT_CREATED: { feature: "contacts" as ModuleKey, action: "created" },
  CONTACT_EDITED: { feature: "contacts" as ModuleKey, action: "edited" },

  // Products module
  PRODUCT_VIEWED: { feature: "products" as ModuleKey, action: "viewed" },
  PRODUCT_CREATED: { feature: "products" as ModuleKey, action: "created" },
  PRODUCT_EDITED: { feature: "products" as ModuleKey, action: "edited" },

  // Expenses module
  EXPENSE_CREATED: { feature: "expenses" as ModuleKey, action: "created" },
  EXPENSE_CATEGORIZED: { feature: "expenses" as ModuleKey, action: "categorized" },

  // Banking module
  BANK_ACCOUNT_CONNECTED: { feature: "banking" as ModuleKey, action: "account_connected" },
  BANK_TRANSACTION_IMPORTED: { feature: "banking" as ModuleKey, action: "transaction_imported" },

  // Reconciliation module
  RECONCILIATION_STARTED: { feature: "reconciliation" as ModuleKey, action: "started" },
  RECONCILIATION_COMPLETED: { feature: "reconciliation" as ModuleKey, action: "completed" },
  TRANSACTION_MATCHED: { feature: "reconciliation" as ModuleKey, action: "transaction_matched" },

  // Reports module
  REPORT_GENERATED: { feature: "reports-basic" as ModuleKey, action: "generated" },
  REPORT_EXPORTED: { feature: "reports-basic" as ModuleKey, action: "exported" },
  ADVANCED_REPORT_GENERATED: { feature: "reports-advanced" as ModuleKey, action: "generated" },

  // Pausalni module
  PAUSALNI_FORM_STARTED: { feature: "pausalni" as ModuleKey, action: "form_started" },
  PAUSALNI_FORM_COMPLETED: { feature: "pausalni" as ModuleKey, action: "form_completed" },
  POSD_GENERATED: { feature: "pausalni" as ModuleKey, action: "posd_generated" },

  // VAT module
  VAT_REPORT_GENERATED: { feature: "vat" as ModuleKey, action: "report_generated" },
  VAT_SUBMISSION_STARTED: { feature: "vat" as ModuleKey, action: "submission_started" },

  // Documents module
  DOCUMENT_UPLOADED: { feature: "documents" as ModuleKey, action: "uploaded" },
  DOCUMENT_VIEWED: { feature: "documents" as ModuleKey, action: "viewed" },
  DOCUMENT_ATTACHED: { feature: "documents" as ModuleKey, action: "attached" },

  // AI Assistant module
  AI_CHAT_STARTED: { feature: "ai-assistant" as ModuleKey, action: "chat_started" },
  AI_QUERY_SENT: { feature: "ai-assistant" as ModuleKey, action: "query_sent" },
  AI_SUGGESTION_ACCEPTED: { feature: "ai-assistant" as ModuleKey, action: "suggestion_accepted" },
  AI_SUGGESTION_REJECTED: { feature: "ai-assistant" as ModuleKey, action: "suggestion_rejected" },

  // POS module
  POS_SALE_COMPLETED: { feature: "pos" as ModuleKey, action: "sale_completed" },
  POS_REFUND_PROCESSED: { feature: "pos" as ModuleKey, action: "refund_processed" },
} as const

/**
 * Helper to track predefined feature events.
 */
export function trackFeatureEvent(
  eventKey: keyof typeof FeatureEvents,
  properties?: Record<string, unknown>
): void {
  const event = FeatureEvents[eventKey]
  trackFeatureUsage({
    ...event,
    properties,
  })
}

// =============================================================================
// Anomaly Detection Helpers
// =============================================================================

/**
 * Track feature-specific metrics for anomaly detection.
 * These can be used to set up alerts in PostHog.
 */
export function trackFeatureMetric(
  feature: string,
  metric: string,
  value: number,
  properties?: Record<string, unknown>
): void {
  trackEvent("feature_metric", {
    feature,
    metric,
    value,
    ...properties,
    timestamp: new Date().toISOString(),
    ..._currentFeatureContext,
  })
}

/**
 * Track feature errors for debugging and alerts.
 */
export function trackFeatureError(
  feature: string,
  errorType: string,
  errorMessage: string,
  properties?: Record<string, unknown>
): void {
  trackEvent("feature_error", {
    feature,
    error_type: errorType,
    error_message: errorMessage,
    ...properties,
    timestamp: new Date().toISOString(),
    ..._currentFeatureContext,
  })
}
