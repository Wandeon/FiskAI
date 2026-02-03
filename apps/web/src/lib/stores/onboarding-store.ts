// apps/web/src/lib/stores/onboarding-store.ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type LegalForm = "OBRT_PAUSAL" | "OBRT_REAL" | "DOO" | "JDOO"
export type DataSource = "MANUAL" | "OCR_OBRTNICA" | "OCR_SUDSKO" | "VIES" | "SUDSKI_REGISTAR"

export interface OnboardingData {
  // Step 1: Business
  legalForm: LegalForm
  oib: string
  name: string
  address: string
  city: string
  zipCode: string
  dataSource: DataSource

  // Step 2: Tax
  isVatPayer: boolean
  vatNumber: string
  acceptsCash: boolean

  // Pausalni-specific
  employedElsewhere: boolean
  expectedIncomeRange: "under30" | "30to60" | "60to100" | "over100" | ""

  // Step 3: Contact
  email: string
  phone: string
  iban: string

  // Business Premises (simplified - just default)
  premisesName: string
  premisesCode: string
}

interface OnboardingState {
  currentStep: number
  data: OnboardingData
  isComplete: boolean

  // Actions
  setStep: (step: number) => void
  updateData: (updates: Partial<OnboardingData>) => void
  resetOnboarding: () => void
  setComplete: () => void
}

const initialData: OnboardingData = {
  legalForm: "OBRT_PAUSAL",
  oib: "",
  name: "",
  address: "",
  city: "",
  zipCode: "",
  dataSource: "MANUAL",

  isVatPayer: false,
  vatNumber: "",
  acceptsCash: false,

  employedElsewhere: false,
  expectedIncomeRange: "",

  email: "",
  phone: "",
  iban: "",

  premisesName: "Glavna poslovnica",
  premisesCode: "1",
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 1,
      data: initialData,
      isComplete: false,

      setStep: (step) => set({ currentStep: step }),

      updateData: (updates) =>
        set((state) => ({
          data: { ...state.data, ...updates },
        })),

      resetOnboarding: () =>
        set({
          currentStep: 1,
          data: initialData,
          isComplete: false,
        }),

      setComplete: () => set({ isComplete: true }),
    }),
    {
      name: "fiskai-onboarding",
      // Only persist data, not step (user should start where they left off)
      partialize: (state) => ({ data: state.data }),
    }
  )
)

// Selector hooks for specific data
export const useOnboardingData = () => useOnboardingStore((s) => s.data)
export const useOnboardingStep = () => useOnboardingStore((s) => s.currentStep)
export const useOnboardingActions = () =>
  useOnboardingStore((s) => ({
    setStep: s.setStep,
    updateData: s.updateData,
    resetOnboarding: s.resetOnboarding,
    setComplete: s.setComplete,
  }))
