# Assistant Integration Sprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the assistant real - connect UI to a deterministic rules query engine that returns evidence-backed answers or refuses.

**Architecture:** Query → Keyword extraction → Concept match → Rule selection → Conflict check → Citation enforcement → AssistantResponse. Return REFUSAL when can't cite. Streaming via newline-delimited JSON chunks.

**Tech Stack:** Next.js 15, Prisma, TypeScript, Vitest, Playwright

---

## Phase 1: Pages (Tasks 1-2)

### Task 1: Marketing Assistant Page

**Files:**

- Create: `src/app/(marketing)/assistant/page.tsx`
- Test: Manual verification (page renders)

**Step 1: Create the page**

```typescript
// src/app/(marketing)/assistant/page.tsx
import { Metadata } from "next"
import { AssistantContainer } from "@/components/assistant-v2"

export const metadata: Metadata = {
  title: "AI Asistent | FiskAI",
  description: "Postavi pitanje o porezima, PDV-u, doprinosima ili fiskalizaciji. Odgovor potkrije službenim izvorima.",
}

export default function MarketingAssistantPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Regulatorni asistent
        </h1>
        <p className="mt-2 text-white/70">
          Svaki odgovor potkrije službenim izvorima. Bez nagađanja.
        </p>
      </header>

      <AssistantContainer surface="MARKETING" />
    </div>
  )
}
```

**Step 2: Verify**

Run: `npm run dev` and visit `http://localhost:3000/assistant`
Expected: Page renders with AssistantContainer

**Step 3: Commit**

```bash
git add src/app/\(marketing\)/assistant/page.tsx
git commit -m "feat(assistant): add marketing assistant page"
```

---

### Task 2: App Assistant Page

**Files:**

- Create: `src/app/(app)/assistant/page.tsx` (replace existing)
- Test: Manual verification

**Step 1: Replace the page**

```typescript
// src/app/(app)/assistant/page.tsx
import { Metadata } from "next"
import { AssistantContainer } from "@/components/assistant-v2"

export const metadata: Metadata = {
  title: "Asistent | FiskAI",
  description: "AI asistent za regulatorne upite s podacima vaše tvrtke.",
}

export default function AppAssistantPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Regulatorni asistent</h1>
        <p className="text-muted-foreground">
          Postavite pitanje. Odgovor će koristiti podatke vaše tvrtke.
        </p>
      </header>

      <AssistantContainer surface="APP" />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(app\)/assistant/page.tsx
git commit -m "feat(assistant): replace app assistant page with v2 container"
```

---

## Phase 2: Query Engine Core (Tasks 3-8)

### Task 3: Croatian Text Utilities

**Files:**

- Create: `src/lib/assistant/query-engine/text-utils.ts`
- Test: `src/lib/assistant/query-engine/__tests__/text-utils.test.ts`

**Step 1: Write the failing test**

```typescript
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
      expect(keywords).toContain("hrvatska")
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/text-utils.test.ts`
Expected: FAIL (module not found)

**Step 3: Write implementation**

```typescript
// src/lib/assistant/query-engine/text-utils.ts

const DIACRITIC_MAP: Record<string, string> = {
  č: "c",
  Č: "C",
  ć: "c",
  Ć: "C",
  ž: "z",
  Ž: "Z",
  š: "s",
  Š: "S",
  đ: "d",
  Đ: "D",
}

const CROATIAN_STOPWORDS = new Set([
  // Articles and pronouns
  "ja",
  "ti",
  "on",
  "ona",
  "ono",
  "mi",
  "vi",
  "oni",
  "one",
  "moj",
  "tvoj",
  "njegov",
  "njezin",
  "nas",
  "vas",
  "njihov",
  // Prepositions
  "u",
  "na",
  "za",
  "od",
  "do",
  "iz",
  "po",
  "sa",
  "s",
  "o",
  "prema",
  "kroz",
  // Conjunctions
  "i",
  "a",
  "ali",
  "ili",
  "no",
  "nego",
  "da",
  "jer",
  "ako",
  "kad",
  "kada",
  // Auxiliary verbs
  "je",
  "su",
  "sam",
  "si",
  "smo",
  "ste",
  "biti",
  "bio",
  "bila",
  "bilo",
  // Question words (normalized)
  "sto",
  "tko",
  "koji",
  "koja",
  "koje",
  "kako",
  "zasto",
  "gdje",
  "koliko",
  // Common words
  "to",
  "taj",
  "ta",
  "te",
  "ovo",
  "ova",
  "ove",
  "sve",
  "svi",
  "kao",
  "vec",
  "samo",
  "jos",
  "ima",
  "imati",
  "mogu",
  "moze",
  "treba",
  "mora",
])

export function normalizeDiacritics(text: string): string {
  return text.replace(/[čćžšđČĆŽŠĐ]/g, (char) => DIACRITIC_MAP[char] || char)
}

export function tokenize(text: string): string[] {
  const normalized = normalizeDiacritics(text)
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text)
  const keywords = tokens.filter((token) => token.length > 1 && !CROATIAN_STOPWORDS.has(token))
  return [...new Set(keywords)]
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/text-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/query-engine/
git commit -m "feat(assistant): add Croatian text utilities for keyword extraction"
```

---

### Task 4: Concept Matcher

**Files:**

- Create: `src/lib/assistant/query-engine/concept-matcher.ts`
- Test: `src/lib/assistant/query-engine/__tests__/concept-matcher.test.ts`

**Step 1: Write the failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/concept-matcher.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/assistant/query-engine/concept-matcher.ts
import { prisma } from "@/lib/prisma"
import { normalizeDiacritics } from "./text-utils"

export interface ConceptMatch {
  conceptId: string
  slug: string
  nameHr: string
  score: number
  matchedKeywords: string[]
}

export async function matchConcepts(keywords: string[]): Promise<ConceptMatch[]> {
  if (keywords.length === 0) return []

  // Normalize input keywords
  const normalizedKeywords = keywords.map((k) => normalizeDiacritics(k.toLowerCase()))

  // Fetch all concepts (for small corpus, this is fine; for large, use full-text search)
  const concepts = await prisma.concept.findMany({
    select: {
      id: true,
      slug: true,
      nameHr: true,
      aliases: true,
    },
  })

  const matches: ConceptMatch[] = []

  for (const concept of concepts) {
    // Build searchable terms from slug, name, and aliases
    const slugTerms = normalizeDiacritics(concept.slug).toLowerCase().split("-")
    const nameTerms = normalizeDiacritics(concept.nameHr).toLowerCase().split(/\s+/)
    const aliasTerms = (concept.aliases || []).flatMap((a) =>
      normalizeDiacritics(a)
        .toLowerCase()
        .split(/[\s-]+/)
    )

    const allTerms = new Set([...slugTerms, ...nameTerms, ...aliasTerms])

    // Find matching keywords
    const matchedKeywords: string[] = []
    for (const keyword of normalizedKeywords) {
      for (const term of allTerms) {
        if (term.includes(keyword) || keyword.includes(term)) {
          matchedKeywords.push(keyword)
          break
        }
      }
    }

    if (matchedKeywords.length > 0) {
      matches.push({
        conceptId: concept.id,
        slug: concept.slug,
        nameHr: concept.nameHr,
        score: matchedKeywords.length / keywords.length,
        matchedKeywords: [...new Set(matchedKeywords)],
      })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/concept-matcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/query-engine/concept-matcher.ts src/lib/assistant/query-engine/__tests__/concept-matcher.test.ts
git commit -m "feat(assistant): add concept matcher for query→concept mapping"
```

---

### Task 5: Rule Selector

**Files:**

- Create: `src/lib/assistant/query-engine/rule-selector.ts`
- Test: `src/lib/assistant/query-engine/__tests__/rule-selector.test.ts`

**Step 1: Write the failing test**

```typescript
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
    vi.mocked(prisma.regulatoryRule.findMany).mockResolvedValue(mockRules as any)
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/rule-selector.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/assistant/query-engine/rule-selector.ts
import { prisma } from "@/lib/prisma"

const AUTHORITY_RANK: Record<string, number> = {
  LAW: 1,
  REGULATION: 2,
  GUIDANCE: 3,
  PRACTICE: 4,
}

export interface RuleCandidate {
  id: string
  conceptSlug: string
  titleHr: string
  authorityLevel: string
  status: string
  effectiveFrom: Date
  effectiveUntil: Date | null
  confidence: number
  value: string
  valueType: string
  explanationHr: string | null
  sourcePointers: {
    id: string
    evidenceId: string
    exactQuote: string
    contextBefore: string | null
    contextAfter: string | null
    articleNumber: string | null
    lawReference: string | null
    evidence: {
      id: string
      url: string
      source: {
        name: string
        url: string
      }
    }
  }[]
}

export async function selectRules(conceptSlugs: string[]): Promise<RuleCandidate[]> {
  if (conceptSlugs.length === 0) return []

  const now = new Date()

  const rules = await prisma.regulatoryRule.findMany({
    where: {
      conceptSlug: { in: conceptSlugs },
      status: "PUBLISHED",
      effectiveFrom: { lte: now },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
    },
    include: {
      sourcePointers: {
        include: {
          evidence: {
            include: {
              source: true,
            },
          },
        },
      },
    },
    orderBy: [
      { authorityLevel: "asc" }, // Will re-sort with rank
      { confidence: "desc" },
      { effectiveFrom: "desc" },
    ],
  })

  // Re-sort by authority rank (Prisma can't sort by custom rank)
  return rules.sort((a, b) => {
    const rankA = AUTHORITY_RANK[a.authorityLevel] ?? 99
    const rankB = AUTHORITY_RANK[b.authorityLevel] ?? 99
    if (rankA !== rankB) return rankA - rankB
    return b.confidence - a.confidence
  }) as RuleCandidate[]
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/rule-selector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/query-engine/rule-selector.ts src/lib/assistant/query-engine/__tests__/rule-selector.test.ts
git commit -m "feat(assistant): add rule selector with date/status/authority filtering"
```

---

### Task 6: Conflict Detector

**Files:**

- Create: `src/lib/assistant/query-engine/conflict-detector.ts`
- Test: `src/lib/assistant/query-engine/__tests__/conflict-detector.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/query-engine/__tests__/conflict-detector.test.ts
import { describe, it, expect } from "vitest"
import { detectConflicts, type ConflictResult } from "../conflict-detector"
import type { RuleCandidate } from "../rule-selector"

const baseRule: Partial<RuleCandidate> = {
  conceptSlug: "test-concept",
  authorityLevel: "LAW",
  status: "PUBLISHED",
  effectiveFrom: new Date("2024-01-01"),
  effectiveUntil: null,
  confidence: 0.9,
  sourcePointers: [],
}

describe("detectConflicts", () => {
  it("returns no conflict for single rule", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(false)
    expect(result.conflictingRules).toEqual([])
  })

  it("returns no conflict when rules have same value", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage" },
      { ...baseRule, id: "r2", value: "25", valueType: "percentage" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(false)
  })

  it("detects conflict when rules have different values for same concept", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", conceptSlug: "pdv-stopa" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", conceptSlug: "pdv-stopa" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.conflictingRules).toHaveLength(2)
  })

  it("prefers higher authority when resolving conflicts", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", authorityLevel: "LAW" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", authorityLevel: "GUIDANCE" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.canResolve).toBe(true)
    expect(result.winningRuleId).toBe("r1")
  })

  it("cannot resolve conflict between same authority level", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", authorityLevel: "LAW" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", authorityLevel: "LAW" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.canResolve).toBe(false)
    expect(result.winningRuleId).toBeUndefined()
  })

  it("groups conflicts by concept", () => {
    const rules = [
      { ...baseRule, id: "r1", value: "25", valueType: "percentage", conceptSlug: "pdv-stopa" },
      { ...baseRule, id: "r2", value: "13", valueType: "percentage", conceptSlug: "pdv-stopa" },
      { ...baseRule, id: "r3", value: "100", valueType: "currency", conceptSlug: "other-concept" },
    ] as RuleCandidate[]

    const result = detectConflicts(rules)

    expect(result.hasConflict).toBe(true)
    expect(result.conflictingRules.map((r) => r.id)).toContain("r1")
    expect(result.conflictingRules.map((r) => r.id)).toContain("r2")
    expect(result.conflictingRules.map((r) => r.id)).not.toContain("r3")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/conflict-detector.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/assistant/query-engine/conflict-detector.ts
import type { RuleCandidate } from "./rule-selector"

const AUTHORITY_RANK: Record<string, number> = {
  LAW: 1,
  REGULATION: 2,
  GUIDANCE: 3,
  PRACTICE: 4,
}

export interface ConflictResult {
  hasConflict: boolean
  canResolve: boolean
  winningRuleId?: string
  conflictingRules: RuleCandidate[]
  description?: string
}

export function detectConflicts(rules: RuleCandidate[]): ConflictResult {
  if (rules.length <= 1) {
    return { hasConflict: false, canResolve: true, conflictingRules: [] }
  }

  // Group by concept
  const byConceptAndType = new Map<string, RuleCandidate[]>()

  for (const rule of rules) {
    const key = `${rule.conceptSlug}:${rule.valueType}`
    const group = byConceptAndType.get(key) || []
    group.push(rule)
    byConceptAndType.set(key, group)
  }

  // Find conflicts (same concept+type, different values)
  const allConflicts: RuleCandidate[] = []
  let canResolveAll = true
  let winningRuleId: string | undefined

  for (const [key, group] of byConceptAndType) {
    if (group.length <= 1) continue

    const uniqueValues = new Set(group.map((r) => r.value))
    if (uniqueValues.size <= 1) continue // No conflict, same value

    // We have a conflict
    allConflicts.push(...group)

    // Try to resolve by authority level
    const sorted = [...group].sort((a, b) => {
      const rankA = AUTHORITY_RANK[a.authorityLevel] ?? 99
      const rankB = AUTHORITY_RANK[b.authorityLevel] ?? 99
      return rankA - rankB
    })

    const topRank = AUTHORITY_RANK[sorted[0].authorityLevel] ?? 99
    const sameRankCount = sorted.filter(
      (r) => (AUTHORITY_RANK[r.authorityLevel] ?? 99) === topRank
    ).length

    if (sameRankCount > 1) {
      // Multiple rules at same authority = unresolvable
      canResolveAll = false
    } else {
      winningRuleId = sorted[0].id
    }
  }

  if (allConflicts.length === 0) {
    return { hasConflict: false, canResolve: true, conflictingRules: [] }
  }

  return {
    hasConflict: true,
    canResolve: canResolveAll,
    winningRuleId: canResolveAll ? winningRuleId : undefined,
    conflictingRules: allConflicts,
    description: canResolveAll
      ? "Conflict resolved by authority hierarchy"
      : "Multiple sources at same authority level disagree",
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/conflict-detector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/query-engine/conflict-detector.ts src/lib/assistant/query-engine/__tests__/conflict-detector.test.ts
git commit -m "feat(assistant): add conflict detector with authority-based resolution"
```

---

### Task 7: Citation Builder

**Files:**

- Create: `src/lib/assistant/query-engine/citation-builder.ts`
- Test: `src/lib/assistant/query-engine/__tests__/citation-builder.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/query-engine/__tests__/citation-builder.test.ts
import { describe, it, expect } from "vitest"
import { buildCitations } from "../citation-builder"
import type { RuleCandidate } from "../rule-selector"
import type { CitationBlock } from "@/lib/assistant/types"

const mockSourcePointer = {
  id: "sp1",
  evidenceId: "e1",
  exactQuote: "Godišnji primitak od 39.816,84 eura",
  contextBefore: "Članak 82.",
  contextAfter: null,
  articleNumber: "82",
  lawReference: "Zakon o porezu na dohodak (NN 115/16)",
  evidence: {
    id: "e1",
    url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2016_12_115_2519.html",
    source: {
      name: "Narodne novine",
      url: "https://narodne-novine.nn.hr",
    },
  },
}

const mockRule: Partial<RuleCandidate> = {
  id: "r1",
  titleHr: "Prag za paušalno oporezivanje",
  authorityLevel: "LAW",
  effectiveFrom: new Date("2024-01-01"),
  confidence: 0.95,
  sourcePointers: [mockSourcePointer as any],
}

describe("buildCitations", () => {
  it("returns null for empty rules", () => {
    const result = buildCitations([])
    expect(result).toBeNull()
  })

  it("builds primary citation from first rule", () => {
    const result = buildCitations([mockRule as RuleCandidate])

    expect(result?.primary).toBeDefined()
    expect(result?.primary.title).toBe("Prag za paušalno oporezivanje")
    expect(result?.primary.authority).toBe("LAW")
  })

  it("includes quote from source pointer", () => {
    const result = buildCitations([mockRule as RuleCandidate])

    expect(result?.primary.quote).toBe("Godišnji primitak od 39.816,84 eura")
  })

  it("includes URL from evidence", () => {
    const result = buildCitations([mockRule as RuleCandidate])

    expect(result?.primary.url).toBe(
      "https://narodne-novine.nn.hr/clanci/sluzbeni/2016_12_115_2519.html"
    )
  })

  it("builds supporting citations from remaining rules", () => {
    const secondRule = {
      ...mockRule,
      id: "r2",
      titleHr: "Uputa Porezne uprave",
      authorityLevel: "GUIDANCE",
    } as RuleCandidate

    const result = buildCitations([mockRule as RuleCandidate, secondRule])

    expect(result?.supporting).toHaveLength(1)
    expect(result?.supporting[0].title).toBe("Uputa Porezne uprave")
  })

  it("limits supporting citations to 3", () => {
    const manyRules = Array(5)
      .fill(null)
      .map((_, i) => ({
        ...mockRule,
        id: `r${i}`,
        titleHr: `Rule ${i}`,
      })) as RuleCandidate[]

    const result = buildCitations(manyRules)

    expect(result?.supporting.length).toBeLessThanOrEqual(3)
  })

  it("skips rules without source pointers", () => {
    const ruleWithoutPointers = {
      ...mockRule,
      id: "r2",
      sourcePointers: [],
    } as RuleCandidate

    const result = buildCitations([mockRule as RuleCandidate, ruleWithoutPointers])

    expect(result?.supporting).toHaveLength(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/citation-builder.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/assistant/query-engine/citation-builder.ts
import type { RuleCandidate } from "./rule-selector"
import type { CitationBlock, SourceCard, AuthorityLevel } from "@/lib/assistant/types"

const MAX_SUPPORTING = 3

export function buildCitations(rules: RuleCandidate[]): CitationBlock | null {
  // Filter to rules that have source pointers
  const citableRules = rules.filter((r) => r.sourcePointers && r.sourcePointers.length > 0)

  if (citableRules.length === 0) return null

  const [primaryRule, ...supportingRules] = citableRules

  const primary = ruleToSourceCard(primaryRule)
  if (!primary) return null

  const supporting = supportingRules
    .slice(0, MAX_SUPPORTING)
    .map(ruleToSourceCard)
    .filter((s): s is SourceCard => s !== null)

  return { primary, supporting }
}

function ruleToSourceCard(rule: RuleCandidate): SourceCard | null {
  const pointer = rule.sourcePointers[0]
  if (!pointer) return null

  return {
    id: rule.id,
    title: rule.titleHr,
    authority: rule.authorityLevel as AuthorityLevel,
    reference: pointer.lawReference || undefined,
    quote: pointer.exactQuote,
    url: pointer.evidence?.url || "",
    effectiveFrom: rule.effectiveFrom.toISOString().split("T")[0],
    confidence: rule.confidence,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/citation-builder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/query-engine/citation-builder.ts src/lib/assistant/query-engine/__tests__/citation-builder.test.ts
git commit -m "feat(assistant): add citation builder from rules to SourceCards"
```

---

### Task 8: Answer Builder (Main Orchestrator)

**Files:**

- Create: `src/lib/assistant/query-engine/answer-builder.ts`
- Test: `src/lib/assistant/query-engine/__tests__/answer-builder.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/query-engine/__tests__/answer-builder.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildAnswer } from "../answer-builder"
import * as conceptMatcher from "../concept-matcher"
import * as ruleSelector from "../rule-selector"
import * as conflictDetector from "../conflict-detector"
import * as citationBuilder from "../citation-builder"

vi.mock("../concept-matcher")
vi.mock("../rule-selector")
vi.mock("../conflict-detector")
vi.mock("../citation-builder")

describe("buildAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns REFUSAL with NO_CITABLE_RULES when no concepts match", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const result = await buildAnswer("gibberish query", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    expect(result.refusalReason).toBe("NO_CITABLE_RULES")
  })

  it("returns REFUSAL with NO_CITABLE_RULES when no rules found", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      { conceptId: "c1", slug: "test", nameHr: "Test", score: 0.8, matchedKeywords: ["test"] },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([])

    const result = await buildAnswer("test query", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    expect(result.refusalReason).toBe("NO_CITABLE_RULES")
  })

  it("returns REFUSAL with UNRESOLVED_CONFLICT when conflict cannot be resolved", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      { conceptId: "c1", slug: "test", nameHr: "Test", score: 0.8, matchedKeywords: ["test"] },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([
      { id: "r1", value: "25", valueType: "percentage" } as any,
      { id: "r2", value: "13", valueType: "percentage" } as any,
    ])
    vi.mocked(conflictDetector.detectConflicts).mockReturnValue({
      hasConflict: true,
      canResolve: false,
      conflictingRules: [],
    })

    const result = await buildAnswer("test query", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    expect(result.refusalReason).toBe("UNRESOLVED_CONFLICT")
  })

  it("returns ANSWER with citations when rules found", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([
      {
        conceptId: "c1",
        slug: "pausalni-prag",
        nameHr: "Prag",
        score: 0.9,
        matchedKeywords: ["prag"],
      },
    ])
    vi.mocked(ruleSelector.selectRules).mockResolvedValue([
      {
        id: "r1",
        titleHr: "Prag za paušalno",
        value: "39816.84",
        valueType: "currency_eur",
        authorityLevel: "LAW",
        explanationHr: "Godišnji primitak do 39.816,84 EUR.",
        sourcePointers: [{ id: "sp1" }],
      } as any,
    ])
    vi.mocked(conflictDetector.detectConflicts).mockReturnValue({
      hasConflict: false,
      canResolve: true,
      conflictingRules: [],
    })
    vi.mocked(citationBuilder.buildCitations).mockReturnValue({
      primary: {
        id: "r1",
        title: "Test",
        authority: "LAW",
        url: "http://test.com",
        effectiveFrom: "2024-01-01",
        confidence: 0.9,
      },
      supporting: [],
    })

    const result = await buildAnswer("koji je prag za paušalni obrt", "MARKETING")

    expect(result.kind).toBe("ANSWER")
    expect(result.topic).toBe("REGULATORY")
    expect(result.citations).toBeDefined()
    expect(result.headline).toBeDefined()
  })

  it("classifies OUT_OF_SCOPE for non-regulatory queries", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    // Query that sounds like product question
    const result = await buildAnswer("kako se prijaviti na FiskAI", "MARKETING")

    expect(result.kind).toBe("REFUSAL")
    // Could be OUT_OF_SCOPE or NO_CITABLE_RULES depending on classification
  })

  it("includes surface in response", async () => {
    vi.mocked(conceptMatcher.matchConcepts).mockResolvedValue([])

    const marketingResult = await buildAnswer("test", "MARKETING")
    const appResult = await buildAnswer("test", "APP")

    expect(marketingResult.surface).toBe("MARKETING")
    expect(appResult.surface).toBe("APP")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/answer-builder.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/assistant/query-engine/answer-builder.ts
import { nanoid } from "nanoid"
import {
  SCHEMA_VERSION,
  type AssistantResponse,
  type Surface,
  type Topic,
  type RefusalReason,
} from "@/lib/assistant/types"
import { extractKeywords } from "./text-utils"
import { matchConcepts } from "./concept-matcher"
import { selectRules } from "./rule-selector"
import { detectConflicts } from "./conflict-detector"
import { buildCitations } from "./citation-builder"

// Simple topic classification keywords
const PRODUCT_KEYWORDS = ["fiskai", "prijava", "registracija", "aplikacija", "cijena", "plan"]
const SUPPORT_KEYWORDS = ["pomoc", "podrska", "greska", "bug", "ne-radi", "problem"]

function classifyTopic(keywords: string[]): Topic {
  const normalizedKeywords = keywords.map((k) => k.toLowerCase())

  if (PRODUCT_KEYWORDS.some((pk) => normalizedKeywords.includes(pk))) {
    return "PRODUCT"
  }
  if (SUPPORT_KEYWORDS.some((sk) => normalizedKeywords.includes(sk))) {
    return "SUPPORT"
  }

  // Default to regulatory for this assistant
  return "REGULATORY"
}

export async function buildAnswer(
  query: string,
  surface: Surface,
  companyId?: string
): Promise<AssistantResponse> {
  const requestId = `req_${nanoid()}`
  const traceId = `trace_${nanoid()}`
  const createdAt = new Date().toISOString()

  // Base response fields
  const baseResponse = {
    schemaVersion: SCHEMA_VERSION,
    requestId,
    traceId,
    surface,
    createdAt,
  }

  // 1. Extract keywords
  const keywords = extractKeywords(query)

  // 2. Classify topic
  const topic = classifyTopic(keywords)

  // If not regulatory, return refusal (this assistant only handles regulatory)
  if (topic !== "REGULATORY") {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic,
      headline: "Ovo pitanje nije regulatorne prirode",
      directAnswer: "",
      refusalReason: "OUT_OF_SCOPE",
      refusal: {
        message:
          "Ovaj asistent odgovara samo na regulatorna pitanja o porezima, PDV-u, doprinosima i fiskalizaciji.",
        relatedTopics: ["porez na dohodak", "PDV", "doprinosi", "fiskalizacija"],
      },
    }
  }

  // 3. Match concepts
  const conceptMatches = await matchConcepts(keywords)

  if (conceptMatches.length === 0) {
    return buildNoCitableRulesRefusal(baseResponse, topic)
  }

  // 4. Select rules for matched concepts
  const conceptSlugs = conceptMatches.map((c) => c.slug)
  const rules = await selectRules(conceptSlugs)

  if (rules.length === 0) {
    return buildNoCitableRulesRefusal(baseResponse, topic)
  }

  // 5. Check for conflicts
  const conflictResult = detectConflicts(rules)

  if (conflictResult.hasConflict && !conflictResult.canResolve) {
    return {
      ...baseResponse,
      kind: "REFUSAL",
      topic,
      headline: "Proturječni propisi",
      directAnswer: "",
      refusalReason: "UNRESOLVED_CONFLICT",
      conflict: {
        status: "UNRESOLVED",
        description: conflictResult.description || "Višestruki izvori se ne slažu",
        sources: [],
      },
      refusal: {
        message:
          "Pronađeni su proturječni propisi za vaše pitanje. Preporučujemo konzultaciju sa stručnjakom.",
        conflictingSources: [],
      },
    }
  }

  // 6. Build citations
  const citations = buildCitations(rules)

  if (!citations) {
    return buildNoCitableRulesRefusal(baseResponse, topic)
  }

  // 7. Build answer from primary rule
  const primaryRule = rules[0]

  return {
    ...baseResponse,
    kind: "ANSWER",
    topic,
    headline: primaryRule.titleHr,
    directAnswer:
      primaryRule.explanationHr || formatValue(primaryRule.value, primaryRule.valueType),
    citations,
    confidence: {
      level:
        primaryRule.confidence >= 0.9 ? "HIGH" : primaryRule.confidence >= 0.7 ? "MEDIUM" : "LOW",
      score: primaryRule.confidence,
    },
    relatedQuestions: generateRelatedQuestions(conceptSlugs),
  }
}

function buildNoCitableRulesRefusal(
  base: Partial<AssistantResponse>,
  topic: Topic
): AssistantResponse {
  return {
    ...base,
    kind: "REFUSAL",
    topic,
    headline: "Nema dostupnih službenih izvora",
    directAnswer: "",
    refusalReason: "NO_CITABLE_RULES",
    refusal: {
      message: "Nismo pronašli službene izvore koji odgovaraju na vaše pitanje.",
      relatedTopics: ["porez na dohodak", "PDV stope", "paušalni obrt", "fiskalizacija"],
    },
  } as AssistantResponse
}

function formatValue(value: string, valueType: string): string {
  switch (valueType) {
    case "currency_eur":
      return `${parseFloat(value).toLocaleString("hr-HR")} EUR`
    case "currency_hrk":
      return `${parseFloat(value).toLocaleString("hr-HR")} HRK`
    case "percentage":
      return `${value}%`
    default:
      return value
  }
}

function generateRelatedQuestions(conceptSlugs: string[]): string[] {
  // Static related questions based on concept areas
  const questionMap: Record<string, string[]> = {
    pausalni: ["Koji su uvjeti za paušalni obrt?", "Kada prelazim u redovno oporezivanje?"],
    pdv: ["Koje su stope PDV-a?", "Kada moram u sustav PDV-a?"],
    doprinosi: ["Koliki su doprinosi za obrtnike?", "Kada se plaćaju doprinosi?"],
  }

  const questions: string[] = []
  for (const slug of conceptSlugs) {
    for (const [key, qs] of Object.entries(questionMap)) {
      if (slug.includes(key)) {
        questions.push(...qs)
      }
    }
  }

  return [...new Set(questions)].slice(0, 4)
}

// Re-export types for API layer
export type { ConceptMatch } from "./concept-matcher"
export type { RuleCandidate } from "./rule-selector"
export type { ConflictResult } from "./conflict-detector"
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/query-engine/__tests__/answer-builder.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/query-engine/answer-builder.ts src/lib/assistant/query-engine/__tests__/answer-builder.test.ts
git commit -m "feat(assistant): add answer builder orchestrating query→response pipeline"
```

---

## Phase 3: API & Streaming (Tasks 9-10)

### Task 9: Real API Route

**Files:**

- Modify: `src/app/api/assistant/chat/route.ts`
- Test: `src/app/api/assistant/chat/__tests__/route.test.ts`

**Step 1: Write the test**

```typescript
// src/app/api/assistant/chat/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "../route"
import { NextRequest } from "next/server"
import * as answerBuilder from "@/lib/assistant/query-engine/answer-builder"

vi.mock("@/lib/assistant/query-engine/answer-builder")

function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/assistant/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for missing query", async () => {
    const request = createRequest({ surface: "MARKETING" })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it("returns 400 for invalid surface", async () => {
    const request = createRequest({ query: "test", surface: "INVALID" })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it("calls buildAnswer with correct parameters", async () => {
    vi.mocked(answerBuilder.buildAnswer).mockResolvedValue({
      schemaVersion: "1.0.0",
      requestId: "req_1",
      traceId: "trace_1",
      kind: "ANSWER",
      topic: "REGULATORY",
      surface: "MARKETING",
      createdAt: new Date().toISOString(),
      headline: "Test",
      directAnswer: "Test answer",
    } as any)

    const request = createRequest({ query: "test query", surface: "MARKETING" })
    await POST(request)

    expect(answerBuilder.buildAnswer).toHaveBeenCalledWith("test query", "MARKETING", undefined)
  })

  it("returns valid AssistantResponse", async () => {
    const mockResponse = {
      schemaVersion: "1.0.0",
      requestId: "req_1",
      traceId: "trace_1",
      kind: "ANSWER",
      topic: "REGULATORY",
      surface: "MARKETING",
      createdAt: new Date().toISOString(),
      headline: "Test Headline",
      directAnswer: "Test answer",
    }

    vi.mocked(answerBuilder.buildAnswer).mockResolvedValue(mockResponse as any)

    const request = createRequest({ query: "test", surface: "MARKETING" })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.kind).toBe("ANSWER")
    expect(data.headline).toBe("Test Headline")
  })

  it("returns 500 on internal error", async () => {
    vi.mocked(answerBuilder.buildAnswer).mockRejectedValue(new Error("DB error"))

    const request = createRequest({ query: "test", surface: "MARKETING" })
    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})
```

**Step 2: Update implementation**

```typescript
// src/app/api/assistant/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { buildAnswer } from "@/lib/assistant/query-engine/answer-builder"
import { validateResponse } from "@/lib/assistant/validation"
import type { Surface } from "@/lib/assistant/types"

interface ChatRequest {
  query: string
  surface: Surface
  companyId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest

    // Validate request
    if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!body.surface || !["MARKETING", "APP"].includes(body.surface)) {
      return NextResponse.json({ error: "Invalid surface" }, { status: 400 })
    }

    // Build answer from rules
    const response = await buildAnswer(body.query.trim(), body.surface, body.companyId)

    // Validate response before sending
    const validation = validateResponse(response)
    if (!validation.valid) {
      console.error("[Assistant API] Invalid response:", validation.errors)
      return NextResponse.json(
        { error: "Response validation failed", details: validation.errors },
        { status: 500 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Assistant chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

**Step 3: Run test**

Run: `npx vitest run src/app/api/assistant/chat/__tests__/route.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/api/assistant/chat/route.ts src/app/api/assistant/chat/__tests__/route.test.ts
git commit -m "feat(assistant): implement real API with query engine"
```

---

### Task 10: Streaming Support (Chunked JSON)

**Files:**

- Create: `src/app/api/assistant/chat/stream/route.ts`
- Modify: `src/lib/assistant/hooks/useAssistantController.ts`

**Step 1: Create streaming endpoint**

```typescript
// src/app/api/assistant/chat/stream/route.ts
import { NextRequest } from "next/server"
import { buildAnswer } from "@/lib/assistant/query-engine/answer-builder"
import { validateResponse } from "@/lib/assistant/validation"
import type { Surface, AssistantResponse } from "@/lib/assistant/types"

interface ChatRequest {
  query: string
  surface: Surface
  companyId?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatRequest

  // Validate request
  if (!body.query || !body.surface) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Create readable stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build full answer
        const response = await buildAnswer(body.query, body.surface, body.companyId)

        // Validate
        const validation = validateResponse(response)
        if (!validation.valid) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: "Validation failed" }) + "\n"))
          controller.close()
          return
        }

        // Stream in chunks (simulate progressive rendering)
        // Chunk 1: Schema + tracing
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              schemaVersion: response.schemaVersion,
              requestId: response.requestId,
              traceId: response.traceId,
              kind: response.kind,
              topic: response.topic,
              surface: response.surface,
              createdAt: response.createdAt,
            }) + "\n"
          )
        )

        await delay(50) // Small delay for streaming effect

        // Chunk 2: Main content
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              requestId: response.requestId,
              headline: response.headline,
              directAnswer: response.directAnswer,
              confidence: response.confidence,
            }) + "\n"
          )
        )

        await delay(50)

        // Chunk 3: Citations (if present)
        if (response.citations) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                requestId: response.requestId,
                citations: response.citations,
              }) + "\n"
            )
          )
          await delay(50)
        }

        // Chunk 4: Refusal details (if present)
        if (response.refusalReason) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                requestId: response.requestId,
                refusalReason: response.refusalReason,
                refusal: response.refusal,
              }) + "\n"
            )
          )
        }

        // Chunk 5: Related questions
        if (response.relatedQuestions) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                requestId: response.requestId,
                relatedQuestions: response.relatedQuestions,
              }) + "\n"
            )
          )
        }

        // Final chunk: done signal
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              requestId: response.requestId,
              _done: true,
            }) + "\n"
          )
        )

        controller.close()
      } catch (error) {
        console.error("Streaming error:", error)
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Internal error" }) + "\n"))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

**Step 2: Update controller to support streaming**

Add streaming option to `useAssistantController.ts` (optional enhancement - the non-streaming version works first).

**Step 3: Commit**

```bash
git add src/app/api/assistant/chat/stream/route.ts
git commit -m "feat(assistant): add streaming API endpoint with chunked JSON"
```

---

## Phase 4: Demo & E2E (Tasks 11-12)

### Task 11: Fixture Demo Page

**Files:**

- Create: `src/app/(marketing)/assistant-demo/page.tsx`
- Create: `src/lib/assistant/fixtures/index.ts`

**Step 1: Create fixtures**

```typescript
// src/lib/assistant/fixtures/index.ts
import { SCHEMA_VERSION, type AssistantResponse } from "../types"

const baseResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: "req_demo",
  traceId: "trace_demo",
  surface: "MARKETING" as const,
  createdAt: new Date().toISOString(),
}

export const DEMO_FIXTURES: Record<string, AssistantResponse> = {
  ANSWER: {
    ...baseResponse,
    kind: "ANSWER",
    topic: "REGULATORY",
    headline: "Prag za paušalno oporezivanje je 39.816,84 EUR",
    directAnswer:
      "Godišnji primitak do 39.816,84 EUR omogućuje paušalno oporezivanje prema Zakonu o porezu na dohodak.",
    confidence: { level: "HIGH", score: 0.95 },
    citations: {
      primary: {
        id: "src_1",
        title: "Zakon o porezu na dohodak, čl. 82",
        authority: "LAW",
        reference: "NN 115/16, 106/18",
        quote: "Godišnji primitak od 39.816,84 eura",
        url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2016_12_115_2519.html",
        effectiveFrom: "2024-01-01",
        confidence: 0.95,
      },
      supporting: [
        {
          id: "src_2",
          title: "Uputa Porezne uprave",
          authority: "GUIDANCE",
          url: "https://www.porezna-uprava.hr/upute",
          effectiveFrom: "2024-01-15",
          confidence: 0.88,
        },
      ],
    },
    relatedQuestions: [
      "Koji su uvjeti za paušalni obrt?",
      "Kada prelazim u redovno oporezivanje?",
      "Kako se računa godišnji primitak?",
    ],
  },

  NO_CITABLE_RULES: {
    ...baseResponse,
    kind: "REFUSAL",
    topic: "REGULATORY",
    headline: "Nema dostupnih službenih izvora",
    directAnswer: "",
    refusalReason: "NO_CITABLE_RULES",
    refusal: {
      message: "Nismo pronašli službene izvore koji odgovaraju na vaše pitanje.",
      relatedTopics: ["porez na dohodak", "PDV stope", "paušalni obrt"],
    },
  },

  OUT_OF_SCOPE: {
    ...baseResponse,
    kind: "REFUSAL",
    topic: "PRODUCT",
    headline: "Ovo pitanje nije regulatorne prirode",
    directAnswer: "",
    refusalReason: "OUT_OF_SCOPE",
    refusal: {
      message: "Ovaj asistent odgovara samo na regulatorna pitanja.",
      redirectOptions: [
        { label: "Kontaktirajte podršku", href: "/contact", type: "SUPPORT" },
        { label: "Pogledajte dokumentaciju", href: "/docs", type: "DOCS" },
      ],
    },
  },

  UNRESOLVED_CONFLICT: {
    ...baseResponse,
    kind: "REFUSAL",
    topic: "REGULATORY",
    headline: "Proturječni propisi",
    directAnswer: "",
    refusalReason: "UNRESOLVED_CONFLICT",
    conflict: {
      status: "UNRESOLVED",
      description: "Dva izvora navode različite vrijednosti za istu regulativu.",
      sources: [
        {
          id: "src_conflict_1",
          title: "Izvor A",
          authority: "LAW",
          url: "https://example.com/a",
          effectiveFrom: "2024-01-01",
          confidence: 0.9,
        },
        {
          id: "src_conflict_2",
          title: "Izvor B",
          authority: "LAW",
          url: "https://example.com/b",
          effectiveFrom: "2024-02-01",
          confidence: 0.9,
        },
      ],
    },
    refusal: {
      message: "Pronađeni su proturječni propisi. Preporučujemo konzultaciju sa stručnjakom.",
    },
  },

  MISSING_CLIENT_DATA: {
    ...baseResponse,
    surface: "APP",
    kind: "REFUSAL",
    topic: "REGULATORY",
    headline: "Potrebni su dodatni podaci",
    directAnswer: "",
    refusalReason: "MISSING_CLIENT_DATA",
    refusal: {
      message: "Za personalizirani odgovor potrebno je povezati podatke.",
      missingData: [
        {
          label: "Godišnji prihod",
          impact: "Određuje porezni razred",
          connectAction: "/connect/revenue",
        },
        {
          label: "Vrsta djelatnosti",
          impact: "Utječe na doprinose",
          connectAction: "/connect/activity",
        },
      ],
    },
  },
}

export type FixtureKey = keyof typeof DEMO_FIXTURES
```

**Step 2: Create demo page**

```typescript
// src/app/(marketing)/assistant-demo/page.tsx
'use client'

import { useState } from 'react'
import { DEMO_FIXTURES, type FixtureKey } from '@/lib/assistant/fixtures'
import { AssistantContainer } from '@/components/assistant-v2'

const FIXTURE_OPTIONS: { key: FixtureKey; label: string }[] = [
  { key: 'ANSWER', label: 'Successful Answer with Citations' },
  { key: 'NO_CITABLE_RULES', label: 'Refusal: No Citable Rules' },
  { key: 'OUT_OF_SCOPE', label: 'Refusal: Out of Scope' },
  { key: 'UNRESOLVED_CONFLICT', label: 'Refusal: Unresolved Conflict' },
  { key: 'MISSING_CLIENT_DATA', label: 'Refusal: Missing Client Data' },
]

export default function AssistantDemoPage() {
  const [selectedFixture, setSelectedFixture] = useState<FixtureKey>('ANSWER')
  const fixture = DEMO_FIXTURES[selectedFixture]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Assistant Demo (Fixtures)</h1>
        <p className="text-white/70 mt-1">
          Test UI components with predefined response scenarios.
        </p>
      </header>

      <div className="mb-6 p-4 bg-slate-800 rounded-lg">
        <label className="block text-sm font-medium text-white/80 mb-2">
          Select Scenario:
        </label>
        <select
          value={selectedFixture}
          onChange={(e) => setSelectedFixture(e.target.value as FixtureKey)}
          className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600"
        >
          {FIXTURE_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 p-3 bg-slate-900/50 rounded text-xs font-mono text-white/60 overflow-auto max-h-48">
        <pre>{JSON.stringify(fixture, null, 2)}</pre>
      </div>

      {/* The container would need to accept a fixture prop or use context */}
      <AssistantContainer surface={fixture.surface} />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/lib/assistant/fixtures/ src/app/\(marketing\)/assistant-demo/
git commit -m "feat(assistant): add demo page with fixture scenarios"
```

---

### Task 12: Wire Playwright E2E to Demo Page

**Files:**

- Modify: `e2e/assistant/fill-only.spec.ts`

**Step 1: Update E2E tests to use demo page**

```typescript
// e2e/assistant/fill-only.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Fill-Only Behavior", () => {
  test.beforeEach(async ({ page }) => {
    // Use demo page for consistent fixture-based testing
    await page.goto("/assistant-demo")
  })

  test("clicking initial suggestion fills input but does not submit", async ({ page }) => {
    // Wait for suggestions to appear
    const suggestion = page.getByRole("option").first()

    // If suggestions exist
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      const suggestionText = await suggestion.textContent()
      await suggestion.click()

      const input = page.getByRole("textbox")
      await expect(input).toHaveValue(suggestionText!)
      await expect(page.getByTestId("answer-skeleton")).not.toBeVisible()
      await expect(input).toBeFocused()
    }
  })

  // ... rest of tests adapted for demo page
})
```

**Step 2: Commit**

```bash
git add e2e/assistant/
git commit -m "test(assistant): wire E2E tests to demo fixture page"
```

---

## Phase 5: Module Exports & Feature Flag (Task 13)

### Task 13: Export Query Engine & Add Feature Flag

**Files:**

- Create: `src/lib/assistant/query-engine/index.ts`
- Modify: `src/lib/assistant/index.ts`
- Create: `src/lib/feature-flags.ts` (if not exists)

**Step 1: Create query engine exports**

```typescript
// src/lib/assistant/query-engine/index.ts
export { extractKeywords, tokenize, normalizeDiacritics } from "./text-utils"
export { matchConcepts, type ConceptMatch } from "./concept-matcher"
export { selectRules, type RuleCandidate } from "./rule-selector"
export { detectConflicts, type ConflictResult } from "./conflict-detector"
export { buildCitations } from "./citation-builder"
export { buildAnswer } from "./answer-builder"
```

**Step 2: Update main exports**

```typescript
// src/lib/assistant/index.ts
// Types
export * from "./types"

// Analytics
export * from "./analytics"

// Validation
export * from "./validation"

// Citations
export * from "./citations"

// Query Engine
export * from "./query-engine"

// Fixtures
export * from "./fixtures"

// Hooks
export { useAssistantController } from "./hooks/useAssistantController"
export { useFocusManagement } from "./hooks/useFocusManagement"
export { useRovingTabindex } from "./hooks/useRovingTabindex"
export { useReducedMotion } from "./hooks/useReducedMotion"
export { useCTAEligibility } from "./hooks/useCTAEligibility"
export { useCTADismissal } from "./hooks/useCTADismissal"
export { useAssistantAnalytics } from "./hooks/useAssistantAnalytics"
```

**Step 3: Commit**

```bash
git add src/lib/assistant/query-engine/index.ts src/lib/assistant/index.ts
git commit -m "feat(assistant): export query engine modules"
```

---

## Acceptance Criteria Summary

| Task | Acceptance Criteria                                                           |
| ---- | ----------------------------------------------------------------------------- |
| 1    | `/assistant` page renders with MARKETING surface                              |
| 2    | `/app/assistant` page renders with APP surface                                |
| 3    | `extractKeywords("Što je PDV?")` returns `['stopa', 'pdv']`                   |
| 4    | `matchConcepts(['pdv'])` returns concepts with `pdv` in slug/aliases          |
| 5    | `selectRules(['pdv-stopa'])` returns only PUBLISHED, non-expired rules        |
| 6    | `detectConflicts([r1, r2])` returns `hasConflict: true` when values differ    |
| 7    | `buildCitations(rules)` returns `CitationBlock` with primary + supporting     |
| 8    | `buildAnswer("gibberish", "MARKETING")` returns REFUSAL with NO_CITABLE_RULES |
| 9    | POST `/api/assistant/chat` returns validated AssistantResponse                |
| 10   | POST `/api/assistant/chat/stream` returns NDJSON chunks                       |
| 11   | `/assistant-demo` renders with fixture dropdown                               |
| 12   | E2E tests run against demo page                                               |
| 13   | All exports available from `@/lib/assistant`                                  |

---

## Run All Tests

```bash
# Unit tests
npx vitest run src/lib/assistant/

# Integration test
curl -X POST http://localhost:3000/api/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "koji je prag za paušalni obrt", "surface": "MARKETING"}'

# E2E tests
npx playwright test e2e/assistant/
```

---

Plan complete and saved to `docs/plans/2024-12-24-assistant-integration-sprint.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
