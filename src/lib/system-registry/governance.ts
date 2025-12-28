/**
 * System Registry Governance
 *
 * SECURITY-SENSITIVE FILE
 * Changes to this file require CODEOWNERS approval.
 *
 * This file controls what can be excluded from observation and what
 * patterns are recognized. Any bypass must be explicitly declared here
 * with a reason, owner, and optional expiry date.
 *
 * Principle: Observation cannot be silenced without an audited decision.
 */

import type { ComponentType } from "./schema"

// =============================================================================
// GOVERNANCE TYPES
// =============================================================================

export interface ExclusionEntry {
  /** The name/pattern being excluded */
  name: string
  /** Why this is excluded from observation */
  reason: string
  /** Team responsible for this exclusion decision */
  owner: string
  /** Optional expiry date (ISO format) - review after this date */
  expiresAt?: string
  /** Link to issue/discussion where this was decided */
  issueLink?: string
}

export interface IntegrationPattern {
  /** Integration identifier (lowercase) */
  key: string
  /** Human-readable name */
  displayName: string
  /** Environment variable prefix to detect */
  envPrefix?: string
  /** npm package name to detect */
  packageName?: string
  /** Why this pattern exists */
  reason: string
}

export interface IgnoredComponent {
  /** Component ID to ignore in drift detection */
  componentId: string
  /** Why this component is ignored */
  reason: string
  /** Team responsible for this decision */
  owner: string
  /** When this was added (for audit trail) */
  addedAt: string
  /** Optional expiry - must re-justify after this date */
  expiresAt?: string
  /** Link to issue where this was decided */
  issueLink?: string
}

// =============================================================================
// LIB EXCLUSIONS
// =============================================================================

/**
 * Directories under src/lib/ that are NOT observed as LIB components.
 *
 * POLICY: A directory should only be excluded if it:
 * 1. Is a different component type (MODULE, internal utility)
 * 2. Is test infrastructure
 * 3. Is the registry itself (meta-exclusion)
 *
 * DO NOT exclude directories just because you don't want to declare them.
 * If it's a library, declare it as LIB with appropriate metadata.
 */
export const LIB_EXCLUSIONS: ExclusionEntry[] = [
  // Different component types
  {
    name: "modules",
    reason: "MODULE type, not LIB - harvested by harvest-modules.ts",
    owner: "team:platform",
  },

  // Test infrastructure
  {
    name: "__tests__",
    reason: "Test infrastructure, not production code",
    owner: "team:platform",
  },

  // Self-reference
  {
    name: "system-registry",
    reason: "This registry itself - meta-exclusion",
    owner: "team:platform",
  },

  // Internal utilities that are part of larger systems
  {
    name: "regulatory-truth",
    reason: "Contains WORKER components, not a standalone library",
    owner: "team:compliance",
  },
]

/**
 * Get excluded directory names for lib harvester.
 */
export function getLibExclusions(): string[] {
  return LIB_EXCLUSIONS.map((e) => e.name)
}

// =============================================================================
// INTEGRATION PATTERNS
// =============================================================================

/**
 * Known integration patterns for deterministic detection.
 *
 * POLICY: Add patterns for any external service the system integrates with.
 * Unknown integrations will be flagged with WARN-level observations.
 */
export const INTEGRATION_PATTERNS: IntegrationPattern[] = [
  // Payment
  {
    key: "stripe",
    displayName: "Stripe",
    envPrefix: "STRIPE_",
    packageName: "stripe",
    reason: "Payment processing",
  },
  {
    key: "gocardless",
    displayName: "GoCardless",
    envPrefix: "GOCARDLESS_",
    reason: "Direct debit payments",
  },

  // Email
  {
    key: "resend",
    displayName: "Resend Email",
    envPrefix: "RESEND_",
    packageName: "resend",
    reason: "Transactional email",
  },

  // AI/ML
  {
    key: "ollama",
    displayName: "Ollama",
    envPrefix: "OLLAMA_",
    reason: "Local LLM inference",
  },
  {
    key: "openai",
    displayName: "OpenAI",
    envPrefix: "OPENAI_",
    packageName: "openai",
    reason: "Cloud LLM API",
  },

  // Croatian government
  {
    key: "fina-cis",
    displayName: "FINA CIS",
    envPrefix: "FINA_",
    reason: "Croatian e-invoice system",
  },

  // Security
  {
    key: "turnstile",
    displayName: "Cloudflare Turnstile",
    envPrefix: "TURNSTILE_",
    reason: "Bot protection",
  },

  // Analytics/Monitoring
  {
    key: "posthog",
    displayName: "PostHog",
    envPrefix: "POSTHOG_",
    packageName: "posthog-js",
    reason: "Product analytics",
  },
  {
    key: "sentry",
    displayName: "Sentry",
    envPrefix: "SENTRY_",
    packageName: "@sentry/nextjs",
    reason: "Error monitoring",
  },
]

/**
 * Environment variable suffixes that indicate external integrations.
 * Used for unknown integration detection.
 */
export const INTEGRATION_ENV_SUFFIXES = [
  "_API_KEY",
  "_API_TOKEN",
  "_TOKEN",
  "_SECRET",
  "_SECRET_KEY",
  "_WEBHOOK_SECRET",
  "_CLIENT_ID",
  "_CLIENT_SECRET",
]

/**
 * File patterns in src/lib/** that suggest an integration wrapper.
 */
export const INTEGRATION_FILE_PATTERNS = [
  "client.ts",
  "sdk.ts",
  "api.ts",
  "webhook.ts",
  "webhooks.ts",
]

// =============================================================================
// IGNORED COMPONENTS
// =============================================================================

/**
 * Components explicitly ignored in drift detection.
 *
 * POLICY: Use this sparingly. Every entry must have:
 * - A clear reason
 * - An owner
 * - Preferably an expiry date for re-evaluation
 *
 * This is the "last resort" for components that cannot be handled
 * by normal declaration or exclusion rules.
 */
export const IGNORED_COMPONENTS: IgnoredComponent[] = [
  // Example (commented out):
  // {
  //   componentId: "lib-legacy-utils",
  //   reason: "Deprecated, scheduled for removal in Q2 2025",
  //   owner: "team:platform",
  //   addedAt: "2024-12-28",
  //   expiresAt: "2025-06-30",
  //   issueLink: "https://github.com/example/issue/123",
  // },
]

/**
 * Check if a component should be ignored in drift detection.
 */
export function isIgnoredComponent(componentId: string): boolean {
  const entry = IGNORED_COMPONENTS.find((e) => e.componentId === componentId)
  if (!entry) return false

  // Check if exclusion has expired
  if (entry.expiresAt) {
    const expiry = new Date(entry.expiresAt)
    if (expiry < new Date()) {
      console.warn(
        `GOVERNANCE WARNING: Ignored component "${componentId}" has expired (${entry.expiresAt}). Review required.`
      )
      return false // Expired exclusions are no longer valid
    }
  }

  return true
}

// =============================================================================
// ALLOWED OWNERS
// =============================================================================

/**
 * Valid owner slugs for component declarations.
 *
 * Format: "team:<slug>" for team ownership (recommended)
 *         "person:<slug>" for individual ownership (temporary only)
 */
export const ALLOWED_OWNERS = [
  // Teams
  "team:platform",
  "team:billing",
  "team:compliance",
  "team:frontend",
  "team:infrastructure",
  "team:security",
  "team:ops",

  // Temporary individual owners (should migrate to team ownership)
  "person:admin",
] as const

export type AllowedOwner = (typeof ALLOWED_OWNERS)[number]

/**
 * Validate an owner string.
 */
export function isValidOwner(owner: string): boolean {
  return ALLOWED_OWNERS.includes(owner as AllowedOwner)
}

// =============================================================================
// CODEREF ENFORCEMENT
// =============================================================================

/**
 * Types that require valid codeRef for CRITICAL/HIGH components.
 */
export const CODEREF_REQUIRED_TYPES: ComponentType[] = [
  "ROUTE_GROUP",
  "WORKER",
  "JOB",
  "QUEUE",
  "MODULE",
  "LIB",
  "STORE",
  "INTEGRATION",
  "UI",
]

/**
 * Criticality levels that require valid codeRef.
 */
export const CODEREF_REQUIRED_CRITICALITIES = {
  CRITICAL: "FAIL" as const, // Missing/invalid codeRef → CI failure
  HIGH: "WARN" as const, // Missing/invalid codeRef → Warning
  MEDIUM: null, // No enforcement
  LOW: null, // No enforcement
}
