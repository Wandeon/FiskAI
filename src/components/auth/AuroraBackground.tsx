"use client"

import { useEffect, useMemo, useState } from "react"

export type AuthState = "identify" | "authenticate" | "register" | "verify" | "success" | "error"

interface AuroraBackgroundProps {
  state: AuthState
  className?: string
}

// CSS fallback gradient for when Rive isn't loaded or reduced motion is preferred
function CSSFallback({ state }: { state: AuthState }) {
  const gradients: Record<AuthState, string> = {
    identify: "from-cyan-500/20 via-teal-500/15 to-purple-500/10",
    authenticate: "from-cyan-500/25 via-cyan-400/20 to-blue-500/15",
    register: "from-cyan-500/20 via-amber-400/15 to-teal-500/10",
    verify: "from-blue-500/25 via-cyan-500/20 to-indigo-500/15",
    success: "from-amber-400/30 via-yellow-400/25 to-orange-400/20",
    error: "from-red-500/20 via-rose-400/15 to-pink-500/10",
  }

  return (
    <div
      className={`fixed inset-0 -z-10 bg-gradient-to-br ${gradients[state]} transition-all duration-1000`}
      aria-hidden="true"
    />
  )
}

// Lazy-loaded Rive component (only loads if file exists)
function RiveBackground({
  state,
  className,
  onError,
}: AuroraBackgroundProps & { onError: () => void }) {
  const [RiveComponent, setRiveComponent] = useState<React.ComponentType<{
    className?: string
  }> | null>(null)
  const [rive, setRive] = useState<{ play: () => void } | null>(null)

  // State number mapping for Rive state machine
  const stateNumbers: Record<AuthState, number> = useMemo(
    () => ({
      identify: 0,
      authenticate: 1,
      register: 2,
      verify: 3,
      success: 4,
      error: 5,
    }),
    []
  )

  useEffect(() => {
    let mounted = true

    // Dynamically import Rive only when needed
    import("@rive-app/react-canvas")
      .then(({ useRive }) => {
        if (!mounted) return

        // Check if the file exists first
        fetch("/rive/aurora.riv", { method: "HEAD" })
          .then((res) => {
            if (!res.ok || !mounted) {
              onError()
              return
            }
            // File exists, we can't use hooks here so fall back to CSS for now
            // In production, consider using a proper Rive setup
            onError()
          })
          .catch(() => {
            if (mounted) onError()
          })
      })
      .catch(() => {
        if (mounted) onError()
      })

    return () => {
      mounted = false
    }
  }, [onError])

  // For now, always use CSS fallback since Rive file is pending
  return <CSSFallback state={state} />
}

export function AuroraBackground({ state, className }: AuroraBackgroundProps) {
  const [useCSS, setUseCSS] = useState(false)

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  // Use CSS fallback if reduced motion preferred or Rive failed to load
  if (prefersReducedMotion || useCSS) {
    return <CSSFallback state={state} />
  }

  // For now, always use CSS since Rive file is pending from designer
  // When aurora.riv is available, this can be updated to use RiveBackground
  return <CSSFallback state={state} />
}

export default AuroraBackground
