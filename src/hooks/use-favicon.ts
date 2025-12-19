"use client"

import { useEffect, useCallback } from "react"
import { setFaviconState, resetFavicon, flashFavicon, getFaviconState } from "@/lib/favicon"

type FaviconState = "default" | "success" | "error" | "loading"

/**
 * Hook for managing state-aware favicons
 *
 * Usage:
 *   const { setLoading, setSuccess, setError, reset } = useFavicon()
 *
 *   // During API call
 *   setLoading()
 *
 *   // On success (flashes amber for 2s)
 *   setSuccess()
 *
 *   // On error (flashes red for 2s)
 *   setError()
 */
export function useFavicon() {
  // Reset on unmount to prevent stuck states
  useEffect(() => {
    return () => {
      // Only reset if we're in a non-default state when component unmounts
      if (getFaviconState() === "loading") {
        resetFavicon()
      }
    }
  }, [])

  const setLoading = useCallback(() => {
    setFaviconState("loading")
  }, [])

  const setSuccess = useCallback((flash = true) => {
    if (flash) {
      flashFavicon("success", 2000)
    } else {
      setFaviconState("success")
    }
  }, [])

  const setError = useCallback((flash = true) => {
    if (flash) {
      flashFavicon("error", 2000)
    } else {
      setFaviconState("error")
    }
  }, [])

  const reset = useCallback(() => {
    resetFavicon()
  }, [])

  const setState = useCallback((state: FaviconState) => {
    setFaviconState(state)
  }, [])

  return {
    setLoading,
    setSuccess,
    setError,
    reset,
    setState,
  }
}

export default useFavicon
