import { useState, useCallback, useMemo } from "react"
import type { AssistantResponse, Surface, Topic } from "../types"

interface UseCTAEligibilityProps {
  surface: Surface
}

type CTAType = "contextual" | "personalization" | null
type EligibilityReason =
  | "first_query"
  | "non_regulatory"
  | "refusal"
  | "app_surface"
  | "dismissed"
  | "eligible"

const PERSONALIZATION_KEYWORDS = [
  "my ",
  "mine",
  "my business",
  "my company",
  "my revenue",
  "my threshold",
  "for me",
  "calculate for",
  "my invoices",
  "my data",
]

export function useCTAEligibility({ surface }: UseCTAEligibilityProps) {
  const [successfulQueryCount, setSuccessfulQueryCount] = useState(0)
  const [lastPersonalizationIntent, setLastPersonalizationIntent] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const hasPersonalizationIntent = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase()
    return PERSONALIZATION_KEYWORDS.some((keyword) => lowerQuery.includes(keyword))
  }, [])

  const recordAnswer = useCallback(
    (answer: AssistantResponse, query: string) => {
      // Only count successful REGULATORY answers with citations
      if (answer.kind === "ANSWER" && answer.topic === "REGULATORY" && answer.citations) {
        setSuccessfulQueryCount((prev) => prev + 1)
      }

      setLastPersonalizationIntent(hasPersonalizationIntent(query))
    },
    [hasPersonalizationIntent]
  )

  const dismiss = useCallback(() => {
    setIsDismissed(true)
    // Store dismissal in localStorage with 7-day expiry
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000
    localStorage.setItem("assistant_cta_dismissed", JSON.stringify({ expiry }))
  }, [])

  const eligibility = useMemo(() => {
    // APP surface never shows marketing CTAs
    if (surface === "APP") {
      return { isEligible: false, reason: "app_surface" as EligibilityReason, ctaType: null }
    }

    // Dismissed
    if (isDismissed) {
      return { isEligible: false, reason: "dismissed" as EligibilityReason, ctaType: null }
    }

    // First query with personalization intent
    if (successfulQueryCount >= 1 && lastPersonalizationIntent) {
      return {
        isEligible: true,
        reason: "eligible" as EligibilityReason,
        ctaType: "personalization" as CTAType,
      }
    }

    // 2+ successful queries
    if (successfulQueryCount >= 2) {
      return {
        isEligible: true,
        reason: "eligible" as EligibilityReason,
        ctaType: "contextual" as CTAType,
      }
    }

    // First query without personalization
    return {
      isEligible: false,
      reason: "first_query" as EligibilityReason,
      ctaType: null,
    }
  }, [surface, isDismissed, successfulQueryCount, lastPersonalizationIntent])

  return {
    isEligible: eligibility.isEligible,
    eligibilityReason: eligibility.reason,
    ctaType: eligibility.ctaType,
    successfulQueryCount,
    hasPersonalizationIntent,
    recordAnswer,
    dismiss,
  }
}
