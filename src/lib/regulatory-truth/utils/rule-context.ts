// src/lib/regulatory-truth/utils/rule-context.ts
import { db } from "@/lib/db"

export interface RuleContext {
  ruleId: string
  conceptSlug: string
  value: string
  exactQuote: string
  sourceUrl: string
  fetchedAt: Date
  articleNumber?: string
  lawReference?: string
}

/**
 * Find published rules relevant to a user query.
 * Returns rules with their source evidence for citations.
 */
export async function findRelevantRules(query: string, limit: number = 5): Promise<RuleContext[]> {
  const keywords = extractKeywords(query)

  if (keywords.length === 0) {
    console.log("[rule-context] No keywords extracted from query:", query)
    return []
  }

  const rules = await db.regulatoryRule.findMany({
    where: {
      status: "PUBLISHED",
      OR: keywords.flatMap((kw) => [
        { conceptSlug: { contains: kw, mode: "insensitive" } },
        { titleHr: { contains: kw, mode: "insensitive" } },
      ]),
    },
    include: {
      sourcePointers: {
        include: {
          evidence: true,
        },
        take: 1,
      },
    },
    take: limit,
    orderBy: { confidence: "desc" },
  })

  return rules
    .filter((rule) => rule.sourcePointers.length > 0 && rule.sourcePointers[0]?.evidence)
    .map((rule) => {
      const pointer = rule.sourcePointers[0]!
      return {
        ruleId: rule.id,
        conceptSlug: rule.conceptSlug,
        value: rule.value,
        exactQuote: pointer.exactQuote,
        sourceUrl: pointer.evidence!.url,
        fetchedAt: pointer.evidence!.fetchedAt,
        articleNumber: pointer.articleNumber || undefined,
        lawReference: pointer.lawReference || undefined,
      }
    })
}

function extractKeywords(query: string): string[] {
  const stopwords = [
    "što",
    "koja",
    "koji",
    "kako",
    "koliko",
    "je",
    "su",
    "za",
    "od",
    "do",
    "u",
    "na",
    "s",
    "i",
    "a",
    "li",
    "biti",
    "može",
    "hoće",
    "kada",
    "gdje",
  ]
  return query
    .toLowerCase()
    .replace(/[^\w\sčćžšđ]/g, "") // Strip punctuation, preserve Croatian chars
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.includes(w))
    .slice(0, 5) // Increased from 3 to 5
}

/**
 * Format rule context for LLM system prompt injection.
 */
export function formatRulesForPrompt(rules: RuleContext[]): string {
  if (rules.length === 0) return ""

  const rulesList = rules
    .map(
      (r, i) =>
        `[${i + 1}] ${r.conceptSlug}
    Value: ${r.value}
    Quote: "${r.exactQuote}"
    Source: ${r.sourceUrl}
    ${r.articleNumber ? `Article: ${r.articleNumber}` : ""}
    ${r.lawReference ? `Law: ${r.lawReference}` : ""}`
    )
    .join("\n\n")

  return `
RELEVANT REGULATORY RULES (cite these in your answer):
${rulesList}

CITATION INSTRUCTIONS:
- Reference rules by number [1], [2], etc.
- Include the exact quote when stating values
- Mention the source URL for verification
`.trim()
}
