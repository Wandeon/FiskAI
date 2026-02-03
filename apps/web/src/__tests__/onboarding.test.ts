import { describe, it, expect, beforeEach } from "vitest"
import { useOnboardingStore } from "@/lib/stores/onboarding-store"

describe("Onboarding Store", () => {
  beforeEach(() => {
    // Reset store before each test
    useOnboardingStore.getState().resetOnboarding()
  })

  describe("initial state", () => {
    it("starts at step 1", () => {
      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(1)
    })

    it("has empty OIB initially", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.oib).toBe("")
    })

    it("has empty name initially", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.name).toBe("")
    })

    it("defaults to OBRT_PAUSAL legal form", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.legalForm).toBe("OBRT_PAUSAL")
    })

    it("defaults to MANUAL data source", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.dataSource).toBe("MANUAL")
    })

    it("has empty address fields initially", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.address).toBe("")
      expect(data.city).toBe("")
      expect(data.zipCode).toBe("")
    })

    it("has VAT payer disabled by default", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.isVatPayer).toBe(false)
    })

    it("has empty VAT number initially", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.vatNumber).toBe("")
    })

    it("has accepts cash disabled by default", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.acceptsCash).toBe(false)
    })

    it("has employedElsewhere disabled by default", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.employedElsewhere).toBe(false)
    })

    it("has empty expected income range initially", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.expectedIncomeRange).toBe("")
    })

    it("has empty contact fields initially", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.email).toBe("")
      expect(data.phone).toBe("")
      expect(data.iban).toBe("")
    })

    it("has default business premises values", () => {
      const { data } = useOnboardingStore.getState()
      expect(data.premisesName).toBe("Glavna poslovnica")
      expect(data.premisesCode).toBe("1")
    })

    it("has isComplete set to false initially", () => {
      const { isComplete } = useOnboardingStore.getState()
      expect(isComplete).toBe(false)
    })
  })

  describe("updateData", () => {
    it("merges partial updates correctly", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ oib: "12345678903", name: "Test Tvrtka" })

      const { data } = useOnboardingStore.getState()
      expect(data.oib).toBe("12345678903")
      expect(data.name).toBe("Test Tvrtka")
      expect(data.legalForm).toBe("OBRT_PAUSAL") // unchanged
    })

    it("updates address fields", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        address: "Ilica 123",
        city: "Zagreb",
        zipCode: "10000",
      })

      const { data } = useOnboardingStore.getState()
      expect(data.address).toBe("Ilica 123")
      expect(data.city).toBe("Zagreb")
      expect(data.zipCode).toBe("10000")
    })

    it("updates legal form", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ legalForm: "DOO" })

      const { data } = useOnboardingStore.getState()
      expect(data.legalForm).toBe("DOO")
    })

    it("updates tax information", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        isVatPayer: true,
        vatNumber: "HR12345678903",
        acceptsCash: true,
      })

      const { data } = useOnboardingStore.getState()
      expect(data.isVatPayer).toBe(true)
      expect(data.vatNumber).toBe("HR12345678903")
      expect(data.acceptsCash).toBe(true)
    })

    it("updates pausalni-specific fields", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        employedElsewhere: true,
        expectedIncomeRange: "30to60",
      })

      const { data } = useOnboardingStore.getState()
      expect(data.employedElsewhere).toBe(true)
      expect(data.expectedIncomeRange).toBe("30to60")
    })

    it("updates contact information", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        email: "test@example.com",
        phone: "+385 1 234 5678",
        iban: "HR1234567890123456789",
      })

      const { data } = useOnboardingStore.getState()
      expect(data.email).toBe("test@example.com")
      expect(data.phone).toBe("+385 1 234 5678")
      expect(data.iban).toBe("HR1234567890123456789")
    })

    it("updates business premises data", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        premisesName: "Prodavaonica Centar",
        premisesCode: "2",
      })

      const { data } = useOnboardingStore.getState()
      expect(data.premisesName).toBe("Prodavaonica Centar")
      expect(data.premisesCode).toBe("2")
    })

    it("updates data source", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ dataSource: "VIES" })

      const { data } = useOnboardingStore.getState()
      expect(data.dataSource).toBe("VIES")
    })

    it("handles multiple sequential updates", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ oib: "12345678903" })
      store.updateData({ name: "First Name" })
      store.updateData({ name: "Updated Name" })

      const { data } = useOnboardingStore.getState()
      expect(data.oib).toBe("12345678903")
      expect(data.name).toBe("Updated Name")
    })

    it("preserves existing data when updating other fields", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        oib: "12345678903",
        name: "Test",
        legalForm: "DOO",
      })
      store.updateData({ address: "Ulica 1" })

      const { data } = useOnboardingStore.getState()
      expect(data.oib).toBe("12345678903")
      expect(data.name).toBe("Test")
      expect(data.legalForm).toBe("DOO")
      expect(data.address).toBe("Ulica 1")
    })
  })

  describe("step navigation", () => {
    it("setStep changes current step to 2", () => {
      const store = useOnboardingStore.getState()
      store.setStep(2)

      expect(useOnboardingStore.getState().currentStep).toBe(2)
    })

    it("setStep changes current step to 3", () => {
      const store = useOnboardingStore.getState()
      store.setStep(3)

      expect(useOnboardingStore.getState().currentStep).toBe(3)
    })

    it("setStep changes current step to 4", () => {
      const store = useOnboardingStore.getState()
      store.setStep(4)

      expect(useOnboardingStore.getState().currentStep).toBe(4)
    })

    it("allows going back to step 1", () => {
      const store = useOnboardingStore.getState()
      store.setStep(3)
      store.setStep(1)

      expect(useOnboardingStore.getState().currentStep).toBe(1)
    })

    it("does not affect data when changing steps", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ oib: "12345678903", name: "Test" })
      store.setStep(3)

      const { data } = useOnboardingStore.getState()
      expect(data.oib).toBe("12345678903")
      expect(data.name).toBe("Test")
    })
  })

  describe("setComplete", () => {
    it("marks onboarding as complete", () => {
      const store = useOnboardingStore.getState()
      store.setComplete()

      expect(useOnboardingStore.getState().isComplete).toBe(true)
    })

    it("preserves data when marking complete", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ oib: "12345678903", name: "Test Company" })
      store.setComplete()

      const { data, isComplete } = useOnboardingStore.getState()
      expect(isComplete).toBe(true)
      expect(data.oib).toBe("12345678903")
      expect(data.name).toBe("Test Company")
    })

    it("preserves current step when marking complete", () => {
      const store = useOnboardingStore.getState()
      store.setStep(4)
      store.setComplete()

      expect(useOnboardingStore.getState().currentStep).toBe(4)
    })
  })

  describe("resetOnboarding", () => {
    it("resets current step to 1", () => {
      const store = useOnboardingStore.getState()
      store.setStep(4)
      store.resetOnboarding()

      expect(useOnboardingStore.getState().currentStep).toBe(1)
    })

    it("resets OIB to empty string", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ oib: "12345678903" })
      store.resetOnboarding()

      expect(useOnboardingStore.getState().data.oib).toBe("")
    })

    it("resets name to empty string", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ name: "Test Company" })
      store.resetOnboarding()

      expect(useOnboardingStore.getState().data.name).toBe("")
    })

    it("resets legal form to default OBRT_PAUSAL", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ legalForm: "DOO" })
      store.resetOnboarding()

      expect(useOnboardingStore.getState().data.legalForm).toBe("OBRT_PAUSAL")
    })

    it("resets isComplete to false", () => {
      const store = useOnboardingStore.getState()
      store.setComplete()
      store.resetOnboarding()

      expect(useOnboardingStore.getState().isComplete).toBe(false)
    })

    it("resets all data fields to initial values", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        oib: "12345678903",
        name: "Test Company",
        legalForm: "DOO",
        address: "Test Address",
        city: "Zagreb",
        zipCode: "10000",
        isVatPayer: true,
        vatNumber: "HR12345678903",
        acceptsCash: true,
        email: "test@test.com",
        phone: "+385 1 234 5678",
        iban: "HR1234567890123456789",
        dataSource: "VIES",
      })
      store.setStep(4)
      store.setComplete()
      store.resetOnboarding()

      const state = useOnboardingStore.getState()
      expect(state.currentStep).toBe(1)
      expect(state.isComplete).toBe(false)
      expect(state.data.oib).toBe("")
      expect(state.data.name).toBe("")
      expect(state.data.legalForm).toBe("OBRT_PAUSAL")
      expect(state.data.address).toBe("")
      expect(state.data.city).toBe("")
      expect(state.data.zipCode).toBe("")
      expect(state.data.isVatPayer).toBe(false)
      expect(state.data.vatNumber).toBe("")
      expect(state.data.acceptsCash).toBe(false)
      expect(state.data.email).toBe("")
      expect(state.data.phone).toBe("")
      expect(state.data.iban).toBe("")
      expect(state.data.dataSource).toBe("MANUAL")
    })

    it("resets pausalni-specific fields", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        employedElsewhere: true,
        expectedIncomeRange: "60to100",
      })
      store.resetOnboarding()

      const { data } = useOnboardingStore.getState()
      expect(data.employedElsewhere).toBe(false)
      expect(data.expectedIncomeRange).toBe("")
    })

    it("resets business premises to defaults", () => {
      const store = useOnboardingStore.getState()
      store.updateData({
        premisesName: "Custom Name",
        premisesCode: "5",
      })
      store.resetOnboarding()

      const { data } = useOnboardingStore.getState()
      expect(data.premisesName).toBe("Glavna poslovnica")
      expect(data.premisesCode).toBe("1")
    })
  })

  describe("store isolation", () => {
    it("maintains separate instances correctly", () => {
      const state1 = useOnboardingStore.getState()
      state1.updateData({ oib: "12345678903" })

      const state2 = useOnboardingStore.getState()
      expect(state2.data.oib).toBe("12345678903")
    })

    it("actions are bound correctly", () => {
      const { updateData, setStep, setComplete } = useOnboardingStore.getState()

      updateData({ name: "Action Test" })
      setStep(2)
      setComplete()

      const state = useOnboardingStore.getState()
      expect(state.data.name).toBe("Action Test")
      expect(state.currentStep).toBe(2)
      expect(state.isComplete).toBe(true)
    })
  })

  describe("data source tracking", () => {
    it("tracks MANUAL data source", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ dataSource: "MANUAL" })

      expect(useOnboardingStore.getState().data.dataSource).toBe("MANUAL")
    })

    it("tracks OCR_OBRTNICA data source", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ dataSource: "OCR_OBRTNICA" })

      expect(useOnboardingStore.getState().data.dataSource).toBe("OCR_OBRTNICA")
    })

    it("tracks OCR_SUDSKO data source", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ dataSource: "OCR_SUDSKO" })

      expect(useOnboardingStore.getState().data.dataSource).toBe("OCR_SUDSKO")
    })

    it("tracks VIES data source", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ dataSource: "VIES" })

      expect(useOnboardingStore.getState().data.dataSource).toBe("VIES")
    })

    it("tracks SUDSKI_REGISTAR data source", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ dataSource: "SUDSKI_REGISTAR" })

      expect(useOnboardingStore.getState().data.dataSource).toBe("SUDSKI_REGISTAR")
    })
  })

  describe("legal form variations", () => {
    it("handles OBRT_PAUSAL legal form", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ legalForm: "OBRT_PAUSAL" })

      expect(useOnboardingStore.getState().data.legalForm).toBe("OBRT_PAUSAL")
    })

    it("handles OBRT_REAL legal form", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ legalForm: "OBRT_REAL" })

      expect(useOnboardingStore.getState().data.legalForm).toBe("OBRT_REAL")
    })

    it("handles DOO legal form", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ legalForm: "DOO" })

      expect(useOnboardingStore.getState().data.legalForm).toBe("DOO")
    })

    it("handles JDOO legal form", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ legalForm: "JDOO" })

      expect(useOnboardingStore.getState().data.legalForm).toBe("JDOO")
    })
  })

  describe("expected income range values", () => {
    it("handles under30 income range", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ expectedIncomeRange: "under30" })

      expect(useOnboardingStore.getState().data.expectedIncomeRange).toBe("under30")
    })

    it("handles 30to60 income range", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ expectedIncomeRange: "30to60" })

      expect(useOnboardingStore.getState().data.expectedIncomeRange).toBe("30to60")
    })

    it("handles 60to100 income range", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ expectedIncomeRange: "60to100" })

      expect(useOnboardingStore.getState().data.expectedIncomeRange).toBe("60to100")
    })

    it("handles over100 income range", () => {
      const store = useOnboardingStore.getState()
      store.updateData({ expectedIncomeRange: "over100" })

      expect(useOnboardingStore.getState().data.expectedIncomeRange).toBe("over100")
    })
  })
})
