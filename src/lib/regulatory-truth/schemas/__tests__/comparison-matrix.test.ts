import { describe, it, expect } from "vitest"
import {
  ComparisonMatrixSchema,
  ComparisonOptionSchema,
  ComparisonCriterionSchema,
  ComparisonCellSchema,
} from "../comparison-matrix"

describe("ComparisonMatrix Schema", () => {
  it("should validate a complete comparison matrix", () => {
    const matrix = {
      slug: "pausalni-vs-doo",
      titleHr: "Pausalni obrt vs d.o.o.",
      titleEn: "Lump-sum vs LLC",
      appliesWhen: "IF user_type == 'freelancer'",
      domainTags: ["STARTING_BUSINESS", "TAX_REGIME"],
      options: [
        {
          slug: "pausalni",
          conceptId: "cuid-pausalni",
          nameHr: "Pausalni obrt",
        },
        {
          slug: "doo",
          conceptId: "cuid-doo",
          nameHr: "d.o.o.",
        },
      ],
      criteria: [
        {
          slug: "liability",
          conceptId: "cuid-liability",
          nameHr: "Odgovornost",
        },
      ],
      cells: [
        {
          optionSlug: "pausalni",
          criterionSlug: "liability",
          value: "Neogranicena",
          sentiment: "negative",
        },
      ],
    }

    const result = ComparisonMatrixSchema.safeParse(matrix)
    expect(result.success).toBe(true)
  })

  it("should reject matrix without required fields", () => {
    const result = ComparisonMatrixSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("should validate sentiment values", () => {
    const cell = {
      optionSlug: "test",
      criterionSlug: "test",
      value: "Test",
      sentiment: "invalid",
    }
    const result = ComparisonCellSchema.safeParse(cell)
    expect(result.success).toBe(false)
  })
})
