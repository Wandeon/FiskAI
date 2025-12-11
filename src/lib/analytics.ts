import posthog from "posthog-js"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"

export function initAnalytics() {
  if (typeof window === "undefined") return
  if (!POSTHOG_KEY) return

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // We capture manually for SPA
    capture_pageleave: true,
    autocapture: false, // Disable autocapture for GDPR
  })
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.identify(userId, properties)
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.capture(event, properties)
}

export function trackPageView(path: string) {
  if (!POSTHOG_KEY) return
  posthog.capture("$pageview", { $current_url: path })
}

// Predefined events for consistency
export const AnalyticsEvents = {
  // Onboarding funnel
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Invoice funnel
  INVOICE_CREATED: "invoice_created",
  INVOICE_SENT: "invoice_sent",
  INVOICE_FISCALIZED: "invoice_fiscalized",

  // Contact events
  CONTACT_CREATED: "contact_created",
  CONTACT_UPDATED: "contact_updated",

  // Product events
  PRODUCT_CREATED: "product_created",

  // Settings
  SETTINGS_UPDATED: "settings_updated",
  EINVOICE_PROVIDER_CONFIGURED: "einvoice_provider_configured",
} as const
