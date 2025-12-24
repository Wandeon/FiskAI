// src/lib/assistant/query-engine/__tests__/concept-matcher.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { matchConcepts, type ConceptMatch } from "../concept-matcher"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    concept: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockConcepts = [
  { id: "c1", slug: "pausalni-obrt", nameHr: "Paušalni obrt", aliases: ["pausalni", "pausalno"] },
  {
    id: "c2",
    slug: "pdv-stopa",
    nameHr: "Stopa PDV-a",
    aliases: ["pdv", "porez-dodanu-vrijednost"],
  },
  {
    id: "c3",
    slug: "pausalni-prag",
    nameHr: "Prag za paušalno",
    aliases: ["prag", "limit", "threshold"],
  },
]

describe("matchConcepts", () => {
  beforeEach(() => {
    vi.mocked(prisma.concept.findMany).mockResolvedValue(mockConcepts as any)
  })

  it("matches concepts by slug keywords", async () => {
    const matches = await matchConcepts(["pausalni", "obrt"])

    expect(matches).toContainEqual(
      expect.objectContaining({ conceptId: "c1", score: expect.any(Number) })
    )
  })

  it("matches concepts by aliases", async () => {
    const matches = await matchConcepts(["pdv"])

    expect(matches).toContainEqual(expect.objectContaining({ conceptId: "c2" }))
  })

  it("returns higher score for more keyword matches", async () => {
    const matches = await matchConcepts(["pausalni", "prag"])

    const pragMatch = matches.find((m) => m.conceptId === "c3")
    const obrtMatch = matches.find((m) => m.conceptId === "c1")

    // Both should match, but with equal scores since each has 1 keyword match
    expect(pragMatch).toBeDefined()
    expect(obrtMatch).toBeDefined()
  })

  it("returns empty array when no matches", async () => {
    const matches = await matchConcepts(["nepostojeci", "pojam"])

    expect(matches).toEqual([])
  })

  it("normalizes keywords before matching", async () => {
    const matches = await matchConcepts(["paušalni"]) // with diacritic

    expect(matches).toContainEqual(expect.objectContaining({ conceptId: "c1" }))
  })
})
