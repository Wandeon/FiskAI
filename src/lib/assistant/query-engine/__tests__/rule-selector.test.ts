// src/lib/assistant/query-engine/__tests__/rule-selector.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { selectRules, type RuleCandidate } from "../rule-selector"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    regulatoryRule: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const today = new Date()
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
const lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

const mockRules = [
  {
    id: "r1",
    conceptSlug: "pausalni-prag",
    titleHr: "Prag za paušalno oporezivanje",
    authorityLevel: "LAW",
    status: "PUBLISHED",
    effectiveFrom: lastYear,
    effectiveUntil: null,
    confidence: 0.95,
    value: "39816.84",
    valueType: "currency_eur",
    sourcePointers: [{ id: "sp1", evidenceId: "e1", exactQuote: "Quote 1" }],
  },
  {
    id: "r2",
    conceptSlug: "pausalni-prag",
    titleHr: "Stari prag",
    authorityLevel: "GUIDANCE",
    status: "PUBLISHED",
    effectiveFrom: lastYear,
    effectiveUntil: yesterday, // Expired
    confidence: 0.9,
    value: "35000",
    valueType: "currency_eur",
    sourcePointers: [],
  },
  {
    id: "r3",
    conceptSlug: "pausalni-prag",
    titleHr: "Draft rule",
    authorityLevel: "LAW",
    status: "DRAFT", // Not published
    effectiveFrom: lastYear,
    effectiveUntil: null,
    confidence: 0.85,
    value: "40000",
    valueType: "currency_eur",
    sourcePointers: [],
  },
]

describe("selectRules", () => {
  beforeEach(() => {
    // Mock implementation that filters based on the query
    vi.mocked(prisma.regulatoryRule.findMany).mockImplementation(async (args: any) => {
      const now = new Date()
      return mockRules.filter((rule: any) => {
        // Filter by conceptSlug
        if (args.where?.conceptSlug?.in && !args.where.conceptSlug.in.includes(rule.conceptSlug)) {
          return false
        }

        // Filter by status
        if (args.where?.status && rule.status !== args.where.status) {
          return false
        }

        // Filter by effectiveFrom
        if (args.where?.effectiveFrom?.lte && rule.effectiveFrom > args.where.effectiveFrom.lte) {
          return false
        }

        // Filter by effectiveUntil (OR clause)
        if (args.where?.OR) {
          const hasNullUntil = rule.effectiveUntil === null
          const hasValidUntil = rule.effectiveUntil !== null && rule.effectiveUntil > now
          if (!hasNullUntil && !hasValidUntil) {
            return false
          }
        }

        return true
      }) as any
    })
  })

  it("returns only PUBLISHED rules", async () => {
    const rules = await selectRules(["pausalni-prag"])

    expect(rules.every((r) => r.status === "PUBLISHED")).toBe(true)
    expect(rules.map((r) => r.id)).not.toContain("r3")
  })

  it("filters out expired rules", async () => {
    const rules = await selectRules(["pausalni-prag"])

    expect(rules.map((r) => r.id)).not.toContain("r2")
  })

  it("sorts by authority level then confidence", async () => {
    const rules = await selectRules(["pausalni-prag"])

    // r1 should be first (LAW > GUIDANCE)
    expect(rules[0]?.id).toBe("r1")
  })

  it("returns empty array for unknown concepts", async () => {
    const rules = await selectRules(["nepostojeci-koncept"])

    expect(rules).toEqual([])
  })

  it("includes source pointers in result", async () => {
    const rules = await selectRules(["pausalni-prag"])

    const r1 = rules.find((r) => r.id === "r1")
    expect(r1?.sourcePointers).toHaveLength(1)
  })
})
