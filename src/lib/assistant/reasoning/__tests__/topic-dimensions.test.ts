import { describe, it, expect } from "vitest"
import {
  getTopicDimensions,
  getAllTopics,
  isConditionallyRequired,
  VAT_RATE_DIMENSIONS,
  OSS_THRESHOLD_DIMENSIONS,
  PAUSALNI_DIMENSIONS,
  REGISTRATION_DIMENSIONS,
  type TopicDimensions,
  type DimensionRequirement,
} from "../topic-dimensions"

describe("Topic Dimensions", () => {
  describe("VAT_RATE_DIMENSIONS", () => {
    it("should have Item as required dimension", () => {
      const itemDim = VAT_RATE_DIMENSIONS.dimensions.find((d) => d.dimension === "Item")
      expect(itemDim?.required).toBe(true)
    })

    it("should have conditional VAT_ID requirement", () => {
      const vatIdDim = VAT_RATE_DIMENSIONS.dimensions.find((d) => d.dimension === "VAT_ID")
      expect(vatIdDim?.required).toEqual({ dependsOn: "BuyerType", value: "B2B" })
    })

    it("should have Date with temporal default", () => {
      const dateDim = VAT_RATE_DIMENSIONS.dimensions.find((d) => d.dimension === "Date")
      expect(dateDim?.required).toBe(true)
      expect(dateDim?.defaultValue).toBe("today")
      expect(dateDim?.defaultSource).toBe("temporal")
    })

    it("should have Place with jurisdiction default", () => {
      const placeDim = VAT_RATE_DIMENSIONS.dimensions.find((d) => d.dimension === "Place")
      expect(placeDim?.required).toBe(true)
      expect(placeDim?.defaultValue).toBe("HR")
      expect(placeDim?.defaultSource).toBe("jurisdiction")
    })

    it("should have ServiceContext with possible values", () => {
      const serviceContextDim = VAT_RATE_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "ServiceContext"
      )
      expect(serviceContextDim?.required).toBe(false)
      expect(serviceContextDim?.possibleValues).toEqual(["on-premises", "takeaway", "delivery"])
    })
  })

  describe("OSS_THRESHOLD_DIMENSIONS", () => {
    it("should have SellerCountry with jurisdiction default", () => {
      const sellerCountryDim = OSS_THRESHOLD_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "SellerCountry"
      )
      expect(sellerCountryDim?.required).toBe(true)
      expect(sellerCountryDim?.defaultValue).toBe("HR")
      expect(sellerCountryDim?.defaultSource).toBe("jurisdiction")
    })

    it("should have BuyerCountry as required", () => {
      const buyerCountryDim = OSS_THRESHOLD_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "BuyerCountry"
      )
      expect(buyerCountryDim?.required).toBe(true)
    })

    it("should have SalesAmount as required", () => {
      const salesAmountDim = OSS_THRESHOLD_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "SalesAmount"
      )
      expect(salesAmountDim?.required).toBe(true)
    })

    it("should have Period with temporal default", () => {
      const periodDim = OSS_THRESHOLD_DIMENSIONS.dimensions.find((d) => d.dimension === "Period")
      expect(periodDim?.required).toBe(true)
      expect(periodDim?.defaultValue).toBe("current-year")
      expect(periodDim?.defaultSource).toBe("temporal")
    })
  })

  describe("PAUSALNI_DIMENSIONS", () => {
    it("should have LegalForm with possible values", () => {
      const legalFormDim = PAUSALNI_DIMENSIONS.dimensions.find((d) => d.dimension === "LegalForm")
      expect(legalFormDim?.required).toBe(true)
      expect(legalFormDim?.possibleValues).toEqual(["obrt", "slobodna-djelatnost"])
    })

    it("should have AnnualRevenue as required", () => {
      const annualRevenueDim = PAUSALNI_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "AnnualRevenue"
      )
      expect(annualRevenueDim?.required).toBe(true)
    })

    it("should have Activity as optional", () => {
      const activityDim = PAUSALNI_DIMENSIONS.dimensions.find((d) => d.dimension === "Activity")
      expect(activityDim?.required).toBe(false)
    })

    it("should have Year with temporal default", () => {
      const yearDim = PAUSALNI_DIMENSIONS.dimensions.find((d) => d.dimension === "Year")
      expect(yearDim?.required).toBe(true)
      expect(yearDim?.defaultValue).toBe("current-year")
      expect(yearDim?.defaultSource).toBe("temporal")
    })
  })

  describe("REGISTRATION_DIMENSIONS", () => {
    it("should have LegalForm as required", () => {
      const legalFormDim = REGISTRATION_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "LegalForm"
      )
      expect(legalFormDim?.required).toBe(true)
    })

    it("should have Activity as required", () => {
      const activityDim = REGISTRATION_DIMENSIONS.dimensions.find((d) => d.dimension === "Activity")
      expect(activityDim?.required).toBe(true)
    })

    it("should have Location with jurisdiction default", () => {
      const locationDim = REGISTRATION_DIMENSIONS.dimensions.find((d) => d.dimension === "Location")
      expect(locationDim?.required).toBe(true)
      expect(locationDim?.defaultValue).toBe("HR")
      expect(locationDim?.defaultSource).toBe("jurisdiction")
    })

    it("should have conditional CapitalAmount requirement", () => {
      const capitalAmountDim = REGISTRATION_DIMENSIONS.dimensions.find(
        (d) => d.dimension === "CapitalAmount"
      )
      expect(capitalAmountDim?.required).toEqual({ dependsOn: "LegalForm", value: "d.o.o." })
    })
  })

  describe("getTopicDimensions", () => {
    it("should return topic dimensions for known topic", () => {
      const result = getTopicDimensions("vat-rate")
      expect(result).toBeDefined()
      expect(result?.topic).toBe("vat-rate")
    })

    it("should return undefined for unknown topic", () => {
      const result = getTopicDimensions("unknown-topic")
      expect(result).toBeUndefined()
    })

    it("should return correct dimensions for oss-threshold", () => {
      const result = getTopicDimensions("oss-threshold")
      expect(result).toBeDefined()
      expect(result?.topic).toBe("oss-threshold")
    })

    it("should return correct dimensions for pausalni", () => {
      const result = getTopicDimensions("pausalni")
      expect(result).toBeDefined()
      expect(result?.topic).toBe("pausalni")
    })

    it("should return correct dimensions for registration", () => {
      const result = getTopicDimensions("registration")
      expect(result).toBeDefined()
      expect(result?.topic).toBe("registration")
    })
  })

  describe("getAllTopics", () => {
    it("should return all registered topics", () => {
      const topics = getAllTopics()
      expect(topics).toContain("vat-rate")
      expect(topics).toContain("oss-threshold")
      expect(topics).toContain("pausalni")
      expect(topics).toContain("registration")
    })

    it("should return exactly 4 topics", () => {
      const topics = getAllTopics()
      expect(topics).toHaveLength(4)
    })
  })

  describe("isConditionallyRequired", () => {
    it("should return true for boolean required = true", () => {
      const dim: DimensionRequirement = { dimension: "Item", required: true }
      expect(isConditionallyRequired(dim, {})).toBe(true)
    })

    it("should return false for boolean required = false", () => {
      const dim: DimensionRequirement = { dimension: "Activity", required: false }
      expect(isConditionallyRequired(dim, {})).toBe(false)
    })

    it("should return true when conditional dependency is met", () => {
      const dim: DimensionRequirement = {
        dimension: "VAT_ID",
        required: { dependsOn: "BuyerType", value: "B2B" },
      }
      expect(isConditionallyRequired(dim, { BuyerType: "B2B" })).toBe(true)
    })

    it("should return false when conditional dependency is not met", () => {
      const dim: DimensionRequirement = {
        dimension: "VAT_ID",
        required: { dependsOn: "BuyerType", value: "B2B" },
      }
      expect(isConditionallyRequired(dim, { BuyerType: "B2C" })).toBe(false)
    })

    it("should return false when conditional dependency is missing", () => {
      const dim: DimensionRequirement = {
        dimension: "VAT_ID",
        required: { dependsOn: "BuyerType", value: "B2B" },
      }
      expect(isConditionallyRequired(dim, {})).toBe(false)
    })

    it("should handle CapitalAmount conditional for d.o.o.", () => {
      const dim: DimensionRequirement = {
        dimension: "CapitalAmount",
        required: { dependsOn: "LegalForm", value: "d.o.o." },
      }
      expect(isConditionallyRequired(dim, { LegalForm: "d.o.o." })).toBe(true)
      expect(isConditionallyRequired(dim, { LegalForm: "obrt" })).toBe(false)
    })
  })
})
