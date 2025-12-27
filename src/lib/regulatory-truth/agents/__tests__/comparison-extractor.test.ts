// src/lib/regulatory-truth/agents/__tests__/comparison-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { detectComparisonContent, extractComparisonMatrix } from "../comparison-extractor"

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    comparisonMatrix: {
      upsert: vi.fn().mockResolvedValue({ id: "test-matrix-id" }),
    },
    conceptNode: {
      findFirst: vi.fn().mockResolvedValue({ id: "concept-id" }),
    },
    evidence: {
      findUnique: vi.fn().mockResolvedValue({
        id: "test-evidence-id",
        rawContent: "Paušalni obrt vs d.o.o. - usporedba poreznih režima",
        url: "https://example.com/test",
      }),
    },
  },
}))

// Mock the agent runner
vi.mock("../runner", () => ({
  runAgent: vi.fn().mockResolvedValue({
    success: true,
    output: {
      slug: "pausalni-vs-doo",
      titleHr: "Paušalni obrt vs d.o.o.",
      options: [
        { slug: "pausalni", conceptId: "c1", nameHr: "Paušalni obrt" },
        { slug: "doo", conceptId: "c2", nameHr: "d.o.o." },
      ],
      criteria: [{ slug: "liability", conceptId: "c3", nameHr: "Odgovornost" }],
      cells: [
        {
          optionSlug: "pausalni",
          criterionSlug: "liability",
          value: "Neograničena",
          sentiment: "negative",
        },
      ],
      confidence: 0.9,
    },
  }),
}))

describe("Comparison Extractor", () => {
  describe("detectComparisonContent", () => {
    it("should detect 'vs' pattern", () => {
      const content = "Paušalni obrt vs d.o.o. - što odabrati?"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'vs.' pattern with period", () => {
      const content = "Obrt vs. d.o.o. u praksi"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'Usporedba' pattern", () => {
      const content = "Usporedba poreznih režima u Hrvatskoj"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'usporedba' pattern (lowercase)", () => {
      const content = "Detaljnija usporedba modela oporezivanja"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'Komparacija' pattern", () => {
      const content = "Komparacija različitih pristupa"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'Pros and Cons' pattern", () => {
      const content = "Pros and Cons of different business structures"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'Prednosti i nedostaci' pattern", () => {
      const content = "Prednosti i nedostaci paušalnog oporezivanja"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'comparison' pattern (English)", () => {
      const content = "A comparison of tax regimes in Croatia"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'nasuprot' pattern", () => {
      const content = "Paušalni obrt nasuprot klasičnom obrtu"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'što odabrati' pattern", () => {
      const content = "Obrt ili d.o.o. - što odabrati za početak?"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'razlike između' pattern", () => {
      const content = "Razlike između paušalnog i dohodaškog obrta"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should detect 'je bolje' pattern", () => {
      const content = "Što je bolje za mali biznis?"
      expect(detectComparisonContent(content)).toBe(true)
    })

    it("should return false for non-comparison content", () => {
      const content = "Kako registrirati obrt u Hrvatskoj"
      expect(detectComparisonContent(content)).toBe(false)
    })

    it("should return false for empty content", () => {
      expect(detectComparisonContent("")).toBe(false)
    })

    it("should return false for general tax information", () => {
      const content = "Porezna uprava je objavila nove propise o PDV-u"
      expect(detectComparisonContent(content)).toBe(false)
    })
  })

  describe("extractComparisonMatrix", () => {
    it("should extract comparison matrix from content", async () => {
      const result = await extractComparisonMatrix(
        "test-evidence-id",
        "Paušalni vs d.o.o. - usporedba"
      )
      expect(result.success).toBe(true)
      expect(result.matrix).toBeDefined()
      expect(result.matrix?.slug).toBe("pausalni-vs-doo")
    })

    it("should include options in extracted matrix", async () => {
      const result = await extractComparisonMatrix(
        "test-evidence-id",
        "Paušalni vs d.o.o. - usporedba"
      )
      expect(result.success).toBe(true)
      expect(result.matrix?.options).toHaveLength(2)
      expect(result.matrix?.options[0].slug).toBe("pausalni")
    })

    it("should include criteria in extracted matrix", async () => {
      const result = await extractComparisonMatrix(
        "test-evidence-id",
        "Paušalni vs d.o.o. - usporedba"
      )
      expect(result.success).toBe(true)
      expect(result.matrix?.criteria).toHaveLength(1)
      expect(result.matrix?.criteria[0].slug).toBe("liability")
    })

    it("should include cells with sentiment in extracted matrix", async () => {
      const result = await extractComparisonMatrix(
        "test-evidence-id",
        "Paušalni vs d.o.o. - usporedba"
      )
      expect(result.success).toBe(true)
      expect(result.matrix?.cells).toHaveLength(1)
      expect(result.matrix?.cells[0].sentiment).toBe("negative")
    })

    it("should include confidence score in extracted matrix", async () => {
      const result = await extractComparisonMatrix(
        "test-evidence-id",
        "Paušalni vs d.o.o. - usporedba"
      )
      expect(result.success).toBe(true)
      expect(result.matrix?.confidence).toBe(0.9)
    })
  })
})
