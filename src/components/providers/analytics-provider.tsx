"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { initAnalytics, trackPageView } from "@/lib/analytics"
import { reportWebVitals } from "@/lib/web-vitals"
import { registerServiceWorker } from "@/lib/register-sw"
import {
  setFeatureContext,
  clearFeatureContext,
  trackFeatureAdoptionSummary,
  type FeatureContext,
} from "@/lib/feature-analytics"

interface AnalyticsProviderProps {
  children: React.ReactNode
  /** Feature context from authenticated user's company */
  featureContext?: FeatureContext
}

export function AnalyticsProvider({ children, featureContext }: AnalyticsProviderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const webVitalsReported = useRef(false)

  useEffect(() => {
    initAnalytics()
    // Register service worker for offline support
    registerServiceWorker()
  }, [])

  // Set feature context when provided (after authentication)
  useEffect(() => {
    if (featureContext) {
      setFeatureContext(featureContext)
    }

    // Cleanup on unmount or context change
    return () => {
      // Track adoption summary before clearing
      trackFeatureAdoptionSummary()
    }
  }, [featureContext])

  // Clear feature context on logout (when featureContext becomes undefined)
  useEffect(() => {
    if (!featureContext) {
      clearFeatureContext()
    }
  }, [featureContext])

  useEffect(() => {
    // Report CWV once per session with initial pathname
    if (!webVitalsReported.current && pathname) {
      reportWebVitals(pathname)
      webVitalsReported.current = true
    }
  }, [pathname])

  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname
      trackPageView(url)
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
