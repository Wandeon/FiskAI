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
