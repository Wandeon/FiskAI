// src/components/onboarding/step-basic-info.tsx
"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "@/lib/stores/onboarding-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { trackEvent, AnalyticsEvents } from "@/lib/analytics"

export function StepBasicInfo() {
  const { data, updateData, setStep, isStepValid } = useOnboardingStore()

  useEffect(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_STARTED)
  }, [])

  const handleNext = () => {
    if (isStepValid(1)) {
      trackEvent(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, { step: 1 })
      setStep(2)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Osnovni podaci tvrtke</h2>
        <p className="mt-1 text-sm text-gray-600">
          Unesite naziv i OIB vaše tvrtke
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Naziv tvrtke *
          </label>
          <Input
            id="name"
            value={data.name || ""}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder="Moja Tvrtka d.o.o."
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="oib" className="block text-sm font-medium text-gray-700">
            OIB *
          </label>
          <Input
            id="oib"
            value={data.oib || ""}
            onChange={(e) => updateData({ oib: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            placeholder="12345678901"
            maxLength={11}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Osobni identifikacijski broj (11 znamenki)
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!isStepValid(1)}>
          Dalje
        </Button>
      </div>
    </div>
  )
}
