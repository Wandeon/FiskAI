"use client"

import { useEffect, useMemo } from "react"
import { useRive, useStateMachineInput } from "@rive-app/react-canvas"

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

export function AuroraBackground({ state, className }: AuroraBackgroundProps) {
  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  // State number mapping for Rive state machine
  const stateNumbers: Record<AuthState, number> = {
    identify: 0,
    authenticate: 1,
    register: 2,
    verify: 3,
    success: 4,
    error: 5,
  }

  const { rive, RiveComponent } = useRive({
    src: "/rive/aurora.riv",
    stateMachines: "State Machine 1",
    autoplay: !prefersReducedMotion,
  })

  const stateInput = useStateMachineInput(rive, "State Machine 1", "state")
  const errorTrigger = useStateMachineInput(rive, "State Machine 1", "error")

  useEffect(() => {
    if (stateInput) {
      stateInput.value = stateNumbers[state]
    }
  }, [state, stateInput])

  useEffect(() => {
    if (state === "error" && errorTrigger) {
      errorTrigger.fire()
    }
  }, [state, errorTrigger])

  // Use CSS fallback if Rive not available or reduced motion
  if (prefersReducedMotion || !rive) {
    return <CSSFallback state={state} />
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className || ""}`} aria-hidden="true">
      <RiveComponent className="h-full w-full" />
    </div>
  )
}

export default AuroraBackground
