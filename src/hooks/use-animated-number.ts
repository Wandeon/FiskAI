"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Options = {
  durationMs?: number
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function useAnimatedNumber(targetValue: number, options: Options = {}) {
  const { durationMs = 700 } = options
  const [value, setValue] = useState(targetValue)
  const valueRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  }, [])

  useEffect(() => {
    if (!Number.isFinite(targetValue)) return
    if (prefersReducedMotion || durationMs <= 0) {
      setValue(targetValue)
      return
    }

    const from = valueRef.current
    const to = targetValue
    if (from === to) return

    const start = performance.now()
    const delta = to - from

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = easeOutCubic(t)
      setValue(from + delta * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [durationMs, prefersReducedMotion, targetValue])

  return value
}
