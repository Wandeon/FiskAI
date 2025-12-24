// src/lib/assistant/query-engine/__tests__/text-utils.test.ts
import { describe, it, expect } from "vitest"
import { normalizeDiacritics, tokenize, extractKeywords } from "../text-utils"

describe("text-utils", () => {
  describe("normalizeDiacritics", () => {
    it("converts Croatian characters to ASCII equivalents", () => {
      expect(normalizeDiacritics("čćžšđ")).toBe("cczsd")
      expect(normalizeDiacritics("ČĆŽŠĐ")).toBe("CCZSD")
    })

    it("preserves non-diacritic characters", () => {
      expect(normalizeDiacritics("abc123")).toBe("abc123")
    })
  })

  describe("tokenize", () => {
    it("splits on whitespace and punctuation", () => {
      expect(tokenize("Što je PDV?")).toEqual(["sto", "je", "pdv"])
    })

    it("lowercases tokens", () => {
      expect(tokenize("PDV RATE")).toEqual(["pdv", "rate"])
    })

    it("removes empty tokens", () => {
      expect(tokenize("  multiple   spaces  ")).toEqual(["multiple", "spaces"])
    })
  })

  describe("extractKeywords", () => {
    it("removes Croatian stopwords", () => {
      const keywords = extractKeywords("Što je stopa PDV-a u Hrvatskoj?")
      expect(keywords).not.toContain("sto")
      expect(keywords).not.toContain("je")
      expect(keywords).not.toContain("u")
      expect(keywords).toContain("stopa")
      expect(keywords).toContain("pdv")
      expect(keywords).toContain("hrvatskoj")
    })

    it("handles compound terms", () => {
      const keywords = extractKeywords("paušalni obrt prihod")
      expect(keywords).toContain("pausalni")
      expect(keywords).toContain("obrt")
      expect(keywords).toContain("prihod")
    })

    it("returns unique keywords only", () => {
      const keywords = extractKeywords("PDV PDV PDV")
      expect(keywords).toEqual(["pdv"])
    })
  })
})
