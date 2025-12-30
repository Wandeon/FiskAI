// This file configures the initialization of Sentry on the client.
// For Turbopack compatibility, this replaces sentry.client.config.ts
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

// Instrument client-side router transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out sensitive data before sending
  beforeSend(event) {
    // Redact sensitive headers (client-side requests may include these)
    if (event.request?.headers) {
      delete event.request.headers["authorization"]
      delete event.request.headers["cookie"]
      delete event.request.headers["x-api-key"]
    }

    // Redact sensitive URL parameters
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url)
        // Remove common sensitive query parameters
        url.searchParams.delete("token")
        url.searchParams.delete("code")
        url.searchParams.delete("session")
        url.searchParams.delete("api_key")
        url.searchParams.delete("apikey")
        event.request.url = url.toString()
      } catch {
        // If URL parsing fails, leave it as is
      }
    }

    // Redact breadcrumb data that may contain sensitive information
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data?.url) {
          try {
            const url = new URL(breadcrumb.data.url)
            url.searchParams.delete("token")
            url.searchParams.delete("code")
            url.searchParams.delete("session")
            url.searchParams.delete("api_key")
            url.searchParams.delete("apikey")
            breadcrumb.data.url = url.toString()
          } catch {
            // If URL parsing fails, leave it as is
          }
        }
        return breadcrumb
      })
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Network errors that are usually transient
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User-triggered navigation
    "ResizeObserver loop",
  ],

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
})
