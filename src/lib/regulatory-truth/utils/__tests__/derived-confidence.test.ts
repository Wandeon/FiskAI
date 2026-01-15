// src/lib/regulatory-truth/utils/__tests__/derived-confidence.test.ts
//
// TDD tests for Task 2.1: Evidence Aggregation for Confidence
// Replace minimum-based confidence with median + corroboration bonus

import { describe, it, expect } from "vitest"
import {
  computeDerivedConfidence,
  getIndependenceKey,
  countIndependentSources,
  type EvidencePointer,
} from "../derived-confidence"

describe("computeDerivedConfidence", () => {
  describe("median-based confidence", () => {
    it("should use median instead of minimum for odd number of pointers", () => {
      // Given: 3 pointers with confidences [0.6, 0.8, 0.9]
      // Old behavior: min = 0.6, avg = 0.767, weighted = 0.9*0.767 + 0.1*0.6 = 0.75
      // New behavior: median = 0.8 (middle value)
      const pointers: EvidencePointer[] = [
        { confidence: 0.6, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "b.hr", legalReference: "law-2", evidenceType: "html" },
        { confidence: 0.9, publisherDomain: "c.hr", legalReference: "law-3", evidenceType: "html" },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Median is 0.8, with 3 independent sources: bonus = min((3-1)*0.03, 0.10) = 0.06
      // Total = 0.8 + 0.06 = 0.86
      expect(result).toBeCloseTo(0.86, 2)
    })

    it("should use average of middle two for even number of pointers", () => {
      // Given: 4 pointers with confidences [0.5, 0.7, 0.8, 0.9]
      // Median = average of 0.7 and 0.8 = 0.75
      const pointers: EvidencePointer[] = [
        { confidence: 0.5, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
        { confidence: 0.7, publisherDomain: "b.hr", legalReference: "law-2", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "c.hr", legalReference: "law-3", evidenceType: "html" },
        { confidence: 0.9, publisherDomain: "d.hr", legalReference: "law-4", evidenceType: "html" },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Median is 0.75, with 4 independent sources: bonus = min((4-1)*0.03, 0.10) = 0.09
      // Total = 0.75 + 0.09 = 0.84
      expect(result).toBeCloseTo(0.84, 2)
    })

    it("should return single pointer confidence for single source", () => {
      const pointers: EvidencePointer[] = [
        {
          confidence: 0.75,
          publisherDomain: "a.hr",
          legalReference: "law-1",
          evidenceType: "html",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Single source = no bonus (need 2+ for corroboration)
      expect(result).toBeCloseTo(0.75, 2)
    })

    it("should return 0 for empty pointers", () => {
      const result = computeDerivedConfidence([], 0.9)
      expect(result).toBe(0)
    })
  })

  describe("corroboration bonus", () => {
    it("should apply +3% per independent source", () => {
      // 2 independent sources = 1 * 0.03 = 3% bonus
      const pointers: EvidencePointer[] = [
        { confidence: 0.8, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "b.hr", legalReference: "law-2", evidenceType: "pdf" },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Median = 0.8, bonus = (2-1)*0.03 = 0.03
      // Total = 0.8 + 0.03 = 0.83
      expect(result).toBeCloseTo(0.83, 2)
    })

    it("should cap bonus at +10%", () => {
      // 5+ independent sources should still cap at 10% bonus
      const pointers: EvidencePointer[] = [
        { confidence: 0.8, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "b.hr", legalReference: "law-2", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "c.hr", legalReference: "law-3", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "d.hr", legalReference: "law-4", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "e.hr", legalReference: "law-5", evidenceType: "html" },
        { confidence: 0.8, publisherDomain: "f.hr", legalReference: "law-6", evidenceType: "html" },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // 6 sources = (6-1)*0.03 = 0.15, but capped at 0.10
      // Total = 0.8 + 0.10 = 0.90
      expect(result).toBeCloseTo(0.9, 2)
    })

    it("should not exceed 1.0 even with bonus", () => {
      const pointers: EvidencePointer[] = [
        {
          confidence: 0.98,
          publisherDomain: "a.hr",
          legalReference: "law-1",
          evidenceType: "html",
        },
        {
          confidence: 0.98,
          publisherDomain: "b.hr",
          legalReference: "law-2",
          evidenceType: "html",
        },
        {
          confidence: 0.98,
          publisherDomain: "c.hr",
          legalReference: "law-3",
          evidenceType: "html",
        },
        {
          confidence: 0.98,
          publisherDomain: "d.hr",
          legalReference: "law-4",
          evidenceType: "html",
        },
        {
          confidence: 0.98,
          publisherDomain: "e.hr",
          legalReference: "law-5",
          evidenceType: "html",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Median = 0.98, bonus capped at 0.10, but total capped at 1.0
      expect(result).toBeLessThanOrEqual(1.0)
      expect(result).toBeCloseTo(1.0, 2)
    })
  })

  describe("independence clustering", () => {
    it("should treat same publisher with multiple articles as single source", () => {
      // Same publisherDomain + legalReference + evidenceType = 1 independent source
      const pointers: EvidencePointer[] = [
        {
          confidence: 0.7,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        {
          confidence: 0.9,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // All 3 are from same source cluster, so only 1 independent source = no bonus
      // Median = 0.8
      expect(result).toBeCloseTo(0.8, 2)
    })

    it("should count different publishers as independent sources", () => {
      const pointers: EvidencePointer[] = [
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        {
          confidence: 0.8,
          publisherDomain: "porezna.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Different publishers = 2 independent sources
      // Median = 0.8, bonus = 0.03
      expect(result).toBeCloseTo(0.83, 2)
    })

    it("should count different legalReferences as independent sources", () => {
      const pointers: EvidencePointer[] = [
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 115/16",
          evidenceType: "html",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Different legalReferences = 2 independent sources
      // Median = 0.8, bonus = 0.03
      expect(result).toBeCloseTo(0.83, 2)
    })

    it("should count different evidenceTypes as independent sources", () => {
      const pointers: EvidencePointer[] = [
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "pdf",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Different evidenceTypes = 2 independent sources
      // Median = 0.8, bonus = 0.03
      expect(result).toBeCloseTo(0.83, 2)
    })

    it("should base independence on unique combination of all three fields", () => {
      const pointers: EvidencePointer[] = [
        // Cluster 1: nn.hr + NN 73/13 + html
        {
          confidence: 0.7,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        {
          confidence: 0.8,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
        // Cluster 2: nn.hr + NN 73/13 + pdf (different evidenceType)
        {
          confidence: 0.9,
          publisherDomain: "nn.hr",
          legalReference: "NN 73/13",
          evidenceType: "pdf",
        },
        // Cluster 3: porezna.hr + NN 73/13 + html (different publisher)
        {
          confidence: 0.85,
          publisherDomain: "porezna.hr",
          legalReference: "NN 73/13",
          evidenceType: "html",
        },
      ]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // 3 independent clusters: bonus = min((3-1)*0.03, 0.10) = 0.06
      // Sorted confidences: [0.7, 0.8, 0.85, 0.9] - median = (0.8 + 0.85) / 2 = 0.825
      // Total = 0.825 + 0.06 = 0.885
      expect(result).toBeCloseTo(0.885, 2)
    })
  })

  describe("LLM confidence cap", () => {
    it("should still cap at LLM confidence", () => {
      const pointers: EvidencePointer[] = [
        { confidence: 0.9, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
        { confidence: 0.9, publisherDomain: "b.hr", legalReference: "law-2", evidenceType: "html" },
        { confidence: 0.9, publisherDomain: "c.hr", legalReference: "law-3", evidenceType: "html" },
      ]
      const llmConfidence = 0.7 // LLM is uncertain

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Median = 0.9, bonus = 0.06, total = 0.96
      // But capped at LLM confidence = 0.7
      expect(result).toBeCloseTo(0.7, 2)
    })
  })

  describe("backward compatibility", () => {
    it("should accept legacy pointers with only confidence field", () => {
      // For backward compatibility, pointers without independence fields
      // should still work. Per "no double-counting" principle, pointers
      // without distinguishing fields are treated as same cluster = no bonus.
      const pointers = [{ confidence: 0.8 }, { confidence: 0.9 }]
      const llmConfidence = 1.0

      const result = computeDerivedConfidence(pointers, llmConfidence)

      // Without independence fields, all map to same key (||) = 1 cluster = no bonus
      // Median = 0.85
      expect(result).toBeCloseTo(0.85, 2)
    })
  })
})

describe("getIndependenceKey", () => {
  it("should create key from publisherDomain, legalReference, and evidenceType", () => {
    const evidence: EvidencePointer = {
      confidence: 0.8,
      publisherDomain: "nn.hr",
      legalReference: "NN 73/13",
      evidenceType: "html",
    }

    const key = getIndependenceKey(evidence)

    expect(key).toBe("nn.hr|NN 73/13|html")
  })

  it("should handle missing fields with empty strings", () => {
    const evidence = { confidence: 0.8 }

    const key = getIndependenceKey(evidence)

    expect(key).toBe("||")
  })

  it("should handle null/undefined fields", () => {
    const evidence = {
      confidence: 0.8,
      publisherDomain: null,
      legalReference: undefined,
      evidenceType: "pdf",
    } as unknown as EvidencePointer

    const key = getIndependenceKey(evidence)

    expect(key).toBe("||pdf")
  })
})

describe("countIndependentSources", () => {
  it("should count unique independence keys", () => {
    const evidences: EvidencePointer[] = [
      { confidence: 0.8, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
      { confidence: 0.9, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" }, // duplicate
      { confidence: 0.7, publisherDomain: "b.hr", legalReference: "law-1", evidenceType: "html" },
      { confidence: 0.85, publisherDomain: "a.hr", legalReference: "law-2", evidenceType: "html" },
    ]

    const count = countIndependentSources(evidences)

    expect(count).toBe(3) // a.hr|law-1|html, b.hr|law-1|html, a.hr|law-2|html
  })

  it("should return 0 for empty array", () => {
    const count = countIndependentSources([])
    expect(count).toBe(0)
  })

  it("should return 1 for all duplicates", () => {
    const evidences: EvidencePointer[] = [
      { confidence: 0.8, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
      { confidence: 0.9, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
      { confidence: 0.7, publisherDomain: "a.hr", legalReference: "law-1", evidenceType: "html" },
    ]

    const count = countIndependentSources(evidences)

    expect(count).toBe(1)
  })
})
