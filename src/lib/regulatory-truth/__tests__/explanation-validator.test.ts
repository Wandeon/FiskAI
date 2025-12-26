// src/lib/regulatory-truth/__tests__/explanation-validator.test.ts

import { describe, it, expect } from "vitest"
import {
  validateExplanation,
  extractModalVerbs,
  extractNumericValues,
  createQuoteOnlyExplanation,
  getEvidenceStrengthBadge,
} from "../utils/explanation-validator"

describe("Explanation Validator", () => {
  describe("extractModalVerbs", () => {
    it("extracts Croatian modal verbs", () => {
      const text = "Poduzetnik mora prijaviti porez. Uvijek se primjenjuje."
      const verbs = extractModalVerbs(text, "hr")

      expect(verbs).toContain("mora")
      expect(verbs).toContain("uvijek")
    })

    it("extracts English modal verbs", () => {
      const text = "You must always file taxes. Never skip this step."
      const verbs = extractModalVerbs(text, "en")

      expect(verbs).toContain("must")
      expect(verbs).toContain("always")
      expect(verbs).toContain("never")
    })

    it("returns empty array when no modal verbs", () => {
      const text = "Porez se prijavljuje godišnje."
      const verbs = extractModalVerbs(text, "hr")

      expect(verbs).toEqual([])
    })
  })

  describe("extractNumericValues", () => {
    it("extracts decimal numbers", () => {
      const text = "Prag iznosi 39.816,84 EUR ili 39816.84 u decimalnom formatu."
      const values = extractNumericValues(text)

      expect(values).toContain("39.816")
      expect(values).toContain("39816.84")
    })

    it("extracts percentages", () => {
      const text = "Stopa iznosi 25% ili 12.5% za umanjenje."
      const values = extractNumericValues(text)

      expect(values).toContain("25")
      expect(values).toContain("12.5")
    })

    it("extracts dates", () => {
      const text = "Rok je 2025-01-31 ili 31.01.2025."
      const values = extractNumericValues(text)

      expect(values).toContain("2025-01-31")
      expect(values).toContain("31.01.2025")
    })

    it("extracts currency values", () => {
      const text = "Iznos je €100 ili 500€ ili HRK 750."
      const values = extractNumericValues(text)

      expect(values).toContain("100")
      expect(values).toContain("500")
      expect(values).toContain("750")
    })
  })

  describe("validateExplanation", () => {
    const sourceQuotes = [
      "Poduzetnik mora prijaviti porez do 31. siječnja.",
      "Godišnji prag za paušalno oporezivanje iznosi 39.816,84 EUR.",
    ]

    it("passes when modal verbs appear in sources", () => {
      const explanation = "Poduzetnik mora prijaviti godišnji porez."
      const result = validateExplanation(explanation, null, sourceQuotes)

      expect(result.valid).toBe(true)
      expect(result.modalVerbViolations).toHaveLength(0)
    })

    it("fails when modal verbs NOT in sources", () => {
      const explanation = "Poduzetnik nikada ne smije propustiti prijavu."
      const result = validateExplanation(explanation, null, sourceQuotes)

      expect(result.valid).toBe(false)
      expect(result.modalVerbViolations).toContain("nikada")
    })

    it("warns when numeric values NOT in sources", () => {
      const explanation = "Prag iznosi 50.000 EUR."
      const result = validateExplanation(explanation, null, sourceQuotes)

      // Values are warnings, not errors
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.valueViolations).toContain("50.000")
    })

    it("passes when extracted value is in explanation", () => {
      const explanation = "Prag iznosi 39.816,84 EUR godišnje."
      const result = validateExplanation(explanation, null, sourceQuotes, "39816.84")

      expect(result.valid).toBe(true)
    })

    it("determines evidence strength correctly", () => {
      const singleSource = ["Only one source."]
      const multiSource = ["First source.", "Second source."]

      const singleResult = validateExplanation("Test", null, singleSource)
      const multiResult = validateExplanation("Test", null, multiSource)

      expect(singleResult.evidenceStrength).toBe("SINGLE_SOURCE")
      expect(multiResult.evidenceStrength).toBe("MULTI_SOURCE")
    })
  })

  describe("createQuoteOnlyExplanation", () => {
    it("creates explanation from quote", () => {
      const quotes = ["Porez se prijavljuje godišnje do 31. siječnja."]
      const result = createQuoteOnlyExplanation(quotes)

      expect(result).toContain("Iz izvora:")
      expect(result).toContain("Porez se prijavljuje")
    })

    it("includes value when provided", () => {
      const quotes = ["Prag je 39.816,84 EUR."]
      const result = createQuoteOnlyExplanation(quotes, "39816.84")

      expect(result).toContain("Vrijednost: 39816.84")
    })

    it("handles empty quotes", () => {
      const result = createQuoteOnlyExplanation([], "12345")

      expect(result).toContain("Vrijednost: 12345")
    })

    it("handles no quotes and no value", () => {
      const result = createQuoteOnlyExplanation([])

      expect(result).toContain("Nema dostupnog objašnjenja")
    })
  })

  describe("getEvidenceStrengthBadge", () => {
    it("returns correct HR badge for multi-source", () => {
      const badge = getEvidenceStrengthBadge("MULTI_SOURCE", "hr")

      expect(badge.text).toBe("Višestruki izvori")
      expect(badge.level).toBe("high")
    })

    it("returns correct HR badge for single-source", () => {
      const badge = getEvidenceStrengthBadge("SINGLE_SOURCE", "hr")

      expect(badge.text).toBe("Jedan izvor")
      expect(badge.level).toBe("medium")
    })

    it("returns correct EN badge for multi-source", () => {
      const badge = getEvidenceStrengthBadge("MULTI_SOURCE", "en")

      expect(badge.text).toBe("Multiple sources")
      expect(badge.level).toBe("high")
    })
  })
})
